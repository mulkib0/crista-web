// 마무리 점검 스크린샷 — 1440 · 390. 실제 Claude 로 끝까지 민 학급(e2e:full E2E_FULL_LLM=all)의 모둠 A 학생 · 교사로 찍어요.
// 쓰는 법: node .review/2026-10-24-final/shoot.mjs <학생 아이디> <학생 비밀번호> <교사 아이디> <교사 비밀번호> [base=http://127.0.0.1:5250]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/opt/homebrew/lib/node_modules/');
const { chromium } = require('playwright');
const [studentId, studentPw, teacherId, teacherPw, base = 'http://127.0.0.1:5250'] = process.argv.slice(2);
const out = dirname(fileURLToPath(import.meta.url));
// ONLY=s41-result TAG=llm — 고른 학생 화면만, 파일 이름에 꼬리표(교사 아이디가 '-' 이면 교사 화면은 건너뜀).
const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean);
const TAG = process.env.TAG ? `-${process.env.TAG}` : '';

/** 학생 화면 — 단계 · 탭(sessionStorage 키 → 값). */
const allStudentShots = [
  { name: 's12', step: '1.2', tabs: { 'step:1.2': 'brief' } },
  { name: 's12-meet', step: '1.2', tabs: { 'step:1.2': 'meet', 'step:1.2:meet': 'agenda' } },
  { name: 's21', step: '2.1', tabs: { 'step:2.1': 'gauge' } },
  { name: 's31-review', step: '3.1', tabs: { 'step:3.1': 'review' } },
  { name: 's33', step: '3.3', tabs: { 'step:3.3': 'lab' } },
  { name: 's41-result', step: '4.1', tabs: { 'step:4.1': 'result' } },
  { name: 's42-pack', step: '4.2', tabs: { 'step:4.2': 'pack' } },
  { name: 's42-result', step: '4.2', tabs: { 'step:4.2': 'result' } },
];
const studentShots = allStudentShots.filter((x) => !ONLY.length || ONLY.includes(x.name));
const teacherShots = teacherId === '-' ? [] : ['progress', 'reviews', 'clinical', 'market', 'llm'];

const report = [];

async function login(page, id, pw) {
  await page.goto(`${base}/crista/login`);
  for (let i = 0; i < 8; i++) {
    // 다른 세션이 화면 파일을 고치면 HMR 로 페이지가 다시 읽혀 fetch 가 끊겨요 — 다시 해요.
    const r = await page
      .evaluate(
        async ([a, b]) => (await fetch('/crista/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginId: a, password: b }) })).status,
        [id, pw],
      )
      .catch(() => 0);
    if (r === 200) return;
    await page.waitForTimeout(5000);
  }
  throw new Error(`login ${id}`);
}

async function overflow(page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const bad = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('.tbl-w, .mk-led, .led, [class*="marquee"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.right > w + 1 && getComputedStyle(el).position !== 'fixed') bad.push(`${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).slice(0, 30)} ${Math.round(r.right)}`);
    }
    return { doc: document.documentElement.scrollWidth > w, bad: bad.slice(0, 8), serverError: document.body.innerText.includes('서버 오류') };
  });
}

async function shot(page, width, name) {
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `${width}-${name}${TAG}.png`), fullPage: true });
  const o = await overflow(page);
  report.push({ width, name, ...o });
  console.log(width, name, o.doc ? 'DOC-OVERFLOW' : 'ok', o.serverError ? 'SERVER-ERROR' : '', o.bad.join(' | '));
}

const browser = await chromium.launch();
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: width > 500 ? 900 : 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await login(page, studentId, studentPw);
  for (const s of studentShots) {
    await page.evaluate((tabs) => Object.entries(tabs).forEach(([k, v]) => sessionStorage.setItem(`crista.tab.${k}`, v)), s.tabs);
    await page.goto(`${base}/crista/board`);
    await page.locator('button.st', { hasText: s.step }).first().click({ timeout: 20000 });
    await page.waitForTimeout(2500);
    await shot(page, width, s.name);
  }
  // 전광판 · 최종 순위(마감된 학급 — 위 띠 순위 단추가 최종 순위 창을 열어요).
  if (ONLY.length) { await ctx.close(); continue; }
  await page.goto(`${base}/crista/board`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(out, `${width}-board.png`), fullPage: false });
  report.push({ width, name: 'board', ...(await overflow(page)) });
  const rank = page.locator('button.tb-btn.rank').first();
  if (await rank.count()) {
    await rank.click();
    await page.waitForTimeout(2000);
    await shot(page, width, 'final');
    await page.keyboard.press('Escape');
  } else console.log('rank button 없음', width);
  await ctx.close();

  const tctx = await browser.newContext({ viewport: { width, height: width > 500 ? 900 : 844 }, deviceScaleFactor: 1 });
  const tp = await tctx.newPage();
  await login(tp, teacherId, teacherPw);
  for (const sec of teacherShots) {
    await tp.evaluate((v) => sessionStorage.setItem('crista.tab.teacher:section', v), sec);
    await tp.goto(`${base}/crista/teacher`);
    await tp.waitForTimeout(3000);
    await shot(tp, width, `teacher-${sec}`);
  }
  await tctx.close();
}
await browser.close();
writeFileSync(join(out, `shoot-report${TAG}.json`), JSON.stringify(report, null, 1));
