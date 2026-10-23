/**
 * 고정 예시(fixture) 읽기 — 저장소에 넣어 둔 **원자료**만(설계 §3.4 ② 층).
 *
 * 규칙
 * - `data/fixtures/` 에는 **각 API 가 실제로 준 응답 원문**만 둬요. 다양성 벡터 · 계면 잔기쌍 같은 **파생 값은 굽지 않아요**
 *   — 그 계산은 묶음 3 함수이고, 적재는 묶음 4 의 시드 단계예요(§7 의존 그래프).
 * - 큰 원자료(PDB · a3m · all-summary)는 **gzip 으로만 눌러** 뒀어요(내용은 손대지 않았어요). 확장자 `.gz` 면 읽을 때 풀어요.
 * - 수집 날짜는 `FIXTURE_COLLECTED_ON` 하나로 관리해서 화면 배지(`미리 받아 둔 참고 자료입니다(… 수집 · 실시간 조회 아님)`)에 그대로 나가요.
 *
 * 받아 온 명령은 `data/fixtures/README.md` 에 그대로 적어 뒀어요.
 */
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ChainRoles } from '@crista-web/web-contract';

export const FIXTURE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'data/fixtures');

/** 원자료를 받아 둔 날(§3.4 — 화면 배지에 그대로 나가요). */
export const FIXTURE_COLLECTED_ON = '2026-10-24';

/** `data/fixtures/` 안의 상대 경로를 읽어요. `.gz` 면 풀어서 문자열로 줘요. 없으면 `null`. */
export function readFixtureText(rel: string): string | null {
  const path = resolve(FIXTURE_DIR, rel);
  if (!path.startsWith(FIXTURE_DIR)) throw new Error(`fixture 경로가 폴더 밖이에요 — ${rel}`);
  let raw: Buffer;
  try {
    raw = readFileSync(path);
  } catch {
    return null;
  }
  return rel.endsWith('.gz') ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
}

/** JSON 원자료를 읽어요. 없거나 깨졌으면 `null`. */
export function readFixtureJson<T>(rel: string): T | null {
  const text = readFixtureText(rel);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ── 표적 3종 목록 ────────────────────────────────────────────────────────────

export interface FixtureChainSet extends ChainRoles {
  /** 각 사슬의 잔기 수 — RCSB GraphQL 응답(`rcsb_sample_sequence_length`)에서 그대로 옮겼어요. */
  lengths: { H: number; L?: number; AG?: number };
}

export interface FixtureTarget {
  /** 화면에 보이는 표적 이름. */
  target: string;
  targetChemblId: string;
  /** 본뜰 원본 항체. */
  parentAntibodyName: string;
  parentAntibodyChemblId: string;
  /** 참조 구조 — 모두 **항원 복합체**예요(Fab 단독 구조를 기본값으로 두지 않아요 · §2.3). */
  pdb: string;
  resolutionAngstrom: number;
  /** 체인 조 — 비대칭 단위에 복합체가 여러 벌이면 조가 둘 이상이에요(§2.3). 계면 파싱은 `sets[0]` 으로만 해요. */
  sets: readonly FixtureChainSet[];
  files: {
    mechanism: string;
    molecules: string;
    molecule: string;
    pdb: string;
    msa?: string;
    numbering?: string;
    foldFv?: string;
    foldScfv?: string;
  };
}

/**
 * 원본 Fv 를 전장 Fab 사슬에서 자를 때 쓰는 불변 영역 머리 서열.
 * 노트북처럼 길이를 상수로 박지 않고 **불변 영역 시작 모티프**로 자르고, 자른 길이를 테스트로 고정해요.
 */
export const CH1_HEAD = 'ASTKGPSVFPLAP';
export const CL_KAPPA_HEAD = 'RTVAAPSVFIFPP';

export const FIXTURE_TARGETS: readonly FixtureTarget[] = [
  {
    target: 'EGFR',
    targetChemblId: 'CHEMBL203',
    parentAntibodyName: 'CETUXIMAB',
    parentAntibodyChemblId: 'CHEMBL1201577',
    pdb: '1YY9',
    resolutionAngstrom: 2.605,
    sets: [{ set: '1', H: 'D', L: 'C', AG: 'A', lengths: { H: 221, L: 213, AG: 624 } }],
    files: {
      mechanism: 'chembl/mechanism-CHEMBL203.json',
      molecules: 'chembl/molecules-CHEMBL203.json',
      molecule: 'chembl/molecule-CHEMBL1201577.json',
      pdb: 'rcsb/1YY9.pdb.gz',
      msa: 'colabfold/1YY9-H-uniref.a3m.gz',
      numbering: 'sabdab/similarity-1YY9.json',
      foldFv: 'esmfold/1YY9-H-fv.pdb.gz',
      foldScfv: 'esmfold/1YY9-scfv.pdb.gz',
    },
  },
  {
    target: 'HER2',
    targetChemblId: 'CHEMBL1824',
    parentAntibodyName: 'TRASTUZUMAB',
    parentAntibodyChemblId: 'CHEMBL1201585',
    pdb: '1N8Z',
    resolutionAngstrom: 2.52,
    sets: [{ set: '1', H: 'B', L: 'A', AG: 'C', lengths: { H: 220, L: 214, AG: 607 } }],
    files: {
      mechanism: 'chembl/mechanism-CHEMBL1824.json',
      molecules: 'chembl/molecules-CHEMBL1824.json',
      molecule: 'chembl/molecule-CHEMBL1201585.json',
      pdb: 'rcsb/1N8Z.pdb.gz',
    },
  },
  {
    target: 'VEGFR2',
    targetChemblId: 'CHEMBL279',
    // 베바시주맙 · 1BJ1 은 **리간드(VEGF-A) 중화** 항체라 `CHEMBL279` 기전 조회에 나오지 않아요(§2.3) — 라무시루맙 · 3S37 을 써요.
    parentAntibodyName: 'RAMUCIRUMAB',
    parentAntibodyChemblId: 'CHEMBL1743062',
    pdb: '3S37',
    resolutionAngstrom: 2.7,
    sets: [{ set: '1', H: 'H', L: 'L', AG: 'X', lengths: { H: 221, L: 214, AG: 122 } }],
    files: {
      mechanism: 'chembl/mechanism-CHEMBL279.json',
      molecules: 'chembl/molecules-CHEMBL279.json',
      molecule: 'chembl/molecule-CHEMBL1743062.json',
      pdb: 'rcsb/3S37.pdb.gz',
    },
  },
];

export function fixtureTarget(targetChemblId: string): FixtureTarget | null {
  return FIXTURE_TARGETS.find((t) => t.targetChemblId === targetChemblId) ?? null;
}

export function fixtureByPdb(pdb: string): FixtureTarget | null {
  const want = pdb.trim().toUpperCase();
  return FIXTURE_TARGETS.find((t) => t.pdb === want) ?? null;
}

export function fixtureByAntibody(moleculeChemblId: string): FixtureTarget | null {
  return FIXTURE_TARGETS.find((t) => t.parentAntibodyChemblId === moleculeChemblId) ?? null;
}

/**
 * 보조 예시 — EGFR·파니투무맙 `5SX4` 는 비대칭 단위에 복합체가 **2벌**이에요.
 * 지금은 RCSB GraphQL 응답만 fixture 에 있고(구조 파일은 받아 두지 않았어요), '체인 조' 처리를 시험하는 데 써요.
 */
export const FIXTURE_MULTI_SET_PDB = '5SX4';
