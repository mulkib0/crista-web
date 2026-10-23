/**
 * 심사관 · 임상 해설의 '학생에게 말하는 법'(§5.12 — .review/2026-10-24-copy-reviewer 반영)과 4.1 학생 문구의 화폐 규칙을 봐요.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  CLINICAL_COPY,
  CLINICAL_SIM_VERSION,
  DOC_KINDS,
  IACUC_REVIEWER_VERSION,
  IND_REVIEWER_VERSION,
  NDA_CHECKLIST,
  NDA_REVIEWER_VERSION,
  PATENT_REVIEWER_VERSION,
  fillCopy,
} from '@crista-web/web-contract';
import { buildSimSystemPrompt } from '../src/features/clinical-sim.ts';
import { buildReviewSystemPrompt, REVIEWER_TALK_BY_KIND, REVIEWER_TALK_COMMON, reviewerTalkParagraph } from '../src/reviews.ts';

describe('서류 심사관 — 학생에게 말하는 법', () => {
  test('네 서류 모두 공통 줄 + 자기 서류 줄만 들어간다', () => {
    for (const kind of DOC_KINDS) {
      const text = reviewerTalkParagraph(kind);
      for (const line of REVIEWER_TALK_COMMON) assert.ok(text.includes(line), `${kind}: ${line}`);
      for (const line of REVIEWER_TALK_BY_KIND[kind].rules) assert.ok(text.includes(line), `${kind}: ${line}`);
      for (const other of DOC_KINDS.filter((k) => k !== kind)) {
        for (const line of REVIEWER_TALK_BY_KIND[other].rules) assert.ok(!text.includes(line), `${kind} 에 ${other} 줄이 섞였어요`);
      }
    }
  });
  test('NDA 프롬프트 — 칸 이름 「」 · 체크리스트 · 날짜 같은 바뀌는 값 없음', () => {
    const system = buildReviewSystemPrompt('nda', NDA_CHECKLIST);
    assert.match(system, /「효능 · 효과 \(한 줄\)」/);
    assert.match(system, /18세 미만/);
    assert.match(system, /AI 심사관이라고만/);
    for (const c of NDA_CHECKLIST) assert.ok(system.includes(`[${c.id}]`));
    assert.doesNotMatch(system, /\d{4}-\d{2}-\d{2}/);
  });
  test('프롬프트를 바꿨으니 판이 올랐다(옛 캐시를 쓰지 않게)', () => {
    assert.notEqual(PATENT_REVIEWER_VERSION, 'patent-v1');
    assert.notEqual(IACUC_REVIEWER_VERSION, 'iacuc-v1');
    assert.notEqual(IND_REVIEWER_VERSION, 'ind-v1');
    assert.notEqual(NDA_REVIEWER_VERSION, 'nda-v1');
    assert.notEqual(CLINICAL_SIM_VERSION, 'clinical-sim-v2');
  });
});

describe('4.1 임상 해설 프롬프트', () => {
  test('판정 · 보류 종류는 말하되 돈 · 기업가치는 말하지 않게 · 재도전 경로 이름 그대로', () => {
    const system = buildSimSystemPrompt();
    for (const k of Object.values(CLINICAL_COPY.holdKind)) assert.ok(system.includes(k), k);
    for (const r of [CLINICAL_COPY.routes.same, CLINICAL_COPY.routes.amend, CLINICAL_COPY.routes.backup]) assert.ok(system.includes(r), r);
    assert.match(system, /기업가치 · 전광판은 말하지 않아요/);
    assert.doesNotMatch(system, /\d{4}-\d{2}-\d{2}/);
  });
});

describe('4.1 학생 문구 — 화폐 · 자리표시자', () => {
  test('영문 단위 CRISTA · $ · 달러 · 원이 없고, 돈 자리표시자 뒤에 크리스타를 다시 쓰지 않는다', () => {
    const all = JSON.stringify(CLINICAL_COPY);
    assert.doesNotMatch(all, /CRISTA|\$|달러|[0-9] ?원/);
    assert.doesNotMatch(all, /\{(cost|fee|spent|crista|costLeft)\} ?크리스타/);
  });
  test('모집 투자 단계 문구는 속도 · 하루 비용을 채운다', () => {
    const text = fillCopy(CLINICAL_COPY.tier.focus.note, { speed: 3.5, cost: '20,000 크리스타' });
    assert.match(text, /3\.5배/);
    assert.match(text, /하루 20,000 크리스타가 들어요/);
    assert.doesNotMatch(text, /\{/);
  });
});
