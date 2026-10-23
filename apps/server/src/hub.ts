/**
 * WebSocket 허브 — `/ws` 를 로그인 쿠키로 인증하고 채널(학급 · 모둠)로 나눠 보낸다(설계 §8).
 * 채널은 서버가 DB 에서 정한다(화면이 고르지 않는다). 입사 · 배정으로 모둠이 바뀌면 그 사용자의 채널을 다시 정한다.
 *
 * 사옥 지구(W2): 학생이 `district.enter` 를 보내면 같은 학급의 지금 위치 목록을 받고, 이후 `district.move` 를 같은 학급에 중계한다.
 * 위치는 서버 메모리에만 있다(저장 · 판정 없음 — 설계 §4.1). 초당 5회를 넘는 이동은 버리고, 좌표는 지구 안으로 자른다.
 */
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  classChannel,
  DIRECTIONS,
  DISTRICT_MAP,
  DISTRICT_MOVE_PER_SEC,
  SESSION_COOKIE,
  teamChannel,
  type AccountView,
  type Avatar,
  type Direction,
  type DistrictPeer,
  type ServerMessage,
} from '@crista-web/web-contract';
import type { Pool } from './db.ts';
import { isCrossSite, parseCookies } from './http.ts';
import { lookupSession } from './sessions.ts';

const HEARTBEAT_MS = 30_000;

interface Peer {
  ws: WebSocket;
  account: AccountView;
  tokenHash: Buffer;
  channels: Set<string>;
  alive: boolean;
  /** 학생의 학급(교사는 null). */
  classId: string | null;
  /** 사옥 지구에 있으면 그 위치. */
  district: DistrictPeer | null;
  /** 이동 중계 토큰 통(초당 5개). */
  moveTokens: number;
  moveRefillAt: number;
}

export async function channelsFor(db: Pool, userId: string, kind: 'teacher' | 'student'): Promise<string[]> {
  if (kind === 'teacher') {
    const owned = await db.query<{ id: string }>('select id from web.classes where teacher_id = $1', [userId]);
    return owned.rows.map((row) => classChannel(row.id));
  }
  const member = await db.query<{ class_id: string; team_id: string | null }>(
    `select class_id, team_id from web.members where user_id = $1 and role = 'student'`,
    [userId],
  );
  const row = member.rows[0];
  if (!row) return [];
  return row.team_id ? [classChannel(row.class_id), teamChannel(row.team_id)] : [classChannel(row.class_id)];
}

const MAX_X = DISTRICT_MAP.cols * DISTRICT_MAP.tile;
const MAX_Y = DISTRICT_MAP.rows * DISTRICT_MAP.tile;
const clampCoord = (v: unknown, max: number): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(0, Math.min(max, v))) : null);
const isDir = (v: unknown): v is Direction => DIRECTIONS.includes(v as Direction);

export class Hub {
  private readonly wss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 });
  private readonly peers = new Set<Peer>();
  private readonly db: Pool;
  private readonly allowedOrigins: readonly string[];
  private readonly heartbeat: NodeJS.Timeout;

  constructor(db: Pool, allowedOrigins: readonly string[]) {
    this.db = db;
    this.allowedOrigins = allowedOrigins;
    this.heartbeat = setInterval(() => {
      for (const peer of this.peers) {
        if (!peer.alive) {
          peer.ws.terminate();
          continue;
        }
        peer.alive = false;
        peer.ws.ping();
      }
    }, HEARTBEAT_MS);
    this.heartbeat.unref();
  }

  /** HTTP 서버의 'upgrade' 에 건다. 인증 실패면 401 로 끊는다. */
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const onError = () => socket.destroy();
    socket.on('error', onError);
    const reject = (status: string) => {
      socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };
    // 브라우저는 WebSocket 에 Origin 을 늘 싣는다 — 다른 사이트에서 쿠키를 업고 붙는 것을 막는다.
    if (!req.headers.origin || isCrossSite(req, this.allowedOrigins)) return reject('403 Forbidden');
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    lookupSession(this.db, token)
      .then(async (session) => {
        if (!session) return reject('401 Unauthorized');
        const channels = await channelsFor(this.db, session.account.userId, session.account.kind);
        socket.removeListener('error', onError);
        this.wss.handleUpgrade(req, socket, head, (ws) => this.accept(ws, session.account, session.tokenHash, channels));
      })
      .catch((error: unknown) => {
        console.error('[ws] 인증 중 오류:', (error as Error).message);
        reject('500 Internal Server Error');
      });
  }

  private accept(ws: WebSocket, account: AccountView, tokenHash: Buffer, channels: string[]): void {
    const classId = account.kind === 'student' ? (channels.find((c) => c.startsWith('class:'))?.slice('class:'.length) ?? null) : null;
    const peer: Peer = { ws, account, tokenHash, channels: new Set(channels), alive: true, classId, district: null, moveTokens: DISTRICT_MOVE_PER_SEC, moveRefillAt: Date.now() };
    this.peers.add(peer);
    ws.on('pong', () => {
      peer.alive = true;
    });
    ws.on('error', () => ws.terminate());
    ws.on('close', () => {
      this.peers.delete(peer);
      this.leaveDistrict(peer);
    });
    ws.on('message', (data) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(data)) as Record<string, unknown>;
      } catch {
        return;
      }
      if (msg.type === 'ping') this.send(peer, { type: 'pong' });
      else if (msg.type === 'district.enter') void this.enterDistrict(peer, msg).catch((error: Error) => console.error('[ws] 지구 입장 오류:', error.message));
      else if (msg.type === 'district.move') this.moveInDistrict(peer, msg);
      else if (msg.type === 'district.exit') this.leaveDistrict(peer);
    });
    this.send(peer, { type: 'hello', userId: account.userId, channels: [...peer.channels] });
  }

  // ── 사옥 지구 ──

  private async lookFor(userId: string): Promise<{ avatar: Avatar | null; ink: number | null }> {
    const result = await this.db.query<{ avatar: Avatar | null; ink: number | null }>(
      `select m.avatar, t.ink from web.members m left join web.teams t on t.id = m.team_id where m.user_id = $1 and m.role = 'student'`,
      [userId],
    );
    return result.rows[0] ?? { avatar: null, ink: null };
  }

  private async enterDistrict(peer: Peer, msg: Record<string, unknown>): Promise<void> {
    if (!peer.classId) return;
    const look = await this.lookFor(peer.account.userId);
    const x = clampCoord(msg.x, MAX_X) ?? MAX_X / 2;
    const y = clampCoord(msg.y, MAX_Y) ?? MAX_Y / 2;
    peer.district = {
      userId: peer.account.userId,
      displayName: peer.account.displayName,
      avatar: look.avatar,
      ink: look.ink,
      x,
      y,
      dir: isDir(msg.dir) ? msg.dir : 'south',
      moving: false,
    };
    const others = new Map<string, DistrictPeer>();
    for (const other of this.peers) {
      if (other !== peer && other.classId === peer.classId && other.district && other.account.userId !== peer.account.userId) {
        others.set(other.account.userId, other.district);
      }
    }
    this.send(peer, { type: 'district.snapshot', peers: [...others.values()] });
    this.broadcastDistrict(peer, { type: 'district.peer', peer: peer.district });
  }

  private moveInDistrict(peer: Peer, msg: Record<string, unknown>): void {
    if (!peer.district) return;
    const now = Date.now();
    peer.moveTokens = Math.min(DISTRICT_MOVE_PER_SEC, peer.moveTokens + ((now - peer.moveRefillAt) / 1000) * DISTRICT_MOVE_PER_SEC);
    peer.moveRefillAt = now;
    if (peer.moveTokens < 1) return;
    peer.moveTokens -= 1;
    const x = clampCoord(msg.x, MAX_X);
    const y = clampCoord(msg.y, MAX_Y);
    if (x === null || y === null) return;
    peer.district = { ...peer.district, x, y, dir: isDir(msg.dir) ? msg.dir : peer.district.dir, moving: msg.moving === true };
    this.broadcastDistrict(peer, { type: 'district.peer', peer: peer.district });
  }

  private leaveDistrict(peer: Peer): void {
    if (!peer.district) return;
    peer.district = null;
    // 같은 사람이 다른 탭으로 지구에 남아 있으면 떠났다고 알리지 않는다.
    const stillThere = [...this.peers].some((p) => p.account.userId === peer.account.userId && p.district);
    if (!stillThere) this.broadcastDistrict(peer, { type: 'district.leave', userId: peer.account.userId });
  }

  /** 같은 학급의 다른 연결(본인 탭 제외)에 보낸다. */
  private broadcastDistrict(from: Peer, message: ServerMessage): void {
    if (!from.classId) return;
    const channel = classChannel(from.classId);
    for (const peer of this.peers) {
      if (peer === from || peer.account.userId === from.account.userId) continue;
      if (peer.channels.has(channel)) this.send(peer, message);
    }
  }

  private send(peer: Peer, message: ServerMessage): void {
    if (peer.ws.readyState === peer.ws.OPEN) peer.ws.send(JSON.stringify(message));
  }

  publish(channel: string, message: ServerMessage): void {
    for (const peer of this.peers) if (peer.channels.has(channel)) this.send(peer, message);
  }

  /** 모둠이 바뀐 사용자의 채널을 DB 에서 다시 정하고, 지구에 있으면 잉크를 바꿔 알린다. */
  async refreshUser(userId: string, kind: 'teacher' | 'student'): Promise<void> {
    const targets = [...this.peers].filter((peer) => peer.account.userId === userId);
    if (targets.length === 0) return;
    const channels = await channelsFor(this.db, userId, kind);
    const look = kind === 'student' ? await this.lookFor(userId) : null;
    for (const peer of targets) {
      peer.channels = new Set(channels);
      if (peer.district && look) {
        peer.district = { ...peer.district, avatar: look.avatar, ink: look.ink };
        this.broadcastDistrict(peer, { type: 'district.peer', peer: peer.district });
      }
    }
  }

  /** 로그아웃한 세션의 연결을 닫는다. */
  closeSession(tokenHash: Buffer): void {
    for (const peer of this.peers) if (peer.tokenHash.equals(tokenHash)) peer.ws.close(4001, 'logged out');
  }

  get size(): number {
    return this.peers.size;
  }

  close(): void {
    clearInterval(this.heartbeat);
    for (const peer of this.peers) peer.ws.terminate();
    this.wss.close();
  }
}
