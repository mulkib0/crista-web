/**
 * F12 서버 — 라이브러리(사전 Vina 빼기 · 숨은 분자) · 실행 스냅숏 · 1.2 작업 화면에서 Vina 빼기(설계 §5.5.1 · §7.3 '1.2 실행 기록').
 * crista 워커 자료 파일이 옆 저장소에 있으면 실제 220종으로 미션 카드 · 조언값 결과도 확인한다(없으면 건너뜀).
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { adviceCriteria, SCREEN_AGENDAS, SCREEN_MISSIONS, screenFails, screenFunnel } from '@crista-web/web-contract';
import { buildSnapshot, clearScreenLibraryCache, screenLibrary, toScreenCompound, type RawCompound } from '../src/features/screen.ts';
import { jobView, type JobRow } from '../src/pipeline.ts';
import type { BioWorker, CompoundsResult } from '../src/worker.ts';

const raw = (id: string, o: Partial<RawCompound> = {}): RawCompound => ({
  chemblId: id,
  name: id,
  canonicalSmiles: 'CCO',
  library: 'ChEMBL 승인약',
  targetId: null,
  mw: 300,
  tpsa: 60,
  clogp: 2,
  hbd: 1,
  hba: 3,
  rotb: 2,
  qed: 0.7,
  ro5Violations: 0,
  alerts: [],
  screenScoreByTarget: { 'ache-4ey7': 0.5 },
  vinaKcalByTarget: { 'ache-4ey7': -9.9 },
  ...o,
});

function fakeWorker(rows: RawCompound[], total: number): { worker: BioWorker; calls: number[] } {
  const calls: number[] = [];
  const worker = {
    compounds: async (q: { limit: number }) => {
      calls.push(q.limit);
      return { stats: { total, funnel: { library: total, mwTpsa: 0, ro5: 0, alerts: 0, selected: rows.length } }, compounds: rows } as unknown as CompoundsResult;
    },
  } as unknown as BioWorker;
  return { worker, calls };
}

describe('F12 라이브러리', () => {
  test('사전 Vina 값을 화면용 줄에 옮기지 않는다 · 숨은 분자 수 · 캐시', async () => {
    clearScreenLibraryCache();
    const { worker, calls } = fakeWorker([raw('A', { targetId: 'ache-4ey7' }), raw('B')], 3);
    const lib = await screenLibrary({ worker }, 'ache-4ey7');
    assert.equal(lib.ds.total, 3);
    assert.equal(lib.ds.hidden, 1);
    assert.equal(lib.ds.compounds[0]!.known, true);
    assert.equal(JSON.stringify(lib.ds).includes('vina'), false);
    assert.equal(JSON.stringify(lib.ds).includes('-9.9'), false);
    assert.equal(lib.raw.get('A')?.vinaKcalByTarget?.['ache-4ey7'], -9.9); // 서버 전용 원자료에는 남는다(FSEL 찜 회고).
    await screenLibrary({ worker }, 'ache-4ey7');
    assert.deepEqual(calls, [500]);
    clearScreenLibraryCache();
  });

  test('실행 스냅숏 — 합의값 · round · 통과 id · 판정 · 놓친 분자', () => {
    const compounds = [raw('A', { screenScoreByTarget: { 'ache-4ey7': 0.9 } }), raw('B', { mw: 600, screenScoreByTarget: { 'ache-4ey7': 0.95 } }), raw('C', { alerts: ['nitro_aromatic'] })].map((c) => toScreenCompound(c, 'ache-4ey7'));
    const criteria = { mw: 500, tpsa: 140, ro5: 1, alert: 1, qed: 0, score: 0 };
    const rounds = { mw: 2, tpsa: 1, ro5: 1, alert: 1, qed: 1, score: 1 };
    const snap = buildSnapshot({ targetId: 'ache-4ey7', total: 4, hidden: 1, compounds }, criteria, rounds);
    assert.equal(snap.kind, 'screen');
    assert.deepEqual(snap.passIds, ['A']);
    assert.equal(snap.final, 1);
    assert.equal(snap.verdict, 'few');
    assert.deepEqual(snap.missed.map((m) => `${m.id}:${m.failedAt}`), ['B:mw', 'C:alert']);
    assert.deepEqual(snap.rounds, rounds);
    assert.deepEqual(snap.steps.map((s) => s.left), [3, 3, 2, 1, 1, 1]);
  });
});

describe('F12 1.2 작업 화면 — 사전 Vina 빼기(§5.5.1)', () => {
  test('1.2 결과의 표 · 주석 · 후보 vinaKcal 을 빼고, 2.1 결과는 그대로', () => {
    const base = {
      id: '00000000-0000-4000-8000-000000000001', team_id: 't', class_id: 'c', created_by: null, request_id: 'r', stage: 2, facility: 'htvs',
      params: {}, input_summary: '', target_id: 'ache-4ey7', program_revision_id: 'rev', smiles: null, label: null, parent_job_id: null,
      status: 'succeeded', progress: 1, phase: null, queue_position: null, source: 'dataset', test: false, cost_cents: '0', refunded_cents: '0',
      canonical_smiles: null, affinity_kcal: null, error: null, worker_known: true, submit_attempts: 1, timeout_at: null,
      created_at: new Date(), updated_at: new Date(), by_name: 'a', by_avatar: null,
    };
    const result = {
      title: 't', subtitle: 's', metrics: [], annotations: ['1위 — 사전 도킹 −11.84 kcal/mol'],
      table: { columns: ['사전 도킹 ΔG (Vina)'], rows: [['−11.84 kcal/mol']] },
      candidates: [{ compoundId: 'CHEMBL502', name: 'x', canonicalSmiles: 'C', targetId: 'ache-4ey7', screenScore: 0.9, vinaKcal: -11.84, mw: 300, qed: 0.7 }],
    };
    const v12 = jobView({ ...base, step: '1.2', result } as unknown as JobRow);
    assert.equal(JSON.stringify(v12).includes('11.84'), false);
    assert.equal(v12.result?.candidates?.[0]?.compoundId, 'CHEMBL502');
    const v21 = jobView({ ...base, step: '2.1', result } as unknown as JobRow);
    assert.equal(JSON.stringify(v21).includes('11.84'), true);
  });
});

const LIB = process.env.CRISTA_COMPOUND_LIBRARY ?? join(homedir(), 'Desktop/repo/crista/apps/bio-worker/data/datasets/compound_library.json');

describe('F12 실제 라이브러리(crista 워커 자료)', { skip: !existsSync(LIB) && 'crista 워커 자료 파일이 없어요' }, () => {
  const all = (JSON.parse(readFileSync(LIB, 'utf8')) as { compounds: RawCompound[] }).compounds;

  const T = true;
  const F = false;
  /** ACHE 는 설계 §5.5.1 의 8장 그대로, 나머지는 통과 2 · 잡은 위험 2 · 놓친 위험 1 · 경계 3. */
  const EXPECTED: Record<string, boolean[]> = {
    'ache-4ey7': [T, F, F, T, F, F, F, F],
    'egfr-1m17': [T, T, F, F, T, F, F, T],
    'dpp4-1x70': [T, T, F, F, T, F, F, F],
    'cox2-3ln1': [T, T, F, F, T, F, F, F],
  };

  test('미션 카드 8장 · 대조군이 라이브러리에 있고(워커가 보여 주는 분자) 틀(통과 · 걸림)이 맞다', () => {
    for (const m of Object.values(SCREEN_MISSIONS)) {
      const visible = all.filter((c) => c.ro5Violations <= 1).map((c) => toScreenCompound(c, m.targetId));
      const byId = new Map(visible.map((c) => [c.id, c]));
      assert.ok(byId.get(m.controlId)?.known, `${m.gene} 대조군 ${m.controlId}`);
      const adv = adviceCriteria(m);
      const verdicts = m.judgeCards.map((card) => {
        const c = byId.get(card.compoundId);
        assert.ok(c, `${m.gene} 카드 ${card.compoundId}`);
        return screenFails(c, adv).length === 0;
      });
      // 조언 기준 판정 — 카드 이야기(통과 · 규칙이 잡은 위험 · 규칙이 놓친 위험 · 경계)와 맞아야 한다.
      assert.deepEqual(verdicts, EXPECTED[m.targetId], `${m.gene} ${verdicts.join(',')}`);
    }
  });

  test('조언값으로 합의하면 ACHE 가 알맞은 구간(8~40)에 든다 · 220종 기준', () => {
    const m = SCREEN_MISSIONS['ache-4ey7']!;
    const visible = all.filter((c) => c.ro5Violations <= 1).map((c) => toScreenCompound(c, m.targetId));
    const f = screenFunnel({ total: all.length, hidden: all.length - visible.length, compounds: visible }, adviceCriteria(m));
    assert.equal(f.total, 220);
    assert.ok(f.final >= 8 && f.final <= 40, `ACHE 조언값 → ${f.final}`);
    assert.equal(f.steps.length, SCREEN_AGENDAS.length);
  });
});
