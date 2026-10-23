-- 0009_target_pick_reasons — 1.1 추천 카드의 근거 칩 · 가중치(설계 §5.4.2 · 시안 design/target-select-10.html 01~05).
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 앞 파일은 고치지 않는다(0009 는 비어 있던 번호 — 0019 는 모둠 대화방, 0020~ 은 항체 랩 예약).
--
-- reasons — 고른 추천 근거 id(web-contract TARGET_PICK_REASONS 6종). 서버가 같은 코치 규칙으로 다시 판정해 '막음'이면 받지 않는다.
--           앞 판 카드(근거 없이 올린 것)는 빈 배열.
-- weights — ③ 내 점수 가중치(유전 · 약물 · 문헌 · 발현), 원소 4개 · 0~3. 0.5 단위 · 하나 이상 0 보다 큼은 서버가 본다. 안 보냈으면 null.
-- 다시 올리면(UQ team, user, disease) 메모 · 근거 · 가중치가 함께 바뀐다.

alter table web.target_picks
  add column reasons text[] not null default '{}'
    check (cardinality(reasons) <= 6 and array_position(reasons, null) is null),
  add column weights real[]
    check (weights is null or (cardinality(weights) = 4 and array_position(weights, null) is null and 0 <= all (weights) and 3 >= all (weights)));
