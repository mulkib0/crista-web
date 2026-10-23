-- 0014_ind_application — 3.3 제형 · IND 신청(설계 §5.10 · §7.3 ind_applications · §7.4 ⑬). 기능 F33 이 쓴다.
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0008 은 고치지 않는다.
--
-- 더하는 것
--   1. 상태 'passed'(서류 통과 — 접수 전). 0006 의 상태(draft → reviewing → revise | submitted → approved | held)에
--      '심사 통과했지만 아직 수수료를 내지 않음'을 둔다. 칸 · 조합을 고치면 다시 draft(통과는 그 판에만 — ⑪).
--   2. plan_version — 제형 · 용량 · 환자군 · 1차 평가지표 · 후보(신청서 머리 칸)의 낙관적 잠금. 칸(ind_sections)과 따로 센다
--      (모둠원이 칸을 쓰는 동안 다른 모둠원이 조합을 바꿔도 서로 409 가 나지 않게).
--   3. score_input · judgement — 접수 때 굳힌 판정 재료(game-rules `scoreCandidate` 입력)와 판정 결과(근거 문장).
--      판정(30게임 일 뒤)은 워커 · 물성 계산을 다시 부르지 않고 이 재료로 game-rules `judgeStep('ind')` 를 돌린다(결정적).
--   4. 표적 버전마다 열린 신청서는 하나(draft · reviewing · revise · passed · submitted · approved) — 네 명이 동시에 [새 신청서]를 눌러도 한 줄.
--      보류(held) 뒤에는 새로 쓸 수 있다. 접수 중 · 승인은 0006 의 ind_applications_live_key 가 그대로 지킨다(⑬).
--   5. ind_candidate_facts — 주력 · 백업 특허 분자의 물성(워커 RDKit) · 도킹 ΔG 를 한 번 계산해 둔다(도구 6종 · 규칙 검사 · 판정 재료).
--      SMILES 는 이 모둠만 읽는다(전광판 · LLM 프롬프트에 싣지 않는다 — §5.3 · §5.11 ⑤).

alter table web.ind_applications drop constraint ind_applications_status_check;
alter table web.ind_applications add constraint ind_applications_status_check
  check (status in ('draft', 'reviewing', 'revise', 'passed', 'submitted', 'approved', 'held'));

alter table web.ind_applications add column plan_version integer not null default 1 check (plan_version >= 1);
alter table web.ind_applications add column score_input jsonb;
alter table web.ind_applications add column judgement jsonb;
alter table web.ind_applications add column decided_at timestamptz;
alter table web.ind_applications add constraint ind_applications_score_input_check
  check (status not in ('submitted', 'approved', 'held') or (score_input is not null and e_score is not null and s_score is not null));

create unique index ind_applications_open_key on web.ind_applications (program_revision_id)
  where status in ('draft', 'reviewing', 'revise', 'passed', 'submitted', 'approved');

create table web.ind_candidate_facts (
  patent_id uuid primary key,
  team_id uuid not null,
  -- 워커 POST /molecule/properties 결과(MoleculeProperties) 그대로.
  properties jsonb not null,
  -- 그 분자의 2.1 도킹 ΔG(kcal/mol) · 표적 기준 리간드 재도킹 값.
  affinity_kcal real not null,
  reference_kcal real not null,
  created_at timestamptz not null default now(),
  foreign key (patent_id, team_id) references web.patents (id, team_id) on delete cascade
);
