import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * 공개 주소 https://mulk.codes/crista — 빌드는 `dist/crista/…` 로 낸다(Vercel 의 출력 폴더 = dist, 경로 그대로).
 * 로컬: 화면 5190 → 서버 3390 으로 `/crista/api` · `/crista/ws` 를 넘긴다(crista 의 5173/5174 와 겹치지 않게).
 */
const SERVER = process.env.WEB_SERVER_ORIGIN ?? 'http://127.0.0.1:3390';

export default defineConfig({
  base: '/crista/',
  plugins: [react()],
  build: {
    outDir: 'dist/crista',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
  },
  server: {
    host: '127.0.0.1',
    port: 5190,
    strictPort: true,
    proxy: {
      '/crista/api': { target: SERVER },
      '/crista/ws': { target: SERVER.replace(/^http/, 'ws'), ws: true },
    },
  },
  preview: { host: '127.0.0.1', port: 5190, strictPort: true },
});
