-- 0012_patents — 3.1 물질특허(기능 F31 · 설계 §5.8 · §7.3 · §7.4 ⑩ ⑪ ⑫). 0006 의 출원서 · 원장 표를 넓힌다.
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0008 은 고치지 않는다.
--
-- 1. 출원서에 물질 칸 — 출원서를 만들 때 워커 /molecule/properties 로 한 번 계산해 둔다(같은 물질 판정 단위 = 평면 SMILES).
--    심사 규칙(신규성 · 학급 중복)과 받아들임 트랜잭션이 워커를 부르지 않게(잠금 안에서 HTTP 없음).
-- 2. 거절 이유(known · duplicate) — 5.04 원장의 '거절 · 이미 있음' 빨간 줄은 그 모둠 화면에만.
-- 3. 모둠 안 같은 물질 출원서는 살아 있는 것 하나(다른 ADMET 작업이라도 같은 평면 SMILES 면 한 장).
-- 4. 원장 줄 ↔ 출원서: 같은 모둠 · 같은 코드명(복합 외래 키) — 받아들여진 코드명은 원장 줄이 붙잡고 있어 바꿀 수 없다(§5.8 '받아들여지면 코드명은 바꿀 수 없다').

alter table web.patent_applications add column canonical_smiles text check (char_length(canonical_smiles) between 1 and 400);
alter table web.patent_applications add column flat_smiles text check (char_length(flat_smiles) between 1 and 400);
-- 출원 물성(RDKit — MW · TPSA · cLogP · QED …). 그 모둠과 교사만 본다.
alter table web.patent_applications add column properties jsonb;
-- 이미 알려진 물질(데이터셋 승인약 · ZINC 소형 · 표적 기준 리간드 · 2.2 표시) — 만들 때 판정, 심사 때 다시 본다.
alter table web.patent_applications add column known_substance boolean not null default false;
alter table web.patent_applications add column reject_reason text check (reject_reason in ('known', 'duplicate'));
alter table web.patent_applications add constraint patent_applications_reject_status_check
  check (reject_reason is null or status = 'rejected');
alter table web.patent_applications add constraint patent_applications_accepted_code_check
  check (status not in ('reviewing', 'accepted') or code_name is not null);

create unique index patent_applications_team_flat_live_key on web.patent_applications (team_id, flat_smiles)
  where flat_smiles is not null and status not in ('rejected', 'abandoned');

alter table web.patent_applications add constraint patent_applications_id_code_key unique (id, code_name);
alter table web.patents add constraint patents_application_team_fkey
  foreign key (application_id, team_id) references web.patent_applications (id, team_id);
alter table web.patents add constraint patents_application_code_fkey
  foreign key (application_id, code_name) references web.patent_applications (id, code_name);

comment on column web.patent_applications.flat_smiles is '입체 정보를 뺀 정규 SMILES(워커 flatSmiles) — 같은 물질 판정 단위(F31 0012)';
comment on column web.patent_applications.reject_reason is 'known = 이미 알려진 물질(신규성) · duplicate = 학급 원장에 같은 물질(선착순 — §7.4 ⑩)';
