/**
 * 항체 설계 랩 계약 테스트 — 묶음 1 완료 조건(설계 §7 묶음 1).
 * 고정하는 것: 서열 정규화의 결정성 · 20종 밖 문자 거부 · 단계 메타 완전성 · 저분자 축 무변경 ·
 * `node:crypto` · DOM 전역을 쓰지 않음(화면 빌드 보호) · 금지 이름 부재(§3.5).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  AMINO_ACIDS,
  ANTIBODY_API,
  ANTIBODY_BOLDNESS,
  ANTIBODY_EVENT_KINDS,
  ANTIBODY_GROUP_TITLE,
  ANTIBODY_GRADE_MIN,
  ANTIBODY_GRADE_WORD,
  ANTIBODY_JOB_STEPS,
  ANTIBODY_SCORE_WEIGHTS,
  ANTIBODY_SOURCES,
  ANTIBODY_STEP_COST_CRISTA,
  ANTIBODY_STEP_IDS,
  ANTIBODY_STEP_META,
  ANTIBODY_STEP_REQUIRES,
  ANTIBODY_WEIGHT_KEYS,
  CDR_SCHEMES,
  CENTS_PER_CRISTA,
  CONFIDENCE_MIN_FOR_COMPLEX,
  DESIGN_SLOTS_PER_PERSON,
  ANTIBODY_TRACK,
  ESMFOLD_MAX_RESIDUES,
  NOTE_SECTIONS,
  PREVIEW_PER_MIN_PER_TEAM,
  SCFV_LINKER,
  SCORE_THRESHOLD_MARGIN,
  STEP_IDS,
  TRACK_IDS,
  STEP_META,
  SeqFormatError,
  antibodyGrade,
  formatCrista,
  isAminoAcidSeq,
  normalizeSeq,
  scoreWeightsOk,
  scoreWeightsSum,
  type AntibodyScoreWeights,
  type AntibodyStepId,
} from '../src/index.ts';

const SRC = fileURLToPath(new URL('../src/antibody.ts', import.meta.url));
const source = readFileSync(SRC, 'utf8');

describe('서열 정규화', () => {
  test('대문자 · 공백 · 줄바꿈을 정리하고 같은 값을 돌려줘요(결정적)', () => {
    const raw = '  evq lv\tesg\nggl\r\nvqpgg  ';
    assert.equal(normalizeSeq(raw), 'EVQLVESGGGLVQPGG');
    // 같은 뜻의 서로 다른 입력이 같은 값으로 모여요(서버 해시가 이 값을 쓴다).
    assert.equal(normalizeSeq('evqlv esggglvqpgg'), normalizeSeq('EVQLVESGGGLVQPGG'));
    // 1,000회 반복에도 같은 값(결정성).
    const once = normalizeSeq(raw);
    for (let i = 0; i < 1000; i += 1) assert.equal(normalizeSeq(raw), once);
  });

  test('20종 아미노산 밖 문자는 `invalid_input` 으로 거부해요', () => {
    for (const bad of ['EVQLX', 'EVQ-LV', 'EV*QL', 'VH:VL', 'EVQL1', 'evql,vesg', 'EVQLB']) {
      assert.throws(
        () => normalizeSeq(bad),
        (err: unknown) => {
          assert.ok(err instanceof SeqFormatError, `SeqFormatError 가 아니에요: ${String(err)}`);
          assert.equal(err.code, 'invalid_input');
          return true;
        },
        bad,
      );
    }
  });

  test('빈 서열 · 공백만 · 글자가 아닌 입력도 거부해요', () => {
    for (const bad of ['', '   ', '\n\t']) assert.throws(() => normalizeSeq(bad), SeqFormatError, JSON.stringify(bad));
    assert.throws(() => normalizeSeq(null as unknown as string), SeqFormatError);
    assert.throws(() => normalizeSeq(42 as unknown as string), SeqFormatError);
  });

  test('20종 전부를 받고, 그 밖 글자는 하나도 받지 않아요', () => {
    assert.equal(AMINO_ACIDS.length, 20);
    assert.equal(new Set(AMINO_ACIDS).size, 20);
    assert.equal(normalizeSeq(AMINO_ACIDS.toLowerCase()), AMINO_ACIDS);
    const outside = 'BJOUXZ'; // 20종 밖 한 글자 기호
    for (const ch of outside) assert.equal(isAminoAcidSeq(`EVQ${ch}LV`), false, ch);
  });

  test('`isAminoAcidSeq` 는 던지지 않아요', () => {
    assert.equal(isAminoAcidSeq(' evqlv '), true);
    assert.equal(isAminoAcidSeq('EVQ-LV'), false);
    assert.equal(isAminoAcidSeq(''), false);
  });
});

describe('화면 빌드 보호 — 계약에 서버 전용 · DOM 의존을 두지 않아요', () => {
  test('`node:` 꾸러미 · `require` 를 쓰지 않아요(해시는 서버 전용 `features/antibody/hash.ts`)', () => {
    assert.equal(/from\s+['"]node:/u.test(source), false, 'node: 꾸러미를 import 했어요');
    assert.equal(/\brequire\s*\(/u.test(source), false, 'require 를 썼어요');
    assert.equal(/\bcreateHash\b/u.test(source), false, '해시를 계약에 뒀어요');
    // `seqHash` 는 서버가 만든 값을 담는 칸으로만 있어야 하고, 여기서 계산하는 함수가 있으면 안 돼요.
    assert.equal(/function\s+seqHash|seqHash\s*=\s*\(/u.test(source), false, 'seqHash 계산은 서버 전용이에요');
  });

  test('DOM · 런타임 전역을 쓰지 않아요', () => {
    for (const global of ['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'crypto\\.', 'fetch\\(']) {
      assert.equal(new RegExp(`\\b${global}`, 'u').test(source), false, `전역 ${global} 을 썼어요`);
    }
  });

  test('다른 규격 파일은 타입으로만 가져와요(금액 helper 하나만 값으로)', () => {
    const imports = [...source.matchAll(/^import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)';$/gmu)];
    assert.ok(imports.length >= 4, '머리 import 를 읽지 못했어요');
    for (const [, isType, names, from] of imports) {
      if (isType) continue;
      assert.equal(from, './money.ts', `값으로 가져온 곳: ${from}`);
      assert.equal((names ?? '').trim(), 'cristaToCents');
    }
  });
});

describe('정직성 — 금지 이름(§3.5)', () => {
  test('근사값에 원전 지표 이름을 쓰지 않아요', () => {
    const banned: Array<[string, RegExp]> = [
      ['ΔΔG', /ΔΔG/u],
      ['TAP', /\bTAP\b/u],
      ['SFvCSP', /\bSFvCSP\b/iu],
      ['FvCSP', /\bFvCSP\b/iu],
      ['PSH', /\bPSH\b/iu],
      ['PPC', /\bPPC\b/iu],
      ['PNC', /\bPNC\b/iu],
      ['ConSurf', /ConSurf/iu],
      ['kT 단위', /\bkT\b/u],
      ['kcal 단위', /kcal/iu],
    ];
    for (const [name, re] of banned) assert.equal(re.test(source), false, `금지 이름 ${name} 이 있어요`);
  });

  test('`iptm` 은 Boltz 선택 경로 한 자리에만 있어요', () => {
    const hits = [...source.matchAll(/iptm/giu)];
    assert.equal(hits.length, 1, `iptm 이 나온 자리: ${hits.length}`);
    const at = hits[0]?.index ?? -1;
    assert.ok(at > 0);
    // 바로 앞 주석이 'Boltz 선택 경로에서만 채운다'는 사실을 밝혀야 해요.
    assert.match(source.slice(Math.max(0, at - 220), at), /Boltz/u);
    // 근사 경로의 값은 다른 이름으로만 부릅니다.
    assert.match(source, /bindScore/u);
  });

  test('모든 결과 뷰에 `provenance` 칸이 있어요', () => {
    for (const view of ['DesignView', 'PreviewMetrics', 'DiversityView', 'FoldView', 'ComplexView', 'ScoreView']) {
      const body = source.slice(source.indexOf(`export interface ${view} {`));
      const end = body.indexOf('\n}');
      assert.ok(end > 0, `${view} 를 찾지 못했어요`);
      assert.match(body.slice(0, end), /provenance/u, `${view} 에 provenance 가 없어요`);
    }
  });

  test('성격 배지 종류는 5가지이고 근사 여부를 따로 들고 다녀요', () => {
    assert.deepEqual([...ANTIBODY_SOURCES], ['lookup', 'server-calc', 'ai-predict', 'edu-approx', 'precomputed']);
    assert.match(source, /approx:\s*boolean/u);
  });
});

describe('단계 메타', () => {
  test('A1~A6 여섯 단계가 빠짐없이 있고 키와 id 가 같아요', () => {
    assert.deepEqual([...ANTIBODY_STEP_IDS], ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
    assert.equal(Object.keys(ANTIBODY_STEP_META).length, ANTIBODY_STEP_IDS.length);
    for (const id of ANTIBODY_STEP_IDS) {
      const meta = ANTIBODY_STEP_META[id];
      assert.equal(meta.id, id);
      assert.ok(meta.title.length > 0, id);
      assert.ok(meta.evidence.length > 0, `${id} 에 결과의 성격이 없어요`);
      for (const source_ of meta.evidence) assert.ok(ANTIBODY_SOURCES.includes(source_), `${id}: ${source_}`);
      assert.ok(Number.isSafeInteger(meta.costCents) && meta.costCents >= 0, id);
      assert.equal(meta.costCents, ANTIBODY_STEP_COST_CRISTA[id] * CENTS_PER_CRISTA);
    }
  });

  test('묶음 · 자리 번호가 설계 §2 표와 같아요', () => {
    const expected: Record<AntibodyStepId, [1 | 2 | 3 | 4, 1 | 2]> = {
      A1: [1, 1],
      A2: [1, 2],
      A3: [2, 1],
      A4: [3, 1],
      A5: [3, 2],
      A6: [4, 1],
    };
    for (const id of ANTIBODY_STEP_IDS) {
      assert.deepEqual([ANTIBODY_STEP_META[id].group, ANTIBODY_STEP_META[id].index], expected[id], id);
    }
  });

  test('잠금 해제는 한 줄로 이어지고 A1 만 앞이 없어요', () => {
    assert.equal(ANTIBODY_STEP_REQUIRES.A1, undefined);
    assert.deepEqual(
      ANTIBODY_STEP_IDS.slice(1).map((id) => ANTIBODY_STEP_REQUIRES[id]),
      ['A1', 'A2', 'A3', 'A4', 'A5'],
    );
  });

  test('유료 단계는 A5 · A6 뿐이고 A4 는 무료예요(§10 S15)', () => {
    assert.deepEqual([...ANTIBODY_JOB_STEPS], ['A2', 'A4', 'A5']);
    assert.equal(ANTIBODY_STEP_COST_CRISTA.A4, 0);
    assert.equal(ANTIBODY_STEP_COST_CRISTA.A2, 0);
    assert.equal(ANTIBODY_STEP_COST_CRISTA.A5, 500_000);
    assert.equal(ANTIBODY_STEP_COST_CRISTA.A6, 1_000_000);
    // 초기 연구비 10,000,000 크리스타로 A5 를 세 번 치르고 A6 를 한 번 낼 수 있어요(§9-13).
    assert.ok(ANTIBODY_STEP_COST_CRISTA.A5 * 3 + ANTIBODY_STEP_COST_CRISTA.A6 <= 10_000_000);
    assert.equal(formatCrista(ANTIBODY_STEP_COST_CRISTA.A6), '1,000,000 크리스타');
  });

  test('A2 제목에 \'보존도\'를 쓰지 않아요(§2.3 — 레퍼토리 다양성)', () => {
    for (const id of ANTIBODY_STEP_IDS) {
      assert.equal(/보존도/u.test(ANTIBODY_STEP_META[id].title), false, id);
    }
    assert.match(ANTIBODY_STEP_META.A2.title, /레퍼토리 다양성/u);
  });
});

describe('저분자 축 무변경', () => {
  test('`StepId` 9값 · `JobStep` · `STEP_META` · `NoteSection` 을 건드리지 않았어요', () => {
    assert.deepEqual([...STEP_IDS], ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2']);
    assert.equal(Object.keys(STEP_META).length, 9);
    assert.deepEqual([...NOTE_SECTIONS], ['why', 'unknown', 'fallback']);
  });

  test('항체 단계 id 는 저분자 id 와 하나도 겹치지 않아요', () => {
    const small = new Set<string>(STEP_IDS);
    for (const id of ANTIBODY_STEP_IDS) assert.equal(small.has(id), false, id);
  });

  test('항체 노트 칸은 기존 세 값을 그대로 써요', () => {
    assert.match(source, /section:\s*NoteSection/u);
    for (const section of NOTE_SECTIONS) {
      assert.equal(ANTIBODY_API.note('A6', section), `/api/antibody/notes/A6/${section}`);
    }
  });

  test('트랙 축은 기반 `track.ts` 것 하나를 쓰고, 항체 등록표가 A1~A6 로 채워져 있어요', () => {
    assert.deepEqual([...TRACK_IDS], ['drug', 'antibody']);
    assert.deepEqual(
      ANTIBODY_TRACK.steps.map((s) => s.id),
      [...ANTIBODY_STEP_IDS],
    );
    assert.equal(ANTIBODY_TRACK.track, 'antibody');
    assert.deepEqual(ANTIBODY_TRACK.groups, ANTIBODY_GROUP_TITLE);
    for (const step of ANTIBODY_TRACK.steps) assert.ok(step.sub.length > 0, `${step.id} 의 보조 줄이 비어 있어요`);
  });
});

describe('점수 가중치 · 등급', () => {
  test('기본 가중치 합이 1.00 이에요', () => {
    assert.equal(ANTIBODY_WEIGHT_KEYS.length, 5);
    assert.equal(scoreWeightsSum(ANTIBODY_SCORE_WEIGHTS), 1);
    assert.equal(scoreWeightsOk(ANTIBODY_SCORE_WEIGHTS), true);
    assert.deepEqual(ANTIBODY_SCORE_WEIGHTS, {
      binding: 0.3,
      stability: 0.2,
      developability: 0.3,
      humanization: 0.1,
      novelty: 0.1,
    });
  });

  test('합이 1.00 이 아니거나 범위를 벗어난 가중치는 막아요(교사 설정 검사)', () => {
    const bad: AntibodyScoreWeights[] = [
      { binding: 0.4, stability: 0.2, developability: 0.3, humanization: 0.1, novelty: 0.1 },
      { binding: -0.1, stability: 0.3, developability: 0.4, humanization: 0.2, novelty: 0.2 },
      { binding: Number.NaN, stability: 0.2, developability: 0.3, humanization: 0.1, novelty: 0.1 },
    ];
    for (const w of bad) assert.equal(scoreWeightsOk(w), false, JSON.stringify(w));
    // 반올림 오차는 봐 줘요.
    assert.equal(scoreWeightsOk({ binding: 0.3, stability: 0.2, developability: 0.3, humanization: 0.1, novelty: 0.100000001 }), true);
  });

  test('적합도 등급은 80 · 60 · 40 에서 갈려요(§4.2)', () => {
    assert.equal(antibodyGrade(100), 'great');
    assert.equal(antibodyGrade(80), 'great');
    assert.equal(antibodyGrade(79.9), 'good');
    assert.equal(antibodyGrade(60), 'good');
    assert.equal(antibodyGrade(59.9), 'fair');
    assert.equal(antibodyGrade(40), 'fair');
    assert.equal(antibodyGrade(39.9), 'poor');
    assert.equal(antibodyGrade(0), 'poor');
    for (const grade of ['great', 'good', 'fair', 'poor'] as const) {
      assert.ok(ANTIBODY_GRADE_WORD[grade].length > 0, grade);
      assert.ok(ANTIBODY_GRADE_MIN[grade] >= 0, grade);
    }
  });
});

describe('상한 · 소식 · 경로', () => {
  test('접힘 예측 상한과 링커가 실측과 같아요(§3.1)', () => {
    assert.equal(ESMFOLD_MAX_RESIDUES, 400);
    assert.equal(SCFV_LINKER, 'GGGGSGGGGSGGGGS');
    assert.equal(SCFV_LINKER.length, 15);
    assert.equal(isAminoAcidSeq(SCFV_LINKER), true);
    assert.equal(CONFIDENCE_MIN_FOR_COMPLEX, 70);
    assert.equal(DESIGN_SLOTS_PER_PERSON, 2);
    assert.equal(PREVIEW_PER_MIN_PER_TEAM, 20);
    assert.equal(SCORE_THRESHOLD_MARGIN, 5);
  });

  test('항체 소식 종류는 네 값이고 모두 `antibody_` 로 시작해요(§11.3)', () => {
    assert.deepEqual([...ANTIBODY_EVENT_KINDS], ['antibody_program', 'antibody_fold', 'antibody_complex', 'antibody_record']);
    for (const kind of ANTIBODY_EVENT_KINDS) assert.match(kind, /^antibody_[a-z]+$/u);
  });

  test('CDR 번호축 · 과감함 값이 설계와 같아요', () => {
    assert.deepEqual([...CDR_SCHEMES], ['imgt', 'kabat', 'chothia', 'abm', 'contact']);
    assert.deepEqual([...ANTIBODY_BOLDNESS], ['conservative', 'normal', 'bold']);
  });

  test('경로는 모두 `/api/antibody/` 아래이고 모둠 id 를 싣지 않아요(§5.5)', () => {
    const paths: string[] = [];
    for (const [key, entry] of Object.entries(ANTIBODY_API)) {
      if (typeof entry !== 'function') paths.push(entry);
      else if (key === 'note') paths.push(ANTIBODY_API.note('A1', 'why'));
      else paths.push((entry as (arg: string) => string)('x'));
    }
    assert.ok(paths.length >= 18);
    for (const path of paths) {
      assert.match(path, /^\/api\/antibody\//u);
      assert.equal(/team/iu.test(path) && !/teacher/u.test(path), false, path);
    }
    assert.equal(ANTIBODY_API.structure('1YY9'), '/api/antibody/structure/1YY9');
    assert.equal(ANTIBODY_API.votes('a b'), '/api/antibody/proposals/a%20b/votes');
  });
});
