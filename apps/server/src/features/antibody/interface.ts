/**
 * 계면 잔기쌍 — PDB 좌표에서 **중원자 거리 ≤ 4.5Å** 로 맞닿은 항체–항원 잔기쌍을 뽑아요(§3.2 · §4.1a).
 *
 * 이 파일은 **표적 · 체인 조마다 한 번만** 돌려요. 결과는 시드(묶음 4)가 DB 에 넣고,
 * 요청 경로에서는 PDB 를 다시 받지 않아요.
 *
 * 정직성(§3.5): 여기서 나온 쌍 집합은 `bind-score.ts` 가 Miyazawa-Jernigan 통계표로 더하는 재료예요.
 * MJ 의 접촉 정의(측쇄 중심 약 6.5Å · 쌍당 1회)와 여기 4.5Å 중원자 정의가 **다르다**는 점이
 * 결과에 단위를 붙이지 못하는 이유예요.
 *
 * 결정성: 파일 글자만 읽어요. 네트워크 · 시각 · 난수를 쓰지 않아요.
 */
import type { AbChain, ChainRoles } from '@crista-web/web-contract';
import { INTERFACE_CUTOFF_ANGSTROM } from './constants.ts';

/** PDB 3글자 잔기 이름 → 1글자. 표에 없는 이름(물 · 리간드 · 변형 잔기)은 건너뛰어요. */
const THREE_TO_ONE: Readonly<Record<string, string>> = {
  ALA: 'A',
  ARG: 'R',
  ASN: 'N',
  ASP: 'D',
  CYS: 'C',
  GLN: 'Q',
  GLU: 'E',
  GLY: 'G',
  HIS: 'H',
  ILE: 'I',
  LEU: 'L',
  LYS: 'K',
  MET: 'M',
  PHE: 'F',
  PRO: 'P',
  SER: 'S',
  THR: 'T',
  TRP: 'W',
  TYR: 'Y',
  VAL: 'V',
  MSE: 'M',
};

interface Residue {
  chainId: string;
  resi: number;
  insertion: string;
  aa: string;
  /** 중원자 좌표만(수소는 빼요). */
  atoms: number[];
}

/** PDB `ATOM` 줄 한 개 — 열 위치는 PDB 형식 규격 그대로예요. */
const parseAtomLine = (line: string) => {
  const altLoc = line.slice(16, 17);
  // 대체 위치가 여럿이면 첫 번째(`A`)만 써요 — 결과가 파일 순서에 흔들리지 않게요.
  if (altLoc !== ' ' && altLoc !== 'A') return null;
  const resName = line.slice(17, 20).trim();
  const aa = THREE_TO_ONE[resName];
  if (!aa) return null;
  const element = line.slice(76, 78).trim() || line.slice(12, 16).trim().replace(/[^A-Za-z]/g, '').slice(0, 1);
  if (element === 'H' || element === 'D') return null;
  const x = Number(line.slice(30, 38));
  const y = Number(line.slice(38, 46));
  const z = Number(line.slice(46, 54));
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  const resi = Number(line.slice(22, 26));
  if (!Number.isFinite(resi)) return null;
  return { chainId: line.slice(21, 22), resi, insertion: line.slice(26, 27).trim(), aa, x, y, z };
};

/** PDB 글자 → 사슬별 잔기 목록. **첫 번째 모델만** 읽어요(NMR 다중 모델에서 결과가 갈리지 않게요). */
export const parseResidues = (pdbText: string): Map<string, Residue[]> => {
  const chains = new Map<string, Residue[]>();
  const index = new Map<string, Residue>();
  let model = 0;
  for (const line of pdbText.split('\n')) {
    if (line.startsWith('MODEL')) {
      model += 1;
      if (model > 1) break;
      continue;
    }
    if (line.startsWith('ENDMDL')) break;
    if (!line.startsWith('ATOM')) continue;
    const atom = parseAtomLine(line);
    if (!atom) continue;
    const key = `${atom.chainId}|${atom.resi}|${atom.insertion}`;
    let residue = index.get(key);
    if (!residue) {
      residue = {
        chainId: atom.chainId,
        resi: atom.resi,
        insertion: atom.insertion,
        aa: atom.aa,
        atoms: [],
      };
      index.set(key, residue);
      const list = chains.get(atom.chainId);
      if (list) list.push(residue);
      else chains.set(atom.chainId, [residue]);
    }
    residue.atoms.push(atom.x, atom.y, atom.z);
  }
  return chains;
};

export interface InterfacePair {
  /** 항체 사슬 — 중쇄 · 경쇄. */
  chain: AbChain;
  /** 1부터 세는 **파싱한 사슬 서열 자리**(`chainSeq` 축)예요. */
  pos: number;
  /** PDB 가 쓰는 잔기 번호 · 삽입문자 — 사람이 PDB 를 열어 확인할 수 있게 함께 들고 다녀요. */
  resi: number;
  insertion: string;
  aa: string;
  agResi: number;
  agInsertion: string;
  agAa: string;
  /** 가장 가까운 중원자 쌍 거리(Å) — 소수점 두 자리로 자른 값이에요. */
  dist: number;
}

export interface InterfaceResult {
  /** 복합체가 여러 벌인 PDB 에서 어느 조인지예요. */
  set: string;
  roles: ChainRoles;
  pairs: InterfacePair[];
  /** 파싱한 사슬 서열 — `pos` 축의 기준이에요. */
  chainSeq: { H: string; L?: string; AG: string };
}

const minDistance = (a: Residue, b: Residue): number => {
  let best = Infinity;
  for (let i = 0; i < a.atoms.length; i += 3) {
    const ax = a.atoms[i] as number;
    const ay = a.atoms[i + 1] as number;
    const az = a.atoms[i + 2] as number;
    for (let j = 0; j < b.atoms.length; j += 3) {
      const dx = ax - (b.atoms[j] as number);
      const dy = ay - (b.atoms[j + 1] as number);
      const dz = az - (b.atoms[j + 2] as number);
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < best) best = d2;
    }
  }
  return Math.sqrt(best);
};

/**
 * 계면 잔기쌍 집합 `C` — `roles` 가 가리키는 항체 사슬(H · L)과 항원 사슬(AG) 사이에서
 * 중원자 거리가 `INTERFACE_CUTOFF_ANGSTROM`(4.5Å) 이하인 잔기쌍을 전부 모아요.
 * 사슬을 못 찾으면 `null` — 없는 쌍을 꾸미지 않아요.
 */
export const interfacePairs = (pdbText: string, roles: ChainRoles): InterfaceResult | null => {
  if (!roles.AG) return null;
  const chains = parseResidues(pdbText);
  const ag = chains.get(roles.AG);
  const heavy = chains.get(roles.H);
  if (!ag || !heavy) return null;
  const light = roles.L ? chains.get(roles.L) : undefined;

  const pairs: InterfacePair[] = [];
  const abChains: { chain: AbChain; residues: Residue[] }[] = [{ chain: 'H', residues: heavy }];
  if (light) abChains.push({ chain: 'L', residues: light });

  for (const { chain, residues } of abChains) {
    for (let i = 0; i < residues.length; i += 1) {
      const ab = residues[i] as Residue;
      for (const agRes of ag) {
        const dist = minDistance(ab, agRes);
        if (dist > INTERFACE_CUTOFF_ANGSTROM) continue;
        pairs.push({
          chain,
          pos: i + 1,
          resi: ab.resi,
          insertion: ab.insertion,
          aa: ab.aa,
          agResi: agRes.resi,
          agInsertion: agRes.insertion,
          agAa: agRes.aa,
          dist: Number(dist.toFixed(2)),
        });
      }
    }
  }

  // 파일 순서가 아니라 사슬 · 자리 · 항원 자리 순으로 늘 같게 늘어놓아요.
  pairs.sort((a, b) =>
    a.chain !== b.chain ? (a.chain < b.chain ? -1 : 1) : a.pos !== b.pos ? a.pos - b.pos : a.agResi - b.agResi,
  );

  const seqOf = (residues: Residue[]): string => residues.map((r) => r.aa).join('');
  const chainSeq: InterfaceResult['chainSeq'] = { H: seqOf(heavy), AG: seqOf(ag) };
  if (light) chainSeq.L = seqOf(light);

  return { set: roles.set, roles, pairs, chainSeq };
};

/** 어느 자리들이 계면에 있는지 — `score.ts` 의 유효 변이 판정에 써요. */
export const interfacePositions = (pairs: readonly InterfacePair[]): Set<string> => {
  const set = new Set<string>();
  for (const p of pairs) set.add(`${p.chain}:${p.pos}`);
  return set;
};

/**
 * 파싱한 PDB 사슬 자리를 **학생이 편집하는 Fv 서열 자리**로 옮겨요.
 *
 * PDB 사슬은 Fab 전체(경쇄 213 잔기처럼)이고, **좌표가 없는 잔기**가 끼어 있을 수 있어요
 * (실측: `3S37` 은 H · L 둘 다 맨 앞 한 잔기가 안 보여요). 그래서 자리를 그냥 밀어 맞추면 어긋나요.
 * Fv 를 **전부** 맞추고 사슬 쪽 앞 · 뒤는 공짜로 두는 정렬(semi-global)로 자리를 하나씩 이어요.
 * 동일성이 90% 미만이면 `null` — 어긋난 자리로 변이를 매기지 않아요.
 */
const MATCH = 1;
const MISMATCH = -1;
const GAP = -2;

export const alignChainToFv = (chainSeq: string, fvSeq: string): (number | null)[] | null => {
  const m = fvSeq.length;
  const n = chainSeq.length;
  if (m === 0 || n === 0) return null;
  const width = n + 1;
  const dp = new Float64Array((m + 1) * width);
  const from = new Uint8Array((m + 1) * width);
  for (let j = 0; j <= n; j += 1) dp[j] = 0; // 사슬 앞쪽은 공짜
  for (let i = 1; i <= m; i += 1) {
    dp[i * width] = (dp[(i - 1) * width] as number) + GAP;
    from[i * width] = 1;
  }
  for (let i = 1; i <= m; i += 1) {
    const fi = fvSeq[i - 1] as string;
    for (let j = 1; j <= n; j += 1) {
      const diag = (dp[(i - 1) * width + j - 1] as number) + (fi === chainSeq[j - 1] ? MATCH : MISMATCH);
      const up = (dp[(i - 1) * width + j] as number) + GAP;
      const left = (dp[i * width + j - 1] as number) + GAP;
      let best = diag;
      let move = 0;
      if (up > best) {
        best = up;
        move = 1;
      }
      if (left > best) {
        best = left;
        move = 2;
      }
      dp[i * width + j] = best;
      from[i * width + j] = move;
    }
  }
  let bestJ = 0;
  let bestScore = dp[m * width] as number;
  for (let j = 1; j <= n; j += 1) {
    const v = dp[m * width + j] as number;
    if (v > bestScore) {
      bestScore = v;
      bestJ = j;
    }
  }
  const chainToFv = new Array<number | null>(n).fill(null);
  let match = 0;
  let i = m;
  let j = bestJ;
  while (i > 0 && j >= 0) {
    const move = from[i * width + j] as number;
    if (move === 0) {
      chainToFv[j - 1] = i;
      if (fvSeq[i - 1] === chainSeq[j - 1]) match += 1;
      i -= 1;
      j -= 1;
    } else if (move === 1) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  if (match / m < 0.9) return null;
  return chainToFv;
};

/**
 * `interfacePairs` 결과의 `pos` 를 Fv 자리로 다시 매긴 쌍 — Fv 밖으로 나가는 쌍은 빼요.
 * 사슬을 Fv 에 못 맞추면 `null` 이에요.
 */
export const toFvPairs = (
  result: InterfaceResult,
  fv: { H: string; L?: string },
): InterfacePair[] | null => {
  const maps: Partial<Record<AbChain, (number | null)[]>> = {};
  const h = alignChainToFv(result.chainSeq.H, fv.H);
  if (!h) return null;
  maps.H = h;
  if (fv.L && result.chainSeq.L) {
    const l = alignChainToFv(result.chainSeq.L, fv.L);
    if (!l) return null;
    maps.L = l;
  }
  const out: InterfacePair[] = [];
  for (const pair of result.pairs) {
    const map = maps[pair.chain];
    if (!map) continue;
    const pos = map[pair.pos - 1];
    if (pos === null || pos === undefined) continue;
    const fvSeq = pair.chain === 'H' ? fv.H : fv.L;
    if (!fvSeq) continue;
    out.push({ ...pair, pos, aa: fvSeq[pos - 1] as string });
  }
  out.sort((a, b) =>
    a.chain !== b.chain ? (a.chain < b.chain ? -1 : 1) : a.pos !== b.pos ? a.pos - b.pos : a.agResi - b.agResi,
  );
  return out;
};
