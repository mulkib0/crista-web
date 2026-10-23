/**
 * FMARKET 규격 — 열린 소식 종류 · 결정적 흔들림 · 과정 점수 · 결과 점수 · 연구 역량 · 표기.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  BOARD_EVENT_KINDS,
  MARKET_COPY,
  MARKET_API,
  MARKET_EXTRA_BANDS,
  PROGRESS_NOTICE_EVENTS,
  PROCESS_COMMON,
  PROCESS_RULES,
  STEP_IDS,
  antibodyBand,
  formatCapM,
  formatPrice,
  formatPct,
  isBoardEventKind,
  jitteredPct,
  processChangePct,
  processScoreOf,
  researchIndexOf,
  resultScoreOf,
  revisionValue,
} from '../src/index.ts';

describe('소식 종류 — 열린 규칙', () => {
  test('9단계 소식 + process · antibody_* 접두만', () => {
    for (const k of BOARD_EVENT_KINDS) assert.ok(isBoardEventKind(k), k);
    assert.ok(isBoardEventKind('antibody_mpnn_design'));
    assert.ok(isBoardEventKind('antibody_phase2_pass'));
    assert.equal(isBoardEventKind('antibody_'), false);
    assert.equal(isBoardEventKind('antibody_Bad'), false);
    assert.equal(isBoardEventKind('antibodyx'), false);
    assert.equal(isBoardEventKind('stock_split'), false);
    assert.equal(isBoardEventKind(`antibody_${'a'.repeat(41)}`), false);
  });
});

describe('결정적 흔들림', () => {
  const patent = { minPct: 0, maxPct: 5, defaultPct: 2 };
  test('u = 0 이면 기본값, 끝은 범위의 절반까지', () => {
    assert.equal(jitteredPct(patent, 0), 2);
    assert.equal(jitteredPct(patent, 1), 3.5);
    assert.equal(jitteredPct(patent, -1), 1);
  });
  test('늘 범위 안 · 0.1%p 단위 · 숫자가 아니면 기본값', () => {
    for (let u = -1; u <= 1; u += 0.07) {
      const v = jitteredPct({ minPct: -18, maxPct: -5, defaultPct: -12 }, u);
      assert.ok(v >= -18 && v <= -5, String(v));
      assert.equal(Math.round(v * 10), v * 10);
    }
    assert.equal(jitteredPct(patent, Number.NaN), 2);
    assert.equal(jitteredPct({ minPct: 0, maxPct: 0, defaultPct: 0 }, 0.9), 0);
  });
  test('추가 범위표 — 기본값이 범위 안', () => {
    for (const b of Object.values(MARKET_EXTRA_BANDS)) assert.ok(b.minPct <= b.defaultPct && b.defaultPct <= b.maxPct);
  });
});

describe('과정 점수', () => {
  test('가중 평균 × 100 · 0~1 로 자름 · 신호 없으면 null', () => {
    assert.equal(processScoreOf([]), null);
    assert.equal(processScoreOf([{ value: 1, weight: 2 }, { value: 0, weight: 2 }]), 50);
    assert.equal(processScoreOf([{ value: 2, weight: 1 }, { value: -1, weight: 1 }]), 50);
    assert.equal(processScoreOf([{ value: 0.5, weight: 0 }]), null);
  });
  test('변동률 — 30 미만 0(중립) · 100 = +3% · 감점 없음', () => {
    assert.equal(processChangePct(0), 0);
    assert.equal(processChangePct(29), 0);
    assert.equal(processChangePct(30), 0);
    assert.equal(processChangePct(65), 1.5);
    assert.equal(processChangePct(100), 3);
    for (let s = 0; s <= 100; s += 5) assert.ok(processChangePct(s) >= 0);
  });
  test('보완 횟수 → 0회 1 · 늘수록 낮음', () => {
    assert.equal(revisionValue(0), 1);
    assert.ok(revisionValue(1) < 1 && revisionValue(2) < revisionValue(1));
  });
  test('규칙표 — 9단계 모두 · 키는 문구(사실 · 이름)가 있음', () => {
    for (const id of STEP_IDS) assert.ok(PROCESS_RULES[id].length >= 1, id);
    const keys = new Set([...PROCESS_COMMON, ...STEP_IDS.flatMap((id) => PROCESS_RULES[id])].map((r) => r.key));
    for (const k of keys) {
      assert.ok(k in MARKET_COPY.process.facts, `fact ${k}`);
      assert.ok(MARKET_COPY.process.keyLabel[k], `label ${k}`);
    }
  });
  test('공개 신호는 참여 · 활동 사실만 — 보완 횟수 · 점수 · 농축도는 비공개', () => {
    const pub = STEP_IDS.flatMap((id) => PROCESS_RULES[id]).filter((r) => r.public).map((r) => r.key);
    for (const k of ['revisions', 'enrichment', 'novel', 'animal_level', 'no_reject', 'no_hold']) assert.equal(pub.includes(k), false, k);
  });
});

describe('결과 점수 · 연구 역량', () => {
  test('종류별 상한 · 100 상한', () => {
    assert.equal(resultScoreOf({}), 0);
    assert.equal(resultScoreOf({ patent: 5 }), 24);
    assert.equal(resultScoreOf({ patent: 3, preclinical: 1, ind_approved: 1, trial_phase1: 1, trial_phase2: 1, trial_phase3: 1, approval: 1, investment: 2, docking_record: 2 }), 100);
  });
  test('연구 역량 = 평균 × 커버율 × 0.8 + 다양성 × 20', () => {
    assert.equal(researchIndexOf({ avgLearnScore: null, coveredSteps: 0, diversity: 0 }), 0);
    assert.equal(researchIndexOf({ avgLearnScore: 100, coveredSteps: 9, diversity: 1 }), 100);
    assert.equal(researchIndexOf({ avgLearnScore: 80, coveredSteps: 9, diversity: 0.5 }), 74);
    assert.equal(researchIndexOf({ avgLearnScore: 200, coveredSteps: 20, diversity: 3 }), 100);
  });
});

describe('표기', () => {
  test('주가 · 시가총액 크리스타 · 변동 기호(색 외)', () => {
    assert.equal(formatCapM(10), '5,000만 크리스타');
    assert.equal(formatCapM(10.4249), '5,212만 크리스타');
    assert.equal(formatPrice(10), '50.00 크리스타');
    assert.equal(formatPrice(0.1), '0.50 크리스타');
    assert.equal(formatPct(2), '▲ 2.0%');
    assert.equal(formatPct(-12), '▼ 12.0%');
    assert.equal(formatPct(0), '― 0.0%');
    assert.equal(formatPct(null), '');
  });
  test('규칙 문구 — 등기 · 도킹 신기록 · 과정 평가 140자 안', () => {
    assert.equal(MARKET_COPY.listing('SEUM', '세움제약'), '◆ SEUM 「세움제약」 설립 등기 완료 — 상장가 50.00 크리스타');
    assert.equal(MARKET_COPY.docking('SEUM', 'ACHE', -12.44), '◆ SEUM ACHE 도킹 결합력 학급 신기록 — −12.4 kcal/mol');
    assert.equal(MARKET_COPY.rankLeader('SEUM'), '◆ SEUM 시가총액 1위 탈환');
    assert.equal(formatPrice(10, { unit: false }), '50.00');
    const line = MARKET_COPY.process.headline('SEUM', '1.2', '화합물 스크리닝', ['기준 투표 4/4명', '연구 노트 3/3칸']);
    assert.ok([...line].length <= 140);
    assert.ok(line.startsWith('◆ SEUM 1.2'));
  });
});

describe('경로 · 진행 소식 목록', () => {
  test('공개 서랍 — 교사는 classId 를 붙이고 학생은 비운다', () => {
    assert.equal(MARKET_API.drawer('t1'), '/api/market/teams/t1');
    assert.equal(MARKET_API.drawer('t1', 'c 1'), '/api/market/teams/t1?classId=c%201');
  });
  test('진행 소식은 4.1 이 내는 event 값과 같다', () => {
    assert.deepEqual([...PROGRESS_NOTICE_EVENTS].sort(), ['trial_recruited', 'trial_started']);
  });
});

describe('항체 소식 변동 범위 — changeHint 상한(항체 랩과의 계약 2026-10-24)', () => {
  test('antibody_record 만 0~10 밴드 · 상한 = min(changeHint, maxPct)', () => {
    assert.deepEqual(MARKET_EXTRA_BANDS.antibody_record, { minPct: 0, maxPct: 10, defaultPct: 4 });
    assert.deepEqual(antibodyBand('antibody_record', 'normal', 10), { minPct: 0, maxPct: 10, defaultPct: 4 });
    assert.deepEqual(antibodyBand('antibody_record', 'normal', 3), { minPct: 0, maxPct: 3, defaultPct: 3 });
    assert.deepEqual(antibodyBand('antibody_record', 'normal', 99), { minPct: 0, maxPct: 10, defaultPct: 4 }, '10 으로 자름');
    assert.deepEqual(antibodyBand('antibody_fold', 'normal', 8), { minPct: 0, maxPct: 5, defaultPct: 2 }, '나머지 antibody_* 는 0~5');
    assert.deepEqual(antibodyBand('antibody_fold', 'normal', 1), { minPct: 0, maxPct: 1, defaultPct: 1 });
    assert.deepEqual(antibodyBand('antibody_record_x', 'normal', 9).maxPct, 5, 'kind 가 정확히 antibody_record 일 때만');
  });
  test('tone bad 는 antibody_bad −5~0 — changeHint 는 폭(절댓값)의 상한', () => {
    assert.deepEqual(antibodyBand('antibody_expression_fail', 'bad', 9), { minPct: -5, maxPct: 0, defaultPct: -2 });
    assert.deepEqual(antibodyBand('antibody_expression_fail', 'bad', 1), { minPct: -1, maxPct: 0, defaultPct: -1 });
  });
  test('changeHint 가 없거나 0 · 숫자가 아니면 변동 0', () => {
    for (const h of [undefined, null, 0, -3, 'x', '', Number.NaN]) assert.deepEqual(antibodyBand('antibody_record', 'normal', h), { minPct: 0, maxPct: 0, defaultPct: 0 }, String(h));
    assert.equal(antibodyBand('antibody_record', 'normal', '6').maxPct, 6, '숫자 문자열은 받음');
    assert.equal(antibodyBand('antibody_record', 'normal', 2.4).maxPct, 2, '정수로 반올림');
  });
  test('범위 안 결정적 흔들림 — 늘 [min, 상한] 안', () => {
    for (let h = 1; h <= 10; h += 1) {
      const b = antibodyBand('antibody_record', 'normal', h);
      for (const u of [-1, -0.3, 0, 0.4, 1]) {
        const p = jitteredPct(b, u);
        assert.ok(p >= 0 && p <= Math.min(h, 10), `${h} ${u} ${p}`);
      }
    }
    assert.equal(jitteredPct(antibodyBand('antibody_record', 'normal', 0), 1), 0);
  });
});
