-- 0013_preclinical — 기능 F32: 3.2 전임상 · 동물실험(설계 §5.9 · §7.3 · §7.4 ⑬ ⑭).
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0008 은 고치지 않는다.
--
-- 0006 이 둔 표(ethics_training · iacuc_protocols · iacuc_sections · iacuc_protocol_patents · jobs 3.2 칸)에 더하는 것:
--   - 계획서는 표적 버전마다 하나(변경은 같은 계획서를 고쳐 다시 심의 — 실제 IACUC 변경승인).
--   - 계획서의 구조 칸(고통등급 · 종료시점 숫자 · 실험 수행자)과 설정 낙관적 잠금 판, 심의 접수 때의 스냅숏(승인되면 approved_snapshot 으로 옮긴다).
--   - 학생 계산 칸(NOAEL → HED → MRSD — 맞으면 3.3 신청서에 붙는다) · 종료보고서(주력 근거 칩 · 회고 한 줄).

-- ── ② 계획서: 표적 버전마다 하나 ──
create unique index iacuc_protocols_revision_key on web.iacuc_protocols (program_revision_id);

alter table web.iacuc_protocols
  -- 개선(Refinement) — 학생이 고른 효력 모델 고통등급(규칙: 모델 표와 다르면 보완) · 인도적 종료시점 체중 감소 %(비면 보완).
  add column pain_grade text check (pain_grade in ('A', 'B', 'C', 'D', 'E')),
  add column endpoint_weight_loss_pct smallint check (endpoint_weight_loss_pct between 1 and 50),
  -- 실험 수행자(교육 이수한 모둠원) — 서버가 같은 모둠 · 이수 여부를 확인한다.
  add column performer_ids uuid[] not null default '{}' check (cardinality(performer_ids) <= 6),
  -- 설정(후보 · 수준 · 고통등급 · 종료시점 · 수행자) 낙관적 잠금 — 칸 저장(version)과 따로 센다(서로 다른 칸을 동시에 고쳐도 409 가 나지 않게).
  add column settings_version integer not null default 0 check (settings_version >= 0),
  -- 심의 접수 때의 판 · 스냅숏 — 통과하면 approved_* 로 옮긴다(그 사이 칸을 고쳐도 심의받은 판대로).
  add column pending_version integer check (pending_version >= 1),
  add column pending_snapshot jsonb,
  add constraint iacuc_protocols_pending_check check ((pending_version is null) = (pending_snapshot is null)),
  add constraint iacuc_protocols_approved_snapshot_check check ((approved_version is null) = (approved_snapshot is null));

-- ── ④ 학생 계산 칸 — 동물실험 작업 하나에 한 줄. 한 번 맞으면 그대로 둔다(늦은 틀린 답이 덮지 않게 — 서버 upsert 조건) ──
create table web.preclinical_calcs (
  job_id uuid primary key,
  program_revision_id uuid not null,
  team_id uuid not null,
  answers jsonb not null,
  ok boolean not null,
  checked_by uuid references web.accounts (user_id) on delete set null,
  checked_at timestamptz not null default now(),
  foreign key (job_id, program_revision_id) references web.jobs (id, program_revision_id) on delete cascade,
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade
);

-- ── ⑤ 종료보고서 — 표적 버전마다 한 줄. 주력 근거 칩(지정과 같은 트랜잭션) · 학생 회고 한 줄(낙관적 잠금) ──
create table web.preclinical_reports (
  program_revision_id uuid primary key,
  team_id uuid not null,
  lead_reason text check (lead_reason ~ '^[a-z][a-z0-9_]{0,39}$'),
  reflection text not null default '' check (char_length(reflection) <= 200),
  reflection_version integer not null default 0 check (reflection_version >= 0),
  reflection_by uuid references web.accounts (user_id) on delete set null,
  updated_at timestamptz not null default now(),
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade
);

-- 3.2 작업 찾기(게임 시계 처리기 · 결과판) — 표적 버전 · 특허별.
create index jobs_preclinical_idx on web.jobs (program_revision_id, patent_id) where step = '3.2';
