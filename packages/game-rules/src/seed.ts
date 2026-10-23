/**
 * M1 로컬 검증용 고정 시드 — 학급 1개 · 팀 2개 · 테스트 계정 2개.
 * ARCHITECTURE §7.3: "명확히 표시된 로컬 테스트 계정 A·B". 운영 인증 경로로 쓰지 않는다.
 */
import type { CLevel, FacilityKind, PublicTeam, PublicUser } from '@crista/shared-types';

export const DEV_CLASS = {
  id: 'class-dev',
  name: '로컬 검증 학급 (M1)',
  joinCode: 'DEV-M1',
} as const;

export const TEST_BANNER =
  '테스트용 고정 데이터 — 실제 과학 계산이 아닙니다 (M1 로컬 검증)';

/**
 * 개발 환경 표시 — 로컬 테스트 계정(`/dev/login`) 세션의 `WelcomeMessage.testBanner`.
 * 운영 인증(password) 세션은 `null` 이다. 결과 하나하나의 테스트 표시는 `ExperimentResult.testLabel` 이 맡는다.
 */
export const DEV_ENV_BANNER =
  '개발 환경 — 로컬 테스트 계정으로 접속 중입니다 (운영 인증이 아닙니다)';

export const DEV_FACILITIES: Record<FacilityKind, 0 | 1 | 2 | 3> = {
  target: 1,
  htvs: 1,
  docking: 1,
  admet: 1,
  security: 0,
};

export interface DevTeamSeed extends PublicTeam {
  inkIndex: 1 | 2 | 3 | 4;
  facilities: Record<FacilityKind, 0 | 1 | 2 | 3>;
}

export const DEV_TEAMS: readonly DevTeamSeed[] = [
  {
    id: 'team-1',
    companyName: '헬릭사 테라퓨틱스',
    tickerSymbol: 'HLX',
    slogan: '구조에서 답을 찾는다',
    inkKey: 'T1',
    inkIndex: 1,
    district: 'hospital',
    lot: 1,
    hqTier: 1,
    facilities: { ...DEV_FACILITIES },
  },
  {
    id: 'team-2',
    companyName: '뉴로브릿지 바이오',
    tickerSymbol: 'NBX',
    slogan: '장벽을 넘는 설계',
    inkKey: 'T2',
    inkIndex: 2,
    district: 'compute',
    lot: 1,
    hqTier: 1,
    facilities: { ...DEV_FACILITIES, docking: 2 },
  },
];

export interface DevAccount {
  username: string;
  password: string;
  user: PublicUser;
}

const account = (
  username: string,
  displayName: string,
  teamId: string,
  cLevel: CLevel,
): DevAccount => ({
  username,
  password: 'crista-dev',
  user: { id: `user-${username}`, displayName, role: 'student', teamId, cLevel },
});

/** 로컬 테스트 계정 A·B. 비밀번호는 전부 `crista-dev` 이고 외부에 배포하지 않는다. */
export const DEV_ACCOUNTS: readonly DevAccount[] = [
  account('test-a', '테스트 A · 헬릭사 CEO', 'team-1', 'CEO'),
  account('test-b', '테스트 B · 뉴로브릿지 CSO', 'team-2', 'CSO'),
  account('test-a2', '테스트 A2 · 헬릭사 CTO', 'team-1', 'CTO'),
  account('test-b2', '테스트 B2 · 뉴로브릿지 CMO', 'team-2', 'CMO'),
  // M3: 교사 개발 계정 — 팀 · 직책이 없고 `class-dev` 의 교사 구성원이다(구성원 연결은 게임 서버 시드가 한다).
  // 앞의 네 학생 계정의 순서 · 값은 M1 검증이 쓰므로 바꾸지 않고 끝에 더한다.
  {
    username: 'test-gm',
    password: 'crista-dev',
    user: { id: 'user-test-gm', displayName: '테스트 교사 · GM', role: 'teacher', teamId: null, cLevel: null },
  },
];

export const publicTeam = (t: DevTeamSeed): PublicTeam => ({
  id: t.id,
  companyName: t.companyName,
  tickerSymbol: t.tickerSymbol,
  slogan: t.slogan,
  inkKey: t.inkKey,
  district: t.district,
  hqTier: t.hqTier,
  lot: t.lot ?? 1,
});
