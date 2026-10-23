/**
 * 남용 방지(설계 §3) — 서버 메모리의 고정 창 계수기 · 로그인 잠금. 서버가 하나라 메모리로 충분하다(재시작하면 비워진다).
 * 교실은 학생 모두가 학교 공인 IP 하나로 나오므로 IP 상한은 넉넉히, 막는 힘은 아이디별 잠금이 맡는다.
 */

export class WindowLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(limit: number, windowMs: number, now: () => number = Date.now) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  /** 한 번 센다. 넘었으면 다시 시도할 때까지 초. */
  hit(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
    const now = this.now();
    let slot = this.hits.get(key);
    if (!slot || slot.resetAt <= now) {
      slot = { count: 0, resetAt: now + this.windowMs };
      this.hits.set(key, slot);
      if (this.hits.size > 10_000) this.sweep(now);
    }
    slot.count += 1;
    if (slot.count > this.limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((slot.resetAt - now) / 1000)) };
    return { ok: true };
  }

  private sweep(now: number): void {
    for (const [key, slot] of this.hits) if (slot.resetAt <= now) this.hits.delete(key);
  }
}

/** 로그인 잠금 — 연속 실패 5회면 1분 잠금(설계 §3). 성공하면 지운다. */
export class LoginLockout {
  private readonly state = new Map<string, { failures: number; lockedUntil: number }>();
  private readonly maxFailures: number;
  private readonly lockMs: number;
  private readonly now: () => number;

  constructor(maxFailures = 5, lockMs = 60_000, now: () => number = Date.now) {
    this.maxFailures = maxFailures;
    this.lockMs = lockMs;
    this.now = now;
  }

  /** 잠겨 있으면 남은 초, 아니면 0. 잠금이 풀린 뒤에는 실패 수를 새로 센다. */
  lockedFor(key: string): number {
    const entry = this.state.get(key);
    if (!entry || entry.lockedUntil === 0) return 0;
    const left = entry.lockedUntil - this.now();
    if (left > 0) return Math.ceil(left / 1000);
    this.state.delete(key);
    return 0;
  }

  /** 실패를 센다. 이번 실패로 잠겼으면 잠긴 초. */
  fail(key: string): number {
    const entry = this.state.get(key) ?? { failures: 0, lockedUntil: 0 };
    entry.failures += 1;
    if (entry.failures >= this.maxFailures) entry.lockedUntil = this.now() + this.lockMs;
    this.state.set(key, entry);
    if (this.state.size > 10_000) this.sweep();
    return entry.lockedUntil ? Math.ceil(this.lockMs / 1000) : 0;
  }

  succeed(key: string): void {
    this.state.delete(key);
  }

  private sweep(): void {
    const now = this.now();
    for (const [key, entry] of this.state) if (entry.lockedUntil !== 0 && entry.lockedUntil <= now) this.state.delete(key);
  }
}
