/**
 * F33 — 3.3 제형 · IND 서버 순수 계산: 9조합 E · S(game-rules 같은 함수) · 판정 재료 · 판정 · 수수료 · 'MRSD 이하면 S ≥ 35' 보증.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MoleculeProperties } from '@crista/shared-types';
import { PIPELINE_RULES, propertySignals, scoreCandidate } from '@crista/game-rules';
import {
  IND_DOSES,
  IND_FEE_CENTS,
  IND_FORMS,
  IND_PLEDGE_BODY,
  IND_REVIEW_GAME_DAYS,
  IND_SAFETY_MIN,
  indDoseBurden,
  indRuleFindings,
  indTrialOptions,
  type IndForm,
} from '@crista-web/web-contract';
import { IND_RULES_VIEW, judgeInd, sameRuleOutcome, scoreGrid, scoreInputOf, type CandidateFacts } from '../src/features/ind.ts';

/** 도네페질(워커 RDKit 값) — hERG 높음 · 간 낮음. */
const donepezil: MoleculeProperties = {
  canonicalSmiles: 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccccc3)CC1)C2',
  flatSmiles: 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccccc3)CC1)C2',
  mw: 379.5,
  clogp: 4.36,
  tpsa: 38.8,
  hbd: 0,
  hba: 4,
  rotb: 6,
  aromaticRings: 2,
  qed: 0.75,
  basicAmines: 1,
  alerts: [],
  engine: 'RDKit 2026.09.1',
};
const facts: CandidateFacts = { props: donepezil, affinityKcal: -11.6, referenceKcal: -11.84 };

describe('규칙 값 · 수수료(crista 와 같은 값)', () => {
  test('IND 수수료 500,000 크리스타 = PIPELINE_RULES.cost.stepCents.ind · 30게임 일 · S ≥ 35', () => {
    assert.equal(IND_FEE_CENTS, PIPELINE_RULES.cost.stepCents.ind);
    assert.equal(IND_REVIEW_GAME_DAYS, PIPELINE_RULES.durationDays.ind);
    assert.equal(IND_SAFETY_MIN, PIPELINE_RULES.thresholds.ind.safety);
    assert.equal(PIPELINE_RULES.noiseRange.ind, 0);
    assert.deepEqual(IND_RULES_VIEW.doseToxicity, PIPELINE_RULES.doseToxicity);
    assert.deepEqual(IND_RULES_VIEW.formulationPeak, PIPELINE_RULES.formulationPeak);
  });
});

describe('9조합 E · S — game-rules scoreCandidate 그대로', () => {
  test('CNS 표적(ACHE)은 9칸 한 벌 · 칸 값 = scoreCandidate', () => {
    const grid = scoreGrid(facts, true, indTrialOptions('ache-4ey7'));
    assert.equal(grid.length, 9);
    for (const c of grid) {
      const s = scoreCandidate({ affinityKcal: -11.6, props: donepezil, dose: c.dose, formulation: c.form, cns: true, referenceKcal: -11.84, cnsFromPopulation: false });
      assert.equal(c.efficacy, s.efficacy);
      assert.equal(c.safety, s.safety);
    }
    // 용량을 올리면 E 는 오르고 S 는 내려간다(시소).
    const oral = IND_DOSES.map((d) => grid.find((c) => c.form === 'oral' && c.dose === d)!);
    assert.ok(oral[0]!.efficacy < oral[1]!.efficacy && oral[1]!.efficacy < oral[2]!.efficacy);
    assert.ok(oral[0]!.safety > oral[1]!.safety && oral[1]!.safety > oral[2]!.safety);
  });
  test('비 CNS 표적 + 뇌 병변 환자군(EGFR)은 18칸 — 뇌전이 환자군이면 B 가 들어간다', () => {
    const trial = indTrialOptions('egfr-1m17')!;
    const grid = scoreGrid(facts, false, trial);
    assert.equal(grid.length, 18);
    const input = scoreInputOf(facts, { form: 'oral', dose: 50, cnsTarget: false, targetId: 'egfr-1m17', population: trial.brainPopulations[0]! });
    assert.equal(input.cns, true);
    assert.equal(input.cnsFromPopulation, true);
    const cell = grid.find((c) => c.form === 'oral' && c.dose === 50 && c.brainPop)!;
    assert.equal(scoreCandidate(input).efficacy, cell.efficacy);
    const plain = scoreInputOf(facts, { form: 'oral', dose: 50, cnsTarget: false, targetId: 'egfr-1m17', population: trial.populations[0]! });
    assert.equal(plain.cns, false);
  });
  test('새 표적(BRAF — web-contract 목록)의 뇌전이 환자군도 B 를 넣는다', () => {
    const trial = indTrialOptions('braf-3og7')!;
    const input = scoreInputOf(facts, { form: 'oral', dose: 10, cnsTarget: false, targetId: 'braf-3og7', population: trial.brainPopulations[0]! });
    assert.equal(input.cns, true);
  });
});

describe('판정 — judgeStep("ind"): S ≥ 35 · 흔들림 없음', () => {
  test('경구 10 mg 통과 · 같은 입력은 늘 같은 판정', () => {
    const input = scoreInputOf(facts, { form: 'oral', dose: 10, cnsTarget: true, targetId: 'ache-4ey7', population: null });
    const a = judgeInd(input);
    const b = judgeInd(JSON.parse(JSON.stringify(input)));
    assert.equal(a.passed, true);
    assert.deepEqual(a, b);
    assert.ok(a.reasons.some((r) => r.includes('안전 S')));
  });
  test('정맥 100 mg(hERG 높음)은 S < 35 → 보류', () => {
    const input = scoreInputOf(facts, { form: 'iv', dose: 100, cnsTarget: true, targetId: 'ache-4ey7', population: null });
    assert.equal(judgeInd(input).passed, false);
  });
});

/**
 * 설계 §5.9 ④: MRSD 를 판정 재료에서 거꾸로 정하면(T* = 65 ÷ (Rk × K) · MRSD = Dt⁻¹(T*)) 'MRSD 이하 용량이면 S ≥ 35' 가 성립한다.
 * F32 의 PRECLINICAL_RULES 와 따로, 3.3 규칙 검사 · 판정의 이음매를 여기서 지킨다 — 그리고 규칙 검사가 모두 ok 인 신청서는
 * 판정에서 떨어지지 않는다(예상 S ≥ 35 를 규칙이 함께 보므로 F32 의 반올림에도 기대지 않는다).
 */
describe('서류를 통과한 IND 는 규칙 판정에서 떨어지지 않는다', () => {
  const variants: MoleculeProperties[] = [];
  for (const clogp of [1.5, 2.8, 4.2]) for (const basicAmines of [0, 1]) for (const alerts of [[], ['nitro_aromatic']] as const) for (const tpsa of [40, 70, 100])
    variants.push({ ...donepezil, clogp, basicAmines, alerts: [...alerts], tpsa });
  const dtInverse = (t: number): number => {
    // 꺾은선 Dt(0)=0 · 10→10 · 50→30 · 100→55 의 역.
    const pts: Array<[number, number]> = [[0, 0], [10, 10], [50, 30], [100, 55]];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]!;
      const [x1, y1] = pts[i]!;
      if (t <= y1 || i === pts.length - 1) return x0 + ((t - y0) * (x1 - x0)) / (y1 - y0);
    }
    return 100;
  };

  test(`물성 ${variants.length}종 × 제형 3 × 용량 3 — MRSD 이하 ⇒ S ≥ 35 · 규칙 ok ⇒ 승인`, () => {
    let approved = 0;
    for (const props of variants) {
      const sig = propertySignals(props);
      const rk = 1 + PIPELINE_RULES.risk.herg[sig.herg] + PIPELINE_RULES.risk.hepatotoxicity[sig.hepatotoxicity];
      const mrsd = Object.fromEntries(IND_FORMS.map((f) => [f, dtInverse(65 / (rk * PIPELINE_RULES.formulationPeak[f]))])) as Record<IndForm, number>;
      for (const form of IND_FORMS) {
        for (const dose of IND_DOSES) {
          const f2 = { ...facts, props };
          const input = scoreInputOf(f2, { form, dose, cnsTarget: true, targetId: 'ache-4ey7', population: null });
          const s = scoreCandidate(input).safety;
          if (dose <= mrsd[form]) assert.ok(s >= IND_SAFETY_MIN - 1e-9, `${form} ${dose} mg ≤ MRSD ${mrsd[form].toFixed(1)} 인데 S ${s}`);
          assert.ok(indDoseBurden(mrsd[form], PIPELINE_RULES.doseToxicity) * PIPELINE_RULES.formulationPeak[form] * rk <= 65 + 1e-6);
          const findings = indRuleFindings({
            lead: { ok: true },
            form,
            dose,
            population: 'p',
            endpoint: 'e',
            sections: { title: 't', dev_plan: 'd', form_reason: 'f', nonclinical: 'n', calc_hed: '10', calc_mrsd: mrsd[form].toFixed(1), subject: 's', stop_rule: 'r', consent: 'c', risk_monitor: 'm', pledge_hold: IND_PLEDGE_BODY, pledge_report: IND_PLEDGE_BODY },
            // 일부러 MRSD 를 크게(F32 가 반올림을 위로 했다고 가정) — 그래도 예상 S 규칙이 막는다.
            animal: { mrsdMgByForm: { oral: mrsd.oral + 5, iv: mrsd.iv + 5, transdermal: mrsd.transdermal + 5 }, hedMgPerKg: 10, findings: [] },
            signals: { transdermal: sig.transdermal, herg: sig.herg, hepatotoxicity: sig.hepatotoxicity },
            expectedSafety: s,
          }).map((x) => ({ ...x, status: x.id === 'calc_match' ? 'ok' : x.status }));
          if (findings.every((x) => x.status === 'ok')) {
            assert.equal(judgeInd(input).passed, true, `${form} ${dose} 규칙 ok 인데 보류`);
            approved += 1;
          }
        }
      }
    }
    assert.ok(approved > 0);
  });
});

describe('검토 · 수리(F33 적대적 검토)', () => {
  test('도구가 그리는 효능 공식 계수 = game-rules(화면이 0.3 · 0.7 을 박지 않는다)', () => {
    assert.deepEqual(IND_RULES_VIEW.efficacy, { base: PIPELINE_RULES.efficacy.base, affinityWeight: PIPELINE_RULES.efficacy.affinityWeight });
  });
  test('규칙 결과 비교 — 같은 판 다시 심사 때 서버 사실이 바뀌었는지(id · ok/fail 만, 순서 · 글 무시)', () => {
    const a = [{ id: 'dose_le_mrsd', status: 'ok' as const, note: 'x' }, { id: 'pledges', status: 'ok' as const, note: 'y' }];
    assert.ok(sameRuleOutcome(a, [...a].reverse().map((f) => ({ ...f, note: '다른 글' }))));
    assert.ok(!sameRuleOutcome(a, [{ ...a[0]!, status: 'fail' }, a[1]!]));
    assert.ok(!sameRuleOutcome(a, a.slice(0, 1)));
  });
});
