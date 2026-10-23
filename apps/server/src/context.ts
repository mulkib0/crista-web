import { LOOKUP_PER_MIN_PER_TEAM, PREVIEW_PER_MIN_PER_TEAM } from '@crista-web/web-contract';
import type { Config } from './config.ts';
import type { Pool } from './db.ts';
import type { AuthClient } from './gotrue.ts';
import type { Hub } from './hub.ts';
import type { JobRunner } from './jobs.ts';
import type { LlmClient } from './llm.ts';
import { LoginLockout, WindowLimiter } from './rate-limit.ts';
import type { AntibodyRunner } from './features/antibody/runner.ts';
import type { BioWorker } from './worker.ts';

export interface Limits {
  /** 가입 — IP 마다 분당 60(교실은 IP 하나), 학급 코드마다 분당 120. */
  signupPerIp: WindowLimiter;
  signupPerCode: WindowLimiter;
  /** 로그인 — IP 마다 분당 300, 아이디마다 5회 실패 → 1분 잠금. */
  loginPerIp: WindowLimiter;
  loginLockout: LoginLockout;
  /** 무료 미리보기(설계 §10) — 물성은 모둠당 분당 20, 깔때기는 모둠당 분당 60. */
  propertiesPerTeam: WindowLimiter;
  previewPerTeam: WindowLimiter;
  /** 항체 랩(항체 설계 §5.5) — 미리보기는 모둠당 분당 20, 자료 조회는 모둠당 분당 20(캐시 뒤에서만 센다). */
  antibodyPreviewPerTeam: WindowLimiter;
  antibodyLookupPerTeam: WindowLimiter;
}

export const createLimits = (): Limits => ({
  signupPerIp: new WindowLimiter(60, 60_000),
  signupPerCode: new WindowLimiter(120, 60_000),
  loginPerIp: new WindowLimiter(300, 60_000),
  loginLockout: new LoginLockout(5, 60_000),
  propertiesPerTeam: new WindowLimiter(20, 60_000),
  previewPerTeam: new WindowLimiter(60, 60_000),
  antibodyPreviewPerTeam: new WindowLimiter(PREVIEW_PER_MIN_PER_TEAM, 60_000),
  antibodyLookupPerTeam: new WindowLimiter(LOOKUP_PER_MIN_PER_TEAM, 60_000),
});

export interface Deps {
  config: Config;
  db: Pool;
  auth: AuthClient;
  hub: Hub;
  limits: Limits;
  worker: BioWorker;
  jobs: JobRunner;
  /** 파이프라인 LLM(설계 §5.13) — 키가 없거나 꺼져 있으면 `available` false(호출하면 'unavailable'). */
  llm: LlmClient;
  /** 항체 설계 랩 작업 러너(항체 설계 §5.7) — 별도 표 · 별도 폴러. */
  antibody: AntibodyRunner;
}
