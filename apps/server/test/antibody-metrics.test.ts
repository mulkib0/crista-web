/**
 * 항체 랩 지표 순수 함수 — 번호 매김 · CDR · 다양성 · 약점 모티프 · 전하 · 기름진 겉면 · 사람 유전자 동일성 ·
 * 계면 잔기쌍 · 표적별 σ · 제안 받기(설계 §3.2 · §4.1 · 묶음 3).
 *
 * 모두 **순수 함수**예요 — 이 파일은 네트워크 · DB · 시각 · 난수를 쓰지 않아요.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { AMINO_ACIDS, DIVERSITY_LOCK_PERCENTILE } from '@crista-web/web-contract';
import type { AbChain, CdrSpan } from '@crista-web/web-contract';
import {
  AA20,
  CDR_IMGT,
  CDR_KABAT_AXIS,
  CHAIN_CHARGE_PH,
  CDR_TOTAL_LENGTH_REFERENCE_QUANTILES,
  CHAIN_CHARGE_PRODUCT_REFERENCE_QUANTILES,
  GREASY_REFERENCE_QUANTILES,
  POSITIVE_PATCH_MIN_DENSITY,
  POSITIVE_PATCH_REFERENCE_QUANTILES,
  QUANTILE_KNOTS,
  TARGET_CALIBRATION,
  kdNormalized,
  percentileFromQuantiles,
} from '../src/features/antibody/constants.ts';
import { MJ_ORDER, mjContact, mjContactCount, mjTransfer } from '../src/features/antibody/data/mj1996.ts';
import { GERMLINE, germlineSet } from '../src/features/antibody/data/germline.ts';
import {
  acidicDensity,
  basicDensity,
  chainChargeProduct,
  isoelectricPoint,
  isoelectricPoints,
  netCharge,
  simpleCharge,
} from '../src/features/antibody/charge.ts';
import {
  cdrVicinityPositions,
  greasySurface,
  isPositivePatch,
  negativePatchDensity,
  positivePatchDensity,
} from '../src/features/antibody/greasy.ts';
import { findLiabilities } from '../src/features/antibody/liabilities.ts';
import { alignToGermline, germlineIdentity } from '../src/features/antibody/germline-identity.ts';
import {
  NumberingAxisError,
  cdr3ImgtSlots,
  cdrSpans,
  cdrSpansFallback,
  contractNumberingSource,
  numberByGermline,
  numberFromSabdab,
  resolveNumbering,
  schemeAxis,
} from '../src/features/antibody/numbering.ts';
import {
  columnEntropy,
  diversityFromA3m,
  isLocked,
  parseA3m,
  percentileToGrade,
  ranksToPercentiles,
} from '../src/features/antibody/diversity.ts';
import {
  alignChainToFv,
  interfacePairs,
  interfacePositions,
  parseResidues,
  toFvPairs,
} from '../src/features/antibody/interface.ts';
import { sigmaTarget, type MutablePosition } from '../src/features/antibody/sigma.ts';
import { suggestVariants } from '../src/features/antibody/suggest.ts';

// ── 시험용 서열(실측) ────────────────────────────────────────────────────────

/** 트라스투주맙 VH · VL — Thera-SAbDab(2026-10-24 내림). 설계 §3.2 가 적은 IMGT 참고값의 주인공이에요. */
const TRAS_VH =
  'EVQLVESGGGLVQPGGSLRLSCAASGFNIKDTYIHWVRQAPGKGLEWVARIYPTNGYTRYADSVKGRFTISADTSKNTAYLQMNSLRAEDTAVYYCSRWGGDGFYAMDYWGQGTLVTVSS';
const TRAS_VL =
  'DIQMTQSPSSLSASVGDRVTITCRASQDVNTAVAWYQQKPGKAPKLLIYSASFLYSGVPSRFSGSRSGTDFTLTISSLQPEDFATYYCQQHYTTPPTFGQGTKVEIK';

// ── MJ 1996 표 ───────────────────────────────────────────────────────────────

describe('MJ 1996 접촉 통계표', () => {
  test('원자료 순서 · 대칭 · 설계 §4.1a 가 적은 값과 같다', () => {
    assert.equal(MJ_ORDER, 'ARNDCQEGHILKMFPSTWYV');
    // 설계 §4.1(a): `K↔E = −1.04` · `R↔D = −0.89`
    assert.equal(mjContact('K', 'E'), -1.04);
    assert.equal(mjContact('E', 'K'), -1.04);
    assert.equal(mjContact('R', 'D'), -0.89);
    assert.equal(mjContact('D', 'R'), -0.89);
    for (const a of AA20) for (const b of AA20) assert.equal(mjContact(a, b), mjContact(b, a));
  });

  test('20종 밖 글자는 null — 없는 값을 0 으로 꾸미지 않는다', () => {
    assert.equal(mjContact('X', 'A'), null);
    assert.equal(mjContact('A', '-'), null);
    assert.equal(mjContact('', 'A'), null);
  });

  test('참고 표 두 개도 함께 들고 있다(점수에는 쓰지 않는다)', () => {
    assert.equal(mjTransfer('K', 'E'), -1.8);
    assert.equal(mjContactCount('R', 'D'), 8981);
  });

  test('매몰환경 표에서 접촉 1쌍이 얻을 수 있는 가장 좋은 값은 K↔E 의 −1.04 다', () => {
    let min = 0;
    for (const a of AA20) for (const b of AA20) min = Math.min(min, mjContact(a, b) as number);
    assert.equal(min, -1.04);
  });
});

// ── germline 자료 ────────────────────────────────────────────────────────────

describe('germline V 유전자 표', () => {
  test('IMGT 간격 표기라서 문자 자리가 곧 IMGT 번호다', () => {
    const ighv = GERMLINE.H.find((g) => g.allele === 'IGHV1-18*01');
    assert.ok(ighv);
    // IMGT 23 · 104 는 보존 Cys 자리예요.
    assert.equal(ighv.gapped[22], 'C');
    assert.equal(ighv.gapped[103], 'C');
  });

  test('세 집합이 비어 있지 않고 경쇄는 kappa · lambda 를 함께 본다', () => {
    assert.ok(GERMLINE.H.length > 100);
    assert.ok(GERMLINE.K.length > 50);
    assert.ok(GERMLINE.L.length > 50);
    assert.equal(germlineSet('L').length, GERMLINE.K.length + GERMLINE.L.length);
    assert.equal(germlineSet('H').length, GERMLINE.H.length);
  });

  test('간격과 20종 글자만 들어 있다', () => {
    for (const chain of ['H', 'K', 'L'] as const) {
      for (const entry of GERMLINE[chain]) {
        assert.match(entry.allele, /^IG[HKL]V/);
        assert.match(entry.gapped, /^[ACDEFGHIKLMNPQRSTVWY.]+$/);
      }
    }
  });
});

// ── 전하 · pI ────────────────────────────────────────────────────────────────

describe('순전하 · pI · 두 사슬 전하 궁합', () => {
  test('폴리-K 는 양전하 · 폴리-E 는 음전하', () => {
    assert.ok(netCharge('KKKKKKKKKK', 7) > 8);
    assert.ok(netCharge('EEEEEEEEEE', 7) < -8);
  });

  test('pI 는 순전하가 0 이 되는 pH 이고 Bjellqvist 범위 안이다', () => {
    const pi = isoelectricPoint(TRAS_VH);
    assert.ok(pi > 3 && pi < 11, `pi=${pi}`);
    assert.ok(Math.abs(netCharge(TRAS_VH, pi)) < 0.05);
    assert.ok(isoelectricPoint('KKKKKKKKKK') > 10);
    assert.ok(isoelectricPoint('EEEEEEEEEE') < 5);
  });

  test('pI 점수 밴드에 구간이 끊긴 자리가 없다', () => {
    assert.equal(isoelectricPoints(7.5), 100);
    assert.equal(isoelectricPoints(5.5), 70);
    assert.equal(isoelectricPoints(9.5), 70);
    assert.equal(isoelectricPoints(4.0), 40);
    assert.equal(isoelectricPoints(12.0), 40);
    for (let pi = 0; pi <= 14; pi += 0.1) assert.ok(isoelectricPoints(Number(pi.toFixed(1))) > 0);
  });

  test('두 사슬 전하 궁합은 pH 5.5 간단 전하의 곱 · 경쇄가 없으면 null', () => {
    assert.equal(CHAIN_CHARGE_PH, 5.5);
    // D/E −1 · K/R +1 · H +0.1
    assert.equal(simpleCharge('KKDE'), 0);
    assert.equal(simpleCharge('KKK'), 3);
    assert.equal(simpleCharge('H'), 0.1);
    assert.equal(chainChargeProduct('KKK', 'DDD'), -9);
    assert.equal(chainChargeProduct('KKK'), null);
    assert.equal(chainChargeProduct('KKK', ''), null);
  });

  test('전하 밀도는 창 안의 비율이다', () => {
    assert.equal(basicDensity('KRAAAAAAA'), 2 / 9);
    assert.equal(acidicDensity('DEAAAAAAA'), 2 / 9);
    assert.equal(basicDensity(''), 0);
  });

  test('빈 서열에서도 던지지 않는다', () => {
    assert.equal(netCharge('', 7), 0);
    assert.equal(isoelectricPoint(''), 7);
  });
});

// ── 번호 매김 · CDR ──────────────────────────────────────────────────────────

describe('번호 매김 → CDR 구간', () => {
  test('IMGT 축 상수는 27-38 · 56-65 · 105-117 이다(설계 §3.2)', () => {
    assert.deepEqual(CDR_IMGT[1], { start: 27, end: 38 });
    assert.deepEqual(CDR_IMGT[2], { start: 56, end: 65 });
    assert.deepEqual(CDR_IMGT[3], { start: 105, end: 117 });
  });

  test('Kabat 축 표는 IMGT 숫자와 섞이지 않았다 — 삽입문자 끝자리를 그대로 들고 있다', () => {
    assert.equal(schemeAxis('imgt'), 'imgt');
    for (const scheme of ['kabat', 'chothia', 'abm', 'contact'] as const) assert.equal(schemeAxis(scheme), 'kabat');
    assert.deepEqual(CDR_KABAT_AXIS.kabat.H[1], { start: { num: 31, insertion: '' }, end: { num: 35, insertion: 'B' } });
    assert.deepEqual(CDR_KABAT_AXIS.chothia.H[1], { start: { num: 26, insertion: '' }, end: { num: 32, insertion: '' } });
    assert.deepEqual(CDR_KABAT_AXIS.abm.H[2], { start: { num: 50, insertion: '' }, end: { num: 58, insertion: '' } });
    assert.deepEqual(CDR_KABAT_AXIS.contact.H[3], { start: { num: 93, insertion: '' }, end: { num: 101, insertion: '' } });
    assert.deepEqual(CDR_KABAT_AXIS.kabat.L[3], { start: { num: 89, insertion: '' }, end: { num: 97, insertion: '' } });
    // IMGT 축 숫자가 Kabat 표에 들어오지 않았는지 — 105-117 은 Kabat 축에 없는 범위예요.
    for (const scheme of ['kabat', 'chothia', 'abm', 'contact'] as const) {
      for (const chain of ['H', 'L'] as const) {
        for (const cdr of [1, 2, 3] as const) {
          assert.ok(CDR_KABAT_AXIS[scheme][chain][cdr].end.num <= 102);
        }
      }
    }
  });

  test('germline 경로가 트라스투주맙의 IMGT CDR 을 실측과 같게 끊는다(설계 §3.2 참고값)', () => {
    const h = resolveNumbering({ seq: TRAS_VH, chain: 'H', scheme: 'imgt' });
    const l = resolveNumbering({ seq: TRAS_VL, chain: 'L', scheme: 'imgt' });
    assert.equal(h.method, 'germline-anchored');
    const seqOf = (r: typeof h, cdr: 1 | 2 | 3): string | undefined => r.cdrs.find((c) => c.cdr === cdr)?.seq;
    assert.equal(seqOf(h, 1), 'GFNIKDTY'); // 설계 §3.2: trastuzumab H1 `GFNIKDTY`(8)
    assert.equal(seqOf(h, 2), 'IYPTNGYT'); // 설계 §3.2: H2 `IYPTNGYT`(8)
    assert.equal(seqOf(h, 3), 'SRWGGDGFYAMDY');
    const total = [...h.cdrs, ...l.cdrs].reduce((s, c) => s + c.seq.length, 0);
    assert.equal(total, 47); // 설계 §3.2: Total IMGT CDR Length 47
  });

  test('`start`·`end` 는 1부터 세는 서열 자리이고 `seq` 와 아귀가 맞는다', () => {
    const h = resolveNumbering({ seq: TRAS_VH, chain: 'H', scheme: 'imgt' });
    for (const c of h.cdrs) {
      assert.equal(TRAS_VH.slice(c.start - 1, c.end), c.seq);
      assert.equal(c.end - c.start + 1, c.seq.length);
    }
  });

  test('SAbDab2 번호가 1순위 · 번호 수가 서열 길이와 다르면 쓰지 않는다', () => {
    const seq = 'QVQLV';
    assert.equal(numberFromSabdab(seq, 'H', [[1, ''], [2, '']]), null);
    const ok = numberFromSabdab(seq, 'H', [[1, ''], [2, ''], [3, ''], [4, ''], [5, '']]);
    assert.ok(ok);
    assert.equal(ok.method, 'sabdab');
    assert.equal(ok.axis, 'imgt');
    assert.equal(contractNumberingSource('sabdab'), 'sabdab');
  });

  test('SAbDab2 번호를 받으면 germline 경로를 쓰지 않는다', () => {
    const numbering = (numberByGermline(TRAS_VH, 'H') as NonNullable<ReturnType<typeof numberByGermline>>).residues;
    const full: [number, string][] = [];
    for (let pos = 1; pos <= TRAS_VH.length; pos += 1) {
      const r = numbering.find((x) => x.pos === pos);
      full.push(r ? [r.num, r.insertion] : [200 + pos, '']);
    }
    const resolved = resolveNumbering({ seq: TRAS_VH, chain: 'H', scheme: 'imgt', sabdabNumbering: full });
    assert.equal(resolved.method, 'sabdab');
    assert.equal(resolved.cdrs.find((c) => c.cdr === 1)?.seq, 'GFNIKDTY');
  });

  test('번호축이 안 맞으면 계산하지 않고 거절한다', () => {
    const chain = numberByGermline(TRAS_VH, 'H');
    assert.ok(chain);
    assert.throws(() => cdrSpans(chain, 'kabat'), NumberingAxisError);
    assert.throws(() => cdrSpans(chain, 'chothia'), NumberingAxisError);
    assert.doesNotThrow(() => cdrSpans(chain, 'imgt'));
  });

  test('IMGT 축으로 Kabat 스킴을 부르면 보정 정규식으로 강등된다', () => {
    const r = resolveNumbering({ seq: TRAS_VL, chain: 'L', scheme: 'kabat' });
    assert.equal(r.method, 'regex-fallback');
    assert.equal(r.source, 'regex-fallback');
    assert.match(r.note, /경계가 틀릴 수 있어요/);
  });

  test('CDR3 자리 번호는 13칸에 길이를 맞추고 넘치면 삽입문자를 붙인다', () => {
    assert.equal(cdr3ImgtSlots(13).length, 13);
    assert.deepEqual(cdr3ImgtSlots(13).map((s) => s.num), [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117]);
    // 짧으면 가운데(111 · 112)부터 비워요.
    assert.ok(!cdr3ImgtSlots(11).some((s) => s.num === 111 || s.num === 112));
    assert.equal(cdr3ImgtSlots(0).length, 0);
    const long = cdr3ImgtSlots(16);
    assert.equal(long.length, 16);
    assert.equal(long.filter((s) => s.insertion !== '').length, 3);
  });

  test('보정 정규식은 FR4 모티프 앞의 _마지막_ Cys 를 앵커로 쓴다 — 1판 식과 결과가 다르다', () => {
    const fb = cdrSpansFallback(TRAS_VH, 'H', 'imgt');
    assert.equal(fb.cdrs.find((c) => c.cdr === 3)?.seq, 'SRWGGDGFYAMDY');
    assert.equal(fb.source, 'regex-fallback');
    // 1판 식은 FR1 의 Cys(IMGT 23)에 걸려 80 잔기 넘는 구간을 잡았어요.
    const first = /C[A-Z]{2}(.*?)WG[A-Z]G/.exec(TRAS_VH);
    assert.ok(first);
    assert.ok((first[1] as string).length > 60);
    assert.notEqual(first[1], 'SRWGGDGFYAMDY');
  });

  test('보정 정규식은 IMGT 축에서 CDR1 · CDR2 를 지어내지 않는다', () => {
    const fb = cdrSpansFallback(TRAS_VH, 'H', 'imgt');
    assert.deepEqual(fb.missing, [1, 2]);
    assert.ok(!fb.cdrs.some((c) => c.cdr === 1 || c.cdr === 2));
  });

  test('Kabat 스킴을 고른 경우에만 경쇄 L1 규칙을 쓴다', () => {
    const kabat = cdrSpansFallback(TRAS_VL, 'L', 'kabat');
    assert.ok(kabat.cdrs.some((c) => c.cdr === 1));
    const imgt = cdrSpansFallback(TRAS_VL, 'L', 'imgt');
    assert.ok(!imgt.cdrs.some((c) => c.cdr === 1));
  });

  test('번호를 전혀 못 구하는 서열은 강등되고 CDR 을 지어내지 않는다', () => {
    const junk = AMINO_ACIDS.repeat(6);
    const r = resolveNumbering({ seq: junk, chain: 'H', scheme: 'imgt' });
    assert.equal(r.method, 'regex-fallback');
    assert.deepEqual(r.missing, [1, 2, 3]);
    assert.equal(r.cdrs.length, 0);
  });
});

// ── 사람 유전자 동일성 ───────────────────────────────────────────────────────

describe('사람 유전자 동일성', () => {
  test('FR1 · FR2 · FR3 만 세고 FR4 는 세지 않는다', () => {
    const aligned = alignToGermline(TRAS_VH, 'H');
    assert.ok(aligned);
    assert.deepEqual(aligned.frameworks.map((f) => f.label), ['FR1', 'FR2', 'FR3']);
    assert.ok(!aligned.frameworks.some((f) => (f.label as string) === 'FR4'));
  });

  test('인간화 항체는 높은 동일성 · 가장 가까운 allele 이름을 돌려준다', () => {
    const h = germlineIdentity(TRAS_VH, 'H');
    assert.ok(h);
    assert.match(h.nearestGermline, /^IGHV/);
    assert.ok(h.percent >= 85, `percent=${h.percent}`);
    const l = germlineIdentity(TRAS_VL, 'L');
    assert.ok(l);
    assert.match(l.nearestGermline, /^IG[KL]V/);
  });

  test('너무 짧은 서열은 null — 없는 값을 꾸미지 않는다', () => {
    assert.equal(germlineIdentity('QVQLV', 'H'), null);
    assert.equal(alignToGermline('', 'H'), null);
  });

  test('같은 서열이면 늘 같은 allele 을 고른다', () => {
    const a = germlineIdentity(TRAS_VH, 'H');
    const b = germlineIdentity(TRAS_VH, 'H');
    assert.deepEqual(a, b);
  });
});

// ── 약점 모티프 ──────────────────────────────────────────────────────────────

describe('약점 모티프', () => {
  const span = (chain: AbChain, cdr: 1 | 2 | 3, start: number, end: number, seq: string): CdrSpan => ({
    chain,
    cdr,
    scheme: 'imgt',
    start,
    end,
    seq,
  });

  test('CDR 안 모티프만 센다 — 같은 모티프가 틀 서열에 있으면 세지 않는다', () => {
    const vh = 'AANGAAAAAANGAA';
    const cdrs = [span('H', 1, 3, 4, 'NG')];
    const hits = findLiabilities(vh, undefined, cdrs).hits.filter((h) => h.motif === 'N[GS]');
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.pos, 3);
    assert.equal(hits[0]?.severity, 'high');
    assert.equal(hits[0]?.cdr, 1);
  });

  test('CDR 을 모르면 CDR 범위 규칙을 아예 세지 않는다', () => {
    const report = findLiabilities('AANGAA', undefined, []);
    assert.ok(!report.hits.some((h) => h.motif === 'N[GS]'));
  });

  test('N-당화 자리는 Fv 전체에서 센다', () => {
    const report = findLiabilities('AAANASAAA', undefined, []);
    const hit = report.hits.find((h) => h.motif === 'N[^P][ST]');
    assert.ok(hit);
    assert.equal(hit.fixable, 'hard');
    // `N[^P][ST]` 는 P 가 끼면 세지 않아요.
    assert.ok(!findLiabilities('AAANPSAAA', undefined, []).hits.some((h) => h.motif === 'N[^P][ST]'));
  });

  test('Cys 개수가 홀수면 감점 · 보존 Cys 결손을 알려 주면 감점', () => {
    assert.ok(findLiabilities('AACAA', undefined, []).hits.some((h) => h.motif === 'Cys 개수 홀수'));
    assert.ok(!findLiabilities('AACACA', undefined, []).hits.some((h) => h.motif === 'Cys 개수 홀수'));
    const missing = findLiabilities('AACACA', undefined, [], { conservedCysPresent: { H: false } });
    assert.ok(missing.hits.some((h) => h.motif === '보존 Cys 결손'));
    // 번호를 모를 때(값을 넘기지 않을 때)는 결손이라고 단정하지 않아요.
    assert.ok(!findLiabilities('AACACA', undefined, []).hits.some((h) => h.motif === '보존 Cys 결손'));
  });

  test('CDR 안 Trp · Met 은 감점이 아니라 경고만 한다(§10 S3)', () => {
    const cdrs = [span('H', 3, 1, 3, 'AWM')];
    const report = findLiabilities('AWM', undefined, cdrs);
    assert.equal(report.watches.length, 2);
    assert.ok(!report.hits.some((h) => h.motif === 'W' || h.motif === 'M'));
    assert.equal(report.penaltyTotal, 0);
  });

  test('겹치는 모티프도 빠뜨리지 않는다', () => {
    const cdrs = [span('H', 1, 1, 4, 'NGSN')];
    const motifs = findLiabilities('NGSN', undefined, cdrs).hits.map((h) => `${h.motif}@${h.pos}`);
    assert.ok(motifs.includes('N[GS]@1'));
    assert.ok(motifs.includes('[STK]N@3'));
  });

  test('감점 합은 히트의 합이고 늘 같은 순서로 나온다', () => {
    const cdrs = [span('H', 1, 1, 6, 'NGDPTS'), span('L', 1, 1, 2, 'NG')];
    const a = findLiabilities('NGDPTS', 'NG', cdrs);
    const b = findLiabilities('NGDPTS', 'NG', cdrs);
    assert.deepEqual(a, b);
    assert.equal(
      a.penaltyTotal,
      a.hits.reduce((s, h) => s + h.penalty, 0),
    );
  });
});

// ── 기름진 겉면 · 전하 패치 ──────────────────────────────────────────────────

describe('기름진 겉면 정도 · 전하 패치', () => {
  const span = (chain: AbChain, cdr: 1 | 2 | 3, start: number, end: number, seq: string): CdrSpan => ({
    chain,
    cdr,
    scheme: 'imgt',
    start,
    end,
    seq,
  });

  test('Kyte-Doolittle 정규화는 1~2 사이다', () => {
    for (const aa of AA20) {
      const v = kdNormalized(aa);
      assert.ok(v >= 1 && v <= 2, `${aa}=${v}`);
    }
    assert.equal(kdNormalized('I'), 2);
    assert.equal(kdNormalized('R'), 1);
  });

  test('CDR 을 모르면 null — 없는 값을 꾸미지 않는다', () => {
    assert.equal(greasySurface('IIIIIIIIII', []), null);
    assert.equal(greasySurface('', [span('H', 1, 1, 2, 'II')]), null);
  });

  test('계산 범위가 CDR 주변부로 제한된다 — 틀 서열을 길게 붙여도 값이 그대로다', () => {
    const cdr = span('H', 1, 6, 10, 'IIIII');
    const short = `RRRRRIIIIIRRRRR`;
    const long = `RRRRRIIIIIRRRRR${'A'.repeat(60)}`;
    assert.equal(greasySurface(short, [cdr]), greasySurface(long, [cdr]));
  });

  test('CDR 주변부 자리 집합은 양옆 2 자리까지다', () => {
    const set = cdrVicinityPositions(20, [span('H', 1, 10, 12, 'AAA')]);
    assert.deepEqual([...set].sort((a, b) => a - b), [8, 9, 10, 11, 12, 13, 14]);
    // 서열 끝에서 잘린다
    const edge = cdrVicinityPositions(3, [span('H', 1, 1, 3, 'AAA')]);
    assert.deepEqual([...edge].sort((a, b) => a - b), [1, 2, 3]);
  });

  test('기름진 잔기가 많으면 값이 커진다 · 같은 입력이면 같은 값이다', () => {
    const cdr = span('H', 1, 1, 10, 'x'.repeat(10));
    const greasy = greasySurface('IIIIIIIIII', [cdr]) as number;
    const polar = greasySurface('RRRRRRRRRR', [cdr]) as number;
    assert.ok(greasy > polar);
    assert.equal(greasySurface('IIIIIIIIII', [cdr]), greasy);
  });

  test('양전하 패치는 K·R 가 몰린 창의 밀도이고 문턱은 측정값이다', () => {
    const cdr = span('H', 1, 1, 12, 'x'.repeat(12));
    const hot = positivePatchDensity('KRKRKRKRKRKR', [cdr]) as number;
    const cold = positivePatchDensity('AAAAAAAAAAAA', [cdr]) as number;
    assert.ok(hot > cold);
    assert.equal(cold, 0);
    assert.ok(isPositivePatch(hot));
    assert.ok(!isPositivePatch(cold));
    assert.ok(!isPositivePatch(null));
    assert.equal(POSITIVE_PATCH_MIN_DENSITY, 0.4444);
    assert.ok((negativePatchDensity('DEDEDEDEDEDE', [cdr]) as number) > 0);
  });

  test('참조 분포는 41칸이고 늘어나는 순서다', () => {
    for (const knots of [
      GREASY_REFERENCE_QUANTILES,
      CHAIN_CHARGE_PRODUCT_REFERENCE_QUANTILES,
      POSITIVE_PATCH_REFERENCE_QUANTILES,
      CDR_TOTAL_LENGTH_REFERENCE_QUANTILES,
    ]) {
      assert.equal(knots.length, QUANTILE_KNOTS);
      for (let i = 1; i < knots.length; i += 1) assert.ok((knots[i] as number) >= (knots[i - 1] as number));
    }
  });

  test('백분위 읽기는 0~1 안에 있고 표가 없으면 null 이다', () => {
    assert.equal(percentileFromQuantiles(5, []), null);
    assert.equal(percentileFromQuantiles(-999, GREASY_REFERENCE_QUANTILES), 0);
    assert.equal(percentileFromQuantiles(999, GREASY_REFERENCE_QUANTILES), 1);
    const mid = percentileFromQuantiles(GREASY_REFERENCE_QUANTILES[20] as number, GREASY_REFERENCE_QUANTILES);
    assert.ok(mid !== null && Math.abs(mid - 0.5) < 0.05);
  });
});

// ── 레퍼토리 다양성 ──────────────────────────────────────────────────────────

describe('레퍼토리 다양성', () => {
  const A3M = [
    '>101',
    'ACDEFG',
    '>s1',
    'ACDEFa G'.replace(' ', ''),
    '>s2',
    'ACDWFG',
    '>s3',
    'ACD-FG',
    '>s4',
    'ACDYFG',
  ].join('\n');

  test('a3m 의 소문자 삽입을 지워 질의 열에 맞춘다', () => {
    const records = parseA3m(A3M);
    assert.equal(records.length, 5);
    for (const r of records) assert.equal(r.aligned.length, 6);
  });

  test('한 글자로만 된 열은 엔트로피 0 · 간격은 분포에서 뺀다', () => {
    assert.equal(columnEntropy(['A', 'A', 'A']), 0);
    assert.equal(columnEntropy(['A', '-', 'A']), 0);
    assert.equal(columnEntropy(['A']), 0);
    assert.equal(columnEntropy(['A', 'C']), 1); // 반반이면 1 bit
  });

  test('백분위는 같은 값에 같은 값을 주고 등급은 1~9 다', () => {
    const pct = ranksToPercentiles([1, 1, 2, 3]);
    assert.equal(pct[0], pct[1]);
    assert.ok((pct[3] as number) > (pct[0] as number));
    assert.equal(percentileToGrade(0), 1);
    assert.equal(percentileToGrade(1), 9);
    assert.equal(percentileToGrade(0.99), 9);
    for (let p = 0; p <= 1; p += 0.01) {
      const g = percentileToGrade(Number(p.toFixed(2)));
      assert.ok(g >= 1 && g <= 9);
    }
  });

  test('방향 규칙: 덜 갈리는 자리가 잠긴다', () => {
    assert.equal(DIVERSITY_LOCK_PERCENTILE, 0.25);
    assert.ok(isLocked(0.1));
    assert.ok(!isLocked(0.9));
    assert.ok(!isLocked(DIVERSITY_LOCK_PERCENTILE));
  });

  test('a3m → 자리별 다양성 · 갈리는 열이 가장 높은 등급을 받는다', () => {
    const d = diversityFromA3m(A3M);
    assert.ok(d);
    assert.equal(d.length, 6);
    assert.equal(d.msaDepth, 5);
    assert.equal(d.grades.length, 6);
    // 4번째 자리만 갈려요(E / G / W / - / Y) → 다양성이 가장 높아요.
    assert.equal(Math.max(...d.grades), d.grades[3]);
    assert.ok((d.percentiles[3] as number) > (d.percentiles[0] as number));
    assert.deepEqual(diversityFromA3m(A3M), d);
  });

  test('잠긴 자리는 다양성이 가장 낮은 25% 다', () => {
    // 열마다 엔트로피가 다른 모양이에요 — 실제 MSA 처럼 같은 값이 몰려 있지 않아요.
    const rows = ['>q', 'AAAAAAAA'];
    const letters = 'CDEFGHIK';
    for (let r = 0; r < 8; r += 1) {
      let line = '';
      for (let col = 0; col < 8; col += 1) line += r < col ? (letters[r] as string) : 'A';
      rows.push(`>s${r}`, line);
    }
    const d = diversityFromA3m(rows.join('\n'));
    assert.ok(d);
    // 1번 열은 아무도 갈리지 않아요 → 잠겨요. 8번 열은 가장 많이 갈려요 → 안 잠겨요.
    assert.ok(d.lockedPositions.includes(1));
    assert.ok(!d.lockedPositions.includes(8));
    for (let i = 0; i < d.percentiles.length; i += 1) {
      assert.equal(isLocked(d.percentiles[i] as number), d.lockedPositions.includes(i + 1));
    }
  });

  test('서열이 2개 미만이면 null — 하나로 다양성을 말하지 않는다', () => {
    assert.equal(diversityFromA3m('>only\nACDEFG'), null);
    assert.equal(diversityFromA3m(''), null);
  });
});

// ── 계면 잔기쌍 ──────────────────────────────────────────────────────────────

/** 읽기 쉽게 열 맞춘 PDB `ATOM` 줄을 만들어요(PDB 형식 규격 그대로). */
const atomLine = (
  serial: number,
  name: string,
  res: string,
  chain: string,
  resi: number,
  x: number,
  y: number,
  z: number,
  element: string,
  altLoc = ' ',
): string => {
  const f = (v: number): string => v.toFixed(3).padStart(8, ' ');
  return (
    'ATOM  ' +
    String(serial).padStart(5, ' ') +
    ' ' +
    name.padEnd(4, ' ') +
    altLoc +
    res.padStart(3, ' ') +
    ' ' +
    chain +
    String(resi).padStart(4, ' ') +
    ' ' +
    '   ' +
    f(x) +
    f(y) +
    f(z) +
    '  1.00  0.00          ' +
    element.padStart(2, ' ')
  );
};

describe('계면 잔기쌍', () => {
  const pdb = [
    atomLine(1, ' CA ', 'LYS', 'D', 1, 0, 0, 0, 'C'),
    atomLine(2, ' CA ', 'ALA', 'D', 2, 0, 0, 20, 'C'),
    atomLine(3, ' CA ', 'ASP', 'C', 1, 1, 0, 0, 'C'),
    atomLine(4, ' CA ', 'GLU', 'A', 1, 4, 0, 0, 'C'), // D1 와 4.0Å → 계면
    atomLine(5, ' CA ', 'GLY', 'A', 2, 40, 0, 0, 'C'), // 멀다
    atomLine(6, ' H  ', 'GLY', 'A', 2, 4.1, 0, 0, 'H'), // 수소는 빼요
  ].join('\n');

  test('ATOM 줄을 사슬 · 잔기로 모으고 수소는 뺀다', () => {
    const chains = parseResidues(pdb);
    assert.equal(chains.size, 3);
    assert.equal(chains.get('A')?.length, 2);
    assert.equal(chains.get('A')?.[1]?.atoms.length, 3); // 수소를 안 더했어요
  });

  test('4.5Å 안쪽 쌍만 모으고 사슬 서열을 함께 돌려준다', () => {
    const res = interfacePairs(pdb, { set: '1', H: 'D', L: 'C', AG: 'A' });
    assert.ok(res);
    assert.equal(res.chainSeq.H, 'KA');
    assert.equal(res.chainSeq.L, 'D');
    assert.equal(res.chainSeq.AG, 'EG');
    assert.equal(res.pairs.length, 2); // H:K1↔E1 · L:D1↔E1
    assert.equal(res.pairs[0]?.chain, 'H');
    assert.equal(res.pairs[0]?.pos, 1);
    assert.equal(res.pairs[0]?.aa, 'K');
    assert.equal(res.pairs[0]?.agAa, 'E');
    assert.equal(res.pairs[0]?.dist, 4);
    assert.deepEqual(interfacePairs(pdb, { set: '1', H: 'D', L: 'C', AG: 'A' }), res);
  });

  test('항원 사슬 · 항체 사슬이 없으면 null', () => {
    assert.equal(interfacePairs(pdb, { set: '1', H: 'D', L: 'C' }), null);
    assert.equal(interfacePairs(pdb, { set: '1', H: 'Z', AG: 'A' }), null);
  });

  test('두 번째 모델은 읽지 않는다', () => {
    const multi = ['MODEL        1', pdb, 'ENDMDL', 'MODEL        2', atomLine(9, ' CA ', 'TRP', 'D', 3, 0, 0, 0, 'C'), 'ENDMDL'].join('\n');
    const res = interfacePairs(multi, { set: '1', H: 'D', L: 'C', AG: 'A' });
    assert.equal(res?.chainSeq.H, 'KA');
  });

  test('대체 위치가 여럿이면 첫 번째만 쓴다', () => {
    const alt = [atomLine(1, ' CA ', 'LYS', 'D', 1, 0, 0, 0, 'C', 'A'), atomLine(2, ' CA ', 'LYS', 'D', 1, 9, 9, 9, 'C', 'B'), atomLine(3, ' CA ', 'GLU', 'A', 1, 4, 0, 0, 'C')].join('\n');
    const res = interfacePairs(alt, { set: '1', H: 'D', AG: 'A' });
    assert.equal(res?.pairs.length, 1);
    assert.equal(res?.pairs[0]?.dist, 4);
  });

  test('계면 자리 열쇠를 만든다', () => {
    const res = interfacePairs(pdb, { set: '1', H: 'D', L: 'C', AG: 'A' });
    assert.deepEqual([...interfacePositions(res?.pairs ?? [])].sort(), ['H:1', 'L:1']);
  });

  test('PDB 사슬 ↔ Fv 자리 맞추기 — 앞 잔기가 안 보이는 사슬도 맞춘다', () => {
    // 실측 `3S37` 처럼 PDB 쪽에 맨 앞 한 잔기가 없는 경우예요.
    const map = alignChainToFv('VQLVQSGGGLVKAAAA', 'EVQLVQSGGGLVK');
    assert.ok(map);
    assert.equal(map[0], 2); // 사슬의 첫 글자 V 는 Fv 의 2번째 자리
    assert.equal(map[12], null); // CH1 쪽은 Fv 밖
    assert.equal(alignChainToFv('WWWWWWWWWWWWW', 'EVQLVQSGGGLVK'), null);
  });

  test('Fv 자리로 옮긴 쌍은 Fv 글자를 들고 있다', () => {
    const res = interfacePairs(pdb, { set: '1', H: 'D', L: 'C', AG: 'A' });
    assert.ok(res);
    const mapped = toFvPairs(res, { H: 'KA', L: 'D' });
    assert.ok(mapped);
    assert.equal(mapped.length, 2);
    assert.equal(mapped[0]?.pos, 1);
    assert.equal(toFvPairs(res, { H: 'WWWWWWWWWW' }), null);
  });
});

// ── 표적별 σ ─────────────────────────────────────────────────────────────────

describe('표적별 σ', () => {
  const pairs = [
    { chain: 'H' as const, pos: 1, aa: 'A', agAa: 'E' },
    { chain: 'H' as const, pos: 2, aa: 'S', agAa: 'D' },
    { chain: 'L' as const, pos: 1, aa: 'G', agAa: 'K' },
  ];
  const positions: MutablePosition[] = [
    { chain: 'H', pos: 1, wt: 'A' },
    { chain: 'H', pos: 2, wt: 'S' },
    { chain: 'H', pos: 3, wt: 'T' },
    { chain: 'L', pos: 1, wt: 'G' },
  ];

  test('같은 씨앗이면 늘 같은 값 · 다른 씨앗이면 다른 값', () => {
    const a = sigmaTarget({ pairs, positions, seed: 'EGFR:1YY9', trials: 200 });
    const b = sigmaTarget({ pairs, positions, seed: 'EGFR:1YY9', trials: 200 });
    const c = sigmaTarget({ pairs, positions, seed: 'HER2:1N8Z', trials: 200 });
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.ok((a?.sigma as number) > 0);
  });

  test('쌍이나 자리가 없으면 null — σ 를 모르는 채 0 으로 나누지 않는다', () => {
    assert.equal(sigmaTarget({ pairs: [], positions, seed: 's' }), null);
    assert.equal(sigmaTarget({ pairs, positions: [], seed: 's' }), null);
    assert.equal(sigmaTarget({ pairs, positions, seed: 's', trials: 0 }), null);
  });

  test('표적 3종 보정값이 저장돼 있다(설계 §4.1 보정 산출물)', () => {
    for (const key of ['EGFR', 'HER2', 'VEGFR2']) {
      const t = TARGET_CALIBRATION[key];
      assert.ok(t, key);
      assert.ok(t.pairCount > 0);
      assert.ok(t.sigma > 0);
      assert.ok(t.meanAbsRaw > 0);
      assert.match(t.pdb, /^[0-9A-Z]{4}$/);
    }
    assert.equal(TARGET_CALIBRATION['EGFR']?.pdb, '1YY9');
    assert.equal(TARGET_CALIBRATION['HER2']?.pdb, '1N8Z');
    assert.equal(TARGET_CALIBRATION['VEGFR2']?.pdb, '3S37');
  });
});

// ── 제안 받기 ────────────────────────────────────────────────────────────────

describe('제안 받기(교육용 근사)', () => {
  const cdrs: CdrSpan[] = [{ chain: 'H', cdr: 3, scheme: 'imgt', start: 3, end: 7, seq: 'AAAAA' }];
  const input = { vh: 'GGAAAAAGG', cdrs };

  test('치환만 하고 길이를 바꾸지 않는다', () => {
    for (const v of suggestVariants(input, 8, 'normal')) {
      for (const m of v.mutations) {
        assert.equal(m.wt, 'A');
        assert.notEqual(m.mut, m.wt);
        assert.ok(m.pos >= 3 && m.pos <= 7);
      }
    }
  });

  test('새 Cys 를 넣지 않는다', () => {
    for (const bold of ['conservative', 'normal', 'bold'] as const) {
      for (const v of suggestVariants(input, 8, bold)) {
        for (const m of v.mutations) assert.notEqual(m.mut, 'C');
      }
    }
  });

  test('잠긴 자리는 건드리지 않는다', () => {
    const locked = new Set(['H:3', 'H:4', 'H:5']);
    for (const v of suggestVariants({ ...input, lockedKeys: locked }, 8, 'normal')) {
      for (const m of v.mutations) assert.ok(!locked.has(`${m.chain}:${m.pos}`));
    }
  });

  test('과감함이 높을수록 한 변이체의 치환 수가 많다', () => {
    const one = suggestVariants(input, 4, 'conservative');
    const three = suggestVariants(input, 4, 'bold');
    assert.ok((one[0]?.mutations.length ?? 0) <= 1);
    assert.equal(three[0]?.mutations.length, 3);
  });

  test('한 변이체 안에서 같은 자리를 두 번 쓰지 않는다', () => {
    for (const v of suggestVariants(input, 8, 'bold')) {
      const keys = v.mutations.map((m) => `${m.chain}:${m.pos}`);
      assert.equal(new Set(keys).size, keys.length);
    }
  });

  test('같은 입력이면 늘 같은 목록 · 바꿀 자리가 없으면 빈 목록', () => {
    assert.deepEqual(suggestVariants(input, 8, 'normal'), suggestVariants(input, 8, 'normal'));
    assert.deepEqual(suggestVariants({ vh: 'GGGG', cdrs: [] }, 8, 'normal'), []);
    assert.deepEqual(suggestVariants(input, 0, 'normal'), []);
  });

  test('계면 자리면 접촉 통계 이유를 함께 적는다', () => {
    const withPairs = suggestVariants(
      { ...input, pairs: [{ chain: 'H', pos: 5, aa: 'A', agAa: 'E' }] },
      8,
      'normal',
    );
    assert.ok(withPairs.some((v) => v.reasons.some((r) => r.includes('항원과 맞닿는'))));
  });
});

// ── 정직성 ───────────────────────────────────────────────────────────────────

describe('정직성 — 금지 이름과 단위 표기', () => {
  /** 묶음 3 이 만든 파일 — 저장소 전체 감사는 묶음 6 이 해요(설계 §7). */
  const MY_FILES = [
    'constants.ts',
    'data/mj1996.ts',
    'data/germline.ts',
    'numbering.ts',
    'diversity.ts',
    'liabilities.ts',
    'charge.ts',
    'greasy.ts',
    'germline-identity.ts',
    'bind-score.ts',
    'interface.ts',
    'sigma.ts',
    'score.ts',
    'fit.ts',
    'suggest.ts',
  ].map((name) => new URL(`../src/features/antibody/${name}`, import.meta.url));

  test('근사값 자리에 원전 지표 이름이 없다(§3.5)', () => {
    // `ipTM` 은 Boltz 경로(선택 기능)에서만 쓰고 묶음 3 파일에는 없어야 해요.
    const banned = ['ipTM', 'iptm', 'ΔΔG', 'SFvCSP', 'FvCSP', 'PSH', 'PPC', 'PNC', 'ConSurf'];
    for (const url of MY_FILES) {
      const text = readFileSync(url, 'utf8');
      for (const word of banned) {
        assert.ok(!text.includes(word), `${url.pathname} 에 금지 이름 '${word}' 가 있어요`);
      }
      // `TAP` 은 낱말로 쓰이면 안 돼요(`TAP_` 같은 식별자도 금지).
      assert.ok(!/\bTAP\b/.test(text), `${url.pathname} 에 금지 이름 'TAP' 가 있어요`);
    }
  });

  test('붙는 힘 점수 자리에 단위 표기가 없다', () => {
    for (const url of MY_FILES) {
      const text = readFileSync(url, 'utf8');
      assert.ok(!text.includes('kcal/mol'), url.pathname);
      assert.ok(!/\bkT\b/.test(text), url.pathname);
    }
  });

  test("화면에 '보존도'라고 쓰지 않는다(§10 S18)", () => {
    for (const url of MY_FILES) {
      const text = readFileSync(url, 'utf8');
      // 이름이 아니라 '옛 이름이 보존도였다'는 설명만 남아 있어야 해요.
      for (const line of text.split('\n')) {
        if (!line.includes('보존도')) continue;
        assert.ok(
          line.includes('*') || line.includes('//'),
          `${url.pathname}: 주석 밖에서 '보존도'를 쓰고 있어요 — ${line.trim()}`,
        );
      }
    }
  });
});
