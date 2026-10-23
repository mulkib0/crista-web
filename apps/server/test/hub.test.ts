/**
 * WebSocket 허브 — 연결한 뒤 학급에 들어가도(가입 → 연결 → 학급 고르기) 사옥 지구에서 보이는지(가짜 DB · 가짜 소켓).
 */
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { describe, test } from 'node:test';
import type { AccountView } from '@crista-web/web-contract';
import type { Pool } from '../src/db.ts';
import { Hub } from '../src/hub.ts';

class FakeSocket extends EventEmitter {
  readonly OPEN = 1;
  readyState = 1;
  sent: Array<Record<string, unknown>> = [];
  send(data: string): void {
    this.sent.push(JSON.parse(data) as Record<string, unknown>);
  }
  ping(): void {}
  terminate(): void {}
  close(): void {}
  say(message: Record<string, unknown>): void {
    this.emit('message', Buffer.from(JSON.stringify(message)));
  }
  got(type: string): Array<Record<string, unknown>> {
    return this.sent.filter((m) => m.type === type);
  }
}

/** web.members 한 줄씩(학생 → 학급 · 모둠). */
const fakeDb = (members: Map<string, { class_id: string; team_id: string | null }>): Pool =>
  ({
    async query(sql: string, params: unknown[]) {
      const row = members.get(params[0] as string);
      if (sql.includes('select class_id, team_id from web.members')) return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      if (sql.includes('select m.avatar, t.ink')) return { rows: row ? [{ avatar: 'cso', ink: null }] : [], rowCount: row ? 1 : 0 };
      throw new Error(`예상하지 못한 질의: ${sql}`);
    },
  }) as unknown as Pool;

const student = (userId: string): AccountView => ({ userId, loginId: userId, displayName: userId, kind: 'student' });
const flush = () => new Promise((r) => setImmediate(r));

describe('허브 — 학급이 바뀐 연결', () => {
  test('학급 없이 연결 → 학급에 들어감 → 같은 연결로 지구 입장 · 이동이 같은 학급에 보인다', async () => {
    const members = new Map<string, { class_id: string; team_id: string | null }>([['b', { class_id: 'c1', team_id: null }]]);
    const hub = new Hub(fakeDb(members), []);
    try {
      const accept = (hub as unknown as { accept(ws: unknown, a: AccountView, t: Buffer, ch: string[]): void }).accept.bind(hub);
      const wsA = new FakeSocket();
      const wsB = new FakeSocket();
      accept(wsA, student('a'), Buffer.from('a'), []); // 학급이 없을 때 연결
      accept(wsB, student('b'), Buffer.from('b'), ['class:c1']);
      wsB.say({ type: 'district.enter', x: 10, y: 10 });
      await flush();

      // 학급에 들어감(enroll) → refreshUser
      members.set('a', { class_id: 'c1', team_id: null });
      await hub.refreshUser('a', 'student');
      wsA.say({ type: 'district.enter', x: 20, y: 20 });
      await flush();
      const snap = wsA.got('district.snapshot');
      assert.equal(snap.length, 1, '지구 스냅숏을 받지 못함');
      assert.deepEqual((snap[0]!.peers as Array<{ userId: string }>).map((p) => p.userId), ['b']);
      assert.ok(wsB.got('district.peer').some((m) => (m.peer as { userId: string }).userId === 'a'), '같은 학급 학생에게 보이지 않음');

      // 학급이 다시 바뀌면 옛 학급에서 떠났다고 알리고, 새 학급 기준으로 다시 입장한다.
      members.set('a', { class_id: 'c2', team_id: null });
      await hub.refreshUser('a', 'student');
      assert.ok(wsB.got('district.leave').some((m) => m.userId === 'a'), '옛 학급에 떠남을 알리지 않음');
      const before = wsB.sent.length;
      wsA.say({ type: 'district.move', x: 30, y: 30, dir: 'east', moving: true });
      await flush();
      assert.equal(wsB.sent.length, before, '다른 학급 학생에게 이동이 중계됨');
    } finally {
      hub.close();
    }
  });
});
