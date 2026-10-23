/**
 * Crista 도메인 공통 타입 — 학급·팀·직책·설비·단계.
 * 단일 소스: PRD.md §2, ARCHITECTURE.md §2, docs/2026-10-19-art-direction-lab-notebook.md §2.1.
 */

/** 팀(가상 제약회사) 식별자. M1 은 'team-1' · 'team-2' 두 팀만 쓴다. */
export type TeamId = string;
/** 학급(월드) 식별자. M1 은 'class-dev' 하나만 쓴다. */
export type ClassId = string;
export type UserId = string;

/** C-Level 공동 창업자 직책 (PRD §2.1). */
export type CLevel = 'CEO' | 'CSO' | 'CTO' | 'CMO';

export type UserRole = 'student' | 'teacher';

/** 팀 잉크 4색 — 소유 표식 전용, 상태 색과 겹치지 않는다(06 아트디렉션 §2.2). */
export const TEAM_INK = {
  T1: '#183080',
  T2: '#007868',
  T3: '#A048C8',
  T4: '#D88828',
} as const;
export type TeamInkKey = keyof typeof TEAM_INK;

/** 06 픽셀 타이쿤 색 토큰 — 잔디·나무 바닥·각진 창(아트디렉션 §2.1). */
export const PAPER = {
  base: '#78C850',
  /** 도시와 사옥 바깥은 같은 잔디 바탕을 쓴다. */
  map: '#78C850',
  floor: '#F8E8C8',
  hall: '#E8D0B0',
  raised: '#F8F8F0',
  white: '#FFFFFF',
  sunk: '#E8E8E0',
  edge: '#D8A868',
} as const;
export const INK = {
  pencil: '#282828',
  faint: '#606060',
  pen: '#2860D0',
  red: '#D82800',
  stamp: '#B82010',
  equip: '#68A8F8',
  equipEdge: '#3878C8',
  noteYellow: '#F8E858',
  markerHigh: '#F85858',
} as const;

/** 사옥 내부 5대 연구 설비 (PRD §2.2). */
export type FacilityKind = 'target' | 'htvs' | 'docking' | 'admet' | 'security';

/** 설비가 해금하는 워크벤치 단계. security 는 단계를 열지 않는다. */
export const FACILITY_STAGE: Record<FacilityKind, Stage | null> = {
  target: 1,
  htvs: 2,
  docking: 3,
  admet: 4,
  security: null,
};

export const FACILITY_LABEL: Record<FacilityKind, string> = {
  target: '표적 탐색실',
  htvs: '화합물 HTVS·합성실',
  docking: 'AI 도킹 서버실',
  admet: '전임상 ADMET실',
  security: '보안 게이트 & 특허 금고',
};

/** AI 신약개발 파이프라인 단계 1~5. */
export type Stage = 1 | 2 | 3 | 4 | 5;

/** 설비 건설 단계 — 에셋 프레임 `facility/<kind>-t<tier>` 와 1:1 (에셋 파이프라인 §4). */
export type FacilityTier = 0 | 1 | 2 | 3;

/** 4대 특화 지구 (PRD §2.1). */
export type DistrictType = 'hospital' | 'compute' | 'vc' | 'industry';

export const DISTRICT_LABEL: Record<DistrictType, string> = {
  hospital: '대학병원 인접 지구',
  compute: 'AI 슈퍼컴퓨팅 밸리 지구',
  vc: 'VC 금융 스트리트 지구',
  industry: '바이오 산업단지 외곽 지구',
};

/** 외부 5대 공공기관 (PRD §2 · 핸드오프 Branch 5). */
export type InstitutionKind = 'city-hall' | 'hospital' | 'vc-valley' | 'fda' | 'exchange';

export const INSTITUTION_LABEL: Record<InstitutionKind, string> = {
  'city-hall': '시청 & 특허청',
  hospital: '대학병원 임상센터',
  'vc-valley': 'VC 샌드힐 밸리',
  fda: 'FDA 규제심사청',
  exchange: '바이오 증권거래소 객장',
};

/** 공개 사용자 프로필 — 다른 팀에게도 보여도 되는 값만 담는다. */
export interface PublicUser {
  id: UserId;
  displayName: string;
  role: UserRole;
  teamId: TeamId | null;
  cLevel: CLevel | null;
}

/** 공개 팀 정보 — 미출원 연구 데이터는 절대 포함하지 않는다(ARCHITECTURE §7.1). */
export interface PublicTeam {
  id: TeamId;
  companyName: string;
  tickerSymbol: string;
  slogan: string;
  inkKey: TeamInkKey;
  district: DistrictType;
  /** 사옥 외관 등급 — 프레임 `building/hq-t<n>`. */
  hqTier: 1 | 2 | 3;
  /** 회사 상태(v3). 생략 = 운영 중. 파산은 공개 정보다(도시 맵에 `stamp/bankrupt`). */
  status?: CompanyStatus;
  /**
   * 지구 안 부지 번호 1~4(v4). 큰 도시는 지구마다 부지 4곳이 있어 **같은 지구에 여러 회사**가 설 수 있다.
   * 생략 = 1. 재창업한 회사는 파산한 이전 회사와 같은 부지를 쓴다. DB 는 `biotech_teams.lot_number`.
   */
  lot?: number;
  /** (v10) 사옥 소품(공개 — 방문객이 본다). 사옥 맵이 고정 슬롯에 그린다. 생략 = 없음. 값은 `gamification.ts` 의 `PropId`. */
  props?: string[];
}

/** 렌더 프로필 3단 (아트디렉션 §6 · §9). */
export type RenderProfile = 'standard' | 'projector' | 'low';

/** 결과 화면 표시 방식 (PRD §6 · Branch 18). */
export type ResultMode = 'auto' | 'notify';

export interface UserPreferences {
  resultMode: ResultMode;
  renderProfile: RenderProfile;
  reducedMotion: boolean;
  muted: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  resultMode: 'auto',
  renderProfile: 'standard',
  reducedMotion: false,
  muted: false,
};

// ──────────────────────── M3 — 시간·경제·GM ────────────────────────
// 단일 소스: docs/2026-10-19-game-balance-v0.md §2·§4·§5, ARCHITECTURE.md §4·§6.
// `@crista/game-rules` 는 이 타입들을 여기서 가져다 쓴다(같은 이름을 다시 정의하지 않는다).

/** 과정 종류 — 여러 차시 과정 / 장기 프로젝트(균형안 §2). 둘 다 상시 진행이다. */
export type CourseKind = 'multiSession' | 'longTerm';

/** 속도 모드 — 가변(수업 중 가속·수업 밖 완속) / 고정(교사가 정한 한 배율). */
export type ClockMode = 'variable' | 'fixed';

/** 경과 구간의 성격. 고정 모드에서도 수업 세션은 기록한다(자동 이벤트 상한이 세션 단위다). */
export type SessionPhase = 'inClass' | 'outOfClass';

/** 자금 상태 — 균형안 §4 의 4단계 + 카드를 띄우지 않는 평시(`normal`). */
export type CashAlertLevel = 'normal' | 'notice' | 'crisis' | 'restructure' | 'grace';

/**
 * 회사 상태. 파산한 회사는 새 사업 활동을 멈추고, 같은 학생 팀이 새 회사로 재창업한다(균형안 §4).
 * v4 `voided`: 학급 복원으로 **없던 일이 된** 회사(복원 시점 뒤에 재창업한 회사). 행과 작업·결과는 원본 보존을 위해 남지만
 * 월드·목록·증시·교사 화면에 나타나지 않고, 그 티커는 학급에서 다시 쓰지 않는다. 클라이언트로 보내지 않는다.
 */
export type CompanyStatus = 'active' | 'bankrupt' | 'voided';

/** 설비 가동 상태 — 가동 중지 설비는 유지비 20%만 내고 기능을 주지 않는다(균형안 §3.2). */
export type FacilityRunState = 'active' | 'idle';

/** 투자 마일스톤 — 동일 회사·동일 마일스톤 지급은 한 번(균형안 §3.1). */
export type InvestmentMilestone = 'seriesA' | 'seriesB';

/** 지구 하나의 사옥 부지 수(v4) — 팀은 최대 4개(잉크 4색)이므로 한 지구에 모두 모여도 들어간다. */
export const LOTS_PER_DISTRICT = 4;

/** 구조조정·회생 유예 중 막히는 행동(균형안 §4). */
export type RestructureBlockedAction = 'paidWork' | 'facilityPurchase' | 'hiring';

/**
 * 교사 GM 아바타 3종 — 역할은 소품으로만 갈린다(아트디렉션 §8.1).
 * 프레임 `char/gm-<avatar>` (+ `-walk-<방향>/0…3` · `-work-<방향>/0…1`).
 */
export type GmAvatar = 'director' | 'reviewer' | 'patron';

export const GM_AVATAR_LABEL: Record<GmAvatar, string> = {
  director: '진행 감독',
  reviewer: '심사·정정',
  patron: '지원·유예',
};
