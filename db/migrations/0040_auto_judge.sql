-- 0040_auto_judge — 파이프라인에서 교사 승인을 없앤다(2026-10-24 사용자 지시 "교사 승인은 없애라. LLM이 적절히 처리하게 해. 바로 처리하지는 말고 뜸을 좀 들여").
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0019 는 고치지 않는다(0020~0039 는 항체 랩 예약이라 0040 을 쓴다).
-- 쓰기 규칙은 apps/server/src/reviews.ts · features/clinical.ts 머리 주석.

-- ── 1. 서류 심사 — 숙고 기간 · 자동 판정 ──
-- AI 판정이 나와도 바로 공개하지 않는다: held_verdict 에 담아 두고 release_game_day(접수 게임 일 + DOC_REVIEW_GAME_DAYS)가 지나면
-- 시계 틱이 verdict 로 옮기며 onReviewed 처리기를 부른다. AI 를 쓸 수 없으면(장애 · 거절 · 하루 상한 · 키 없음) llm_status 'auto' —
-- 규칙 자동 판정을 같은 숙고 기간 뒤에 공개한다(교사를 기다리지 않는다).
alter table web.doc_reviews add column release_game_day double precision;
alter table web.doc_reviews add column held_verdict text check (held_verdict in ('pass', 'revise', 'reject'));
alter table web.doc_reviews drop constraint doc_reviews_llm_status_check;
alter table web.doc_reviews add constraint doc_reviews_llm_status_check
  check (llm_status in ('skipped', 'cached', 'queued', 'done', 'failed', 'refused', 'unavailable', 'filtered', 'manual', 'auto'));
create index doc_reviews_release_idx on web.doc_reviews (release_game_day) where verdict = 'pending' and held_verdict is not null;

-- ── 2. 임상 — 시뮬레이션을 쓸 수 없으면 규칙 결과 ──
-- 'rule' = AI 시뮬레이션이 끝내 안 되어 game-rules 참고 확률로 판정을 정하고 규칙 표로 숫자를 만든 결과(끝나는 게임 일에 공개 — 교사 판정 대기 없음).
alter table web.clinical_trials drop constraint clinical_trials_result_source_check;
alter table web.clinical_trials add constraint clinical_trials_result_source_check check (result_source in ('llm', 'teacher', 'rule'));

-- ── 3. 기본 시계 배율 2 → 12(게임 일 / 현실 분) ──
-- 100분 수업(또는 50분 × 2)에 3.2 ~ 4.2 기다림이 들어가게(web-contract CLOCK_RATE_DEFAULT). 이미 있는 학급의 배율은 바꾸지 않는다(교사가 정한 값).
alter table web.classes alter column clock_rate set default 12;
