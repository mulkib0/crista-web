/**
 * 모둠 대화방 규칙(feed.ts) — 보기 거르기 · 안 읽음 · @이름 찾기 · 칠하기.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { findMentions, inFeedView, isFeedChannel, isFeedUnread, isFeedView, splitMentions } from '../src/feed.ts';

const ME = 'u-me';
const members = [
  { userId: 'u-me', displayName: '하늘' },
  { userId: 'u-mj', displayName: '민준' },
  { userId: 'u-mjh', displayName: '민준호' },
  { userId: 'u-dy', displayName: '도윤' },
];

describe('대화방 보기', () => {
  const chat = { kind: 'chat' as const, stepId: '1.2', mentions: [ME] };
  const act = { kind: 'act' as const, stepId: '2.1', mentions: [] };
  test('채널 · 보기마다 들어가는 줄', () => {
    assert.equal(inFeedView(chat, 'all', ME), true);
    assert.equal(inFeedView(chat, '1.2', ME), true);
    assert.equal(inFeedView(chat, '2.1', ME), false);
    assert.equal(inFeedView(act, 'act', ME), true);
    assert.equal(inFeedView(act, 'chat', ME), false);
    assert.equal(inFeedView(chat, 'mention', ME), true);
    assert.equal(inFeedView(chat, 'mention', 'u-dy'), false);
  });
  test('채널 이름 꼴 — 보기는 채널이 아니다', () => {
    assert.equal(isFeedChannel('all'), true);
    assert.equal(isFeedChannel('3.2'), true);
    assert.equal(isFeedChannel('act'), false);
    assert.equal(isFeedView('mention'), true);
    assert.equal(isFeedView('../x'), false);
    assert.equal(isFeedView('1.2; drop'), false);
  });
});

describe('안 읽음', () => {
  const item = (seq: number, stepId: string | null, actorId = 'u-dy', deleted = false) => ({ seq, stepId, actorId, deleted });
  test("'all' 위치는 모든 채널을 읽은 것으로 · 단계 위치는 그 단계만", () => {
    const reads = { all: 5, '1.2': 9 };
    assert.equal(isFeedUnread(item(4, '2.1'), reads, ME), false);
    assert.equal(isFeedUnread(item(6, '2.1'), reads, ME), true);
    assert.equal(isFeedUnread(item(8, '1.2'), reads, ME), false);
    assert.equal(isFeedUnread(item(10, '1.2'), reads, ME), true);
    assert.equal(isFeedUnread(item(6, null), reads, ME), true);
  });
  test('내 줄 · 지운 줄은 늘 읽음', () => {
    assert.equal(isFeedUnread(item(99, '1.2', ME), {}, ME), false);
    assert.equal(isFeedUnread(item(99, '1.2', 'u-dy', true), {}, ME), false);
  });
});

describe('@이름', () => {
  test('긴 이름부터 · 조사 · 같은 사람 한 번', () => {
    assert.deepEqual(findMentions('@민준호 그리고 @민준아 @민준', members).sort(), ['u-mj', 'u-mjh']);
    assert.deepEqual(findMentions('@도윤님 봐 줘 @도윤', members), ['u-dy']);
    assert.deepEqual(findMentions('메일 a@b.c 는 부르기가 아니다', members), []);
  });
  test('칠하기 조각', () => {
    assert.deepEqual(splitMentions('@민준호 와 @민준!', ['민준', '민준호']), [
      { text: '@민준호', mention: true },
      { text: ' 와 ', mention: false },
      { text: '@민준', mention: true },
      { text: '!', mention: false },
    ]);
    assert.deepEqual(splitMentions('@없는이름', ['민준']), [{ text: '@없는이름', mention: false }]);
  });
});
