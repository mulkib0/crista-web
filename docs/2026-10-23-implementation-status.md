# 구현 기록 — W1 · W2 · W3(발견 · 최적화) · W6 배포 (2026-10-23)

> 설계 문서(`2026-10-23-crista-web-design.md`)를 다른 세션이 고치는 중이라 구현 결과를 여기에 따로 적는다. 그 세션이 끝나면 §7.2 · §7.3 · §8 · §11 에 옮긴다.

## 1. 지금 열린 것

| 단계 | 상태 | 어디서 확인했나 |
| --- | --- | --- |
| W1 서버 · 계정 | 완료(앞 커밋 a742153) | 로컬 `npm run e2e:w1` 19/19(이번에도 다시 통과) |
| W2 화면 ① ② | 완료 | 로컬 두 브라우저 프로필 · 호스팅 두 프로필 |
| W3 ③ 뼈대 + 1.1 → 2.2 | 완료(로컬 fixture 워커 · 호스팅 compute 워커) | 로컬 두 프로필이 동시에 찜 · 도킹 → 한 비교표 · 노트 칸별 · 리드 지정 / 호스팅 1.1 → 2.1 실제 Vina |
| W6 배포 | 완료 — https://mulk.codes/crista | 호스팅 가입 → 사옥 지구 입사 · 등기 → ③ → 2.1 실제 Vina(ΔG −11.83, PLIP PHE295 · TYR124 · TRP86, 14초) |
| W4 · W5 | 아직 — 3.x · 4.x 는 잠긴 단계(노트 초안만), LED 띠는 설립 등기 소식만 | — |

## 2. 설계와 달라진 것 · 정한 것

- **배포 모양**(§8 은 "서버 하나를 Railway 에"): 사용자 지시로 화면은 Vercel, 공개 주소는 `mulk.codes/crista`. mulk.codes 가 Cloudflare 존(경로마다 Worker)이고
  Vercel rewrite 가 WebSocket 을 넘기지 않아 **Cloudflare Worker 게이트웨이**가 앞에 선다 — `/crista/api` · `/crista/ws` 는 Railway 서버, 나머지는 Vercel. 자세히는 `deploy/README.md`.
- **공개 접두 `/crista`**: 서버가 접두를 떼고 본다(접두 없는 경로도 받는다). 세션 쿠키 `Path=/crista`(같은 호스트의 다른 서비스로 가지 않게). 화면 빌드는 `dist/crista/…`.
- **게이트웨이 비밀**: 호스팅 서버는 `x-crista-gateway` 가 맞지 않는 `/api`(건강 확인 제외) · `/ws` 를 거절, 사용자 IP 는 `x-crista-client-ip`.
- **로그인 IP 상한**: GoTrue 비밀번호 확인에 secret 키 + `Sb-Forwarded-For`(학생 IP)를 싣는다. 프로젝트 설정 'IP Address Forwarding' 이 꺼져 있으면 무시된다 —
  켜는 것은 게임과 같은 프로젝트 설정이라 사용자 결정으로 남긴다(꺼진 채면 한 반이 몇 분 안에 몰아서 로그인할 때 GoTrue 429 가 날 수 있다).
- **표(0002_pipeline)**: `programs`(확정 표적 · 주력 리드 · 백업) · `target_picks`(1.1 추천 카드) · `ledger`(정수 센트 · 멱등 키) · `jobs`(워커 작업 · 과금 · 환급 · 폴러 상태) ·
  `claims`(1.2 찜, 후보 하나에 한 명, 한 사람 3개까지) · `notes`(단계 × 칸). 설계 §7.3 의 `patents` · `steps` · `board_events` · `valuations` 는 W4 · W5.
- **비용**: crista 사본 `paidWorkCostCents`(HTVS · 도킹 · ADMET 각 $0.050M), 초기 연구비 `INITIAL_RESEARCH_FUND_CENTS`($6.000M). 첫 유료 작업이 스타트업 이름을 잠근다.
- **환급**: 워커 실행 실패(failed · 시간 초과 · 접수 5회 실패)만 같은 작업 id 로 한 번. 계산할 수 없는 SMILES 는 과금 전에 워커 물성 확인에서 거절.
- **2.2 입력**: 우리 모둠이 지금 표적으로 끝낸 도킹 작업 id 만 받는다(정규 SMILES 를 서버가 그 작업에서 꺼낸다 — crista 결함 '도킹 근거 대조' 회피).
- **사옥 외관 8종 × 3단계**: `tools/gen-campus-assets.mjs` 가 SVG 로 만든다(빌드 때 생성, 커밋하지 않음). 잉크 8색은 앞 4색 crista `TEAM_INK` + 06 팔레트 4색(`apps/web/src/ink.ts`).
- **작용기 변형 칩**: 워커 `POST /molecule/transform` 이 crista 에 없어 SMILES 직접 편집 + 무료 물성 미리보기 + '구조 바꿔 다시'(부모 작업 기록)로 대신했다(설계 §10 그대로).

## 3. 호스팅에 만든 것

| 어디 | 무엇 |
| --- | --- |
| Supabase crista(호스팅) | 스키마 `web`(0000 · 0001 · 0002), 역할 `crista_web`(세션 풀러 `crista_web.<ref>`), 경계 점검 12/12 |
| Railway 프로젝트 crista | 서비스 `crista-web`(싱가포르 · 복제본 1) — https://crista-web-production.up.railway.app (게이트웨이 비밀 없는 API 는 403) |
| Vercel 팀 moranzz | 프로젝트 `crista-web` — https://crista-web.vercel.app |
| Cloudflare 존 mulk.codes | Worker `crista-web-gateway` · 경로 `mulk.codes/crista` · `mulk.codes/crista/*` |
| 호스팅 계정 | 교사 `webteacher`(선생님) · 점검 학급 `W6 배포 점검`(코드 JGED5W) · 점검 학생 `w6stua` · `w6stub` · 모둠 「배포바이오」 BAEP |

## 4. 남은 위험 · 결정

1. **crista 의 Railway IaC** 가 `crista-web` 을 지우는 계획을 낸다(`deploy/README.md` 주의). crista 저장소 변경이 필요하다.
2. 워커는 지금 표적 4종(crista `DOCKING_TARGETS`) — 12대 질환 확장(§6.1.1)은 crista 저장소 변경.
3. 같은 Supabase 의 IP Address Forwarding(위).
4. 호스팅 점검 학급 · 계정을 남길지 지울지.
