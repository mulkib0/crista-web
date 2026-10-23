/**
 * 서버 진입점 — 로컬: `npm run dev:server`(포트 3390, 127.0.0.1).
 */
import { createApp } from './app.ts';
import { ClockRunner } from './clock.ts';
import { loadConfig } from './config.ts';
import { createLimits } from './context.ts';
import { bindTeamFeed } from './features/feed.ts';
import { assertDatabase, createPool } from './db.ts';
import { GoTrueClient } from './gotrue.ts';
import { Hub } from './hub.ts';
import { JobRunner } from './jobs.ts';
import { LlmClient } from './llm.ts';
import { ReviewRunner } from './reviews.ts';
import { sweepExpiredSessions } from './sessions.ts';
import { HttpBioWorker } from './worker.ts';

const config = loadConfig();
const db = createPool(config);
await assertDatabase(db);
const hub = new Hub(db, config.allowedOrigins);
const auth = new GoTrueClient({ url: config.supabaseUrl, publishableKey: config.publishableKey, secretKey: config.secretKey });
const worker = new HttpBioWorker(config.bioWorkerUrl);
const jobs = new JobRunner(db, worker, hub);
const llm = new LlmClient(config.llm, db);
const deps = { config, db, auth, hub, limits: createLimits(), worker, jobs, llm };
// 작업 성공 처리기(`onJobSucceeded` — 예: FMARKET 도킹 신기록 소식)가 전체 의존성을 쓰게.
jobs.bindDeps(deps);
// 모둠 대화방 행적 — 모둠 채널로 나가는 소식(작업 · 노트 · 회의 · 심사 …)을 문장으로 남긴다(features/feed.ts).
bindTeamFeed(deps);
// createApp 이 경로표를 만들 때 기능 모듈의 register() 가 onReviewed · onGameDay 처리기를 단다 — 시계 · 심사 루프는 그 뒤에 시작한다.
const server = createApp(deps);
const clock = new ClockRunner(deps);
const reviews = new ReviewRunner(deps);
// WEB_BACKGROUND=off — 작업 폴러 · 시계 · 심사 루프를 돌리지 않는다(요청만 받는다). 같은 로컬 DB 에 다른 판의 서버(예: 항체 랩 worktree)가
// 함께 붙을 때, 루프는 한 서버만 돌게 해서 판정 · 기업가치를 다른 판의 코드가 처리하지 않게 한다.
const background = process.env.WEB_BACKGROUND !== 'off';
if (background) {
  jobs.start();
  clock.start();
  reviews.start();
} else {
  console.log('[server] WEB_BACKGROUND=off — 작업 폴러 · 시계 · 심사 루프를 돌리지 않아요(다른 서버가 맡음).');
}
console.log(`[llm] ${llm.available ? `${config.llm.model} · effort ${config.llm.effort}${config.llm.fallbacks ? ' · fallbacks default' : ''}` : `꺼짐(${llm.unavailableReason}) — 서류 심사 · 임상은 규칙 자동 판정(교사 대기 없음) · 학습 채점은 pending`}`);

const sweep = () => sweepExpiredSessions(db).catch((error: Error) => console.error('[session] 만료 세션 정리 실패:', error.message));
await sweep();
const sweeper = setInterval(sweep, 60 * 60 * 1000);
sweeper.unref();

server.listen(config.port, config.host, () => {
  console.log(
    `[server] crista-web ${config.target} — http://${config.host}:${config.port}${config.basePath}/ (정적 ${config.staticDir} · 워커 ${config.bioWorkerUrl}${config.gatewaySecret ? ' · 게이트웨이 비밀 확인' : ''})`,
  );
});

let closing = false;
function shutdown(signal: string): void {
  if (closing) return;
  closing = true;
  console.log(`[server] ${signal} — 닫는 중`);
  hub.close();
  jobs.stop();
  clock.stop();
  reviews.stop();
  server.close(() => {
    void db.end().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 5_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
