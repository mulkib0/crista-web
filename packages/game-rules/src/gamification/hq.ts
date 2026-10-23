/**
 * 사옥 외관 등급(`hqTier` 1 → 2 → 3) — 설계서 docs/2026-10-22-gamification-motivation-design.md §3.1 의 표를 순수 함수로.
 * 등급은 **지금 사실**의 함수다(올라간 뒤에도 사실이 사라지면 내려간다 — 매각 · 정정 · 복원). 시가총액은 조건이 아니다.
 *
 * - 연구실 = 표적 탐색실 · HTVS · 도킹 · ADMET(보안 게이트 제외). **건설된(등급 ≥ 1)** 설비를 센다 — 가동 중지는 회생 수단이라
 *   외관 벌칙을 주지 않는다(설계서의 '가동'을 '건설'로 읽은 까닭은 Step 1 브리프 §2).
 * - Tier 2 = 연구실 3종 이상 + Series A + (유효 특허 1건 이상 또는 IND 승인).
 * - Tier 3 = Tier 2 조건 + 연구실 4종 + 보안 설비 + Series B + (3상 통과 또는 최종 허가).
 */
import type { FacilityKind, FacilityTier, HqProgressView, HqRequirementView, HqTier, InvestmentMilestone } from '@crista/shared-types';

export const HQ_LAB_KINDS: readonly FacilityKind[] = ['target', 'htvs', 'docking', 'admet'];

/** 등급을 정하는 사실 — 설비 · 투자는 회사 경제 행, 나머지는 이번 세대 파이프라인(정정 반영 판정). */
export interface HqFacts {
  facilities: Readonly<Record<FacilityKind, FacilityTier>>;
  investments: readonly InvestmentMilestone[];
  activePatents: number;
  indApproved: boolean;
  phase3Passed: boolean;
  approved: boolean;
}

export function hqLabCount(facilities: Readonly<Record<FacilityKind, FacilityTier>>): number {
  return HQ_LAB_KINDS.filter((kind) => facilities[kind] >= 1).length;
}

function tier2Requirements(f: HqFacts): HqRequirementView[] {
  const labs = hqLabCount(f.facilities);
  return [
    { id: 'labs3', label: '서로 다른 연구실 3종 건설', met: labs >= 3, progress: { have: Math.min(labs, 3), need: 3 } },
    { id: 'seriesA', label: 'Series A 투자 승인', met: f.investments.includes('seriesA') },
    { id: 'patentOrInd', label: '유효 물질특허 1건 또는 IND 승인', met: f.activePatents >= 1 || f.indApproved },
  ];
}

function tier3Requirements(f: HqFacts): HqRequirementView[] {
  const labs = hqLabCount(f.facilities);
  return [
    { id: 'labs4', label: '연구실 4종 모두 건설', met: labs >= 4, progress: { have: labs, need: 4 } },
    { id: 'security', label: '보안 게이트 · 특허 금고 건설', met: f.facilities.security >= 1 },
    { id: 'seriesB', label: 'Series B 투자 승인', met: f.investments.includes('seriesB') },
    { id: 'phase3OrApproval', label: '임상 3상 통과 또는 최종 허가', met: f.phase3Passed || f.approved },
  ];
}

const allMet = (rows: readonly HqRequirementView[]): boolean => rows.every((r) => r.met);

export function hqTierOf(f: HqFacts): HqTier {
  if (!allMet(tier2Requirements(f))) return 1;
  return allMet(tier3Requirements(f)) ? 3 : 2;
}

/** 등급 + 다음 등급의 조건표(Tier 2 조건이 모자라면 그것만, Tier 2 면 Tier 3 조건). */
export function hqProgressOf(f: HqFacts): HqProgressView {
  const tier = hqTierOf(f);
  if (tier === 3) return { tier, next: null, requirements: [] };
  return tier === 1 ? { tier, next: 2, requirements: tier2Requirements(f) } : { tier, next: 3, requirements: tier3Requirements(f) };
}

/** 도시 맵 건물 프레임 — `buildCityMap` 과 같은 규칙. */
export function hqFrame(tier: HqTier): string {
  return `building/hq-t${tier}`;
}

export const HQ_TIER_LABEL: Record<HqTier, string> = {
  1: '가설 스케치 차고지',
  2: '정밀 도면 연구소',
  3: '신약 랜드마크 타워',
};
