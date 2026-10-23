/**
 * WebSocket — `/crista/ws`(쿠키 세션). 끊기면 1 → 2 → 4 … 15초 간격으로 다시 붙는다. 화면 여러 곳이 한 연결을 나눠 쓴다.
 */
import type { ClientMessage, ServerMessage } from '@crista-web/web-contract';
import { BASE } from './api.ts';

type Listener = (message: ServerMessage) => void;

class Socket {
  private ws: WebSocket | null = null;
  private readonly listeners = new Set<Listener>();
  private readonly openListeners = new Set<() => void>();
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private wanted = false;
  private pinger: ReturnType<typeof setInterval> | null = null;

  connect(): void {
    this.wanted = true;
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${BASE}/ws`;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      for (const fn of this.openListeners) fn();
      this.pinger = setInterval(() => this.send({ type: 'ping' }), 25_000);
    };
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        for (const fn of this.listeners) fn(message);
      } catch {
        // 무시
      }
    };
    ws.onclose = (event) => {
      if (this.pinger) clearInterval(this.pinger);
      this.ws = null;
      // 4001 = 로그아웃 — 다시 붙지 않는다.
      if (!this.wanted || event.code === 4001) return;
      const delay = Math.min(15_000, 1000 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.connect(), delay);
    };
  }

  disconnect(): void {
    this.wanted = false;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
  }

  get open(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** 연결이 (다시) 열릴 때마다 — 지구 입장 · 화면 새로 읽기에 쓴다. */
  onOpen(fn: () => void): () => void {
    this.openListeners.add(fn);
    if (this.open) fn();
    return () => this.openListeners.delete(fn);
  }
}

export const socket = new Socket();
