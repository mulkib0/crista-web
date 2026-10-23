/**
 * 서버 진입점 — 로컬: `npm run dev:server`(포트 3390, 127.0.0.1).
 */
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createLimits } from './context.ts';
import { assertDatabase, createPool } from './db.ts';
import { GoTrueClient } from './gotrue.ts';
import { Hub } from './hub.ts';
import { sweepExpiredSessions } from './sessions.ts';

const config = loadConfig();
const db = createPool(config);
await assertDatabase(db);
const hub = new Hub(db, config.allowedOrigins);
const auth = new GoTrueClient({ url: config.supabaseUrl, publishableKey: config.publishableKey, secretKey: config.secretKey });
const server = createApp({ config, db, auth, hub, limits: createLimits() });

const sweep = () => sweepExpiredSessions(db).catch((error: Error) => console.error('[session] 만료 세션 정리 실패:', error.message));
await sweep();
const sweeper = setInterval(sweep, 60 * 60 * 1000);
sweeper.unref();

server.listen(config.port, config.host, () => {
  console.log(`[server] crista-web ${config.target} — http://${config.host}:${config.port} (정적 ${config.staticDir})`);
});

let closing = false;
function shutdown(signal: string): void {
  if (closing) return;
  closing = true;
  console.log(`[server] ${signal} — 닫는 중`);
  hub.close();
  server.close(() => {
    void db.end().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 5_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
