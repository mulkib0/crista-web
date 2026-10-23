/* 1.1 질환 · 표적 선정 — 시각화 시안 10종 */
(function () {
  "use strict";
  const CV = window.CV, { EX, esc, f1, f2, R } = CV;

  CV.css("s1", `
    .s1-mv { transition: transform .6s cubic-bezier(.2,.7,.2,1), opacity .35s ease; }
    .s1-ctl { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px 16px; align-items: end; }
    .s1-ctl label { display: grid; gap: 2px; font-size: 12.5px; font-weight: 600; }
    .s1-ctl output { font-family: var(--mono); font-weight: 500; color: var(--muted); }
    .s1-sw { display: inline-block; width: 10px; height: 10px; margin-right: 5px; vertical-align: -1px; }
    .s1-info { border: 1px solid var(--line-strong); background: var(--paper); padding: 10px 12px; display: grid; gap: 6px; min-height: 92px; }
    .s1-info h4 { margin: 0; font-size: 14px; display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; }
    .s1-info .mono { font-family: var(--mono); }
    .s1-ev { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 4px 12px; font-size: 12px; }
    .s1-ev span { display: grid; grid-template-columns: 34px 1fr 38px; gap: 6px; align-items: center; }
    .s1-ev i { display: block; height: 8px; background: var(--raise); position: relative; }
    .s1-ev i b { position: absolute; inset: 0 auto 0 0; background: var(--ink); }
    .s1-ev em { font-style: normal; font-family: var(--mono); text-align: right; }
    .s1-node { cursor: pointer; }
    .s1-node:focus { outline: none; }
    .s1-node:focus-visible rect, .s1-node:focus-visible circle { stroke: var(--ink); stroke-width: 3; }
    .s1-chain { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0; border: 1px solid var(--line-strong); }
    .s1-ch { position: relative; padding: 10px 12px 12px; border-right: 1px solid var(--line); display: grid; gap: 4px; align-content: start; background: var(--surface); min-width: 0; }
    .s1-ch:last-child { border-right: 0; }
    .s1-ch::after { content: "→"; position: absolute; right: -9px; top: 38px; z-index: 1; width: 18px; height: 18px; display: grid; place-items: center; font-size: 12px; font-weight: 700; background: var(--ink); color: var(--paper); }
    .s1-ch:last-child::after { display: none; }
    .s1-ch .k { font-family: var(--mono); font-size: 10.5px; letter-spacing: .08em; color: var(--muted); text-transform: uppercase; }
    .s1-ch .v { font-size: 17px; font-weight: 700; letter-spacing: -.02em; line-height: 1.2; }
    .s1-ch .v.mono { font-family: var(--mono); }
    .s1-ch .d { font-size: 12px; color: var(--muted); line-height: 1.4; }
    .s1-ch .why { font-size: 12px; border-top: 1px dashed var(--line-strong); padding-top: 6px; margin-top: 2px; }
    .s1-ch.ok { background: var(--good-bg); }
    .s1-ch.no { background: var(--bad-bg); }
    .s1-ch.ghost .v { color: var(--muted); }
    .s1-chain.broken .s1-ch::after { background: var(--bad); }
    .s1-chain.broken .s1-ch.no ~ .s1-ch { opacity: .45; }
    @media (max-width: 760px) {
      .s1-chain { grid-template-columns: minmax(0, 1fr); }
      .s1-ch { border-right: 0; border-bottom: 1px solid var(--line); }
      .s1-ch::after { content: "↓"; right: auto; left: 14px; top: auto; bottom: -9px; }
    }
    .s1-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .s1-card { appearance: none; border: 0; padding: 0; background: transparent; perspective: 900px; text-align: left; min-height: 256px; border-radius: 0; }
    .s1-in { position: relative; display: block; width: 100%; height: 100%; min-height: 256px; transition: transform .55s cubic-bezier(.2,.7,.2,1); transform-style: preserve-3d; }
    .s1-card[aria-pressed="true"] .s1-in { transform: rotateY(180deg); }
    .s1-f, .s1-b { position: absolute; inset: 0; display: grid; gap: 4px; align-content: start; padding: 10px; border: 1px solid var(--line-strong); backface-visibility: hidden; -webkit-backface-visibility: hidden; }
    .s1-f { background: var(--surface); }
    .s1-b { transform: rotateY(180deg); background: var(--bad-bg); border-color: var(--bad); }
    .s1-b.ok { background: var(--good-bg); border-color: var(--good); }
    .s1-b.mid { background: var(--warn-bg); border-color: var(--warn); }
    .s1-card:hover .s1-f { border-color: var(--ink); }
    .s1-f .rk { font-family: var(--mono); font-size: 11px; color: var(--muted); }
    .s1-f .g, .s1-b .g { font-family: var(--mono); font-size: 18px; font-weight: 600; }
    .s1-f .ko, .s1-b .ko { font-size: 11.5px; color: var(--muted); line-height: 1.3; }
    .s1-f .sc { font-family: var(--mono); font-size: 22px; font-weight: 600; letter-spacing: -.02em; }
    .s1-f .mini { display: grid; grid-template-columns: 28px 1fr; gap: 2px 6px; align-items: center; font-size: 10.5px; color: var(--muted); }
    .s1-f .mini i { display: block; height: 6px; background: var(--raise); position: relative; }
    .s1-f .mini i b { position: absolute; inset: 0 auto 0 0; background: var(--ink); }
    .s1-f .hint { margin-top: auto; font-size: 11px; color: var(--muted); font-family: var(--mono); }
    .s1-b dl { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 2px 8px; font-size: 11.5px; }
    .s1-b dt { color: var(--muted); }
    .s1-b dd { margin: 0; font-family: var(--mono); }
    .s1-b .res { margin-top: auto; font-weight: 700; font-size: 13px; }
  `);

  /* ── 공통 재료 ── */
  const AZ = EX.disease;                                   /* 알츠하이머 */
  const T8 = AZ.targets.slice().sort((a, b) => b.overallScore - a.overallScore);  /* 종합 점수 순 */
  const scoreRank = (t) => T8.indexOf(t) + 1;
  const KO = { ACHE: "아세틸콜린 분해 효소", APP: "아밀로이드 전구 단백질", PSEN1: "프레세닐린 1", PSEN2: "프레세닐린 2", APOE: "아포지단백 E",
    ABCA7: "지질 운반 단백질 A7", SORL1: "소르틸린 관련 수용체", GRIN1: "NMDA 수용체 소단위 1" };
  const EV = [
    { k: "geneticScore", t: "유전", d: "변이", c: "var(--me)" },
    { k: "drugScore", t: "약물", d: "기존 약", c: "var(--seum)" },
    { k: "literatureScore", t: "문헌", d: "논문", c: "var(--mirp)" },
    { k: "expressionScore", t: "발현", d: "조직 속 양", c: "var(--daon)" }
  ];
  const tierOf = (t) => (t.dockingTargetId ? "ready" : t.pdbId ? "pdb" : "none");
  const TIER = {
    ready: { k: "good", g: "✓", t: "도킹 준비됨", o: 0 },
    pdb: { k: "warn", g: "△", t: "구조만 있음", o: 1 },
    none: { k: "bad", g: "✗", t: "구조 없음", o: 2 }
  };
  const REF = EX.t;                                         /* TARGETS["ache-4ey7"] */
  const n0 = (v) => Number(v).toLocaleString("ko-KR");

  /* SVG 글자 하나. 색은 style 로(공용 CSS 가 text fill 을 덮으므로) */
  const tx = (x, y, s, o = {}) => `<text x="${x}" y="${y}"${o.a ? ` text-anchor="${o.a}"` : ""}${o.cls ? ` class="${o.cls}"` : ""} style="font-size:${o.fs || 12.5}px${o.w ? `;font-weight:${o.w}` : ""}${o.fill ? `;fill:${o.fill}` : ""}">${s}</text>`;
  /* 상태 칩(색 + 기호 + 글자) */
  const chip = (x, y, w, tier, short) => {
    const T = TIER[tier];
    return `<rect x="${x}" y="${y}" width="${w}" height="22" fill="var(--${T.k}-bg)" stroke="var(--${T.k})" stroke-width="1"/>` +
      tx(x + w / 2, y + 15.5, `${T.g} ${short ? T.t.replace("도킹 ", "") : T.t}`, { a: "middle", fs: 12, w: 600, fill: `var(--${T.k})` });
  };
  const evBars = (t) => `<div class="s1-ev">${EV.map((e) => `<span>${e.t}<i><b style="width:${(t[e.k] * 100).toFixed(1)}%;background:${e.c}"></b></i><em>${f2(t[e.k])}</em></span>`).join("")}</div>`;

  /* ── 01 근거 열지도 ── */
  function v1() {
    const W = 880, top = 58, rh = 40, H = top + T8.length * rh + 44;
    const cx = (k) => 170 + k * 74, bx = 482, bw = 130;
    let b = "";
    EV.forEach((e, k) => {
      b += tx(cx(k) + 34, 24, e.t, { a: "middle", w: 700, fs: 13 }) + tx(cx(k) + 34, 42, e.d, { a: "middle", cls: "t-mu", fs: 11 });
    });
    b += tx(bx, 24, "종합 점수", { w: 700, fs: 13 }) + tx(bx, 42, "근거를 합친 값", { cls: "t-mu", fs: 11 });
    b += tx(712, 24, "결정구조", { a: "middle", w: 700, fs: 13 }) + tx(712, 42, "PDB 번호", { a: "middle", cls: "t-mu", fs: 11 });
    b += tx(820, 24, "다음 단계", { a: "middle", w: 700, fs: 13 }) + tx(820, 42, "3단계 도킹", { a: "middle", cls: "t-mu", fs: 11 });
    T8.forEach((t, i) => {
      const y = top + i * rh, tier = tierOf(t);
      if (tier === "ready") b += `<rect x="0" y="${y}" width="${W}" height="${rh}" fill="var(--hi)" fill-opacity=".45"/>`;
      b += `<line x1="0" x2="${W}" y1="${y + rh}" y2="${y + rh}" stroke="var(--line)" stroke-width="1"/>`;
      b += tx(8, y + 17, `${i + 1}`, { cls: "t-m t-mu", fs: 11 }) + tx(26, y + 17, t.symbol, { cls: "t-m", w: 600, fs: 13.5 }) + tx(26, y + 33, esc(KO[t.symbol] || t.name), { cls: "t-mu", fs: 11 });
      EV.forEach((e, k) => {
        const v = t[e.k];
        b += `<rect x="${cx(k)}" y="${y + 4}" width="68" height="${rh - 8}" fill="var(--me)" fill-opacity="${(0.05 + 0.85 * v).toFixed(3)}" stroke="var(--line)" stroke-width="1"/>`;
        b += tx(cx(k) + 34, y + 25, v === 0 ? "0" : f2(v), { a: "middle", cls: "t-m", fs: 12.5, w: 600, fill: v > 0.5 ? "var(--paper)" : "var(--ink)" });
      });
      b += `<rect x="${bx}" y="${y + 13}" width="${bw}" height="14" fill="var(--raise)"/><rect x="${bx}" y="${y + 13}" width="${(t.overallScore * bw).toFixed(1)}" height="14" fill="var(--ink)"/>`;
      b += tx(bx + bw + 6, y + 25, t.overallScore.toFixed(3), { cls: "t-m", fs: 12 });
      b += tx(712, y + 25, t.pdbId ? t.pdbId : "—", { a: "middle", cls: "t-m", w: t.pdbId ? 600 : 400, fs: 12.5 });
      b += chip(770, y + 9, 100, tier, true);
    });
    b += `<line x1="${bx + bw * 0.5}" x2="${bx + bw * 0.5}" y1="${top}" y2="${top + T8.length * rh}" stroke="var(--line-strong)" stroke-dasharray="3 3" stroke-width="1"/>`;
    b += tx(bx + bw * 0.5, top + T8.length * rh + 14, "0.5", { a: "middle", cls: "t-m t-mu", fs: 11 });
    b += tx(8, H - 8, `알츠하이머 연관 표적 ${n0(AZ.assoc)}개 중 상위 8 · 종합 점수 순. 맨 아래 ACHE 만 다음 단계로 갈 수 있다.`, { fs: 12.5, w: 600 });
    return CV.svg(W, H, b, "알츠하이머 연관 표적 8개의 근거 4종 열지도");
  }

  /* ── 02 순위 뒤집기 ── */
  const tierOrder = T8.slice().sort((a, b) => TIER[tierOf(a)].o - TIER[tierOf(b)].o || b.overallScore - a.overallScore);
  function rankLayout(mode) {
    const pos = new Map(), lab = {};
    if (mode === "score") { T8.forEach((t, i) => pos.set(t.symbol, 44 + i * 38)); return { pos, lab }; }
    let y = 44, prev = null;
    tierOrder.forEach((t) => {
      const tr = tierOf(t);
      if (tr !== prev) { y += 30; lab[tr] = y - 6; prev = tr; }
      pos.set(t.symbol, y); y += 38;
    });
    return { pos, lab };
  }
  function v2svg(mode) {
    const W = 800, H = 44 + 8 * 38 + 3 * 30 + 30, L = rankLayout(mode), bx = 210, bw = 300;
    let b = tx(8, 22, "순위", { cls: "t-mu", fs: 11.5 }) + tx(56, 22, "표적", { cls: "t-mu", fs: 11.5 }) + tx(bx, 22, "종합 점수(0 ~ 1)", { cls: "t-mu", fs: 11.5 }) + tx(618, 22, "도킹", { cls: "t-mu", fs: 11.5 });
    for (const tr of ["ready", "pdb", "none"]) {
      const y = L.lab[tr] != null ? L.lab[tr] : 44, on = mode === "tier";
      const cap = { ready: "다음 단계로 갈 수 있음 — 결정구조 + 기준 약 + 검증", pdb: "구조는 있지만 도킹 준비 안 됨", none: "결정구조 없음 — 주머니 모양을 모름" }[tr];
      b += `<g class="s1-mv" data-lab="${tr}" style="transform:translate(0px,${y}px);opacity:${on ? 1 : 0}">` +
        `<line x1="0" x2="${W}" y1="0" y2="0" stroke="var(--${TIER[tr].k})" stroke-dasharray="4 3" stroke-width="1.5"/>` +
        tx(0, -6, `${TIER[tr].g} ${cap}`, { fs: 12, w: 600, fill: `var(--${TIER[tr].k})` }) + `</g>`;
    }
    T8.forEach((t) => {
      const y = L.pos.get(t.symbol), tr = tierOf(t), ready = tr === "ready", sr = scoreRank(t), tierRank = tierOrder.indexOf(t) + 1;
      b += `<g class="s1-mv" data-row="${t.symbol}" data-sr="${sr}" data-tr="${tierRank}" style="transform:translate(0px,${y}px)">` +
        (ready ? `<rect x="0" y="2" width="${W}" height="34" fill="var(--hi)" fill-opacity=".45"/>` : "") +
        `<rect x="6" y="7" width="34" height="24" fill="${ready ? "var(--ink)" : "var(--paper)"}" stroke="var(--line-strong)" stroke-width="1"/>` +
        `<text data-rk x="23" y="24" text-anchor="middle" class="t-m" style="font-size:13px;font-weight:600${ready ? ";fill:var(--hi)" : ""}">${mode === "score" ? sr : tierRank}</text>` +
        tx(56, 18, t.symbol, { cls: "t-m", w: 600, fs: 13.5 }) + tx(56, 32, esc(KO[t.symbol]), { cls: "t-mu", fs: 11 }) +
        `<rect x="${bx}" y="12" width="${bw}" height="14" fill="var(--raise)"/><rect x="${bx}" y="12" width="${(t.overallScore * bw).toFixed(1)}" height="14" fill="${ready ? "var(--good)" : "var(--ink)"}"/>` +
        tx(bx + bw + 8, 24, t.overallScore.toFixed(3), { cls: "t-m", fs: 12 }) +
        chip(600, 8, 110, tr, true) +
        `<text data-was x="722" y="24" class="t-m t-mu" style="font-size:11.5px;opacity:${mode === "tier" ? 1 : 0}">점수 ${sr}위</text>` +
        `</g>`;
    });
    b += `<text data-cap x="8" y="${H - 8}" style="font-size:12.5px;font-weight:600">${mode === "score" ? "점수만 보면 ACHE 는 꼴찌(8위)다. '다음 단계 기준'으로 바꿔 보자." : "도킹할 수 있느냐로 줄 세우면 ACHE 가 1위. 점수 1위 APP 는 구조만 있어 멈춘다."}</text>`;
    return CV.svg(W, H, b, "알츠하이머 표적 순위: 점수 순과 도킹 가능 순");
  }
  function v2mount(el) {
    const btns = el.querySelectorAll("[data-mode]");
    const set = (mode) => {
      btns.forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.mode === mode)));
      const L = rankLayout(mode);
      el.querySelectorAll("[data-row]").forEach((g) => {
        g.style.transform = `translate(0px,${L.pos.get(g.dataset.row)}px)`;
        const sr = g.dataset.sr, tr = g.dataset.tr;
        g.querySelector("[data-rk]").textContent = mode === "score" ? sr : tr;
        g.querySelector("[data-was]").style.opacity = mode === "tier" ? 1 : 0;
      });
      el.querySelectorAll("[data-lab]").forEach((g) => {
        const y = L.lab[g.dataset.lab];
        g.style.opacity = mode === "tier" ? 1 : 0;
        if (y != null) g.style.transform = `translate(0px,${y}px)`;
      });
      el.querySelector("[data-cap]").textContent = mode === "score" ? "점수만 보면 ACHE 는 꼴찌(8위)다. '다음 단계 기준'으로 바꿔 보자." : "도킹할 수 있느냐로 줄 세우면 ACHE 가 1위. 점수 1위 APP 는 구조만 있어 멈춘다.";
    };
    btns.forEach((x) => x.addEventListener("click", () => set(x.dataset.mode)));
  }

  /* ── 03 내 점수 만들기 ── */
  const W3 = [1, 1, 1, 1];
  function v3svg(w) {
    const sw = w.reduce((a, x) => a + x, 0), W = 800, top = 40, rh = 36, H = top + 8 * rh + 50, bx = 130, bw = 440;
    if (!sw) return CV.svg(W, 120, tx(8, 40, "가중치를 하나 이상 올려 주세요.", { fs: 14, w: 600 }), "가중치 없음");
    const rows = T8.map((t) => {
      const seg = EV.map((e, k) => (w[k] * t[e.k]) / sw);
      return { t, seg, s: seg.reduce((a, x) => a + x, 0) };
    }).sort((a, b) => b.s - a.s);
    let b = tx(8, 22, "내 순위", { cls: "t-mu", fs: 11.5 }) + tx(bx, 22, "내 점수 = 근거 × 가중치의 평균 (0 ~ 1)", { cls: "t-mu", fs: 11.5 }) + tx(bx + bw + 76, 22, "도킹", { cls: "t-mu", fs: 11.5 });
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      b += `<line x1="${bx + v * bw}" x2="${bx + v * bw}" y1="${top - 4}" y2="${top + 8 * rh}" stroke="var(--line)" stroke-width="1"/>` + tx(bx + v * bw, top + 8 * rh + 14, String(v), { a: "middle", cls: "t-m t-mu", fs: 11 });
    }
    rows.forEach((r, i) => {
      const y = top + i * rh, tr = tierOf(r.t), ready = tr === "ready";
      if (ready) b += `<rect x="0" y="${y}" width="${W}" height="${rh}" fill="var(--hi)" fill-opacity=".45"/>`;
      b += tx(8, y + 23, `${i + 1}위`, { cls: "t-m", w: 600, fs: 12.5 }) + tx(46, y + 23, r.t.symbol, { cls: "t-m", w: 600, fs: 13 });
      let x = bx;
      r.seg.forEach((v, k) => {
        const ww = v * bw;
        if (ww > 0.2) b += `<rect x="${x.toFixed(1)}" y="${y + 8}" width="${ww.toFixed(1)}" height="20" fill="${EV[k].c}" stroke="var(--surface)" stroke-width="1"/>`;
        if (ww > 34) b += tx(x + ww / 2, y + 22, EV[k].t, { a: "middle", fs: 11, w: 600, fill: "var(--paper)" });
        x += ww;
      });
      b += tx(bx + bw + 12, y + 23, r.s.toFixed(3), { cls: "t-m", fs: 12.5, w: 600 });
      b += `<line x1="${bx + r.t.overallScore * bw}" x2="${bx + r.t.overallScore * bw}" y1="${y + 4}" y2="${y + 32}" stroke="var(--ink)" stroke-width="2"/>`;
      b += chip(bx + bw + 76, y + 7, 100, tr, true);
    });
    const ache = rows.findIndex((r) => r.t.symbol === "ACHE") + 1;
    b += tx(8, H - 6, `지금 가중치로 ACHE 는 ${ache}위 · 세로 검은 선은 Open Targets 종합 점수 · 도킹 준비됨은 늘 ACHE 하나뿐`, { fs: 12.5, w: 600 });
    return CV.svg(W, H, b, "가중치를 바꾼 내 표적 점수 누적 막대");
  }
  function v3mount(el) {
    const w = W3.slice(), box = el.querySelector("[data-plot]");
    const draw = () => {
      EV.forEach((e, k) => { el.querySelector(`#s1-v3-w${k}`).value = w[k]; el.querySelector(`[data-out="${k}"]`).textContent = "× " + w[k]; });
      box.innerHTML = v3svg(w);
    };
    EV.forEach((e, k) => el.querySelector(`#s1-v3-w${k}`).addEventListener("input", (ev) => { w[k] = +ev.target.value; draw(); }));
    el.querySelectorAll("[data-pre]").forEach((x) => x.addEventListener("click", () => { x.dataset.pre.split(",").forEach((v, k) => (w[k] = +v)); draw(); }));
  }

  /* ── 04 질환-유전자 망 ── */
  const ANG = { APP: -100, PSEN1: 100, PSEN2: -42, APOE: 42, ABCA7: -142, SORL1: 142, GRIN1: 180, ACHE: 0 };
  const netR = (s) => 60 + (0.92 - s) * 720;
  function infoHTML(t) {
    const tr = tierOf(t), T = TIER[tr];
    return `<h4><span class="mono">${esc(t.symbol)}</span><span style="font-weight:500">${esc(KO[t.symbol])}</span><span class="vz-chip">종합 ${t.overallScore.toFixed(3)} · ${scoreRank(t)}위</span><span class="vz-sig ${T.k}">${T.g} ${T.t}${t.pdbId ? " · PDB " + esc(t.pdbId) : ""}</span></h4>${evBars(t)}`;
  }
  function v4() {
    const W = 760, H = 540, cx = 380, cy = 270, rnd = CV.rng(11);
    let b = "";
    /* 나머지 연관 표적 — 점 하나 = 50개 */
    const rest = AZ.assoc - T8.length, nd = Math.round(rest / 50);
    let placed = 0, guard = 0;
    while (placed < nd && guard++ < 20000) {
      const x = 6 + rnd() * (W - 12), y = 6 + rnd() * (H - 12), d = Math.hypot(x - cx, y - cy);
      if (d < 300) continue;
      b += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="var(--muted)" fill-opacity=".35"/>`; placed++;
    }
    for (const s of [0.8, 0.7]) {
      const r = netR(s);
      b += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--line-strong)" stroke-dasharray="3 4" stroke-width="1"/>` + tx(cx + 4, cy - r - 4, `점수 ${s}`, { cls: "t-m t-mu", fs: 11 });
    }
    const pts = T8.map((t) => { const a = (ANG[t.symbol] * Math.PI) / 180, r = netR(t.overallScore); return { t, a, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; });
    for (const p of pts) b += `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${tierOf(p.t) === "ready" ? "var(--good)" : "var(--ink)"}" stroke-opacity="${tierOf(p.t) === "ready" ? 1 : 0.55}" stroke-width="${(1 + (p.t.overallScore - 0.6) * 18).toFixed(1)}"/>`;
    b += `<circle cx="${cx}" cy="${cy}" r="52" fill="var(--ink)"/>` + tx(cx, cy - 6, "알츠하이머", { a: "middle", fs: 14, w: 700, fill: "var(--paper)" }) + tx(cx, cy + 13, `연관 ${n0(AZ.assoc)}`, { a: "middle", cls: "t-m", fs: 11.5, fill: "var(--hi)" });
    for (const p of pts) {
      const tr = tierOf(p.t), T = TIER[tr], lx = p.x + Math.cos(p.a) * 30, ly = p.y + Math.sin(p.a) * 30 + 4, anc = Math.cos(p.a) > 0.3 ? "start" : Math.cos(p.a) < -0.3 ? "end" : "middle";
      const shape = tr === "ready" ? `<rect x="${p.x - 15}" y="${p.y - 15}" width="30" height="30" fill="var(--good)" stroke="var(--ink)" stroke-width="1.5"/>` + tx(p.x, p.y + 5, "✓", { a: "middle", fs: 14, w: 700, fill: "var(--paper)" })
        : tr === "pdb" ? `<rect x="${p.x - 12}" y="${p.y - 12}" width="24" height="24" fill="var(--paper)" stroke="var(--warn)" stroke-width="2"/>` + tx(p.x, p.y + 4, "△", { a: "middle", fs: 11, fill: "var(--warn)" })
          : `<circle cx="${p.x}" cy="${p.y}" r="12" fill="var(--paper)" stroke="var(--bad)" stroke-width="2" stroke-dasharray="3 2"/>` + tx(p.x, p.y + 4, "✗", { a: "middle", fs: 11, fill: "var(--bad)" });
      b += `<g class="s1-node" data-node="${p.t.symbol}" tabindex="0" role="button" aria-label="${p.t.symbol} 종합 ${p.t.overallScore.toFixed(3)} ${T.t}">${shape}` +
        tx(lx, ly - (anc === "middle" ? (Math.sin(p.a) < 0 ? 8 : -6) : 0), p.t.symbol, { a: anc, cls: "t-m", w: 700, fs: 13 }) +
        tx(lx, ly + 14 - (anc === "middle" ? (Math.sin(p.a) < 0 ? 8 : -6) : 0), p.t.overallScore.toFixed(2), { a: anc, cls: "t-m t-mu", fs: 11 }) + `</g>`;
    }
    b += tx(8, 20, "가운데에 가까울수록 연관 근거가 강하다 · 선 굵기 = 종합 점수", { fs: 12, w: 600 });
    b += tx(8, H - 10, `흐린 점 하나 = 연관 표적 50개 (나머지 ${n0(rest)}개는 점수가 더 낮다)`, { cls: "t-mu", fs: 11.5 });
    return `${CV.svg(W, H, b, "알츠하이머와 연관 표적의 관계망")}
      <div class="vz-row"><span class="vz-sig good">✓ 도킹 준비됨</span><span class="vz-sig warn">△ 구조만 있음</span><span class="vz-sig bad">✗ 구조 없음</span><span class="vz-note">점을 가리키거나 눌러 근거를 보세요.</span></div>
      <div class="s1-info" data-info aria-live="polite">${infoHTML(T8.find((t) => t.symbol === "ACHE"))}</div>`;
  }
  function v4mount(el) {
    const info = el.querySelector("[data-info]");
    const show = (g) => { const t = T8.find((x) => x.symbol === g.dataset.node); if (t) info.innerHTML = infoHTML(t); };
    el.querySelectorAll("[data-node]").forEach((g) => {
      g.addEventListener("mouseenter", () => show(g));
      g.addEventListener("focus", () => show(g));
      g.addEventListener("click", () => show(g));
    });
  }

  /* ── 05 자물쇠와 열쇠 ── */
  function lock(cx, top, t) {
    const tr = tierOf(t), ready = tr === "ready";
    const body = tr === "ready" ? "var(--good-bg)" : tr === "pdb" ? "var(--paper)" : "var(--raise)";
    const stroke = tr === "none" ? 'stroke="var(--muted)" stroke-dasharray="5 4"' : 'stroke="var(--ink)"';
    let s = `<path d="M${cx - 24} ${top + 52} V${top + 32} A24 24 0 0 1 ${cx + 24} ${top + 32} V${top + 52}" fill="none" ${stroke} stroke-width="7"/>`;
    s += `<rect x="${cx - 40}" y="${top + 50}" width="80" height="66" fill="${body}" ${stroke} stroke-width="2"/>`;
    if (tr === "none") s += tx(cx, top + 92, "?", { a: "middle", fs: 26, w: 700, fill: "var(--muted)" });
    else s += `<circle cx="${cx}" cy="${top + 75}" r="8" fill="var(--ink)"/><path d="M${cx - 5} ${top + 78} L${cx - 8} ${top + 100} H${cx + 8} L${cx + 5} ${top + 78} Z" fill="var(--ink)"/>`;
    if (ready) {
      s += `<rect x="${cx + 2}" y="${top + 72}" width="70" height="7" fill="var(--good)"/><rect x="${cx + 44}" y="${top + 79}" width="6" height="7" fill="var(--good)"/><rect x="${cx + 56}" y="${top + 79}" width="6" height="5" fill="var(--good)"/>`;
      s += `<circle cx="${cx + 84}" cy="${top + 75}" r="14" fill="var(--good)"/><circle cx="${cx + 84}" cy="${top + 75}" r="5" fill="var(--surface)"/>`;
      s += tx(cx + 84, top + 104, "도네페질", { a: "middle", fs: 11, w: 700, fill: "var(--good)" });
    } else if (tr === "pdb") {
      s += `<rect x="${cx + 48}" y="${top + 72}" width="34" height="7" fill="none" stroke="var(--warn)" stroke-dasharray="3 2" stroke-width="1.5"/><circle cx="${cx + 84}" cy="${top + 75}" r="12" fill="none" stroke="var(--warn)" stroke-dasharray="3 2" stroke-width="1.5"/>`;
      s += tx(cx + 84, top + 80, "?", { a: "middle", fs: 13, w: 700, fill: "var(--warn)" });
    }
    s += tx(cx, top + 140, t.symbol, { a: "middle", cls: "t-m", w: 700, fs: 14 });
    s += tx(cx, top + 157, `점수 ${t.overallScore.toFixed(2)} · ${scoreRank(t)}위`, { a: "middle", cls: "t-m t-mu", fs: 11.5 });
    const T = TIER[tr];
    s += tx(cx, top + 175, `${T.g} ${tr === "ready" ? "4EY7 · 열쇠 있음" : tr === "pdb" ? `${t.pdbId} · 열쇠 본 없음` : "구멍 모양 모름"}`, { a: "middle", fs: 12, w: 600, fill: `var(--${T.k})` });
    return s;
  }
  function v5() {
    const W = 800, ch = 196, H = 2 * ch + 76;
    let b = "";
    T8.forEach((t, i) => { b += lock(100 + (i % 4) * 200 - 20, 6 + Math.floor(i / 4) * ch, t); });
    const y = 2 * ch + 22;
    b += `<line x1="0" x2="${W}" y1="${y - 12}" y2="${y - 12}" stroke="var(--line-strong)" stroke-width="1"/>`;
    b += tx(8, y + 6, "자물쇠 = 표적 단백질 · 구멍 = 약이 붙는 주머니 · 열쇠 = 기준 약(이미 맞는 분자)", { fs: 12.5, w: 600 });
    b += tx(8, y + 26, "결정구조(PDB)는 구멍 모양을 원자 단위로 찍은 사진. 구멍 모양과 기준 열쇠가 다 있어야 새 열쇠(후보)를 시험할 수 있다.", { cls: "t-mu", fs: 12 });
    b += tx(8, y + 46, "점수 순으로 놓았다. 열쇠가 꽂힌 자물쇠는 점수 꼴찌 ACHE 하나.", { fs: 12.5, w: 600 });
    return CV.svg(W, H, b, "자물쇠와 열쇠로 본 표적 8개");
  }

  /* ── 06 관문 4개 ── */
  const GATES = [
    { t: "질환 연관", r: "Open Targets 상위 8", ok: () => true, v: (t) => t.overallScore.toFixed(2) },
    { t: "약 주머니", r: "작은 분자가 붙을 자리", ok: (t) => !!t.smPocket, v: (t) => (t.smPocket ? "있음" : "없음") },
    { t: "결정구조", r: "PDB 좌표가 있음", ok: (t) => !!t.pdbId, v: (t) => t.pdbId || "없음" },
    { t: "도킹 준비", r: "기준 약 + 재도킹 검증", ok: (t) => !!t.dockingTargetId, v: (t) => (t.dockingTargetId ? `${REF.ref} · ${REF.rmsd}Å` : "없음") }
  ];
  const failGate = (t) => GATES.findIndex((g) => !g.ok(t));
  function v6svg(stage) {
    const W = 820, top = 92, rh = 34, H = top + 8 * rh + 30, gx = (k) => 160 + k * 132;
    let alive = T8.length, b = "";
    b += tx(8, 22, "표적", { cls: "t-mu", fs: 11.5 });
    const counts = GATES.map((g, k) => (alive = T8.filter((t) => { const f = failGate(t); return f === -1 || f > k; }).length));
    GATES.forEach((g, k) => {
      const on = k < stage;
      b += `<rect x="${gx(k)}" y="6" width="124" height="78" fill="${on ? "var(--ink)" : "var(--raise)"}"/>`;
      b += tx(gx(k) + 8, 24, `관문 ${k + 1}`, { cls: "t-m", fs: 11, fill: on ? "var(--hi)" : "var(--muted)" });
      b += tx(gx(k) + 8, 42, g.t, { fs: 13.5, w: 700, fill: on ? "var(--paper)" : "var(--ink)" });
      b += tx(gx(k) + 8, 58, g.r, { fs: 11, fill: on ? "var(--paper)" : "var(--muted)" });
      b += tx(gx(k) + 8, 77, on ? `남은 표적 ${counts[k]}개` : "아직 안 봄", { cls: "t-m", fs: 11.5, w: 600, fill: on ? "var(--hi)" : "var(--muted)" });
    });
    b += tx(700, 42, "결과", { fs: 13.5, w: 700 }) + tx(700, 58, "3단계로?", { fs: 11, cls: "t-mu" });
    T8.forEach((t, i) => {
      const y = top + i * rh, f = failGate(t), dead = f !== -1 && f < stage;
      b += `<line x1="0" x2="${W}" y1="${y + rh}" y2="${y + rh}" stroke="var(--line)" stroke-width="1"/>`;
      b += tx(8, y + 22, t.symbol, { cls: "t-m", w: 600, fs: 13, fill: dead ? "var(--muted)" : "var(--ink)" }) + tx(70, y + 22, t.overallScore.toFixed(2), { cls: "t-m t-mu", fs: 11.5 });
      GATES.forEach((g, k) => {
        const x = gx(k), seen = k < stage, after = f !== -1 && k > f;
        if (!seen) { b += `<rect x="${x}" y="${y + 5}" width="124" height="${rh - 10}" fill="var(--raise)"/>` + tx(x + 62, y + 22, "?", { a: "middle", fs: 12, fill: "var(--muted)" }); return; }
        if (after) { b += tx(x + 62, y + 22, "—", { a: "middle", fs: 12, fill: "var(--muted)" }); return; }
        const ok = g.ok(t);
        b += `<rect x="${x}" y="${y + 5}" width="124" height="${rh - 10}" fill="var(--${ok ? "good" : "bad"}-bg)" stroke="var(--${ok ? "good" : "bad"})" stroke-width="1"/>`;
        b += tx(x + 8, y + 22, ok ? "✓" : "✗", { fs: 13, w: 700, fill: `var(--${ok ? "good" : "bad"})` }) + tx(x + 24, y + 22, esc(g.v(t)), { cls: "t-m", fs: 11, fill: `var(--${ok ? "good" : "bad"})` });
      });
      const done = stage >= 4 || dead;
      const res = !done ? "…" : f === -1 ? "✓ 통과" : `✗ 관문 ${f + 1}에서 멈춤`;
      b += tx(700, y + 22, res, { fs: 12, w: 600, fill: !done ? "var(--muted)" : f === -1 ? "var(--good)" : "var(--bad)" });
    });
    b += tx(8, H - 8, stage >= 4 ? `8 → ${counts.join(" → ")}개. 점수가 높아도 앞 관문에서 막히면 끝이다. 남는 표적은 ACHE 하나.` : `관문 ${stage}까지 봤다. 남은 표적 ${counts[stage - 1]}개.`, { fs: 12.5, w: 600 });
    return CV.svg(W, H, b, "표적이 3단계로 가기 위한 관문 4개");
  }
  function v6mount(el) {
    const box = el.querySelector("[data-plot]"), btns = el.querySelectorAll("[data-st]"), play = el.querySelector("#s1-v6-play");
    let timer = null;
    const set = (s) => { btns.forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.st === s))); box.innerHTML = v6svg(s); };
    const stop = () => { if (timer) clearInterval(timer); timer = null; play.setAttribute("aria-pressed", "false"); };
    btns.forEach((x) => x.addEventListener("click", () => { stop(); set(+x.dataset.st); }));
    play.addEventListener("click", () => {
      stop();
      if (CV.reduced()) return set(4);
      let s = 1; set(s); play.setAttribute("aria-pressed", "true");
      timer = setInterval(() => { s++; set(s); if (s >= 4) stop(); }, 1100);
    });
    return stop;
  }

  /* ── 07 질환에서 구조까지 ── */
  function chainBox(k, v, d, why, cls = "", mono = false, extra = "") {
    return `<div class="s1-ch ${cls}"><span class="k">${k}</span><span class="v${mono ? " mono" : ""}">${v}</span>${extra}<span class="d">${d}</span>${why ? `<span class="why">${why}</span>` : ""}</div>`;
  }
  function v7() {
    const ache = T8.find((t) => t.symbol === "ACHE"), app = T8[0];
    const ok = `<div class="s1-chain" aria-label="ACHE 로 이어지는 사슬">
      ${chainBox("① 질환", "알츠하이머", `${esc(AZ.mondo)} · 연관 표적 ${n0(AZ.assoc)}개`, "기억력이 떨어지는 뇌 질환")}
      ${chainBox("② 표적", "ACHE", `${esc(REF.label)} · 종합 ${ache.overallScore.toFixed(2)} (${scoreRank(ache)}위)`, "뇌의 신호 물질(아세틸콜린)을 분해한다. 막으면 신호가 오래 남는다.", "", true)}
      ${chainBox("③ 기준 약", esc(REF.ref), `결정 리간드 · ${f2(REF.refKcal)} kcal/mol`, "이미 이 표적에 붙는 약. 새 분자를 견줄 잣대.", "", false, CV.mol(REF.refSmiles, 200, 110))}
      ${chainBox("④ 결정구조", esc(REF.pdb), `재도킹 RMSD ${REF.rmsd} Å ≤ 2 Å · 검증 통과`, "약이 붙은 주머니를 원자 단위로 찍은 사진(PDB).", "ok", true)}
      ${chainBox("⑤ 다음 단계", "1.2 스크리닝", `분자 ${CV.D.compounds.length}개를 ACHE 점수로`, "사슬이 끝까지 이어져 다음으로 간다.", "ok")}
    </div>`;
    const bad = `<div class="s1-chain broken" aria-label="APP 에서 끊기는 사슬">
      ${chainBox("① 질환", "알츠하이머", `연관 표적 ${n0(AZ.assoc)}개`, "")}
      ${chainBox("② 표적", "APP", `${esc(KO.APP)} · 종합 ${app.overallScore.toFixed(2)} (1위)`, "근거는 가장 강하다.", "", true)}
      ${chainBox("③ 기준 약", "준비 없음", "이 실습에 맞춘 기준 약이 없다", "비교할 잣대가 없다.", "no")}
      ${chainBox("④ 결정구조", esc(app.pdbId), "구조는 있지만 도킹 준비 안 됨", "", "ghost", true)}
      ${chainBox("⑤ 다음 단계", "✗ 갈 수 없음", "점수 1위여도 멈춘다", "", "ghost")}
    </div>`;
    return `<span class="vz-lab">이어지는 사슬 — 알츠하이머 → ACHE</span>${ok}<span class="vz-lab">끊기는 사슬 — 점수 1위 APP</span>${bad}
      <p class="vz-note">고리 하나라도 빠지면 다음 단계(도킹)로 갈 수 없다. 표적은 '점수'가 아니라 '사슬이 끝까지 이어지는가'로 고른다.</p>`;
  }

  /* ── 08 4대 질환 비교 ── */
  function v8() {
    const W = 820, rowH = 104, top = 34, x0 = 196, x1 = 690, H = top + 4 * rowH + 34;
    const sx = CV.scale([0.6, 0.9], [x0, x1]);
    const order = ["알츠하이머", "비소세포폐암", "2형 당뇨", "류마티스 관절염"];
    const DS = order.map((nm) => CV.D.diseases.find((d) => d.name === nm)).filter(Boolean);
    let b = "";
    for (const v of CV.ticks(0.6, 0.9, 7)) {
      b += `<line x1="${sx(v)}" x2="${sx(v)}" y1="${top - 6}" y2="${top + DS.length * rowH}" stroke="var(--line)" stroke-width="1"/>` + tx(sx(v), top + DS.length * rowH + 16, v.toFixed(2), { a: "middle", cls: "t-m t-mu", fs: 11 });
    }
    b += tx(x0, 18, "종합 점수(Open Targets) →", { cls: "t-mu", fs: 11.5 }) + tx(812, 18, "도킹 표적의 점수 순위", { a: "end", cls: "t-mu", fs: 11.5 });
    b += tx((x0 + x1) / 2, H - 4, "종합 점수", { a: "middle", cls: "t-mu", fs: 11.5 });
    DS.forEach((d, i) => {
      const y0 = top + i * rowH, base = y0 + rowH / 2 + 6;
      const ts = d.targets.slice().sort((a, b) => b.overallScore - a.overallScore);
      const rdy = ts.find((t) => t.dockingTargetId), rk = ts.indexOf(rdy) + 1;
      if (i) b += `<line x1="0" x2="${W}" y1="${y0}" y2="${y0}" stroke="var(--line-strong)" stroke-width="1"/>`;
      b += tx(8, y0 + 30, esc(d.name), { fs: 14.5, w: 700 }) + tx(8, y0 + 48, `연관 표적 ${n0(d.assoc)}개`, { cls: "t-mu", fs: 11.5 }) + tx(8, y0 + 66, `표적 ${rdy.symbol} · PDB ${d.pdb}`, { cls: "t-m", fs: 11.5 });
      b += `<line x1="${x0}" x2="${x1}" y1="${base}" y2="${base}" stroke="var(--line-strong)" stroke-width="1"/>`;
      /* 겹치는 점은 위아래로 비켜 놓는다 */
      const lv = [0, -15, 15, -30, 30], placed = [];
      const pts = ts.slice().sort((a, b) => a.overallScore - b.overallScore).map((t) => {
        const x = sx(t.overallScore);
        let L = 0;
        for (const o of lv) { if (!placed.some((p) => p.o === o && Math.abs(p.x - x) < 14)) { L = o; break; } }
        placed.push({ x, o: L });
        return { t, x, y: base + L };
      });
      for (const p of pts) {
        if (p.t.dockingTargetId) continue;
        b += `<circle cx="${p.x.toFixed(1)}" cy="${p.y}" r="6" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.5"><title>${esc(p.t.symbol)} ${p.t.overallScore.toFixed(3)}</title></circle>`;
      }
      const top1 = ts[0], p1 = pts.find((p) => p.t === top1), pr = pts.find((p) => p.t === rdy);
      if (top1 !== rdy) b += tx(p1.x, base - 40, `${top1.symbol} 1위 ↓`, { a: "middle", cls: "t-m t-mu", fs: 11 });
      b += `<path d="M${pr.x} ${pr.y - 10} L${pr.x + 10} ${pr.y} L${pr.x} ${pr.y + 10} L${pr.x - 10} ${pr.y} Z" fill="var(--good)" stroke="var(--ink)" stroke-width="1.5"><title>${esc(rdy.symbol)} ${rdy.overallScore.toFixed(3)} 도킹 준비됨</title></path>`;
      b += tx(pr.x, pr.y + 28, `${rdy.symbol} ${rdy.overallScore.toFixed(2)}`, { a: pr.x > x1 - 30 ? "end" : "middle", cls: "t-m", w: 700, fs: 12, fill: "var(--good)" });
      b += `<rect x="720" y="${y0 + 26}" width="92" height="44" fill="${rk === 1 ? "var(--good-bg)" : "var(--bad-bg)"}" stroke="${rk === 1 ? "var(--good)" : "var(--bad)"}" stroke-width="1"/>`;
      b += tx(766, y0 + 54, `${rk} / ${ts.length}위`, { a: "middle", cls: "t-m", w: 700, fs: 16, fill: rk === 1 ? "var(--good)" : "var(--bad)" });
    });
    return `${CV.svg(W, H, b, "4대 질환의 표적 점수와 도킹 표적 위치")}
      <div class="vz-row"><span class="vz-sig good">◆ 도킹 준비된 표적</span><span class="vz-chip">○ 다른 연관 표적</span><span class="vz-note">질환마다 도킹할 수 있는 표적은 1개. 그중 점수 1위인 곳은 폐암(EGFR) 하나뿐이다.</span></div>`;
  }

  /* ── 09 점수 × 약물 근거 ── */
  const DCOL = { "알츠하이머": "var(--me)", "비소세포폐암": "var(--seum)", "2형 당뇨": "var(--daon)", "류마티스 관절염": "var(--mirp)" };
  function v9() {
    const W = 800, H = 430, x0 = 70, x1 = 780;
    const sx = CV.scale([0.6, 0.92], [x0, x1]);
    const yu = CV.scale([0.94, 1], [262, 40]);      /* 위 칸: 0.94 ~ 1.00 확대 */
    const yl = CV.scale([0, 0.9], [380, 290]);      /* 아래 칸: 0 ~ 0.90 */
    const sy = (v) => (v >= 0.94 ? yu(v) : yl(v));
    let b = "";
    b += `<rect x="${x0}" y="${yu(1)}" width="${x1 - x0}" height="${yu(0.99) - yu(1)}" fill="var(--hi)" fill-opacity=".35"/>`;
    b += tx(x1, yu(1) - 8, "연두 띠 = 약물 근거 0.99 이상 · 이미 약이 있는 표적", { a: "end", fs: 11.5, w: 600 });
    for (const v of [0.94, 0.96, 0.98, 1]) b += `<line x1="${x0}" x2="${x1}" y1="${yu(v)}" y2="${yu(v)}" stroke="var(--line)" stroke-width="1"/>` + tx(x0 - 6, yu(v) + 4, v.toFixed(2), { a: "end", cls: "t-m t-mu", fs: 11 });
    for (const v of [0, 0.3, 0.6, 0.9]) b += `<line x1="${x0}" x2="${x1}" y1="${yl(v)}" y2="${yl(v)}" stroke="var(--line)" stroke-width="1"/>` + (v < 0.9 ? tx(x0 - 6, yl(v) + 4, v.toFixed(1), { a: "end", cls: "t-m t-mu", fs: 11 }) : "");
    /* 축 끊김 표시 */
    b += `<rect x="${x0 - 4}" y="270" width="${x1 - x0 + 8}" height="14" fill="var(--surface)"/>`;
    b += `<path d="M${x0 - 10} 274 l8 -5 M${x0 - 10} 282 l8 -5" stroke="var(--ink)" stroke-width="1.5" fill="none"/>`;
    b += tx(x0 + 6, 281, "≈ 축 끊김: 위 칸은 0.94 ~ 1.00 을 크게 펼침 (0.90 ~ 0.94 에는 점이 없다)", { cls: "t-mu", fs: 11 });
    for (const v of [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]) b += `<line x1="${sx(v)}" x2="${sx(v)}" y1="${yl(0)}" y2="${yl(0) + 5}" stroke="var(--ink)" stroke-width="1"/>` + tx(sx(v), yl(0) + 18, v.toFixed(2), { a: "middle", cls: "t-m t-mu", fs: 11 });
    b += `<line x1="${x0}" x2="${x1}" y1="${yl(0)}" y2="${yl(0)}" stroke="var(--ink)" stroke-width="1"/>`;
    b += tx((x0 + x1) / 2, H - 6, "종합 점수(Open Targets) →", { a: "middle", cls: "t-mu", fs: 11.5 });
    b += tx(12, 24, "약물 근거 ↑", { cls: "t-mu", fs: 11.5 });
    const all = [];
    CV.D.diseases.forEach((d) => d.targets.forEach((t) => all.push({ d, t })));
    all.sort((a, b) => !!a.t.dockingTargetId - !!b.t.dockingTargetId);
    const rd = [];
    for (const { d, t } of all) {
      const x = sx(t.overallScore), y = sy(t.drugScore), c = DCOL[d.name], ready = !!t.dockingTargetId;
      const lab = `${t.symbol} · ${d.name} · 종합 ${t.overallScore.toFixed(3)} · 약물 ${t.drugScore.toFixed(3)}${ready ? " · 도킹 준비됨" : ""}`;
      const shape = ready ? `<path d="M${x} ${y - 8} L${x + 8} ${y} L${x} ${y + 8} L${x - 8} ${y} Z" fill="${c}" stroke="var(--ink)" stroke-width="2"/>` : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${c}" fill-opacity=".75" stroke="var(--surface)" stroke-width="1"/>`;
      b += `<g class="s1-node" data-pt="${esc(lab)}" tabindex="${ready ? 0 : -1}">${shape}<title>${esc(lab)}</title></g>`;
      if (ready) rd.push({ t, x, y });
    }
    /* 도킹 준비된 표적 이름: 왼쪽 무리(0.63~0.64)는 한 상자로 묶어 겹침을 피한다 */
    const near = rd.filter((p) => p.t.overallScore < 0.7).sort((a, b) => a.y - b.y), far = rd.filter((p) => p.t.overallScore >= 0.7);
    if (near.length) {
      const bx = sx(0.66), by = yu(0.975);
      for (const p of near) b += `<line x1="${p.x + 6}" y1="${p.y + 4}" x2="${bx}" y2="${by - 12}" stroke="var(--ink)" stroke-width="1"/>`;
      b += `<rect x="${bx}" y="${by - 16}" width="${near.length * 64 + 12}" height="24" fill="var(--paper)" stroke="var(--ink)" stroke-width="1"/>`;
      b += tx(bx + 8, by + 1, near.map((p) => p.t.symbol).join(" · "), { cls: "t-m", w: 700, fs: 12 });
      b += tx(bx + 8, by + 22, `종합 ${near.map((p) => p.t.overallScore.toFixed(2)).join(" · ")} — 각 질환에서 꼴찌`, { cls: "t-mu", fs: 11 });
    }
    for (const p of far) b += tx(p.x, p.y + 24, p.t.symbol, { a: "middle", cls: "t-m", w: 700, fs: 12 });
    return `${CV.svg(W, H, b, "표적 32개의 종합 점수와 약물 근거 산점도")}
      <div class="vz-row">${Object.entries(DCOL).map(([k, c]) => `<span class="vz-chip"><i class="s1-sw" style="background:${c}"></i>${esc(k)}</span>`).join("")}<span class="vz-chip">◆ 도킹 준비됨 · ● 그 밖</span></div>
      <p class="vz-note" data-pinfo aria-live="polite">점을 가리키면 이름이 나온다. 도킹 준비된 4개(◆)는 모두 약물 근거가 0.99 이상이고, 종합 점수는 중간쯤이다.</p>`;
  }
  function v9mount(el) {
    const out = el.querySelector("[data-pinfo]"), def = out.textContent;
    el.querySelectorAll("[data-pt]").forEach((g) => {
      g.addEventListener("mouseenter", () => (out.textContent = g.dataset.pt));
      g.addEventListener("focus", () => (out.textContent = g.dataset.pt));
      g.addEventListener("mouseleave", () => (out.textContent = def));
    });
  }

  /* ── 10 카드 뒤집기 ── */
  function v10() {
    const cards = T8.map((t, i) => {
      const tr = tierOf(t), T = TIER[tr];
      return `<button type="button" class="s1-card" id="s1-v10-c${i}" aria-pressed="false" aria-label="${t.symbol} 카드 뒤집기">
        <span class="s1-in">
          <span class="s1-f"><span class="rk">점수 ${i + 1}위</span><span class="g">${esc(t.symbol)}</span><span class="ko">${esc(KO[t.symbol])}</span>
            <span class="sc">${t.overallScore.toFixed(3)}</span>
            <span class="mini">${EV.map((e) => `<span>${e.t}</span><i><b style="width:${(t[e.k] * 100).toFixed(0)}%"></b></i>`).join("")}</span>
            <span class="hint">눌러서 뒤집기 ↻</span></span>
          <span class="s1-b ${tr === "ready" ? "ok" : tr === "pdb" ? "mid" : ""}"><span class="g">${esc(t.symbol)}</span>
            <dl><dt>결정구조</dt><dd>${esc(t.pdbId || "없음")}</dd><dt>약 주머니</dt><dd>${t.smPocket ? "있음" : "없음"}</dd>
              <dt>기준 약</dt><dd>${tr === "ready" ? esc(REF.ref) : "없음"}</dd><dt>검증</dt><dd>${tr === "ready" ? `RMSD ${REF.rmsd} Å` : "—"}</dd></dl>
            <span class="res" style="color:var(--${T.k})">${T.g} ${tr === "ready" ? "도킹 가능 · 다음 단계로" : "도킹 불가 · 여기서 멈춤"}</span></span>
        </span></button>`;
    }).join("");
    return `<div class="vz-row"><span class="vz-note" style="flex:1 1 260px">점수만 보고 골라 보자. 어느 카드가 다음 단계(도킹)로 갈 수 있을까? 눌러서 확인.</span>
      <button type="button" class="vz-btn" id="s1-v10-all" aria-pressed="false">모두 뒤집기</button></div>
      <div class="s1-cards">${cards}</div><p class="vz-note" data-score aria-live="polite">뒤집은 카드 0 / 8</p>`;
  }
  function v10mount(el) {
    const cards = [...el.querySelectorAll(".s1-card")], all = el.querySelector("#s1-v10-all"), out = el.querySelector("[data-score]");
    const upd = () => {
      const n = cards.filter((c) => c.getAttribute("aria-pressed") === "true").length;
      const found = cards[7].getAttribute("aria-pressed") === "true";
      out.textContent = `뒤집은 카드 ${n} / 8${found ? " · 찾았다 — 점수 꼴찌 ACHE 만 다음 단계로 갈 수 있다." : n ? " · 아직 도킹할 수 있는 표적이 안 나왔다." : ""}`;
      all.setAttribute("aria-pressed", String(n === 8));
    };
    cards.forEach((c) => c.addEventListener("click", () => { c.setAttribute("aria-pressed", String(c.getAttribute("aria-pressed") !== "true")); upd(); }));
    all.addEventListener("click", () => { const on = all.getAttribute("aria-pressed") !== "true"; cards.forEach((c) => c.setAttribute("aria-pressed", String(on))); upd(); });
  }

  window.VIZ[1] = [
    {
      name: "근거 열지도",
      kind: "열지도 · 표",
      idea: "알츠하이머 표적 8개를 유전 · 약물 · 문헌 · 발현 근거 4칸과 종합 점수, 결정구조, 도킹 준비 여부로 한 표에 칠한다.",
      learn: "종합 점수는 근거 4종을 합친 값이고, 근거가 강해도 결정구조와 도킹 준비가 없으면 다음 단계로 못 간다.",
      render: v1
    },
    {
      name: "순위 뒤집기",
      kind: "순위 이동 · 정렬 전환",
      idea: "같은 표적 8개를 '종합 점수 순'과 '도킹할 수 있는 순'으로 바꿔 줄 세우면 줄이 움직인다.",
      learn: "점수 8위 ACHE 가 '다음 단계 기준'으로는 1위가 된다. 무엇을 기준으로 고르느냐가 답을 바꾼다.",
      render: () => `<div class="vz-row" role="group" aria-label="줄 세우는 기준">
          <button type="button" class="vz-btn" id="s1-v2-score" data-mode="score" aria-pressed="true">종합 점수 순</button>
          <button type="button" class="vz-btn" id="s1-v2-tier" data-mode="tier" aria-pressed="false">다음 단계(도킹) 가능 순</button></div>${v2svg("score")}`,
      mount: v2mount
    },
    {
      name: "내 점수 만들기",
      kind: "누적 막대 · 가중치 실험",
      idea: "근거 4종에 가중치를 직접 주어 '내 점수'를 만들면 막대가 근거별로 쌓이고 순위가 다시 정해진다.",
      learn: "가중치에 따라 순위는 얼마든지 바뀌지만, 도킹 준비된 표적은 여전히 ACHE 하나다. 점수는 판단, 구조는 사실.",
      render: () => `<div class="s1-ctl">${EV.map((e, k) => `<label for="s1-v3-w${k}"><span><i class="s1-sw" style="background:${e.c}"></i>${e.t} 가중치 <output data-out="${k}">× ${W3[k]}</output></span>
          <input class="vz-rng" type="range" id="s1-v3-w${k}" min="0" max="3" step="0.5" value="${W3[k]}"></label>`).join("")}</div>
        <div class="vz-row"><span class="vz-lab">빠른 설정</span><button type="button" class="vz-btn" id="s1-v3-p0" data-pre="1,1,1,1">똑같이</button>
          <button type="button" class="vz-btn" id="s1-v3-p1" data-pre="3,0,0,0">유전만</button><button type="button" class="vz-btn" id="s1-v3-p2" data-pre="0,3,3,0">약물 · 문헌만</button></div>
        <div data-plot>${v3svg(W3)}</div>`,
      mount: v3mount
    },
    {
      name: "질환-유전자 망",
      kind: "관계망 · 거리 눈금",
      idea: "알츠하이머를 가운데 두고 표적 8개를 점수만큼 가깝게 놓고, 바깥에 나머지 연관 표적 13,006개를 흐린 점으로 깐다.",
      learn: "한 질환에는 1만 개가 넘는 연관 유전자가 있고, 가장 가까운(점수 높은) 표적이 아니라 가장 먼 ACHE 가 도킹할 수 있는 표적이다.",
      render: v4,
      mount: v4mount
    },
    {
      name: "자물쇠와 열쇠",
      kind: "실물 은유 · 자물쇠",
      idea: "표적을 자물쇠로 그려, 결정구조가 있으면 열쇠 구멍을, 기준 약까지 있으면 꽂힌 열쇠를 보여 준다.",
      learn: "구멍 모양(결정구조)과 맞는 열쇠(기준 약)가 있어야 새 열쇠(후보 분자)를 시험할 수 있다.",
      render: v5
    },
    {
      name: "관문 4개",
      kind: "체크리스트 · 단계 재생",
      idea: "질환 연관 → 약 주머니 → 결정구조 → 도킹 준비 관문을 하나씩 열며 8개 표적이 어디서 멈추는지 칸에 찍는다.",
      learn: "8 → 8 → 7 → 5 → 1. 관문을 차례로 통과해야 하고, 남는 것은 점수 꼴찌 ACHE 다.",
      render: () => `<div class="vz-row" role="group" aria-label="관문 단계">
          ${[1, 2, 3, 4].map((s) => `<button type="button" class="vz-btn" id="s1-v6-g${s}" data-st="${s}" aria-pressed="${s === 4}">관문 ${s}까지</button>`).join("")}
          <button type="button" class="vz-btn" id="s1-v6-play" aria-pressed="false">▶ 차례로 보기</button></div>
        <div data-plot>${v6svg(4)}</div>`,
      mount: v6mount
    },
    {
      name: "질환에서 구조까지",
      kind: "인과 사슬",
      idea: "질환 → 표적 → 기준 약(구조식) → 결정구조 → 다음 단계를 다섯 고리로 잇고, 점수 1위 APP 의 끊긴 사슬과 나란히 둔다.",
      learn: "표적은 질환에서 결정구조 4EY7 까지 사슬이 끊기지 않고 이어져야 고를 수 있다.",
      render: v7
    },
    {
      name: "4대 질환 비교",
      kind: "작은 배수 · 점 띠",
      idea: "질환 4개마다 표적 8개를 같은 점수 눈금 위에 찍고, 도킹 준비된 표적이 몇 위인지 오른쪽에 적는다.",
      learn: "어느 질환이든 도킹할 수 있는 표적은 하나이고, 그 표적이 점수 1위인 경우는 폐암뿐이다.",
      render: v8
    },
    {
      name: "점수 × 약물 근거",
      kind: "산점도 · 축 끊김",
      idea: "4대 질환 표적 32개를 종합 점수(가로)와 약물 근거(세로)로 찍고, 도킹 준비된 4개를 마름모로 표시한다.",
      learn: "도킹 준비된 표적은 모두 '이미 약이 있는' 표적(약물 근거 0.99+)이다. 기준 약이 있어야 비교할 수 있기 때문이다.",
      render: v9,
      mount: v9mount
    },
    {
      name: "카드 뒤집기",
      kind: "카드 · 맞히기 놀이",
      idea: "앞면엔 점수와 근거만, 뒷면엔 결정구조 · 기준 약 · 도킹 가능 여부를 둔 카드 8장을 학생이 직접 뒤집는다.",
      learn: "점수가 높은 카드부터 뒤집어도 계속 '도킹 불가'가 나오다 마지막 ACHE 에서야 '가능'이 나온다.",
      render: v10,
      mount: v10mount
    }
  ];
})();
