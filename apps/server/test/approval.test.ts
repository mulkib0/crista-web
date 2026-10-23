/**
 * 4.2 최종 허가(F42) — 순수 규칙: 4.1 기록 읽기 · 규칙 검사 · 영수증 묶기 · 9단계 4.2 줄 · 수수료가 game-rules 와 같은지.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PIPELINE_RULES } from '@crista/game-rules';
import { APPROVAL_FEE_CENTS, APPROVAL_REVIEW_GAME_DAYS, centsToCrista } from '@crista-web/web-contract';
import { buildReceipt, lastPhase3Pass, ndaRuleFindings, trialFromRow, type TrialRecord } from '../src/features/approval.ts';
import { computeSteps, NO_STAGE_FACTS } from '../src/pipeline.ts';

describe('수수료 · 기간 = game-rules', () => {
  test('최종 허가 $0.100M · 60게임 일 · 판정 기준 없음', () => {
    assert.equal(APPROVAL_FEE_CENTS, PIPELINE_RULES.cost.stepCents.final);
    assert.equal(APPROVAL_REVIEW_GAME_DAYS, PIPELINE_RULES.durationDays.final);
    assert.deepEqual(PIPELINE_RULES.thresholds.final, { efficacy: null, safety: null });
    assert.equal(PIPELINE_RULES.noiseRange.final, 0);
  });
});

describe('4.1 기록 읽기(F41 접점)', () => {
  test('칸 이름이 조금 달라도 읽는다 — completed = 통과 · held = 보류', () => {
    const a = trialFromRow({ id: 't1', phase: 'phase3', status: 'completed', patent_id: 'p1', form: 'oral', dose_mg: 50, decided_game_day: 400, attempt: 1, result: { primary: { name: 'ADAS-Cog', comparison: { diff: -2.1, p: 0.01 } } } })!;
    assert.equal(a.phase, 3);
    assert.equal(a.verdict, 'pass');
    assert.deepEqual(a.primary, { name: 'ADAS-Cog', diff: -2.1, p: 0.01 });
    const b = trialFromRow({ id: 't2', phase: 2, verdict: 'held', patent_id: 'p1', form: 'oral', dose_mg: '100' })!;
    assert.equal(b.verdict, 'held');
    assert.equal(b.doseMg, 100);
    assert.equal(trialFromRow({ id: 't3', phase: 'phase1', status: 'recruiting' })!.verdict, null);
    assert.equal(trialFromRow({ phase: 'phase1' }), null);
    assert.equal(trialFromRow({ id: 'x', phase: 'phase9' }), null);
    assert.equal(trialFromRow({ id: 'x', phase: 'phase3', form: 'syrup' })!.form, null);
  });
  test('허가 표 CHECK 밖 용량(10 · 50 · 100 아님)은 프로토콜 없음으로 — 쓰기 경로가 CHECK 위반 500 이 되지 않게', () => {
    const odd = trialFromRow({ id: 'o', phase: 'phase3', status: 'completed', patent_id: 'p1', form: 'oral', dose_mg: 25, decided_game_day: 500 })!;
    assert.equal(odd.doseMg, null);
    assert.equal(lastPhase3Pass([odd]), null);
    assert.equal(trialFromRow({ id: 'r', phase: 'phase3', status: 'completed', patent_id: 'p1', form: 'oral', dose_mg: 50.0 })!.doseMg, 50);
  });
  test('마지막으로 통과한 3상 — 보류 · 진행 중 · 다른 상은 빼고, 늦게 통과한 것', () => {
    const t = (o: Partial<TrialRecord>): TrialRecord => ({ id: 'x', phase: 3, attempt: 1, verdict: 'pass', patentId: 'p', form: 'oral', doseMg: 50, decidedGameDay: 1, primary: null, ...o });
    assert.equal(lastPhase3Pass([]), null);
    assert.equal(lastPhase3Pass([t({ phase: 2 }), t({ verdict: 'held' }), t({ verdict: null })]), null);
    assert.equal(lastPhase3Pass([t({ id: 'a', decidedGameDay: 100 }), t({ id: 'b', decidedGameDay: 300, doseMg: 10 })])!.id, 'b');
    assert.equal(lastPhase3Pass([t({ id: 'a', form: null })]), null);
  });
});

describe('규칙 검사', () => {
  const p3 = { patentId: 'p1', form: 'oral' as const, doseMg: 50 as const };
  const full = { patent_id: 'p1', form: 'oral' as const, dose_mg: 50 as const, brand_name: '다온콕스', package_shape: 'tablet' as const, package_color: 'ivory' as const, package_layout: 'top' as const };
  const sections = { indication: '경도 알츠하이머의 인지 저하를 늦춰요', caution1: 'QT 연장이 있으면 의사와 상의해요', caution2: '정해진 양보다 많이 먹지 않아요' };
  const fails = (f: ReturnType<typeof ndaRuleFindings>) => f.filter((x) => x.status === 'fail').map((x) => x.id);
  test('다 채우면 fail 없음', () => {
    assert.deepEqual(fails(ndaRuleFindings({ p3, app: full, sections })), []);
  });
  test('3상 없음 · 다른 프로토콜 · 포장 제형 다름 · 브랜드 없음 · 짧은 칸', () => {
    assert.deepEqual(fails(ndaRuleFindings({ p3: null, app: full, sections })), ['phase3_passed', 'same_protocol']);
    assert.deepEqual(fails(ndaRuleFindings({ p3: { ...p3, doseMg: 100 }, app: full, sections })), ['same_protocol']);
    assert.deepEqual(fails(ndaRuleFindings({ p3, app: { ...full, package_shape: 'vial' }, sections })), ['package_fits']);
    assert.deepEqual(fails(ndaRuleFindings({ p3, app: { ...full, package_shape: null }, sections })), ['package_fits']);
    assert.deepEqual(fails(ndaRuleFindings({ p3, app: { ...full, brand_name: null }, sections })), ['brand_set']);
    assert.deepEqual(fails(ndaRuleFindings({ p3, app: full, sections: { ...sections, caution2: '짧아요' } })), ['section_caution2']);
    const f = ndaRuleFindings({ p3, app: { ...full, package_shape: 'patch' }, sections });
    assert.equal(f.find((x) => x.id === 'package_fits')!.section, 'package');
  });
});

describe('영수증(8.08)', () => {
  const row = (o: Partial<Parameters<typeof buildReceipt>[0][number]>) => ({
    id: String(Math.random()),
    amount_cents: '0',
    kind: 'paid_work',
    ref_type: null,
    ref_id: null,
    game_day: 0,
    created_at: new Date(),
    job_step: null,
    ind_held: false,
    ...o,
  });
  test('작업은 단계별로 묶고 · 수수료는 한 줄씩 · 실패는 빨강 · 입금은 따로 · 합계', () => {
    const rows = [
      row({ kind: 'initial', amount_cents: '200000000', game_day: 0 }),
      row({ kind: 'paid_work', amount_cents: '-5000000', job_step: '1.2', game_day: 1 }),
      row({ kind: 'paid_work', amount_cents: '-5000000', job_step: '2.1', game_day: 3 }),
      row({ kind: 'paid_work', amount_cents: '-5000000', job_step: '2.1', game_day: 5.7 }),
      row({ kind: 'paid_work_refund', amount_cents: '5000000', job_step: '2.1', game_day: 6 }),
      row({ kind: 'patent_fee', amount_cents: '-5000000', game_day: 10 }),
      row({ kind: 'ind_fee', amount_cents: '-10000000', ref_type: 'ind_application', ref_id: 'i1', ind_held: true, game_day: 40 }),
      row({ kind: 'ind_fee', amount_cents: '-10000000', ref_type: 'ind_application', ref_id: 'i2', game_day: 80 }),
      // F41 꼴 — 'paid_work' + ref_type clinical_*(ref_id = 시도 id). 모집 투자는 시도마다 한 줄로 묶인다.
      row({ kind: 'paid_work', amount_cents: '-30000000', ref_type: 'clinical_trial', ref_id: 'tA', game_day: 90 }),
      row({ kind: 'paid_work', amount_cents: '-100000', ref_type: 'clinical_recruit', ref_id: 'tA', game_day: 70 }),
      row({ kind: 'paid_work', amount_cents: '-100000', ref_type: 'clinical_recruit', ref_id: 'tA', game_day: 80 }),
      row({ kind: 'paid_work', amount_cents: '-29800000', ref_type: 'clinical_trial', ref_id: 'tB', game_day: 200 }),
      row({ kind: 'learn_stipend', amount_cents: '400000', game_day: 2 }),
      row({ kind: 'learn_stipend', amount_cents: '400000', game_day: 9 }),
      row({ kind: 'pitch_series_a', amount_cents: '60000000', game_day: 30 }),
      row({ kind: 'approval_fee', amount_cents: '-10000000', ref_type: 'approval_application', ref_id: 'a1', game_day: 400 }),
    ];
    const refLabels = new Map([['tA', '임상 1상 · 50 mg 보류'], ['tB', '임상 1상 · 2번째 · 10 mg']]);
    const r = buildReceipt(rows, new Set(['tA']), { lastGameDay: 460.4, moleculesStart: 220, approved: true, refLabels });
    const docking = r.spent.find((l) => l.stepId === '2.1')!;
    assert.equal(docking.count, 2);
    assert.equal(docking.crista, centsToCrista(10_000_000));
    assert.equal(docking.dayFrom, 3);
    assert.equal(docking.dayTo, 5);
    assert.deepEqual(r.spent.filter((l) => l.stepId === '3.3').map((l) => l.failed), [true, false]);
    const trial = r.spent.filter((l) => l.stepId === '4.1');
    assert.deepEqual(trial.map((l) => [l.failed, l.count]), [[true, 2], [true, 1], [false, 1]]);
    assert.match(trial[0]!.label, /4\.1 임상 1상 · 50 mg 보류 · 참여자 모집 투자/);
    assert.match(trial[2]!.label, /2번째/);
    assert.equal(r.spent.find((l) => l.stepId === '4.2')!.kind, 'approval_fee');
    assert.equal(r.income.find((l) => l.kind === 'learn_stipend')!.count, 2);
    assert.ok(r.income.find((l) => l.kind === 'pitch_series_a'));
    assert.ok(r.income.find((l) => l.kind === 'paid_work_refund'));
    assert.equal(r.totals.initialCrista, 10_000_000);
    const spentCents = 5e6 * 3 + 5e6 + 1e7 * 2 + 3e7 * 2 + 1e7;
    assert.equal(r.totals.spentCrista, centsToCrista(spentCents));
    assert.equal(r.totals.incomeCrista, centsToCrista(5e6 + 8e5 + 6e7));
    assert.equal(r.totals.balanceCrista, centsToCrista(2e8 - spentCents + 5e6 + 8e5 + 6e7));
    assert.equal(r.firstGameDay, 0);
    assert.equal(r.lastGameDay, 460);
    assert.equal(r.daysTaken, 460);
    assert.deepEqual(r.molecules, { start: 220, end: 1 });
    // 몫 띠: 발견 · 최적화(1.x 2.x) · 개발(3.x) · 임상 · 허가 — 합 = 단계가 있는 지출.
    const share = Object.fromEntries(r.shares.map((s) => [s.group, s.crista]));
    assert.equal(share.discover, centsToCrista(1.5e7));
    assert.equal(share.develop, centsToCrista(2.5e7));
    assert.equal(share.clinical, centsToCrista(6e7));
    assert.equal(share.approval, centsToCrista(1e7));
  });
  test('허가 전 — 분자 끝은 비움', () => {
    const r = buildReceipt([], new Set(), { lastGameDay: null, moleculesStart: null, approved: false });
    assert.deepEqual(r.molecules, { start: null, end: null });
    assert.equal(r.daysTaken, null);
    assert.equal(r.totals.spentCrista, 0);
  });
});

describe('9단계 — 4.2 줄', () => {
  const facts = new Map();
  test('4.1 끝나기 전엔 잠김 · 접수하면 진행(진행률) · 허가면 완료 · 비용 칩 500,000 크리스타 · 60게임 일', () => {
    const base = computeSteps({ targetId: 'ache-4ey7', facts, balanceCents: 1e9, stage: { ...NO_STAGE_FACTS } });
    const s42 = base.find((s) => s.id === '4.2')!;
    assert.equal(s42.state, 'locked');
    assert.equal(s42.unlockBy, '4.1');
    assert.equal(s42.costCents, APPROVAL_FEE_CENTS);
    assert.equal(s42.durationGameDays, 60);
    const approved = computeSteps({ targetId: 'ache-4ey7', facts, balanceCents: 1e9, stage: { ...NO_STAGE_FACTS, approval: { status: 'approved' } } });
    assert.equal(approved.find((s) => s.id === '4.2')!.state, 'done');
  });
});
