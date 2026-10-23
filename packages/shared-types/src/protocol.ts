/**
 * 통신 규격 — ① 클라이언트 ↔ 게임 서버(Colyseus 메시지 + HTTP) ② 게임 서버 ↔ 바이오 워커(HTTP JSON).
 * 근거: ARCHITECTURE.md §7.3. 클라이언트가 보낸 팀 ID 는 믿지 않고 세션에서 서버가 판정한다.
 *
 * v2 (M2, 2026-10-21): 실제 도킹 한 경로(`source: 'vina'`) · 영구 저장·인증(Supabase) ·
 * 설비 건설·업그레이드와 연구비 원장. 바뀐 점은 docs/2026-10-21-m2-implementation-brief.md §4 에 모았다.
 *
 * v3 (M3, 2026-10-21): 학급 시계 · 유지비 정산 · 자금 경고·구조조정·회생·파산·재창업 · 자동·교사 이벤트 ·
 * 교사 GM(학급 생성·학생 계정 발급·운영 권한) · 한 서버의 여러 학급. 화면 규격은 `economy.ts`, 교사 HTTP 규격은 `gm.ts`.
 * 바뀐 점은 docs/2026-10-21-m3-implementation-brief.md §4 에 모았다.
 *
 * v4 (M4, 2026-10-21): 큰 도시(160×120 타일 · 지구마다 부지 4곳 · 객장 구역) · 압축 맵 전송(`WireTileMap`) ·
 * 바이오 증권거래소(시세 · 주문 · 개인 계좌 · 공매도 · 숏스퀴즈 · 유상증자 · 거래 정지 · 상장 폐지, `market.ts`) ·
 * LLM 애널리스트 · NPC 대화(`llm.ts`) · 연구원 채용 · 해고 · 교사 판정 정정 · 저장본 · 학급 복원(`gm.ts`).
 * 바뀐 점은 docs/2026-10-21-m4-implementation-brief.md §4 에 모았다.
 *
 * v5 (M5, 2026-10-21): 신약 파이프라인 — 약 정하기(코드명 · 제형 · 브랜드) · 물질특허 · IND · 임상 1·2·3상 · 최종 허가(`pipeline.ts`) ·
 * 창구(특허청 · FDA · 대학병원) 상호작용 · 워커 물성 계산(`POST /molecule/properties`) · 임상 · 심사 비용 이벤트 구현 · 자동 재입장.
 * 바뀐 점은 docs/2026-10-21-m5-implementation-brief.md §4 에 모았다.
 *
 * v6 (M6, 2026-10-22): Stage 4 전임상 ADMET 의 실제 예측(`source: 'admet-ai'`, ADMET-AI v2) —
 * `ResultSource` 에 값이 하나 늘고 `ResultProvenance` 의 표적 칸(`targetId` · `pdbId`)이 선택이 됐다(표적과 무관한 계산이라).
 * Stage 4 요청은 `ADMET_PARAM` 으로 평가할 분자를 받고 진행 단계 `predict` 를 쓴다. 검증 기록은 docs/2026-10-22-stage4-admet-verification.md.
 *
 * v7 (NPC, 2026-10-22): 움직이는 NPC(`npc.ts`) — `WorldState.npcs` · `TileMapData.npcSpots` · `NpcPlacement.mobile` ·
 * `C2S.NPC_TALK_END` · `S2C.NPC_ESCORT` · 오류 `npc_busy` · 대화 안내 의도(`LlmNpcRequest.intentCandidates`).
 * 구버전 클라이언트는 NPC 를 옛 자리에 그린 채 말을 걸 수 없게 되므로 버전을 올려 `protocol_mismatch` 로 막는다.
 * 바뀐 점은 docs/2026-10-22-npc-implementation-brief.md §3 에 모았다.
 *
 * v8 (동기부여 Step 1, 2026-10-22): 사옥 외관 진화(`S2C.HQ_TIER` · `TeamStateMessage.hq`) · 실패 데이터 바운티
 * (`C2S.BOUNTY_CHECK` · `C2S.BOUNTY_SUBMIT` · `S2C.BOUNTY_STATUS` · `S2C.BOUNTY_RESULT` · 원장 `data_bounty_refund` · `bounty_clawback` ·
 * 오류 `bounty_cooldown`, `gamification.ts`). 구버전 클라이언트는 바운티 탭이 없고 도시 외관이 낡은 채로 남아 버전을 올린다.
 * 바뀐 점은 docs/2026-10-22-gamification-step1-brief.md 에 모았다.
 *
 * v9 (동기부여 Step 2, 2026-10-23): 사옥 전략 회의실 CRO 의뢰 보드(`C2S.CRO_BOARD` · `CRO_ACCEPT` · `CRO_SUBMIT` · `CRO_SETTLE` ·
 * `S2C.CRO_BOARD` · `CRO_RESULT` · 원장 `cro_reward` · 오류 `cro_limit` · `cro_cooldown`, `gamification.ts`) ·
 * C-Level 균등 성과급 · 팬텀스톡(`TradeKind` `bonus` · `phantom_settle`) · 시간가중 투자 수익률(`AccountView.investReturnPct` · `executive`, `market.ts`).
 * 바뀐 점은 docs/2026-10-23-gamification-step2-brief.md 에 모았다.
 *
 * v10 (동기부여 Step 3, 2026-10-23): 사옥 복지 · 쇼케이스 소품(`C2S.PROP_BUY` · `PROP_SELL` · `S2C.HQ_PROPS` · `TeamStateMessage.props` ·
 * `PublicTeam.props`) · 연례 바이오 학회(`C2S.SYMPOSIUM_OPEN` · `SYMPOSIUM_SUBMIT` · `S2C.SYMPOSIUM_STATE`) · 물질특허 License-Out
 * (`C2S.LICENSE_STATE` · `LICENSE_OFFER` · `LICENSE_ACQUIRE` · `S2C.LICENSE_STATE`) · 설비 임대(`ExperimentRequestMessage.rent`) ·
 * 사옥 내부 Tier 연출 · 소품 슬롯(`S2C.HQ_INTERIOR` — 사옥 룸에 새 맵) ·
 * 원장 `prop_purchase` · `prop_sale` · `symposium_prize` · `license_fee` · `license_income` · `royalty_escrow` · `license_royalty` ·
 * `royalty_release` · `rental_fee` · `rental_income` · 오류 `circular_trade`. 바뀐 점은 docs/2026-10-23-gamification-step3-brief.md 에 모았다.
 *
 * v11 (실데이터 멀티 표적, 2026-10-23): ① 선언이 질환 · 표적을 받는다(`ProgramDeclareMessage.diseaseId` · `targetId` ·
 * `DISEASE_TO_TARGET` · `ProgramView.diseaseId`) · 도킹 근거를 **표적 × 분자**로 센다(`targetEvidenceKey` ·
 * `PatentCandidateView` 가 표적마다 한 줄 · `PatentFileMessage.targetId`) · 표적별 결합력 정규화
 * (`DockingTarget.referenceKcal` · `referenceRmsd` — 네 표적 결정 리간드 재도킹 실측) · 뇌 병변 환자군이면 비 CNS 표적도
 * 뇌 노출을 판정에 넣는다(`TRIAL_OPTIONS[].brainPopulations`) · 공개 DB 조회 출처(`ResultSource` 에 `'dataset'`) ·
 * Stage 2 스크리닝 구조화 결과(`ExperimentResult.candidates` · `funnel`)와 학생 물성 필터.
 * 구버전 클라이언트는 선언에 표적을 싣지 못하고 Stage 2 후보 · 깔때기를 읽지 못해 버전을 올려 막는다.
 * 바뀐 점은 docs/2026-10-23-real-db-multi-target-upgrade-design.md 에 모았다.
 */
import type {
  CLevel,
  ClassId,
  FacilityKind,
  InstitutionKind,
  FacilityRunState,
  FacilityTier,
  PublicTeam,
  PublicUser,
  ResultMode,
  Stage,
  TeamId,
  UserId,
} from './domain.ts';
import type { ClockView, TeamEconomyView } from './economy.ts';
import type { ClassSummary } from './gm.ts';
import type { LlmStatus } from './llm.ts';
import type { NpcId, Direction, SpaceId, WireTileMap } from './world.ts';
import type { MoleculeProperties } from './pipeline.ts';
import type { HqProgressView, PropView } from './gamification.ts';

export const PROTOCOL_VERSION = 11;

/** 기본 포트 — 설정으로 덮어쓸 수 있다(ARCHITECTURE §7.3: 서버 주소 설정 가능). */
export const DEFAULT_GAME_SERVER_PORT = 2567;
export const DEFAULT_BIO_WORKER_PORT = 8787;
export const DEFAULT_GAME_SERVER_URL = `ws://127.0.0.1:${DEFAULT_GAME_SERVER_PORT}`;
export const DEFAULT_GAME_HTTP_URL = `http://127.0.0.1:${DEFAULT_GAME_SERVER_PORT}`;
export const DEFAULT_BIO_WORKER_URL = `http://127.0.0.1:${DEFAULT_BIO_WORKER_PORT}`;

/**
 * Colyseus 룸 이름. v3 부터 한 서버가 여러 학급을 맡는다 — 도시는 **학급마다 1개**(`filterBy(['classId'])`),
 * 사옥은 팀별 1개(`filterBy(['hqTeamId'])`, 팀 id 는 서버 전체에서 유일하다).
 */
export const ROOM_CITY = 'city';
export const ROOM_HQ = 'hq';

// ──────────────────────────────── 인증 ────────────────────────────────

/**
 * 인증 방식.
 * - `password`: 운영 인증. 게임 서버가 Supabase Auth 에 아이디·비밀번호를 대신 확인하고
 *   Supabase 접근 토큰을 `sessionToken` 으로 돌려준다(서버 재시작과 무관하게 유효).
 * - `dev`: 로컬 테스트 계정(`/dev/login`). **개발 환경 전용** — 운영 설정(`CRISTA_ENV=production`)에서는 꺼진다.
 */
export type AuthMode = 'password' | 'dev';

/** GET /auth/config — 로그인 화면이 어떤 입력을 보여 줄지 정한다. */
export interface AuthConfigResponse {
  ok: true;
  /** 이 서버가 받는 방식. 앞쪽이 기본. */
  modes: AuthMode[];
  /** `dev` 가 켜져 있을 때만 — 로그인 화면의 빠른 선택 목록(비밀번호는 싣지 않는다). */
  devAccounts?: Array<{ username: string; displayName: string }>;
}

/** POST /auth/login (password) · POST /dev/login (dev) 공통 본문. */
export interface LoginRequest {
  username: string;
  password: string;
}
/** @deprecated M1 이름. `LoginRequest` 와 같다. */
export type DevLoginRequest = LoginRequest;

/** POST /auth/refresh — password 세션의 접근 토큰을 갱신한다. */
export interface RefreshRequest {
  refreshToken: string;
}

export interface SessionInfo {
  /** 룸 입장에 쓰는 토큰. password 모드에서는 Supabase 접근 토큰(JWT), dev 모드에서는 서버 메모리 토큰. */
  sessionToken: string;
  user: PublicUser;
  /**
   * 학생의 학급. **교사는 null** 이다 — 교사는 여러 학급을 맡을 수 있어 `teacherClasses` 에서 골라
   * `JoinOptions.classId` 로 들어간다(v3).
   */
  classId: ClassId | null;
  className: string | null;
  team: PublicTeam | null;
  /** 교사 계정이면 맡은 학급 목록(최근 것이 앞). 학생은 생략. */
  teacherClasses?: ClassSummary[];
  authMode: AuthMode;
  /** 로컬 테스트 계정인가. 화면에 개발 환경임을 표시하는 근거다. */
  devAccount: boolean;
  /** password 모드의 갱신 토큰. **메모리에만** 둔다(저장소에 쓰지 않는다). */
  refreshToken?: string;
  /** `sessionToken` 만료 시각(ms epoch). 없으면 서버가 정한 만료가 없다(dev). */
  expiresAt?: number;
  protocolVersion: number;
}

/** POST /auth/login · /auth/refresh · /dev/login 성공 응답. */
export interface LoginResponse {
  ok: true;
  session: SessionInfo;
}
/** @deprecated M1 이름. `LoginResponse` 와 같다. */
export type DevLoginResponse = LoginResponse;

export interface ApiError {
  ok: false;
  code: ErrorCode;
  message: string;
  /** `rate_limited` 일 때 다시 시도해도 되는 때까지 남은 시간(ms) — 로그인 무차별 대입 방어(v3). */
  retryAfterMs?: number;
}

// ──────────────────────────────── 룸 입장 ────────────────────────────────

export interface JoinOptions {
  sessionToken: string;
  protocolVersion: number;
  /**
   * 들어갈 학급(v3). 도시 룸 매치메이킹 키다. 학생은 `SessionInfo.classId` 를 그대로 싣고(서버가 세션과 같은지 확인 —
   * 다르면 `forbidden_class`), 교사는 `teacherClasses` 에서 고른 학급을 싣는다(서버가 교사 구성원인지 확인).
   * 사옥 룸에서도 싣는다 — 서버는 방문 대상 팀이 이 학급의 팀인지 확인한다.
   */
  classId?: ClassId;
  /**
   * 사옥 룸에 들어갈 때 **방문 대상** 팀. 도시 룸에서는 생략.
   * 이것은 "어느 사옥으로 갈지"를 고르는 값일 뿐 권한의 근거가 아니다 —
   * 내 소속 팀은 서버가 세션 토큰에서만 읽고, 방문자 여부도 서버가 판정한다.
   */
  hqTeamId?: TeamId;
  /**
   * 도착 지점. v4 부터 서버는 **허락된 도착 지점만** 받는다(순간이동으로 객장에 가는 길을 막는다 — PRD §3.1 '직접 걸어가야').
   * 도시: `outside-hq-<그 학급 팀 id>`(사옥에서 나올 때)만 받고, 생략하거나 다른 값이면 학생은 **자기 사옥 앞**, 교사 · 팀 없는 사람은 맵 기본(`spawns[0]`).
   * 사옥: `entrance` 만. 어느 도착 지점도 객장 구역 안에 있지 않다(validate-maps 가 검사한다).
   */
  spawnId?: string;
}

// ──────────────────────── 클라이언트 → 서버 메시지 ────────────────────────

export const C2S = {
  MOVE: 'move',
  INTERACT: 'interact',
  EXPERIMENT_REQUEST: 'experiment:request',
  /** 결과 창을 열었음을 알린다(미확인 결과 큐에서 제거). */
  EXPERIMENT_SEEN: 'experiment:seen',
  /** 내 팀의 작업 목록 재전송 요청(결과 창 재진입·재접속 복구). */
  JOB_SYNC: 'job:sync',
  /** 설비 건설·업그레이드·가동 중지·재가동·매각(v3). 내 팀 사옥 안에서만. */
  FACILITY_BUILD: 'facility:build',
  PREF_SET: 'pref:set',
  PING: 'ping',
  // ── v3 (M3)
  /** 교사에게 지원 요청(연구비·유예·기타). 회생 수단이라 자금 상태와 무관하게 열려 있다. 학생만. */
  SUPPORT_REQUEST: 'support:request',
  /** 파산한 회사의 재창업. 그 회사 구성원만. */
  COMPANY_REFOUND: 'company:refound',
  /** 교사 아바타 바꾸기(`GmAvatarMessage`). 교사만. */
  GM_AVATAR: 'gm:avatar',
  // ── v4 (M4)
  /** 시장가 주문(`MarketOrderMessage`). 객장 구역 안의 학생만. */
  MARKET_ORDER: 'market:order',
  /** 시세 · 계좌 다시 받기(객장 안에서만 — 밖이면 무시). */
  MARKET_REFRESH: 'market:refresh',
  /** 내 회사 유상증자 신청(`OfferingCreateMessage`). 객장 안, 회사 구성원만. */
  OFFERING_CREATE: 'offering:create',
  /** 유상증자 청약(`OfferingSubscribeMessage`). 객장 안, 다른 회사 학생만. */
  OFFERING_SUBSCRIBE: 'offering:subscribe',
  /** NPC 에게 말 걸기(`NpcTalkMessage`, `llm.ts`). */
  NPC_TALK: 'npc:talk',
  /** 전문 연구원 채용 · 해고(`StaffChangeMessage`). 내 사옥 안, 회사 구성원만. */
  STAFF_CHANGE: 'staff:change',
  // ── v7 (NPC)
  /** NPC 창을 닫았다(`NpcTalkEndMessage`, `npc.ts`) — 대화 세션 종료 · `cancelEscort` 면 안내도 끝. */
  NPC_TALK_END: 'npc:talk-end',
  // ── v5 (M5) — 신약 파이프라인(`pipeline.ts`). 모두 `interactableId` 사거리 안에서만(서버 권위 위치).
  /** 내 파이프라인 상태 다시 받기(`PipelineSyncMessage`). */
  PIPELINE_SYNC: 'pipeline:sync',
  /** 창구 공개 원장 받기(`PipelineDeskRequest`). */
  PIPELINE_DESK: 'pipeline:desk',
  /** ① 코드명 · 기전 선언(`ProgramDeclareMessage`) — 내 사옥 표적 탐색실. */
  PROGRAM_DECLARE: 'pipeline:declare',
  /** 물질특허 출원(`PatentFileMessage`) — 시청 · 특허청 창구. */
  PATENT_FILE: 'pipeline:patent',
  /** ② 후보 · 제형 결정(`ProgramFormulateMessage`) — 내 사옥 ADMET실. */
  PROGRAM_FORMULATE: 'pipeline:formulate',
  /** IND 신청(`IndFileMessage`) — FDA 창구. */
  IND_FILE: 'pipeline:ind',
  /** 용량 변경(`ProtocolAmendMessage`) — FDA 창구. */
  PROTOCOL_AMEND: 'pipeline:amend',
  /** 다음 임상 단계 시작(`TrialStartMessage`) — 대학병원 창구. */
  TRIAL_START: 'pipeline:trial',
  /** ③ 최종 허가 신청 · 브랜드(`FinalFileMessage`) — FDA 창구. */
  FINAL_FILE: 'pipeline:final',
  /** 단계 결과 확인(`PipelineSeenMessage`). */
  PIPELINE_SEEN: 'pipeline:seen',
  // ── v8 (동기부여 Step 1) — `gamification.ts`. 회사 구성원만, 장소 제한 없음(결과지 창 안).
  /** 실패 기전 분석 탭을 열었다(`BountyCheckMessage`) → `S2C.BOUNTY_STATUS`. */
  BOUNTY_CHECK: 'bounty:check',
  /** 실패 원인 분석 리포트 제출(`BountySubmitMessage`) → `S2C.BOUNTY_RESULT`. */
  BOUNTY_SUBMIT: 'bounty:submit',
  // ── v9 (동기부여 Step 2) — `gamification.ts`. 회사 구성원만. 수주는 내 사옥 전략 회의실 앞에서, 제출 · 정산은 계약 창에서.
  /** CRO 의뢰 보드를 연다 · 새로 받는다(`CroBoardRequestMessage`) → `S2C.CRO_BOARD`. */
  CRO_BOARD: 'cro:board',
  /** 의뢰 수주(`CroAcceptMessage`) — 문항 시드 고정 · 연도 건수 예약 → `S2C.CRO_BOARD`. */
  CRO_ACCEPT: 'cro:accept',
  /** 답안 제출(`CroSubmitMessage`) → `S2C.CRO_RESULT`. */
  CRO_SUBMIT: 'cro:submit',
  /** 1차 제출 뒤 다시 풀지 않고 지금 정산(`CroSettleMessage`) → `S2C.CRO_RESULT`. */
  CRO_SETTLE: 'cro:settle',
  // ── v10 (동기부여 Step 3) — `gamification.ts`. 회사 구성원만.
  /** 소품 사기 · 팔기(`PropActionMessage`) — 연구비 장부의 사옥 칸. 결과는 `TEAM_STATE` · `NOTICE`. */
  PROP_BUY: 'prop:buy',
  PROP_SELL: 'prop:sell',
  /** 연례 바이오 학회 열기(`SymposiumOpenMessage`) — 대학병원 창구 → `S2C.SYMPOSIUM_STATE`. */
  SYMPOSIUM_OPEN: 'symposium:open',
  /** 학회 발표 제출(`SymposiumSubmitMessage`) — 계보마다 연 1회. */
  SYMPOSIUM_SUBMIT: 'symposium:submit',
  /** 실시 허락 장부 열기(`LicenseStateRequestMessage`) — 시청 · 특허청 창구 → `S2C.LICENSE_STATE`. */
  LICENSE_STATE: 'license:state',
  /** 내 특허 open / closed(`LicenseOfferMessage`). */
  LICENSE_OFFER: 'license:offer',
  /** 통상실시권 취득(`LicenseAcquireMessage`) — 선급 $0.100M. */
  LICENSE_ACQUIRE: 'license:acquire',
} as const;
export type C2SType = (typeof C2S)[keyof typeof C2S];

export interface MoveMessage {
  x: number;
  y: number;
  dir: Direction;
  moving: boolean;
  /** 클라이언트 전송 순번 — 서버 보정 메시지가 같은 번호를 되돌려 준다. */
  seq: number;
}

export interface InteractMessage {
  interactableId: string;
}

export interface ExperimentRequestMessage {
  /** 클라이언트가 만드는 멱등 키. 같은 값 재전송은 같은 작업으로 연결된다. */
  requestId: string;
  interactableId: string;
  stage: Stage;
  /**
   * 단계별 입력. Stage 3 실제 도킹은 `DOCKING_PARAM` 의 키를 쓰고(`targetId` · `smiles` · 선택 `label`),
   * Stage 4 실제 ADMET 예측은 `ADMET_PARAM` 의 키를 쓴다(`smiles` · 선택 `label`).
   * 그 밖의 단계는 고정 결과에서 표시용으로만 쓴다.
   */
  params: Record<string, string | number | boolean>;
  /**
   * (v10) 설비 임대 실행 — 다른 회사 사옥의 가동 중인 도킹 · ADMET 설비에서 방문 팀이 실행한다. 작업비(평소대로) + 임대료 $0.015M.
   * 작업 · 결과는 임차 팀 것이다(설계서 §2.2 — 결과는 임차 팀에게만).
   */
  rent?: boolean;
}

/** Stage 3 도킹 요청의 `params` 키. */
export const DOCKING_PARAM = {
  targetId: 'targetId',
  smiles: 'smiles',
  /** 사용자가 붙인 이름(예시 분자 이름 등). 선택. */
  label: 'label',
} as const;

/**
 * Stage 4 ADMET 예측 요청의 `params` 키. 키 이름은 도킹과 같다(워커의 검증 · 정규화 함수가 같다) —
 * `smiles` 는 **내 회사 유효 특허의 정규 SMILES**(`PatentView.canonicalSmiles`)를 그대로 보낸다.
 * `smiles` 가 없으면 compute 모드에서도 고정 결과가 나온다(fixture 호환).
 */
export const ADMET_PARAM = {
  smiles: 'smiles',
  /** 화면 요약에 쓰는 이름표(특허 이름표 등). 선택. */
  label: 'label',
} as const;

export interface ExperimentSeenMessage {
  jobId: string;
}

/**
 * 설비 행동(v3) — 건설(0→1) · 업그레이드(n→n+1) · 가동 중지 · 재가동 · 매각.
 * - 가동 중지: 유지비 20%만 내고 기능을 주지 않는다. 그 설비의 진행 중 작업이 있으면 `facility_busy`.
 * - 매각: 실제 낸 설치·업그레이드 비용의 50% 회수, 등급 0(평면도)으로. 진행 중 작업이 있으면 `facility_busy`.
 * - 건설·업그레이드는 구조조정·회생 유예 중 `restructure_blocked`, 학급 일시정지 중 `class_paused`. 중지·재가동·매각은 회생 수단이라 막지 않는다.
 */
export type FacilityActionId = 'build' | 'upgrade' | 'idle' | 'activate' | 'sell';

/** `C2S.FACILITY_BUILD` — 설비 행동 하나. 이름은 M2 호환으로 남겼다. */
export interface FacilityBuildMessage {
  /** 멱등 키. 같은 값 재전송은 연구비를 두 번 쓰거나 두 번 회수하지 않는다. */
  requestId: string;
  /** 사옥 맵의 설비 상호작용 지점 id. 서버가 설비 종류를 여기서 읽는다. */
  interactableId: string;
  action: FacilityActionId;
}

/** `C2S.SUPPORT_REQUEST` — 교사에게 지원 요청. 같은 requestId 재전송은 한 건으로 묶인다. */
export interface SupportRequestMessage {
  requestId: string;
  kind: 'grant' | 'grace' | 'other';
  /** 200자 이하. */
  message: string;
}

/**
 * `C2S.COMPANY_REFOUND` — 파산한 회사 구성원이 새 회사를 세운다(균형안 §4).
 * 새 회사 식별자로 시작하고 같은 부지·잉크를 쓴다. 설비·특허 권리를 승계하지 않는다(설비 전부 등급 0).
 * 재창업 지원금 $2.500M 은 **학급당 팀별 1회**(같은 학생 팀의 두 번째 재창업부터 0). 이전 학습 노트는 읽기 전용으로 남는다.
 * 같은 파산 회사에 대한 재전송·다른 구성원의 동시 요청은 한 번만 처리한다.
 */
export interface CompanyRefoundMessage {
  requestId: string;
  companyName: string;
  /** 대문자 3~4자. 그 학급에서 쓴 적 없는 티커(파산한 회사의 티커도 다시 쓰지 않는다). */
  tickerSymbol: string;
  slogan?: string;
}

/**
 * `C2S.STAFF_CHANGE` — 전문 연구원 한 명 채용(+1) · 해고(−1)(v4, 균형안 §3.2 '별도 채용비 없음 · $0.020M/월').
 * 채용은 구조조정 · 유예 중 `restructure_blocked`(막힌 행동 `hiring`), 학급 일시정지 중 `class_paused`. 해고는 회생 수단이라 막지 않는다.
 * 연구원은 0~10명(입력 검증). 급여는 바뀐 다음 정산부터 새 인원으로 계산한다. 같은 requestId 재전송은 한 번만.
 */
export interface StaffChangeMessage {
  requestId: string;
  delta: 1 | -1;
}

export interface PrefSetMessage {
  resultMode?: ResultMode;
  renderProfile?: string;
  reducedMotion?: boolean;
  muted?: boolean;
}

// ──────────────────────── 서버 → 클라이언트 메시지 ────────────────────────

export const S2C = {
  WELCOME: 'welcome',
  MOVE_CORRECTION: 'move:correction',
  INTERACT_OPEN: 'interact:open',
  JOB_UPDATE: 'job:update',
  JOB_RESULT: 'job:result',
  JOB_LIST: 'job:list',
  /** 내 팀 연구비·설비 등급·최근 원장. **그 팀 구성원에게만** 보낸다. */
  TEAM_STATE: 'team:state',
  /** 사옥 설비 외관 변경. 그 사옥 룸에 있는 **모두**(방문자 포함)에게 보낸다 — 설비 수준은 정찰 가능한 공개 정보다(PRD §2.4). */
  FACILITY_UPDATE: 'facility:update',
  NOTICE: 'notice',
  ERROR: 'error',
  // ── v3 (M3)
  /** 학급 시계(`ClockView`) — 그 학급의 모두에게. */
  CLOCK: 'clock',
  /** 이벤트 공시(`EventNoticeMessage`) — 그 학급의 모두에게. */
  EVENT_NOTICE: 'event:notice',
  /** 교사 화면 상태(`GmClassState`) — 그 학급 월드에 들어온 교사에게만. */
  GM_STATE: 'gm:state',
  /**
   * 학급 월드가 바뀌었다(`WorldChangedMessage`) — 파산·재창업으로 도시 맵의 회사·부지 표기가 바뀌었다.
   * 클라이언트는 지금 공간에 다시 입장해 새 welcome 맵을 받는다. 내 팀이 바뀌었으면(`yourTeam`) 도시로 나간다.
   */
  WORLD_CHANGED: 'world:changed',
  // ── v4 (M4)
  /** 시세판 전체(`MarketStateMessage`) — 객장 구역 안의 사람에게만. */
  MARKET_STATE: 'market:state',
  /** 내 계좌(`AccountStateMessage`) — 객장 구역 안의 그 학생에게만. */
  ACCOUNT_STATE: 'market:account',
  /** 객장 구역 출입(`ExchangePresenceMessage`) — 그 사람에게만. */
  EXCHANGE_PRESENCE: 'market:presence',
  /** 학급 전체 증시 속보(`MarketNewsMessage`) — 객장 밖에서도. */
  MARKET_NEWS: 'market:news',
  /** 체결 확인(`OrderResultMessage`) — 주문 · 청약한 사람에게만. */
  ORDER_RESULT: 'market:order-result',
  /** NPC 답(`NpcReplyMessage`) — 말 건 사람에게만. */
  NPC_REPLY: 'npc:reply',
  /** 교사 정정 공시(`CorrectionNoticeMessage`, `gm.ts`) — 그 학급의 모두. */
  CORRECTION_NOTICE: 'gm:correction',
  /** 학급 복원 공시(`RestoreNoticeMessage`, `gm.ts`) — 그 학급의 모두. 뒤이어 `WORLD_CHANGED { reason: 'restore' }`. */
  RESTORE_NOTICE: 'gm:restore',
  // ── v5 (M5)
  /** 내 파이프라인 상태(`PipelineStateMessage`, `pipeline.ts`) — 그 회사 구성원에게만. */
  PIPELINE_STATE: 'pipeline:state',
  /** 창구 공개 원장(`PipelineDeskMessage`) — 요청한 사람에게만. */
  PIPELINE_DESK: 'pipeline:desk',
  /** 단계 판정(`PipelineResultMessage`) — 그 회사 구성원에게만, `deliver` 를 따른다. */
  PIPELINE_RESULT: 'pipeline:result',
  // ── v7 (NPC)
  /** NPC 안내 시작 · 도착 · 종료 · 다른 학생 안내(`NpcEscortMessage`, `npc.ts`) — 그 학생에게만. */
  NPC_ESCORT: 'npc:escort',
  // ── v8 (동기부여 Step 1) — `gamification.ts`
  /** 사옥 외관 등급이 바뀌었다(`HqTierMessage`) — 학급의 모두(공개). */
  HQ_TIER: 'hq:tier',
  /** 바운티 상태(`BountyStatusMessage`) — 요청한 사람 · 그 회사 구성원. */
  BOUNTY_STATUS: 'bounty:status',
  /** 바운티 채점 결과(`BountyResultMessage`) — 제출한 사람에게. */
  BOUNTY_RESULT: 'bounty:result',
  // ── v9 (동기부여 Step 2) — `gamification.ts`
  /** CRO 의뢰 보드(`CroBoardMessage`) — 요청한 사람에게. 지급 · 수주 뒤에는 그 회사 구성원 모두에게. */
  CRO_BOARD: 'cro:board',
  /** CRO 채점 · 정산 결과(`CroResultMessage`) — 제출한 사람에게. */
  CRO_RESULT: 'cro:result',
  // ── v10 (동기부여 Step 3) — `gamification.ts`
  /** 사옥 소품이 바뀌었다(`HqPropsMessage`) — 학급 전체(공개). */
  HQ_PROPS: 'hq:props',
  /** 사옥 내부 새 맵(`HqInteriorMessage`) — 그 사옥 룸의 모두(등급 바닥 · 소품 슬롯). */
  HQ_INTERIOR: 'hq:interior',
  /** 연례 바이오 학회 상태(`SymposiumStateMessage`). */
  SYMPOSIUM_STATE: 'symposium:state',
  /** 실시 허락 장부(`LicenseStateMessage`) — 그 회사 구성원. */
  LICENSE_STATE: 'license:state',
} as const;
export type S2CType = (typeof S2C)[keyof typeof S2C];

export interface WelcomeMessage {
  space: SpaceId;
  /** 이 룸이 어느 팀 사옥인가(도시면 null). */
  hqTeamId: TeamId | null;
  /** 방문자인가(내 팀 사옥이 아닌 사옥). */
  visitor: boolean;
  you: PublicUser & { sessionId: string };
  team: PublicTeam | null;
  teams: PublicTeam[];
  /** 압축 맵(v4) — `decodeTileMap`(game-rules)으로 `TileMapData` 를 만든다. */
  map: WireTileMap;
  /** 학급 작업 세대(v4) — 복원하면 올라간다. 화면은 이전 세대 결과를 '복원 전 기록' 으로 보인다. */
  generation: number;
  /** 서버가 적용한 내 설정. */
  preferences: { resultMode: ResultMode };
  serverTimeMs: number;
  protocolVersion: number;
  /** 이 월드의 학급(v3). */
  classId: ClassId;
  /** 입장 시점의 학급 시계(v3). 뒤이어 바뀌면 `S2C.CLOCK`. */
  clock: ClockView;
  /** 교사 입장인가(v3) — GM 패널을 띄우고, `S2C.GM_STATE` 를 받는다. 교사는 팀이 없다(`team: null`). */
  gm: boolean;
  /**
   * 화면 상단에 그대로 띄우는 환경 표시. 로컬 테스트 계정이면 개발 환경임을 알리는 문구,
   * 운영 인증이면 `null`(띄우지 않는다). 결과 하나하나의 테스트 표시는 `ExperimentResult.testLabel` 이 맡는다.
   */
  testBanner: string | null;
}

export interface MoveCorrectionMessage {
  seq: number;
  x: number;
  y: number;
  reason: 'collision' | 'bounds' | 'speed';
}

export type InteractActionId =
  | 'experiment'
  | 'build'
  | 'upgrade'
  | 'inspect'
  | 'locked'
  // ── v3 (M3) 회생 수단
  | 'idle'
  | 'activate'
  | 'sell'
  // ── v4 (M4)
  /** 거래소 단말기 — 객장 창 열기. */
  | 'trade'
  /** 거래소 단말기 — 내 회사 유상증자 신청 창. 회사 구성원만 enabled. */
  | 'offering'
  /** NPC 대화 창 열기. */
  | 'talk'
  /** 사옥 연구원 — 채용 · 해고(회사 구성원만). */
  | 'hire'
  | 'fire'
  // ── v5 (M5) 신약 파이프라인 — 창구 · 사옥 설비
  /** 창구 공개 원장 보기(특허 원장 · 파이프라인 요약 · 임상 등록부). 누구나. */
  | 'registry'
  /** 시청 · 특허청 — 물질특허 출원(회사 구성원). */
  | 'patent'
  /** FDA — IND 신청 · 용량 변경 · 최종 허가 신청(회사 구성원). */
  | 'ind'
  | 'amend'
  | 'final'
  /** 대학병원 — 다음 임상 단계 시작(회사 구성원). */
  | 'trial'
  /** 내 사옥 표적 탐색실 — ① 코드명 · 기전 선언. */
  | 'program'
  /** 내 사옥 ADMET실 — ② 후보 · 제형 결정. */
  | 'formulation'
  // ── v9 (동기부여 Step 2)
  /** 사옥 전략 회의실 — CRO 의뢰 보드 열기(방문자는 읽기만). */
  | 'cro_board'
  // ── v10 (동기부여 Step 3)
  /** 대학병원 창구 — 연례 바이오 학회 창 열기. */
  | 'symposium'
  /** 시청 · 특허청 창구 — 통상실시권(License-Out) 장부 열기. */
  | 'license'
  /** 다른 회사 사옥의 가동 중인 도킹 · ADMET 설비 — 임대 실행(작업비 + 임대료). */
  | 'rent';

/** 상호작용 지점에 다가가 열리는 창의 설명. */
export interface InteractOpenMessage {
  interactableId: string;
  kind: 'facility' | 'institution' | 'notice' | 'npc';
  facility?: FacilityKind;
  /** 기관 창구(v5) — 어느 기관인가. 셸은 이것으로 창구 창(특허청 · FDA · 대학병원)을 고른다. */
  institution?: InstitutionKind;
  /** NPC 창(v4) — 이름 · 직책 · 첫인사 · 추천 질문(버튼). 대화는 `C2S.NPC_TALK`. */
  npc?: { id: NpcId; name: string; role: string; greeting: string; suggestions: string[]; researchers?: number };
  stage?: Stage;
  /** 설비 현재 등급(0 = 미건설 평면도). 설비가 아니면 생략. */
  tier?: FacilityTier;
  /** 설비 가동 상태(v3). 설비가 아니면 생략. */
  runState?: FacilityRunState;
  title: string;
  /** 실행 가능한 작업. 버튼 하나가 action 하나다. */
  actions: Array<{
    id: InteractActionId;
    label: string;
    enabled: boolean;
    /** 이 작업에 드는 연구비(센트). 무료면 생략. 화면은 `$0.050M` 처럼 유효 금액을 정확히 보인다(균형안 §8). 이벤트 배율·지구 할인을 반영한 값이다. */
    costCents?: number;
    /** 매각으로 돌려받는 금액(센트, v3) — 실제 낸 설치·업그레이드 비용의 50%. */
    refundCents?: number;
    /** 비활성 사유·주의 — 예: '연구비 부족', '균형안 v0 에 2단계 이후 비용이 없다'. */
    note?: string;
  }>;
  /** 방문자는 타 팀 설비를 조작할 수 없다 — 관찰만 가능. */
  readOnly: boolean;
  note?: string;
}

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/**
 * 결과의 출처. `fixture` 는 테스트용 고정 데이터, `dataset` 은 번들 공개 DB 조회(v11 — Stage 1 Open Targets · Stage 2 ChEMBL · RDKit),
 * `vina` 는 실제 AutoDock Vina 도킹(Stage 3), `admet-ai` 는 실제 ADMET-AI v2 예측(Stage 4).
 * `fixture` 가 아닌 값은 모두 `provenance` 가 반드시 있다. `dataset` 은 계산이 아니라 **조회**라 무료다(과금은 `vina` · `admet-ai` 만).
 */
export type ResultSource = 'fixture' | 'dataset' | 'vina' | 'admet-ai';

/**
 * 진행 단계 — 긴 연산의 상태를 사람이 이해할 수 있게 쪼갠다.
 * `queued` 대기열 · `prepare` 리간드 준비(RDKit·Meeko) · `dock` 도킹(Vina) · `analyze` 결합 분석(PLIP) ·
 * `predict` ADMET 예측(v6 — Stage 4, ADMET-AI) · `replay` 저장된 계산 결과를 다시 읽는 중.
 */
export type JobPhase = 'queued' | 'prepare' | 'dock' | 'analyze' | 'predict' | 'replay';

export interface JobView {
  jobId: string;
  requestId: string;
  teamId: TeamId;
  requestedBy: UserId;
  requestedByName: string;
  facility: FacilityKind;
  stage: Stage;
  status: JobStatus;
  /** 0~1. 워커가 보고하는 값이 없으면 서버가 경과 시간으로 추정한다. */
  progress: number;
  /** 워커가 보고한 진행 단계. 고정 결과 경로는 생략할 수 있다. */
  phase?: JobPhase;
  /** `queued` 일 때 워커 대기열에서 내 앞에 있는 작업 수(0 = 다음 차례). */
  queuePosition?: number;
  createdAt: number;
  updatedAt: number;
  /** 실패 사유 — 사용자가 재시도 가능 여부를 이해할 수 있게 쓴다. */
  error?: { code: ErrorCode; message: string; retryable: boolean };
  /** 작업 세대 — 학급 복원 시 이전 세대 결과가 현재 상태를 덮지 못하게 한다. */
  generation: number;
  /** 결과 출처. 수락 전에는 요청 내용으로 예상한 값이고, 수락 뒤에는 워커가 확정한 값이다. */
  source: ResultSource;
  /** 테스트용 고정 데이터인가. `source === 'fixture'` 와 같은 뜻이다. */
  test: boolean;
  /** 이 작업에 쓴 연구비(센트). 무료 작업은 0. */
  costCents: number;
  /** 실행 실패로 돌려받은 연구비(센트). 같은 jobId 에 한 번만. */
  refundedCents: number;
  /** 작업 목록에 띄우는 한 줄 요약 — 예: '도네페질 · AChE(4EY7)'. 그 팀에게만 보낸다. */
  inputSummary?: string;
  /** 같은 학생 팀의 이전 회사(재창업 전)가 남긴 작업이다(v3) — 읽기 전용 학습 노트. */
  predecessor?: boolean;
  /**
   * 교사 판정 정정(v4). 원본 결과(`ExperimentResult`)는 그대로 두고 교사 판정을 따로 싣는다 — 화면은 원본과 정정을 함께 보이고 `ui/gm-badge` 를 붙인다.
   * `affinityKcal: null` 은 '이 결과를 판정에 쓰지 않는다(무효)'.
   */
  correction?: { affinityKcal: number | null; note: string; byName: string; atMs: number };
  /**
   * 학급 복원 이전 세대의 작업이다(v4). 되돌린 저장본 시점 **뒤**의 결과는 지금 세계에 반영되지 않았고,
   * 앞의 결과는 저장본에 담긴 만큼(연구비 · 리포트로 바뀐 적정가 등)만 남는다. '이번 세대 최고 기록' 같은 판정은 지금 세대 작업만 센다.
   */
  superseded?: boolean;
}

export interface JobUpdateMessage {
  job: JobView;
}

export interface JobListMessage {
  jobs: JobView[];
  /** 아직 사용자가 확인하지 않은 완료 결과(순서대로 확인한다). */
  unseenJobIds: string[];
}

/** 결과 본문. 테스트 표시를 데이터 자체에 담는다(ARCHITECTURE §7.3). */
export interface ExperimentResultMessage {
  job: JobView;
  result: ExperimentResult;
  /** 이 사용자의 설정에 따른 처리 방법. 서버가 계산해서 알려 준다. */
  deliver: ResultMode;
}

export interface ResultMetric {
  label: string;
  value: string;
  unit?: string;
  /** 표기 문법 — pen=확정, red=경고, high=형광 강조, faint=미확정 (아트디렉션 §3). */
  tone?: 'pen' | 'red' | 'high' | 'faint';
}

export interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
  /** 형광펜 강조 대상. */
  highlight?: boolean;
}

/** 실제 계산 결과의 출처 기록 — 같은 입력으로 다시 계산할 수 있을 만큼 적는다. */
export interface ResultProvenance {
  /** 사람이 읽는 엔진 이름 — 'AutoDock Vina'. */
  engine: string;
  engineVersion: string;
  /** 단계별 도구와 버전 — 예: ['RDKit 2026.09.1 ETKDGv3 + MMFF94', 'Meeko 0.8.0', 'AutoDock Vina 1.2.7', 'PLIP 3.0.1']. */
  pipeline: string[];
  /** 도킹(Stage 3)처럼 표적 단백질을 쓰는 계산만. 표적과 무관한 계산(Stage 4 ADMET 예측)은 생략한다. */
  targetId?: string;
  pdbId?: string;
  /** RDKit 정규 SMILES(입체 정보 포함). */
  canonicalSmiles: string;
  /** 재현에 필요한 설정 — exhaustiveness · seed · 상자 중심·크기 등. */
  settings: Record<string, string | number>;
  /** 같은 팀의 이전 계산을 다시 읽었는가. 다른 팀의 계산 여부는 절대 드러내지 않는다. */
  cacheHit: boolean;
  /** 원 계산을 끝낸 시각(ms epoch)과 걸린 시간. */
  computedAt: number;
  computeMs: number;
  /**
   * 입력이 그 표적의 결정구조 리간드와 같은 분자일 때만 — 1위 포즈와 결정구조 포즈의 RMSD(Å, 중원자).
   * 2Å 이하면 이 설정이 실험 포즈를 재현한다는 방법 검증 지표다.
   */
  redockRmsdA?: number;
  /** 결과 해석의 한계 — 예: '결합 친화도 추정치이며 실제 약효를 보장하지 않습니다'. */
  disclaimer: string;
}

/**
 * Stage 2 스크리닝이 고른 후보 한 줄(v11) — 화면 표의 **문자열 대신** 이 값을 읽어 Stage 3 도킹 입력에 넣는다
 * (열 순서가 바뀌어도 깨지지 않고, 어느 표적으로 고른 후보인지가 남는다).
 */
export interface ScreeningCandidate {
  /** ChEMBL id 또는 사내 후보 id. */
  compoundId: string;
  name: string;
  canonicalSmiles: string;
  /** 이 후보를 고른 기준 표적(`DOCKING_TARGETS[].id`). */
  targetId: string;
  /** 0~1 — 3D 결합력 · 2D 유사도 · 약물성(QED)을 합친 스크리닝 점수. */
  screenScore: number;
  /** 사전 도킹(AutoDock Vina, 오프라인 1회)한 결합 자유에너지(kcal/mol). 없으면 생략. */
  vinaKcal?: number;
  mw: number;
  qed: number;
}

/** Stage 2 깔때기 — 단계마다 **통과한** 분자 수(v11). 학생이 고른 컷오프 그대로 센다. */
export interface ScreeningFunnel {
  total: number;
  library: number;
  mwTpsa: number;
  ro5: number;
  alerts: number;
  selected: number;
}

export interface ExperimentResult {
  jobId: string;
  requestId: string;
  stage: Stage;
  facility: FacilityKind;
  teamId: TeamId;
  title: string;
  subtitle: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  metrics: ResultMetric[];
  /** 산점도 연출용 데이터 (아트디렉션 §7: dot-plot-draw). */
  scatter?: { xLabel: string; yLabel: string; points: ScatterPoint[] };
  /** 표 형태 결과 — 상위 후보 목록·상호작용 잔기 등. */
  table?: { columns: string[]; rows: string[][] };
  /** 여백 주석 — Nanum Pen Script 로 그린다. */
  annotations: string[];
  /** 승인 도장 연출 (stamp/* 프레임 키). 기관 승인(특허·IND·NDA)에만 쓴다 — 실험 결과에는 붙이지 않는다. */
  stamp?: { frame: string; label: string };
  /** Stage 2 — 스크리닝이 고른 후보(v11). 도킹 창의 '후보 불러오기' 가 이 값을 쓴다. */
  candidates?: ScreeningCandidate[];
  /** Stage 2 — 깔때기 통계(v11). */
  funnel?: ScreeningFunnel;
  source: ResultSource;
  /** 테스트용 고정 데이터인가. `true` 면 `testLabel` 이 반드시 있다. */
  test: boolean;
  testLabel?: string;
  /** 실제 계산 · 데이터셋 조회(`source !== 'fixture'`)면 반드시 있다. */
  provenance?: ResultProvenance;
}

export interface NoticeMessage {
  level: 'info' | 'warn';
  text: string;
  /** 포스트잇 토스트로 띄울지. */
  postit?: boolean;
  /** 어떤 요청에 대한 접수 확인인가(v3) — 예: `SUPPORT_REQUEST` 의 requestId. 요청과 무관한 공지면 생략. */
  requestId?: string;
}

// ──────────────────────── 연구비·설비 (M2) ────────────────────────

/** 연구비 원장 항목 종류. 원장은 정수 센트로 적는다(균형안 §3). */
export type LedgerKind =
  | 'initial'
  | 'facility_build'
  | 'facility_upgrade'
  | 'paid_work'
  | 'paid_work_refund'
  | 'adjustment'
  // ── v3 (M3)
  /** 게임 일 경계의 유지비 정산(지출). 부족분은 미지급으로 남는다. */
  | 'upkeep'
  /** 미지급 유지비를 나중에 낸 것(지출). 돈이 들어오면 먼저 미지급부터 정산한다. */
  | 'upkeep_arrears'
  /** 설비 매각 회수(수입). */
  | 'facility_sale'
  /** 교사 연구비 지급(수입, gm). */
  | 'teacher_grant'
  /** 투자 마일스톤(수입, gm 승인). */
  | 'investment'
  /** 이벤트 일회성 지급(수입) — 정부 연구 지원 등. 교사 실행이면 gm. */
  | 'event_grant'
  /** 재창업 지원금(수입) — 학급당 팀별 1회. */
  | 'refound_grant'
  // ── v4 (M4)
  /** 유상증자 청약 대금(수입) — 청약 한 건마다 한 줄, 미지급부터. 멱등 키 `offering:<subscriptionTradeId>`. */
  | 'offering_proceeds'
  /** 교사 정정(±, gm) — 시스템 오류로 잘못 청구 · 지급된 금액 바로잡기. */
  | 'correction'
  /** 학급 복원 보정(±) — 저장본 잔액으로 되돌리는 한 줄(원장을 지우지 않고 보정한다). */
  | 'restore'
  // ── v5 (M5) — 신약 파이프라인(균형안 §10.1). 멱등 키 `pipeline:<teamId>:<requestId>`.
  /** 물질특허 출원 수수료(지출). */
  | 'patent_fee'
  /** FDA 심사 수수료 — IND · 최종 허가(지출, 심사 비용 배율 반영). */
  | 'review_fee'
  /** 임상 1 · 2 · 3상 비용(지출, 임상 비용 배율 반영). */
  | 'trial_fee'
  // ── v8 (동기부여 Step 1) — 실패 데이터 바운티. 멱등 키 `bounty:step:<stepId>` · `bounty:exp:<lineageId>:<stage>:<표적>:<SMILES>`.
  /** 실패 원인 분석 리포트 통과 환급(수입, 미지급부터) — 실제 낸 비용 × 환급률. */
  | 'data_bounty_refund'
  /** 교사가 단계 판정을 실패 → 통과로 정정해 바운티를 회수(지출, 잔액만큼). 키 `bounty-clawback:<원래 키>:<정정 id>`. */
  | 'bounty_clawback'
  // ── v9 (동기부여 Step 2) — CRO 의뢰 보상. 멱등 키 `cro:<contractId>`(동기부여 기록표와 같은 트랜잭션).
  /** CRO 일반 · 심층 의뢰 보상(수입, 미지급부터) — 차시 · 계보 상한 안에서. */
  | 'cro_reward'
  // ── v10 (동기부여 Step 3) — 동기부여 기록표와 같은 트랜잭션.
  /** 사옥 소품 구매(지출) · 매각 회수(수입, 산 값의 50%). 키 `prop:<teamId>:<propId>:<requestId>`. */
  | 'prop_purchase'
  | 'prop_sale'
  /** 연례 바이오 학회 상금(수입) — 계보 CRO · 학회 상한 공유. 키 `symposium:<연도>:<계보>`. */
  | 'symposium_prize'
  /** 통상실시권 선급금 — 라이선시 지출 · 라이선서 수입. */
  | 'license_fee'
  | 'license_income'
  /** 로열티 에스크로(라이선시 지출, 단계 신청과 같은 트랜잭션) · 최초 통과 지급(라이선서 수입, 정정 회수는 음수) · 보류 반환(라이선시 수입, 정정 재청구는 음수). */
  | 'royalty_escrow'
  | 'license_royalty'
  | 'royalty_release'
  /** 설비 임대료 — 임차 팀 지출 · 임대 팀 수입(실행 실패면 반환은 `rental_fee` 양수). */
  | 'rental_fee'
  | 'rental_income';

export interface LedgerEntryView {
  id: string;
  /** 음수 = 지출. */
  amountCents: number;
  balanceAfterCents: number;
  kind: LedgerKind;
  memo: string;
  createdAt: number;
  /** 교사 개입(지급·투자 승인·교사 실행 이벤트)이면 true — 화면에 `ui/gm-badge`(v3). */
  gm?: boolean;
}

/**
 * `S2C.TEAM_STATE` — 그 팀 구성원에게만. 다른 팀의 잔액은 보내지 않는다.
 * v3: 유지비·자금 경고·회생 유예·이벤트 효과·파산 정보(`TeamEconomyView`)가 더해졌다. 잔액이 바뀌는 모든 경우
 * (유지비 정산 포함)와 자금 단계가 바뀔 때 보낸다.
 */
export interface TeamStateMessage extends TeamEconomyView {
  teamId: TeamId;
  balanceCents: number;
  facilities: Record<FacilityKind, FacilityTier>;
  /** 적용 중인 균형안 설정 버전 — 'balance-v0'. */
  economyVersion: string;
  /** 최근 원장 항목(최신이 앞). */
  recentLedger: LedgerEntryView[];
  /** 사옥 외관 등급과 다음 등급 조건표(v8). 서버가 아직 계산하지 않았으면 생략. */
  hq?: HqProgressView;
  /** (v10) 사옥 소품 6종 — 가격 · 해금 · 보유 · 매각 회수액. 서버가 아직 읽지 않았으면 생략. */
  props?: PropView[];
}

/** `S2C.FACILITY_UPDATE` — 사옥 룸의 모두에게. 클라이언트는 `objectId` 의 프레임을 `frame` 으로 바꾼다. */
export interface FacilityUpdateMessage {
  hqTeamId: TeamId;
  facility: FacilityKind;
  tier: FacilityTier;
  /** 바뀐 맵 오브젝트 id 와 새 프레임 — `facility/<kind>-t<tier>` 또는 `facility/<kind>-blueprint`. */
  objectId: string;
  frame: string;
  interactableId: string;
  action: FacilityActionId;
  /** 가동 상태(v3). 가동 중지면 클라이언트가 `facility/offline` 을 설비 위에 겹친다. */
  state: FacilityRunState;
  /** 행동한 사람의 표시 이름(공개 정보). */
  byName: string;
}

/** `S2C.WORLD_CHANGED` — 학급 월드의 회사 구성이 바뀌었다(v3). */
export interface WorldChangedMessage {
  classId: ClassId;
  /** v4: `reinstated` 파산 판정 정정(번복) · `restore` 학급 복원(모두 다시 입장해 새 세계를 받는다). */
  reason: 'bankrupt' | 'refound' | 'reinstated' | 'restore';
  /** 바뀐 뒤 학급의 공개 팀 목록. 재창업 전의 파산 회사는 `status: 'bankrupt'` 로 남고(도시 맵에 `stamp/bankrupt`), 재창업하면 새 회사로 바뀐다. */
  teams: PublicTeam[];
  /** 받는 사람의 팀이 바뀌었으면 새 팀(재창업). 그 밖에는 생략. */
  yourTeam?: PublicTeam;
}

export const ERROR_CODES = [
  'bad_request',
  'protocol_mismatch',
  'unauthorized',
  'forbidden_team',
  'unknown_interactable',
  'facility_locked',
  'out_of_range',
  'duplicate_request',
  'rate_limited',
  'worker_unavailable',
  'worker_failed',
  'worker_timeout',
  'internal',
  // ── v2 (M2)
  /** 과학 입력이 계산할 수 없는 값 — 잘못된 SMILES·지원하지 않는 원소·크기 초과·모르는 표적. 재시도 불가. */
  'invalid_input',
  /** 연구비 부족. */
  'insufficient_funds',
  /** 균형안에 다음 등급 비용이 정의돼 있지 않거나 최고 등급이다. */
  'facility_maxed',
  /** 인증 서비스(Supabase Auth)에 닿지 않는다. 재시도 가능. */
  'auth_unavailable',
  /** 영구 저장소(PostgreSQL)에 닿지 않는다. 재시도 가능. */
  'store_unavailable',
  // ── v3 (M3)
  /** 그 학급의 구성원이 아니다(다른 학급 월드·사옥·GM 경로). */
  'forbidden_class',
  /** 교사 전용 기능이다. */
  'forbidden_role',
  /** 학급이 일시정지 중이라 지출 행동(유료 연구·설비 구매)을 받지 않는다. 재개 뒤 재시도 가능. */
  'class_paused',
  /** 구조조정·회생 유예 중에는 신규 유료 연구·설비 구매·채용을 할 수 없다(균형안 §4). */
  'restructure_blocked',
  /** 파산한 회사는 새 사업 활동을 할 수 없다 — 재창업하라. */
  'company_bankrupt',
  /** 가동 중지된 설비다 — 재가동하라. */
  'facility_idle',
  /** 그 설비에 진행 중 작업이 있어 가동 중지·매각할 수 없다. */
  'facility_busy',
  /** 이미 쓰는 이름 — 아이디·티커·회사 이름. */
  'name_taken',
  // ── v4 (M4)
  /** 객장 구역 밖에서는 시세 확인 · 주문 · 청약을 할 수 없다 — 증권거래소 광장으로 걸어가라(PRD §3.1). */
  'not_at_exchange',
  /** 그 종목이 거래 정지 · 상장 폐지 상태다. */
  'trading_halted',
  /** 자기 회사 주식은 사고팔거나 청약할 수 없다. */
  'self_trade_forbidden',
  /** 가진 주식(또는 공매도 잔고)보다 많이 팔거나 환매수하려 했다. 롱 · 숏을 동시에 들 수도 없다. */
  'insufficient_shares',
  /** 그 종목의 공매도 잔고가 상한(유통 주식의 20%)에 닿았다. */
  'short_limit',
  /** 증거금이 모자란다(공매도 개시 한도 · 음수 현금). */
  'margin_insufficient',
  /** 평균 체결가가 보호 한도(`limitPriceUsd`)를 넘었다 — 시세를 다시 보고 주문하라. 재시도 가능. */
  'price_moved',
  /** 청약 기간이 끝났거나 다 팔린 증자다. */
  'offering_closed',
  /** 증자 한도(발행 · 1인 청약)를 넘었다. */
  'offering_limit',
  /** 열린 증자가 있거나, 직전 증자 마감 뒤 대기 시간이 지나지 않았다. */
  'offering_cooldown',
  /** 이미 정리(상장 폐지)됐거나 재창업해 되돌릴 수 없는 판정이다. */
  'already_settled',
  /** 그런 저장본이 없다(7일이 지나 지워졌을 수 있다). */
  'snapshot_not_found',
  /** 학급 복원 전 세대의 요청 · 결과다 — 지금 세계에 반영하지 않는다. */
  'stale_generation',
  // ── v5 (M5) 신약 파이프라인
  /** 학급에 같은 물질(입체 정보를 뺀 정규 SMILES)의 유효 특허가 이미 있다 — 작용기를 바꾼 새 분자를 설계하라(균형안 §10.2). */
  'patent_conflict',
  /** 조건이 모자란다 — Stage 1 미완료 · 이번 세대 실제 도킹 근거 없음 · 내 유효 특허 없음 · 설비 미건설 등. 메시지가 무엇이 모자란지 말한다. */
  'not_eligible',
  /** 지금 파이프라인 상태에서 할 수 없는 신청이다(순서 — 예: IND 승인 전 임상, 3상 통과 전 최종 신청). */
  'pipeline_order',
  /** 진행 중인 심사 · 임상이 있어 바꾸거나 새로 신청할 수 없다. */
  'pipeline_busy',
  // ── v7 (NPC)
  /** 그 NPC 가 다른 학생을 안내하는 중이다 — AI 를 부르지 않았다. 안내가 끝나면 다시 말을 걸 수 있다. */
  'npc_busy',
  // ── v8 (동기부여 Step 1)
  /** 바운티 리포트 오답 뒤 다시 낼 시간이 아직 아니다(60초). 재시도 가능. */
  'bounty_cooldown',
  // ── v9 (동기부여 Step 2)
  /** CRO 의뢰 상한(게임 연도 건수 · 계보 합계)에 닿았다 — 연습 의뢰는 받을 수 있다. */
  'cro_limit',
  /** CRO 오답 뒤 변형 문항을 풀 시간이 아직 아니다(60초). 재시도 가능. */
  'cro_cooldown',
  // ── v10 (동기부여 Step 3)
  /** 라이선스 · 설비 임대 관계가 순환한다(A → B 뒤 B → A, A → B → C → A) — 담합 · 자전거래 차단. */
  'circular_trade',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorMessage {
  code: ErrorCode;
  message: string;
  /** 어떤 요청에 대한 실패인가. */
  requestId?: string;
  retryable: boolean;
}

// ──────────────────────── Stage 3 도킹 표적·예시 (M2) ────────────────────────

export interface DockingTarget {
  /** 워커 데이터 폴더 이름과 같다 — `apps/bio-worker/data/targets/<id>/`. */
  id: string;
  label: string;
  gene: string;
  pdbId: string;
  disease: string;
  /** 결정구조에 함께 있는 리간드 — 재도킹 방법 검증의 기준. */
  referenceLigand: { name: string; smiles: string };
  /** 중추신경계 표적인가(v5) — 그렇다면 임상 효능에 뇌 노출(BBB)이 들어간다(균형안 §10.4). */
  cns: boolean;
  /**
   * 결정 리간드를 같은 설정으로 재도킹한 결합 자유에너지(kcal/mol, v11) — 표적별 결합력 정규화의 기준점이다
   * (`@crista/game-rules` `affinityStrength(ΔG, referenceKcal)`). 포켓이 얕은 표적에서도 그 표적의 승인약이 제 몫을 하게 한다.
   * 값의 출처는 `apps/bio-worker/scripts/redock_check.py` 가 쓴 `data/targets/<id>/target.json` 의 같은 이름 칸이다.
   */
  referenceKcal: number;
  /** 그 재도킹 1위 포즈와 결정구조 포즈의 중원자 RMSD(Å) — 2 Å 이하면 이 설정이 실험 포즈를 재현한다는 방법 검증 지표. */
  referenceRmsd: number;
}

/**
 * 4대 질환 실제 결정구조 표적 — 알츠하이머병 AChE(4EY7) · 비소세포폐암 EGFR(1M17) ·
 * 2형 당뇨병 DPP4(1X70) · 류마티스 관절염 COX-2(3LN1).
 */
export const DOCKING_TARGETS: readonly DockingTarget[] = [
  {
    id: 'ache-4ey7',
    label: '아세틸콜린에스테라아제',
    gene: 'ACHE',
    pdbId: '4EY7',
    disease: '알츠하이머병',
    referenceLigand: {
      name: '도네페질',
      smiles: 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccccc3)CC1)C2',
    },
    cns: true,
    referenceKcal: -11.84,
    referenceRmsd: 0.82,
  },
  {
    id: 'egfr-1m17',
    label: '상피세포 성장인자 수용체',
    gene: 'EGFR',
    pdbId: '1M17',
    disease: '비소세포폐암',
    referenceLigand: {
      name: '엘로티닙',
      smiles: 'C#Cc1cccc(Nc2ncnc3cc(OCCOC)c(OCCOC)cc23)c1',
    },
    cns: false,
    referenceKcal: -7.24,
    referenceRmsd: 1.33,
  },
  {
    id: 'dpp4-1x70',
    label: '디펩티딜 펩티다아제-4',
    gene: 'DPP4',
    pdbId: '1X70',
    disease: '2형 당뇨병',
    referenceLigand: {
      name: '시타글립틴',
      smiles: 'N[C@@H](CC(=O)N1CCn2c(nnc2C(F)(F)F)C1)Cc1cc(F)c(F)cc1F',
    },
    cns: false,
    referenceKcal: -9.02,
    referenceRmsd: 0.8,
  },
  {
    id: 'cox2-3ln1',
    label: '사이클로옥시게나아제-2',
    gene: 'PTGS2',
    pdbId: '3LN1',
    disease: '류마티스 관절염',
    referenceLigand: {
      name: '세레콕시브',
      smiles: 'Cc1ccc(-c2cc(C(F)(F)F)nn2-c2ccc(S(N)(=O)=O)cc2)cc1',
    },
    cns: false,
    referenceKcal: -12.26,
    referenceRmsd: 0.51,
  },
];

export const DEFAULT_DOCKING_TARGET_ID = 'ache-4ey7';

/** 도킹 입력 폼의 예시 분자. SMILES 는 PubChem · ChEMBL 원본과 RDKit 정규형이 일치함을 확인했다. */
export const DOCKING_PRESETS: ReadonlyArray<{ name: string; smiles: string; note: string; pubchemCid: number; targetId?: string }> = [
  { name: '도네페질', smiles: 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccccc3)CC1)C2', note: '4EY7 결정구조 리간드 · AChE 억제제', pubchemCid: 3152, targetId: 'ache-4ey7' },
  { name: '갈란타민', smiles: 'CN1CC[C@@]23C=C[C@@H](C[C@@H]2OC4=C(C=CC(=C34)C1)OC)O', note: 'AChE 억제제', pubchemCid: 9651, targetId: 'ache-4ey7' },
  { name: '리바스티그민', smiles: 'CCN(C)C(=O)OC1=CC=CC(=C1)[C@H](C)N(C)C', note: 'AChE·BuChE 억제제', pubchemCid: 77991, targetId: 'ache-4ey7' },
  { name: '타크린', smiles: 'C1CCC2=NC3=CC=CC=C3C(=C2C1)N', note: '최초의 AChE 억제제 · 간독성으로 퇴출', pubchemCid: 1935, targetId: 'ache-4ey7' },
  { name: '후페르진 A', smiles: 'C/C=C/1\\[C@@H]2CC3=C([C@]1(CC(=C2)C)N)C=CC(=O)N3', note: '천연물 AChE 억제제', pubchemCid: 854026, targetId: 'ache-4ey7' },
  { name: '카페인', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', note: '비교 대조군', pubchemCid: 2519 },
  { name: '엘로티닙', smiles: 'C#Cc1cccc(Nc2ncnc3cc(OCCOC)c(OCCOC)cc23)c1', note: '1M17 결정구조 리간드 · EGFR TKI', pubchemCid: 176870, targetId: 'egfr-1m17' },
  { name: '게피티닙', smiles: 'COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1', note: '1세대 EGFR 타이로신 키나아제 억제제', pubchemCid: 123631, targetId: 'egfr-1m17' },
  { name: '시타글립틴', smiles: 'N[C@@H](CC(=O)N1CCn2c(nnc2C(F)(F)F)C1)Cc1cc(F)c(F)cc1F', note: '1X70 결정구조 리간드 · DPP-4 억제제', pubchemCid: 4369359, targetId: 'dpp4-1x70' },
  { name: '빌다글립틴', smiles: 'N#C[C@@H]1CCCN1C(=O)CNC12CC3CC(CC(O)(C3)C1)C2', note: '시아노피롤리딘계 DPP-4 억제제', pubchemCid: 6918537, targetId: 'dpp4-1x70' },
  { name: '세레콕시브', smiles: 'Cc1ccc(-c2cc(C(F)(F)F)nn2-c2ccc(S(N)(=O)=O)cc2)cc1', note: '3LN1 결정구조 리간드 · 선택적 COX-2 억제제', pubchemCid: 2662, targetId: 'cox2-3ln1' },
  { name: '로페콕시브', smiles: 'CS(=O)(=O)c1ccc(C2=C(c3ccccc3)C(=O)OC2)cc1', note: 'COX-2 억제제 · 심혈관 독성으로 퇴출', pubchemCid: 5090, targetId: 'cox2-3ln1' },
];

/** SMILES 입력 길이 상한 — 게임 서버가 워커로 보내기 전에 자른다. 화학 검증은 워커가 한다. */
export const SMILES_MAX_LENGTH = 200;

// ──────────────────── 게임 서버 → 바이오 워커 (HTTP JSON) ────────────────────

/** POST /jobs */
export interface WorkerJobRequest {
  jobId: string;
  requestId: string;
  classId: ClassId;
  teamId: TeamId;
  /** 작업 세대 — 복원 후 지난 세대 결과를 버리는 근거. */
  generation: number;
  stage: Stage;
  facility: FacilityKind;
  params: Record<string, string | number | boolean>;
  /** 요청자 직책 — 보너스 규칙은 후속, 지금은 결과 문구에만 쓴다. */
  cLevel: CLevel | null;
}

/**
 * POST /jobs 응답(202). 입력이 계산할 수 없는 값이면 202 대신 **400 `invalid_input`** 을 돌려준다 —
 * 그 판정은 동기적으로 끝나므로(SMILES 파싱·원소·크기) 게임 서버는 연구비를 확정하기 전에 거절을 안다.
 */
export interface WorkerJobAccepted {
  jobId: string;
  /**
   * 수락 시점의 실제 상태. 새 작업은 `queued`,
   * 이미 진행·종료된 작업을 같은 jobId 로 다시 요청하면 그 작업의 현재 상태를 그대로 돌려준다
   * (끝난 작업을 running 으로 둘러대지 않는다). 게임 서버는 이어서 `GET /jobs/{jobId}` 를 읽는다.
   */
  status: JobStatus;
  /** 이 작업이 낼 결과의 출처 — 워커 모드와 입력으로 수락 시점에 확정된다. */
  source: ResultSource;
  /** 예상 소요(ms). 클라이언트 진행률 추정에 쓴다. */
  estimatedMs: number;
  /**
   * 워커가 스스로 지키는 상한(ms, 수락 시점부터 대기열 포함). 넘으면 워커가 `worker_timeout` 으로 실패시킨다.
   * 게임 서버는 이 값에 여유를 더한 시각까지 기다리고, 그래도 끝나지 않으면 `DELETE /jobs/{jobId}` 로 취소한다.
   */
  timeoutMs: number;
}

/** GET /jobs/{jobId} · DELETE /jobs/{jobId}. 모르는 jobId 는 **404** 다(워커 재시작 판별 근거). */
export interface WorkerJobState {
  jobId: string;
  status: JobStatus;
  progress: number;
  phase?: JobPhase;
  queuePosition?: number;
  generation: number;
  result?: ExperimentResult;
  error?: { code: ErrorCode; message: string; retryable: boolean };
  /**
   * 게임 서버만 보관하는 산출물 — 클라이언트로 내려보내지 않는다.
   * 1위 포즈 SDF(후속 3D 뷰어용)와 정규 SMILES.
   */
  artifacts?: { poseSdf?: string; canonicalSmiles?: string };
  source: ResultSource;
  test: boolean;
}

/** GET /healthz */
export interface WorkerHealth {
  ok: boolean;
  service: 'crista-bio-worker';
  /** `fixture` = 모든 단계 고정 결과(M1). `compute` = Stage 3 를 실제로 계산하고 나머지는 고정 결과. */
  mode: 'fixture' | 'compute';
  version: string;
  activeJobs: number;
  /** compute 모드에서만 — 확인된 도구 버전. 예: { vina: '1.2.7', rdkit: '2026.09.1', meeko: '0.8.0', plip: '3.0.1' }. */
  engines?: Record<string, string>;
  /** 계산 가능한 표적 id. */
  targets?: string[];
  /** 동시에 돌리는 도킹 수와 대기열 길이. */
  capacity?: { maxConcurrent: number; running: number; queued: number };
  /** LLM 사용 가능 여부(v4, `llm.ts`). 키 값은 싣지 않는다. */
  llm?: LlmStatus;
  /** 물성 계산(`POST /molecule/properties`, v5)을 할 수 있는가 — RDKit 를 불러왔는가. fixture 모드에서도 RDKit 가 있으면 true. */
  properties?: boolean;
}

/**
 * `POST /molecule/properties`(v5) — 분자 하나의 물성을 RDKit 로 계산한다(동기, 수 ms). 게임 서버가 특허 출원 때 **과금 전에** 부른다.
 * 입력이 계산할 수 없는 SMILES 면 **400 `invalid_input`**, RDKit 를 쓸 수 없으면 **503 `worker_unavailable`**.
 * 정규화는 도킹(Stage 3)과 같은 함수를 쓴다 — `canonicalSmiles` 는 도킹 결과의 정규 SMILES 와 같아야 한다.
 */
export interface MoleculePropertiesRequest {
  smiles: string;
}
export type MoleculePropertiesResponse =
  | { ok: true; properties: MoleculeProperties }
  | { ok: false; code: 'invalid_input' | 'worker_unavailable'; message: string };
