/**
 * 외부 호출 직렬화 — 도메인별 동시요청 상한(설계 §3.4).
 *
 * 학술 공용 서버에 수업 중 20~30명이 한꺼번에 몰리면 안 되므로, 도메인마다 동시에 몇 건까지 나갈지 정해 두고
 * 넘치는 건 **들어온 순서대로** 기다려요(FIFO). 작업 큐(묶음 4 러너)와 달리 이 상한은 **프로세스 안의 문지기**예요.
 */

/** 도메인별 동시요청 상한(§3.4 — ESMFold 1 · ColabFold 1~2 · SAbDab2 2 · RCSB · ChEMBL 4). */
export const ANTIBODY_DOMAIN_LIMITS = {
  esmfold: 1,
  colabfold: 2,
  sabdab: 2,
  rcsb: 4,
  chembl: 4,
  nim: 2,
  boltz: 2,
} as const;

export type AntibodyDomain = keyof typeof ANTIBODY_DOMAIN_LIMITS;
export const ANTIBODY_DOMAINS = Object.keys(ANTIBODY_DOMAIN_LIMITS) as readonly AntibodyDomain[];

export type DomainLimits = Readonly<Record<AntibodyDomain, number>>;

export interface Limiter {
  /** 상한 안에서 `fn` 을 돌려요. 넘치면 앞 사람이 끝날 때까지 줄을 서요. */
  withLimit<T>(domain: AntibodyDomain, fn: () => Promise<T>): Promise<T>;
  /** 지금 돌고 있는 건수. */
  running(domain: AntibodyDomain): number;
  /** 줄 서 있는 건수. */
  waiting(domain: AntibodyDomain): number;
  /** 이 과정에서 한 번이라도 동시에 돌았던 최대 건수 — 상한을 지켰는지 테스트로 확인해요. */
  peak(domain: AntibodyDomain): number;
  limitOf(domain: AntibodyDomain): number;
}

interface Lane {
  limit: number;
  running: number;
  peak: number;
  queue: Array<() => void>;
}

export function createLimiter(limits: DomainLimits = ANTIBODY_DOMAIN_LIMITS): Limiter {
  const lanes = new Map<AntibodyDomain, Lane>();
  for (const domain of ANTIBODY_DOMAINS) {
    lanes.set(domain, { limit: Math.max(1, Math.trunc(limits[domain])), running: 0, peak: 0, queue: [] });
  }
  const laneOf = (domain: AntibodyDomain): Lane => {
    const lane = lanes.get(domain);
    if (!lane) throw new Error(`모르는 도메인이에요 — ${domain}`);
    return lane;
  };

  return {
    limitOf: (domain) => laneOf(domain).limit,
    running: (domain) => laneOf(domain).running,
    waiting: (domain) => laneOf(domain).queue.length,
    peak: (domain) => laneOf(domain).peak,
    async withLimit(domain, fn) {
      const lane = laneOf(domain);
      if (lane.running >= lane.limit) {
        await new Promise<void>((go) => lane.queue.push(go));
      }
      lane.running += 1;
      if (lane.running > lane.peak) lane.peak = lane.running;
      try {
        return await fn();
      } finally {
        lane.running -= 1;
        const next = lane.queue.shift();
        if (next) next();
      }
    },
  };
}
