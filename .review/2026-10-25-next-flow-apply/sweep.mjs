// 9단계 훑기 — 1440 · 390 에서 단계마다: 띠 자리(스크롤 · 공유 자료 접기 뒤에도 같은 자리) · 띠 문구 · 상태 · 라임 단추 수 · 사슬/보기 잘림 · 가로 넘침 · 콘솔 오류.
// 걸음 · 도구를 하나씩 눌러 같은 검사를 하고, 띠 단추를 눌러 걸음 탭 · 강조(또는 다음 단계)로 가는지 본다.
// node sweep.mjs <학생 아이디> <비번> [TAG]   (W=1440|390, BASE=http://127.0.0.1:5190)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bandStays, chromium, inspect, openStep, out, session, STEPS } from './lib.mjs';

const [id, pw, tag = 'A'] = process.argv.slice(2);
const W = Number(process.env.W ?? 1440);
const issues = [];
const rows = [];
const bad = [];
const browser = await chromium.launch();
const p = await session(browser, W, '학생', id, pw, issues);
await p.goto(`${process.env.BASE ?? 'http://127.0.0.1:5190'}/crista/board?lab=drug`);
await p.waitForTimeout(3000);
const shot = (name) => p.screenshot({ path: join(out, `${W}-${tag}-${name}.png`) });

for (const step of STEPS) {
  const before = issues.length;
  try {
    await openStep(p, step);
  } catch (e) {
    bad.push(`${step}: 단계 단추 못 누름 ${String(e).split('\n')[0]}`);
    continue;
  }
  const o = await inspect(p);
  const stay = await bandStays(p);
  await shot(`s${step}`);
  rows.push({ step, tab: '(처음)', ...o, stay: stay.same });
  const flag = (x, label) => {
    if (!x.band) bad.push(`${label}: 띠 없음`);
    else if (!x.band.inView) bad.push(`${label}: 띠가 화면 밖 ${JSON.stringify(x.band)}`);
    if (x.lime.length > 1) bad.push(`${label}: 라임 단추 ${x.lime.length}개 — ${x.lime.join(' / ')}`);
    if (x.docOverflow) bad.push(`${label}: 문서 가로 넘침`);
    if (x.clipped.length) bad.push(`${label}: 잘림 ${x.clipped.join(' | ')}`);
    if (x.errs.length) bad.push(`${label}: 글 ${x.errs.join(',')}`);
    if (x.htabs) bad.push(`${label}: 옛 걸음 탭(.htabs) 남음`);
  };
  flag(o, `${step}`);
  if (!stay.same) bad.push(`${step}: 띠 자리가 바뀜 ${JSON.stringify(stay)}`);

  // 걸음 · 도구 하나씩
  const items = p.locator('.chain-i:not([disabled]), .vtog-i:not([disabled])');
  const n = await items.count();
  for (let i = 0; i < n; i++) {
    const label = (await items.nth(i).innerText()).replace(/\s+/g, ' ').trim();
    await items.nth(i).click().catch(() => {});
    await p.waitForTimeout(1300);
    const x = await inspect(p);
    rows.push({ step, tab: label, ...x });
    flag(x, `${step} [${label}]`);
    if (i < 6) await shot(`s${step}-t${i}`);
  }

  // 띠 단추 누르기 — 할 일 · 기다림 · 잠김은 그 자리로(같은 단계), 열림은 다음 단계로.
  const o2 = await inspect(p);
  if (o2.clickable && o2.tone !== 'go') {
    await p.locator('.nb-btn').click();
    await p.waitForTimeout(900);
    const after = await p.evaluate(() => ({
      flash: [...document.querySelectorAll('.nx-flash')].map((e) => e.id || e.getAttribute('data-walk') || e.className).join(','),
      cur: document.querySelector('.st[aria-current="step"] .st-n')?.textContent,
      walk: document.querySelector('.chain-i[aria-pressed="true"], .vtog-i[aria-pressed="true"]')?.textContent?.trim(),
    }));
    rows.push({ step, tab: '(띠 단추 누름)', tone: o2.tone, text: o2.text, ...after });
    await shot(`s${step}-go`);
    if (o2.tone === 'lock') { if (after.cur === step) bad.push(`${step}: 잠김 단추가 다른 단계로 안 감`); }
    else if (!after.flash) bad.push(`${step}: 띠 단추 뒤 강조 없음(${o2.text})`);
  }
  for (const x of issues.slice(before)) bad.push(`${step}: ${x}`);
}

// 열림(라임) 단추 — 1.1 에서 누르면 1.2 로 가는가
await openStep(p, '1.1');
const g = await inspect(p);
if (g.tone === 'go') {
  await p.locator('.nb-btn').click();
  await p.waitForTimeout(1500);
  const cur = await p.evaluate(() => document.querySelector('.st[aria-current="step"] .st-n')?.textContent);
  rows.push({ step: '1.1', tab: '(라임 단추 누름)', text: g.text, cur });
  if (cur !== '1.2') bad.push(`1.1: 라임 단추가 1.2 로 안 감(${cur})`);
}

await browser.close();
const file = join(out, `sweep-${W}-${tag}.json`);
writeFileSync(file, JSON.stringify({ W, tag, bad, rows }, null, 2));
for (const r of rows.filter((x) => x.tab === '(처음)')) console.log(`${W} ${r.step} [${r.tone}] ${r.text} | ${r.where ?? ''} | ${r.chain || r.views}`);
console.log(`\nBAD ${bad.length}`);
for (const b of bad) console.log('  ', b);
