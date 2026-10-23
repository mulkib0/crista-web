/**
 * FMARKET 서버 순수 함수 — 소식 → 변동률(crista PIPELINE_ANALYST_BANDS · ANALYST_BANDS 그대로) · 결정적 흔들림 · 주가 하한 ·
 * 시가총액 순위 · 헤드라인 검사(지어낸 숫자 · SMILES 거절) · 교사 명령 검사 · 결과 점수 칸.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ANALYST_BANDS, PIPELINE_ANALYST_BANDS, approvalDefaultChangePct } from '@crista/game-rules';
import { MARKET_EXTRA_BANDS } from '@crista-web/web-contract';
import { acceptHeadline, bandFor, checkFinalAction, checkNotice, hashUnit, moveFor, nextPrice, rankRows, resultKeyOf } from '../src/features/market.ts';

const ev = (kind: string, pub: Record<string, unknown> = {}, extra: Partial<{ tone: 'normal' | 'bad' | 'rank'; idemKey: string | null; id: number }> = {}) => ({
  id: extra.id ?? 1,
  classId: '00000000-0000-4000-8000-000000000001',
  kind: kind as never,
  tone: extra.tone ?? 'normal',
  idemKey: extra.idemKey ?? `${kind}:x`,
  public: pub,
});

describe('소식 → 범위(crista 표 그대로)', () => {
  test('특허 · IND 승인/보류 · 임상 1~3상 통과/보류', () => {
    assert.deepEqual(bandFor(ev('patent'))!.band, PIPELINE_ANALYST_BANDS.patent.pass);
    assert.deepEqual(bandFor(ev('ind_approved'))!.band, PIPELINE_ANALYST_BANDS.ind.pass);
    assert.deepEqual(bandFor(ev('ind_held'))!.band, PIPELINE_ANALYST_BANDS.ind.fail);
    for (const phase of ['phase1', 'phase2', 'phase3'] as const) {
      assert.deepEqual(bandFor(ev('trial_pass', { phase }))!.band, PIPELINE_ANALYST_BANDS[phase].pass);
      assert.deepEqual(bandFor(ev('trial_held', { phase }))!.band, PIPELINE_ANALYST_BANDS[phase].fail);
    }
    assert.equal(bandFor(ev('trial_pass', {})), null, '몇 상인지 모르면 움직이지 않음');
  });
  test('허가 — 기본값 = min(20, 12 × 제형 배율)', () => {
    for (const form of ['oral', 'iv', 'transdermal'] as const) {
      const b = bandFor(ev('approval', { form }))!.band;
      assert.equal(b.defaultPct, approvalDefaultChangePct(form));
      assert.equal(b.minPct, PIPELINE_ANALYST_BANDS.final.pass.minPct);
      assert.equal(b.maxPct, PIPELINE_ANALYST_BANDS.final.pass.maxPct);
    }
  });
  test('도킹 신기록 · 투자(A 8 · B 12) · 등기 0 · 전임상 · 학습 · 항체', () => {
    const d = bandFor(ev('docking_record', { affinityKcal: -12 }))!.band;
    assert.equal(d.minPct, ANALYST_BANDS.docking.minPct);
    assert.equal(d.maxPct, ANALYST_BANDS.docking.maxPct);
    assert.equal(d.defaultPct, 10);
    assert.equal(bandFor(ev('investment', { round: 'Series A' }))!.band.defaultPct, 8);
    assert.equal(bandFor(ev('investment', { round: 'Series B' }))!.band.defaultPct, 12);
    assert.deepEqual(bandFor(ev('investment', { round: 'Series B' }))!.band.minPct, ANALYST_BANDS.investment.minPct);
    assert.equal(moveFor(ev('listing'))!.pct, 0);
    assert.deepEqual(bandFor(ev('preclinical'))!.band, MARKET_EXTRA_BANDS.preclinical);
    assert.deepEqual(bandFor(ev('learn'))!.band, MARKET_EXTRA_BANDS.learn);
    assert.deepEqual(bandFor(ev('antibody_binding_record', { changeHint: 5 }))!.band, MARKET_EXTRA_BANDS.antibody);
    assert.deepEqual(bandFor(ev('antibody_expression_fail', { changeHint: 5 }, { tone: 'bad' }))!.band, MARKET_EXTRA_BANDS.antibody_bad);
    assert.deepEqual(bandFor(ev('antibody_record', { changeHint: 10 }))!.band, MARKET_EXTRA_BANDS.antibody_record);
    assert.deepEqual(bandFor(ev('antibody_phase2', { stage: 'phase2', passed: false }))!.band, PIPELINE_ANALYST_BANDS.phase2.fail);
  });
  test('항체 소식 — changeHint 가 상한 · 없거나 0 이면 0 · antibody_record 만 0~10', () => {
    assert.equal(moveFor(ev('antibody_record'))!.pct, 0, 'changeHint 없음');
    assert.equal(moveFor(ev('antibody_program', { changeHint: 0 }))!.pct, 0);
    for (let i = 0; i < 40; i += 1) {
      const hint = (i % 10) + 1;
      const rec = moveFor(ev('antibody_record', { changeHint: hint }, { idemKey: `antibody_record:r:${i}` }))!.pct;
      assert.ok(rec >= 0 && rec <= hint, `record ${hint} → ${rec}`);
      const fold = moveFor(ev('antibody_fold', { changeHint: hint }, { idemKey: `antibody_fold:r:${i}` }))!.pct;
      assert.ok(fold >= 0 && fold <= Math.min(hint, 5), `fold ${hint} → ${fold}`);
      const bad = moveFor(ev('antibody_fail', { changeHint: hint }, { tone: 'bad', idemKey: `antibody_fail:r:${i}` }))!.pct;
      assert.ok(bad <= 0 && bad >= -Math.min(hint, 5), `bad ${hint} → ${bad}`);
    }
    const a = moveFor(ev('antibody_record', { changeHint: 9 }, { idemKey: 'antibody_record:same' }))!.pct;
    assert.equal(moveFor(ev('antibody_record', { changeHint: 9 }, { idemKey: 'antibody_record:same' }))!.pct, a, '같은 소식 키 → 같은 값');
    assert.ok(moveFor(ev('antibody_record', { changeHint: 10 }, { idemKey: 'antibody_record:hi' }))!.pct >= 2, '0~10 밴드는 기본 4 근처(2~7)');
    assert.deepEqual(bandFor(ev('antibody_phase2', { stage: 'phase2', passed: true }))!.band, PIPELINE_ANALYST_BANDS.phase2.pass, 'crista stage 를 실으면 그 범위(changeHint 와 무관)');
  });
  test('움직이지 않는 소식 — 순위 · 공지 · 과정(과정은 postProcessScore 가 직접) · 모르는 종류', () => {
    for (const k of ['rank', 'notice', 'process', 'mystery']) assert.equal(moveFor(ev(k)), null, k);
  });
  test('교사 정정 — 준 값 그대로 · ±20 으로 자름', () => {
    assert.equal(moveFor(ev('correction', { changePct: -3.5 }))!.pct, -3.5);
    assert.equal(moveFor(ev('correction', { changePct: 50 }))!.pct, 20);
    assert.equal(moveFor(ev('correction', {})), null);
  });
});

describe('결정적 흔들림', () => {
  test('같은 학급 · 같은 소식 키 → 같은 값, 다른 키 → (대개) 다른 값 · 늘 범위 안', () => {
    const a = moveFor(ev('patent', {}, { idemKey: 'patent:1' }))!.pct;
    assert.equal(moveFor(ev('patent', {}, { idemKey: 'patent:1' }))!.pct, a);
    const seen = new Set<number>();
    for (let i = 0; i < 40; i += 1) {
      const m = moveFor(ev('trial_held', { phase: 'phase2' }, { idemKey: `trial:${i}:verdict` }))!;
      assert.ok(m.pct >= -18 && m.pct <= -5, String(m.pct));
      seen.add(m.pct);
    }
    assert.ok(seen.size > 5, '흔들림이 있어야 함');
    const u = hashUnit('x');
    assert.ok(u >= -1 && u <= 1);
  });
});

describe('주가 · 순위', () => {
  test('곱으로 쌓이고 하한 $0.10', () => {
    assert.equal(nextPrice(10, 2), 10.2);
    assert.equal(nextPrice(10.2, -50), 5.1);
    assert.equal(nextPrice(0.11, -90), 0.1);
  });
  test('rankMarketCap — 큰 것이 앞 · 같으면 티커 순', () => {
    const r = rankRows([
      { team_id: 'a', ticker: 'MIRP', startup_name: '미르', ink: 1, price: 10 },
      { team_id: 'b', ticker: 'DAON', startup_name: '다온', ink: 2, price: 10 },
      { team_id: 'c', ticker: 'SEUM', startup_name: '세움', ink: 3, price: 12.5 },
    ]);
    assert.deepEqual([r.get('c'), r.get('b'), r.get('a')], [1, 2, 3]);
  });
});

describe('헤드라인 검사', () => {
  const rule = '◆ SEUM 물질특허 등록 — SEUM-102 · 알츠하이머병 후보';
  test('받음 — 같은 사실 · 규칙 문구의 숫자 · 변동률 숫자', () => {
    assert.equal(acceptHeadline('◆ SEUM, 알츠하이머 후보 SEUM-102 물질특허 확보', { rule, ticker: 'SEUM', changePct: 2.3 }), '◆ SEUM, 알츠하이머 후보 SEUM-102 물질특허 확보');
    assert.equal(acceptHeadline('SEUM 특허 SEUM-102 등록, 기업가치 2.3% 올라', { rule, ticker: 'SEUM', changePct: 2.3 }), '◆ SEUM 특허 SEUM-102 등록, 기업가치 2.3% 올라');
  });
  test('거절 — 지어낸 숫자 · 티커 없음 · SMILES 꼴 · 너무 김', () => {
    assert.equal(acceptHeadline('◆ SEUM 특허 등록, 주가 15% 폭등', { rule, ticker: 'SEUM', changePct: 2.3 }), null);
    assert.equal(acceptHeadline('◆ 한 스타트업 특허 등록', { rule, ticker: 'SEUM', changePct: 2.3 }), null);
    assert.equal(acceptHeadline('◆ SEUM COc1cc2c(cc1OC)C(=O)CC2 특허', { rule, ticker: 'SEUM', changePct: 2.3 }), null);
    assert.equal(acceptHeadline(`◆ SEUM ${'가'.repeat(90)}`, { rule, ticker: 'SEUM', changePct: 2.3 }), null);
    assert.equal(acceptHeadline('   ', { rule, ticker: 'SEUM', changePct: null }), null);
    for (const money of ['◆ SEUM 특허 SEUM-102 등록, $ 가치 상승', '◆ SEUM 특허 SEUM-102 등록, 달러 가치 상승', '◆ SEUM 특허 SEUM-102 등록 CRISTA 상승'])
      assert.equal(acceptHeadline(money, { rule, ticker: 'SEUM', changePct: 2.3 }), null, `화폐 '크리스타' 하나: ${money}`);
  });
});

describe('교사 명령 · 결과 칸', () => {
  test('마감 명령', () => {
    assert.deepEqual(checkFinalAction({ action: 'close' }), { action: 'close' });
    assert.deepEqual(checkFinalAction({ action: 'reopen' }), { action: 'reopen' });
    assert.deepEqual(checkFinalAction({ action: 'schedule', endsAt: null }), { action: 'schedule', endsAt: null });
    const now = Date.parse('2026-10-24T03:00:00Z');
    const ok = checkFinalAction({ action: 'schedule', endsAt: '2026-10-24T04:00:00Z' }, now);
    assert.equal(ok.action === 'schedule' && ok.endsAt?.toISOString(), '2026-10-24T04:00:00.000Z');
    assert.throws(() => checkFinalAction({ action: 'schedule', endsAt: '2026-10-24T02:00:00Z' }, now));
    assert.throws(() => checkFinalAction({ action: 'schedule', endsAt: 'nope' }, now));
    assert.throws(() => checkFinalAction({ action: 'drop' }));
  });
  test('공지 · 정정', () => {
    assert.deepEqual(checkNotice({ headline: '  ◆ 정정:  MIRP 2상 판정 재계산 ' }), { headline: '◆ 정정: MIRP 2상 판정 재계산', teamId: null, changePct: null });
    assert.equal(checkNotice({ headline: '정정', teamId: '00000000-0000-4000-8000-000000000001', changePct: '-3.26' }).changePct, -3.3);
    assert.throws(() => checkNotice({ headline: '정정', teamId: '------------------------------------', changePct: 2 }), /모둠을 찾을 수 없어요/, '꼴이 틀린 id 는 DB 전에 404');
    assert.throws(() => checkNotice({ headline: '' }));
    assert.throws(() => checkNotice({ headline: '정정', changePct: 30 }));
  });
  test('결과 점수 칸 — 임상은 상마다 · 보류 · 실패는 세지 않음 · 항체 통과만', () => {
    assert.equal(resultKeyOf('trial_pass', { phase: 'phase2' }, 'normal'), 'trial_phase2');
    assert.equal(resultKeyOf('trial_held', { phase: 'phase2' }, 'bad'), null);
    assert.equal(resultKeyOf('ind_held', {}, 'bad'), null);
    assert.equal(resultKeyOf('patent', {}, 'normal'), 'patent');
    assert.equal(resultKeyOf('process', {}, 'normal'), null);
    assert.equal(resultKeyOf('antibody_binding', {}, 'normal'), 'antibody');
    assert.equal(resultKeyOf('antibody_binding', { passed: false }, 'normal'), null);
  });
});

describe('헤드라인 검사 — 공개 칸의 숫자', () => {
  test('공개 칸(코드명 · 상)에 있는 숫자는 받음', () => {
    const rule = '◆ MIRB 임상 2상 통과 — 3상 진입';
    assert.equal(acceptHeadline('◆ MIRB, MIRB-201 임상 2상 통과', { rule, ticker: 'MIRB', changePct: null }), null);
    assert.equal(acceptHeadline('◆ MIRB, MIRB-201 임상 2상 통과', { rule, ticker: 'MIRB', changePct: null, facts: { codeName: 'MIRB-201', phase: 'phase2' } }), '◆ MIRB, MIRB-201 임상 2상 통과');
  });
});

describe('진행 소식(설계 §5.16 — 모집 완료 · 임상 시작)', () => {
  test("모둠 'notice' + public.event 가 진행 목록이면 crista upgrade 범위(0~3 · 기본 1), 아니면 움직이지 않음", () => {
    for (const event of ['trial_recruited', 'trial_started']) {
      const b = bandFor(ev('notice', { event, phase: 'phase1' }))!;
      assert.equal(b.basis, 'result');
      assert.equal(b.band.minPct, ANALYST_BANDS.upgrade.minPct);
      assert.equal(b.band.maxPct, ANALYST_BANDS.upgrade.maxPct);
      assert.equal(b.band.defaultPct, 1);
      const m = moveFor(ev('notice', { event }, { idemKey: `trial:${event}:x` }))!;
      assert.ok(m.pct >= 0 && m.pct <= 3, String(m.pct));
    }
    assert.equal(bandFor(ev('notice', { by: 'teacher' })), null, '교사 공지');
    assert.equal(bandFor(ev('notice', { event: 'trial_started', by: 'teacher' })), null, '교사가 같은 칸을 넣어도');
    assert.equal(bandFor(ev('notice', { event: 'mystery' })), null);
    assert.equal(resultKeyOf('notice', { event: 'trial_started' }, 'normal'), null, '결과 점수에는 세지 않음');
  });
});
