// 설명 덩어리 · 배지 삭제 점검 스크린샷(2026-10-24) — 1440 · 390. 9단계 + 위 띠 · 최종 순위 · 교사 화면.
// 쓰는 법: node .review/2026-10-24-declutter/shoot.mjs <학생 아이디> <학생 비밀번호> <교사 아이디> <교사 비밀번호> [base=http://127.0.0.1:3460]
// 학급은 `WEB_PORT=3460 LLM_DISABLED=1 E2E_FULL_STOP=approval npm run e2e:full` 로 허가까지 민 뒤 교사가 마감한 것(최종 순위가 보이게).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/opt/homebrew/lib/node_modules/');
const { chromium } = require('playwright');
const [studentId, studentPw, teacherId, teacherPw, base = 'http://127.0.0.1:3460'] = process.argv.slice(2);
const out = dirname(fileURLToPath(import.meta.url));

/** 학생 화면 — 단계 · 탭(sessionStorage 키 → 값). 공유 자료 칸은 펴 둔다(두 섬 모두 보이게). */
const studentShots = [
  { name: 's11', step: '1.1', tabs: { 'step:1.1': 'map' } },
  { name: 's12', step: '1.2', tabs: { 'step:1.2': 'brief', 'step:1.2:brief': 'mission' } },
  { name: 's21', step: '2.1', tabs: { 'step:2.1': 'cards' } },
  { name: 's22', step: '2.2', tabs: { 'step:2.2': 'lights' } },
  { name: 's31', step: '3.1', tabs: { 'step:3.1': 'pick' } },
  { name: 's32', step: '3.2', tabs: { 'step:3.2': 'protocol' } },
  { name: 's33', step: '3.3', tabs: { 'step:3.3': 'lab' } },
  { name: 's41', step: '4.1', tabs: { 'step:4.1': 'result' } },
  { name: 's42', step: '4.2', tabs: { 'step:4.2': 'result' } },
];
const teacherShots = ['progress', 'reviews', 'clinical', 'market'];
const report = [];

async function login(page, id, pw) {
  await page.goto(`${base}/crista/login`);
  for (let i = 0; i < 6; i++) {
    const r = await page
      .evaluate(
        async ([a, b]) => (await fetch('/crista/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginId: a, password: b }) })).status,
        [id, pw],
      )
      .catch(() => 0);
    if (r === 200) return;
    await page.waitForTimeout(3000);
  }
  throw new Error(`login ${id}`);
}

/** 가로 넘침 — 문서 폭이 화면보다 넓은가 + 화면 밖으로 나간 요소(가로 넘김 표 · 전광판 띠 안쪽은 뺀다). */
async function overflow(page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const bad = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('.tbl-w, .mq, .led, .htabs, [class*="marquee"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.right > w + 1 && getComputedStyle(el).position !== 'fixed') bad.push(`${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).slice(0, 30)} ${Math.round(r.right)}`);
    }
    const text = document.body.innerText;
    // 지운 글이 다시 나오는지 — 머리 '단계 소개' · 성격 배지 · 설명 판.
    const gone = ['단계 소개', '실제 산업에서는', '완료 조건 ·', '흔들림 전 예상치', 'AI 심사 ·', 'AI 예측', '교육용 모의 판정', '이 단계에서 하는 일', '무엇을 배우나', 'AI 시뮬레이션 · 교육용', '시가총액 순위'].filter((t) => text.includes(t));
    return { doc: document.documentElement.scrollWidth > w, bad: bad.slice(0, 8), serverError: text.includes('서버 오류'), leftover: gone };
  });
}

async function shot(page, width, name, full = true) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, `${width}-${name}.png`), fullPage: full });
  const o = await overflow(page);
  report.push({ width, name, ...o });
  console.log(width, name, o.doc ? 'DOC-OVERFLOW' : 'ok', o.serverError ? 'SERVER-ERROR' : '', o.leftover.length ? `LEFT ${o.leftover.join(',')}` : '', o.bad.join(' | '));
}

const browser = await chromium.launch();
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: width > 500 ? 900 : 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await login(page, studentId, studentPw);
  for (const s of studentShots) {
    await page.evaluate((tabs) => {
      Object.entries(tabs).forEach(([k, v]) => sessionStorage.setItem(`crista.tab.${k}`, v));
      sessionStorage.setItem('crista.tab.team-side', 'open');
    }, s.tabs);
    await page.goto(`${base}/crista/board`);
    await page.locator('button.st', { hasText: s.step }).first().click({ timeout: 20000 });
    await page.waitForTimeout(2500);
    await shot(page, width, s.name);
  }
  // 위 띠(순위 단추) · 최종 순위 창.
  await page.goto(`${base}/crista/board`);
  await page.waitForTimeout(2500);
  await shot(page, width, 'board', false);
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
writeFileSync(join(out, 'shoot-report.json'), JSON.stringify(report, null, 1));
