#!/usr/bin/env node
/**
 * 화면 빌드 전 준비 — crista 에셋 사본(assets/crista)의 아틀라스 · Galmuri 를 public/assets 로 복사하고,
 * 사옥 외관 8종 × 3단계(tools/gen-campus-assets.mjs)를 public/campus 에 만든다. 둘 다 산출물이라 커밋하지 않는다(.gitignore).
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(web, '..', '..');
const src = join(repo, 'assets', 'crista');
const dst = join(web, 'public', 'assets');

const files = [
  'atlas/crista-atlas-0.png',
  'atlas/crista-atlas-0.json',
  'fonts/galmuri/Galmuri11.woff2',
  'fonts/galmuri/Galmuri11-Bold.woff2',
  'fonts/galmuri/Galmuri9.woff2',
  'fonts/galmuri/Galmuri14.woff2',
  'fonts/galmuri/GalmuriMono11.woff2',
  'fonts/galmuri/OFL.txt',
];
for (const file of files) {
  mkdirSync(dirname(join(dst, file)), { recursive: true });
  copyFileSync(join(src, file), join(dst, file));
}
const gen = spawnSync(process.execPath, [join(repo, 'tools', 'gen-campus-assets.mjs'), join(web, 'public', 'campus')], { stdio: 'inherit' });
if (gen.status !== 0) process.exit(gen.status ?? 1);
console.error(`[prepare-assets] crista 에셋 ${files.length}개 복사 · 사옥 외관 생성`);
