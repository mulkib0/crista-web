/**
 * 1.1 질환 · 표적 선정 점검(설계 §5.4.2) — 떠 있는 로컬 서버(HTTP) + fixture 워커(8790).
 *
 *   npm run dev:server        (다른 터미널)
 *   node tools/with-local-env.mjs node apps/server/scripts/e2e-target.ts [--keep 파일] [--setup-only]
 *
 * 1. 교사 → 학급(모둠 2) → 학생 2 가입 · 같은 모둠 입사 · 등기.
 * 2. 표적 자료 4질환 — 표적 8개(`targetShortlist`)에 도킹 표적이 있다 · expressionScore 가 온다.
 * 3. 추천 올리기: 도킹 표적이 아닌 targetId → 400 · 모르는 근거 → 400 · 막음 근거 → 400 reason_blocked · 가중치 틀림 → 400 ·
 *    주의만 있는 근거 + 가중치 → 200 · 다시 올리면 바뀜 · 근거 없는 앞 판 요청 → 200(reasons = []).
 * 4. GET /api/board 의 picks 에 reasons · weights 가 보인다 → 확정 → 1.1 완료 · 1.2 열림.
 * `--keep 파일` 을 주면 학생 두 명의 로그인 정보를 그 파일(JSON)에 쓴다(화면 확인용 — 비밀번호는 실행마다 새로 만든 로컬 값).
 * `--setup-only` 는 1 까지만 한다(표적을 아직 정하지 않은 모둠 — 화면으로 올리기 · 확정을 확인할 때).
 * 만든 계정 · 학급은 지우지 않는다(이름에 실행 접미).
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  API,
  checkTargetPickReasons,
  targetShortlist,
  type ApiErrorBody,
  type BoardResponse,
  type DiseaseTargetsResponse,
  type MeResponse,
  type TargetPickRequest,
  type TeacherClassDetail,
} from '@crista-web/web-contract';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3390}`;
const here = dirname(fileURLToPath(import.meta.url));
const suffix = randomBytes(3).toString('hex').slice(0, 4);
const keepAt = process.argv.includes('--keep') ? process.argv[process.argv.indexOf('--keep') + 1] : undefined;
let failed = 0;
async function check(label: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`✓ ${label}`);
  } catch (error) {
    failed += 1;
    console.log(`✗ ${label}\n    ${(error as Error).message.split('\n').join('\n    ')}`);
  }
}

class Agent {
  cookie: string | null = null;
  async call<T = unknown>(method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { origin: BASE, ...(method !== 'GET' ? { 'content-type': 'application/json' } : {}), ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
    const set = res.headers.getSetCookie().find((c) => c.startsWith('crista_web_sid='));
    if (set) this.cookie = set.split(';')[0]!;
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
  }
}

async function main() {
  // ── 1. 학급 · 모둠 ──
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', `tt${suffix}`, '--name', `표적 점검 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  const secret = JSON.parse(run.stdout.trim()) as { password: string };
  const teacher = new Agent();
  assert.equal((await teacher.call('POST', API.login, { loginId: `tt${suffix}`, password: secret.password })).status, 200);
  const cls = (await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `표적 점검 ${suffix}`, teamCount: 2, maxStudents: 4 })).body;
  const team = cls.teams[0]!;
  const people = [
    { loginId: `ta${suffix}`, displayName: '하늘', password: `pw-${suffix}-a1` },
    { loginId: `tb${suffix}`, displayName: '도윤', password: `pw-${suffix}-b2` },
  ];
  const [a, b] = [new Agent(), new Agent()];
  for (const [i, s] of [a, b].entries()) {
    const signup = await s.call<MeResponse>('POST', API.signup, { classCode: cls.code, ...people[i] });
    assert.equal(signup.status, 201, JSON.stringify(signup.body));
    assert.equal((await s.call('POST', API.join(team.id))).status, 200);
  }
  const reg = await a.call('POST', API.registration(team.id), { name: `표적${suffix}`.slice(0, 14), ticker: `T${suffix.replace(/[^a-z]/g, 'x').toUpperCase()}`.slice(0, 4).padEnd(3, 'X') });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  if (keepAt) writeFileSync(keepAt, JSON.stringify({ base: BASE, classCode: cls.code, students: people }, null, 2));
  if (process.argv.includes('--setup-only')) {
    console.log('학급 · 모둠만 만들었어요(--setup-only).');
    process.exit(0);
  }

  const board0 = (await a.call<BoardResponse>('GET', API.board)).body;
  const [alz, nsclc, alk] = [
    board0.diseases.find((d) => d.gene === 'ACHE')!,
    board0.diseases.find((d) => d.gene === 'EGFR')!,
    board0.diseases.find((d) => d.gene === 'ALK')!,
  ];

  // ── 2. 표적 자료 ──
  const data: Record<string, DiseaseTargetsResponse> = {};
  await check('질환 4 · 표적 7 — 한 질환에 도킹 표적이 여럿(비소세포폐암 3 · 2형 당뇨 2)', () => {
    assert.equal(new Set(board0.diseases.map((d) => d.diseaseId)).size, 4);
    assert.equal(board0.diseases.length, 7);
    assert.deepEqual(board0.diseases.filter((d) => d.diseaseId === nsclc.diseaseId).map((d) => d.gene), ['EGFR', 'ALK', 'ERBB2']);
    assert.equal(alk.diseaseId, nsclc.diseaseId);
    assert.ok(alk.referenceKcal < 0 && alk.referenceLigand.smiles);
  });
  await check('표적 자료 4질환 — 표적 8개 안에 그 질환의 도킹 표적 전부 · expressionScore', async () => {
    for (const d of board0.diseases) {
      if (data[d.diseaseId]) continue;
      const res = await a.call<DiseaseTargetsResponse>('GET', API.diseaseTargets(d.diseaseId));
      assert.equal(res.status, 200, JSON.stringify(res.body));
      data[d.diseaseId] = res.body;
      const list = targetShortlist(res.body.targets);
      assert.equal(list.length, 8);
      assert.ok(list.every((t) => typeof t.expressionScore === 'number'));
      // 그 질환에서 고를 수 있는 표적은 8줄 안에 모두 있어야 한다 — 빠지면 1.1 에서 보이지 않는다.
      for (const open of board0.diseases.filter((x) => x.diseaseId === d.diseaseId)) {
        assert.ok(list.some((t) => t.dockingTargetId === open.targetId), `${open.gene} 가 8개 안에 없음`);
      }
    }
    const ache = targetShortlist(data[alz.diseaseId]!.targets);
    assert.equal(ache.at(-1)!.symbol, 'ACHE', '알츠하이머는 ACHE 가 8위(시안과 같음)');
  });

  // ── 3. 올리기 규칙 ──
  const post = (s: Agent, body: TargetPickRequest) => s.call<Partial<ApiErrorBody>>('POST', API.picks, body);
  await check('다른 질환의 표적 · 검증 못 한 표적 → 400(열린 표적을 알려 준다)', async () => {
    const r = await post(a, { diseaseId: alz.diseaseId, targetId: 'egfr-1m17', reasons: ['drug'] });
    assert.equal(r.status, 400);
    assert.match(r.body.error?.message ?? '', /ACHE/);
    // draft(재도킹 검증 탈락) 표적은 질환이 맞아도 받지 않는다.
    const draft = await post(b, { diseaseId: nsclc.diseaseId, targetId: 'met-2wgj', reasons: ['drug'] });
    assert.equal(draft.status, 400, JSON.stringify(draft.body));
    assert.match(draft.body.error?.message ?? '', /EGFR · ALK · ERBB2/);
  });
  await check('모르는 근거 · 겹친 근거 → 400', async () => {
    assert.equal((await post(a, { diseaseId: alz.diseaseId, reasons: ['legacy'] })).status, 400);
    assert.equal((await post(a, { diseaseId: alz.diseaseId, reasons: ['drug', 'drug'] })).status, 400);
  });
  await check('막음 근거(ACHE 유전 0 · 발현 0) → 400 reason_blocked · 화면 코치와 같은 판정', async () => {
    const ache = targetShortlist(data[alz.diseaseId]!.targets).find((t) => t.symbol === 'ACHE')!;
    assert.equal(checkTargetPickReasons(['gen'], ache, { rank: 8 })[0]!.check?.status, 'block');
    const r = await post(a, { diseaseId: alz.diseaseId, reasons: ['ready', 'gen'] });
    assert.equal(r.status, 400, JSON.stringify(r.body));
    assert.equal(r.body.error?.code, 'reason_blocked');
    assert.equal((await post(a, { diseaseId: alz.diseaseId, reasons: ['expr'] })).body.error?.code, 'reason_blocked');
  });
  await check('가중치 틀림(3개 · 0.3 · 모두 0) → 400', async () => {
    for (const weights of [[1, 1, 1], [1, 1, 1, 0.3], [0, 0, 0, 0]]) assert.equal((await post(a, { diseaseId: alz.diseaseId, reasons: ['drug'], weights })).status, 400, String(weights));
  });
  await check('주의만 있는 근거(점수 8위 · 다른 모둠 모름) + 가중치 → 200, 다시 올리면 바뀜', async () => {
    const r1 = await post(a, { diseaseId: alz.diseaseId, targetId: alz.targetId, reasons: ['ready', 'score', 'free'], weights: [0, 3, 2, 0], note: '처음' });
    assert.equal(r1.status, 200, JSON.stringify(r1.body));
    const r2 = await post(a, { diseaseId: alz.diseaseId, targetId: alz.targetId, reasons: ['ready', 'drug'], weights: [0, 3, 2.5, 0], note: '도네페질이 있어 견줄 잣대가 확실해요' });
    assert.equal(r2.status, 200, JSON.stringify(r2.body));
    const r3 = await post(b, { diseaseId: nsclc.diseaseId, reasons: ['ready', 'score', 'gen', 'drug', 'expr'], weights: [2, 1, 1, 1], note: '점수 1위이면서 도킹 준비까지 된 유일한 표적' });
    assert.equal(r3.status, 200, JSON.stringify(r3.body));
  });
  await check('근거 없는 앞 판 요청 → 200(reasons = [] · weights = null)', async () => {
    assert.equal((await post(b, { diseaseId: alz.diseaseId, note: '앞 판 화면' })).status, 200);
  });

  // ── 4. 화면 한 장 · 확정 ──
  await check('board.picks — 근거 · 가중치 · 사람마다 카드', async () => {
    const picks = (await b.call<BoardResponse>('GET', API.board)).body.picks;
    assert.equal(picks.length, 3);
    const mine = picks.find((p) => p.byName === '하늘')!;
    assert.deepEqual(mine.reasons, ['ready', 'drug']);
    assert.deepEqual(mine.weights, [0, 3, 2.5, 0]);
    assert.equal(mine.note, '도네페질이 있어 견줄 잣대가 확실해요');
    const old = picks.find((p) => p.byName === '도윤' && p.diseaseId === alz.diseaseId)!;
    assert.deepEqual(old.reasons, []);
    assert.equal(old.weights, null);
  });
  await check('확정 → 1.1 완료 · 1.2 열림', async () => {
    assert.equal((await b.call('POST', API.target, { diseaseId: nsclc.diseaseId })).status, 200);
    const board = (await a.call<BoardResponse>('GET', API.board)).body;
    assert.equal(board.program.targetId, nsclc.targetId);
    assert.equal(board.steps.find((s) => s.id === '1.1')!.state, 'done');
    assert.notEqual(board.steps.find((s) => s.id === '1.2')!.state, 'locked');
  });

  // ── 5. 같은 질환의 다른 표적(ALK) — 올리고 확정하면 표적 버전이 새로 열린다 ──
  await check('기본이 아닌 표적(ALK)으로 올리기 → 200 · 카드에 그 표적이 남는다', async () => {
    const row = targetShortlist(data[nsclc.diseaseId]!.targets).find((t) => t.dockingTargetId === alk.targetId)!;
    assert.equal(row.symbol, 'ALK');
    const r = await post(a, { diseaseId: nsclc.diseaseId, targetId: alk.targetId, reasons: ['ready', 'drug'], weights: [1, 2, 1, 0], note: 'ALK 융합 환자군이 또렷해요' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const picks = (await a.call<BoardResponse>('GET', API.board)).body.picks;
    const mine = picks.find((x) => x.diseaseId === nsclc.diseaseId && x.byName === '하늘')!;
    assert.equal(mine.targetId, alk.targetId);
  });
  await check('ALK 로 확정 → program.targetId 가 바뀌고 표적 버전이 올라간다', async () => {
    const before = (await a.call<BoardResponse>('GET', API.board)).body.program;
    assert.equal((await a.call('POST', API.target, { diseaseId: nsclc.diseaseId, targetId: alk.targetId })).status, 200);
    const board = (await a.call<BoardResponse>('GET', API.board)).body;
    assert.equal(board.program.targetId, alk.targetId);
    assert.equal(board.program.diseaseId, nsclc.diseaseId);
    assert.equal(board.program.revisionNo, before.revisionNo + 1, '표적을 바꾸면 새 버전이 열린다');
    assert.equal(board.steps.find((s) => s.id === '1.1')!.state, 'done');
  });

  console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
