/**
 * F33 — 3.3 제형 · IND 규격: 규칙 검사(indRuleFindings) · 계산 칸 · 환자군 목록 · 문구 묶음.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  IND_CHECKLIST,
  IND_COPY,
  IND_ID_PATTERN,
  IND_PARTS,
  IND_PLEDGE_BODY,
  IND_RULE_IDS,
  IND_SECTIONS,
  indCalcMatches,
  indChecklistFor,
  indDoseBurden,
  indGates,
  indNeedsMonitoring,
  indParseNumber,
  indRuleFindings,
  indTrialOptions,
  SECTION_KEY_PATTERN,
  type IndRuleInput,
} from '../src/index.ts';

const animal = { mrsdMgByForm: { oral: 60, iv: 46, transdermal: 80 }, hedMgPerKg: 10, findings: [] as Array<'liver' | 'qt' | 'cns'> };
const filled = {
  title: '경도 알츠하이머병 환자를 위한 SEUM-102 경구 제1상',
  dev_plan: '계획',
  form_reason: '근거',
  nonclinical: '해석',
  calc_hed: '10.0 mg/kg',
  calc_mrsd: '약 60 mg',
  subject: '건강한 지원자',
  stop_rule: 'QT 가 늘면 멈춰요',
  consent: '동의',
  risk_monitor: '심전도 QT 감시',
  pledge_hold: IND_PLEDGE_BODY,
  pledge_report: IND_PLEDGE_BODY,
};
const good: IndRuleInput = {
  lead: { ok: true },
  form: 'oral',
  dose: 50,
  population: '경도 알츠하이머병 환자',
  endpoint: '인지 기능 점수(ADAS-Cog) 변화',
  sections: filled,
  animal,
  signals: { transdermal: 'suitable', herg: 'moderate', hepatotoxicity: 'low' },
  expectedSafety: 44.5,
};
const failed = (input: IndRuleInput) => indRuleFindings(input).filter((f) => f.status === 'fail').map((f) => f.id);

describe('규칙 검사(§5.10 표)', () => {
  test('다 맞으면 fail 0 · 규칙 id 9개가 모두 나온다', () => {
    const out = indRuleFindings(good);
    assert.deepEqual(out.map((f) => f.id).sort(), [...IND_RULE_IDS].sort());
    assert.deepEqual(failed(good), []);
  });
  test('주력이 아니면 · 특허가 죽었으면 · 동물실험 전이면 보완', () => {
    assert.deepEqual(failed({ ...good, lead: { ok: false, problem: 'no_animal' } }), ['lead_valid']);
  });
  test('시작 용량 > 그 제형 MRSD → 보완(정맥 50 > 46)', () => {
    assert.ok(failed({ ...good, form: 'iv', sections: { ...filled, calc_mrsd: '46' } }).includes('dose_le_mrsd'));
    assert.ok(!failed({ ...good, form: 'iv', dose: 10, sections: { ...filled, calc_mrsd: '46' } }).includes('dose_le_mrsd'));
  });
  test('경피 부적합 분자를 경피로 고르면 보완', () => {
    const td = { ...good, form: 'transdermal' as const, sections: { ...filled, calc_mrsd: '80' } };
    assert.deepEqual(failed({ ...td, signals: { ...good.signals!, transdermal: 'unsuitable' } }), ['transdermal_fit']);
    assert.deepEqual(failed(td), []);
  });
  test('학생 계산 칸 = 서버 값(반올림 오차 안)', () => {
    assert.deepEqual(failed({ ...good, sections: { ...filled, calc_hed: '10.1' } }), []);
    assert.deepEqual(failed({ ...good, sections: { ...filled, calc_hed: '18' } }), ['calc_match']);
    assert.deepEqual(failed({ ...good, sections: { ...filled, calc_mrsd: '30' } }), ['calc_match']);
    assert.ok(failed({ ...good, animal: null }).includes('calc_match'));
  });
  test('위험 보통 이상인데 감시 칸이 비면 보완 · 낮으면 비어도 된다', () => {
    const empty = { ...filled, risk_monitor: '' };
    assert.deepEqual(failed({ ...good, sections: empty }), ['risk_monitor']);
    assert.deepEqual(failed({ ...good, sections: empty, signals: { transdermal: 'suitable', herg: 'low', hepatotoxicity: 'low' } }), []);
    assert.deepEqual(failed({ ...good, sections: empty, signals: { transdermal: 'suitable', herg: 'low', hepatotoxicity: 'low' }, animal: { ...animal, findings: ['liver'] } }), ['risk_monitor']);
  });
  test('서약 두 개 · 조합 네 칸 · 빈 칸', () => {
    assert.deepEqual(failed({ ...good, sections: { ...filled, pledge_report: '' } }), ['pledges']);
    assert.deepEqual(failed({ ...good, endpoint: null }), ['plan_complete']);
    assert.deepEqual(failed({ ...good, sections: { ...filled, stop_rule: '  ' } }), ['sections_filled']);
  });
  test('예상 S < 35 면(MRSD 를 넘지 않아도) 보완 — 서류 통과 IND 는 판정에서 떨어지지 않게', () => {
    assert.deepEqual(failed({ ...good, expectedSafety: 34.9 }), ['safety_expected']);
    assert.deepEqual(failed({ ...good, expectedSafety: 35 }), []);
    assert.ok(failed({ ...good, expectedSafety: null }).includes('safety_expected'));
  });
  test('fail 노트는 칸을 가리키고 80자 안', () => {
    const out = indRuleFindings({ ...good, lead: { ok: false }, form: null, dose: null, sections: {}, animal: null, signals: null, expectedSafety: null });
    for (const f of out) {
      assert.ok([...f.note].length <= 80, `${f.id}: ${f.note}`);
      assert.ok(f.section);
    }
  });
});

describe('도우미', () => {
  test('숫자 읽기 · 허용 오차', () => {
    assert.equal(indParseNumber('약 10.2 mg/kg'), 10.2);
    assert.equal(indParseNumber('60,5'), 60.5);
    assert.equal(indParseNumber('없음'), null);
    assert.ok(indCalcMatches(10.1, 10, 0.05));
    assert.ok(!indCalcMatches(10.3, 10, 0.05));
    assert.ok(indCalcMatches(59, 60, 1));
    assert.ok(!indCalcMatches(58, 60, 1));
  });
  test('용량 독성 꺾은선은 규칙 값을 지난다', () => {
    const t = { 10: 10, 50: 30, 100: 55 } as const;
    assert.equal(indDoseBurden(10, t), 10);
    assert.equal(indDoseBurden(50, t), 30);
    assert.equal(indDoseBurden(100, t), 55);
    assert.equal(indDoseBurden(30, t), 20);
    assert.equal(indDoseBurden(5, t), 5);
  });
  test('감시 필요 · 관문 신호', () => {
    assert.deepEqual(indNeedsMonitoring({ transdermal: 'suitable', herg: 'high', hepatotoxicity: 'low' }, []), { qt: true, liver: false });
    assert.deepEqual(indNeedsMonitoring(null, ['liver']), { qt: false, liver: true });
    const g = indGates(78.8, 44.5, { ind: 35, phase1: 50, phase2E: 40, phase3E: 45, phase3S: 55 });
    assert.deepEqual(g.map((x) => x.ok), [true, false, true, false]);
  });
});

describe('환자군 · 1차 평가지표 목록(12 표적)', () => {
  const ids = ['ache-4ey7', 'maob-2v5z', 'sert-5i71', 'egfr-1m17', 'abl1-2hyy', 'braf-3og7', 'dpp4-1x70', 'hmgcr-1hwk', 'fxa-2p16', 'cox2-3ln1', 'jak1-6bbu', 'pde4b-1xmu'];
  test('모든 표적에 목록이 있고 DB 길이(환자군 ≤ 80 · 평가지표 ≤ 120) 안', () => {
    for (const id of ids) {
      const t = indTrialOptions(id);
      assert.ok(t, id);
      assert.ok(t.populations.length > 0 && t.endpoints.length > 0, id);
      for (const p of t.populations) assert.ok([...p].length <= 80, p);
      for (const e of t.endpoints) assert.ok([...e].length <= 120, e);
      for (const b of t.brainPopulations) assert.ok(t.populations.includes(b), b);
    }
    assert.equal(indTrialOptions('nope'), null);
    assert.deepEqual(indTrialOptions('egfr-1m17')!.brainPopulations, ['뇌전이를 동반한 EGFR 변이 비소세포폐암 환자']);
  });
});

describe('칸 · 문구 묶음', () => {
  test('칸 키 모양 · 칸마다 문구 · 체크리스트 기준 · 묶음 문구', () => {
    for (const s of IND_SECTIONS) {
      assert.match(s.key, SECTION_KEY_PATTERN);
      assert.ok(IND_COPY.sections[s.key].label);
      assert.ok(IND_PARTS.includes(s.part));
    }
    for (const c of IND_CHECKLIST) {
      assert.ok(IND_COPY.checklist[c.id], c.id);
      assert.ok(IND_SECTIONS.some((s) => s.key === c.section && s.kind === 'text'), c.section);
    }
    for (const p of IND_PARTS) assert.ok(IND_COPY.parts[p].title);
    assert.equal(IND_COPY.overview.summary.length, 3);
  });
});

describe('검토 · 수리(F33 적대적 검토)', () => {
  test('LLM 체크리스트 — 감시가 필요 없고 ⑥ 감시 칸이 비었으면 monitor_fits 를 뺀다(빈 선택 칸을 missing 으로 보완하지 않게)', () => {
    const low = { transdermal: 'suitable', herg: 'low', hepatotoxicity: 'low' } as const;
    const ids = (x: ReturnType<typeof indChecklistFor>) => x.map((c) => c.id);
    assert.ok(!ids(indChecklistFor({ signals: low, animal: { ...animal, findings: [] }, sections: { risk_monitor: '' } })).includes('monitor_fits'));
    assert.ok(ids(indChecklistFor({ signals: low, animal: { ...animal, findings: [] }, sections: { risk_monitor: '일반 감시' } })).includes('monitor_fits'));
    assert.ok(ids(indChecklistFor({ signals: { ...low, herg: 'moderate' }, animal: null, sections: {} })).includes('monitor_fits'));
    assert.ok(ids(indChecklistFor({ signals: low, animal: { ...animal, findings: ['liver'] }, sections: {} })).includes('monitor_fits'));
    assert.equal(indChecklistFor({ signals: null, animal: null, sections: {} }).length, IND_CHECKLIST.length - 1);
  });
  test('신청서 id 꼴 — uuid 만', () => {
    assert.ok(IND_ID_PATTERN.test('0b6e1a52-3c1d-4f7e-9a2b-1c2d3e4f5a6b'));
    assert.ok(!IND_ID_PATTERN.test('not-a-uuid'));
    assert.ok(!IND_ID_PATTERN.test("0b6e1a52-3c1d-4f7e-9a2b-1c2d3e4f5a6b' or 1=1"));
  });
  test('학생 문구에 규칙 숫자를 박지 않는다 — 기준선은 자리표시자', () => {
    assert.match(IND_COPY.doc.phase1Gap, /\{p1\}/);
    assert.match(IND_COPY.doc.phase1Ok, /\{p1\}/);
    assert.match(IND_COPY.toolNotes.peakLimit, /\{min\}/);
    assert.match(IND_COPY.tools.lab.howTo, /\{ind\}.*\{p1\}.*\{p2e\}.*\{p3e\}.*\{p3s\}/);
    assert.match(IND_COPY.tools.plane.question, /\{ind\}/);
    for (const text of [IND_COPY.doc.approvedNote, ...IND_COPY.overview.more.map((m) => m.v), IND_COPY.tools.lab.howTo]) assert.ok(!/S ≥ \d/.test(text), text);
  });
});
