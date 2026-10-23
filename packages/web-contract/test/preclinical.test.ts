/**
 * 3.2 전임상 규칙(F32 · 설계 §5.9 ④ '숫자를 판정과 맞춘다') — 'MRSD 이하 용량이면 그 제형에서 S ≥ 35(IND 기준)' 를
 * 4 표적 × 후보(물성 무작위 + 신호 9조합) × 제형 3 × 용량 3 × 마릿수 수준 3 전 조합에서 game-rules 판정 그대로 확인한다.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DOCKING_TARGETS, type DoseMg, type Formulation, type MoleculeProperties } from '@crista/shared-types';
import { affinityStrength, judgeStep, PIPELINE_RULES, propertySignals, riskMultiplier, scoreCandidate } from '@crista/game-rules';
import {
  ANIMAL_COUNT_LEVELS,
  ANIMALS_PER_CANDIDATE,
  IND_FORMS,
  IND_SAFETY_MIN,
  PRECLINICAL_COPY,
  PRECLINICAL_GAME_RULES,
  PRECLINICAL_MODELS,
  PRECLINICAL_RULES,
  type AnimalCountLevel,
  type PreclinicalInput,
  type PreclinicalRisk,
} from '../src/index.ts';

const R = PRECLINICAL_RULES;
const RISKS: PreclinicalRisk[] = ['low', 'moderate', 'high'];
const DOSES: DoseMg[] = [10, 50, 100];

/** 결정적 의사 난수(mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomProps(r: () => number): MoleculeProperties {
  const alerts = r() < 0.15 ? (['aromatic_amine'] as MoleculeProperties['alerts']) : [];
  return {
    canonicalSmiles: 'C',
    flatSmiles: 'C',
    mw: 150 + r() * 450,
    clogp: -1 + r() * 7,
    tpsa: 20 + r() * 140,
    hbd: Math.floor(r() * 6),
    hba: Math.floor(r() * 11),
    rotb: Math.floor(r() * 13),
    aromaticRings: Math.floor(r() * 4),
    qed: r(),
    basicAmines: r() < 0.5 ? 0 : 1 + Math.floor(r() * 2),
    alerts,
    engine: 'test',
  };
}

const inputOf = (targetId: string, cns: boolean, p: number, s: ReturnType<typeof propertySignals>, seed: string): PreclinicalInput => ({
  targetId,
  cns,
  p,
  herg: s.herg,
  hepatotoxicity: s.hepatotoxicity,
  oralAbsorption: s.oralAbsorption,
  bbb: s.bbb,
  seed,
});

describe('판정 재료 — game-rules 와 같은 값', () => {
  test('Dt · R · K · S 기준 · 흡수 · 뇌 노출 · 효능 식', () => {
    assert.deepEqual({ ...PRECLINICAL_GAME_RULES.doseToxicity }, { ...PIPELINE_RULES.doseToxicity });
    assert.deepEqual({ ...PRECLINICAL_GAME_RULES.risk.herg }, { ...PIPELINE_RULES.risk.herg });
    assert.deepEqual({ ...PRECLINICAL_GAME_RULES.risk.hepatotoxicity }, { ...PIPELINE_RULES.risk.hepatotoxicity });
    assert.deepEqual({ ...PRECLINICAL_GAME_RULES.formulationPeak }, { ...PIPELINE_RULES.formulationPeak });
    assert.equal(PRECLINICAL_GAME_RULES.safetyMin, PIPELINE_RULES.thresholds.ind.safety);
    assert.equal(PRECLINICAL_GAME_RULES.safetyMin, IND_SAFETY_MIN);
    assert.deepEqual({ ...PRECLINICAL_GAME_RULES.absorptionOral }, { ...PIPELINE_RULES.absorption.oral });
    const { nonCns: _n, ...bbb } = PIPELINE_RULES.bbb;
    assert.deepEqual({ ...PRECLINICAL_GAME_RULES.bbb }, bbb);
    assert.equal(PRECLINICAL_GAME_RULES.efficacy.base, PIPELINE_RULES.efficacy.base);
    assert.equal(PRECLINICAL_GAME_RULES.efficacy.affinityWeight, PIPELINE_RULES.efficacy.affinityWeight);
    // 기준 리간드는 어느 표적이든 p = 0.9.
    for (const t of DOCKING_TARGETS) assert.ok(Math.abs(affinityStrength(t.referenceKcal, t.referenceKcal) - PRECLINICAL_GAME_RULES.referenceP) < 1e-9);
    for (const h of RISKS) for (const l of RISKS) {
      const s = { ro5Violations: 0, oralAbsorption: 'good', bbb: 'high', herg: h, hepatotoxicity: l, transdermal: 'suitable' } as const;
      assert.equal(R.riskMultiplier(s), riskMultiplier(s));
    }
  });
  test('Dt 직선 보간 — 표 점을 지나고 Dt⁻¹ 와 짝', () => {
    for (const d of DOSES) assert.equal(R.doseToxicityAt(d), PIPELINE_RULES.doseToxicity[d]);
    for (const t of [12, 23.6, 30, 35.1, 47, 55, 86.7]) assert.ok(Math.abs(R.doseToxicityAt(R.doseForToxicity(t)) - t) < 1e-9);
  });
  test('효력 모델 4 표적 — 설계 §5.9 표(고통등급 ACHE C · EGFR D · DPP4 C · PTGS2 D)', () => {
    assert.deepEqual(Object.keys(PRECLINICAL_MODELS).sort(), DOCKING_TARGETS.map((t) => t.id).sort());
    assert.deepEqual(Object.values(PRECLINICAL_MODELS).map((m) => `${m.gene}:${m.painGrade}`).sort(), ['ACHE:C', 'DPP4:C', 'EGFR:D', 'PTGS2:D']);
  });
});

describe('설계 예시 재현(§5.9 ④ — 시안 예시 리드 · 경구)', () => {
  // Rk 1.85 = hERG 높음(0.6) + 간 보통(0.25).
  const base: PreclinicalInput = { targetId: 'ache-4ey7', cns: true, p: 0.8, herg: 'high', hepatotoxicity: 'moderate', oralAbsorption: 'good', bbb: 'high', seed: 'example' };
  test('Rk 1.85 → T* 35.1 → 허용 최대 약 60 mg', () => {
    const rk = R.riskMultiplier(base);
    assert.equal(rk, 1.85);
    assert.equal(R.exposureLimit(rk, 'oral').toFixed(1), '35.1');
    assert.equal(Math.round(R.maxSafeDoseMg(base, 'oral')), 60);
  });
  test('알맞게 — 개 NOAEL 18 mg/kg/일 → HED 10 mg/kg → MRSD 60 mg(10 · 50 mg 가능) · 정맥은 약 46 mg(50 불가)', () => {
    const r = R.study(base, 'standard');
    assert.equal(r.sensitiveSpecies, 'dog');
    assert.equal(r.noaelMgPerKgDay.dog, 18);
    assert.equal(r.hedMgPerKg, 10);
    assert.equal(r.safetyFactor, 10);
    assert.equal(r.mrsdMgByForm.oral, 60);
    assert.ok(r.mrsdMgByForm.iv >= 45 && r.mrsdMgByForm.iv <= 46, String(r.mrsdMgByForm.iv));
    assert.ok(r.mrsdMgByForm.iv < 50);
    assert.equal(r.animalsUsed, 82);
    assert.ok(r.findings.includes('qt') && r.findings.includes('liver'));
  });
  test('적게 — 안전계수 20 → MRSD 30 mg(10 mg 만) · 46마리', () => {
    const r = R.study(base, 'low');
    assert.equal(r.safetyFactor, 20);
    assert.equal(r.mrsdMgByForm.oral, 30);
    assert.equal(r.animalsUsed, 46);
  });
  test('많이 — 얻는 것 없음(안전계수 10 · MRSD 같음) · 141마리', () => {
    const r = R.study(base, 'high');
    assert.equal(r.mrsdMgByForm.oral, R.study(base, 'standard').mrsdMgByForm.oral);
    assert.equal(r.animalsUsed, 141);
    assert.deepEqual(ANIMALS_PER_CANDIDATE, { low: 46, standard: 82, high: 141 });
  });
});

describe("보장 — 'MRSD 이하 용량이면 그 제형에서 S ≥ 35'(game-rules judgeStep('ind'))", () => {
  test('4 표적 × 후보 2,000(무작위 물성) × 제형 3 × 용량 3 × 수준 3', () => {
    const r = rng(20261024);
    let checked = 0;
    let allowed = 0;
    for (const target of DOCKING_TARGETS) {
      for (let i = 0; i < 500; i++) {
        const props = randomProps(r);
        const affinityKcal = target.referenceKcal + 4.5 - r() * 6;
        const s = propertySignals(props);
        const p = affinityStrength(affinityKcal, target.referenceKcal);
        const input = inputOf(target.id, target.cns, p, s, `${target.id}:${i}`);
        for (const level of ANIMAL_COUNT_LEVELS) {
          const study = R.study(input, level);
          for (const form of IND_FORMS) {
            for (const dose of DOSES) {
              checked++;
              if (dose > study.mrsdMgByForm[form]) continue;
              allowed++;
              const scores = scoreCandidate({ affinityKcal, props, dose, formulation: form as Formulation, cns: target.cns, referenceKcal: target.referenceKcal });
              const verdict = judgeStep('ind', scores, { efficacy: null, safety: null }, 0);
              assert.ok(verdict.passed && scores.safety >= 35, `${target.id} #${i} ${level} ${form} ${dose}mg ≤ MRSD ${study.mrsdMgByForm[form]} 인데 S ${scores.safety}`);
            }
          }
        }
      }
    }
    assert.equal(checked, 4 * 500 * 3 * 3 * 3);
    assert.ok(allowed > checked / 4, `허용 조합이 너무 적어요(${allowed}/${checked})`);
  });

  test('신호 9조합 × 표적 4 × 제형 3 × 용량 3 × 수준 3 — 규칙 식으로 직접(S = 100 − Dt × Rk × K)', () => {
    for (const target of Object.values(PRECLINICAL_MODELS)) {
      for (const herg of RISKS) for (const hepatotoxicity of RISKS) {
        const input: PreclinicalInput = { targetId: target.targetId, cns: target.targetId === 'ache-4ey7', p: 0.7, herg, hepatotoxicity, oralAbsorption: 'moderate', bbb: 'moderate', seed: `${herg}${hepatotoxicity}` };
        const rk = R.riskMultiplier(input);
        for (const level of ANIMAL_COUNT_LEVELS) {
          const study = R.study(input, level);
          for (const form of IND_FORMS) {
            // 너무 보수적이지 않게 — 안전계수를 되돌린 MRSD 가 허용 최대 용량의 85% 이상.
            const raw = R.maxSafeDoseMg(input, form);
            assert.ok(study.mrsdMgByForm[form] * (study.safetyFactor / 10) <= raw + 1e-9, `${herg}/${hepatotoxicity} ${form}`);
            assert.ok(study.mrsdMgByForm[form] * (study.safetyFactor / 10) >= raw * 0.85 - 1, `${herg}/${hepatotoxicity} ${form} 너무 낮음 ${study.mrsdMgByForm[form]} vs ${raw}`);
            for (const dose of DOSES) {
              if (dose > study.mrsdMgByForm[form]) continue;
              const S = 100 - PIPELINE_RULES.doseToxicity[dose] * rk * PIPELINE_RULES.formulationPeak[form];
              assert.ok(Math.round(S * 10) >= 350, `${target.targetId} ${herg}/${hepatotoxicity} ${level} ${form} ${dose} → S ${S}`);
            }
          }
        }
      }
    }
  });

  test('학생 계산 사슬(NOAEL → HED → MRSD)이 서버 값과 같다 — 경구', () => {
    const r = rng(7);
    for (let i = 0; i < 300; i++) {
      const s = propertySignals(randomProps(r));
      const study = R.study(inputOf('egfr-1m17', false, 0.6, s, `c${i}`), ANIMAL_COUNT_LEVELS[i % 3] as AnimalCountLevel);
      const hed = Math.min(study.noaelMgPerKgDay.rat / 6.2, study.noaelMgPerKgDay.dog / 1.8);
      assert.ok(hed >= study.hedMgPerKg && hed - study.hedMgPerKg < 0.01 + 1e-9);
      assert.equal(R.mrsdOf(study.hedMgPerKg, study.safetyFactor), study.mrsdMgByForm.oral);
      const check = R.checkCalc(study, { hedRat: study.noaelMgPerKgDay.rat / 6.2, hedDog: study.noaelMgPerKgDay.dog / 1.8, hed: study.hedMgPerKg, mrsd: study.mrsdMgByForm.oral });
      assert.ok(check.ok, JSON.stringify(check));
    }
  });
});

describe('결정성 · 종 · 소견', () => {
  const input: PreclinicalInput = { targetId: 'dpp4-1x70', cns: false, p: 0.5, herg: 'low', hepatotoxicity: 'high', oralAbsorption: 'moderate', bbb: 'high', seed: 'rev:mol:animal:standard' };
  test('같은 입력 → 같은 결과(다시 뽑기 없음)', () => {
    assert.deepEqual(R.study(input, 'standard'), R.study({ ...input }, 'standard'));
    assert.deepEqual(R.altAssay(input, 'liver'), R.altAssay({ ...input }, 'liver'));
  });
  test('간 위험이 크면 랫드가 더 민감 · hERG 위험이 크면 개', () => {
    const rat = R.study(input, 'standard');
    assert.equal(rat.sensitiveSpecies, 'rat');
    assert.ok(rat.noaelMgPerKgDay.rat / 6.2 < rat.noaelMgPerKgDay.dog / 1.8);
    const dog = R.study({ ...input, herg: 'high', hepatotoxicity: 'low' }, 'standard');
    assert.equal(dog.sensitiveSpecies, 'dog');
    assert.ok(dog.noaelMgPerKgDay.dog / 1.8 < dog.noaelMgPerKgDay.rat / 6.2);
  });
  test('소견 — 간 위험 → liver · 말초 표적인데 뇌 노출 높음 → cns · hERG 낮음 → QT 없음', () => {
    const r = R.study(input, 'standard');
    assert.deepEqual(r.findings.sort(), ['cns', 'liver']);
    assert.equal(r.pk.brainPlasmaRatio, null);
  });
  test('마릿수 내역 합 = 묶음 마릿수 · 고통등급 = 모델 표', () => {
    for (const level of ANIMAL_COUNT_LEVELS) {
      for (const t of Object.keys(PRECLINICAL_MODELS)) {
        const r = R.study({ ...input, targetId: t }, level);
        assert.equal(r.animalsBySpecies.rat + r.animalsBySpecies.dog + r.animalsBySpecies.mouse, ANIMALS_PER_CANDIDATE[level]);
        assert.equal(r.painGrade, PRECLINICAL_MODELS[t as keyof typeof PRECLINICAL_MODELS].painGrade);
      }
    }
  });
  test('인도적 종료 — D 모델 · 위험 큰 분자일수록 많다', () => {
    const c = R.study({ ...input, targetId: 'dpp4-1x70', herg: 'low', hepatotoxicity: 'low' }, 'standard').humaneEndpoints;
    const d = R.study({ ...input, targetId: 'egfr-1m17', herg: 'low', hepatotoxicity: 'low' }, 'standard').humaneEndpoints;
    const dRisky = R.study({ ...input, targetId: 'egfr-1m17', herg: 'high', hepatotoxicity: 'high' }, 'standard').humaneEndpoints;
    assert.ok(c < d && d < dRisky, `${c} ${d} ${dRisky}`);
  });
  test('대체 시험 — 2.2 신호와 같은 구간', () => {
    for (const herg of RISKS) {
      const a = R.altAssay({ ...input, herg }, 'herg');
      assert.equal(a.band, herg === 'moderate' ? 'medium' : herg);
      assert.equal(a.unit, 'µM');
    }
    assert.equal(R.altAssay(input, 'liver').band, 'high');
  });
});

describe('계산 칸 · 계획서 규칙 · 근거 칩', () => {
  const study = R.study({ targetId: 'ache-4ey7', cns: true, p: 0.8, herg: 'high', hepatotoxicity: 'moderate', oralAbsorption: 'good', bbb: 'high', seed: 'x' }, 'standard');
  test('계산 칸 — 틀린 칸만 짚는다(허용 오차 2%)', () => {
    const ok = R.checkCalc(study, { hedRat: study.noaelMgPerKgDay.rat / 6.2, hedDog: 10, hed: 10, mrsd: 60 });
    assert.equal(ok.ok, true);
    const bad = R.checkCalc(study, { hedRat: study.noaelMgPerKgDay.rat / 6.2, hedDog: 10, hed: 10, mrsd: 120 });
    assert.equal(bad.ok, false);
    assert.deepEqual(bad.fields, { hedRat: true, hedDog: true, hed: true, mrsd: false });
    assert.equal(R.checkCalc(study, { hedRat: null, hedDog: 10, hed: 10, mrsd: 60 }).fields.hedRat, false);
  });
  const sections = Object.fromEntries(PRECLINICAL_COPY.sections.map((s) => [s.key, '충분히 긴 칸 내용이에요 열 글자 넘게']));
  const good = { patentCount: 2, level: 'standard' as const, painGrade: 'C' as const, modelGrade: 'C' as const, endpointPct: 20, trainedPerformers: 1, sections };
  test('계획서 규칙 — 모두 맞으면 fail 없음', () => {
    assert.equal(R.iacucRules(good).filter((f) => f.status === 'fail').length, 0);
  });
  test("계획서 규칙 — '많이' · 고통등급 다름 · 종료시점 빈칸 · 수행자 없음 · 빈 칸은 보완", () => {
    const fails = (over: Partial<typeof good>) => R.iacucRules({ ...good, ...over }).filter((f) => f.status === 'fail').map((f) => f.id);
    assert.deepEqual(fails({ level: 'high' as never }), ['r_level']);
    assert.deepEqual(fails({ painGrade: 'D' as never }), ['r_pain']);
    assert.deepEqual(fails({ endpointPct: null as never }), ['r_endpoint']);
    assert.deepEqual(fails({ trainedPerformers: 0 }), ['r_performers']);
    assert.deepEqual(fails({ patentCount: 0 }), ['r_patents']);
    assert.deepEqual(fails({ sections: { ...sections, species: '짧음' } }), ['r_species']);
  });
  test('근거 칩 — 데이터와 대조(막음 · 주의 · 맞음)', () => {
    const weaker = { ...study, mrsdMgByForm: { ...study.mrsdMgByForm, oral: 10 } };
    assert.equal(R.leadReasonVerdict('start_dose_room', study, [study, weaker], true).status, 'ok');
    assert.equal(R.leadReasonVerdict('start_dose_room', weaker, [study, weaker], true).status, 'warn');
    assert.equal(R.leadReasonVerdict('no_heart', study, [study], true).status, 'block');
    assert.equal(R.leadReasonVerdict('no_liver', study, [study], true).status, 'block');
    assert.equal(R.leadReasonVerdict('brain_reach', study, [study], false).status, 'block');
    assert.equal(R.leadReasonVerdict('brain_reach', { ...study, pk: { ...study.pk, brainPlasmaRatio: 0.9 } }, [study], true).status, 'ok');
    assert.equal(R.leadReasonVerdict('efficacy_like_ref', { ...study, efficacyVsReferencePct: 79 }, [study], true).status, 'block');
    assert.equal(R.leadReasonVerdict('efficacy_like_ref', { ...study, efficacyVsReferencePct: 80 }, [study], true).status, 'ok');
    assert.equal(R.leadReasonVerdict('nope', study, [study], true).status, 'block');
  });
});
