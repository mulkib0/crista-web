/**
 * 항체 랩 학생 문구 대응표(설계 §6.6) — 화면에 올리는 **이름 · 뜻 · 단위 · 좋은 방향**을 한 곳에 둬요.
 *
 * 정직성(§3.5)
 * - 이 파일에도, 다른 화면 파일에도 **원전 지표 이름을 적지 않아요**. 근사값에 원전 이름을 붙이면 학생이 '실제로 그 지표를 쟀다'고
 *   오해하고, 묶음 6 의 정직성 감사(grep)도 걸려요. 원어 대조는 묶음 6 의 '점수 계산 방법' 페이지가 출처 표와 함께 맡아요.
 * - 단계 화면 카드에는 출처 배지를 두지 않아요 — 어디가 근사인지는 '점수 계산 방법' 페이지 한 곳에서만 말해요.
 *   서버 응답의 출처 칸(`provenance`)은 그대로 들어와요(화면에만 그리지 않아요).
 */
import type { AntibodyDataMode, NumberingSource, TrackId } from '@crista-web/web-contract';

export interface Term {
  /** 화면 안에서 쓰는 열쇠 — 코드에서만 써요. */
  key: string;
  /** 학생에게 보이는 이름. */
  name: string;
  /** 한 줄 뜻. */
  meaning: string;
  unit: string;
  /** 좋은 방향. */
  better: string;
}

export const TERMS: readonly Term[] = [
  // '센 값'이 아니라 **모형으로 추정한 값**이에요(§3.5 2판) — 통계표로 어림한 값이라 '셌다'고 적지 않아요.
  { key: 'bindScore', name: '붙는 힘 점수', meaning: '바꾼 자리가 항원과 더 잘 맞닿게 됐는지 통계표로 어림한 점수예요', unit: '0~100(무단위)', better: '높을수록 좋아요' },
  { key: 'fit', name: '설계 적합도', meaning: '붙는 힘과 위험한 자리를 지켰는지를 함께 묶은 값이에요', unit: '0~100', better: '높을수록 좋아요' },
  { key: 'greasySurface', name: '기름진 겉면 정도', meaning: '겉면에 기름진 부분이 얼마나 뭉쳐 있는지예요', unit: '백분위', better: '가운데가 좋아요' },
  { key: 'chainCharge', name: '두 사슬 전하 궁합', meaning: '두 사슬의 전기 성질이 서로 맞는지예요', unit: '백분위', better: '가운데~높음이 좋아요' },
  { key: 'patchPositive', name: '양전하 패치', meaning: '겉면 한곳에 +전기가 몰렸는지예요', unit: '위험 표시', better: '적을수록 좋아요' },
  { key: 'patchNegative', name: '음전하 패치', meaning: '겉면 한곳에 −전기가 몰렸는지예요', unit: '위험 표시', better: '적을수록 좋아요' },
  { key: 'confidence', name: 'AI 확신도', meaning: 'AI 가 자기 예측을 얼마나 믿는지예요(정확도가 아니에요)', unit: '0~100', better: '높을수록 좋아요' },
  { key: 'complexConfidence', name: '복합체 신뢰도', meaning: '두 단백질을 함께 접은 결과를 얼마나 믿는지예요', unit: '0~1', better: '높을수록 좋아요' },
  // 등급 방향을 한 줄로 못박아요 — 설계서 §2.4 범례(9 = 거의 모두 같은 글자)와 §6.6 '낮으면 건드리지 말 것'이 서로 어긋나서,
  // 학생에게 보이는 범례(§2.4)를 따르고 그 뜻을 이름 · 방향 · 자물쇠 문구에 똑같이 써요.
  { key: 'diversity', name: '레퍼토리 다양성', meaning: '비슷한 항체들에서 이 자리가 얼마나 갈리는지예요 — 9 는 거의 모두 같은 글자, 1 은 항체마다 많이 달라요', unit: '1~9 등급', better: '9 쪽은 건드리지 마세요' },
  { key: 'humanness', name: '사람 유전자 동일성', meaning: '사람 항체 유전자와 얼마나 같은지예요', unit: '%', better: '높을수록 좋아요' },
  { key: 'liability', name: '약점 모티프', meaning: '보관 중 변형되기 쉬운 글자 조합이에요', unit: '개수', better: '적을수록 좋아요' },
  { key: 'numbering', name: '표준 자리 번호', meaning: '전 세계가 같이 쓰는 잔기 번호 매김이에요', unit: '—', better: '—' },
  { key: 'cdr', name: 'CDR(가변 고리)', meaning: '항원에 직접 닿는 여섯 고리예요', unit: '—', better: '—' },
  { key: 'developability', name: '개발가능성', meaning: '약으로 만들기 쉬운 정도예요', unit: '0~100', better: '높을수록 좋아요' },
];

const BY_KEY = new Map(TERMS.map((t) => [t.key, t]));
/** 이름 한 번만 적고 어디서나 같은 이름을 써요 — 화면 문구가 파일마다 갈라지지 않게. */
export const term = (key: string): Term => BY_KEY.get(key) ?? { key, name: key, meaning: '', unit: '—', better: '—' };
export const termName = (key: string): string => term(key).name;

/** 문턱이 세 개인 이유 — 머리 섬 안내 한 줄(§6.6). */
export const THRESHOLD_NOTE =
  '설계 점수 문턱(원본보다 잘했는지) · 적합도 등급 60 · 80(얼마나 잘 붙는지) · AI 확신도 70(구조 예측을 믿을 수 있는지) — 재는 것이 달라서 기준이 달라요.';

/** 외부 자료를 지금 쓸 수 있는지 — 사이드바 섬에 늘 보여요. */
export const DATA_MODE_WORD: Record<AntibodyDataMode, string> = {
  live: '실시간 조회',
  cached: '저장해 둔 조회 결과',
  // 학생 화면 글이라 개발 용어('테스트용')를 쓰지 않아요(§11.4.2 · §12).
  fixture: '미리 받아 둔 참고 자료',
};

/** 번호를 어디서 받았는지 — 규칙으로 강등되면 '경계가 틀릴 수 있어요'를 함께 띄워요(§3.2). */
export const NUMBERING_WORD: Record<NumberingSource, string> = {
  sabdab: '실측 항체 번호 매김',
  anarci: '번호 매김 프로그램',
  'regex-fallback': '규칙으로 찾은 경계 — 틀릴 수 있어요',
};

/** 다양성 범례 — 원문 범례를 가져오지 않고 다시 쓴 문구예요(§2.4). */
export const DIVERSITY_LEGEND: readonly { grade: string; text: string }[] = [
  { grade: '9', text: '이 자리는 비슷한 항체 대부분에서 같은 아미노산이에요 — 바꾸면 구조가 흔들릴 수 있어요' },
  { grade: '7–8', text: '대부분 같아요 — 고정을 권해요' },
  { grade: '5–6', text: '반반이에요 — 신중히 바꿔요' },
  { grade: '1–4', text: '항체마다 많이 달라요 — 마음껏 바꿔도 돼요' },
];

/** 사슬 이름. */
export const CHAIN_WORD = { H: '중쇄(H)', L: '경쇄(L)' } as const;

// ── '연구소 고르기' 화면 문구(설계 §1.4) ──────────────────────────────────────
//
// 화면 문구를 이 파일 한 곳에 둬요 — `Labs.tsx` 는 마크업만 들고 있어요.
// 설명 덩어리(랩 한 줄 설명 · '결과의 성격' 줄 · 단계 칩 성격 배지)는 두지 않아요 — 이름 · 단계 · 진행만 보여요.
// 용어(§11.4.2): 모둠 · 스타트업 · 연구비 · 선생님 · 해요체 · 화면 문구에 백틱을 쓰지 않아요.

export interface LabCardCopy {
  track: TrackId;
  /** 큰 번호 자리. */
  no: string;
  title: string;
}

export const LAB_CARDS: readonly LabCardCopy[] = [
  {
    track: 'drug',
    no: '01',
    title: '저분자 신약 랩',
  },
  {
    track: 'antibody',
    no: '02',
    title: '항체 설계 랩',
  },
];

/** 화면에 올리는 글 — 설계 §1.4 표 그대로예요. */
export const LABS_COPY = {
  eyebrow: 'CRISTA 파이프라인 랩',
  title: '연구소 고르기',
  enter: '들어가기',
  closed: '이번 차시에는 선생님이 이 랩을 닫아 뒀어요.',
  notRegistered: '먼저 사옥 지구에서 회사를 등기해야 해요.',
  toDistrict: '사옥 지구로',
  district: '제약회사 스타트업을 먼저 설립해주세요',
  logout: '로그아웃',
  running: '진행 중',
  /** 진행 칩 — `MeResponse.labs` 가 없으면 아예 그리지 않아요(§1.3 · §1.4). */
  progress: (done: number, total: number) => `${done}/${total} 단계`,
} as const;
