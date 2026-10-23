# 배포 — https://mulk.codes/crista (W6)

```text
브라우저 ── https://mulk.codes/crista/…  (Cloudflare 존 mulk.codes)
              │  Worker crista-web-gateway (deploy/gateway) — 경로 mulk.codes/crista · mulk.codes/crista/*
              ├─ /crista/api/* · /crista/ws ──▶ Railway 프로젝트 crista · 서비스 crista-web (싱가포르, 복제본 1)
              │      + x-crista-gateway(공유 비밀) · x-crista-client-ip(CF 가 본 사용자 IP)        https://crista-web-production.up.railway.app
              │                                  │ http://bio-worker.railway.internal:8787 (내부망 · compute 워커)
              │                                  │ Postgres crista_web.<ref> — 세션 풀러 5432, verify-full(certs/)
              │                                  └ Supabase Auth — <아이디>@web.crista.test
              └─ 그 밖의 /crista/* ─────────────▶ Vercel 팀 moranzz · 프로젝트 crista-web   https://crista-web.vercel.app
```

## 왜 이 모양인가

- **mulk.codes 는 Cloudflare 존**이고 응답은 경로마다 Worker 가 한다(뿌리 A 레코드는 자리표 `192.0.2.1`, `/2026synapse` 는 다른 Worker). Vercel 에 도메인을 넘기면 다른 경로가 깨진다.
- **Vercel 의 외부 rewrite 는 WebSocket 업그레이드를 넘기지 않는다** — 그래서 Vercel rewrite 로 API 를 Railway 에 붙이는 대신, Worker 가 앞에 서서 API · WS 는 Railway 로, 화면은 Vercel 로 보낸다. 브라우저 입장에서 모두 같은 출처(mulk.codes)라
  세션 쿠키(HttpOnly · `Path=/crista`) · Origin 확인 · WebSocket 쿠키 인증이 로컬과 같다.
- **서버는 Railway 에** — 워커가 Railway 내부망 전용(`bio-worker.railway.internal`)이라서(설계 §8).
- 서버는 게이트웨이 비밀이 없는 `/api`(건강 확인 `/api/health` 제외) · `/ws` 를 받지 않는다 — 공개 Railway 도메인으로 게이트웨이를 건너뛸 수 없다. 사용자 IP 는 게이트웨이 머리를 쓴다(가입 · 로그인 상한).

## 명령

```sh
# 1) 호스팅 DB — dry-run 을 보이고 확인 뒤(AGENTS.md)
npm run db:status:hosted
npm run db:dry-run:hosted
node tools/with-hosted-env.mjs node db/migrate.mjs --yes-hosted
npm run db:check:hosted                 # crista_web 경계 12항목(호스팅)

# 2) 서버 — Railway(저장소 루트에서, `railway link` 로 crista 프로젝트에 연결된 상태)
railway up --service crista-web --detach
railway deployment list -s crista-web
railway logs -s crista-web

# 3) 화면 — Vercel(팀 moranzz). 커밋 작성자 이메일은 이 저장소 로컬 설정(mulkib0@)이어야 한다(crista 배포 기록 §9 TEAM_ACCESS_REQUIRED).
vercel deploy --prod --scope moranzz

# 4) 게이트웨이 — deploy/gateway 에서. 비밀은 --secrets-file 로만(파일은 커밋 · 출력 금지).
cd deploy/gateway && npm install && npx wrangler deploy --secrets-file <비밀 JSON>

# 5) 교사 계정(호스팅) — 비밀번호를 한 번만 출력한다
npm run teacher:create:hosted -- --login <아이디> --name <이름>
```

`cf deploy`(Cloudflare 공식 CLI 베타)는 지금 새 설정 형식(`cloudflare.config.ts`, `--experimental-new-config`)만 받아 `wrangler.jsonc` 의 경로(routes) Worker 를 올리지 못한다 — 그래서 4) 만 wrangler 를 쓴다.

## Railway 서비스 `crista-web`

| 항목 | 값 |
| --- | --- |
| 빌드 | `apps/server/Dockerfile`(`node:26.11.1-slim`, `npm ci -w @crista-web/server --omit=dev`, `node apps/server/src/index.ts`) |
| 상태 확인 | `/api/health`(서버는 DB 연결 · 마이그레이션 0002 확인 뒤에야 듣는다) · 제한 60초 · 드레이닝 15초 |
| 지역 · 복제본 | `asia-southeast1-eqsg3a` 1(crista 의 두 서비스와 같은 곳 — 이 플랜은 한 지역만 된다) |
| 변수(일반) | `WEB_TARGET=hosted` · `PORT=3390` · `WEB_HOST=::` · `BIO_WORKER_URL=http://bio-worker.railway.internal:8787` · `WEB_ALLOWED_ORIGINS=https://mulk.codes` · `WEB_BASE_PATH=/crista` · `WEB_PGSSLROOTCERT=certs/supabase-prod-ca-2021.crt` · `WEB_AUTH_EMAIL_DOMAIN=web.crista.test` |
| 변수(비밀 — `railway variable set --stdin` 로만) | `SUPABASE_URL` · `SUPABASE_PUBLISHABLE_KEY` · `SUPABASE_SECRET_KEY` · `WEB_DATABASE_URL`(crista_web) · `WEB_GATEWAY_SECRET` |
| 업로드 제외 | `.railwayignore`(`.env*` · `.review/` · `design/` · `docs/` · `assets/` · 화면 산출물) |

**주의 — crista 의 IaC 와 겹침.** crista 저장소의 `.railway/railway.ts` 는 프로젝트 전체를 한 파일로 관리한다(이름 있는 partial 없음).
그 파일에 없는 `crista-web` 은 crista 쪽에서 `railway config apply` 를 하면 **지우는 계획**이 나온다(2026-10-23 `railway config plan`: `1 to destroy — Delete service crista-web`,
비대화형에서는 `--confirm-destructive` 가 있어야 실제로 지운다). 고치려면 crista 저장소 변경이 필요하다 — crista 의 `railway.ts` 에 `crista-web` 서비스를 함께 적거나(한 파일 = 권장),
두 저장소가 각자 이름 있는 partial 을 쓰도록 바꾼다(이 저장소만 partial 을 쓰면 crista 의 파일이 'partial 이 필요하다'며 멈춘다).

## Vercel 프로젝트 `crista-web`

`vercel.json` — 설치 `npm ci` · 빌드 `npm run build -w @crista-web/web` · 출력 `apps/web/dist`(안이 `crista/…` 라 경로가 그대로 맞는다) ·
`/` → `/crista/` 이동 · `/crista/*` 의 파일 없는 경로는 `/crista/index.html`(화면 라우팅). 서버 · 비밀값이 없다(환경 변수 0개).
`.vercelignore` 로 `.env*` · `design/` · `docs/` · `certs/` 등을 올리지 않는다.

## 되돌리기

- 게이트웨이 경로를 지우면(`deploy/gateway` 의 Worker 삭제) mulk.codes/crista 는 다시 비고, 다른 경로는 영향 없다.
- Railway `crista-web` 서비스 삭제 · Vercel `crista-web` 프로젝트 삭제는 각각 독립이다.
- DB 는 db/README.md 의 '모두 걷어내기'.
