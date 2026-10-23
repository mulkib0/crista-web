/**
 * 정적 파일 — 화면 빌드(apps/web/dist, W2)를 같은 서버가 낸다(설계 §8: 서버 하나로 정적 · API · WebSocket).
 * 확장자 없는 경로는 index.html(화면 라우팅). 폴더 밖으로 나가는 경로는 막는다.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { SECURITY_HEADERS } from './http.ts';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/** 요청 경로 → 폴더 안의 파일 경로. 밖으로 나가면 null. */
export function resolveStaticPath(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const full = normalize(join(root, decoded));
  if (full !== root && !full.startsWith(root.endsWith(sep) ? root : root + sep)) return null;
  return full;
}

async function fileAt(path: string): Promise<{ path: string; size: number } | null> {
  try {
    const info = await stat(path);
    if (info.isFile()) return { path, size: info.size };
    if (info.isDirectory()) return fileAt(join(path, 'index.html'));
  } catch {
    // 없음
  }
  return null;
}

export async function serveStatic(root: string, req: IncomingMessage, res: ServerResponse, urlPath: string): Promise<void> {
  const notFound = () => {
    res.writeHead(404, { ...SECURITY_HEADERS, 'content-type': 'text/plain; charset=utf-8' });
    res.end('찾을 수 없습니다.');
  };
  const resolved = resolveStaticPath(root, urlPath);
  if (!resolved) return notFound();
  let file = await fileAt(resolved);
  if (!file && extname(urlPath) === '') file = await fileAt(join(root, 'index.html'));
  if (!file) return notFound();
  const type = TYPES[extname(file.path).toLowerCase()] ?? 'application/octet-stream';
  const hashed = /\/assets\/.+-[A-Za-z0-9_-]{8,}\.\w+$/.test(file.path);
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'content-type': type,
    'content-length': file.size,
    'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  if (req.method === 'HEAD') return void res.end();
  createReadStream(file.path).pipe(res);
}
