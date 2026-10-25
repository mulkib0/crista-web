// '다음' 합의안 적용 점검 공용 — playwright(전역 설치) · 로그인 · 문제 모으기 · 띠 · 라임 단추 · 넘침 검사.
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// playwright 는 저장소 의존성이 아니라 전역 설치를 쓴다 — PLAYWRIGHT_ROOT(node_modules 폴더)가 있으면 그곳, 없으면 `npm root -g`.
const root = process.env.PLAYWRIGHT_ROOT ?? execSync('npm root -g', { encoding: 'utf8' }).trim();
const require = createRequire(join(root, '/'));
export const { chromium } = require('playwright');
export const out = dirname(fileURLToPath(import.meta.url));
export const base = process.env.BASE ?? 'http://127.0.0.1:5190';
export const STEPS = ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2'];

export function watch(page, who, issues) {
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('401')) issues.push(`${who} console: ${m.text().slice(0, 240)}`); });
  page.on('pageerror', (e) => issues.push(`${who} pageerror: ${String(e).slice(0, 240)}`));
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/api/me')) issues.push(`${who} ${r.status()} ${r.request().method()} ${r.url().replace(base, '')}`); });
}

export async function session(browser, W, who, id, pw, issues) {
  const ctx = await browser.newContext({ viewport: { width: W, height: W > 500 ? 900 : 844 }, deviceScaleFactor: W > 500 ? 1 : 2 });
  const p = await ctx.newPage();
  watch(p, who, issues);
  await p.goto(`${base}/crista/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#id', { timeout: 20000 });
  await p.fill('#id', id);
  await p.fill('#pw', pw);
  await p.click('button.auth-go');
  await p.waitForTimeout(2500);
  return p;
}

export async function openStep(p, step) {
  const btn = p.locator('button.st', { has: p.locator('.st-n', { hasText: step }) }).first();
  await btn.click({ timeout: 8000 });
  await p.waitForTimeout(2200);
}

/** 한 화면 검사 — 띠(자리 · 문구 · 상태) · 라임 단추 수 · 문서 가로 넘침 · 사슬 · 보기 토글 잘림 · 화면 글 이상. */
export async function inspect(p) {
  return p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const band = document.querySelector('.nband');
    const r = band?.getBoundingClientRect();
    const btn = band?.querySelector('.nb-btn');
    const lime = [...document.querySelectorAll('button, a, [role="button"], .nb-btn')].filter((el) => {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height || el.closest('[hidden]')) return false;
      return getComputedStyle(el).backgroundColor === 'rgb(198, 255, 74)';
    }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)}「${el.textContent.trim().slice(0, 30)}」`);
    const clipped = [];
    for (const row of document.querySelectorAll('.chain, .vtog')) {
      const rr = row.getBoundingClientRect();
      if (row.scrollWidth > row.clientWidth + 1) clipped.push(`${row.className} scroll ${row.scrollWidth}>${row.clientWidth}`);
      for (const it of row.querySelectorAll('.chain-i, .chain-g, .vtog-i')) {
        const b = it.getBoundingClientRect();
        if (b.right > Math.min(rr.right, vw) + 1 || b.left < Math.max(rr.left, 0) - 1) clipped.push(`${it.className}「${it.textContent.trim().slice(0, 16)}」`);
      }
    }
    const t = document.body.innerText;
    const errs = ['서버 오류', '오류가 났', '불러오지 못', 'undefined', 'NaN', '[object Object]', 'null 크리스타', '완료 조건을 채우면'].filter((x) => t.includes(x));
    const htabs = document.querySelectorAll('.htabs').length;
    return {
      band: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), inView: r.top >= 0 && r.bottom <= vh + 1 } : null,
      tone: btn?.getAttribute('data-tone') ?? null,
      text: btn?.textContent.trim() ?? null,
      clickable: btn?.tagName === 'BUTTON',
      where: band?.querySelector('.nb-t span')?.textContent ?? null,
      lime,
      docOverflow: document.documentElement.scrollWidth > vw + 1,
      clipped: clipped.slice(0, 6),
      errs,
      htabs,
      chain: [...document.querySelectorAll('.chain-i')].map((x) => `${x.getAttribute('aria-pressed') === 'true' ? '●' : ''}${x.textContent.trim()}`).join(' → ') + (document.querySelector('.chain-g') ? ` ⇒ ${document.querySelector('.chain-g').textContent.trim()}` : ''),
      views: [...document.querySelectorAll('.vtog-i')].map((x) => `${x.getAttribute('aria-pressed') === 'true' ? '●' : ''}${x.textContent.trim()}`).join(' | '),
      notes: document.querySelector('.nfold-h')?.textContent.trim() ?? null,
      arrive: document.querySelector('.arrive')?.innerText.replace(/\n+/g, ' / ') ?? (document.querySelector('.arrive-fold')?.textContent.trim() ?? null),
    };
  });
}

/** 본문을 맨 아래까지 내리고 공유 자료를 접은 뒤에도 띠가 같은 자리에 있나. */
export async function bandStays(p) {
  const before = await p.evaluate(() => document.querySelector('.nband')?.getBoundingClientRect().top ?? null);
  await p.evaluate(() => { const b = document.querySelector('.bd-body'); b?.scrollTo({ top: b.scrollHeight }); });
  await p.waitForTimeout(300);
  const bottom = await p.evaluate(() => document.querySelector('.nband')?.getBoundingClientRect().top ?? null);
  const tg = p.locator('.tm-tg');
  let folded = null;
  if (await tg.count()) {
    await tg.first().click();
    await p.waitForTimeout(300);
    folded = await p.evaluate(() => document.querySelector('.nband')?.getBoundingClientRect().top ?? null);
    await tg.first().click();
    await p.waitForTimeout(200);
  }
  await p.evaluate(() => document.querySelector('.bd-body')?.scrollTo({ top: 0 }));
  await p.waitForTimeout(200);
  return { before, bottom, folded, same: before !== null && Math.abs(before - bottom) < 2 && (folded === null || Math.abs(before - folded) < 2) };
}
