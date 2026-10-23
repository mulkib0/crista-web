/**
 * 모둠 대화방 서버(features/feed.ts) — 모둠 소식 → 행적 문장 · 본문 다듬기.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { ServerMessage } from '@crista-web/web-contract';
import { cleanBody, describeTeamMessage } from '../src/features/feed.ts';

const changed = (reason: string, byName?: string): ServerMessage => ({ type: 'board.changed', teamId: 't', reason, ...(byName ? { byName } : {}) });

describe('소식 → 행적', () => {
  test('사람이 한 일 — 단계 · 문장 · 묶기', () => {
    assert.deepEqual(describeTeamMessage(changed('note:1.2:why', '서연')), {
      code: 'note:1.2:why',
      stepId: '1.2',
      actorName: '서연',
      body: '연구 노트 ① 칸을 고쳤어요',
      tone: 'normal',
      coalesce: true,
    });
    const job = describeTeamMessage(changed('job:2.1', '민준'))!;
    assert.equal(job.stepId, '2.1');
    assert.equal(job.body, '분자 도킹 작업을 시작했어요');
    assert.equal(job.coalesce, false);
    assert.equal(describeTeamMessage(changed('patent:section:claims', '도윤'))!.stepId, '3.1');
  });

  test('사람 줄인데 이름이 없으면 남기지 않는다 · 시스템 줄은 이름 없이', () => {
    assert.equal(describeTeamMessage(changed('note:1.2:why')), null);
    assert.equal(describeTeamMessage(changed('preclinical:review')), null);
    const done = describeTeamMessage(changed('job.succeeded:1.2'))!;
    assert.equal(done.actorName, null);
    assert.equal(done.tone, 'good');
    assert.equal(describeTeamMessage(changed('job.failed:2.2'))!.tone, 'bad');
  });

  test('남기지 않는 소식 — 진행률 · 학습 갱신 · 모르는 이유 · 대화방 자기 소식', () => {
    assert.equal(describeTeamMessage(changed('job.running:2.1')), null);
    assert.equal(describeTeamMessage(changed('learn')), null);
    assert.equal(describeTeamMessage(changed('something:new', '하늘')), null);
    assert.equal(describeTeamMessage({ type: 'feed.presence', teamId: 't', online: [] }), null);
    assert.equal(describeTeamMessage({ type: 'job.progress', teamId: 't', jobId: 'j', status: 'running', progress: 0.4 }), null);
  });

  test('1.2 회의 · 서류 심사 · 학습 채점', () => {
    const p = describeTeamMessage({ type: 'screen.changed', teamId: 't', reason: 'proposal', byName: '도윤', agenda: 'score' })!;
    assert.equal(p.body, '결합 예측 기준을 제안했어요');
    assert.equal(p.code, 'screen:proposal:score');
    assert.equal(describeTeamMessage({ type: 'screen.changed', teamId: 't', reason: 'agreed', byName: '서연', agenda: 'mw' })!.tone, 'good');
    const r = describeTeamMessage({ type: 'doc.reviewed', teamId: 't', kind: 'ind', docId: 'd', reviewId: 'r', verdict: 'revise' })!;
    assert.equal(r.stepId, '3.3');
    assert.match(r.body, /보완 요청/);
    assert.equal(describeTeamMessage({ type: 'doc.reviewed', teamId: 't', kind: 'ind', docId: 'd', reviewId: 'r', verdict: 'pending' }), null);
    const g = describeTeamMessage({ type: 'learn.graded', teamId: 't', targetType: 'note', targetId: 'n', score: 82.4, crista: 200000 })!;
    assert.equal(g.body, '연구 노트 채점 — 82점 · 200,000 크리스타 받았어요');
  });
});

describe('본문 다듬기', () => {
  test('NFC · 줄바꿈 · 빈 줄 · 앞뒤 공백', () => {
    assert.equal(cleanBody('  안녕\r\n\r\n\r\n\r\n잘 가   \n'), '안녕\n\n잘 가');
    assert.equal(cleanBody('가'), '가');
  });
  test('쓸 수 없는 글자 · 글자 아님', () => {
    assert.equal(cleanBody('a\u0007b'), null);
    assert.equal(cleanBody('abc‮def'), null);
    assert.equal(cleanBody(42), null);
  });
});
