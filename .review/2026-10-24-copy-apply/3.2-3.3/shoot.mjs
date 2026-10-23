// 3.2 · 3.3 화면 스크린샷 — 1440 · 390. 문구 반영(copy-3.2 · copy-3.3) 뒤 넘침 · 잘림 점검.
// 쓰는 법: node .review/2026-10-24-copy-apply/3.2-3.3/shoot.mjs <loginId> <password> [base=http://127.0.0.1:5223] [only=3.2|3.3]
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/opt/homebrew/lib/node_modules/');
const { chromium } = require('playwright');
const [loginId, password, base = 'http://127.0.0.1:5223', only] = process.argv.slice(2);
const out = dirname(fileURLToPath(import.meta.url));

const shots = [
  { step: '3.2', name: '32-1-ethics', tab: 'ethics' },
  { step: '3.2', name: '32-2-protocol', tab: 'protocol' },
  { step: '3.2', name: '32-3-alt', tab: 'alt' },
  { step: '3.2', name: '32-4-animal', tab: 'animal' },
  { step: '3.2', name: '32-5-pick', tab: 'pick' },
  { step: '3.3', name: '33-1-lab', tab: 'lab' },
  { step: '3.3', name: '33-2-seesaw', tab: 'seesaw' },
  { step: '3.3', name: '33-3-peak', tab: 'peak' },
  { step: '3.3', name: '33-4-dose', tab: 'dose' },
  { step: '3.3', name: '33-5-plane', tab: 'plane' },
  { step: '3.3', name: '33-6-waterfall', tab: 'waterfall' },
].filter((s) => !only || s.step === only);

const browser = await chromium.launch();
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: width > 500 ? 900 : 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${base}/crista/login`);
  let r = 0;
  for (let i = 0; i < 10 && r !== 200; i++) {
    if (i) await page.waitForTimeout(10000);
    r = await page.evaluate(async ([id, pw]) => (await fetch('/crista/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginId: id, password: pw }) })).status, [loginId, password]);
  }
  if (r !== 200) throw new Error(`login ${r}`);
  for (const s of shots) {
    // 로컬 DB 연결 한도(30)에 걸리면 화면이 '서버 오류'나 로그인으로 떨어진다 — 몇 번 다시 해 본다.
    let ok = false;
    for (let attempt = 0; attempt < 8 && !ok; attempt++) {
      try {
        await page.evaluate(async ([id, pw]) => fetch('/crista/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginId: id, password: pw }) }), [loginId, password]);
        await page.evaluate(({ step, tab }) => sessionStorage.setItem(`crista.tab.step:${step}`, tab), s);
        await page.goto(`${base}/crista/board`);
        await page.locator('button.st', { hasText: s.step }).first().click({ timeout: 20000 });
        await page.waitForTimeout(2200);
        ok = (await page.getByText('서버 오류가 났어요').count()) === 0;
      } catch { ok = false; }
      if (!ok) await page.waitForTimeout(10000);
    }
    if (!ok) console.log('skip', width, s.name);
    // 접힌 글(윤리 카드 · 시험 묶음 · 배울 점)을 모두 펼쳐 문구를 본다.
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    if (s.name === '32-1-ethics') {
      // 1번은 맞게, 2번은 틀리게, 3번은 맞게 — 채점 뒤 풀이 두 가지를 다 본다.
      for (const label of ['대체(Replacement)', 'C등급 — 약간의 스트레스 · 짧은 작은 통증', '정상 체중의 20% 이상 감소']) {
        await page.getByRole('radio', { name: label }).first().click().catch(() => {});
      }
      await page.getByRole('button', { name: '채점하기' }).first().click().catch(() => {});
      await page.waitForTimeout(800);
    }
    if (s.name === '33-1-lab') {
      const more = page.getByRole('button', { name: /자세히 펼쳐 보기/ });
      if (await more.count()) await more.first().click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: join(out, `${width}-${s.name}.png`), fullPage: true });
    // 섬 안은 따로 스크롤된다 — 내 작업대 · 모둠 공유 칸을 통째로 한 장씩 더 찍는다.
    const cols = page.locator(s.step === '3.2' ? '.s32' : '.s33-ov, .s33-doc').filter({ visible: true });
    for (let i = 0; i < Math.min(2, await cols.count()); i++) await cols.nth(i).screenshot({ path: join(out, `${width}-${s.name}-col${i + 1}.png`) }).catch(() => {});
    const overflow = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const bad = [];
      for (const el of document.querySelectorAll('main *')) {
        if (el.closest('.tbl-w')) continue;
        const r = el.getBoundingClientRect();
        if (r.width && r.right > w + 1) bad.push(`${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).slice(0, 30)} ${Math.round(r.right)}`);
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'hidden' && el.clientWidth > 0) bad.push(`clip ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} "${(el.textContent ?? '').slice(0, 30)}"`);
      }
      return { doc: document.documentElement.scrollWidth > w, bad: bad.slice(0, 12) };
    });
    console.log(width, s.name, JSON.stringify(overflow));
  }
  await ctx.close();
}
await browser.close();
