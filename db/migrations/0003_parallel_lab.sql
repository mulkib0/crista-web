-- 0003_parallel_lab — 1인 1후보 병렬 실험(설계 §6.4 · §7.3 · §7.4): 표적 버전 · 찜 슬롯 · 리드 낙관적 잠금 · 노트 칸 버전.
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0002 는 로컬 · 호스팅에 적용돼 있어 고치지 않는다.
--
-- 바뀌는 쓰기 규칙(서버 코드와 함께 배포해야 한다 — 0002 시절 서버는 claims · notes 에 쓸 수 없게 된다):
--   - 표적 버전: 모둠마다 program_revisions 를 1번부터 연다. 표적이 비어 있는 버전은 그 자리에서 채우고, 정한 표적을 바꾸면 새 버전.
--     작업 · 찜 · 노트 · 리드는 버전에 묶여서, 표적을 바꿨다 돌아와도 옛 버전의 결과가 근거로 섞이지 않는다.
--   - 찜: (버전, 후보) 하나에 한 명, 한 사람은 슬롯 1 · 2 까지(DB 키로 보장).
--   - 리드: 주력 · 백업 쌍을 버전 행 한 줄에서 lead_version 조건부 UPDATE 로 바꾼다(늦은 화면 → 0행 → 409).
--   - 노트: (버전, 단계, 칸) 한 행 · version 조건부 UPDATE(같은 칸 동시 수정 → 늦은 쪽 409).
-- programs 의 disease_id · target_id · target_set_* · lead_* 칸은 더 읽지 않는다(뒤 파일에서 지운다).

-- ── 표적 버전 ──

create table web.program_revisions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  revision_no integer not null check (revision_no >= 1),
  disease_id text check (disease_id ~ '^MONDO_[0-9]{7}$'),
  target_id text check (target_id ~ '^[a-z0-9]+-[a-z0-9]{4}$'),
  target_set_at timestamptz,
  target_set_by uuid references web.accounts (user_id) on delete set null,
  lead_job_id uuid,
  backup_job_id uuid,
  -- 주력 · 백업을 바꿀 때마다 1씩 오른다. 화면은 읽은 값을 expectedVersion 으로 보낸다.
  lead_version integer not null default 0 check (lead_version >= 0),
  lead_set_at timestamptz,
  lead_set_by uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_id, revision_no),
  unique (id, team_id),
  check ((disease_id is null) = (target_id is null)),
  check (lead_job_id is not null or backup_job_id is null),
  check (backup_job_id is null or backup_job_id <> lead_job_id)
);

alter table web.programs add column current_revision_id uuid;
alter table web.programs add constraint programs_current_revision_fkey
  foreign key (current_revision_id, team_id) references web.program_revisions (id, team_id);

-- 기존 모둠 — 지금 표적 · 리드 · 백업으로 1번 버전을 연다.
insert into web.program_revisions (team_id, revision_no, disease_id, target_id, target_set_at, target_set_by, lead_job_id, backup_job_id, lead_set_at, lead_set_by, created_at)
select p.team_id, 1, p.disease_id, p.target_id, p.target_set_at, p.target_set_by, p.lead_job_id, p.backup_job_id, p.lead_set_at, p.lead_set_by,
       coalesce(p.target_set_at, p.updated_at)
  from web.programs p;
update web.programs p set current_revision_id = r.id
  from web.program_revisions r
 where r.team_id = p.team_id and r.revision_no = 1;
alter table web.programs alter column current_revision_id set not null;

comment on column web.programs.disease_id is '0003 부터 읽지 않음 — program_revisions.disease_id';
comment on column web.programs.target_id is '0003 부터 읽지 않음 — program_revisions.target_id';
comment on column web.programs.lead_job_id is '0003 부터 읽지 않음 — program_revisions.lead_job_id';
comment on column web.programs.backup_job_id is '0003 부터 읽지 않음 — program_revisions.backup_job_id';

-- ── 작업(= 결과 저장소) ──

alter table web.jobs add column program_revision_id uuid;
alter table web.jobs add constraint jobs_program_revision_fkey
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id);
alter table web.jobs add constraint jobs_id_revision_key unique (id, program_revision_id);
create index jobs_revision_idx on web.jobs (program_revision_id, step) where program_revision_id is not null;

-- 지금 표적과 같은 작업만 1번 버전으로. 다른 표적의 옛 작업은 null(기록에는 남고 근거로는 세지 않는다).
-- 새 작업은 서버가 늘 버전을 넣는다(옛 작업이 아직 진행 중일 수 있어 NOT NULL 은 걸지 않는다).
update web.jobs j set program_revision_id = r.id
  from web.program_revisions r
 where r.team_id = j.team_id and r.revision_no = 1 and r.target_id is not null and j.target_id = r.target_id;

-- 리드 · 백업은 같은 버전의 작업만(작업 단계 · 성공 여부는 서버가 본다).
-- 백업은 지금 표적이 아닌 옛 작업을 가리키고 있을 수 있어 먼저 비운다(0002 서버는 표적과 같은 작업만 받았으므로 보통 0건).
update web.program_revisions r set lead_job_id = null, backup_job_id = null, lead_set_at = null, lead_set_by = null
 where r.lead_job_id is not null
   and not exists (select 1 from web.jobs j where j.id = r.lead_job_id and j.program_revision_id = r.id);
update web.program_revisions r set backup_job_id = null
 where r.backup_job_id is not null
   and not exists (select 1 from web.jobs j where j.id = r.backup_job_id and j.program_revision_id = r.id);
alter table web.program_revisions add constraint program_revisions_lead_fkey
  foreign key (lead_job_id, id) references web.jobs (id, program_revision_id);
alter table web.program_revisions add constraint program_revisions_backup_fkey
  foreign key (backup_job_id, id) references web.jobs (id, program_revision_id);

-- ── 히트 후보 찜 ──

alter table web.claims add column program_revision_id uuid;
alter table web.claims add column slot smallint;
update web.claims c set program_revision_id = j.program_revision_id
  from web.jobs j
 where j.id = c.screen_job_id;
-- 지금 표적이 아닌 스크리닝의 찜은 0002 화면에서도 보이지 않던 행이다(loadBoard 가 표적으로 걸렀다) — 버전을 정할 수 없어 지운다.
delete from web.claims where program_revision_id is null;
update web.claims c set slot = n.rn
  from (select team_id, compound_id, row_number() over (partition by program_revision_id, claimed_by order by created_at, compound_id) as rn
          from web.claims) n
 where n.team_id = c.team_id and n.compound_id = c.compound_id;
alter table web.claims alter column program_revision_id set not null;
alter table web.claims alter column slot set not null;
alter table web.claims add constraint claims_slot_check check (slot in (1, 2));
alter table web.claims drop constraint claims_pkey;
alter table web.claims add primary key (program_revision_id, compound_id);
alter table web.claims add constraint claims_person_slot_key unique (program_revision_id, claimed_by, slot);
alter table web.claims add constraint claims_program_revision_fkey
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade;
-- 찜은 같은 버전의 스크리닝 결과에서만.
alter table web.claims add constraint claims_screen_revision_fkey
  foreign key (screen_job_id, program_revision_id) references web.jobs (id, program_revision_id);

-- ── 연구 노트 ──

alter table web.notes add column program_revision_id uuid;
alter table web.notes add column version integer not null default 1 check (version >= 1);
update web.notes n set program_revision_id = p.current_revision_id
  from web.programs p
 where p.team_id = n.team_id;
-- programs 행이 없는 모둠의 노트 — 1번 버전을 열어 붙인다(0002 서버는 화면을 읽을 때 programs 를 만들어서 보통 0건).
insert into web.program_revisions (team_id, revision_no)
select distinct n.team_id, 1 from web.notes n where n.program_revision_id is null
on conflict (team_id, revision_no) do nothing;
insert into web.programs (team_id, current_revision_id)
select r.team_id, r.id from web.program_revisions r
 where r.revision_no = 1 and not exists (select 1 from web.programs p where p.team_id = r.team_id);
update web.notes n set program_revision_id = p.current_revision_id
  from web.programs p
 where p.team_id = n.team_id and n.program_revision_id is null;
alter table web.notes alter column program_revision_id set not null;
alter table web.notes drop constraint notes_pkey;
alter table web.notes add primary key (program_revision_id, step_id, section);
alter table web.notes add constraint notes_program_revision_fkey
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade;
