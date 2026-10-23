/**
 * 항체 랩 과정 평가(항체 설계 §11.3.1) — **기반(FMARKET)의 `postProcessScore` 를 그대로 부른다**.
 *
 * - 단계 id 는 **`antibody_a1` ~ `antibody_a6`**(소문자)다. 설계 §11.3.1 은 `antibody_A1` 로 적었지만
 *   기반 0016 의 `web.process_scores.step_id` check 가 `^antibody_[a-z0-9_]{1,40}$` — **소문자만** 받는다.
 *   0016 은 고치지 않는 파일이라(항체 설계 §11.4) 이쪽을 소문자로 맞췄다. 대문자로 보내면 23514 로 조용히 버려진다.
 * - (모둠, 단계)마다 **한 번**(`web.process_scores` PK) · 0~100 점 · 변동 0 ~ +3% · 감점 없음.
 *   그래서 단계가 끝나는 자리에서 여러 번 불려도 안전하다 — 두 번째부터는 `created: false` 로 조용히 지나간다.
 * - 신호는 **DB 사실에서만** 센다. 학생이 글을 길게 써서 점수를 올리는 길을 두지 않는다 —
 *   근거 길이는 **충족 여부(0/1)** 로만 보고, 그 비율을 신호로 쓴다.
 * - 공개 범위: **참여 사실**(몇 명이 했나 · 몇 몫을 나눴나)만 `public`. 질 신호(근거 충족 · 재시도 절약)는
 *   그 모둠 · 선생님만 본다(`process_scores.components`). 점수 숫자는 어느 쪽에도 싣지 않는다(§4.3 · §4.5).
 * - 이 파일은 `service.ts` · `consensus.ts` 를 **가져오지 않는다**(순환 금지). 필요한 사실은 직접 질의한다.
 *
 * 설계 표와 다르게 센 두 곳(§11.3.1 의 뜻을 DB 사실로 옮기면서)
 * - A3 '유효 변이 비율' → **CDR 안에 든 변이 비율**. 점수 쪽 `m_eff` 는 A2 다양성 · 계면 접촉이 있어야 나오는데
 *   A3 이 끝나는 시점에는 아직 없을 수 있다. 저장된 변이의 `cdr` 칸은 그 자리에서 바로 읽을 수 있는 사실이다.
 * - A5 '재시도 절약' → **설계 한 건당 평균 시도 수**로 센다. 시도 총수로 세면 모둠원이 각자 한 번씩 돌린 것이
 *   '재시도'로 깎여서 같은 표의 첫 신호(참여)와 서로 싸운다.
 */
import type { ProcessComponent } from '@crista-web/web-contract';
import type { Deps } from '../../context.ts';
import type { Queryable } from '../../db.ts';
import { postProcessScore } from '../market.ts';

/** A2 의 여섯 몫 — `consensus.ts` 의 `A2_SLOTS` 와 같은 수(그 파일을 가져오면 순환이 된다). */
const A2_SLOT_COUNT = 6;

/** 근거 '충족' 문턱(글자) — 길이로 점수를 쌓지 못하게 0/1 로만 본다. */
const RATIONALE_MIN = 30;

export type AntibodyProcessStep = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6';

const ratio = (n: number, m: number): number => (m > 0 ? Math.min(1, n / m) : 0);
const one = async <T>(db: Queryable, sql: string, params: unknown[]): Promise<T> => (await db.query(sql, params)).rows[0] as T;

/** 유효 인원 — 그 모둠의 학생 수(0 이면 비율 신호가 모두 0 이 된다). */
async function memberCountOf(db: Queryable, teamId: string): Promise<number> {
  const r = await one<{ n: number }>(db, `select count(*)::int as n from web.members where team_id = $1 and role = 'student'`, [teamId]);
  return r?.n ?? 0;
}

/** 카드(A1 · A2) 사실 — 올린 사람 · 나눈 몫 · 근거 충족. */
async function cardFacts(db: Queryable, revisionId: string, step: 'A1' | 'A2') {
  return one<{ people: number; slots: number; long: number; total: number }>(
    db,
    `select count(distinct submitted_by)::int as people, count(distinct slot)::int as slots,
            count(*) filter (where char_length(rationale) >= ${RATIONALE_MIN})::int as long, count(*)::int as total
       from web.antibody_card_submissions where revision_id = $1 and step = $2`,
    [revisionId, step],
  );
}

/**
 * 단계 하나의 과정 신호 — §11.3.1 의 표 그대로(각 0~1 · 가중치 합 1.00).
 * 아직 아무 사실이 없으면 값이 0 인 신호를 돌려준다(기반 `processScoreOf` 가 0 점으로 센다).
 */
export async function antibodyProcessSignals(
  db: Queryable,
  input: { teamId: string; revisionId: string; step: AntibodyProcessStep },
): Promise<ProcessComponent[]> {
  const { teamId, revisionId, step } = input;
  const members = await memberCountOf(db, teamId);

  if (step === 'A1') {
    const c = await cardFacts(db, revisionId, 'A1');
    const voters = await one<{ n: number }>(
      db,
      `select count(distinct v.voter)::int as n from web.antibody_votes v
         join web.antibody_proposals p on p.id = v.proposal_id
        where p.revision_id = $1 and p.topic = 'program'`,
      [revisionId],
    );
    return [
      { key: 'cards', value: ratio(c.people, members), weight: 0.4, fact: `표적 카드 ${c.people}/${members}명`, public: true },
      { key: 'votes', value: ratio(voters?.n ?? 0, members), weight: 0.3, fact: `기준 투표 ${voters?.n ?? 0}/${members}명`, public: true },
      { key: 'rationale', value: ratio(c.long, c.total), weight: 0.3, fact: `근거 충족 ${c.long}/${c.total}`, public: false },
    ];
  }

  if (step === 'A2') {
    const c = await cardFacts(db, revisionId, 'A2');
    const passed = await one<{ n: number }>(
      db,
      `select count(*)::int as n from web.antibody_proposals where revision_id = $1 and topic = 'fixed_positions' and status = 'passed'`,
      [revisionId],
    );
    return [
      { key: 'slots', value: ratio(c.slots, A2_SLOT_COUNT), weight: 0.4, fact: `맡은 구간 ${c.slots}/${A2_SLOT_COUNT}`, public: true },
      { key: 'fixed_agreed', value: (passed?.n ?? 0) > 0 ? 1 : 0, weight: 0.3, fact: (passed?.n ?? 0) > 0 ? '고정 위치 합의' : '고정 위치 미합의', public: true },
      { key: 'rationale', value: ratio(c.long, c.total), weight: 0.3, fact: `근거 충족 ${c.long}/${c.total}`, public: false },
    ];
  }

  if (step === 'A3') {
    const d = await one<{ people: number; designs: number; cdrs: number; muts: number; cdr_muts: number }>(
      db,
      `with mine as (
         select id, designed_by, mutations from web.antibody_designs where revision_id = $1 and origin = 'student'
       ), m as (
         select mine.id, x->>'cdr' as cdr from mine, jsonb_array_elements(mine.mutations) as x
       )
       select (select count(distinct designed_by)::int from mine) as people,
              (select count(*)::int from mine) as designs,
              (select count(distinct cdr)::int from m where cdr is not null) as cdrs,
              (select count(*)::int from m) as muts,
              (select count(*)::int from m where cdr is not null) as cdr_muts`,
      [revisionId],
    );
    return [
      { key: 'designers', value: ratio(d.people, members), weight: 0.4, fact: `설계 ${d.people}/${members}명`, public: true },
      // 탐색 다양성 — 설계 수보다 서로 다른 CDR 을 많이 건드렸으면 1. 설계가 없으면 0.
      { key: 'cdr_spread', value: ratio(d.cdrs, d.designs), weight: 0.3, fact: `건드린 CDR ${d.cdrs}곳`, public: true },
      { key: 'valid_mut', value: ratio(d.cdr_muts, d.muts), weight: 0.3, fact: `CDR 안 변이 ${d.cdr_muts}/${d.muts}`, public: false },
    ];
  }

  if (step === 'A4') {
    const j = await one<{ people: number; ok: number; total: number }>(
      db,
      `select count(distinct requested_by)::int as people,
              count(*) filter (where status = 'succeeded')::int as ok, count(*)::int as total
         from web.antibody_jobs where revision_id = $1 and step = 'A4'`,
      [revisionId],
    );
    return [
      { key: 'folders', value: ratio(j.people, members), weight: 0.6, fact: `접기 ${j.people}/${members}명`, public: true },
      // 길이 규칙(400 잔기)을 넘긴 접수는 실패로 남는다 — 성공 비율이 그 사실이다.
      { key: 'fold_ok', value: ratio(j.ok, j.total), weight: 0.4, fact: `접기 성공 ${j.ok}/${j.total}`, public: false },
    ];
  }

  if (step === 'A5') {
    const j = await one<{ people: number; tries: number; designs: number; parent: number }>(
      db,
      `select count(distinct j.requested_by)::int as people, count(*)::int as tries,
              count(distinct j.design_id)::int as designs,
              count(*) filter (where d.origin = 'parent')::int as parent
         from web.antibody_jobs j left join web.antibody_designs d on d.id = j.design_id
        where j.revision_id = $1 and j.step = 'A5'`,
      [revisionId],
    );
    const perDesign = j.designs > 0 ? j.tries / j.designs : 0;
    const thrift = j.tries === 0 ? 0 : 1 - Math.min(1, Math.max(0, perDesign - 1) / 4);
    return [
      { key: 'evaluators', value: ratio(j.people, members), weight: 0.4, fact: `평가 ${j.people}/${members}명`, public: true },
      { key: 'parent_included', value: j.parent > 0 ? 1 : 0, weight: 0.3, fact: j.parent > 0 ? '원본 비교군 포함' : '원본 비교군 없음', public: true },
      { key: 'retry_thrift', value: thrift, weight: 0.3, fact: `설계당 평가 ${perDesign.toFixed(1)}번`, public: false },
    ];
  }

  const n = await one<{ filled: number; writers: number }>(
    db,
    `select count(*)::int as filled, count(distinct updated_by)::int as writers
       from web.antibody_notes where revision_id = $1 and step = 'A6'`,
    [revisionId],
  );
  const label = await one<{ n: number }>(
    db,
    `select count(*)::int as n from web.antibody_scores s join web.antibody_designs d on d.id = s.design_id
      where s.revision_id = $1 and char_length(d.label) >= 1`,
    [revisionId],
  );
  return [
    // 연구 노트 칸은 why · unknown · fallback 셋이다(0020 check).
    { key: 'notes', value: ratio(n.filled, 3), weight: 0.4, fact: `연구 노트 ${n.filled}/3칸`, public: true },
    { key: 'note_authors', value: ratio(n.writers, members), weight: 0.3, fact: `노트 ${n.writers}명 작성`, public: true },
    { key: 'rationale', value: (label?.n ?? 0) > 0 ? 1 : 0, weight: 0.3, fact: '대표 후보 근거 있음', public: false },
  ];
}

/**
 * 단계가 **처음 끝나는 순간** 한 번 — 호출자 트랜잭션 안에서 부르고, 돌려받은 `after()` 를 커밋 뒤 부른다.
 * 기반이 세이브포인트 안에서 돌려 주므로 과정 평가가 실패해도 호출자의 본 일(과금 · 확정 · 작업)은 되돌아가지 않는다.
 */
export async function postAntibodyProcess(
  tx: Queryable,
  deps: Deps,
  input: { classId: string; teamId: string; revisionId: string; step: AntibodyProcessStep; gameDay?: number | null },
): Promise<() => void> {
  const components = await antibodyProcessSignals(tx, { teamId: input.teamId, revisionId: input.revisionId, step: input.step });
  const out = await postProcessScore(tx, deps, {
    classId: input.classId,
    teamId: input.teamId,
    stepId: `antibody_${input.step.toLowerCase()}`,
    components,
    revisionId: input.revisionId,
    ...(input.gameDay !== undefined ? { gameDay: input.gameDay } : {}),
  });
  return out.after;
}
