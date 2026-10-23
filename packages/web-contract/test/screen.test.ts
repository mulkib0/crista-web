/**
 * F12 규격 — 1.2 깔때기 엔진 · 코치 · 찜 근거 재판정 · 미션 자료(설계 §5.5 · §5.5.1 · §7.4 ⑧).
 * 브라우저 미리보기와 서버 실행 스냅숏이 같은 함수를 쓰므로, 여기서 고정한 값이 곧 두 곳의 값이다.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  adviceCriteria,
  agendaCoach,
  CLAIM_REASONS,
  claimCoach,
  SCREEN_AGENDA_REASONS,
  SCREEN_AGENDAS,
  SCREEN_COPY,
  SCREEN_MISSIONS,
  screenAgendaHints,
  screenAgendaValueOk,
  screenFails,
  screenFill,
  screenFirstFail,
  screenFunnel,
  screenMissed,
  screenQuorum,
  screenRuleText,
  screenSnap,
  screenValueAllowed,
  screenVerdict,
  type ScreenCompound,
  type ScreenDatasetResponse,
} from '../src/screen.ts';

const mk = (id: string, o: Partial<ScreenCompound> = {}): ScreenCompound => ({
  id,
  name: `${id} 이름`,
  smiles: 'C',
  library: 'ChEMBL 승인약',
  mw: 300,
  tpsa: 60,
  clogp: 2,
  hbd: 1,
  hba: 3,
  rotb: 3,
  qed: 0.7,
  ro5: 0,
  alerts: [],
  score: 0.5,
  known: false,
  mechanism: null,
  ...o,
});

// 10종 + 숨은 2종(Ro5 위반 2개 이상 — 워커가 돌려주지 않음).
const ds: ScreenDatasetResponse = {
  targetId: 'ache-4ey7',
  total: 12,
  hidden: 2,
  compounds: [
    mk('CHEMBL502', { known: true, score: 0.9, mw: 380, tpsa: 39 }), // 실제 약(대조군)
    mk('K2', { known: true, score: 0.8, mw: 420, tpsa: 95 }),
    mk('A', { score: 0.85, mw: 600 }),
    mk('B', { score: 0.7, alerts: ['aromatic_amine'] }),
    mk('C', { score: 0.6, ro5: 1 }),
    mk('D', { score: 0.55, qed: 0.3, library: 'ZINC 소형' }),
    mk('E', { score: 0.3 }),
    mk('F', { score: 0.2, tpsa: 150 }),
    mk('G', { score: 0.65, library: '사내 합성 후보' }),
    mk('H', { score: 0.65 }),
  ],
};

describe('F12 깔때기 엔진', () => {
  test('미정 안건은 거르지 않고, 숨은 분자는 Ro5 관문에서 빠진다', () => {
    const f = screenFunnel(ds, {});
    assert.equal(f.total, 12);
    assert.equal(f.final, 10);
    assert.deepEqual(f.steps.map((s) => s.left), [12, 12, 10, 10, 10, 10]);
    assert.equal(f.steps[2]!.removed, 2);
    assert.equal(f.knownTotal, 2);
    assert.equal(f.knownLeft, 2);
  });

  test('안건 순서대로 거르고 통과 id 는 점수 높은 순(같으면 id 순)', () => {
    const f = screenFunnel(ds, { mw: 500, tpsa: 90, ro5: 0, alert: 1, qed: 0.5, score: 0.5 });
    assert.deepEqual(f.steps.map((s) => s.removed), [1 /* A */, 2 /* K2 · F */, 3 /* 숨은 2 + C */, 1 /* B */, 1 /* D */, 1 /* E */]);
    assert.deepEqual(f.passIds, ['CHEMBL502', 'G', 'H']);
    assert.equal(f.final, 3);
    // 아는 약 계열 2개 중 1개 남음 → 농축도 (1/3) ÷ (2/12) = 2.0
    assert.equal(f.knownLeft, 1);
    assert.equal(Math.round(f.enrichment * 100) / 100, 2);
    assert.deepEqual(f.steps[1]!.knownRemovedIds, ['K2']);
    assert.equal(f.topKnown, 1);
  });

  test('처음 걸리는 안건 · 걸리는 모든 안건 · 놓친 분자 3개', () => {
    const crit = { mw: 500, tpsa: 90, alert: 1 };
    assert.equal(screenFirstFail(ds.compounds[2]!, crit), 'mw');
    assert.deepEqual(screenFails(mk('X', { mw: 600, tpsa: 120, alerts: ['nitro_aromatic'] }), crit), ['mw', 'tpsa', 'alert']);
    const f = screenFunnel(ds, crit);
    assert.deepEqual(screenMissed(ds, crit, f.passIds), [
      { id: 'A', failedAt: 'mw' },
      { id: 'K2', failedAt: 'tpsa' },
      { id: 'B', failedAt: 'alert' },
    ]);
  });

  test('판정 구간 0 · 1~7 · 8~40 · 41~', () => {
    assert.deepEqual([0, 1, 7, 8, 40, 41].map(screenVerdict), ['zero', 'few', 'few', 'good', 'good', 'many']);
  });

  test('정족수 · 값 범위 · Ro5 는 지금 0 · 1 만(§12-6) · 눈금 맞추기', () => {
    assert.deepEqual([2, 3, 4].map(screenQuorum), [2, 2, 3]);
    assert.equal(screenAgendaValueOk('ro5', 2), true);
    assert.equal(screenValueAllowed('ro5', 2), false);
    assert.equal(screenValueAllowed('ro5', 1), true);
    assert.equal(screenValueAllowed('qed', 0.65), true);
    assert.equal(screenValueAllowed('qed', 0.66), false);
    assert.equal(screenSnap('mw', 447, 'down'), 440);
    assert.equal(screenSnap('qed', 0.612, 'up'), 0.65);
    assert.equal(screenSnap('tpsa', 999), 180);
    assert.equal(screenSnap('score', -1), 0);
  });
});

describe('F12 코치 · 찜 근거', () => {
  const mission = SCREEN_MISSIONS['ache-4ey7']!;
  const ctx = { mission, ds, agreedOthers: {}, dockCrista: 250_000 };

  test('회의 코치 — 근거와 값이 어긋나면 짚는다', () => {
    assert.equal(agendaCoach('tpsa', 'bbb', 120, ctx)?.level, 'no');
    assert.equal(agendaCoach('tpsa', 'bbb', 90, ctx), null);
    assert.equal(agendaCoach('tpsa', 'gut', 120, ctx)?.level, 'no'); // 뇌 표적인데 '장에서만'
    assert.equal(agendaCoach('mw', 'bbb', 480, ctx)?.level, 'warn');
    assert.equal(agendaCoach('alert', 'long', 0, ctx)?.level, 'no');
    assert.equal(agendaCoach('ro5', 'soft', 0, ctx)?.level, 'warn');
    // 실제 약(도네페질 TPSA 39)이 걸리면 '실제 약 값을 참고해서' 가 어긋난다.
    assert.equal(agendaCoach('tpsa', 'ref', 40, ctx), null);
    assert.match(agendaCoach('mw', 'ref', 350, ctx)!.text, /실제 약/);
    // 다른 합의값과 합쳐 8개 미만이면 '후보를 잃지 않으려고' 경고
    assert.equal(agendaCoach('score', 'keep', 0.6, ctx)?.level, 'no');
    assert.equal(agendaCoach('score', 'cost', 0, { ...ctx, ds: { ...ds, compounds: Array.from({ length: 45 }, (_, i) => mk(`Z${i}`)) } })?.level, 'warn');
  });

  test('찜 근거 — 틀리면 막음(no), 주의는 warn', () => {
    const base = { rank: 1, mission, othersLibraries: [] as string[] };
    assert.equal(claimCoach('bbb', { ...base, compound: mk('T', { tpsa: 95 }) })?.level, 'no');
    assert.equal(claimCoach('bbb', { ...base, compound: mk('T', { tpsa: 85 }) }), null);
    assert.equal(claimCoach('known', { ...base, compound: mk('T', { library: 'ZINC 소형' }) })?.level, 'no');
    assert.equal(claimCoach('known', { ...base, compound: mk('CHEMBL502') })?.level, 'warn'); // 대조군 그 자체
    assert.equal(claimCoach('top', { ...base, rank: 11, compound: mk('T') })?.level, 'warn');
    assert.equal(claimCoach('diverse', { ...base, othersLibraries: ['ChEMBL 승인약'], compound: mk('T') })?.level, 'warn');
    assert.equal(claimCoach('diverse', { ...base, othersLibraries: ['ZINC 소형'], compound: mk('T') }), null);
  });

  test('근거 키는 모두 문구가 있고 DB 키 꼴(^[a-z][a-z0-9_]{0,39}$)에 맞다', () => {
    for (const a of SCREEN_AGENDAS) {
      for (const k of SCREEN_AGENDA_REASONS[a]) {
        assert.match(k, /^[a-z][a-z0-9_]{0,39}$/);
        assert.ok((SCREEN_COPY.reasons[a] as Record<string, string>)[k], `${a}.${k} 문구`);
      }
      assert.ok(screenAgendaHints(a, mission).length >= 2);
    }
    for (const k of CLAIM_REASONS) assert.ok(SCREEN_COPY.claimReasons[k]);
  });
});

describe('F12 미션 · 문구', () => {
  test('4 표적 미션 — 카드 8장 · 조언값이 안건 범위 안 · 대조군 id', () => {
    assert.deepEqual(Object.keys(SCREEN_MISSIONS).sort(), ['ache-4ey7', 'cox2-3ln1', 'dpp4-1x70', 'egfr-1m17']);
    for (const m of Object.values(SCREEN_MISSIONS)) {
      assert.equal(m.judgeCards.length, 8, m.gene);
      assert.equal(new Set(m.judgeCards.map((c) => c.compoundId)).size, 8);
      assert.ok(!m.judgeCards.some((c) => c.compoundId === m.controlId), `${m.gene} 카드에 대조군이 없어야 해요`);
      const adv = adviceCriteria(m);
      for (const a of SCREEN_AGENDAS) assert.ok(screenValueAllowed(a, adv[a]), `${m.gene} 조언 ${a}=${adv[a]}`);
      assert.equal(m.route, 'oral');
    }
  });

  test('규칙 글 · 자리표시자', () => {
    assert.equal(screenRuleText('mw', 450), 'MW ≤ 450');
    assert.equal(screenRuleText('score', 0.5, 'ACHE'), 'ACHE 점수 ≥ 0.50');
    assert.equal(screenRuleText('alert', 1), '구조 경고 빼기');
    assert.equal(screenRuleText('qed', null), SCREEN_COPY.rule.undecided);
    assert.equal(screenFill('{n}개 · {x}', { n: 3 }), '3개 · {x}');
  });
});
