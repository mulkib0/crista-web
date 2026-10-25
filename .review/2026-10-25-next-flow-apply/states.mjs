// 띠 상태 다섯 가지(잠김 · 할 일 · 계산 중 · 게임 시계 기다림(+시계 멈춤) · 넘어갈 수 있음)를 1440 · 390 에서 본다.
// 실제 데이터로 만들기 어려운 상태는 GET /api/board 응답의 단계 줄만 바꿔 그린다(서버 판정 규격 그대로의 모양 — need · progressPct · byName).
// node states.mjs <학생 아이디> <비번>
import { join } from 'node:path';
import { chromium, inspect, openStep, out, session } from './lib.mjs';

const [id, pw] = process.argv.slice(2);
const need = (step, keys) => step.need.map((n) => ({ ...n, done: keys.includes(n.key) }));
const SCENES = {
  // 1.1 표적 확정 전 — 1.2 를 보면 '‹ 1.1에서 모둠 표적 확정부터'
  lock: { view: '1.2', patch: (b) => b.steps.map((s) => (s.id === '1.1' ? { ...s, state: 'ready', need: need(s, []), doneByName: undefined } : s.id === '1.2' ? { ...s, state: 'locked', need: need(s, []), doneByName: undefined } : s)) },
  // 1.2 스크리닝 전 — '③ 스크리닝 1회 하면 2.1이 열려요 · 하러 가기 ›'
  todo: { view: '1.2', patch: (b) => b.steps.map((s) => (s.id === '1.2' ? { ...s, state: 'ready', need: need(s, []), doneByName: undefined } : s)) },
  // 1.2 계산 중 — '나래 님 스크리닝 계산 중 62% · 끝나면 2.1'
  run: { view: '1.2', patch: (b) => b.steps.map((s) => (s.id === '1.2' ? { ...s, state: 'running', progressPct: 62, byName: '나래', need: need(s, []), doneByName: undefined } : s)) },
  // 3.3 IND 접수 뒤 게임 시계 — 'IND 심사 D+12 / 30 · 끝나면 4.1', 선생님이 시계를 멈추면 ⏸
  wait: { view: '3.3', clock: true, patch: (b) => b.steps.map((s) => (s.id === '3.3' ? { ...s, state: 'running', progressPct: 40, need: need(s, []), doneByName: undefined } : s)) },
  // 3.2 조건 셋 중 하나만 — '④ 동물실험 1건부터 · 남은 일 2개 · 하러 가기 ›'
  multi: { view: '3.2', patch: (b) => b.steps.map((s) => (s.id === '3.2' ? { ...s, state: 'ready', need: need(s, ['iacuc']), doneByName: undefined } : s)) },
};

const browser = await chromium.launch();
const lines = [];
for (const W of [1440, 390]) {
  for (const [name, sc] of Object.entries(SCENES)) {
    const issues = [];
    const p = await session(browser, W, name, id, pw, issues);
    await p.route('**/api/board', async (route) => {
      const res = await route.fetch();
      const b = await res.json();
      b.steps = sc.patch(b);
      if (sc.clock) b.clock = { ...b.clock, paused: true };
      await route.fulfill({ response: res, json: b });
    });
    // 시계 멈춤 장면 — 연결 직후 서버가 보내는 실제 시계 소식이 바꾼 값을 덮지 않게 이 장면만 WS 를 끊는다.
    if (sc.clock) await p.routeWebSocket(/.*/, (ws) => ws.close());
    await p.goto(`${process.env.BASE ?? 'http://127.0.0.1:5190'}/crista/board?lab=drug`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3000);
    await openStep(p, sc.view);
    const o = await inspect(p);
    await p.screenshot({ path: join(out, `${W}-state-${name}.png`) });
    let after = '';
    if (o.clickable) {
      await p.locator('.nb-btn').click();
      await p.waitForTimeout(900);
      after = await p.evaluate(() => `→ ${document.querySelector('.st[aria-current="step"] .st-n')?.textContent} · ${document.querySelector('.chain-i[aria-pressed="true"], .vtog-i[aria-pressed="true"]')?.textContent?.trim() ?? ''} · 강조 ${[...document.querySelectorAll('.nx-flash')].map((e) => e.id || e.getAttribute('data-walk')).join(',')}`);
      await p.screenshot({ path: join(out, `${W}-state-${name}-go.png`) });
    }
    lines.push(`${W} ${name.padEnd(5)} [${o.tone}] ${o.text}  ${after}  라임 ${o.lime.length} · 넘침 ${o.docOverflow} · 오류 ${issues.length}`);
    await p.context().close();
  }
}
await browser.close();
console.log(lines.join('\n'));
