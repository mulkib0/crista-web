-- 0008_same_team_keys — 3.2 전임상 행이 남의 모둠 특허 · 계획서를 가리키지 못하게 복합 외래 키를 더한다(설계 §7.3 '복합 외래 키' 원칙 · §7.4 ⑬ ⑭).
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0007 은 고치지 않는다.
--
-- 0006 은 jobs.patent_id · jobs.protocol_id · iacuc_protocol_patents 를 단일 키로만 이었다 — 서버 검사를 비켜 가면
-- 1모둠의 동물실험 작업이 2모둠의 특허로 과금 · 결과를 남기거나, 1모둠 계획서에 2모둠 특허가 들어갈 수 있었다.
-- patents · iacuc_protocols 는 이미 unique (id, team_id) 가 있어 그것을 가리킨다. 적용 시점에 세 칸 모두 0행(기능 전)이라 채울 것이 없다.

-- ── 작업 → 특허 · 계획서: 같은 모둠만(MATCH SIMPLE — 칸이 비면 검사하지 않는다) ──
alter table web.jobs add constraint jobs_patent_team_fkey foreign key (patent_id, team_id) references web.patents (id, team_id);
alter table web.jobs add constraint jobs_protocol_team_fkey foreign key (protocol_id, team_id) references web.iacuc_protocols (id, team_id);

-- ── 계획서에 넣은 특허: 같은 모둠만 ──
alter table web.iacuc_protocol_patents add column team_id uuid;
update web.iacuc_protocol_patents x set team_id = p.team_id from web.iacuc_protocols p where p.id = x.protocol_id;
alter table web.iacuc_protocol_patents alter column team_id set not null;
alter table web.iacuc_protocol_patents
  add constraint iacuc_protocol_patents_protocol_team_fkey foreign key (protocol_id, team_id) references web.iacuc_protocols (id, team_id) on delete cascade,
  add constraint iacuc_protocol_patents_patent_team_fkey foreign key (patent_id, team_id) references web.patents (id, team_id) on delete cascade;
