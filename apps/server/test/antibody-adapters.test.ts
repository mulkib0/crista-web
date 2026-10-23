/**
 * 묶음 2 — 외부 API 어댑터 · 캐시 · 큐 · 고정 예시(항체 설계 §3.1 · §3.3 · §3.4).
 *
 * 이 파일은 **실제 외부 API 를 부르지 않아요**. 모든 어댑터가 `fetch` 를 인자로 받고, 주입하지 않으면 바로 throw 하는 것을
 * 테스트로 고정해요. 외부 응답은 2026-10-24 에 실제로 받아 저장소에 넣어 둔 고정 예시(`data/fixtures/`)와
 * 가짜 `fetch` 로 재현해요.
 */
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { describe, test } from 'node:test';
import {
  AdapterError,
  DEFAULT_RETRY,
  fetchCapped,
  fetchWithRetry,
  REQUEST_CAPS,
  requireFetch,
  type FetchLike,
} from '../src/features/antibody/fetch-capped.ts';
import { cacheKey, memoryCacheStore, mergeDataMode, NULL_CACHE, provenanceOf, tiered, withCache } from '../src/features/antibody/cache.ts';
import { ANTIBODY_DOMAIN_LIMITS, createLimiter } from '../src/features/antibody/queue.ts';
import { canonicalJson, seqHash } from '../src/features/antibody/hash.ts';
import {
  CHEMBL_MOLECULE_FIELDS,
  createChemblAdapter,
  parseAntibodyRows,
  parseMaxPhase,
  parseParentChains,
  requireChemblId,
} from '../src/features/antibody/chembl.ts';
import { chainRoleOf, chainSetsOf, createRcsbAdapter, parseStructureMeta, requirePdbId } from '../src/features/antibody/rcsb.ts';
import { a3mFromTarGz, createColabfoldAdapter, msaDepth, parseTicket } from '../src/features/antibody/colabfold.ts';
import { createSabdabAdapter, extendPdbId, parseAllSummary, parseCsv, parseNumbering, seqOf } from '../src/features/antibody/sabdab.ts';
import { confidenceFromPdb, createEsmfoldAdapter, ESMFOLD_URL, requireFoldable, seqFromPdb } from '../src/features/antibody/esmfold.ts';
import { createNimAdapter, NIM_PROTEINMPNN_URL, NIM_SAMPLING_TEMP, parseMfasta } from '../src/features/antibody/optional-nim.ts';
import { createBoltzAdapter } from '../src/features/antibody/optional-boltz.ts';
import { FIXTURE_COLLECTED_ON, FIXTURE_TARGETS, fixtureByPdb, readFixtureJson, readFixtureText } from '../src/features/antibody/fixtures.ts';
import { loadAntibodyConfig } from '../src/config.ts';
import { ESMFOLD_MAX_RESIDUES, SCFV_LINKER } from '@crista-web/web-contract';

const UA = 'crista-web-test/0.1 (test)';

/** 아무것도 하지 않는 가짜 fetch — '부르지 않았다'를 세는 데 써요. */
function recorder(routes: Array<[RegExp, (url: string, init?: RequestInit) => Response]>): { fetch: FetchLike; calls: string[] } {
  const calls: string[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push(url);
    for (const [pattern, make] of routes) if (pattern.test(url)) return make(url, init);
    throw new Error(`테스트에 없는 주소를 불렀어요 — ${url}`);
  };
  return { fetch, calls };
}

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const text = (body: string, status = 200): Response => new Response(body, { status, headers: { 'content-type': 'text/plain' } });

const noSleep = { ...DEFAULT_RETRY, sleep: async () => {} };

// ──────────────────────────────────────────────────────────────────────────────

describe('fetch 주입 — 테스트가 실제 외부 API 를 부르지 않는다', () => {
  test('주입하지 않으면 헬퍼가 바로 throw', () => {
    assert.throws(() => requireFetch(undefined, 'X'), (e: unknown) => e instanceof AdapterError && e.code === 'fetch_missing');
    assert.throws(() => requireFetch(null, 'X'), /fetch 를 인자로 받아야/u);
  });

  test('어댑터 다섯 종 모두 fetch 없이 만들 수 없다', () => {
    const base = { fetch: undefined, userAgent: UA, cache: NULL_CACHE };
    for (const make of [
      () => createChemblAdapter(base),
      () => createRcsbAdapter(base),
      () => createColabfoldAdapter(base),
      () => createSabdabAdapter(base),
      () => createEsmfoldAdapter(base),
    ]) {
      assert.throws(make, (e: unknown) => e instanceof AdapterError && e.code === 'fetch_missing');
    }
  });

  test('선택 어댑터는 키가 없으면 null — 근사로 강등한다', () => {
    assert.equal(createNimAdapter({ fetch: undefined, apiKey: null, userAgent: UA }), null);
    assert.equal(createNimAdapter({ fetch: undefined, apiKey: '   ', userAgent: UA }), null);
    assert.equal(createBoltzAdapter({ fetch: undefined, apiKey: null, userAgent: UA }), null);
    // 키가 있는데 fetch 가 없으면 그건 개발 실수라 알려 줘요.
    assert.throws(() => createNimAdapter({ fetch: undefined, apiKey: 'k', userAgent: UA }));
  });
});

describe('fetchCapped — 시간 · 바이트 상한', () => {
  test('시간 초과는 504', async () => {
    const hanging: FetchLike = (_url, init) =>
      new Promise((_ok, fail) => {
        init?.signal?.addEventListener('abort', () => fail(init.signal?.reason ?? new Error('aborted')));
      });
    await assert.rejects(
      () => fetchCapped(hanging, 'https://example.test/slow', { timeoutMs: 20, maxBytes: 1024 }),
      (e: unknown) => e instanceof AdapterError && e.code === 'upstream_timeout' && e.status === 504,
    );
  });

  test('Content-Length 선검사로 413', async () => {
    const big: FetchLike = async () => new Response('x', { headers: { 'content-length': String(99 * 1024 * 1024) } });
    await assert.rejects(
      () => fetchCapped(big, 'https://example.test/big', REQUEST_CAPS.json),
      (e: unknown) => e instanceof AdapterError && e.code === 'too_large' && e.status === 413,
    );
  });

  test('조각을 읽으며 상한을 넘으면 413 — Content-Length 가 없어도', async () => {
    const stream: FetchLike = async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(c) {
            for (let i = 0; i < 8; i += 1) c.enqueue(new Uint8Array(1024));
            c.close();
          },
        }),
      );
    await assert.rejects(
      () => fetchCapped(stream, 'https://example.test/stream', { timeoutMs: 1000, maxBytes: 4096 }),
      (e: unknown) => e instanceof AdapterError && e.code === 'too_large',
    );
  });

  test('시드 상한을 인자로 올려 받으면 통과한다 — all-summary 가 자기 헬퍼에서 413 을 맞지 않게', async () => {
    const payload = 'A'.repeat(3 * 1024 * 1024); // 3MB — 요청 경로 JSON 상한(2MB)보다 크다
    const serve: FetchLike = async () => text(payload);
    await assert.rejects(() => fetchCapped(serve, 'https://example.test/all', REQUEST_CAPS.json), (e: unknown) => e instanceof AdapterError && e.code === 'too_large');
    const seed = loadAntibodyConfig({} as NodeJS.ProcessEnv).seedLimits;
    const ok = await fetchCapped(serve, 'https://example.test/all', { timeoutMs: seed.timeoutMs, maxBytes: seed.maxBytes });
    assert.equal(ok.text().length, payload.length);
    assert.ok(seed.maxBytes >= 32 * 1024 * 1024 && seed.timeoutMs >= 180_000);
  });

  test('4xx · 5xx 는 던지지 않고 그대로 준다 — 413 · 422 를 어댑터가 읽어야 하니까', async () => {
    const serve: FetchLike = async () => text('Sequence is longer than 400.', 413);
    const res = await fetchCapped(serve, 'https://example.test/x', REQUEST_CAPS.json);
    assert.equal(res.status, 413);
    assert.equal(res.ok, false);
    assert.match(res.text(), /longer than 400/u);
    assert.ok(res.elapsedMs >= 0 && res.calledAt.endsWith('Z'));
  });

  test('429 · 5xx 는 정책대로 다시 부른다(기다리지 않게 sleep 을 주입)', async () => {
    let n = 0;
    const flaky: FetchLike = async () => {
      n += 1;
      return n < 3 ? json({ error: 'slow down' }, 429) : json({ ok: true });
    };
    const res = await fetchWithRetry(flaky, 'https://example.test/r', REQUEST_CAPS.json, { ...noSleep, attempts: 5 });
    assert.equal(n, 3);
    assert.equal(res.status, 200);
  });
});

describe('도메인별 동시요청 상한', () => {
  test('설계 §3.4 값 — ESMFold 1 · ColabFold 2 · SAbDab2 2 · RCSB · ChEMBL 4', () => {
    assert.equal(ANTIBODY_DOMAIN_LIMITS.esmfold, 1);
    assert.equal(ANTIBODY_DOMAIN_LIMITS.colabfold, 2);
    assert.equal(ANTIBODY_DOMAIN_LIMITS.sabdab, 2);
    assert.equal(ANTIBODY_DOMAIN_LIMITS.rcsb, 4);
    assert.equal(ANTIBODY_DOMAIN_LIMITS.chembl, 4);
  });

  test('상한을 넘지 않고 들어온 순서대로 돈다', async () => {
    const limiter = createLimiter();
    const order: number[] = [];
    const gates: Array<() => void> = [];
    const jobs = [0, 1, 2, 3].map((i) =>
      limiter.withLimit('esmfold', async () => {
        order.push(i);
        await new Promise<void>((go) => gates.push(go));
        return i;
      }),
    );
    // 하나만 돌고 셋은 줄을 서요.
    await new Promise<void>((go) => setImmediate(go));
    assert.equal(limiter.running('esmfold'), 1);
    assert.equal(limiter.waiting('esmfold'), 3);
    while (gates.length > 0) {
      gates.shift()?.();
      await new Promise<void>((go) => setImmediate(go));
    }
    assert.deepEqual(await Promise.all(jobs), [0, 1, 2, 3]);
    assert.deepEqual(order, [0, 1, 2, 3]);
    assert.equal(limiter.peak('esmfold'), 1);
  });

  test('ColabFold 는 두 건까지 함께 돈다', async () => {
    const limiter = createLimiter();
    const gates: Array<() => void> = [];
    const jobs = [0, 1, 2].map(() => limiter.withLimit('colabfold', () => new Promise<void>((go) => gates.push(go))));
    await new Promise<void>((go) => setImmediate(go));
    assert.equal(limiter.running('colabfold'), 2);
    while (gates.length > 0) {
      gates.shift()?.();
      await new Promise<void>((go) => setImmediate(go));
    }
    await Promise.all(jobs);
    assert.equal(limiter.peak('colabfold'), 2);
  });
});

describe('해시 · 캐시 키', () => {
  test('서열 해시는 결정적이고, 경쇄가 없을 때도 던지지 않는다', () => {
    const vh = 'QVQLKQSGPGLVQPSQSLSITC';
    assert.equal(seqHash(vh), seqHash(` ${vh.toLowerCase()} \n`));
    assert.notEqual(seqHash(vh), seqHash(vh, 'DILLTQSPVILSVS'));
    // `normalizeSeq('')` 는 SeqFormatError 라 빈 경쇄는 정규화를 거치지 않아요(묶음 1 메모).
    assert.equal(seqHash(vh, null), seqHash(vh, ''));
    assert.equal(seqHash(vh).length, 64);
    assert.throws(() => seqHash('QVQL-X*'));
  });

  test('캐시 키는 칸 순서에 흔들리지 않는다', () => {
    assert.equal(cacheKey('e', { a: 1, b: 2 }), cacheKey('e', { b: 2, a: 1 }));
    assert.notEqual(cacheKey('e', { a: 1 }), cacheKey('f', { a: 1 }));
    assert.equal(canonicalJson({ b: [2, { d: 1, c: 2 }], a: undefined }), '{"b":[2,{"c":2,"d":1}]}');
  });
});

describe('3층 강등 · dataMode 결정 규칙(§3.3)', () => {
  const opts = (over: Partial<Parameters<typeof tiered<string>>[0]>) => ({
    store: memoryCacheStore(),
    key: 'k',
    provider: 'p',
    offline: false,
    decode: (b: string) => b,
    ...over,
  });

  test('외부 호출 성공 → live · 캐시 적중 → cached', async () => {
    const store = memoryCacheStore();
    let calls = 0;
    const live = async () => {
      calls += 1;
      return { value: '값', body: '값' };
    };
    assert.deepEqual(await tiered(opts({ store, live })), { value: '값', dataMode: 'live' });
    assert.deepEqual(await tiered(opts({ store, live })), { value: '값', dataMode: 'cached' });
    assert.equal(calls, 1, '캐시가 적중하면 외부를 다시 부르지 않아요');
    assert.equal(store.size(), 1);
  });

  test('둘 다 실패 → fixture', async () => {
    const got = await tiered(
      opts({
        live: async () => {
          throw new AdapterError('upstream_error', 502, '끊김');
        },
        fixture: () => '예시',
      }),
    );
    assert.deepEqual(got, { value: '예시', dataMode: 'fixture' });
  });

  test('offline 이면 외부를 부르지 않는다 — 캐시 적중이면 cached, 아니면 fixture', async () => {
    const store = memoryCacheStore();
    let calls = 0;
    const live = async () => {
      calls += 1;
      return { value: 'x', body: 'x' };
    };
    assert.deepEqual(await tiered(opts({ store, offline: true, live, fixture: () => '예시' })), { value: '예시', dataMode: 'fixture' });
    await store.put({ key: 'k', provider: 'p', body: '캐시', storedAt: new Date().toISOString() });
    assert.deepEqual(await tiered(opts({ store, offline: true, live, fixture: () => '예시' })), { value: '캐시', dataMode: 'cached' });
    assert.equal(calls, 0);
  });

  test('세 층 모두 비면 없는 값을 만들지 않고 503 으로 알린다', async () => {
    await assert.rejects(
      () => tiered(opts({ live: async () => { throw new Error('끊김'); } })),
      (e: unknown) => e instanceof AdapterError && e.code === 'no_fallback' && e.status === 503,
    );
  });

  test('학생 입력이 잘못된 것은 강등하지 않고 그대로 알린다', async () => {
    await assert.rejects(
      () => tiered(opts({ live: async () => { throw new AdapterError('sequence_too_long', 413, '너무 길어요'); }, fixture: () => '예시' })),
      (e: unknown) => e instanceof AdapterError && e.code === 'sequence_too_long',
    );
  });

  test('withCache 는 캐시 한 층만 — 두 번째는 외부를 부르지 않는다', async () => {
    const store = memoryCacheStore();
    let calls = 0;
    const fn = async () => {
      calls += 1;
      return { n: 7 };
    };
    assert.deepEqual(await withCache(store, 'k', 'p', fn), { value: { n: 7 }, dataMode: 'live' });
    assert.deepEqual(await withCache(store, 'k', 'p', fn), { value: { n: 7 }, dataMode: 'cached' });
    assert.equal(calls, 1);
  });

  test('여러 층이 섞이면 가장 약한 쪽으로 말한다', () => {
    assert.equal(mergeDataMode(['live', 'cached']), 'live');
    assert.equal(mergeDataMode(['live', 'fixture']), 'fixture');
    assert.equal(mergeDataMode(['cached', 'cached']), 'cached');
    assert.equal(mergeDataMode([]), 'fixture');
  });

  test('배지는 층에 따라 달라지고 fixture 에는 수집 날짜가 붙는다', () => {
    const endpoint = 'https://example.test';
    assert.equal(provenanceOf({ dataMode: 'live', label: '자료 조회', detail: 'd', endpoint, calledAt: 'T', elapsedMs: 5 }).calledAt, 'T');
    assert.equal(provenanceOf({ dataMode: 'cached', label: '자료 조회', detail: 'd', endpoint }).label, '자료 조회(캐시)');
    const fx = provenanceOf({ dataMode: 'fixture', label: '자료 조회', detail: 'd', endpoint, collectedOn: FIXTURE_COLLECTED_ON });
    assert.equal(fx.source, 'precomputed');
    assert.equal(fx.label, '사전 계산');
    assert.equal(fx.collectedOn, '2026-10-24');
  });
});

describe('ChEMBL 어댑터', () => {
  test('max_phase 는 문자열로 온다 — 숫자로 바꾸고 원문도 남긴다', () => {
    assert.equal(parseMaxPhase('4.0'), 4);
    assert.equal(parseMaxPhase('3.0'), 3);
    assert.equal(parseMaxPhase(2), 2);
    assert.equal(parseMaxPhase(null), null);
    assert.equal(parseMaxPhase('없음'), null);
    const raw = readFixtureJson<{ molecules: Array<{ max_phase?: unknown }> }>('chembl/molecules-CHEMBL203.json');
    assert.ok(raw);
    assert.equal(typeof raw.molecules[0]?.max_phase, 'string', '실제 응답에서 max_phase 는 문자열이에요');
    const rows = parseAntibodyRows(raw as never);
    assert.equal(rows.length, 15);
    const cetuximab = rows.find((r) => r.chemblId === 'CHEMBL1201577');
    assert.deepEqual(
      { name: cetuximab?.name, maxPhase: cetuximab?.maxPhase, maxPhaseRaw: cetuximab?.maxPhaseRaw, firstApproval: cetuximab?.firstApproval },
      { name: 'CETUXIMAB', maxPhase: 4, maxPhaseRaw: '4.0', firstApproval: 2004 },
    );
    // 임상 단계 내림차순 → 승인 연도 오름차순으로 결정적으로 줄을 세워요.
    assert.deepEqual(rows.slice(0, 3).map((r) => r.name), ['CETUXIMAB', 'PANITUMUMAB', 'NECITUMUMAB']);
  });

  test('사슬 서열 키는 biocomponents — bio_component_sequences 가 아니다(노트북 셀3)', () => {
    const raw = readFixtureJson<Record<string, unknown>>('chembl/molecule-CHEMBL1201577.json');
    assert.ok(raw);
    const bt = raw.biotherapeutic as Record<string, unknown>;
    assert.ok(Array.isArray(bt.biocomponents));
    assert.equal(bt.bio_component_sequences, undefined);
    const chains = parseParentChains(raw as never, 'CHEMBL1201577');
    assert.equal(chains.name, 'CETUXIMAB');
    assert.equal(chains.heavyFull.length, 452);
    assert.equal(chains.lightFull?.length, 213);
    // 전장 사슬은 ESMFold 400잔기 상한을 넘고, 가변영역만 자르면 들어가요.
    assert.ok(chains.heavyFull.length > ESMFOLD_MAX_RESIDUES);
    assert.equal(chains.vh.length, 119);
    assert.equal(chains.vl?.length, 107);
    assert.ok(chains.vh.startsWith('QVQLKQSGPGL') && chains.vh.endsWith('WGQGTLVTVSA'));
  });

  test('ChEMBL 번호 모양을 먼저 거른다', () => {
    assert.equal(requireChemblId(' chembl203 '), 'CHEMBL203');
    assert.throws(() => requireChemblId("CHEMBL203' or 1=1"), (e: unknown) => e instanceof AdapterError && e.status === 400);
  });

  test('live → cached → offline fixture 가 모두 돌고 배지가 붙는다', async () => {
    const mech = readFixtureText('chembl/mechanism-CHEMBL203.json');
    const mols = readFixtureText('chembl/molecules-CHEMBL203.json');
    assert.ok(mech && mols);
    const { fetch, calls } = recorder([
      [/mechanism\.json/u, () => text(mech, 200)],
      [/molecule\.json/u, () => text(mols, 200)],
    ]);
    const cache = memoryCacheStore();
    const adapter = createChemblAdapter({ fetch, userAgent: UA, cache, retry: noSleep });

    const live = await adapter.searchAntibodies('CHEMBL203');
    assert.equal(live.dataMode, 'live');
    assert.equal(live.value.length, 15);
    assert.equal(live.provenance.approx, false);
    assert.equal(live.provenance.source, 'lookup');
    assert.match(live.provenance.endpoint ?? '', /molecule\.json/u);
    assert.ok(calls.some((u) => u.includes(`only=${CHEMBL_MOLECULE_FIELDS.join(',')}`)), 'only= 로 칸을 줄여 받아요');

    const before = calls.length;
    const cached = await adapter.searchAntibodies('CHEMBL203');
    assert.equal(cached.dataMode, 'cached');
    assert.equal(calls.length, before, '캐시가 있으면 외부를 다시 부르지 않아요');

    const offline = createChemblAdapter({ fetch: async () => { throw new Error('네트워크 없음'); }, userAgent: UA, cache: memoryCacheStore(), offline: true });
    const fx = await offline.searchAntibodies('CHEMBL203');
    assert.equal(fx.dataMode, 'fixture');
    assert.equal(fx.value.length, 15);
    assert.equal(fx.provenance.collectedOn, FIXTURE_COLLECTED_ON);

    const chains = await offline.antibodySequences('CHEMBL1201577');
    assert.equal(chains.dataMode, 'fixture');
    assert.equal(chains.value.vh.length, 119);
  });

  test('offline 인데 고정 예시에 없는 표적이면 만들어 채우지 않는다', async () => {
    const offline = createChemblAdapter({ fetch: async () => { throw new Error('부르면 안 돼요'); }, userAgent: UA, cache: memoryCacheStore(), offline: true });
    await assert.rejects(() => offline.searchAntibodies('CHEMBL9999'), (e: unknown) => e instanceof AdapterError && e.code === 'no_fallback');
  });
});

describe('RCSB 어댑터', () => {
  test('체인 역할을 설명 문구로 가린다(노트북 셀13 하드코딩을 쓰지 않는다)', () => {
    assert.equal(chainRoleOf('Cetuximab Fab Heavy chain'), 'heavy');
    assert.equal(chainRoleOf('Herceptin Fab (antibody) - light chain'), 'light');
    assert.equal(chainRoleOf('Epidermal Growth Factor Receptor'), 'antigen');
    assert.equal(chainRoleOf('Vascular endothelial growth factor receptor 2'), 'antigen');
  });

  test('실제 GraphQL 응답에서 해상도 · 체인 조가 설계 §2.3 값과 같다', () => {
    const raw = readFixtureJson<never>('rcsb/graphql-entries.json');
    assert.ok(raw);
    const metas = parseStructureMeta(raw);
    const by = (id: string) => metas.find((m) => m.pdb === id);
    assert.deepEqual(by('1YY9')?.sets, [{ set: '1', H: 'D', L: 'C', AG: 'A' }]);
    assert.deepEqual(by('1N8Z')?.sets, [{ set: '1', H: 'B', L: 'A', AG: 'C' }]);
    assert.deepEqual(by('3S37')?.sets, [{ set: '1', H: 'H', L: 'L', AG: 'X' }]);
    assert.equal(by('1YY9')?.resolutionAngstrom, 2.605);
    assert.equal(by('3S37')?.entities.find((e) => e.role === 'antigen')?.length, 122);
  });

  test('복합체가 2벌인 PDB 는 체인 조가 둘 — ChainRoles.set 으로 가른다(5SX4)', () => {
    const raw = readFixtureJson<never>('rcsb/graphql-entries.json');
    assert.ok(raw);
    const meta = parseStructureMeta(raw).find((m) => m.pdb === '5SX4');
    assert.ok(meta);
    assert.deepEqual(meta.sets, [
      { set: '1', H: 'H', L: 'I', AG: 'M' },
      { set: '2', H: 'J', L: 'L', AG: 'N' },
    ]);
  });

  test('항원이 한 벌뿐이면 조마다 같은 항원을 쓴다', () => {
    const sets = chainSetsOf([
      { entityId: '1', description: 'heavy chain', authChains: ['H', 'J'], length: 1, seq: '', role: 'heavy' },
      { entityId: '2', description: 'light chain', authChains: ['L', 'K'], length: 1, seq: '', role: 'light' },
      { entityId: '3', description: 'antigen', authChains: ['A'], length: 1, seq: '', role: 'antigen' },
    ]);
    assert.deepEqual(sets, [
      { set: '1', H: 'H', L: 'K', AG: 'A' },
      { set: '2', H: 'J', L: 'L', AG: 'A' },
    ]);
  });

  test('PDB 파일이 404 면 cif 로 넘어간다', async () => {
    const { fetch, calls } = recorder([
      [/1ABC\.pdb$/u, () => text('없어요', 404)],
      [/1ABC\.cif$/u, () => text('data_1ABC\n_entry.id 1ABC\n')],
    ]);
    const adapter = createRcsbAdapter({ fetch, userAgent: UA, cache: memoryCacheStore() });
    const got = await adapter.structureFile('1abc');
    assert.equal(got.value.format, 'cif');
    assert.equal(got.dataMode, 'live');
    assert.equal(calls.length, 2);
  });

  test('offline 이면 받아 둔 PDB 를 그대로 쓴다(1YY9 · 1N8Z · 3S37)', async () => {
    const adapter = createRcsbAdapter({ fetch: async () => { throw new Error('부르면 안 돼요'); }, userAgent: UA, cache: memoryCacheStore(), offline: true });
    for (const target of FIXTURE_TARGETS) {
      const got = await adapter.structureFile(target.pdb);
      assert.equal(got.dataMode, 'fixture');
      assert.equal(got.value.format, 'pdb');
      assert.match(got.value.text, /^HEADER/u);
      assert.ok(got.value.text.includes('ATOM'));
      assert.equal(got.provenance.collectedOn, FIXTURE_COLLECTED_ON);
    }
  });

  test('PDB 번호 · 검색어를 먼저 거른다', () => {
    assert.equal(requirePdbId(' 1yy9 '), '1YY9');
    assert.throws(() => requirePdbId('1YY'), (e: unknown) => e instanceof AdapterError && e.status === 400);
  });
});

describe('ColabFold 어댑터 — 티켓 · 폴링', () => {
  test('PENDING 이면 COMPLETE 가 될 때까지 기다린 뒤 내려받는다', async () => {
    const a3m = '>101\nQVQLK\n>UniRef100_X\nQVQLV\n';
    const tar = gzipSync(tarOf('uniref.a3m', a3m));
    let polls = 0;
    const { fetch, calls } = recorder([
      [/ticket\/msa$/u, () => json({ id: 'TICKET-abcdefgh', status: 'PENDING' })],
      [
        /ticket\/TICKET-abcdefgh$/u,
        () => {
          polls += 1;
          return json({ id: 'TICKET-abcdefgh', status: polls < 3 ? (polls === 1 ? 'PENDING' : 'RUNNING') : 'COMPLETE' });
        },
      ],
      [/result\/download/u, () => new Response(tar, { status: 200 })],
    ]);
    const phases: string[] = [];
    const adapter = createColabfoldAdapter({ fetch, userAgent: UA, cache: memoryCacheStore(), sleep: async () => {}, pollIntervalMs: 0 });
    const got = await adapter.fetchMsa('QVQLK', (p) => phases.push(p));
    assert.equal(got.dataMode, 'live');
    assert.equal(got.value.depth, 2);
    assert.equal(polls, 3);
    assert.deepEqual([...new Set(phases)], ['MSA 제출', '비슷한 단백질 찾기', '결과 받기']);
    assert.ok(calls.some((u) => u.endsWith('/ticket/msa')));
  });

  test('폴링이 끝나지 않으면 상한에서 멈추고 — 고정 예시가 없으면 만들어 채우지 않고 한국어로 알린다', async () => {
    let polls = 0;
    const { fetch } = recorder([
      [/ticket\/msa$/u, () => json({ id: 'TICKET-abcdefgh', status: 'PENDING' })],
      [
        /ticket\/TICKET/u,
        () => {
          polls += 1;
          return json({ id: 'TICKET-abcdefgh', status: 'PENDING' });
        },
      ],
    ]);
    const adapter = createColabfoldAdapter({ fetch, userAgent: UA, cache: NULL_CACHE, sleep: async () => {}, pollIntervalMs: 0, maxPolls: 3 });
    // 어댑터 날것은 504 로 끊어요.
    await assert.rejects(() => adapter.downloadMsa('TICKET-!!'), (e: unknown) => e instanceof AdapterError && e.code === 'invalid_input');
    // `fetchMsa` 는 3층 강등을 거쳐요 — 받아 둔 예시가 없는 서열이면 ③ 안내(503)로 끝나요(§3.4).
    await assert.rejects(
      () => adapter.fetchMsa('QVQLKQSGPGLVQPSQ'),
      (e: unknown) => e instanceof AdapterError && e.code === 'no_fallback' && e.status === 503 && /다시 시도/u.test(e.message),
    );
    assert.equal(polls, 3, '폴링 상한에서 멈춰야 해요');
  });

  test('ERROR · MAINTENANCE · 모르는 상태를 구분해 읽는다', () => {
    assert.deepEqual(parseTicket('{"id":"a","status":"complete"}'), { id: 'a', status: 'COMPLETE' });
    assert.equal(parseTicket('{"id":"a","status":"MAINTENANCE"}').status, 'MAINTENANCE');
    assert.equal(parseTicket('{"id":"a"}').status, 'UNKNOWN');
    assert.throws(() => parseTicket('<html>'), (e: unknown) => e instanceof AdapterError);
  });

  test('tar.gz 에서 uniref.a3m 하나만 꺼낸다', () => {
    const got = a3mFromTarGz(gzipSync(tarOf('uniref.a3m', '>1\nAA\n')));
    assert.equal(got, '>1\nAA\n');
    assert.throws(() => a3mFromTarGz(gzipSync(tarOf('other.txt', 'x'))), (e: unknown) => e instanceof AdapterError);
    assert.throws(() => a3mFromTarGz(new Uint8Array([1, 2, 3])), (e: unknown) => e instanceof AdapterError);
  });

  test('받아 둔 세툭시맙 VH MSA 는 7,304 서열이고 offline 에서 그대로 쓴다', async () => {
    const a3m = readFixtureText('colabfold/1YY9-H-uniref.a3m.gz');
    assert.ok(a3m);
    assert.equal(msaDepth(a3m), 7304);
    const vh = a3m.split('\n')[1];
    assert.ok(vh && vh.length === 119);
    const adapter = createColabfoldAdapter({ fetch: async () => { throw new Error('부르면 안 돼요'); }, userAgent: UA, cache: memoryCacheStore(), offline: true });
    const got = await adapter.fetchMsa(vh);
    assert.equal(got.dataMode, 'fixture');
    assert.equal(got.value.depth, 7304);
    assert.match(got.provenance.detail, /7,304/u);
  });
});

describe('SAbDab2 어댑터', () => {
  test('확장 PDB ID 로 바꿔 부른다 — 짧은 ID 는 404(§3.1 표)', async () => {
    assert.equal(extendPdbId('1YY9'), 'pdb_00001yy9');
    assert.equal(extendPdbId('pdb_00001yy9'), 'pdb_00001yy9');
    assert.throws(() => extendPdbId('1YY'), (e: unknown) => e instanceof AdapterError && e.status === 400);
    const { fetch, calls } = recorder([[/frontend\/pdb/u, () => json({ id: 'pdb_00001yy9' })]]);
    const adapter = createSabdabAdapter({ fetch, userAgent: UA, cache: memoryCacheStore() });
    await adapter.entry('1YY9');
    assert.equal(calls.length, 1);
    assert.ok(calls[0]?.endsWith('/frontend/pdb/pdb_00001yy9'), `확장 ID 로 불러야 해요 — ${calls[0]}`);
  });

  test('IMGT 번호를 간격까지 그대로 옮긴다', () => {
    const raw = readFixtureText('sabdab/similarity-1YY9.json');
    assert.ok(raw);
    const got = parseNumbering(raw);
    assert.deepEqual(got.chains.map((c) => c.chain), ['H', 'L']);
    const heavy = got.chains[0];
    assert.ok(heavy);
    assert.equal(heavy.positions.length, 128, 'IMGT 는 간격을 둬서 자리 수가 서열 길이보다 많아요');
    assert.equal(heavy.positions[9]?.aa, '-', 'IMGT 10번은 비어 있어요');
    assert.equal(seqOf(heavy).length, 119);
    assert.ok(got.nearest.length > 0 && got.nearest[0]?.score === 100);
  });

  test('offline 이면 받아 둔 번호를 쓰고, 다른 서열이면 만들어 채우지 않는다', async () => {
    const raw = readFixtureText('sabdab/similarity-1YY9.json');
    assert.ok(raw);
    const heavy = parseNumbering(raw).chains[0];
    assert.ok(heavy);
    const adapter = createSabdabAdapter({ fetch: async () => { throw new Error('부르면 안 돼요'); }, userAgent: UA, cache: memoryCacheStore(), offline: true });
    const got = await adapter.imgtNumbering(seqOf(heavy));
    assert.equal(got.dataMode, 'fixture');
    assert.equal(got.value.chains.length, 2);
    await assert.rejects(() => adapter.imgtNumbering('QVQLKQSGPGLVQPSQ'), (e: unknown) => e instanceof AdapterError && e.code === 'no_fallback');
  });

  test('all-summary 는 쉼표 구분 CSV — 따옴표 안 쉼표에 칸이 밀리지 않는다', () => {
    const text = readFixtureText('sabdab/all-summary-head.csv.gz');
    assert.ok(text);
    const head = text.split('\n')[0] ?? '';
    assert.ok(head.includes(','), '쉼표 구분이에요');
    assert.equal(head.includes('\t'), false, '탭 구분이 아니에요');
    assert.deepEqual(head.split(',').slice(0, 5), ['INSTANCE', 'PDB', 'SABDAB_ID', 'HEAVY_ID', 'LIGHT_ID']);
    assert.ok(text.includes('"'), '따옴표로 감싼 칸이 들어 있어요(compound 이름)');

    const rows = parseAllSummary(text);
    assert.equal(rows.length, 399, '머리줄 1 + 399행을 받아 뒀어요');
    const first = rows[0];
    assert.ok(first);
    assert.equal(first.pdb, 'pdb_000010bt');
    assert.equal(first.cdrH3, 'TLTLITDYDVMEY');
    assert.equal(first.cdrL3, 'LQYDNLYT');
    assert.ok(rows.every((r) => r.pdb.startsWith('pdb_')), '칸이 밀리면 PDB 칸에 다른 값이 들어와요');

    // 파서 단위 — 따옴표 · 두 겹 따옴표 · 줄바꿈
    assert.deepEqual(parseCsv('a,b\n"x,1","he said ""hi""",\n'), [['a', 'b'], ['x,1', 'he said "hi"', '']]);
  });

  test('머리줄이 쉼표 CSV 가 아니면 그 사실을 알린다', () => {
    assert.throws(() => parseAllSummary('PDB\tHchain\tCDR-H3\nx\ty\tz\n'), (e: unknown) => e instanceof AdapterError && /쉼표 구분 CSV/u.test(e.message));
  });

  test('요청 경로 상한으로는 all-summary 를 못 받고, 시드 상한으로는 받는다', async () => {
    const csv = `PDB,Hchain,Lchain,VH,VL,CDR-H1,CDR-H2,CDR-H3,CDR-L1,CDR-L2,CDR-L3,antigen_type\n${'pdb_0000abcd,H,L,QV,DI,GF,IR,TL,QD,YAS,LQ,protein\n'.repeat(60_000)}`;
    assert.ok(csv.length > 2 * 1024 * 1024);
    const serve: FetchLike = async () => text(csv);
    const tight = createSabdabAdapter({ fetch: serve, userAgent: UA, cache: memoryCacheStore(), seedCaps: REQUEST_CAPS.json });
    const got = await tight.allSummary();
    assert.equal(got.dataMode, 'fixture', '요청 경로 상한이면 413 → 고정 예시로 강등돼요');

    const seed = loadAntibodyConfig({} as NodeJS.ProcessEnv).seedLimits;
    const wide = createSabdabAdapter({ fetch: serve, userAgent: UA, cache: memoryCacheStore(), seedCaps: { maxBytes: seed.maxBytes, timeoutMs: seed.timeoutMs } });
    const ok = await wide.allSummary();
    assert.equal(ok.dataMode, 'live');
    assert.equal(ok.value.length, 60_000);
  });
});

describe('ESMFold 어댑터', () => {
  test('400잔기를 넘으면 우리가 먼저 막고, 외부 413 도 같은 뜻으로 올린다', async () => {
    const long = 'A'.repeat(ESMFOLD_MAX_RESIDUES + 1);
    assert.throws(() => requireFoldable(long), (e: unknown) => e instanceof AdapterError && e.code === 'sequence_too_long' && e.status === 413);

    const body = readFixtureText('esmfold/error-413.txt');
    assert.ok(body && /longer than 400/u.test(body));
    const { fetch, calls } = recorder([[/esmatlas/u, () => text(body, 413)]]);
    const adapter = createEsmfoldAdapter({ fetch, userAgent: UA, cache: memoryCacheStore() });
    await assert.rejects(
      () => adapter.foldSequence('A'.repeat(200)),
      (e: unknown) => e instanceof AdapterError && e.code === 'sequence_too_long' && e.upstreamStatus === 413 && /Fv/u.test(e.message),
    );
    assert.equal(calls.length, 1);
  });

  test('두 사슬을 콜론으로 이어 보내면 422 — 사슬을 따로 접거나 scFv 로 이으라고 알린다', async () => {
    assert.throws(() => requireFoldable('QVQLK:DILLT'), /아미노산 20종/u);
    const body = readFixtureText('esmfold/error-422.txt');
    assert.ok(body && /only allowed to have/u.test(body));
    const { fetch } = recorder([[/esmatlas/u, () => text(body, 422)]]);
    const adapter = createEsmfoldAdapter({ fetch, userAgent: UA, cache: memoryCacheStore() });
    await assert.rejects(
      () => adapter.foldSequence('QVQLKQSGPGL'),
      (e: unknown) => e instanceof AdapterError && e.status === 422 && /GGGGS/u.test(e.message),
    );
  });

  test('확신도는 0~1 로 와서 0~100 으로 올려 보낸다(§3.1 주의)', () => {
    const pdb = readFixtureText('esmfold/1YY9-H-fv.pdb.gz');
    assert.ok(pdb);
    const raw = pdb.split('\n').filter((l) => l.startsWith('ATOM')).map((l) => Number(l.slice(60, 66)));
    assert.ok(Math.max(...raw) <= 1.0001, '원문 B-factor 는 0~1 이에요');
    const { perResidue, mean } = confidenceFromPdb(pdb);
    assert.equal(perResidue.length, 119);
    assert.ok(mean > 50 && mean <= 100, `0~100 으로 올려야 해요 — ${mean}`);
    assert.ok(perResidue.every((v) => v >= 0 && v <= 100));
    assert.equal(seqFromPdb(pdb)?.length, 119);
  });

  test('offline 이면 받아 둔 Fv · scFv 예측을 그대로 쓴다', async () => {
    const fv = readFixtureText('esmfold/1YY9-H-fv.pdb.gz');
    const scfv = readFixtureText('esmfold/1YY9-scfv.pdb.gz');
    assert.ok(fv && scfv);
    const vh = seqFromPdb(fv);
    const joined = seqFromPdb(scfv);
    assert.ok(vh && joined);
    assert.equal(joined.length, 241);
    assert.ok(joined.includes(SCFV_LINKER), 'scFv 는 GGGGS×3 링커로 이었어요');

    const adapter = createEsmfoldAdapter({ fetch: async () => { throw new Error('부르면 안 돼요'); }, userAgent: UA, cache: memoryCacheStore(), offline: true });
    const got = await adapter.foldSequence(vh);
    assert.equal(got.dataMode, 'fixture');
    assert.equal(got.value.perResidue.length, 119);
    assert.equal(got.provenance.source, 'precomputed');

    const vl = joined.slice(vh.length + SCFV_LINKER.length);
    const asScfv = await adapter.foldScfv(vh, vl);
    assert.equal(asScfv.dataMode, 'fixture');
    assert.equal(asScfv.value.shape, 'scfv');
  });

  test('성공하면 배지가 실제 AI 예측이고 한계를 적는다', async () => {
    const pdb = readFixtureText('esmfold/1YY9-H-fv.pdb.gz');
    assert.ok(pdb);
    const { fetch } = recorder([[/esmatlas/u, () => text(pdb)]]);
    const adapter = createEsmfoldAdapter({ fetch, userAgent: UA, cache: memoryCacheStore() });
    const got = await adapter.foldSequence(seqFromPdb(pdb) ?? '');
    assert.equal(got.dataMode, 'live');
    assert.equal(got.provenance.source, 'ai-predict');
    assert.equal(got.provenance.label, '실제 AI 예측');
    assert.equal(got.provenance.approx, false);
    assert.match(got.provenance.detail, /자기 확신값/u);
    assert.equal(got.provenance.endpoint, ESMFOLD_URL);
  });
});

describe('선택 경로 — 폐지된 NIM 엔드포인트를 쓰지 않는다(§3.3)', () => {
  test('ProteinMPNN 설계 경로 하나만 부른다', async () => {
    assert.equal(NIM_PROTEINMPNN_URL, 'https://health.api.nvidia.com/v1/biology/ipd/proteinmpnn/predict');
    for (const dead of ['/biology/nvidia/esmfold', 'alphafold2', 'alphafold2-multimer']) {
      assert.equal(NIM_PROTEINMPNN_URL.includes(dead), false);
    }
    const { fetch, calls } = recorder([[/proteinmpnn/u, () => json({ mfasta: '>원본\nQVQLK\n>설계1, score=0.4\nQVQLV\n' })]]);
    const nim = createNimAdapter({ fetch, apiKey: 'test-key', userAgent: UA });
    assert.ok(nim);
    const got = await nim.suggestWithNim({ pdb: 'ATOM …', chains: ['D'], boldness: 'bold' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0], NIM_PROTEINMPNN_URL);
    assert.equal(got.suggestions.length, 2);
    assert.deepEqual(got.suggestions.map((s) => s.seq), ['QVQLK', 'QVQLV']);
    assert.equal(got.provenance.approx, false);
  });

  test('과감함이 높을수록 샘플링 온도가 높다 — 노트북 셀15 설명은 뒤집혀 있었다', () => {
    assert.ok(NIM_SAMPLING_TEMP.conservative < NIM_SAMPLING_TEMP.normal);
    assert.ok(NIM_SAMPLING_TEMP.normal < NIM_SAMPLING_TEMP.bold);
  });

  test('mfasta 를 읽는다', () => {
    assert.deepEqual(parseMfasta('>a\nQV\nQL\n>b\nDI\n'), [
      { header: 'a', seq: 'QVQL' },
      { header: 'b', seq: 'DI' },
    ]);
    assert.deepEqual(parseMfasta(''), []);
  });

  test('Boltz 는 복합체 신뢰도만 읽는다 — 결합력 지표는 리간드 전용이라 쓰지 않는다', async () => {
    const { fetch, calls } = recorder([[/boltz/u, () => json({ metrics: { iptm: 0.71, complex_plddt: 84.2, binding_confidence: 0.9 } })]]);
    const boltz = createBoltzAdapter({ fetch, apiKey: 'k', userAgent: UA });
    assert.ok(boltz);
    const got = await boltz.predictComplexWithBoltz({ vh: 'QVQLK', vl: 'DILLT', antigen: 'LEEKK' });
    assert.equal(got.iptm, 0.71);
    assert.equal(got.complexConfidence, 84.2);
    assert.equal(Object.keys(got).includes('bindingConfidence'), false);
    assert.match(got.provenance.detail, /결합력\(affinity\)이 아니에요/u);
    assert.equal(calls.length, 1);
  });
});

describe('설정 · 고정 예시 목록', () => {
  test('선택 키가 없으면 근사 모드 — 있으면 그대로 읽는다(값은 출력하지 않는다)', () => {
    const empty = loadAntibodyConfig({} as NodeJS.ProcessEnv);
    assert.deepEqual({ offline: empty.offline, nvidiaKey: empty.nvidiaKey, boltzKey: empty.boltzKey }, { offline: false, nvidiaKey: null, boltzKey: null });
    assert.match(empty.userAgent, /crista-web-edu/u);
    const set = loadAntibodyConfig({ WEB_ANTIBODY_OFFLINE: '1', NVIDIA_API_KEY: ' nv ', BOLTZ_API_KEY: 'bz' } as unknown as NodeJS.ProcessEnv);
    assert.equal(set.offline, true);
    assert.equal(set.nvidiaKey, 'nv');
    assert.equal(set.boltzKey, 'bz');
    assert.throws(() => loadAntibodyConfig({ WEB_ANTIBODY_SEED_MAX_BYTES: '10' } as unknown as NodeJS.ProcessEnv));
  });

  test('표적 3종이 모두 항원 복합체이고 원자료가 저장소에 있다', () => {
    assert.deepEqual(FIXTURE_TARGETS.map((t) => [t.target, t.pdb, t.parentAntibodyName]), [
      ['EGFR', '1YY9', 'CETUXIMAB'],
      ['HER2', '1N8Z', 'TRASTUZUMAB'],
      ['VEGFR2', '3S37', 'RAMUCIRUMAB'],
    ]);
    for (const t of FIXTURE_TARGETS) {
      const set = t.sets[0];
      assert.ok(set, `${t.pdb} 는 체인 조가 있어야 해요`);
      assert.ok(set.AG, `${t.pdb} 는 항원 체인이 있어야 해요(Fab 단독 구조를 기본값으로 두지 않아요)`);
      for (const rel of Object.values(t.files)) assert.notEqual(readFixtureText(rel), null, `${rel} 이 저장소에 없어요`);
    }
    // 1BJ1(VEGF-A · 리간드 중화 항체)은 fixture 에서 뺐어요(§2.3).
    assert.equal(fixtureByPdb('1BJ1'), null);
  });

  test('파생 값은 fixture 에 굽지 않는다 — 원자료만 있다', () => {
    for (const t of FIXTURE_TARGETS) {
      for (const rel of Object.values(t.files)) {
        assert.match(rel, /\.(json|pdb|a3m|csv)(\.gz)?$/u, `${rel} 은 원자료 확장자여야 해요`);
      }
    }
    // 파생 값 파일은 fixture 폴더에 아예 없고, 폴더 밖 경로는 읽지 않아요.
    assert.equal(readFixtureText('diversity.json'), null);
    assert.throws(() => readFixtureText('../diversity.ts'), /폴더 밖/u);
    assert.throws(() => readFixtureText('../../../../etc/passwd'), /폴더 밖/u);
  });
});

describe('네트워크를 끊어도 A1~A4 가 고정 예시로 돌아간다(§3.4 완료 조건)', () => {
  test('모든 단계가 fixture 로 값과 배지를 함께 준다 — 외부는 한 번도 부르지 않는다', async () => {
    let calls = 0;
    const dead: FetchLike = async () => {
      calls += 1;
      throw new Error('네트워크 없음');
    };
    const shared = { fetch: dead, userAgent: UA, cache: memoryCacheStore(), offline: true };
    const chembl = createChemblAdapter(shared);
    const rcsb = createRcsbAdapter(shared);
    const colabfold = createColabfoldAdapter({ ...shared, sleep: async () => {}, pollIntervalMs: 0 });
    const sabdab = createSabdabAdapter(shared);
    const esmfold = createEsmfoldAdapter(shared);
    const modes: string[] = [];

    // A1 — 표적 → 치료항체 표 → 원본 사슬 서열 → 구조 후보 메타 · 구조 파일
    const table = await chembl.searchAntibodies('CHEMBL203');
    const parent = await chembl.antibodySequences('CHEMBL1201577');
    const meta = await rcsb.structureMeta(['1YY9']);
    const file = await rcsb.structureFile('1YY9');
    // A2 — MSA(다양성 재료) · IMGT 번호
    const msa = await colabfold.fetchMsa(parent.value.vh);
    const numbering = await sabdab.imgtNumbering(parent.value.vh, parent.value.vl);
    // A2 보조 — CDR 길이 분포 원자료
    const summary = await sabdab.allSummary();
    // A4 — 접힘 예측
    const fold = await esmfold.foldSequence(parent.value.vh);

    for (const step of [table, parent, meta, file, msa, numbering, summary, fold]) {
      modes.push(step.dataMode);
      assert.equal(step.dataMode, 'fixture');
      // 모든 반환에 출처 배지가 붙고, 미리 받아 둔 자료임을 날짜로 말해요.
      assert.equal(step.provenance.source, 'precomputed');
      assert.equal(step.provenance.collectedOn, FIXTURE_COLLECTED_ON);
      assert.ok(step.provenance.detail.length > 0);
      assert.ok((step.provenance.endpoint ?? '').startsWith('https://'));
    }
    assert.equal(modes.length, 8);
    assert.equal(calls, 0, 'offline 이면 fetch 를 한 번도 부르지 않아요');
    assert.equal(mergeDataMode(modes as never), 'fixture');

    // 값이 실제로 이어 붙는지 — A1 서열이 A2 MSA 의 질의이고 A4 가 그 서열을 접었어요.
    assert.equal(msa.value.a3m.split('\n')[1], parent.value.vh);
    assert.equal(seqOf(numbering.value.chains[0] as never), parent.value.vh);
    assert.equal(fold.value.perResidue.length, parent.value.vh.length);
    assert.equal(meta.value[0]?.sets[0]?.AG, 'A');
    assert.ok(file.value.text.includes('ATOM'));
    assert.ok(summary.value.length > 0);
  });
});

// ── tar 한 칸 만들기(테스트 도우미) ─────────────────────────────────────────

function tarOf(name: string, body: string): Uint8Array {
  const data = new TextEncoder().encode(body);
  const block = new Uint8Array(512 + Math.ceil(data.byteLength / 512) * 512 + 1024);
  const put = (at: number, s: string) => block.set(new TextEncoder().encode(s), at);
  put(0, name);
  put(100, '0000644\0');
  put(124, `${data.byteLength.toString(8).padStart(11, '0')}\0`);
  put(156, '0');
  block.set(data, 512);
  return block;
}
