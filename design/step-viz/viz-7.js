/* 4.1 임상 1 · 2 · 3상 — 시각화 시안 10종 */
(function () {
  "use strict";
  const CV = window.CV, { EX, esc, f1, R } = CV;
  const MX = CV.MX;

  /* ── 이 파일 도우미 ── */
  const TR = EX.trials, LEAD = EX.lead;
  const POP = EX.ind ? EX.ind.pop : CV.TRIAL[EX.tid].pops[0];
  const PH = ["phase1", "phase2", "phase3"];
  const PHL = { phase1: "1상", phase2: "2상", phase3: "3상" };
  const FORMS = [["oral", "경구"], ["iv", "정맥주사"], ["transdermal", "경피"]];
  const DOSES = [["10", "10 mg"], ["50", "50 mg"], ["100", "100 mg"]];
  const sc = (form, dose) => CV.score(LEAD.c, LEAD.kcal, EX.tid, form, +dose, POP);
  const r1 = (v) => Math.round(v * 10) / 10;
  const pc = (p) => (p * 100).toFixed(1) + "%";
  const sgn = (n) => (n > 0 ? "+" : n < 0 ? "−" : "±") + Math.abs(n);
  const rule = (k) => { const th = R.th[k]; return [th.e != null ? `E ≥ ${th.e}` : "", th.s != null ? `S ≥ ${th.s}` : ""].filter(Boolean).join(" · "); };
  /* 흔들림 n 은 −r..+r 정수가 모두 같은 확률로 나오고, E 와 S 에 같은 n 이 더해진다(게임 규칙 그대로) */
  function outs(E, S, k) {
    const r = R.noise[k], th = R.th[k], o = [];
    for (let n = -r; n <= r; n++) {
      const e = Math.max(0, r1(E + n)), s = Math.max(0, r1(S + n));
      o.push({ n, e, s, pass: (th.e == null || e >= th.e) && (th.s == null || s >= th.s) });
    }
    return o;
  }
  function prob(b, k) { const o = outs(b.E, b.S, k), ok = o.filter((x) => x.pass).length; return { ok, tot: o.length, p: ok / o.length }; }
  const frac = (q) => `${q.ok}/${q.tot}`;
  /* 글자: s 는 이스케이프한다 */
  const T = (x, y, s, a = "") => `<text x="${x}" y="${y}" ${a}>${esc(s)}</text>`;
  const btns = (id, key, items, cur) => items.map(([v, l]) =>
    `<button type="button" class="vz-btn" id="${id}-${v}" data-${key}="${v}" aria-pressed="${String(v) === String(cur)}">${esc(l)}</button>`).join("");
  /* 버튼 묶음 연결: data-<key> 버튼을 누르면 state[key] 를 바꾸고 다시 그린다 */
  function wire(el, keys, state, draw, extra) {
    const out = el.querySelector("[data-out]");
    const on = (e) => {
      const b = e.target.closest("button"); if (!b || !el.contains(b)) return;
      for (const k of keys) if (b.dataset[k] != null) {
        state[k] = b.dataset[k];
        el.querySelectorAll(`button[data-${k}]`).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        if (extra) extra(state, k);
        out.innerHTML = draw(state); return;
      }
    };
    el.addEventListener("click", on);
    return () => el.removeEventListener("click", on);
  }
  const tone = (pass) => (pass ? "var(--good)" : "var(--bad)");
  const mark = (pass) => (pass ? "✓" : "✕");

  CV.css("s7", `
    .s7-ctl { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
    .s7-ctl [role="group"] { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .s7-ctl .vz-lab { margin-right: 4px; }
    .s7-read { font-family: var(--mono); font-size: 12.5px; font-variant-numeric: tabular-nums; margin: 0; }
    .s7-read b { font-weight: 600; }
    .s7-hist { font-family: var(--mono); font-size: 12px; color: var(--muted); margin: 0; }
    .s7-src { font-size: 11px; color: var(--muted); margin: 0; max-width: 90ch; }
    .s7-sl { display: grid; gap: 4px; max-width: 520px; }
    .s7-sl label { font-size: 12.5px; font-weight: 600; }
    .s7-sl input { margin: 0; }
  `);

  /* ───────── 1. 세 관문 허들 ───────── */
  function v1() {
    const W = 880, H = 410, y0 = 300, yk = 2.05, Y = (v) => y0 - v * yk;
    const P = [
      { k: "phase1", q: "안전한가?", who: "건강한 지원자 소수", cols: [
        { m: "S", lab: "50 mg", v: TR[0].S, chk: true, pass: TR[0].pass },
        { m: "S", lab: "10 mg", v: TR[1].S, chk: true, pass: TR[1].pass },
        { m: "E", lab: "10 mg", v: TR[1].E, chk: false }] },
      { k: "phase2", q: "효과가 있나?", who: "환자 소수", cols: [
        { m: "E", lab: "10 mg", v: TR[2].E, chk: true, pass: TR[2].pass },
        { m: "S", lab: "10 mg", v: TR[2].S, chk: false }] },
      { k: "phase3", q: "많은 환자에게 둘 다?", who: "환자 다수", cols: [
        { m: "E", lab: "10 mg", v: TR[3].E, chk: true, pass: TR[3].pass },
        { m: "S", lab: "10 mg", v: TR[3].S, chk: true, pass: TR[3].pass }] }
    ];
    let b = "";
    P.forEach((p, i) => {
      const px = 20 + i * 290, pw = 260, th = R.th[p.k];
      b += `<rect x="${px}" y="8" width="${pw}" height="372" fill="var(--paper)" stroke="var(--line)"/>`;
      b += T(px + 12, 30, `${PHL[p.k]} · ${p.q}`, 'font-size="16" font-weight="700"');
      b += T(px + 12, 49, p.who, 'font-size="12" class="t-mu"');
      b += T(px + 12, 68, `기준 ${rule(p.k)}`, 'font-size="12.5" class="t-m" font-weight="600"');
      for (const v of [0, 50, 100]) {
        b += `<line x1="${px + 34}" x2="${px + pw - 10}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" ${v ? 'stroke-dasharray="2 4"' : ""}/>`;
        b += T(px + 28, Y(v) + 4, v, 'font-size="11" class="t-m t-mu" text-anchor="end"');
      }
      const tags = new Set();
      p.cols.forEach((c, j) => {
        const cx = px + 134 + (j - (p.cols.length - 1) / 2) * 66, bw = 34;
        const fill = c.chk ? tone(c.pass) : "var(--raise)";
        b += `<rect x="${cx - bw / 2}" y="${Y(c.v)}" width="${bw}" height="${y0 - Y(c.v)}" fill="${fill}" ${c.chk ? "" : 'stroke="var(--line-strong)" stroke-dasharray="3 3"'}/>`;
        /* 허들 아래에서 멈춘 막대는 숫자를 막대 안에 쓴다(가로대와 겹치지 않게) */
        b += c.chk && !c.pass ? T(cx, Y(c.v) + 18, `${f1(c.v)}`, 'font-size="12" class="t-m" text-anchor="middle" font-weight="700" style="fill:var(--paper)"') + T(cx, Y(c.v) + 34, "✕", 'font-size="12" text-anchor="middle" font-weight="700" style="fill:var(--paper)"')
          : T(cx, Y(c.v) - 6, `${f1(c.v)}${c.chk ? " " + mark(c.pass) : ""}`, `font-size="12" class="t-m" text-anchor="middle" font-weight="600"`);
        b += T(cx, y0 + 17, `${c.m === "E" ? "효능 E" : "안전 S"}`, 'font-size="12" text-anchor="middle" font-weight="600"');
        b += T(cx, y0 + 32, c.chk ? c.lab : `${c.lab} · 안 봄`, 'font-size="11" class="t-m t-mu" text-anchor="middle"');
        const t = c.chk ? (c.m === "E" ? th.e : th.s) : null;
        if (t != null) {
          /* 허들: 기준 높이의 가로대 + 다리 둘 */
          const hy = Y(t);
          b += `<line x1="${cx - 28}" x2="${cx + 28}" y1="${hy}" y2="${hy}" stroke="var(--ink)" stroke-width="2" stroke-dasharray="6 3"/>`;
          b += `<rect x="${cx - 27}" y="${hy - 3}" width="54" height="6" fill="var(--ink)" fill-opacity="0.85"/>`;
          b += `<line x1="${cx - 24}" x2="${cx - 24}" y1="${hy}" y2="${y0}" stroke="var(--ink)" stroke-width="1.5"/><line x1="${cx + 24}" x2="${cx + 24}" y1="${hy}" y2="${y0}" stroke="var(--ink)" stroke-width="1.5"/>`;
          tags.add(t);
        }
      });
      /* 기준 숫자표는 상자 오른쪽 끝에 한 번씩 */
      for (const t of tags) {
        b += `<line x1="${px + 34}" x2="${px + pw - 32}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--ink)" stroke-opacity="0.35" stroke-dasharray="2 3"/>`;
        b += `<rect x="${px + pw - 30}" y="${Y(t) - 9}" width="28" height="17" fill="var(--hi)"/>` + T(px + pw - 16, Y(t) + 4, t, 'font-size="12" class="t-m" text-anchor="middle" font-weight="700"');
      }
      b += `<line x1="${px + 10}" x2="${px + pw - 10}" y1="${y0 + 44}" y2="${y0 + 44}" stroke="var(--line)"/>`;
      b += T(px + 12, y0 + 64, `${R.days[p.k]}일 · ${MX(R.cost[p.k])} · 흔들림 ±${R.noise[p.k]}`, 'font-size="12" class="t-m"');
      if (i < 2) b += `<path d="M${px + pw + 6} 190 l12 0 m-5 -5 l5 5 l-5 5" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
    });
    b += T(20, 402, "관문마다 묻는 것이 다르고, 마지막 3상은 두 기준을 함께 · 더 높게(S 50 → 55) 묻는다. 기간 · 비용도 두 배씩 는다.", 'font-size="12.5" class="t-mu"');
    return CV.svg(W, H, b, "임상 세 관문의 기준 높이와 우리 약의 결과");
  }

  /* ───────── 2. 흔들림 띠 ───────── */
  function band(st) {
    const b = sc(st.f, st.d), W = 880, X0 = 150, X1 = 770, X = (v) => X0 + (Math.max(0, Math.min(100, v)) / 100) * (X1 - X0);
    const indOk = b.S >= R.th.ind.s;
    let y = 92, body = "", probs = [], last = y;
    body += T(16, 24, `${CV.FORM_SHORT[st.f]} ${st.d} mg 예상값 — 효능 E ${f1(b.E)} · 안전 S ${f1(b.S)}`, 'font-size="14" font-weight="700"');
    body += T(864, 24, indOk ? `IND 기준 S ≥ ${R.th.ind.s} 통과` : `IND 기준 S ≥ ${R.th.ind.s} 미달 — 임상 시작 불가`, `font-size="12" text-anchor="end" font-weight="600" fill="${tone(indOk)}" style="fill:${tone(indOk)}"`);
    for (const k of PH) {
      const th = R.th[k], r = R.noise[k], o = outs(b.E, b.S, k), q = prob(b, k), ms = [];
      if (th.e != null) ms.push(["E", b.E, th.e, "e"]);
      if (th.s != null) ms.push(["S", b.S, th.s, "s"]);
      probs.push(q.p);
      body += T(16, y + 4, PHL[k], 'font-size="15" font-weight="700"');
      body += T(16, y + 22, `흔들림 ±${r}`, 'font-size="11.5" class="t-m t-mu"');
      ms.forEach(([m, v, t, key], j) => {
        const yy = y + j * 72; last = yy;
        body += T(132, yy + 4, m === "E" ? "효능 E" : "안전 S", 'font-size="12" text-anchor="end" font-weight="600"');
        body += `<line x1="${X0}" x2="${X1}" y1="${yy}" y2="${yy}" stroke="var(--line-strong)"/>`;
        body += `<rect x="${X(v - r)}" y="${yy - 10}" width="${Math.max(2, X(v + r) - X(v - r))}" height="20" fill="var(--film-2)" stroke="var(--line)"/>`;
        body += `<line x1="${X(t)}" x2="${X(t)}" y1="${yy - 18}" y2="${yy + 18}" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 3"/>`;
        body += T(X(t), yy + 31, `기준 ${t}`, 'font-size="11" class="t-m" text-anchor="middle" font-weight="600"');
        for (const x of o) {
          const cx = X(x[key]);
          body += x.pass ? `<circle cx="${cx}" cy="${yy}" r="3.3" fill="var(--good)"/>` : `<circle cx="${cx}" cy="${yy}" r="2.8" fill="var(--paper)" stroke="var(--bad)" stroke-width="1.4"/>`;
        }
        body += `<path d="M${X(v)} ${yy - 22} l-5 -7 h10 z" fill="var(--ink)"/>`;
        body += T(Math.min(X(v), X1 - 30), yy - 33, `예상 ${f1(v)}`, 'font-size="11" class="t-m" text-anchor="middle"');
      });
      body += T(864, y + 4, `${frac(q)}`, `font-size="15" class="t-m" text-anchor="end" font-weight="700" style="fill:${tone(q.p > 0.5)}"`);
      body += T(864, y + 21, `통과 ${pc(q.p)}`, 'font-size="12" class="t-m" text-anchor="end"');
      y += ms.length * 72 + 10;
    }
    let grid = "";
    for (let v = 0; v <= 100; v += 10) {
      grid += `<line x1="${X(v)}" x2="${X(v)}" y1="50" y2="${last + 30}" stroke="var(--line)" stroke-dasharray="${v % 50 ? "1 5" : "2 3"}"/>`;
      body += T(X(v), last + 48, v, 'font-size="11" class="t-m t-mu" text-anchor="middle"');
    }
    body = grid + body;
    const ly = last + 76;
    const all = indOk ? probs.reduce((a, p) => a * p, 1) : 0;
    body += `<circle cx="160" cy="${ly - 4}" r="4" fill="var(--good)"/>` + T(170, ly, "통과하는 흔들림", 'font-size="12"');
    body += `<circle cx="290" cy="${ly - 4}" r="3.4" fill="var(--paper)" stroke="var(--bad)" stroke-width="1.4"/>` + T(300, ly, "떨어지는 흔들림", 'font-size="12"');
    body += T(864, ly, `세 상을 한 번에 모두 통과할 확률 ${pc(all)}`, `font-size="13.5" text-anchor="end" font-weight="700" style="fill:${tone(all >= 0.5)}"`);
    return CV.svg(W, ly + 12, body, "예상값과 흔들림 띠, 기준선, 통과 확률");
  }
  function v2() {
    const st = { f: "oral", d: "50" };
    return `<div class="s7-ctl"><div role="group" aria-label="제형"><span class="vz-lab">제형</span>${btns("s7-v2-f", "f", FORMS, st.f)}</div>
      <div role="group" aria-label="용량"><span class="vz-lab">용량</span>${btns("s7-v2-d", "d", DOSES, st.d)}</div></div>
      <div data-out>${band(st)}</div>
      <p class="vz-note">점 하나 = 나올 수 있는 흔들림 하나(1 · 2상 13가지, 3상 9가지 — 모두 같은 확률). 같은 흔들림이 E 와 S 에 함께 더해진다. 예상값이 기준에서 멀리 떨어질수록 모든 점이 기준을 넘는다.</p>`;
  }

  /* ───────── 3. 100번 굴려 보기 ───────── */
  function roll(k, rand, times = 100) {
    const r = R.noise[k], c = new Array(2 * r + 1).fill(0);
    for (let i = 0; i < times; i++) c[Math.min(2 * r, Math.floor(rand() * (2 * r + 1)))]++;
    return c;
  }
  function simSVG(st) {
    const b = sc("oral", st.d), k = st.k, o = outs(b.E, b.S, k), q = prob(b, k), c = st.c, tot = c.reduce((a, x) => a + x, 0);
    const passN = o.reduce((a, x, i) => a + (x.pass ? c[i] : 0), 0);
    const W = 880, X0 = 60, X1 = 860, bw = (X1 - X0) / o.length, base = 290, top = 70;
    const ymax = Math.max(16, Math.ceil(Math.max(...c) / 4) * 4), Y = (v) => base - (v / ymax) * (base - top);
    let s = T(16, 24, `경구 ${st.d} mg · ${PHL[k]}(${rule(k)}) 을 ${tot}번 했더니 → ${passN}번 통과 (${pc(passN / tot)})`, 'font-size="14" font-weight="700"');
    s += T(16, 44, `계산한 통과 확률 ${frac(q)} = ${pc(q.p)} · 예상 E ${f1(b.E)} · S ${f1(b.S)}`, 'font-size="12.5" class="t-m t-mu"');
    for (let v = 0; v <= ymax; v += ymax / 4) {
      s += `<line x1="${X0}" x2="${X1}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-dasharray="${v ? "2 4" : ""}"/>`;
      s += T(X0 - 8, Y(v) + 4, v, 'font-size="11" class="t-m t-mu" text-anchor="end"');
    }
    o.forEach((x, i) => {
      const cx = X0 + bw * i + bw / 2, h = base - Y(c[i]);
      s += `<rect x="${cx - bw * 0.36}" y="${Y(c[i])}" width="${bw * 0.72}" height="${h}" fill="${tone(x.pass)}" ${x.pass ? "" : 'fill-opacity="0.8"'}/>`;
      s += T(cx, Y(c[i]) - 5, c[i], 'font-size="11.5" class="t-m" text-anchor="middle" font-weight="600"');
      s += T(cx, base + 16, `${sgn(x.n)} ${mark(x.pass)}`, `font-size="11.5" class="t-m" text-anchor="middle" style="fill:${tone(x.pass)}"`);
      const lab = k === "phase1" ? [`S ${f1(x.s)}`] : k === "phase2" ? [`E ${f1(x.e)}`] : [`E ${f1(x.e)}`, `S ${f1(x.s)}`];
      lab.forEach((t, j) => { s += T(cx, base + 32 + j * 14, t, 'font-size="11" class="t-m t-mu" text-anchor="middle"'); });
    });
    const ev = tot / o.length;
    s += `<line x1="${X0}" x2="${X1}" y1="${Y(ev)}" y2="${Y(ev)}" stroke="var(--ink)" stroke-dasharray="6 4"/>`;
    s += `<line x1="${X1 - 250}" x2="${X1 - 222}" y1="40" y2="40" stroke="var(--ink)" stroke-dasharray="6 4"/>` + T(X1, 44, `고르게 나오면 칸마다 약 ${ev.toFixed(1)}번`, 'font-size="11.5" class="t-m" text-anchor="end"');
    s += T(X0, 360, "아래 칸: 그 시행에서 나온 흔들림 값과 결과 점수", 'font-size="11.5" class="t-mu"');
    return CV.svg(W, 370, s, "100번 시행한 흔들림 결과 막대");
  }
  function v3() {
    const st = { k: "phase1", d: "50", c: roll("phase1", CV.rng(7)) };
    return `<div class="s7-ctl"><div role="group" aria-label="임상 단계"><span class="vz-lab">단계</span>${btns("s7-v3-k", "k", PH.map((k) => [k, PHL[k]]), st.k)}</div>
      <div role="group" aria-label="용량(경구)"><span class="vz-lab">용량 · 경구</span>${btns("s7-v3-d", "d", DOSES, st.d)}</div>
      <button type="button" class="vz-btn" id="s7-v3-run" data-run="1" aria-pressed="false">100번 다시 굴리기</button></div>
      <div data-out>${simSVG(st)}</div>
      <p class="s7-hist" data-hist aria-live="polite">굴린 기록(경구 ${st.d} mg · ${PHL[st.k]} · 통과 횟수 / 100): ${passCount(st)}</p>
      <p class="vz-note">50 mg 로 1상을 100번 하면 대부분 떨어진다 — 흔들림이 +6 일 때만 S 가 50 을 넘는다. 10 mg 로 바꾸면 100번 모두 통과한다. 다시 굴릴 때마다 숫자가 조금씩 다르다(그게 운이다).</p>`;
  }
  function passCount(st) { const b = sc("oral", st.d), o = outs(b.E, b.S, st.k); return st.c.reduce((a, x, i) => a + (o[i].pass ? x : 0), 0); }
  function m3(el) {
    const st = { k: "phase1", d: "50", c: roll("phase1", CV.rng(7)) }, hist = [];
    const passOf = () => passCount(st);
    const out = el.querySelector("[data-out]"), hp = el.querySelector("[data-hist]");
    hist.push(passOf());
    const redraw = () => { out.innerHTML = simSVG(st); hp.textContent = `굴린 기록(경구 ${st.d} mg · ${PHL[st.k]} · 통과 횟수 / 100): ${hist.slice(-8).join(" · ")}`; };
    const on = (e) => {
      const b = e.target.closest("button"); if (!b || !el.contains(b)) return;
      if (b.dataset.k || b.dataset.d) {
        const key = b.dataset.k ? "k" : "d"; st[key] = b.dataset[key];
        el.querySelectorAll(`button[data-${key}]`).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        hist.length = 0;
      } else if (!b.dataset.run) return;
      st.c = roll(st.k, Math.random); hist.push(passOf()); redraw();
    };
    redraw();
    el.addEventListener("click", on);
    return () => el.removeEventListener("click", on);
  }

  /* ───────── 4. 여유와 확률 ───────── */
  /* 여유 m = 예상값 − 기준. 통과하려면 n ≥ −m 인 정수 n 이 나와야 한다. */
  const cnt = (m, r) => Math.max(0, Math.min(2 * r + 1, r + 1 - Math.ceil(-m - 1e-9)));
  function curveSVG(m) {
    const W = 880, X0 = 70, X1 = 820, Y0 = 300, Y1 = 76, X = (v) => X0 + ((v + 12) / 24) * (X1 - X0), Y = (p) => Y0 - p * (Y0 - Y1);
    let s = "";
    for (let p = 0; p <= 1; p += 0.25) { s += `<line x1="${X0}" x2="${X1}" y1="${Y(p)}" y2="${Y(p)}" stroke="var(--line)" ${p ? 'stroke-dasharray="2 4"' : ""}/>`; s += T(X0 - 8, Y(p) + 4, `${p * 100}%`, 'font-size="11" class="t-m t-mu" text-anchor="end"'); }
    for (let v = -12; v <= 12; v += 2) s += T(X(v), Y0 + 18, v > 0 ? "+" + v : v, 'font-size="11" class="t-m t-mu" text-anchor="middle"');
    s += `<line x1="${X(0)}" x2="${X(0)}" y1="${Y1 - 12}" y2="${Y0}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    s += T(X(0), Y1 - 18, "여유 0 = 예상값이 기준과 같음", 'font-size="11.5" text-anchor="middle" font-weight="600"');
    s += T((X0 + X1) / 2, Y0 + 38, "여유 = 예상값 − 기준 (오른쪽일수록 기준보다 넉넉함)", 'font-size="12" text-anchor="middle" class="t-mu"');
    const path = (r) => { let d = `M${X(-12)} ${Y(cnt(-12, r) / (2 * r + 1))}`, prev = cnt(-12, r); for (let v = -12; v <= 12.0001; v += 0.05) { const c = cnt(v, r); if (c !== prev) { d += ` H${X(v).toFixed(1)} V${Y(c / (2 * r + 1)).toFixed(1)}`; prev = c; } } return d + ` H${X(12)}`; };
    s += `<path d="${path(R.noise.phase1)}" fill="none" stroke="var(--ink)" stroke-width="2.5"/>`;
    s += `<path d="${path(R.noise.phase3)}" fill="none" stroke="var(--me)" stroke-width="2.5" stroke-dasharray="7 4"/>`;
    s += `<line x1="${X0}" x2="${X0 + 30}" y1="20" y2="20" stroke="var(--ink)" stroke-width="2.5"/>` + T(X0 + 36, 24, "1 · 2상 흔들림 ±6 (13가지)", 'font-size="12"');
    s += `<line x1="${X0 + 230}" x2="${X0 + 260}" y1="20" y2="20" stroke="var(--me)" stroke-width="2.5" stroke-dasharray="7 4"/>` + T(X0 + 266, 24, "3상 흔들림 ±4 (9가지)", 'font-size="12"');
    s += `<rect x="${X0 + 452}" y="14" width="10" height="10" fill="var(--bad)"/>` + T(X0 + 468, 24, "슬라이더 위치", 'font-size="12"');
    /* 예시 점: 실제 규칙으로 계산 — 번호를 찍고 설명은 아래 목록에 */
    const o50 = sc("oral", 50), o10 = sc("oral", 10), t10 = sc("transdermal", 10);
    const pts = [
      { m: r1(o50.S - R.th.phase1.s), r: 6, lab: `1상 · 경구 50 mg: S ${f1(o50.S)} − 기준 ${R.th.phase1.s}` },
      { m: r1(t10.E - R.th.phase3.e), r: 4, lab: `3상 · 경피 10 mg: E ${f1(t10.E)} − 기준 ${R.th.phase3.e}` },
      { m: r1(o50.S - R.th.phase3.s), r: 4, lab: `3상 · 경구 50 mg: S ${f1(o50.S)} − 기준 ${R.th.phase3.s}` },
      { m: r1(o10.S - R.th.phase1.s), r: 6, lab: `1상 · 경구 10 mg: S ${f1(o10.S)} − 기준 ${R.th.phase1.s} (그림 밖 오른쪽)` }
    ];
    pts.forEach((p, i) => {
      const pr = cnt(p.m, p.r) / (2 * p.r + 1), off = p.m > 12, cx = off ? X1 + 14 : X(p.m), cy = Y(pr);
      if (off) s += `<path d="M${X1 - 2} ${cy} h6" stroke="var(--good)" stroke-width="2"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="9" fill="${tone(pr > 0.5)}" stroke="var(--paper)" stroke-width="2"/>` + T(cx, cy + 4, i + 1, 'font-size="11" text-anchor="middle" font-weight="700" style="fill:var(--paper)"');
      const ly = Y0 + 66 + i * 19;
      s += `<circle cx="${X0 + 8}" cy="${ly - 4}" r="8" fill="${tone(pr > 0.5)}"/>` + T(X0 + 8, ly, i + 1, 'font-size="10.5" text-anchor="middle" font-weight="700" style="fill:var(--paper)"');
      s += T(X0 + 24, ly, `${p.lab} = 여유 ${p.m > 0 ? "+" : ""}${f1(p.m)} → ${cnt(p.m, p.r)}/${2 * p.r + 1} = ${pc(pr)}`, `font-size="12" class="t-m" style="fill:${tone(pr > 0.5)}"`);
    });
    /* 슬라이더 위치 */
    const a = cnt(m, 6) / 13, b = cnt(m, 4) / 9;
    s += `<line x1="${X(m)}" x2="${X(m)}" y1="${Y1}" y2="${Y0}" stroke="var(--bad)" stroke-width="1.5"/>`;
    s += `<rect x="${X(m) - 5}" y="${Y(a) - 5}" width="10" height="10" fill="var(--bad)" stroke="var(--paper)"/><rect x="${X(m) - 5}" y="${Y(b) - 5}" width="10" height="10" fill="var(--bad)" stroke="var(--paper)" transform="rotate(45 ${X(m)} ${Y(b)})"/>`;
    return CV.svg(W, Y0 + 66 + 4 * 19, s, "기준과의 여유에 따른 통과 확률 계단");
  }
  const readM = (m) => `여유 <b>${m > 0 ? "+" : ""}${f1(m)}</b> → 1 · 2상(±6) <b>${cnt(m, 6)}/13 = ${pc(cnt(m, 6) / 13)}</b> · 3상(±4) <b>${cnt(m, 4)}/9 = ${pc(cnt(m, 4) / 9)}</b>`;
  function v4() {
    return `<div class="s7-sl"><label for="s7-v4-m">예상값이 기준보다 얼마나 높은가(여유)</label>
      <input class="vz-rng" type="range" id="s7-v4-m" min="-12" max="12" step="0.5" value="0"></div>
      <p class="s7-read" data-read aria-live="polite">${readM(0)}</p>
      <div data-out>${curveSVG(0)}</div>
      <p class="vz-note">기준에 딱 걸치면(여유 0) 통과는 반반이다. 여유가 흔들림 폭(6 또는 4)보다 크면 늘 통과, 그만큼 모자라면 아무리 운이 좋아도 실패. 3상은 흔들림이 작아 계단이 더 가파르다.</p>`;
  }
  function m4(el) {
    const i = el.querySelector("#s7-v4-m"), out = el.querySelector("[data-out]"), rd = el.querySelector("[data-read]");
    const on = () => { const m = +i.value; out.innerHTML = curveSVG(m); rd.innerHTML = readM(m); };
    i.addEventListener("input", on);
    return () => i.removeEventListener("input", on);
  }

  /* ───────── 5. E · S 궤적 평면 ───────── */
  const REG = { ind: { e: 0, s: R.th.ind.s }, phase1: { e: 0, s: R.th.phase1.s }, phase2: { e: R.th.phase2.e, s: 0 }, phase3: { e: R.th.phase3.e, s: R.th.phase3.s } };
  const REGL = { ind: "IND", phase1: "1상", phase2: "2상", phase3: "3상" };
  function planeSVG(st) {
    const W = 880, H = 480, X0 = 70, X1 = 470, Y0 = 440, Y1 = 40, X = (v) => X0 + (v / 100) * (X1 - X0), Y = (v) => Y0 - (v / 100) * (Y0 - Y1);
    const mode = st.p;
    let s = `<defs><marker id="s7v5-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--ink)"/></marker></defs>`;
    s += `<rect x="${X0}" y="${Y1}" width="${X1 - X0}" height="${Y0 - Y1}" fill="var(--paper)" stroke="var(--line-strong)"/>`;
    const regs = mode === "all" ? Object.keys(REG) : [mode];
    for (const k of regs) {
      const g = REG[k];
      s += `<rect x="${X(g.e)}" y="${Y1}" width="${X(100) - X(g.e)}" height="${Y(g.s) - Y1}" fill="var(--good)" fill-opacity="${mode === "all" ? 0.07 : 0.16}"/>`;
      if (g.s) { s += `<line x1="${X(g.e)}" x2="${X1}" y1="${Y(g.s)}" y2="${Y(g.s)}" stroke="var(--ink)" stroke-dasharray="5 3"/>` + T(X0 - 6, Y(g.s) + 4, `S ${g.s}`, 'font-size="11" class="t-m" text-anchor="end" font-weight="600"'); }
      if (g.e) { s += `<line x1="${X(g.e)}" x2="${X(g.e)}" y1="${Y1}" y2="${Y(g.s)}" stroke="var(--ink)" stroke-dasharray="5 3"/>` + T(X(g.e) + (g.e < 42 ? -4 : 4), Y0 + 32, `E ${g.e}`, `font-size="11" class="t-m" text-anchor="${g.e < 42 ? "end" : "start"}" font-weight="600"`); }
    }
    if (mode === "all") s += T(X(97), Y(97), "모든 관문 통과 자리", 'font-size="12" text-anchor="end" font-weight="700" style="fill:var(--good)"');
    else s += T(X(97), Y(97), `${REGL[mode]} 통과 자리`, 'font-size="12" text-anchor="end" font-weight="700" style="fill:var(--good)"');
    for (let v = 0; v <= 100; v += 20) { s += T(X(v), Y0 + 16, v, 'font-size="11" class="t-m t-mu" text-anchor="middle"'); s += T(X0 - 6, Y(v) + 4, v, 'font-size="11" class="t-m t-mu" text-anchor="end"'); }
    s += T((X0 + X1) / 2, Y0 + 32 + 16, "효능 E →", 'font-size="12" text-anchor="middle" font-weight="600"');
    s += T(X0 - 6, Y1 - 12, "↑ 안전 S", 'font-size="12" font-weight="600"');
    /* 9가지 제형 · 용량 */
    const seen = new Map();
    for (const g of EX.grid) { const key = g.E + "," + g.S; if (!seen.has(key)) seen.set(key, []); seen.get(key).push(g); }
    for (const [, gs] of seen) {
      const g = gs[0], cx = X(g.E), cy = Y(g.S), story = g.form === "oral" && (g.dose === 10 || g.dose === 50);
      const shp = g.form === "oral" ? `<circle cx="${cx}" cy="${cy}" r="${story ? 7 : 5}" fill="${story ? "var(--ink)" : "var(--surface)"}" stroke="var(--ink)" stroke-width="1.5"/>`
        : g.form === "iv" ? `<rect x="${cx - 4.5}" y="${cy - 4.5}" width="9" height="9" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.5"/>`
        : `<path d="M${cx} ${cy - 6} l5.5 9.5 h-11 z" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.5"/>`;
      s += shp;
      const lab = gs.map((x) => CV.FORM_SHORT[x.form]).join(" · ") + " " + g.dose;
      const left = g.E > 85, below = g.form === "iv" && g.S > 4;
      s += T(below ? cx : cx + (left ? -10 : 10), below ? cy + 21 : cy + (g.S < 4 ? -8 : 4), lab, `font-size="11" text-anchor="${below ? "middle" : left ? "end" : "start"}" ${story ? 'font-weight="700"' : 'class="t-mu"'}`);
    }
    /* 흔들림은 대각선: 같은 n 이 E · S 에 함께 더해진다 */
    const r = mode === "all" || mode === "ind" ? 6 : R.noise[mode];
    for (const d of [50, 10]) {
      const b = sc("oral", d);
      s += `<line x1="${X(Math.max(0, b.E - r))}" y1="${Y(Math.max(0, b.S - r))}" x2="${X(b.E + r)}" y2="${Y(b.S + r)}" stroke="var(--me)" stroke-width="6" stroke-opacity="0.25"/>`;
      if (mode !== "all" && mode !== "ind") for (const x of outs(b.E, b.S, mode)) s += `<circle cx="${X(x.e)}" cy="${Y(x.s)}" r="2.4" fill="${x.pass ? "var(--good)" : "var(--paper)"}" stroke="${tone(x.pass)}" stroke-width="1"/>`;
    }
    const a = sc("oral", 50), b = sc("oral", 10);
    s += `<line x1="${X(a.E) - 6}" y1="${Y(a.S) - 8}" x2="${X(b.E) + 8}" y2="${Y(b.S) + 10}" stroke="var(--ink)" stroke-width="2" marker-end="url(#s7v5-ar)"/>`;
    /* 오른쪽 설명 */
    const RX = 500;
    let ty = 50;
    const line = (t, a2 = 'font-size="12.5"') => { s += T(RX, ty, t, a2); ty += 21; };
    line(mode === "all" ? "모든 관문을 겹쳐 보면" : `${REGL[mode]} 기준 ${mode === "ind" ? `S ≥ ${R.th.ind.s}` : rule(mode)}`, 'font-size="15" font-weight="700"');
    if (mode === "all") {
      line("초록이 짙을수록 여러 관문을 함께 넘는 자리.");
      line(`가장 엄격한 3상(E ≥ ${R.th.phase3.e} · S ≥ ${R.th.phase3.s})이 곧 최종 문.`);
    } else {
      const qa = mode === "ind" ? { ok: +(a.S >= 35), tot: 1, p: +(a.S >= 35) } : prob(a, mode), qb = mode === "ind" ? { ok: +(b.S >= 35), tot: 1, p: +(b.S >= 35) } : prob(b, mode);
      line(`경구 50 mg: ${mode === "ind" ? (qa.p ? "승인" : "보류") : `${frac(qa)} = ${pc(qa.p)}`}`, `font-size="12.5" class="t-m" style="fill:${tone(qa.p > 0.5)}"`);
      line(`경구 10 mg: ${mode === "ind" ? (qb.p ? "승인" : "보류") : `${frac(qb)} = ${pc(qb.p)}`}`, `font-size="12.5" class="t-m" style="fill:${tone(qb.p > 0.5)}"`);
    }
    ty += 8;
    line("화살표 = 우리 모둠의 선택: 50 → 10 mg", 'font-size="12.5" font-weight="600"');
    line(`E ${f1(a.E)} → ${f1(b.E)} (${f1(b.E - a.E)}) · S ${f1(a.S)} → ${f1(b.S)} (+${f1(b.S - a.S)})`, 'font-size="12" class="t-m"');
    line("효능을 조금 내주고 안전을 크게 얻었다.", 'font-size="12.5" class="t-mu"');
    ty += 8;
    line(`옅은 대각선 띠 = 흔들림 ±${r}`, 'font-size="12.5" font-weight="600"');
    line("같은 운(n)이 E · S 에 함께 더해져서", 'font-size="12.5" class="t-mu"');
    line("결과는 대각선 위 어딘가에 떨어진다.", 'font-size="12.5" class="t-mu"');
    ty += 8;
    s += `<circle cx="${RX + 6}" cy="${ty - 4}" r="5" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.5"/>` + T(RX + 16, ty, "경구", 'font-size="12"');
    s += `<rect x="${RX + 58}" y="${ty - 8.5}" width="9" height="9" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.5"/>` + T(RX + 72, ty, "정맥주사", 'font-size="12"');
    s += `<path d="M${RX + 140} ${ty - 10} l5.5 9.5 h-11 z" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.5"/>` + T(RX + 152, ty, "경피 (숫자 = mg)", 'font-size="12"');
    return CV.svg(W, H, s, "효능 E · 안전 S 평면과 관문별 허용 영역");
  }
  function v5() {
    const st = { p: "all" };
    return `<div class="s7-ctl"><div role="group" aria-label="관문 고르기"><span class="vz-lab">관문</span>${btns("s7-v5-p", "p", [["all", "모두 겹치기"], ["ind", "IND"], ["phase1", "1상"], ["phase2", "2상"], ["phase3", "3상"]], st.p)}</div></div>
      <div data-out>${planeSVG(st)}</div>`;
  }

  /* ───────── 6. 실패 후 갈림길 ───────── */
  function v6() {
    const W = 880, H = 470, f = TR[0];
    const b50 = sc("oral", 50), b10 = sc("oral", 10), bt = sc("transdermal", 50);
    const A1 = prob(b50, "phase1"), A3 = prob(b50, "phase3");
    const B = PH.map((k) => prob(b10, k)), C = PH.map((k) => prob(bt, k));
    const others = EX.admet.filter((a) => a.c.t === EX.tid && a.id !== LEAD.id);
    const opts = [
      { t: "① 같은 프로토콜로 다시 (50 mg 그대로)", cost: `${MX(R.cost.phase1)} · ${R.days.phase1}일`,
        p: `1상 통과 ${frac(A1)} = ${pc(A1.p)} · 통과해도 3상 S ≥ ${R.th.phase3.s} 은 ${frac(A3)}`,
        why: `S 예상 ${f1(b50.S)} + 최대 흔들림 ${R.noise.phase3} = ${f1(b50.S + R.noise.phase3)} < ${R.th.phase3.s}`, v: "막다른 길", tn: "bad", mk: "✕" },
      { t: "② FDA 에서 용량 바꾸기 → 10 mg", cost: `변경 무료 · 0일 → 1상 ${MX(R.cost.phase1)} · ${R.days.phase1}일`,
        p: `1상 ${frac(B[0])} · 2상 ${frac(B[1])} · 3상 ${frac(B[2])} — 모두 100%`,
        why: `E ${f1(b50.E)} → ${f1(b10.E)} 로 줄지만 3상 기준 ${R.th.phase3.e} 보다 ${f1(b10.E - R.th.phase3.e)} 높다`, v: "우리 모둠의 선택", tn: "good", mk: "✓", pick: true },
      { t: "③ 제형 바꾸기 → 경피 50 mg", cost: `IND 다시 ${MX(R.cost.ind)} · ${R.days.ind}일 + 1상 ${MX(R.cost.phase1)} · ${R.days.phase1}일`,
        p: `1상 ${frac(C[0])} · 2상 ${frac(C[1])} · 3상 ${frac(C[2])} = ${pc(C[2].p)}`,
        why: `S ${f1(bt.S)} 가 3상 기준 ${R.th.phase3.s} 에 가까워 운이 나쁘면 떨어진다`, v: "가능 · 위험 남음", tn: "warn", mk: "△" },
      { t: "④ 후보 분자 바꾸기 (2.2 로 돌아가기)", cost: "앞 단계부터 다시 · 시간 · 돈 더 듦",
        p: `다른 도네페질 유도체 ${others.length}개도 경구 50 mg 에선 S ${others.map((o) => f1(o.sc.S)).join(" · ")}`,
        why: "분자가 아니라 용량이 문제 — 바꿔도 같은 벽", v: "효과 없음", tn: "warn", mk: "△" }
    ];
    let s = `<rect x="16" y="170" width="214" height="124" fill="var(--bad-bg)" stroke="var(--bad)" stroke-width="2"/>`;
    s += T(30, 198, `1상 실패 ✕`, 'font-size="18" font-weight="700" style="fill:var(--bad)"');
    s += T(30, 222, `경구 ${f.dose} mg · D+${f.day}`, 'font-size="12.5" class="t-m"');
    s += T(30, 242, `S ${f1(f.S)} < 기준 ${f.th.s}`, 'font-size="12.5" class="t-m" font-weight="600"');
    s += T(30, 262, `(예상 ${f1(f.base.S)} · 흔들림 ${sgn(f.n)})`, 'font-size="11.5" class="t-m t-mu"');
    s += T(30, 282, `쓴 돈 ${MX(f.cost)} · 돌려받지 못함`, 'font-size="11.5" class="t-mu"');
    opts.forEach((o, i) => {
      const y = 12 + i * 114, cy = y + 50;
      s += `<path d="M230 232 C 268 232, 262 ${cy}, 300 ${cy}" fill="none" stroke="${o.pick ? "var(--ink)" : "var(--line-strong)"}" stroke-width="${o.pick ? 3.5 : 1.5}" ${o.pick ? "" : 'stroke-dasharray="5 4"'}/>`;
      s += `<rect x="300" y="${y}" width="566" height="100" fill="${o.pick ? "var(--surface)" : "var(--paper)"}" stroke="${o.pick ? "var(--ink)" : "var(--line-strong)"}" stroke-width="${o.pick ? 2 : 1}"/>`;
      s += T(314, y + 24, o.t, 'font-size="14" font-weight="700"');
      const cw = o.v.length * 12.5 + 30;
      s += `<rect x="${852 - cw}" y="${y + 10}" width="${cw}" height="22" fill="var(--${o.tn}-bg)"/>` + T(852 - cw / 2, y + 25, `${o.mk} ${o.v}`, `font-size="12" text-anchor="middle" font-weight="700" style="fill:var(--${o.tn})"`);
      s += T(314, y + 46, o.cost, 'font-size="12" class="t-m t-mu"');
      s += T(314, y + 67, o.p, 'font-size="12.5" class="t-m" font-weight="600"');
      s += T(314, y + 88, o.why, 'font-size="12" class="t-mu"');
    });
    return CV.svg(W, H, s, "1상 실패 뒤 네 갈래 길과 각각의 통과 확률");
  }

  /* ───────── 7. 임상 간트 ───────── */
  function v7() {
    const W = 880, L = 190, X1 = 862, Dm = 840, X = (d) => L + (d / Dm) * (X1 - L), rh = 46;
    const rows = [{ lab: "1.1 ~ 3.2", sub: "발견 · 개발 · IND", s: 0, e: EX.ind.day, kind: "pre", txt: `${EX.ind.day}일`, note: `IND 승인 D+${EX.ind.day}` }];
    TR.forEach((t, i) => {
      rows.push({ lab: `${t.label} · ${t.dose} mg`, sub: t.note, s: t.day - R.days[t.k], e: t.day, kind: t.pass ? "pass" : "fail",
        txt: `${R.days[t.k]}일`, note: `${MX(t.cost)} · ${[t.th.e != null ? `E ${f1(t.E)} ${t.E >= t.th.e ? "≥" : "<"} ${t.th.e}` : "", t.th.s != null ? `S ${f1(t.S)} ${t.S >= t.th.s ? "≥" : "<"} ${t.th.s}` : ""].filter(Boolean).join(" · ")} ${t.pass ? "통과 ✓" : "실패 ✕"}` });
      if (i === 0) rows.push({ lab: "FDA 용량 변경", sub: "50 → 10 mg", s: t.day, e: t.day, kind: "amend", note: "무료 · 0일 — 같은 날 다시 1상 시작" });
    });
    rows.push({ lab: "4.2 허가 심사", sub: "다음 단계", s: TR[TR.length - 1].day, e: EX.approval.day, kind: "next", txt: `${R.days.final}일`, note: `${MX(R.cost.final)} · D+${EX.approval.day}` });
    const H = 40 + rows.length * rh + 54;
    let s = "";
    for (let d = 0; d <= Dm; d += 120) { s += `<line x1="${X(d)}" x2="${X(d)}" y1="26" y2="${H - 50}" stroke="var(--line)" stroke-dasharray="2 4"/>` + T(X(d), 18, `D+${d}`, 'font-size="11" class="t-m t-mu" text-anchor="middle"'); }
    rows.forEach((r, i) => {
      const y = 34 + i * rh;
      s += T(16, y + 15, r.lab, 'font-size="13" font-weight="700"');
      s += T(16, y + 31, r.sub, 'font-size="11" class="t-mu"');
      if (r.kind === "amend") {
        s += `<path d="M${X(r.s)} ${y + 2} l9 9 l-9 9 l-9 -9 z" fill="var(--hi)" stroke="var(--ink)" stroke-width="1.5"/>`;
        s += T(X(r.s) + 16, y + 15, r.note, 'font-size="12" font-weight="600"');
        return;
      }
      const fill = r.kind === "pre" ? "var(--raise)" : r.kind === "next" ? "var(--paper)" : tone(r.kind === "pass");
      s += `<rect x="${X(r.s)}" y="${y + 1}" width="${Math.max(3, X(r.e) - X(r.s))}" height="20" fill="${fill}" ${r.kind === "next" || r.kind === "pre" ? 'stroke="var(--line-strong)"' : ""} ${r.kind === "next" ? 'stroke-dasharray="4 3"' : ""}/>`;
      const light = r.kind === "pass" || r.kind === "fail";
      s += T(X(r.s) + 6, y + 15, r.txt, `font-size="11.5" class="t-m" font-weight="600" ${light ? 'style="fill:var(--paper)"' : ""}`);
      s += r.kind === "next" ? T(X(r.e), y + 36, r.note, 'font-size="11.5" class="t-m" text-anchor="end"')
        : T(X(r.s), y + 36, r.note, `font-size="11.5" class="t-m" ${r.kind === "fail" ? 'style="fill:var(--bad)"' : ""}`);
    });
    const t3 = TR[TR.length - 1], share = R.days.phase3 / EX.approval.day;
    s += T(16, H - 18, `3상 하나가 ${R.days.phase3}일 — 허가까지 ${EX.approval.day}일의 ${(share * 100).toFixed(1)}%. 실패한 1상은 ${R.days.phase1}일을 그대로 늘렸다. 임상 끝 D+${t3.day}.`, 'font-size="12.5" font-weight="600"');
    return CV.svg(W, H, s, "D+42 부터 D+822 까지 임상 일정표");
  }

  /* ───────── 8. 연구비 계단 ───────── */
  function v8() {
    const W = 880, H = 400, d0 = EX.ind.day, X0 = 80, X1 = 820, Y0 = 330, Y1 = 50;
    const X = (d) => X0 + ((d - d0) / (840 - d0)) * (X1 - X0), Y = (c) => Y0 - (c / R.startCash) * (Y0 - Y1);
    const pre = R.cost.htvs + R.cost.docking + R.cost.admet + R.cost.patent + R.cost.ind;
    let cash = Math.round((R.startCash - pre) * 1000) / 1000;
    const ev = TR.map((t) => ({ d: t.day - R.days[t.k], c: t.cost, lab: `${t.label} ${t.dose} mg${t.pass ? "" : " · 실패"}`, fail: !t.pass }));
    ev.push({ d: TR[TR.length - 1].day, c: R.cost.final, lab: "허가 심사", next: true });
    let s = "";
    for (let c = 0; c <= R.startCash; c += 1) { s += `<line x1="${X0}" x2="${X1}" y1="${Y(c)}" y2="${Y(c)}" stroke="var(--line)" ${c ? 'stroke-dasharray="2 4"' : ""}/>` + T(X0 - 8, Y(c) + 4, `$${c}M`, 'font-size="11" class="t-m t-mu" text-anchor="end"'); }
    for (const d of [d0, ...TR.map((t) => t.day), EX.approval.day]) s += T(X(d), Y0 + 18, `D+${d}`, 'font-size="10.5" class="t-m t-mu" text-anchor="middle"');
    s += `<line x1="${X0}" x2="${X1}" y1="${Y(R.startCash)}" y2="${Y(R.startCash)}" stroke="var(--ink)" stroke-dasharray="6 4"/>` + T(X1, Y(R.startCash) - 8, `처음 연구비 ${MX(R.startCash)}`, 'font-size="12" text-anchor="end" font-weight="600"');
    let d = `M${X(d0)} ${Y0} V${Y(cash)}`, prevX = X(d0);
    const marks = [];
    s += T(X0, Y(R.startCash) - 12, `D+${d0} IND 승인 때 ${MX(cash)} — 그날 바로 1상 시작`, 'font-size="12" class="t-m"');
    ev.forEach((e, i) => {
      const before = cash; cash = Math.round((cash - e.c) * 1000) / 1000;
      d += ` H${X(e.d)} V${Y(cash)}`; prevX = X(e.d);
      marks.push({ x: X(e.d), y0: Y(before), y1: Y(cash), e, cash, i });
    });
    d += ` H${X(840)} V${Y0} Z`;
    s += `<path d="${d}" fill="var(--film-3)" stroke="var(--ink)" stroke-width="2"/>`;
    marks.forEach((m) => {
      const col = m.e.fail ? "var(--bad)" : m.e.next ? "var(--muted)" : "var(--ink)";
      s += `<line x1="${m.x}" x2="${m.x}" y1="${m.y0}" y2="${m.y1}" stroke="${col}" stroke-width="5"/>`;
      const ly = m.y1 + 22 + (m.i % 2) * 34;
      s += T(m.x + 6, ly, `−${MX(m.e.c)}`, `font-size="12" class="t-m" font-weight="700" style="fill:${col}"`);
      s += T(m.x + 6, ly + 15, m.e.lab, `font-size="11" style="fill:${col}"`);
    });
    s += T(X1, Y(cash) - 10, `남은 돈 ${MX(cash)}`, 'font-size="12.5" class="t-m" text-anchor="end" font-weight="700"');
    const trialSum = TR.reduce((a, t) => a + t.cost, 0);
    s += T(16, 372, `임상 네 번에 ${MX(trialSum)} — 처음 연구비의 ${Math.round((trialSum / R.startCash) * 100)}%. 3상 한 번(${MX(R.cost.phase3)})이 1.2 ~ 3.2 다섯 단계를 합친 ${MX(pre)} 의 ${Math.round(R.cost.phase3 / pre)}배.`, 'font-size="12.5" font-weight="600"');
    s += T(16, 392, "빨간 계단: 실패한 1상도 돈은 그대로 나간다. 돈은 시작할 때 낸다.", 'font-size="12" class="t-mu"');
    return CV.svg(W, H, s, "임상 동안 남은 연구비 계단");
  }

  /* ───────── 9. 환자 수 아이콘 ───────── */
  function v9() {
    const W = 880, per = 20, IX = 290, step = 18.5, cols = 28;
    const rows = [
      { k: "phase1", q: "안전한가?", who: "건강한 지원자", n: 100, rng: "대략 20 ~ 100명", fill: "var(--muted)" },
      { k: "phase2", q: "효과가 있나?", who: "환자", n: 300, rng: "대략 수백 명 (그림 300명)", fill: "var(--me)" },
      { k: "phase3", q: "많은 환자에게 둘 다?", who: "환자", n: 3000, rng: "대략 300 ~ 3,000명", fill: "var(--me)" }
    ];
    const icon = (x, y, f) => `<circle cx="${x + 6}" cy="${y + 3.6}" r="3.4" fill="${f}"/><path d="M${x + 1} ${y + 16} v-5 q0 -3.6 5 -3.6 q5 0 5 3.6 v5 z" fill="${f}"/>`;
    let s = "", y = 22;
    for (const r of rows) {
      const n = Math.round(r.n / per), lines = Math.ceil(n / cols), h = Math.max(70, lines * 21 + 30);
      s += `<line x1="16" x2="864" y1="${y - 10}" y2="${y - 10}" stroke="var(--line)"/>`;
      s += T(16, y + 10, `${PHL[r.k]} · ${r.q}`, 'font-size="15" font-weight="700"');
      s += T(16, y + 30, `${r.who} · ${r.rng}`, 'font-size="12"');
      s += T(16, y + 49, `게임: ${rule(r.k)} · 흔들림 ±${R.noise[r.k]}`, 'font-size="12" class="t-m t-mu"');
      for (let i = 0; i < n; i++) s += icon(IX + (i % cols) * step, y - 2 + Math.floor(i / cols) * 21, r.fill);
      s += T(864, y + 10, `${r.n.toLocaleString("en-US")}명`, 'font-size="13" class="t-m" text-anchor="end" font-weight="700"');
      y += h;
    }
    s += `<line x1="16" x2="864" y1="${y - 10}" y2="${y - 10}" stroke="var(--line)"/>`;
    s += icon(16, y + 2, "var(--muted)") + T(34, y + 15, "건강한 사람 20명", 'font-size="12"');
    s += icon(160, y + 2, "var(--me)") + T(178, y + 15, "환자 20명", 'font-size="12"');
    s += T(864, y + 15, "사람이 많을수록 평균이 덜 흔들린다 → 3상 흔들림 ±4", 'font-size="12.5" text-anchor="end" font-weight="700"');
    y += 28;
    return CV.svg(W, y, s, "임상 단계별 참가자 규모 아이콘");
  }
  function v9wrap() {
    return v9() + `<p class="s7-src">참가자 규모는 대략값 — 미국 FDA 'The Drug Development Process · Step 3: Clinical Research' 안내 기준. 실제 시험마다 크게 다르다.</p>`;
  }

  /* ───────── 10. 100개 중 10개 ───────── */
  function v10() {
    /* BIO · Biomedtracker · Amplion, Clinical Development Success Rates 2006–2015 (2016) */
    const P = { p12: 0.632, p23: 0.307, p3n: 0.581, pna: 0.853 };
    const a1 = 100, a2 = a1 * P.p12, a3 = a2 * P.p23, aN = a3 * P.p3n, aA = aN * P.pna;
    const n2 = Math.round(a2), n3 = Math.round(a3), nN = Math.round(aN), nA = Math.round(aA);
    const G = [
      { n: a1 - n2, ch: "1", fill: "var(--raise)", ink: "var(--ink)", lab: "1상에서 멈춤", rate: `1상 → 2상 ${(P.p12 * 100).toFixed(1)}%` },
      { n: n2 - n3, ch: "2", fill: "var(--bad)", ink: "var(--paper)", lab: "2상에서 멈춤 · 가장 큰 벽", rate: `2상 → 3상 ${(P.p23 * 100).toFixed(1)}%` },
      { n: n3 - nN, ch: "3", fill: "var(--warn)", ink: "var(--paper)", lab: "3상에서 멈춤", rate: `3상 → 허가 신청 ${(P.p3n * 100).toFixed(1)}%` },
      { n: nN - nA, ch: "심", fill: "var(--muted)", ink: "var(--paper)", lab: "허가 심사에서 멈춤", rate: `신청 → 허가 ${(P.pna * 100).toFixed(1)}%` },
      { n: nA, ch: "✓", fill: "var(--good)", ink: "var(--paper)", lab: "허가", rate: `1상에서 허가까지 ${(aA).toFixed(1)}%` }
    ];
    const W = 880, cs = 29, gap = 3, X0 = 20, Y0 = 40;
    let s = T(20, 22, "1상에 들어간 약 후보 100개는 어디까지 갈까 (실제 세계 · 대략)", 'font-size="14" font-weight="700"');
    let i = 0;
    for (const g of G) for (let j = 0; j < g.n; j++, i++) {
      const x = X0 + (i % 10) * (cs + gap), y = Y0 + Math.floor(i / 10) * (cs + gap);
      s += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${g.fill}"/>` + `<text x="${x + cs / 2}" y="${y + cs / 2 + 4}" font-size="11" text-anchor="middle" class="t-m" style="fill:${g.ink}">${esc(g.ch)}</text>`;
    }
    const LX = 370;
    G.forEach((g, k) => {
      const y = Y0 + 8 + k * 58;
      s += `<rect x="${LX}" y="${y}" width="22" height="22" fill="${g.fill}"/>` + `<text x="${LX + 11}" y="${y + 15}" font-size="11" text-anchor="middle" class="t-m" style="fill:${g.ink}">${esc(g.ch)}</text>`;
      s += T(LX + 34, y + 10, `${g.lab}`, 'font-size="13.5" font-weight="700"');
      s += T(LX + 34, y + 28, g.rate, 'font-size="12" class="t-m t-mu"');
      s += T(864, y + 16, `${g.n}개`, 'font-size="18" class="t-m" text-anchor="end" font-weight="700"');
      s += `<rect x="${LX + 260}" y="${y + 6}" width="${g.n * 1.6}" height="12" fill="${g.fill}" stroke="var(--line)"/>`;
    });
    s += T(20, Y0 + 10 * (cs + gap) + 22, "이 게임은 기준만 넘으면 통과라 2상이 쉬운 편이지만, 실제로는 '정말 효과가 있나'를 처음 제대로 묻는 2상에서 가장 많이 떨어진다.", 'font-size="12.5" font-weight="600"');
    return CV.svg(W, Y0 + 10 * (cs + gap) + 34, s, "임상 후보 100개의 단계별 소모 와플 그림");
  }
  function v10wrap() {
    return v10() + `<p class="s7-src">출처: BIO · Biomedtracker · Amplion, Clinical Development Success Rates 2006–2015 (2016) — 1상에서 허가까지 9.6%. 연구마다 차이가 있다(대략 1상 → 2상 52~77%, 2상 → 3상 29~59%, 3상 → 허가 57~74%; Wong et al. 2019 등). 알츠하이머병 후보 약은 2002~2012년 성공률이 약 0.4% 였다(Cummings et al. 2014).</p>`;
  }

  window.VIZ[7] = [
    { name: "세 관문 허들", kind: "실물 은유 · 허들 높이",
      idea: "1상 · 2상 · 3상을 높이가 다른 허들로 그리고, 우리 약의 E · S 막대가 허들을 넘는지 같은 눈금에서 보여 준다.",
      learn: "관문마다 묻는 것(안전 → 효능 → 둘 다)과 기준 높이가 달라지고, 기간 · 비용은 두 배씩 커진다.",
      render: v1 },
    { name: "흔들림 띠", kind: "구간 띠 · 기준선 · 확률",
      idea: "예상값 둘레로 나올 수 있는 흔들림 13가지(3상은 9가지)를 점으로 찍고, 기준선을 넘는 점을 세어 통과 확률을 정확히 낸다.",
      learn: "결과는 운에 따라 흔들리므로, 예상값이 기준에서 멀수록(여유가 클수록) 안전하다.",
      render: v2, mount: (el) => wire(el, ["f", "d"], { f: "oral", d: "50" }, band) },
    { name: "100번 굴려 보기", kind: "시뮬레이터 · 막대",
      idea: "같은 약으로 같은 임상을 100번 해 보고, 흔들림 값마다 몇 번 나왔고 몇 번 통과했는지 막대로 센다.",
      learn: "50 mg 1상은 100번 중 몇 번만 통과한다 — 한 번 통과 · 실패는 운이 섞인 결과다.",
      render: v3, mount: m3 },
    { name: "여유와 확률", kind: "계단 곡선 · 슬라이더",
      idea: "가로축 '예상값 − 기준(여유)', 세로축 통과 확률로 흔들림 ±6 과 ±4 의 계단을 그리고, 슬라이더로 여유를 옮겨 본다.",
      learn: "여유가 흔들림 폭보다 크면 늘 통과, 0 이면 반반 — 기준에서 멀어질수록 확률이 계단처럼 오른다.",
      render: v4, mount: m4 },
    { name: "E·S 궤적", kind: "산점도 · 허용 영역",
      idea: "효능 E × 안전 S 평면에 관문별 통과 영역을 겹치고, 9가지 제형 · 용량 점과 50 → 10 mg 이동 화살표, 대각선 흔들림 띠를 그린다.",
      learn: "용량을 내리면 효능을 조금 내주고 안전을 크게 얻어, 모든 관문을 넘는 오른쪽 위 자리로 들어간다.",
      render: v5, mount: (el) => wire(el, ["p"], { p: "all" }, planeSVG) },
    { name: "실패 후 갈림길", kind: "흐름도 · 분기",
      idea: "1상 실패 뒤 네 갈래(다시 · 용량 · 제형 · 후보 교체)의 비용 · 기간 · 통과 확률을 규칙으로 계산해 나란히 놓는다.",
      learn: "실패하면 원인(용량)을 찾아 바꾸는 쪽이 무작정 다시 하는 것보다 싸고 확실하다.",
      render: v6 },
    { name: "임상 간트", kind: "타임라인 · 간트",
      idea: "D+42 IND 승인부터 D+822 허가까지 1상 실패 · 용량 변경 · 재시험 · 2상 · 3상을 날짜 눈금 위 막대로 그린다.",
      learn: "3상 한 번이 전체 기간의 절반 가까이를 차지하고, 실패 한 번은 90일을 그대로 늘린다.",
      render: v7 },
    { name: "연구비 계단", kind: "계단 차트 · 누적",
      idea: "임상을 시작할 때마다 연구비가 계단처럼 내려가는 모습을 날짜 위에 그리고, 실패한 1상 계단을 빨갛게 표시한다.",
      learn: "임상이 연구비 대부분을 쓰며, 3상 한 번이 앞의 다섯 단계를 합친 돈의 4배다.",
      render: v8 },
    { name: "환자 수 아이콘", kind: "아이콘 배열 · 규모",
      idea: "아이콘 하나 = 20명으로 1상(건강인 소수) → 2상(환자 수백) → 3상(환자 수천)의 대략 규모와 단계별 질문을 함께 놓는다.",
      learn: "단계가 오를수록 더 많은 환자로 더 어려운 질문을 하고, 사람이 많을수록 결과가 덜 흔들린다.",
      render: v9wrap },
    { name: "100개 중 10개", kind: "와플 · 실제 소모율",
      idea: "1상에 들어간 후보 100개가 실제 세계에서 어느 단계에서 멈추는지 칸 100개로 나눠 칠한다(BIO 2016).",
      learn: "실제로는 1상에 들어간 후보 10개 중 9개가 허가 전에 멈추고, 가장 큰 벽은 효과를 처음 증명하는 2상이다.",
      render: v10wrap }
  ];
})();
