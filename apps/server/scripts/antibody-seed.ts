#!/usr/bin/env node
/**
 * 항체 랩 시드 — **수동 실행 전용**(설계 §7 묶음 4 · §5.3).
 *
 *   npm run antibody:seed            표적 3종의 계면 잔기쌍 · σ · CDR 길이 분포를 채운다
 *   npm run antibody:seed -- --cdr-only       CDR 길이 분포만
 *   npm run antibody:seed -- --interfaces-only 계면만
 *   npm run antibody:seed -- --online         SAbDab2 all-summary(17.5MB · 약 100초)를 실제로 받는다(기본은 고정 예시 400줄)
 *
 * 요청 경로에서는 **절대 부르지 않는다** — 이 파일은 `apps/server/src/` 안의 어떤 모듈도 import 하지 않는 쪽에서
 * 불러 쓰지 않으며, `apps/server/test/antibody-server.test.ts` 가 '요청 경로가 이 스크립트를 쓰지 않음'을 고정한다.
 *
 * 파생 값은 묶음 3 의 순수 함수로 만든다:
 *   ① `interfacePairs(pdbText, roles)` → ② `toFvPairs(result, {H, L})` → ③ `resolveNumbering` 으로 CDR →
 *   ④ CDR 안 모든 자리를 `MutablePosition[]` 으로 → ⑤ `sigmaTarget({pairs, positions, seed: '<표적>:<PDB>'})`.
 * 씨앗을 이 꼴로 써야 `constants.ts` 의 `TARGET_CALIBRATION` σ 와 같은 값이 나온다(묶음 3 테스트가 고정).
 */
import { parseArgs } from 'node:util';
import pg from 'pg';
import { normalizeSeq, type AbChain, type ChainRoles } from '@crista-web/web-contract';
import { CH1_HEAD, CL_KAPPA_HEAD, FIXTURE_TARGETS, readFixtureText } from '../src/features/antibody/fixtures.ts';
import { interfacePairs, toFvPairs } from '../src/features/antibody/interface.ts';
import { resolveNumbering } from '../src/features/antibody/numbering.ts';
import { sigmaTarget, type MutablePosition } from '../src/features/antibody/sigma.ts';
import { parseParentChains, variableRegion } from '../src/features/antibody/chembl.ts';
import { parseAllSummary } from '../src/features/antibody/sabdab.ts';
import type { InterfaceContact } from '../src/features/antibody/bind-score.ts';

const { values: flags } = parseArgs({
  options: {
    'cdr-only': { type: 'boolean', default: false },
    'interfaces-only': { type: 'boolean', default: false },
    online: { type: 'boolean', default: false },
  },
  strict: true,
});

const log = (message: string): void => {
  process.stderr.write(`[antibody-seed] ${message}\n`);
};

const url = process.env.WEB_DATABASE_URL;
if (!url) {
  log('WEB_DATABASE_URL 이 없습니다. `npm run antibody:seed` 로 실행하세요.');
  process.exit(1);
}
const db = new pg.Client({ connectionString: url, application_name: 'crista-web-antibody-seed' });
await db.connect();

const have = await db.query<{ n: number }>(
  `select count(*)::int as n from information_schema.tables where table_schema = 'web' and table_name in ('antibody_interfaces', 'antibody_cdr_stats')`,
);
if ((have.rows[0]?.n ?? 0) < 2) {
  log('web.antibody_* 표가 없습니다. 먼저 `npm run db:migrate:local` 을 돌리세요.');
  process.exit(1);
}

/** 원본 Fv — ChEMBL 고정 예시에서 전장 사슬을 받아 불변 영역 머리 모티프로 자른다(길이를 상수로 박지 않는다). */
function parentFv(target: (typeof FIXTURE_TARGETS)[number]): { vh: string; vl: string | null } {
  const raw = readFixtureText(target.files.molecule);
  if (raw === null) throw new Error(`${target.files.molecule} 를 읽지 못했습니다.`);
  const chains = parseParentChains(JSON.parse(raw) as never, target.parentAntibodyChemblId);
  const vh = chains.vh ?? (chains.heavyFull ? variableRegion(chains.heavyFull, CH1_HEAD) : null);
  const vl = chains.vl ?? (chains.lightFull ? variableRegion(chains.lightFull, CL_KAPPA_HEAD) : null);
  if (!vh) throw new Error(`${target.parentAntibodyName} 의 중쇄 가변영역을 찾지 못했습니다.`);
  return { vh: normalizeSeq(vh), vl: vl ? normalizeSeq(vl) : null };
}

/** CDR 안 모든 자리 — σ 시뮬레이션이 변이를 뽑는 자리 집합. */
function mutablePositions(vh: string, vl: string | null): MutablePosition[] {
  const out: MutablePosition[] = [];
  const add = (chain: AbChain, seq: string): void => {
    const resolved = resolveNumbering({ seq, chain, scheme: 'imgt' });
    for (const cdr of resolved.cdrs) {
      for (let pos = cdr.start; pos <= cdr.end; pos += 1) out.push({ chain, pos, wt: seq[pos - 1] as string });
    }
  };
  add('H', vh);
  if (vl) add('L', vl);
  return out;
}

async function seedInterfaces(): Promise<void> {
  for (const target of FIXTURE_TARGETS) {
    const pdbText = readFixtureText(target.files.pdb);
    if (pdbText === null) {
      log(`${target.pdb} 구조 파일이 없어 건너뜁니다(${target.files.pdb}).`);
      continue;
    }
    const { vh, vl } = parentFv(target);
    for (const set of target.sets) {
      const roles: ChainRoles = { set: set.set, H: set.H, ...(set.L ? { L: set.L } : {}), ...(set.AG ? { AG: set.AG } : {}) };
      const parsed = interfacePairs(pdbText, roles);
      if (!parsed) {
        log(`${target.pdb} 조 ${set.set} — 체인을 찾지 못했습니다(역할 표를 확인하세요).`);
        continue;
      }
      // PDB 에는 결손 잔기가 있어 자리 밀기가 아니라 간격을 허용하는 정렬로 Fv 자리에 맞춘다(묶음 3 메모).
      const fvPairs = toFvPairs(parsed, { H: vh, ...(vl ? { L: vl } : {}) });
      if (!fvPairs) {
        log(`${target.pdb} 조 ${set.set} — 구조 사슬을 원본 Fv 에 맞추지 못했습니다(동일성 90% 미만). 사람이 확인해 주세요.`);
        continue;
      }
      const contacts: InterfaceContact[] = fvPairs.map((p) => ({ chain: p.chain, pos: p.pos, aa: p.aa, agAa: p.agAa }));
      const sigma = sigmaTarget({ pairs: contacts, positions: mutablePositions(vh, vl), seed: `${target.target}:${target.pdb}` });
      const pairs = fvPairs.map((p) => ({ chain: p.chain, pos: p.pos, aa: p.aa, agResi: p.agResi, agAa: p.agAa, dist: p.dist }));
      await db.query(
        `insert into web.antibody_interfaces (reference_pdb, ab_set, ab_chain, ag_chain, pairs, pair_count, sigma_single, energy_stats, parsed_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, now())
         on conflict (reference_pdb, ab_set, ab_chain, ag_chain)
           do update set pairs = excluded.pairs, pair_count = excluded.pair_count, sigma_single = excluded.sigma_single,
                         energy_stats = excluded.energy_stats, parsed_at = now()`,
        [
          target.pdb,
          set.set,
          `${set.H}${set.L ? `/${set.L}` : ''}`.slice(0, 4),
          (set.AG ?? '?').slice(0, 4),
          JSON.stringify(pairs),
          pairs.length,
          sigma?.sigma ?? null,
          JSON.stringify(
            sigma
              ? { meanAbsRaw: sigma.meanAbsRaw, trials: sigma.trials, interfaceHitShare: sigma.interfaceHitShare, source: 'server-calc', approx: true }
              : { source: 'server-calc', approx: true, note: 'σ 를 낼 수 없었어요(계면 쌍 또는 CDR 자리가 없어요).' },
          ),
        ],
      );
      log(`${target.target} · ${target.pdb} 조 ${set.set} — Fv 계면 쌍 ${pairs.length}개 · σ ${sigma ? sigma.sigma.toFixed(4) : '없음'}`);
    }
  }
}

async function seedCdrStats(): Promise<void> {
  let text: string | null = null;
  if (flags.online) {
    // 시드 전용 상한으로 받는다(요청 경로 상한을 쓰면 17.5MB 가 413 을 맞는다).
    log('SAbDab2 all-summary 를 받습니다(17.5MB · 약 100초).');
    const res = await fetch('https://sabdab.opig.stats.ox.ac.uk/api/all-summary', {
      headers: { 'user-agent': process.env.WEB_ANTIBODY_USER_AGENT ?? 'crista-web-edu/0.1 (classroom teaching tool)' },
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) log(`all-summary 응답 ${res.status} — 고정 예시로 내려갑니다.`);
    else text = await res.text();
  }
  if (text === null) {
    text = readFixtureText('sabdab/all-summary-head.csv.gz');
    if (text === null) {
      log('all-summary 고정 예시가 없어 CDR 길이 분포를 건너뜁니다.');
      return;
    }
    log('고정 예시(앞 400줄)로 CDR 길이 분포를 채웁니다 — 전체는 `-- --online` 으로 받으세요.');
  }
  const rows = parseAllSummary(text);
  const counts = new Map<string, number>();
  const bump = (chain: AbChain, cdr: 1 | 2 | 3, seq: string | null): void => {
    if (!seq) return;
    const len = seq.replace(/[^A-Za-z]/g, '').length;
    if (len <= 0 || len > 120) return;
    const key = `${chain}|${cdr}|${len}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (const row of rows) {
    bump('H', 1, row.cdrH1);
    bump('H', 2, row.cdrH2);
    bump('H', 3, row.cdrH3);
    bump('L', 1, row.cdrL1);
    bump('L', 2, row.cdrL2);
    bump('L', 3, row.cdrL3);
  }
  if (counts.size === 0) {
    log('CDR 길이를 세지 못했습니다(응답 칸 이름을 확인하세요).');
    return;
  }
  await db.query('begin');
  try {
    await db.query(`delete from web.antibody_cdr_stats where scheme = 'imgt'`);
    for (const [key, count] of counts) {
      const [chain, cdr, len] = key.split('|') as [string, string, string];
      await db.query(
        `insert into web.antibody_cdr_stats (scheme, chain, cdr, len, count) values ('imgt', $1, $2, $3, $4)
         on conflict (scheme, chain, cdr, len) do update set count = excluded.count`,
        [chain, cdr, Number(len), count],
      );
    }
    await db.query('commit');
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
  log(`CDR 길이 분포 ${counts.size}줄 · 항체 ${rows.length}건.`);
}

try {
  if (!flags['cdr-only']) await seedInterfaces();
  if (!flags['interfaces-only']) await seedCdrStats();
  log('끝났습니다.');
} catch (error) {
  log(`실패: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await db.end();
}
