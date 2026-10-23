# crista-web 서버 운영 이미지 — Railway 프로젝트 crista 의 `crista-web` 서비스(deploy/README.md).
# 빌드 컨텍스트는 저장소 루트다(워크스페이스 패키지 · CA 를 함께 넣는다).
#   docker build -f apps/server/Dockerfile .
# Node 26 타입 지우기로 .ts 를 바로 실행한다(빌드 단계 없음 — 로컬 `npm run dev:server` 와 같은 코드 경로).
# crista 게임 서버와 같은 26.11 줄(26.11.0 이미지는 게시되지 않아 26.11.1).
FROM node:26.11.1-slim

WORKDIR /app

# 의존성 층 — 잠금 파일이 모든 워크스페이스를 담고 있어 package.json 을 다 넣고, 설치는 서버 몫만(개발 의존성 제외).
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/web-contract/package.json packages/web-contract/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/game-rules/package.json packages/game-rules/
RUN npm ci -w @crista-web/server --omit=dev --no-audit --no-fund && npm cache clean --force

# 소스 — 서버 · 통신 규격 · crista 사본(표적 · 비용 · 물성 신호) · Supabase 루트 CA(verify-full).
COPY packages/web-contract packages/web-contract
COPY packages/shared-types packages/shared-types
COPY packages/game-rules packages/game-rules
COPY apps/server apps/server
COPY certs certs

ENV NODE_ENV=production
USER node
EXPOSE 3390

# npm 을 거치지 않고 node 가 직접 SIGTERM 을 받게 한다(웹소켓 · DB 연결 정리).
CMD ["node", "apps/server/src/index.ts"]
