# Gemini 4 Argon (High) 의견서 — 12대 표적 질환 & 1인 1후보 병렬 실험 DB 확장 설계 (2026-10-23)

## 1. 바이오 데이터셋 DB 확장 (`bio-worker/data/` · `prepare_target.py` · `prepare_datasets.py` · `prescreen_library.py`)

### 1.1 신규 8종 결정구조(`prepare_target.py` · `redock_check.py`) 정밀 진단

현재 [`crista/apps/bio-worker/scripts/prepare_target.py`](file:///Users/mulkib/Desktop/repo/crista/apps/bio-worker/scripts/prepare_target.py#L144-L208)는 다음 3가지 가정을 전제로 동작한다.
1. `if name != chain: st[0].remove_chain(name)` — **단일 사슬(`chain`)만 남기고 다른 사슬을 모두 제거**한다.
2. `st.remove_ligands_and_waters()` — **단백질 아미노산 외의 모든 HETATM(보조인자 · 금속 이온 · 리간드 · 물)을 일괄 제거**한다.
3. 지정 사슬의 첫 번째 `resname` 잔기를 추출해 `AllChem.AssignBondOrdersFromTemplate`으로 결합 차수를 부여한다.

이 코드에 신규 8종 PDB를 넣었을 때의 구조생물학적 진단은 아래와 같다.

| 표적 ID | 질환 (`MONDO`) | PDB · 유전자 | 기준 리간드 | 현행 `prepare_target.py` 호환성 진단 | 해결 방안 |
| --- | --- | --- | --- | --- | --- |
| `maob-2v5z` | 파킨슨병 (`MONDO_0005180`) | `2V5Z` · `MAOB` | 사피나미드 (`SAG`) | ⚠️ **보조인자 FAD 주의**: `chain A`에 가역적 리간드 `SAG`가 있으나, 활성 부위 바닥 벽면을 보조인자 `FAD`가 형성함. `remove_ligands_and_waters()`가 `FAD`까지 지우면 포켓 안쪽이 비어 포즈가 밀릴 수 있음 | `TARGETS` 스펙에 `keepHet: ["FAD"]` 추가(수용체 준비 시 지정 보조인자 보존) |
| `sert-5i6x` | 주요우울장애 (`MONDO_0002009`) | `5I6X` · `SLC6A4` | 에스시탈로프람 (`803`) | ⚠️ **이중 리간드 주의**: `chain A`에 중앙 활성 포켓(S1)과 알로스테릭 포켓(S2)에 `803` 분자가 2개 존재함 | `TARGETS` 스펙에 선택적 `ligandSeq`(S1 포켓 잔기 번호) 필터 지원 |
| `abl1-2hyy` | 만성 골수성 백혈병 (`MONDO_0011996`) | `2HYY` · `ABL1` | 이마티닙 (`STI`) | ✅ **그대로 통과**: `chain A` 단일 사슬 DFG-out 포켓, 보조인자 없음(DUD-E 표준 벤치마크) | 수정 불필요 |
| `braf-3og7` | 전이성 흑색종 (`MONDO_0005105`) | `3OG7` · `BRAF` | 베무라페닙 (`032`) | ✅ **그대로 통과**: `chain A` 단일 사슬 키나아제 포켓, 보조인자 없음(DUD-E 표준 벤치마크) | 수정 불필요 |
| `hmgcr-1hw9` | 이상지질혈증 (`MONDO_0005359`) | `1HW9` · `HMGCR` | 아토르바스타틴 (`116`) | ❌ **다량체 계면 포켓(단일 사슬 시 포켓 파괴)**: HMG-CoA 환원효소의 활성 부위는 **두 사슬(`A`·`B` 또는 `C`·`D`)의 경계면(homodimer interface)**에 걸침. 단일 사슬만 남기면 포켓 절반이 사라짐 | **방안 A(권장)**: `prepare_target.py`에 `receptorChains: ["A", "B"]` 허용(리간드는 `chain: "A"`에서 추출)<br/>**방안 B(단일 사슬 대안)**: 대사증후군/고지혈증 표적을 `ppara-2p54`(페노피브레이트계) 또는 `pcsk9-6u26`으로 대체 |
| `fxa-2p16` | 혈전색전증 (`MONDO_0005265`) | `2P16` · `F10` | 아픽사반 (`GG2`) | ✅ **그대로 통과**: 촉매 사슬(`chain A`) 내에 S1/S4 포켓이 완결되어 있고 보조인자 없음 | 수정 불필요 |
| `jak1-6bvr` | 아토피 피부염 (`MONDO_0004980`) | `6BVR` / `6N7A` · `JAK1` | 우파다시티닙 / 선택적 JAK1 억제제 | ✅ **그대로 통과**: 단일 사슬(`chain A`) JH1 키나아제 힌지 포켓, 보조인자 없음 (결정 리간드 SMILES · `resname` 매칭만 검증) | 수정 불필요 |
| `pde4b-3g45` | 천식 · COPD (`MONDO_0004979`) | `3G45` · `PDE4B` | 로플루밀라스트 (`RFL`) | ⚠️ **금속 이온(`ZN` · `MG`) 배위 포켓**: 촉매 포켓 안쪽에 `ZN`, `MG` 2가 양이온이 존재함 | `keepHet: ["ZN", "MG"]` 보존 옵션 적용 후 `redock_check.py`로 `referenceRmsd <= 2.0 Å` 검증 |

#### `prepare_target.py` 최소 확장(하위 호환 100% 유지)
기존 4종(`ache-4ey7`, `egfr-1m17`, `dpp4-1x70`, `cox2-3ln1`)의 바이트 해시(`sha256`)는 1바이트도 바뀌지 않게 유지하면서, `TARGETS[target_id]` 스펙에 아래 선택 키 3개만 추가한다:
- `receptorChains?: list[str]` (기본값 `[spec["chain"]]`) — `hmgcr-1hw9`처럼 이량체 계면 포켓일 때 두 사슬 보존
- `ligandSeq?: int` — 같은 사슬에 동종 리간드가 2개 있을 때(`sert-5i6x`) 중앙 포켓 잔기 번호 지정
- `keepHet?: list[str]` — `remove_ligands_and_waters()` 호출 전 보존할 보조인자/금속(`FAD`, `ZN`, `MG`) 백업·복원

---

### 1.2 Open Targets(`disease_targets.json`) 및 ChEMBL(`compound_library.json`) 확장 전략

1. **Stage 1 (`disease_targets.json`)**:
   - `DISEASE_SPECS`를 4종 → **12종**으로 확장(`size_per_disease = 120` 유지 → 총 `12 × 120 = 1,440` 유전자 레코드, JSON 크기 약 ~450KB로 메모리 상주에 전혀 부담 없음).
   - `KNOWN_PDB_BY_GENE` 및 `DOCKING_TARGET_BY_GENE`을 12종 도킹 유전자(`ACHE`, `MAOB`, `SLC6A4`, `EGFR`, `ABL1`, `BRAF`, `DPP4`, `HMGCR`, `F10`, `PTGS2`, `JAK1`, `PDE4B`)로 확장하여 각 질환 조회 시 해당 도킹 표적이 1위(`featured: true`, `smPocket: true`)로 노출되게 보장.

2. **Stage 2 (`compound_library.json`) & 사전 도킹(`prescreen_library.py`) 연산량 제어**:
   - **문제**: 화합물을 600종으로 늘리고 12개 표적 전체에 완전 교차 도킹(`600 × 12 = 7,200`건)을 돌리면 오프라인 사전 도킹에 수 시간이 걸린다.
   - **해결(시드 확장 + 타겟 계층형 사전 도킹)**:
     - 화합물 총수는 기존 220종 + **신규 8개 표적별 핵심 시드 10종(기준 리간드 1 + FDA 승인 동종약 3 + 임상 후보 3 + 사내 합성 유도체 `CRX-<TARGET>-01..03` 3종) = 80종 추가 → 총 300종**으로 맞춘다.
     - 300종 × 12표적 = 전체 `3,600`쌍 중 기존 `220 × 4 = 880`쌍은 이미 `vina_prescreen.jsonl`에 캐시되어 있으므로, 신규 계산은 `2,720`건(`--jobs 6 --cpu 2` 기준 약 35~45분)으로 1회 오프라인 실행 가능하다.
     - 또한 빠른 증분 빌드를 위해 `prescreen_library.py`에 `--target <targetId>` 및 `--priority-seeds`(각 표적의 시드 분자 + 공용 대표 약물 60종을 먼저 도킹하는 모드) 플래그를 두면 표적당 80건(표적당 ~1.5분)만으로 즉시 검증할 수 있다.

---

## 2. PostgreSQL `web` 스키마 DB 확장 (`db/migrations/0001_core.sql`)

`AGENTS.md` 및 설계서 §7에 따라 `public` 스키마는 절대 건드리지 않고 **`web` 스키마 + 전용 역할 `crista_web`** 안에서만 구성한다.
핵심 목표는 **모둠원 3~4명이 동시에 실험·비교·노트 작성을 수행할 때 덮어쓰기(Lost Update)나 중복 과금이 발생하지 않는 정규화 구조**다.

### 2.1 핵심 테이블 설계 (13개 테이블)

```sql
-- 1. 마이그레이션 기록
create table if not exists web.schema_migrations (
  version text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
);

-- 2. 학급
create table web.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null, -- auth.users(id)
  name text not null,
  join_code char(6) not null unique,
  join_open boolean not null default true,
  team_count smallint not null check (team_count between 2 and 8),
  assign_mode text not null default 'walk-in' check (assign_mode in ('assigned', 'walk-in')),
  team_capacity smallint not null default 4 check (team_capacity between 1 and 8),
  clock_anchor_real_ms bigint not null,
  clock_anchor_game_day numeric(10,3) not null default 0,
  clock_speed numeric(6,2) not null default 1.0,
  clock_paused boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. 모둠(스타트업 제약회사)
create table web.teams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references web.classes(id) on delete cascade,
  lot_number smallint not null check (lot_number between 1 and 8),
  facade_variant smallint not null check (facade_variant between 1 and 8),
  ink_key text not null, -- 'T1'..'T8'
  company_name text,     -- 등기 전 null
  ticker text,           -- 등기 전 null
  slogan text not null default '',
  registered_at timestamptz,
  registered_by uuid,    -- auth.users(id)
  name_locked boolean not null default false, -- 첫 유료 행동 시 true
  hq_tier smallint not null default 1 check (hq_tier in (1, 2, 3)),
  balance_cents bigint not null default 600000000, -- 초기 $6.000M (센트 단위)
  created_at timestamptz not null default now(),
  unique (class_id, lot_number),
  unique (class_id, company_name),
  unique (class_id, ticker)
);

-- 4. 학급 구성원(교사 · 학생)
create table web.members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references web.classes(id) on delete cascade,
  user_id uuid not null, -- auth.users(id)
  role text not null check (role in ('teacher', 'student')),
  team_id uuid references web.teams(id) on delete set null,
  display_name text not null,
  c_level text not null default 'CSO' check (c_level in ('CEO', 'CSO', 'CTO', 'CMO')),
  joined_at timestamptz not null default now(),
  unique (class_id, user_id)
);
create index idx_web_members_team on web.members(team_id);

-- 5. 모둠 파이프라인 프로그램 (모둠당 현재 활성 1개)
create table web.programs (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references web.classes(id) on delete cascade,
  team_id uuid not null unique references web.teams(id) on delete cascade,
  disease_id text,           -- 'MONDO_...' (12종 중 확정된 질환)
  target_id text,            -- 'ache-4ey7' 등 12종 중 확정된 표적
  lead_smiles text,          -- 2.2 주력 리드 canonicalSmiles
  lead_job_id uuid,          -- 주력 리드의 도킹 근거 job_id
  backup_smiles text,        -- 2.2 백업 후보 canonicalSmiles
  backup_job_id uuid,        -- 백업 후보의 도킹 근거 job_id
  code_name text,            -- 3.1 선언 코드명 (예: 'CRX-101')
  mechanism text,            -- 3.1 기전 한 줄
  active_patent_id uuid,     -- 3.2/4.1 현재 임상 진행 중인 특허 id
  formulation text check (formulation in ('oral', 'iv', 'transdermal')),
  dose_mg smallint check (dose_mg in (10, 50, 100)),
  population text,
  endpoint text,
  brand_name text,
  package_shape text,
  package_color text,
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (class_id, code_name)
);
```

### 2.2 "1인 1후보 병렬 실험 + 비교표 합치기" 전용 테이블 (레이스 컨디션 원천 차단)

모둠원 4명이 하나의 JSONB 컬럼을 동시에 수정하면 덮어쓰기(Lost Update)가 일어난다. 따라서 **모둠원 각자의 행동이 독립된 행(Row)으로 INSERT / UPSERT** 되도록 아래 4개 테이블로 분리한다.

```sql
-- 6. [1.1 병렬 탐색] 모둠원별 질환·표적 추천 카드 (모둠원 각자 3개 질환 탐색 후 비교표에 올림)
create table web.target_proposals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams(id) on delete cascade,
  disease_id text not null,
  target_id text not null,
  gene_symbol text not null,
  proposed_by uuid not null, -- auth.users(id)
  proposed_by_name text not null,
  c_level text not null,
  rationale text not null default '', -- 한 줄 추천 근거
  overall_score numeric(5,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, target_id) -- 같은 표적에 다시 올리면 UPSERT
);

-- 7. [1.2 → 2.1 병렬 분담] 스크리닝 히트 후보 찜 & 모둠 분자 비교표 원장
-- 스크리닝에서 나온 후보나 2.1 작용기 변형체를 모둠 비교표의 한 줄로 관리한다.
create table web.team_candidates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams(id) on delete cascade,
  target_id text not null,
  canonical_smiles text not null,
  flat_smiles text not null,
  label text not null,
  source_kind text not null check (source_kind in ('screening', 'preset', 'transform', 'custom')),
  parent_smiles text,              -- 2.1 구조 변형 시 원본 분자 SMILES
  transform_chip text,             -- 적용한 작용기 변형 칩 id
  claimed_by uuid,                 -- 1.2에서 '내 담당 후보'로 찜한 학생 user_id
  claimed_by_name text,
  claimed_c_level text,
  -- 최신 계산 요약(비교표 고속 렌더링용 비정규화 캐시 — 원본은 web.jobs에 불변 보존)
  properties_json jsonb,           -- MoleculeProperties
  signals_json jsonb,              -- PropertySignals
  best_docking_job_id uuid,
  best_affinity_kcal numeric(6,2),
  best_rmsd numeric(6,2),
  plip_summary_json jsonb,         -- 핵심 상호작용 잔기 배열
  admet_job_id uuid,
  admet_json jsonb,                -- ADMET 6축 요약
  role_tag text check (role_tag in ('lead', 'backup')), -- 2.2에서 지정된 주력/백업 표시
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, target_id, canonical_smiles)
);
create index idx_web_team_candidates_lookup on web.team_candidates(team_id, target_id, best_affinity_kcal asc nulls last);

-- 8. [전 단계 공통] 워커 계산 작업 (1인 1작업 동시 실행 · 과금 · 환급 멱등 보장)
create table web.jobs (
  id uuid primary key default gen_random_uuid(),
  worker_job_id text not null unique, -- 'web-<uuid>'
  class_id uuid not null references web.classes(id) on delete cascade,
  team_id uuid not null references web.teams(id) on delete cascade,
  request_id text not null,
  created_by uuid not null,           -- 실행한 모둠원 user_id
  created_by_name text not null,      -- 비교표 byName 표시용
  created_c_level text not null,      -- 비교표 직책 배지용
  step_id text not null,              -- '1.1', '1.2', '2.1', '2.2'
  stage smallint not null,            -- 워커 호환용 1..4
  target_id text,
  canonical_smiles text,
  parent_job_id uuid references web.jobs(id),
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  source text not null check (source in ('fixture', 'dataset', 'vina', 'admet-ai')),
  cost_cents bigint not null default 0,
  refunded_cents bigint not null default 0,
  params_json jsonb not null default '{}'::jsonb,
  result_json jsonb,
  error_json jsonb,
  correction_json jsonb,              -- 교사 정정
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, request_id)
);
create index idx_web_jobs_team_step on web.jobs(team_id, step_id, created_at desc);

-- 9. [연구 노트 3칸 분리] 모둠원 3명이 같은 단계의 ① 왜 골랐나 · ② 무엇을 모르나 · ③ 실패 시 대안을 동시에 작성
create table web.notes (
  team_id uuid not null references web.teams(id) on delete cascade,
  step_id text not null, -- '1.1'..'4.2', 'seriesA', 'seriesB'
  section text not null check (section in ('why', 'unknown', 'fallback')),
  content text not null default '',
  updated_by uuid not null,
  updated_by_name text not null,
  updated_c_level text not null,
  updated_at timestamptz not null default now(),
  primary key (team_id, step_id, section)
);
```

```sql
-- 10. 원장 (연구비 지출 · 환급 · Series A/B 투자금)
create table web.ledger (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams(id) on delete cascade,
  idempotency_key text not null unique,
  kind text not null,
  amount_cents bigint not null, -- 음수=지출, 양수=수입/환급
  balance_after_cents bigint not null,
  memo text not null,
  created_by uuid,
  gm boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_web_ledger_team on web.ledger(team_id, created_at desc);

-- 11. 물질특허 (학급 내 평면 SMILES 선착순 유일)
create table web.patents (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references web.classes(id) on delete cascade,
  team_id uuid not null references web.teams(id) on delete cascade,
  target_id text not null,
  canonical_smiles text not null,
  flat_smiles text not null,
  label text,
  docking_job_id uuid not null references web.jobs(id),
  affinity_kcal numeric(6,2) not null,
  properties_json jsonb not null,
  signals_json jsonb not null,
  cost_cents bigint not null,
  filed_by uuid not null,
  filed_by_name text not null,
  filed_game_day numeric(10,3) not null,
  filed_at timestamptz not null default now(),
  unique (class_id, flat_smiles) -- 학급 전체에서 같은 평면 구조 물질특허는 선착순 1건만!
);

-- 12. 규제 심사 · 임상 단계 (3.2 IND, 4.1 임상 1·2·3상, 4.2 허가)
create table web.steps (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references web.classes(id) on delete cascade,
  team_id uuid not null references web.teams(id) on delete cascade,
  program_id uuid not null references web.programs(id) on delete cascade,
  kind text not null check (kind in ('ind', 'phase1', 'phase2', 'phase3', 'final')),
  attempt smallint not null default 1,
  status text not null check (status in ('running', 'passed', 'failed')),
  patent_id uuid not null references web.patents(id),
  protocol_json jsonb not null, -- dose, formulation, population, endpoint
  started_game_day numeric(10,3) not null,
  end_game_day numeric(10,3) not null,
  decided_game_day numeric(10,3),
  cost_cents bigint not null,
  requested_by uuid not null,
  requested_by_name text not null,
  judgement_json jsonb,         -- StepJudgement
  correction_json jsonb,        -- 교사 정정
  created_at timestamptz not null default now()
);
create index idx_web_steps_running on web.steps(class_id, status, end_game_day) where status = 'running';

-- 13. 전광판 01 소식 & 기업가치 이력
create table web.board_events (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references web.classes(id) on delete cascade,
  team_id uuid references web.teams(id) on delete cascade,
  kind text not null, -- 'listing', 'docking', 'patent', 'ind', 'phase1'..'approval', 'investment', 'rank', 'correction'
  ticker text not null,
  headline text not null,
  delta_pct numeric(6,2) not null default 0,
  market_cap_after_cents bigint not null,
  public_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_web_board_events_class on web.board_events(class_id, created_at desc);
```

### 2.3 동시성 제어 (4인 동시 조작 불변식)

1. **원장 및 유료 작업(`web.teams` 행 잠금)**:
   - 모둠원 4명이 동시에 `$0.050M` 도킹을 누르더라도 `SELECT balance_cents FROM web.teams WHERE id = $1 FOR UPDATE`로 모둠 행을 잠근 뒤 잔액을 차감하고 `web.ledger`와 `web.jobs`를 한 트랜잭션에 기록한다.
2. **비교표 합산(`web.team_candidates` UPSERT)**:
   - 도킹이나 ADMET이 완료되면 `(team_id, target_id, canonical_smiles)` 키로 `INSERT ... ON CONFLICT DO UPDATE`를 수행하되, `best_affinity_kcal = LEAST(web.team_candidates.best_affinity_kcal, EXCLUDED.best_affinity_kcal)`로 갱신해 가장 좋은 도킹값을 유지한다.
3. **표적 변경 시 `review` 강등**:
   - IND 신청 전 1.1에서 `programs.target_id`를 바꾸면, 기존 `team_candidates`와 `jobs`는 해당 `target_id` 키로 그대로 보존되어 날아가지 않으며, 서버의 `StepView` 계산기가 현재 `programs.target_id`와 일치하는 도킹/ADMET 근거만 완료 조건으로 인정(불일치 시 `state: 'review'`)한다.

---

## 3. 공유 계약(`shared-types` · `web-contract`) 및 판정(`game-rules`) 연동

1. **`DISEASE_TO_TARGET` · `DOCKING_TARGETS` · `TRIAL_OPTIONS` 12종 확장**:
   - CNS 표적 3종(`ache-4ey7`, `maob-2v5z`, `sert-5i6x`)은 `cns: true`로 설정해 `score.ts`에서 뇌 노출(`bbb`: `TPSA <= 90`, 적정 `cLogP`)이 임상 2·3상 효능 점수에 반영되게 한다.
   - 종양 표적 중 뇌전이 환자군이 흔한 2종(`egfr-1m17`, `braf-3og7`)은 `TRIAL_OPTIONS[targetId].brainPopulations`에 뇌전이 환자군을 넣어 선택 시 동적으로 `cns: true` 판정을 켠다.
   - 국소/호흡기 질환 2종(`jak1-6bvr` 아토피 피부염, `pde4b-3g45` 천식·COPD)은 `transdermal`(경피 외용제 · 비강/흡입제 범주) 선택 시 제형 적합성 조건(`MW <= 420`, `cLogP 1.0~4.0`)을 만족하면 전신 부작용 감경(안전성 S 보너스)을 받도록 기존 `score.ts`의 제형 규칙과 자연스럽게 맞물린다.

---

## 4. 단계별 실행 계획

| 단계 | 작업 내용 | 완료 기준 |
| --- | --- | --- |
| **D1. 수용체 8종 검증 · 준비** | `prepare_target.py`에 `receptorChains` · `keepHet` · `ligandSeq` 옵션 추가 후 신규 8종 PDB 준비 + `redock_check.py` 실행 | 12종 전체 `receptor.pdbqt` · `reference_ligand.sdf` 생성 및 재도킹 `referenceRmsd <= 2.0 Å` 통과 |
| **D2. Open Targets · ChEMBL 12종 확장** | `prepare_datasets.py`에 12대 질환 · 표적별 시드 화합물 추가 → `prescreen_library.py` → `prepare_datasets.py --offline` | `disease_targets.json`(12질환 × 120유전자) · `compound_library.json`(12표적 `vinaKcalByTarget`) · `manifest.json` 무결성 통과 |
| **D3. `shared-types` 12종 동기화** | `crista`의 `DOCKING_TARGETS` · `DISEASE_TO_TARGET` · `TRIAL_OPTIONS`에 12종 반영 후 `crista-web/packages/shared-types`로 사본 동기화 | 타입체크 및 12종 표적별 기준 리간드 임상 시뮬레이션(`score.ts`) 통과율 검증 |
| **D4. `web` 스키마 마이그레이션(`0000` · `0001`)** | `db/migrate.mjs` + `0000_bootstrap.sql` + `0001_core.sql`(13개 테이블 · 인덱스 · 제약조건) 작성 및 로컬 적용 | 4인 동시 후보 추천 · 후보 찜 · 병렬 도킹 비교표 합산 · 노트 3칸 동시 저장 시 덮어쓰기 0건 |
