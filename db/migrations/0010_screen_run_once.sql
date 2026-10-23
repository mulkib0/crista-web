-- 0010_screen_run_once — 기능 F12(1.2 기준 회의 · 분자 쇼핑) · 설계 §7.4 ⑦ '1.2 스크리닝 동시 실행'.
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0008 은 고치지 않는다.
--
-- 서버는 이미 모둠 줄 잠금(jobs.ts startJob 의 teams FOR UPDATE) 안에서 '그 표적 버전에 queued · running 인 1.2 가 있으면 409' 를 본다
-- (features/screen.ts onJobAdmit('1.2')). 이 파일은 같은 불변식을 DB 키로도 지킨다 — 서버를 비켜 넣어도 한 버전에 진행 중 1.2 는 하나.
-- 끝나면(succeeded · failed) 키에서 빠지므로 다시 실행은 언제든 된다(실행마다 비용 — 설계 §5.5 ③).

create unique index jobs_screen_one_active_key
  on web.jobs (program_revision_id)
  where step = '1.2' and status in ('queued', 'running');
