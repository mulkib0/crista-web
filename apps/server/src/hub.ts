/**
 * WebSocket 허브 — `/ws` 를 로그인 쿠키로 인증하고 채널(학급 · 모둠)로 나눠 보낸다(설계 §8).
 * 채널은 서버가 DB 에서 정한다(화면이 고르지 않는다). 입사 · 배정으로 모둠이 바뀌면 그 사용자의 채널을 다시 정한다.
 */
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import { classChannel, SESSION_COOKIE, teamChannel, type ServerMessage } from '@crista-web/web-contract';
import type { Pool } from './db.ts';
import { isCrossSite, parseCookies } from './http.ts';
import { lookupSession } from './sessions.ts';

const HEARTBEAT_MS = 30_000;

interface Peer {
  ws: WebSocket;
  userId: string;
  tokenHash: Buffer;
  channels: Set<string>;
  alive: boolean;
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
        this.wss.handleUpgrade(req, socket, head, (ws) => this.accept(ws, session.account.userId, session.tokenHash, channels));
      })
      .catch((error: unknown) => {
        console.error('[ws] 인증 중 오류:', (error as Error).message);
        reject('500 Internal Server Error');
      });
  }

  private accept(ws: WebSocket, userId: string, tokenHash: Buffer, channels: string[]): void {
    const peer: Peer = { ws, userId, tokenHash, channels: new Set(channels), alive: true };
    this.peers.add(peer);
    ws.on('pong', () => {
      peer.alive = true;
    });
    ws.on('error', () => ws.terminate());
    ws.on('close', () => this.peers.delete(peer));
    ws.on('message', (data) => {
      // W1 은 ping 만 받는다. 나머지는 버린다.
      try {
        const msg = JSON.parse(String(data)) as { type?: unknown };
        if (msg.type === 'ping') this.send(peer, { type: 'pong' });
      } catch {
        // 무시
      }
    });
    this.send(peer, { type: 'hello', userId, channels: [...peer.channels] });
  }

  private send(peer: Peer, message: ServerMessage): void {
    if (peer.ws.readyState === peer.ws.OPEN) peer.ws.send(JSON.stringify(message));
  }

  publish(channel: string, message: ServerMessage): void {
    for (const peer of this.peers) if (peer.channels.has(channel)) this.send(peer, message);
  }

  /** 모둠이 바뀐 사용자의 채널을 DB 에서 다시 정한다. */
  async refreshUser(userId: string, kind: 'teacher' | 'student'): Promise<void> {
    const targets = [...this.peers].filter((peer) => peer.userId === userId);
    if (targets.length === 0) return;
    const channels = await channelsFor(this.db, userId, kind);
    for (const peer of targets) peer.channels = new Set(channels);
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
