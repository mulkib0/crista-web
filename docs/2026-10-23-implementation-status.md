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
- **로그인은 서버 안에서 확인(0004)**: GoTrue 비밀번호 확인 끝점은 IP 당 상한이 있고(호스팅 실측 — 한 IP 동시 40건 중 30 성공 · 10 실패 `503 auth_unavailable`)
  모든 로그인이 서버 IP 하나에서 나가서 한 반이 몰리면 막혔다(한 교실은 학교 공인 IP 하나라 'IP Address Forwarding' 을 켜도 같다).
  그래서 `web.password_verifiers`(scrypt N=2^15 · r 8 · p 1, 상수 시간 비교)로 확인한다 — 가입 · 교사 발급 · 재설정(`passwords.ts changePassword`)이 GoTrue 와 함께 쓰고,
  0004 전에 만든 계정은 다음 GoTrue 로그인이 성공할 때 채운다. 검증값이 있으면 GoTrue 를 부르지 않는다. Supabase Auth 설정은 바꾸지 않았다.
  고친 뒤 호스팅 한 IP 동시 40건 × 3회 모두 200(서버 처리 p50 1.2초). 로컬 GoTrue 는 IP 상한이 꺼져 있어(`GOTRUE_RATE_LIMIT_HEADER` 없음 — 2000건에 429 0건)
  재현은 Kong 앞에 같은 토큰 버킷(용량 30)을 건 프록시로 했다.
  GoTrue 비밀번호를 대시보드에서 직접 바꾸면 그 계정의 검증값 줄을 지워야 한다(교사는 `teacher:create --reset-password` 를 쓴다).
- **가입 몰림**: 정원 확인용 학급 줄 잠금에 같은 학급 가입이 한 줄로 선다. 잠근 뒤에는 '세면서 넣기' 한 문장과 커밋만 두고, DB 풀의 빈 연결 대기를 5 → 20초로 늘렸다
  (호스팅 실측 — 고치기 전 동시 40건 중 18건이 풀 대기 5초 초과로 500, 고친 뒤 40/40 · 서버 처리 p50 8.7초).
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
| Supabase crista(호스팅) | 스키마 `web`(0000 · 0001 · 0002 · 0004), 역할 `crista_web`(세션 풀러 `crista_web.<ref>`), 경계 점검 12/12 |
| Railway 프로젝트 crista | 서비스 `crista-web`(싱가포르 · 복제본 1) — https://crista-web-production.up.railway.app (게이트웨이 비밀 없는 API 는 403) |
| Vercel 팀 moranzz | 프로젝트 `crista-web` — https://crista-web.vercel.app |
| Cloudflare 존 mulk.codes | Worker `crista-web-gateway` · 경로 `mulk.codes/crista` · `mulk.codes/crista/*` |
| 호스팅 계정 | 교사 `webteacher`(선생님) · 점검 학급 `W6 배포 점검`(코드 JGED5W) · 점검 학생 `w6stua` · `w6stub` · 모둠 「배포바이오」 BAEP |
| 호스팅 계정(로그인 몰림 점검) | 교사 `lbteachaa32` · 학급 「로그인 몰림 점검 acef」(6B94NV, 학생 22 — 고치기 전 가입) · 「로그인 몰림 점검 acc5」(GVTS2N, 학생 40) — 아이디 `lb…` |

## 4. 남은 위험 · 결정

1. **crista 의 Railway IaC** — crista PR #7(`deploy/railway-keep-crista-web`)이 `crista-web` 을 그 파일에 적어 plan 이 변경 0건이 됐다. **병합 전까지는** crista main 에서 apply 하면 지우는 계획이 그대로 나온다.
2. 워커는 지금 표적 4종(crista `DOCKING_TARGETS`) — 12대 질환 확장(§6.1.1)은 crista 저장소 변경.
3. 로그인은 GoTrue 상한과 무관해졌다(위). 0004 전에 만든 계정만 첫 로그인 한 번 GoTrue 를 거친다.
4. 호스팅 점검 학급 · 계정(W6 · 로그인 몰림 점검)을 남길지 지울지.

### 6.11 F11 — 1.1 질환 · 표적 선정: 내 작업대 도구 5종 · 추천 서랍(설계 §5.4.2 · 2026-10-24 사용자 지시 "1~5 를 직접 적용하자")

시안 `design/target-select-10.html` 01~05 의 **기능**을 지금 '둥근 섬' 화면에 넣었다(`styles.css` · `StepLayout` · 판 · 카드 모양은 그대로).

| 층 | 파일 | 한 일 |
| --- | --- | --- |
| 규격 | `packages/web-contract/src/target.ts`(새) | 근거 4종 `TARGET_EVIDENCE` · 준비 상태 `targetTier` · 표적 8개 `targetShortlist`(워커 rank 1~8 = 도킹 표적 + 종합 상위 7 → 종합 순) · 가중치 `PICK_WEIGHT` · `pickWeightsOk` · `myTargetScore` · 추천 근거 6종 `TARGET_PICK_REASONS` + `checkTargetPickReasons`(시안 `REASONS[].check` 그대로 — 막음 `block` · 주의 `warn`) · 12대 질환 카탈로그 `TARGET_DISEASE_GROUPS` · 재도킹 값 `TARGET_REDOCK` · 한글 이름 `TARGET_KO_NAME` · 요청 `TargetPickRequest`. `TargetPickView` 에 `reasons` · `weights` |
| DB | `db/migrations/0009_target_pick_reasons.sql`(새) | `target_picks.reasons text[] not null default '{}'`(6개까지) · `weights real[]`(4개 · 0~3). 로컬 적용함 · **호스팅 미적용** |
| 서버 | `apps/server/src/pipeline.ts` `pickTarget` · `loadBoard` | `targetId` 를 보내면 질환의 도킹 표적과 같은지(아니면 400 `invalid_input` "도킹 준비된 표적은 X 하나예요") · 모르는/겹친 근거 400 · 가중치 틀림 400 · 근거가 있으면 그 질환 표적 8개(워커 10분 캐시)로 같은 코치를 다시 돌려 **막음이면 400 `reason_blocked`** · 주의는 받음 · 근거 없는 앞 판 요청은 그대로(`reasons = {}`). 다시 올리면 메모 · 근거 · 가중치가 함께 바뀜. board 의 picks 에 `reasons` · `weights` |
| 화면 | `apps/web/src/board/steps/s11.tsx` · `s11-viz.tsx`(새) · `s11.css` | 머리 걸음 탭 ① 질환 지도(질환군 4 × 3 타일 → 근거 열지도) ② 관계망 ③ 내 점수(가중치 슬라이더 · 빠른 설정 · 32개 누적 막대, 상위 14 밖의 ◆ 4개는 점선 아래 늘 표시) ④ 32개 한눈에(축 끊김 산점도 · 필터 · 가리키면 이름) ⑤ 카드 뒤집기(✓ 카드 뒤집으면 서랍). 탭 아래 공통 **추천 서랍**: 정보판 + 공용 `ReasonChips`(여럿) + 칩마다 코치 줄(✓ · △ · ✕) + 한 줄 이유(≤ 90자) + [모둠에 올리기] · 준비 안 된 표적이면 [X 보러 가기]. 모둠 공유: ② 작은 망 4개 + 깃발 · ③ 모둠원 가중치 · 내 점수 1위 표 · ④ 깃발 산점도 · 추천 카드(근거 · 코치 · 한 줄 이유 · 가중치) · [이 표적으로 확정](그대로) |

- 탭 · 고른 표적 · 가중치 · 필터 · 뒤집은 카드는 개인 상태(`useLocalTab('step:1.1')` · `useBenchState('s11:…')`). 한 줄 이유는 다른 질환으로 옮기면 비운다.
- 새 색은 `s11.css` 의 `--e1~--e4`(근거) · `--d1~--d4`(질환)만 — 화면에 어두운 판이 없어 어두운 값은 `:root[data-theme="dark"]` 에만 둔다. 공용 `.btn` 에 눌림 모양이 없어 필터 · 빠른 설정 토글은 `.s11 .btn[aria-pressed="true"]` 로 잉크 채움.
- 폰(≤ 860px): 그림은 판 안에서 가로로 넘기고(최소 520~560px — 글씨가 너무 작아지지 않게) 타일 2열 · 카드 2열. 390 폭에서 문서 · 본문 가로 넘침 0.

**설계와 다른 것**: 마이그레이션 번호 `0009`(인계의 '00NN' — 0019 는 같은 날 모둠 대화방이 써서 겹쳤고, 로컬 기록을 관리자 연결로 `0009` 로 옮김) · 가중치 칸은 `int[4]` 가 아니라 `real[]`(0.5 단위를 담으려고 — 0.5 단위 · 하나 이상 0 초과는 서버가 본다) · '다른 모둠이 안 고른 질환' 근거는 `board` 가 다른 모둠의 질환을 주지 않아 늘 **주의**("전광판 공개 서랍에서 확인해 보세요") — 선점 배지도 뺐다 · 찬성 · 정족수 · 회의 기록 · 모둠원 뒤집기 진행은 넣지 않음(§5.4.2).

**시험**: `npm run typecheck`(web-contract · web · 내 서버 파일 통과 — 서버 `scripts/e2e-feed.ts` 의 TS2371 은 모둠 대화방 작업 파일) · `npm test` 160 + 197 통과(새 `packages/web-contract/test/target.test.ts` 11건) · `node tools/with-local-env.mjs node apps/server/scripts/e2e-target.ts`(새) 9/9 — 표적 8개에 도킹 표적 · 엉뚱한 targetId 400 · 모르는/겹친 근거 400 · ACHE '유전' · '발현' 근거 400 `reason_blocked` · 가중치 틀림 400 · 주의만 200 · 다시 올리면 바뀜 · 앞 판 요청 200 · board picks 근거 · 가중치 · 확정 → 1.1 완료 · 1.2 열림 · `npm run e2e:parallel` 통과(1.1 추천 4장 동시 · 동시 확정 포함). 화면: Playwright 두 프로필(학생 2 · 같은 모둠)로 ① ACHE 막음 코치 → 단추 막힘 → 근거 고쳐 올리기 · ② EGFR 올리기 → 깃발 · ③ 유전만 · 32개 모두 · ④ 필터 · PTGS2 카드 뒷면 · ⑤ 당뇨 카드 뒤집기 → DPP4 서랍 · 다른 프로필이 확정 → 실시간 반영 → [다음 단계로 — 1.2] → 1.2 화면. 콘솔 오류 0. 스크린샷 `.review/2026-10-24-s11/`(1440 9장 · 390 3장).

**남은 것**: 호스팅 DB 에 0009 적용(사용자 확인 뒤 — `npm run db:dry-run:hosted` 먼저) · 다른 모둠 선점 표시(board 에 다른 모둠 질환을 줄지 결정) · 찬성 · 정족수(시안의 모둠 공유 장치 — 넣을지 사용자 결정) · 12대 질환 나머지 8종 데이터(crista 일 — §6.1.1).
