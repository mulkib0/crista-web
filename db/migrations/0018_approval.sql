-- 0018_approval — 4.2 최종 허가(기능 F42 — 2026-10-24 사용자 지시 · 설계 §6.1 4.2 줄 · §5.3 허가 소식 · 시안 design/step-viz/viz-8.js 8.01 · 8.06 · 8.08).
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0008 은 고치지 않는다.
--
-- 흐름: 브랜드 이름(학급 유일) · 포장(모양 · 색 · 라벨, 모둠 공유 · 낙관적 잠금) · 신청서 칸(nda_sections) → 서류 심사(doc_reviews 'nda') →
--       passed → 접수(teams 잠금 · 'approval_fee' $0.100M · 멱등 키 approval:<id>) → submitted(+60게임 일) → 게임 시계 처리기가 approved.
-- 공개 범위: 브랜드 · 포장은 허가 전까지 그 모둠과 교사만(이 표는 학급 채널로 보내지 않는다). 허가 뒤 전광판 소식(board_events 'approval')이 브랜드를 공개한다.
-- 다른 기능과 겹치는 CHECK(doc_reviews.doc_kind · ledger.kind)는 지금 정의를 읽어 값만 더한다 — 다른 예약 번호 파일이 먼저 넓혔어도 그 값을 지우지 않게.

-- ── 허가 신청서 — 표적 버전마다 한 건(같은 버전에서 두 번 접수 · 두 번 과금이 생기지 않는 바탕) ──
create table web.approval_applications (
  id uuid primary key default gen_random_uuid(),
  program_revision_id uuid not null,
  team_id uuid not null,
  class_id uuid not null,
  -- 허가 대상 — 3상을 통과한 프로토콜(특허 분자 · 제형 · 용량). 3상 전 초안에서는 IND 승인 값(임시)이거나 비어 있다.
  patent_id uuid,
  form text check (form in ('oral', 'iv', 'transdermal')),
  dose_mg smallint check (dose_mg in (10, 50, 100)),
  -- 4.1(F41)의 3상 통과 기록 id — 접수 때 고정한다(임상 표 이름이 정해진 뒤 외래 키로 바꿀 수 있다).
  trial_ref text check (char_length(trial_ref) between 1 and 80),
  -- ① 브랜드 이름(2~12자) · 학급 유일 열쇠(빈칸 없이 소문자). 판(brand_version)으로 낙관적 잠금.
  brand_name text check (char_length(brand_name) between 2 and 12),
  brand_key text check (char_length(brand_key) between 2 and 12),
  brand_version integer not null default 0 check (brand_version >= 0),
  brand_by uuid references web.accounts (user_id) on delete set null,
  -- ② 포장(8.06) — 모양 · 색 · 라벨 배치. 판(package_version)으로 낙관적 잠금.
  package_shape text check (package_shape in ('tablet', 'capsule', 'vial', 'patch')),
  package_color text check (package_color in ('ivory', 'sage', 'sand', 'sky', 'blush', 'lilac')),
  package_layout text check (package_layout in ('top', 'center', 'band')),
  package_version integer not null default 0 check (package_version >= 0),
  package_by uuid references web.accounts (user_id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'reviewing', 'revise', 'passed', 'submitted', 'approved')),
  -- 서류 판 — 칸 · 브랜드 · 포장을 저장할 때마다 1씩 오른다. 심사는 그 시각 판을 고정한다(§7.4 ⑪).
  version integer not null default 1 check (version >= 1),
  submitted_at timestamptz,
  submitted_by uuid references web.accounts (user_id) on delete set null,
  submitted_game_day double precision check (submitted_game_day >= 0),
  decide_game_day double precision check (decide_game_day >= 0),
  decided_game_day double precision check (decided_game_day >= 0),
  approved_at timestamptz,
  -- 허가증 번호(예: NDA SEUM-102-822).
  certificate_no text check (char_length(certificate_no) between 1 and 40),
  created_by uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id),
  constraint approval_applications_revision_key unique (program_revision_id),
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade,
  foreign key (team_id, class_id) references web.teams (id, class_id) on delete cascade,
  foreign key (patent_id, team_id) references web.patents (id, team_id),
  check ((brand_name is null) = (brand_key is null)),
  -- 심사 · 접수부터는 서류가 다 차 있어야 한다.
  check (status in ('draft', 'revise') or (patent_id is not null and form is not null and dose_mg is not null and brand_name is not null
         and package_shape is not null and package_color is not null and package_layout is not null)),
  check (status not in ('submitted', 'approved') or (submitted_at is not null and submitted_game_day is not null and decide_game_day is not null and trial_ref is not null)),
  check ((status = 'approved') = (approved_at is not null and decided_game_day is not null and certificate_no is not null)),
  -- 포장 = 허가 제형 — 접수 이후는 DB 도 막는다(정제 · 캡슐 = 경구, 바이알 = 정맥, 패치 = 경피).
  check (status not in ('submitted', 'approved') or form = case package_shape when 'tablet' then 'oral' when 'capsule' then 'oral' when 'vial' then 'iv' when 'patch' then 'transdermal' end)
);
-- 학급 안 브랜드 유일 — 두 모둠이 같은 이름을 동시에 저장해도 한 쪽만(늦은 쪽 409).
create unique index approval_applications_brand_key on web.approval_applications (class_id, brand_key) where brand_key is not null;
-- 게임 시계 처리기 — 학급마다 만기 접수 건.
create index approval_applications_due_idx on web.approval_applications (class_id, decide_game_day) where status = 'submitted';

-- ── 신청서 칸(효능 한 줄 · 라벨 주의사항 2개) — 세 서류와 같은 꼴(reviews.ts saveSection · 칸 단위 낙관적 잠금 ⑪) ──
create table web.nda_sections (
  application_id uuid not null references web.approval_applications (id) on delete cascade,
  section text not null check (section ~ '^[a-z][a-z0-9_]{0,31}$'),
  body text not null check (char_length(body) <= 4000),
  version integer not null default 1 check (version >= 1),
  updated_by uuid references web.accounts (user_id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (application_id, section)
);

-- ── 서류 심사 종류 'nda' · 원장 종류 'approval_fee' — 지금 CHECK 정의에 값만 더한다 ──
do $$
declare
  def text;
begin
  select pg_get_constraintdef(c.oid) into def
    from pg_constraint c where c.conrelid = 'web.doc_reviews'::regclass and c.conname = 'doc_reviews_doc_kind_check';
  if def is null then raise exception 'web.doc_reviews_doc_kind_check 를 찾지 못했습니다'; end if;
  if position('''nda''' in def) = 0 then
    if position('ARRAY[' in def) = 0 then raise exception '예상하지 못한 CHECK 꼴: %', def; end if;
    alter table web.doc_reviews drop constraint doc_reviews_doc_kind_check;
    execute 'alter table web.doc_reviews add constraint doc_reviews_doc_kind_check ' || replace(def, 'ARRAY[', 'ARRAY[''nda''::text, ');
  end if;

  select pg_get_constraintdef(c.oid) into def
    from pg_constraint c where c.conrelid = 'web.ledger'::regclass and c.conname = 'ledger_kind_check';
  if def is null then raise exception 'web.ledger_kind_check 를 찾지 못했습니다'; end if;
  if position('''approval_fee''' in def) = 0 then
    if position('ARRAY[' in def) = 0 then raise exception '예상하지 못한 CHECK 꼴: %', def; end if;
    alter table web.ledger drop constraint ledger_kind_check;
    execute 'alter table web.ledger add constraint ledger_kind_check ' || replace(def, 'ARRAY[', 'ARRAY[''approval_fee''::text, ');
  end if;
end $$;

-- ── 원장 줄의 게임 날짜(8.08 영수증 '날짜와 함께') — 넣는 순간의 학급 게임 일을 트리거가 적는다 ──
-- 기능 코드는 바꾸지 않아도 된다(값을 직접 넣으면 그 값을 쓴다). 식은 clock.ts gameDaySql 과 같다.
alter table web.ledger add column game_day double precision check (game_day >= 0);
create function web.ledger_set_game_day() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if new.game_day is null then
    select case when c.clock_paused then c.clock_anchor_day
                else c.clock_anchor_day + c.clock_rate * greatest(0, extract(epoch from (now() - c.clock_anchor_at)) / 60.0) end
      into new.game_day
      from web.teams t join web.classes c on c.id = t.class_id
     where t.id = new.team_id;
  end if;
  return new;
end
$$;
create trigger ledger_game_day before insert on web.ledger for each row execute function web.ledger_set_game_day();
-- 이미 있는 줄은 지금 시계의 앵커로 거꾸로 셈한다(시계를 바꾼 적이 없으면 정확, 0006 전 줄은 D+0).
update web.ledger l
   set game_day = greatest(0, case when c.clock_paused and l.created_at >= c.clock_anchor_at then c.clock_anchor_day
                                   else c.clock_anchor_day + c.clock_rate * (extract(epoch from (l.created_at - c.clock_anchor_at)) / 60.0) end)
  from web.teams t join web.classes c on c.id = t.class_id
 where t.id = l.team_id and l.game_day is null;
