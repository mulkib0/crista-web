// 4.1 임상 규격(F41) — 모집 규칙 · 검정력 · 군 구성 · 문구 자리표시자.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  PHASE_RULES,
  RECRUIT_TIERS,
  TRIAL_PHASES,
  armPlan,
  fillCopy,
  minNOf,
  recruitModel,
  recruitProjection,
  targetNOf,
  tierPerDay,
  trialPower,
  type RecruitInput,
} from '../src/index.ts';

const base: RecruitInput = { phase: 'phase2', efficacy: 55, safety: 60, herg: 'low', hepatotoxicity: 'low', form: 'oral', cns: false, targetId: 'dpp4-1x70' };

describe('군 구성', () => {
  test('상마다 배정 비율 합 1 · 대조군 유무', () => {
    for (const phase of TRIAL_PHASES) {
      for (const onc of [false, true]) {
        const arms = armPlan(phase, onc);
        assert.ok(Math.abs(arms.reduce((a, b) => a + b.share, 0) - 1) < 1e-9, `${phase} ${onc}`);
        assert.ok(arms.some((a) => a.id === 'high' && a.doseFraction === 1));
      }
    }
    assert.ok(!armPlan('phase1', true).some((a) => a.id === 'control'), '항암 1상은 대조군 없음');
    assert.equal(armPlan('phase3', false).length, 2);
  });
  test('최소 인원 = 목표 × 0.6 올림 · 항암 1상 30', () => {
    assert.equal(targetNOf('phase1', true), 30);
    assert.equal(minNOf('phase1', false), 24);
    assert.equal(minNOf('phase3', false), 360);
  });
});

describe('모집 규칙 — 앞 단계 계산값으로', () => {
  const per = (patch: Partial<RecruitInput>) => recruitModel({ ...base, ...patch }).basePerDay;
  test('안전할수록 빠르고, 주사는 느리고, 패치는 빠르다', () => {
    assert.ok(per({ safety: 80 }) > per({ safety: 60 }));
    assert.ok(per({ safety: 60 }) > per({ safety: 40 }));
    assert.ok(per({ form: 'iv' }) < per({ form: 'oral' }));
    assert.ok(per({ form: 'transdermal' }) > per({ form: 'oral' }));
  });
  test('희귀 · 중증 질환(항암 CML)은 흔한 질환(당뇨)보다 느리다 · CNS 환자군은 느리다', () => {
    assert.ok(per({ targetId: 'abl1-2hyy' }) < per({ targetId: 'dpp4-1x70' }));
    assert.ok(per({ cns: true }) < per({ cns: false }));
  });
  test('위험 신호가 높으면 선별 실패가 늘고 모집이 느리다', () => {
    const lo = recruitModel(base);
    const hi = recruitModel({ ...base, herg: 'high', hepatotoxicity: 'moderate' });
    assert.ok(hi.screenFailPct > lo.screenFailPct);
    assert.ok(hi.basePerDay < lo.basePerDay);
  });
  test('1상 건강한 지원자 — 질환 유병 · 효능은 보지 않는다', () => {
    const m = recruitModel({ ...base, phase: 'phase1' });
    assert.ok(!m.factors.some((f) => f.key === 'prevalence' || f.key === 'efficacy'));
    const onc = recruitModel({ ...base, phase: 'phase1', targetId: 'egfr-1m17' });
    assert.ok(onc.factors.some((f) => f.key === 'prevalence'), '항암 1상은 환자');
  });
  test('돈을 더 낼수록 빨라지고, 기본은 공짜지만 오래 걸린다', () => {
    const m = recruitModel(base);
    const days = (t: 'basic' | 'expanded' | 'focus') => recruitProjection(m, 'phase2', t, 0).daysLeft;
    assert.ok(days('basic') > days('expanded') && days('expanded') > days('focus'));
    assert.equal(recruitProjection(m, 'phase2', 'basic', 0).costLeftCrista, 0);
    assert.ok(recruitProjection(m, 'phase2', 'focus', 0).costLeftCrista > recruitProjection(m, 'phase2', 'expanded', 0).costLeftCrista);
    assert.equal(tierPerDay(m, 'focus'), Math.round(m.basePerDay * RECRUIT_TIERS.focus.speed * 100) / 100);
    // 모집 투자 총액은 상 비용보다 작다(집중으로 끝까지 가도).
    for (const phase of TRIAL_PHASES) {
      const mm = recruitModel({ ...base, phase });
      assert.ok(recruitProjection(mm, phase, 'focus', 0).costLeftCrista < PHASE_RULES[phase].costCrista, phase);
    }
  });
});

describe('검정력 게이지', () => {
  test('목표 인원에서 목표 검정력 · 적을수록 낮다', () => {
    assert.ok(Math.abs(trialPower('phase2', 180, false) - 0.8) < 0.01);
    assert.ok(Math.abs(trialPower('phase3', 600, false) - 0.9) < 0.01);
    assert.ok(trialPower('phase3', 360, false) < trialPower('phase3', 600, false));
    assert.equal(trialPower('phase2', 0, false), 0);
    const p1 = trialPower('phase1', 40, false);
    assert.ok(p1 > 0.7 && p1 < 0.9, `1상 감지력 ${p1}`);
  });
});

test('문구 자리표시자', () => {
  assert.equal(fillCopy('최소 {min}명 · 목표 {target}명 · {none}', { min: 24, target: 40 }), '최소 24명 · 목표 40명 · {none}');
});
