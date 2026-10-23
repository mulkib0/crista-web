-- 0004_password_verifiers — 로그인 비밀번호 확인을 서버 안에서 끝낸다(GoTrue 의 IP 당 로그인 상한 회피).
-- crista_web 연결로 적용한다(이 표의 소유자 = crista_web). web 스키마 밖은 만들거나 바꾸지 않는다.
--
-- 왜: 모든 로그인이 서버 IP 하나에서 GoTrue `token?grant_type=password` 로 나가 호스팅 상한(버킷 30)에 걸렸다
--     (2026-10-23 mulk.codes 동시 40건 → 30 성공 · 10 실패). 한 교실은 학교 공인 IP 하나라 IP 전달을 켜도 같다.
-- 규칙(apps/server/src/passwords.ts):
--   - 검증값이 있는 계정은 GoTrue 를 부르지 않고 이 값으로만 확인한다.
--   - 가입 · 교사 발급 · 비밀번호 재설정이 GoTrue 와 함께 쓴다. 재설정은 지우고 → GoTrue 바꾸고 → 다시 쓴다
--     (중간에 끊기면 검증값이 없어 GoTrue 로 확인한다 — 어긋난 값이 남지 않는다).
--   - 이 파일 전에 만든 계정은 다음 GoTrue 로그인이 성공할 때 채운다.
-- 계정 표와 따로 둔다 — 계정을 읽는 질의(select *)에 섞여 나가지 않게.

create table web.password_verifiers (
  user_id uuid primary key references web.accounts (user_id) on delete cascade,
  -- scrypt$<log2 N>$<r>$<p>$<소금 base64>$<해시 base64> — 평문 · GoTrue 해시는 두지 않는다.
  verifier text not null check (verifier ~ '^scrypt\$[0-9]{2}\$[0-9]{1,2}\$[0-9]{1,2}\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$' and char_length(verifier) <= 200),
  updated_at timestamptz not null default now()
);
