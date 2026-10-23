/**
 * 항체 랩 서버(묶음 4) — DB 없이 확인할 수 있는 것만. 라우트 · 러너의 실제 흐름은 `npm run e2e:antibody`.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ANTIBODY_STEP_IDS, MARKET_EXTRA_BANDS, cristaToCents } from '@crista-web/web-contract';
import { bandOf, changePctOf, marketCapCentsOf } from '../src/features/antibody/events.ts';
import { quorumOf } from '../src/features/antibody/consensus.ts';
import { segmentsOf } from '../src/features/antibody/runner.ts';
import {
  ANTIBODY_COSTS,
  ANTIBODY_SUBMIT_COST_CENTS,
  computeAntibodySteps,
  computePreview,
  diversityViewOf,
} from '../src/features/antibody/service.ts';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '..', 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (path.endsWith('.ts')) out.push(path);
  }
  return out;
}

test('시드는 수동 실행 전용 — 요청 경로(src/)에서 부르지 않는다', () => {
  const offenders = walk(SRC).filter((path) => /antibody-seed/.test(readFileSync(path, 'utf8')));
  assert.deepEqual(offenders, [], `시드 스크립트를 src 에서 import 하고 있어요: ${offenders.join(' · ')}`);
});

test('시드만 all-summary 전체를 받는다 — 요청 경로에 allSummary 호출이 없다', () => {
  // 어댑터가 메서드를 정의하는 곳(sabdab.ts)은 호출이 아니다 — `.allSummary(` 꼴만 본다.
  const offenders = walk(SRC).filter((path) => /\.allSummary\s*\(/.test(readFileSync(path, 'utf8')));
  assert.deepEqual(offenders, [], `요청 경로에서 all-summary 를 받고 있어요: ${offenders.join(' · ')}`);
});

test('postBoardEvent 를 부르는 곳은 events.ts 하나뿐이다(§11.3)', () => {
  const callers = walk(SRC)
    .filter((path) => /postBoardEvent\s*\(/.test(readFileSync(path, 'utf8')))
    .filter((path) => !path.endsWith(join('src', 'board-events.ts')));
  assert.deepEqual(
    callers.map((p) => p.slice(SRC.length + 1)).filter((p) => p.startsWith('features/antibody')),
    ['features/antibody/events.ts'],
  );
});

test('단계 잠금 사슬 — A1 만 열려 있고 나머지는 앞 단계를 가리킨다', () => {
  const { steps, current } = computeAntibodySteps({
    programConfirmed: false,
    diversityDone: false,
    designCount: 0,
    foldDone: false,
    complexDone: false,
    submitted: false,
    running: {},
  });
  assert.equal(steps.length, ANTIBODY_STEP_IDS.length);
  assert.equal(current, 'A1');
  assert.equal(steps[0]!.state, 'ready');
  for (const step of steps.slice(1)) {
    assert.equal(step.state, 'locked');
    assert.ok(step.unlockBy, `${step.id} 는 어느 단계를 기다리는지 적어야 해요.`);
  }
});

test('단계 진행 — A1 · A2 가 끝나면 지금 단계가 A3 이고 작업 중은 running', () => {
  const { steps, current } = computeAntibodySteps({
    programConfirmed: true,
    diversityDone: true,
    designCount: 0,
    foldDone: false,
    complexDone: false,
    submitted: false,
    running: { A4: { progress: 0.4, byName: '모둠원' } },
  });
  assert.equal(current, 'A3');
  assert.equal(steps.find((s) => s.id === 'A1')!.state, 'done');
  const a4 = steps.find((s) => s.id === 'A4')!;
  assert.equal(a4.state, 'running');
  assert.equal(a4.progressPct, 40);
});

test('비용은 계약의 크리스타 값을 센트로 옮긴 것이다 — A2 · A4 무료', () => {
  assert.equal(ANTIBODY_COSTS.A2, 0);
  assert.equal(ANTIBODY_COSTS.A4, 0);
  assert.equal(ANTIBODY_COSTS.A5, cristaToCents(500_000));
  assert.equal(ANTIBODY_SUBMIT_COST_CENTS, cristaToCents(1_000_000));
});

test('단계 비용은 두 번 환산하지 않는다 — A5 는 500,000 크리스타', () => {
  const { steps } = computeAntibodySteps({
    programConfirmed: true,
    diversityDone: true,
    designCount: 1,
    foldDone: true,
    complexDone: false,
    submitted: false,
    running: {},
  });
  assert.equal(steps.find((s) => s.id === 'A5')!.costCents, cristaToCents(500_000));
});

test('정족수 — 유효 인원의 과반', () => {
  assert.equal(quorumOf(1), 1);
  assert.equal(quorumOf(2), 2);
  assert.equal(quorumOf(3), 2);
  assert.equal(quorumOf(4), 3);
  assert.equal(quorumOf(5), 3);
});

test('변동률은 밴드 상한 안에서만 — 힌트가 없거나 0 이면 0', () => {
  assert.equal(changePctOf('antibody_record', 'normal', 0), 0);
  assert.equal(changePctOf('antibody_record', 'normal', 2), 2);
  // antibody_record 전용 밴드가 아직 없으면 antibody(0~5%)로 깎인다.
  assert.equal(changePctOf('antibody_record', 'normal', 10), MARKET_EXTRA_BANDS.antibody.maxPct);
  assert.equal(bandOf('antibody_fold', 'bad').maxPct, MARKET_EXTRA_BANDS.antibody_bad.maxPct);
});

test('시가총액 — 상장가 $10.00 × 1,000,000주 = 1,000,000,000 센트', () => {
  assert.equal(marketCapCentsOf(10), 1_000_000_000);
});

test('다양성 방향 — 화면에 내려보내는 값은 높을수록 대부분 같은 자리(화면 범례 기준)', () => {
  const view = diversityViewOf({
    chain: 'H',
    // 묶음 3 축: 1 이 가장 많이 갈리는 자리.
    percentiles: [0.1, 0.9],
    grades: [2, 9],
    imgtNumbers: [
      [1, ''],
      [2, ''],
    ],
    numberingSource: 'regex-fallback',
    cdrs: [],
    msaDepth: 100,
    provenance: { source: 'edu-approx', label: '교육용 근사', detail: '시험', approx: true },
  });
  assert.deepEqual(view.grades, [8, 1]);
  assert.deepEqual(view.percentiles, [0.9, 0.1]);
  // 잠그는 자리는 0 부터 세는 자리(화면 서열 격자의 칸 번호)로 내려보낸다.
  assert.deepEqual(view.suggestedFixed, [0]);
});

test('접힘 구간 표 — CDR 구간마다 한 줄 + 틀 구간 한 줄', () => {
  const perResidue = Array.from({ length: 20 }, (_, i) => 50 + i);
  const segments = segmentsOf(perResidue, [{ chain: 'H', cdr: 3, scheme: 'imgt', start: 5, end: 8, seq: 'ABCD' }], null);
  assert.equal(segments.length, 2);
  assert.equal(segments[0]!.label, 'CDRH3');
  assert.equal(segments[0]!.start, 5);
  assert.equal(segments[0]!.end, 8);
  assert.equal(segments[1]!.label, '틀 구간');
});

test('미리보기는 같은 서열에 늘 같은 값이고 모든 지표에 배지가 붙는다', () => {
  const vh = 'QVQLKQSGPGLVQPSQSLSITCTVSGFSLTNYGVHWVRQSPGKGLEWLGVIWSGGNTDYNTPFTSRLSINKDNSKSQVFFKMNSLQSNDTAIYYCARALTYYDYEFAYWGQGTLVTVSA';
  const a = computePreview(vh, undefined);
  const b = computePreview(vh.toLowerCase(), undefined);
  assert.deepEqual(a.metrics, b.metrics);
  assert.ok(a.metrics.provenance.length >= 1);
  assert.ok(a.metrics.provenance.some((p) => p.approx === true));
  assert.ok(a.metrics.cdrTotalLength > 0, 'CDR 길이를 세야 해요.');
});

test('정직성 — 묶음 4 가 만든 파일에 금지 이름이 없다', () => {
  const banned = [/\bipTM\b/i, /ΔΔG/, /\bTAP\b/, /SFvCSP/, /FvCSP/, /\bPSH\b/, /\bPPC\b/, /\bPNC\b/, /ConSurf/, /kcal\/mol/, /\bkT\b/];
  const mine = [
    'features/antibody/service.ts',
    'features/antibody/runner.ts',
    'features/antibody/consensus.ts',
    'features/antibody/events.ts',
    'features/antibody/teacher.ts',
    'features/antibody/index.ts',
    'features/antibody/routes-board.ts',
    'features/antibody/routes-design.ts',
    'features/antibody/routes-jobs.ts',
    'features/antibody/routes-consensus.ts',
    'features/antibody/routes-teacher.ts',
  ];
  for (const rel of mine) {
    const text = readFileSync(join(SRC, rel), 'utf8');
    for (const pattern of banned) {
      // `ComplexView.iptm` 은 계약이 정한 칸 이름이라 소문자 식별자 한 곳만 허용한다(§3.3 Boltz 경로).
      const hits = text.match(pattern) ?? [];
      const allowed = hits.filter((hit) => hit === 'iptm');
      assert.equal(hits.length - allowed.length, 0, `${rel} 에 금지 이름 ${pattern} 이 있어요.`);
    }
    assert.ok(!/보존도/.test(text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), `${rel} 에 '보존도' 가 있어요.`);
  }
});
