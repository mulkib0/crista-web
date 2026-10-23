// 1.2 화면 스크린샷 — 1440 · 390, 다섯 걸음 + 회의 도구 · 진열대 표.
// 쓰는 법: node .review/2026-10-24-copy-apply/1.2/shoot.mjs <loginId> <password> [base=http://127.0.0.1:5221]
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/opt/homebrew/lib/node_modules/');
const { chromium } = require('playwright');
const [loginId, password, base = 'http://127.0.0.1:5221'] = process.argv.slice(2);
const out = dirname(fileURLToPath(import.meta.url));

const shots = [
  { name: '1-brief', tab: 'brief', extra: { 'step:1.2:brief': 'mission' } },
  { name: '1b-judge', tab: 'brief', extra: { 'step:1.2:brief': 'judge' } },
  { name: '2-meet', tab: 'meet', extra: { 'step:1.2:meet': 'agenda' } },
  { name: '2b-lab', tab: 'meet', extra: { 'step:1.2:meet': 'lab' } },
  { name: '2c-map', tab: 'meet', extra: { 'step:1.2:meet': 'map' } },
  { name: '3-run', tab: 'run' },
  { name: '4-shop', tab: 'shop' },
  { name: '5-hand', tab: 'hand' },
];

const browser = await chromium.launch();
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: width > 500 ? 2000 : 4200 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${base}/crista/login`);
  const r = await page.evaluate(async ([id, pw]) => (await fetch('/crista/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginId: id, password: pw }) })).status, [loginId, password]);
  if (r !== 200) throw new Error(`login ${r}`);
  for (const s of shots) {
    await page.evaluate(({ tab, extra }) => {
      sessionStorage.setItem('crista.tab.step:1.2', tab);
      for (const [k, v] of Object.entries(extra ?? {})) sessionStorage.setItem(`crista.tab.${k}`, v);
    }, s);
    // 같은 작업 트리의 다른 세션이 파일을 고치면 화면 서버가 다시 읽어요 — 보드가 안 뜨면 몇 번 다시 열어요.
    for (let tries = 0; ; tries += 1) {
      try {
        await page.goto(`${base}/crista/board`);
        await page.locator('button.st', { hasText: '1.2' }).first().click({ timeout: 20000 });
        await page.waitForTimeout(1500);
        // 로컬 DB 연결 한도(30)를 여러 세션이 나눠 써서 가끔 500 — 오류 글이 보이면 다시 열어요.
        if (await page.getByText('서버 오류가 났어요').count()) throw new Error('server error');
        break;
      } catch (e) {
        if (tries >= 12) throw e;
        await page.waitForTimeout(8000);
      }
    }
    await page.waitForTimeout(1500);
    if (s.name === '1-brief') {
      const more = page.getByRole('button', { name: /자세히 펼쳐 보기/ });
      if (await more.count()) await more.first().click();
    }
    if (s.name === '2-meet') {
      await page.getByText('결합 예측 · 점수', { exact: true }).first().click().catch(() => {});
      await page.waitForTimeout(300);
      const chip = page.getByRole('button', { name: '후보를 너무 많이 잃지 않으려고' }).first();
      if (await chip.count()) await chip.click().catch(() => {});
    }
    if (s.name === '4-shop') {
      const claim = page.getByRole('button', { name: '찜하기', exact: true }).first();
      if (await claim.count()) {
        await claim.click().catch(() => {});
        await page.getByRole('button', { name: '작고 가벼워요(MW)' }).first().click().catch(() => {});
      }
    }
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(out, `${width}-${s.name}.png`), fullPage: true });
    if (s.name === '4-shop') {
      await page.getByRole('button', { name: '표로 보기' }).first().click().catch(() => {});
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(out, `${width}-4b-shop-table.png`), fullPage: true });
    }
    // 가로 넘침 점검
    const overflow = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const bad = [];
      for (const el of document.querySelectorAll('.s12 *')) {
        const r = el.getBoundingClientRect();
        if (r.width && r.right > w + 1) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} ${Math.round(r.right)}`);
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'hidden' && el.clientWidth > 0) bad.push(`clip ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} "${(el.textContent ?? '').slice(0, 30)}"`);
      }
      return { doc: document.documentElement.scrollWidth > w, bad: bad.slice(0, 12) };
    });
    console.log(width, s.name, JSON.stringify(overflow));
  }
  await ctx.close();
}
await browser.close();
