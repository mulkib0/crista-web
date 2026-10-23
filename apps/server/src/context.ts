import type { Config } from './config.ts';
import type { Pool } from './db.ts';
import type { AuthClient } from './gotrue.ts';
import type { Hub } from './hub.ts';
import { LoginLockout, WindowLimiter } from './rate-limit.ts';

export interface Limits {
  /** 가입 — IP 마다 분당 60(교실은 IP 하나), 학급 코드마다 분당 120. */
  signupPerIp: WindowLimiter;
  signupPerCode: WindowLimiter;
  /** 로그인 — IP 마다 분당 300, 아이디마다 5회 실패 → 1분 잠금. */
  loginPerIp: WindowLimiter;
  loginLockout: LoginLockout;
}

export const createLimits = (): Limits => ({
  signupPerIp: new WindowLimiter(60, 60_000),
  signupPerCode: new WindowLimiter(120, 60_000),
  loginPerIp: new WindowLimiter(300, 60_000),
  loginLockout: new LoginLockout(5, 60_000),
});

export interface Deps {
  config: Config;
  db: Pool;
  auth: AuthClient;
  hub: Hub;
  limits: Limits;
}
