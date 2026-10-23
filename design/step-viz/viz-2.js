/* 1.2 화합물 스크리닝 — 학생이 직접 기준을 고르는 시안 10종
   모든 시안이 같은 엔진(run)을 쓴다: 학생이 고른 기준 → 남은 분자 · 알츠하이머 약 계열 몇 개가 살았나 · 농축도.
   '정답 분자'는 이 표적 계열로 알려진 12개(시판 알츠하이머 약 6 + 사내 유도체 6, 데이터의 t = ache-4ey7). */
(function () {
  "use strict";
  const CV = window.CV, { EX, esc, f1, f2 } = CV;

  CV.css("s2", `
    .s2-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 18px; align-items: start; }
    .s2-two > * { min-width: 0; }
    @media (max-width: 980px) { .s2-two { grid-template-columns: minmax(0, 1fr); } }
    .s2-q { margin: 0; padding: 10px 12px; background: var(--ink); color: var(--paper); font-size: 13.5px; font-weight: 600; line-height: 1.45; }
    .s2-q b { color: var(--hi); font-weight: 700; }
    .s2-presets { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .s2-presets .vz-lab { margin-right: 4px; }
    .s2-ctl { display: grid; gap: 0; border: 1px solid var(--line-strong); background: var(--paper); }
    .s2-g { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 2px 8px; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--line); }
    .s2-g:last-child { border-bottom: 0; }
    .s2-g.off { background: var(--surface); }
    .s2-g.off .s2-gl, .s2-g.off output, .s2-g.off svg { opacity: 0.45; }
    .s2-g input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--ink); margin: 0; }
    .s2-gl { font-weight: 600; font-size: 12.5px; line-height: 1.3; }
    .s2-gl small { display: block; font-weight: 400; color: var(--muted); font-size: 11.5px; }
    .s2-g output { font-family: var(--mono); font-size: 12.5px; font-weight: 600; white-space: nowrap; }
    .s2-g .wide { grid-column: 2 / -1; display: grid; gap: 2px; }
    .s2-g .vz-rng:disabled { opacity: 0.4; }
    .s2-g .wide.s2-seg { display: flex; flex-wrap: wrap; gap: 0; }
    .s2-seg { display: flex; flex-wrap: wrap; }
    .s2-seg .vz-btn { padding: 4px 9px; font-size: 12px; }
    .s2-seg .vz-btn + .vz-btn { margin-left: -1px; }
    .s2-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 0; border: 1px solid var(--line-strong); background: var(--paper); }
    .s2-tile { padding: 10px 12px; display: grid; gap: 2px; align-content: start; box-shadow: inset -1px 0 0 var(--line); }
    .s2-tile .vz-lab { font-size: 10px; }
    .s2-tile b { font-family: var(--mono); font-size: 24px; font-weight: 600; line-height: 1.1; letter-spacing: -0.02em; }
    .s2-tile b small { font-size: 13px; color: var(--muted); font-weight: 500; }
    .s2-tile span.s { font-size: 11.5px; color: var(--muted); line-height: 1.35; }
    .s2-tile.good b { color: var(--good); } .s2-tile.bad b { color: var(--bad); }
    .s2-dots { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 3px; }
    .s2-dots i { width: 11px; height: 11px; border: 1.5px solid var(--ink); background: transparent; }
    .s2-dots i.on { background: var(--hi); }
    .s2-top { display: flex; flex-wrap: wrap; gap: 5px; }
    .s2-top .vz-chip { font-family: var(--sans); font-size: 12px; background: var(--paper); }
    .s2-top .vz-chip.a { background: var(--hi); border-color: var(--ink); font-weight: 600; }
    .s2-tabs { display: flex; flex-wrap: wrap; gap: 0; }
    .s2-tabs .vz-btn { margin-right: -1px; margin-bottom: -1px; }
    .s2-tip { border-left: 3px solid var(--ink); padding: 6px 10px; background: var(--paper); font-size: 12.5px; line-height: 1.5; }
    .s2-tip b { font-weight: 700; }
    .s2-out { font-size: 13px; line-height: 1.55; }
    .s2-out b { font-family: var(--mono); }
    .s2-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
    .s2-card { border: 1px solid var(--line-strong); background: var(--paper); display: grid; align-content: start; min-width: 0; }
    .s2-card .h { padding: 8px 10px; display: grid; gap: 1px; border-bottom: 1px solid var(--line); }
    .s2-card .h b { font-size: 13px; line-height: 1.3; }
    .s2-card .h span { font-family: var(--mono); font-size: 10.5px; color: var(--muted); }
    .s2-card .m { height: 104px; border-bottom: 1px solid var(--line); }
    .s2-card .m .molbox { height: 100%; border: 0; }
    .s2-card .ind { padding: 8px 10px; display: grid; gap: 5px; }
    .s2-ir { display: grid; grid-template-columns: 52px minmax(0, 1fr) 46px; gap: 6px; align-items: center; font-size: 11.5px; }
    .s2-ir span:first-child { font-family: var(--mono); color: var(--muted); }
    .s2-ir span:last-child { font-family: var(--mono); text-align: right; font-weight: 600; }
    .s2-ir .tr { position: relative; height: 10px; background: var(--raise); }
    .s2-ir .tr u { position: absolute; top: 0; bottom: 0; background: var(--good-bg); box-shadow: inset 0 0 0 1px rgba(47, 111, 42, 0.35); }
    .s2-ir .tr i { position: absolute; top: -2px; bottom: -2px; width: 3px; margin-left: -1.5px; background: var(--ink); }
    .s2-ir .tr i.out { background: var(--bad); }
    .s2-card .al { font-size: 11.5px; color: var(--bad); font-weight: 600; }
    .s2-card .dec { display: flex; border-top: 1px solid var(--line); }
    .s2-card .dec .vz-btn { flex: 1; border: 0; border-right: 1px solid var(--line); padding: 8px; }
    .s2-card .dec .vz-btn:last-child { border-right: 0; }
    .s2-card .dec .vz-btn.y[aria-pressed="true"] { background: var(--good); border-color: var(--good); color: var(--paper); }
    .s2-card .dec .vz-btn.n[aria-pressed="true"] { background: var(--bad); border-color: var(--bad); color: var(--paper); }
    .s2-card .rev { padding: 8px 10px; border-top: 1px dashed var(--line-strong); font-size: 12px; line-height: 1.45; display: grid; gap: 3px; }
    .s2-card .rev .same { color: var(--good); font-weight: 700; } .s2-card .rev .diff { color: var(--warn); font-weight: 700; }
    .s2-tw { overflow: auto; max-height: 430px; border: 1px solid var(--line-strong); background: var(--paper); }
    .s2-t { border-collapse: collapse; width: 100%; min-width: 760px; font-size: 12.5px; }
    .s2-t th, .s2-t td { padding: 5px 8px; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
    .s2-t thead th { position: sticky; top: 0; z-index: 1; background: var(--raise); font-size: 11.5px; }
    .s2-t thead th button { appearance: none; border: 0; background: transparent; padding: 0; font: inherit; font-weight: 700; cursor: pointer; }
    .s2-t thead th button[aria-sort="descending"]::after { content: " ▼"; } .s2-t thead th button[aria-sort="ascending"]::after { content: " ▲"; }
    .s2-t td.n { font-family: var(--mono); text-align: right; } .s2-t th.n { text-align: right; }
    .s2-t td.x { color: var(--bad); font-weight: 600; }
    .s2-t tr.on td { background: var(--hi); }
    .s2-t tr.dim td { color: var(--muted); }
    .s2-t td .nm { font-weight: 600; white-space: normal; min-width: 150px; display: inline-block; }
    .s2-t input { width: 15px; height: 15px; accent-color: var(--ink); }
    .s2-bar3 { display: flex; height: 30px; border: 1px solid var(--ink); font-family: var(--mono); font-size: 12px; font-weight: 600; }
    .s2-bar3 > div { display: grid; place-items: center; min-width: 0; overflow: hidden; white-space: nowrap; }
    .s2-mis { display: grid; gap: 8px; }
    .s2-m { border: 1px solid var(--line-strong); background: var(--paper); padding: 8px 10px; display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 2px 8px; }
    .s2-m.done { border-color: var(--good); box-shadow: inset 4px 0 0 var(--good); }
    .s2-m .ck { grid-row: span 2; font-family: var(--mono); font-size: 18px; font-weight: 700; line-height: 1; padding-top: 2px; }
    .s2-m.done .ck { color: var(--good); }
    .s2-m b { font-size: 13px; }
    .s2-m ul { margin: 2px 0 0; padding: 0; list-style: none; display: grid; gap: 1px; font-size: 12px; }
    .s2-m li.ok { color: var(--good); } .s2-m li.no { color: var(--muted); }
    .s2-info { border: 1px solid var(--line-strong); background: var(--paper); padding: 10px 12px; font-size: 12.5px; line-height: 1.5; display: grid; gap: 6px; min-height: 72px; }
    .s2-pred { display: grid; gap: 8px; border: 1px solid var(--line-strong); background: var(--paper); padding: 12px; }
    .s2-pred .big { font-family: var(--mono); font-size: 22px; font-weight: 600; }
  `);

  /* ── 재료 ── */
  const DC = CV.D.compounds, tid = EX.tid, gene = EX.t.gene;
  const LIBS = Object.keys(CV.D.meta.counts || {});
  const LSHORT = { "ChEMBL 승인약": "ChEMBL 승인약", "ZINC 소형": "ZINC 소형", "사내 합성 후보": "사내 합성" };
  const ACT = new Set(DC.filter((c) => c.t === tid).map((c) => c.id));
  const NA = ACT.size, BASE = NA / DC.length;
  const isA = (c) => ACT.has(c.id);
  const sc = (c) => c.sc[tid] || 0;
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const tx = (x, y, s, o = {}) => `<text x="${x}" y="${y}"${o.a ? ` text-anchor="${o.a}"` : ""}${o.cls ? ` class="${o.cls}"` : ""} style="font-size:${o.fs || 12}px${o.w ? `;font-weight:${o.w}` : ""}${o.fill ? `;fill:${o.fill}` : ""}">${s}</text>`;
  const star = (x, y, r = 6) => { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; d += `${i ? "L" : "M"}${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`; } return `<path d="${d}Z" fill="var(--hi)" stroke="var(--ink)" stroke-width="1.2"/>`; };

  /* 지표: 무엇인지 · 왜 거르는지(학생 말로) · 기준의 방향 */
  const PROPS = [
    { k: "mw", l: "분자량", ab: "MW", u: "Da", d: [0, 700], st: 10, dir: "max", def: 500, fmt: (v) => String(Math.round(v)),
      what: "분자의 무게.", why: "너무 무거우면 장에서 몸속으로 잘 흡수되지 않는다. 먹는 약은 보통 500 이하.", ref: [150, 500] },
    { k: "tpsa", l: "극성 넓이", ab: "TPSA", u: "Å²", d: [0, 220], st: 5, dir: "max", def: 140, fmt: (v) => String(Math.round(v)),
      what: "분자 겉면 중 물과 친한(극성) 부분의 넓이.", why: "넓을수록 세포막과 뇌 관문(BBB)을 못 지난다. 흡수는 140 이하, 뇌 약은 90 이하가 보통.", ref: [20, 130] },
    { k: "logp", l: "기름 친화도", ab: "cLogP", u: "", d: [-2, 7], st: 0.1, dir: "max", def: 5, fmt: (v) => f1(v),
      what: "물보다 기름에 얼마나 잘 녹는지(로그 값).", why: "너무 높으면 물(피)에 안 녹고 심장 독성(hERG) 위험이 커진다. 5 이하가 보통.", ref: [-0.7, 5] },
    { k: "hbd", l: "수소결합 주개", ab: "HBD", u: "개", d: [0, 8], st: 1, dir: "max", def: 5, fmt: (v) => String(v),
      what: "물과 수소결합을 '주는' 자리(–OH, –NH) 수.", why: "많으면 막을 통과하기 어렵다. 5 이하, 뇌 약은 3 이하가 보통.", ref: [0, 5] },
    { k: "hba", l: "수소결합 받개", ab: "HBA", u: "개", d: [0, 12], st: 1, dir: "max", def: 10, fmt: (v) => String(v),
      what: "수소결합을 '받는' 자리(N, O) 수.", why: "많으면 흡수가 떨어진다. 10 이하가 보통.", ref: [0, 10] },
    { k: "rotb", l: "회전 결합", ab: "RotB", u: "개", d: [0, 13], st: 1, dir: "max", def: 10, fmt: (v) => String(v),
      what: "분자가 휘고 도는 결합 수(유연함).", why: "너무 흐물흐물하면 흡수가 떨어지고 주머니에 딱 맞기 어렵다. 10 이하가 보통.", ref: [0, 9] },
    { k: "qed", l: "약다움 점수", ab: "QED", u: "", d: [0, 1], st: 0.05, dir: "min", def: 0.3, fmt: (v) => f2(v),
      what: "시판 약들과 얼마나 닮았는지 0~1 점수(여러 물성을 합친 것).", why: "낮을수록 '약 같지 않은' 분자. 높을수록 좋다.", ref: [0.5, 1] }
  ];
  const PK = Object.fromEntries(PROPS.map((p) => [p.k, p]));
  const ORDER = ["lib", "mw", "tpsa", "logp", "hbd", "hba", "rotb", "ro5", "alerts", "qed"];
  const SORTS = {
    sc: { l: `${gene} 표적 점수 높은 순`, f: (a, b) => sc(b) - sc(a) },
    qed: { l: "약다움 QED 높은 순", f: (a, b) => b.qed - a.qed },
    light: { l: "가벼운(분자량 작은) 순", f: (a, b) => a.mw - b.mw },
    none: { l: "목록 순서 그대로(줄 세우지 않음)", f: () => 0 }
  };

  /* 기준 묶음(Cr): 켠 지표 · 문턱 · Ro5 · 구조 경고 · 라이브러리 · 줄 세우기 · 상위 N */
  const mk = (o = {}) => Object.assign({ libs: LIBS.slice(), on: {}, th: Object.fromEntries(PROPS.map((p) => [p.k, p.def])), ro5: null, alerts: false, sort: "sc", topN: 10 }, o);
  const clone = (C) => ({ ...C, libs: C.libs.slice(), on: { ...C.on }, th: { ...C.th } });
  const PRESETS = {
    game: { l: "게임 기본값", c: () => mk({ on: { mw: 1, tpsa: 1, qed: 1 }, ro5: 1, alerts: true }) },
    lip: { l: "Lipinski 5의 규칙", c: () => mk({ on: { mw: 1, logp: 1, hbd: 1, hba: 1 }, th: { ...mk().th } }) },
    cns: { l: "뇌로 가는 약", c: () => { const c = mk({ on: { mw: 1, tpsa: 1, hbd: 1, qed: 1 }, alerts: true }); c.th.mw = 450; c.th.tpsa = 90; c.th.hbd = 3; return c; } },
    none: { l: "기준 없음", c: () => mk() }
  };

  const gateFn = (k, C) => {
    if (k === "lib") return C.libs.length === LIBS.length ? null : (c) => C.libs.includes(c.lib);
    if (k === "ro5") return C.ro5 == null ? null : (c) => c.ro5 <= C.ro5;
    if (k === "alerts") return C.alerts ? (c) => !c.al.length : null;
    const p = PK[k];
    if (!C.on[k]) return null;
    const t = C.th[k];
    return p.dir === "max" ? (c) => c[k] <= t + 1e-9 : (c) => c[k] >= t - 1e-9;
  };
  const gateLabel = (k, C) => {
    if (k === "lib") return `라이브러리 ${C.libs.length}종`;
    if (k === "ro5") return C.ro5 == null ? "Ro5 안 씀" : `Ro5 위반 ≤ ${C.ro5}`;
    if (k === "alerts") return C.alerts ? "구조 경고 빼기" : "구조 경고 허용";
    const p = PK[k];
    return `${p.ab} ${p.dir === "max" ? "≤" : "≥"} ${p.fmt(C.th[k])}`;
  };
  /* 분자 하나가 걸리는 모든 기준(순서대로) */
  const fails = (c, C) => ORDER.filter((k) => { const g = gateFn(k, C); return g && !g(c); });
  function run(C) {
    let alive = DC;
    const steps = [{ k: "all", label: "전체 라이브러리", n: DC.length, a: NA }], drop = new Map();
    for (const k of ORDER) {
      const g = gateFn(k, C); if (!g) continue;
      const nx = [];
      for (const c of alive) (g(c) ? nx.push(c) : drop.set(c.id, k));
      alive = nx;
      steps.push({ k, label: gateLabel(k, C), n: alive.length, a: alive.filter(isA).length });
    }
    const ranked = C.sort === "none" ? alive.slice() : alive.slice().sort(SORTS[C.sort].f);
    const top = ranked.slice(0, C.topN), a = alive.filter(isA).length, ta = top.filter(isA).length;
    return { alive, drop, steps, top, a, ta, ef: alive.length ? a / alive.length / BASE : 0, tef: top.length ? ta / top.length / BASE : 0 };
  }
  const efTxt = (v) => `×${v.toFixed(1)}`;

  /* ── 공용 화면 조각 ── */
  /* 지표 하나의 분포(작은 막대) + 문턱선 + 정답 분자 눈금 */
  function hist(k, C, W = 230, H = 40, big = false) {
    const p = PK[k], [lo, hi] = p.d, nb = big ? 28 : 20, bw = (hi - lo) / nb, on = big || C.on[k], t = C.th[k];
    const bins = Array.from({ length: nb }, () => [0, 0]);
    for (const c of DC) { const i = CV.clamp(Math.floor((CV.clamp(c[k], lo, hi - 1e-9) - lo) / bw), 0, nb - 1); bins[i][isA(c) ? 1 : 0]++; }
    const mx = Math.max(...bins.map((b) => b[0] + b[1])), top = big ? 18 : 2, bot = big ? H - 46 : H - 9, sx = CV.scale([lo, hi], [big ? 44 : 0, big ? W - 10 : W]), sy = (n) => ((bot - top) * n) / mx;
    const keep = (v) => (p.dir === "max" ? v <= t : v >= t);
    let s = "";
    bins.forEach(([o, a], i) => {
      const x0 = sx(lo + i * bw) + 0.6, x1 = sx(lo + (i + 1) * bw) - 0.6, mid = lo + (i + 0.5) * bw, k2 = !on || keep(mid);
      const ho = sy(o), ha = sy(a);
      s += `<rect x="${x0.toFixed(1)}" y="${(bot - ho).toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${ho.toFixed(1)}" fill="${k2 ? "var(--ink)" : "var(--line-strong)"}" fill-opacity="${k2 ? 0.78 : 0.5}"/>`;
      if (a) s += `<rect x="${x0.toFixed(1)}" y="${(bot - ho - ha).toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${ha.toFixed(1)}" fill="var(--hi)" stroke="var(--ink)" stroke-width="${big ? 1.2 : 0.8}"/>`;
    });
    s += `<line x1="${sx(lo)}" x2="${sx(hi)}" y1="${bot}" y2="${bot}" stroke="var(--ink)" stroke-width="1"/>`;
    for (const c of DC) if (isA(c)) s += `<line x1="${sx(CV.clamp(c[k], lo, hi)).toFixed(1)}" x2="${sx(CV.clamp(c[k], lo, hi)).toFixed(1)}" y1="${bot + 2}" y2="${bot + (big ? 9 : 7)}" stroke="var(--ink)" stroke-width="${big ? 2 : 1.5}"/>`;
    if (on) {
      const x = sx(CV.clamp(t, lo, hi));
      const shadeX = p.dir === "max" ? x : sx(lo), shadeW = p.dir === "max" ? sx(hi) - x : x - sx(lo);
      s += `<rect x="${shadeX.toFixed(1)}" y="${top - 2}" width="${Math.max(0, shadeW).toFixed(1)}" height="${bot - top + 2}" fill="var(--bad-bg)"/>`;
      s += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${top - 4}" y2="${bot + 2}" stroke="var(--bad)" stroke-width="${big ? 2 : 1.6}" stroke-dasharray="4 3"/>`;
      if (big) s += tx(x + (p.dir === "max" ? -6 : 6), top + 8, `${p.dir === "max" ? "← 남김 · 버림 →" : "← 버림 · 남김 →"}`, { a: p.dir === "max" ? "end" : "start", fs: 11.5, w: 700, fill: "var(--bad)" });
    }
    if (big) {
      for (const v of CV.ticks(lo, hi, 6)) s += tx(sx(v), bot + 22, p.fmt(v), { a: "middle", cls: "t-m t-mu", fs: 11 });
      s += tx(sx(lo) - 6, top + 4, `${mx}`, { a: "end", cls: "t-m t-mu", fs: 10.5 }) + tx(sx(lo) - 6, bot, "0", { a: "end", cls: "t-m t-mu", fs: 10.5 });
      s += tx((sx(lo) + sx(hi)) / 2, H - 6, `${p.ab} ${p.u ? "(" + p.u + ")" : ""} — ${p.what}`, { a: "middle", cls: "t-mu", fs: 11.5 });
      s += tx(sx(lo), 11, "분자 수", { cls: "t-mu", fs: 10.5 });
    }
    return CV.svg(W, H, s, `${p.ab} 분포`);
  }

  /* 점수판: 남은 수 · 정답 몇 개 · 농축도 · 상위 N 안의 정답 */
  function tiles(r, C) {
    const dots = Array.from({ length: NA }, (_, i) => `<i class="${i < r.a ? "on" : ""}"></i>`).join("");
    const lost = NA - r.a;
    return `<div class="s2-tiles" role="status" aria-live="polite">
      <div class="s2-tile"><span class="vz-lab">남은 분자</span><b>${r.alive.length}<small> / ${DC.length}</small></b><span class="s">${pct(DC.length - r.alive.length, DC.length)}% 걸러냄</span></div>
      <div class="s2-tile ${lost ? (lost >= 4 ? "bad" : "") : "good"}"><span class="vz-lab">알츠하이머 약 계열</span><b>${r.a}<small> / ${NA} 남음</small></b><div class="s2-dots" aria-hidden="true">${dots}</div></div>
      <div class="s2-tile ${r.ef >= 3 ? "good" : ""}"><span class="vz-lab">농축도</span><b>${efTxt(r.ef)}</b><span class="s">약 계열 비율이 처음보다 몇 배 진해졌나</span></div>
      <div class="s2-tile"><span class="vz-lab">도킹 후보 상위 ${C.topN}</span><b>${r.ta}<small> / ${r.top.length} 약 계열</small></b><span class="s">${esc(SORTS[C.sort].l)}</span></div>
    </div>`;
  }
  /* 내가 고른 기준 순서대로 줄어드는 막대 */
  function funnel(r, W = 640) {
    const st = r.steps, rh = 30, lw = 150, bw = W - lw - 150, H = st.length * rh + 6;
    let s = "";
    st.forEach((x, i) => {
      const y = i * rh + 3, w = Math.max(2, (x.n / DC.length) * bw), d = i ? st[i - 1].n - x.n : 0, da = i ? st[i - 1].a - x.a : 0;
      s += tx(lw - 8, y + 17, esc(x.label), { a: "end", cls: i ? "t-m" : "", fs: 11.5, w: 600 });
      s += `<rect x="${lw}" y="${y + 4}" width="${w.toFixed(1)}" height="18" fill="var(--ink)" fill-opacity="${i === st.length - 1 ? 1 : 0.72}"/>`;
      const aw = Math.max(0, (x.a / DC.length) * bw);
      if (x.a) s += `<rect x="${lw}" y="${y + 4}" width="${Math.max(3, aw).toFixed(1)}" height="18" fill="var(--hi)" stroke="var(--ink)" stroke-width="1"/>`;
      s += tx(lw + w + 6, y + 17, `${x.n}`, { cls: "t-m", fs: 12, w: 700 });
      if (i) s += tx(W - 4, y + 17, `${d ? "−" + d : "−0"}${da ? ` (약 계열 −${da})` : ""}`, { a: "end", cls: "t-m", fs: 11.5, w: da ? 700 : 400, fill: da ? "var(--bad)" : "var(--muted)" });
    });
    return CV.svg(W, H, s, "내가 고른 기준으로 줄어드는 분자 수");
  }
  const topChips = (r) => r.top.length ? `<div class="s2-top">${r.top.map((c, i) => `<span class="vz-chip${isA(c) ? " a" : ""}">${i + 1}. ${esc(c.n.split(" (")[0])}</span>`).join("")}</div>` : `<p class="vz-note">남은 분자가 없습니다. 기준을 조금 풀어 보세요.</p>`;
  const legendA = `<p class="vz-note"><span class="vz-chip" style="background:var(--hi);border-color:var(--ink)">노란 칸</span> = 알츠하이머 약 계열(시판 약 6 + 사내 유도체 6). 실제 연구에서도 이미 아는 약으로 거르기 기준이 쓸 만한지 확인한다.</p>`;

  /* 기준 고르는 판(여러 시안이 같이 씀). id 로 컨트롤 id 를 나눈다. */
  function ctl(id, C, o = {}) {
    const keys = o.keys || PROPS.map((p) => p.k);
    const rows = keys.map((k) => {
      const p = PK[k], on = !!C.on[k];
      return `<div class="s2-g ${on ? "" : "off"}" data-row="${k}">
        <input type="checkbox" id="s2-${id}-on-${k}" data-c="on:${k}" ${on ? "checked" : ""} aria-label="${p.l} 기준 쓰기">
        <label class="s2-gl" for="s2-${id}-th-${k}">${p.l} <span class="t-m">${p.ab}</span> ${p.dir === "max" ? "최대" : "최소"}${o.hist ? `<small>${esc(p.why)}</small>` : ""}</label>
        <output data-o="${k}">${on ? (p.dir === "max" ? "≤ " : "≥ ") + p.fmt(C.th[k]) : "안 씀"}</output>
        <div class="wide"><input class="vz-rng" type="range" id="s2-${id}-th-${k}" data-c="th:${k}" min="${p.d[0]}" max="${p.d[1]}" step="${p.st}" value="${C.th[k]}" ${on ? "" : "disabled"}>${o.hist ? `<div data-h="${k}">${hist(k, C)}</div>` : ""}</div>
      </div>`;
    }).join("");
    const extra = o.basic ? "" : `
      <div class="s2-g ${C.ro5 == null ? "off" : ""}" data-row="ro5"><span></span><span class="s2-gl">Lipinski 위반 허용<small>${o.hist ? "MW &gt; 500 · cLogP &gt; 5 · HBD &gt; 5 · HBA &gt; 10 중 몇 개까지 봐줄까" : ""}</small></span><span></span>
        <div class="wide s2-seg" role="group" aria-label="Lipinski 위반 허용">${[null, 0, 1, 2].map((v) => `<button type="button" class="vz-btn" id="s2-${id}-ro5-${v == null ? "x" : v}" data-c="ro5:${v == null ? "x" : v}" aria-pressed="${C.ro5 === v}">${v == null ? "안 씀" : v + "개까지"}</button>`).join("")}</div></div>
      <div class="s2-g ${C.alerts ? "" : "off"}" data-row="alerts"><input type="checkbox" id="s2-${id}-al" data-c="alerts" ${C.alerts ? "checked" : ""}><label class="s2-gl" for="s2-${id}-al">구조 경고 조각 빼기<small>${o.hist ? "방향족 아민 · 니트로처럼 몸속에서 독성 물질로 바뀌기 쉬운 조각(32개 분자)" : ""}</small></label><span></span></div>`;
    const libs = o.basic ? "" : `<div class="s2-g" data-row="lib"><span></span><span class="s2-gl">라이브러리</span><span></span><div class="wide s2-seg">${LIBS.map((l, i) => `<label class="vz-btn" style="display:inline-flex;gap:5px;align-items:center" for="s2-${id}-lib${i}"><input type="checkbox" id="s2-${id}-lib${i}" data-c="lib:${esc(l)}" ${C.libs.includes(l) ? "checked" : ""}>${esc(LSHORT[l])} ${CV.D.meta.counts[l]}</label>`).join("")}</div></div>`;
    const rank = o.rank === false ? "" : `<div class="s2-g" data-row="rank"><span></span><label class="s2-gl" for="s2-${id}-sort">도킹 후보를 줄 세우는 기준</label><span></span>
        <div class="wide" style="display:flex;flex-wrap:wrap;gap:6px"><select id="s2-${id}-sort" data-c="sort" class="vz-btn" style="font-weight:500">${Object.entries(SORTS).map(([k, s]) => `<option value="${k}" ${C.sort === k ? "selected" : ""}>${esc(s.l)}</option>`).join("")}</select>
        <span class="s2-seg" role="group" aria-label="상위 몇 개">${[5, 10, 20].map((v) => `<button type="button" class="vz-btn" id="s2-${id}-top-${v}" data-c="top:${v}" aria-pressed="${C.topN === v}">상위 ${v}</button>`).join("")}</span></div></div>`;
    return `<div class="s2-ctl" data-ctl="${id}">${libs}${rows}${extra}${rank}</div>`;
  }
  /* 판의 입력 → C 를 바꾸고 화면 표시를 맞춘 뒤 onChange */
  function bindCtl(root, id, C, onChange) {
    const box = root.querySelector(`[data-ctl="${id}"]`);
    if (!box) return () => {};
    const sync = () => {
      for (const p of PROPS) {
        const row = box.querySelector(`[data-row="${p.k}"]`); if (!row) continue;
        const on = !!C.on[p.k];
        row.classList.toggle("off", !on);
        row.querySelector(`[data-c="on:${p.k}"]`).checked = on;
        const rg = row.querySelector(`[data-c="th:${p.k}"]`); rg.disabled = !on; rg.value = C.th[p.k];
        row.querySelector(`[data-o="${p.k}"]`).textContent = on ? (p.dir === "max" ? "≤ " : "≥ ") + p.fmt(C.th[p.k]) : "안 씀";
        const h = row.querySelector(`[data-h="${p.k}"]`); if (h) h.innerHTML = hist(p.k, C);
      }
      box.querySelectorAll('[data-c^="ro5:"]').forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.c === "ro5:x" ? null : +b.dataset.c.slice(4)) === C.ro5)));
      const r5 = box.querySelector('[data-row="ro5"]'); if (r5) r5.classList.toggle("off", C.ro5 == null);
      const al = box.querySelector('[data-c="alerts"]'); if (al) { al.checked = C.alerts; box.querySelector('[data-row="alerts"]').classList.toggle("off", !C.alerts); }
      box.querySelectorAll('[data-c^="lib:"]').forEach((b) => (b.checked = C.libs.includes(b.dataset.c.slice(4))));
      box.querySelectorAll('[data-c^="top:"]').forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.c.slice(4) === C.topN)));
      const so = box.querySelector('[data-c="sort"]'); if (so) so.value = C.sort;
    };
    const act = (e) => {
      const t = e.target.closest("[data-c]"); if (!t || !box.contains(t)) return;
      const [a, b] = t.dataset.c.split(/:(.*)/s);
      if (a === "on") C.on[b] = t.checked;
      else if (a === "th") { C.th[b] = +t.value; if (!C.on[b]) C.on[b] = true; }
      else if (a === "ro5") { if (e.type !== "click") return; C.ro5 = b === "x" ? null : +b; }
      else if (a === "alerts") C.alerts = t.checked;
      else if (a === "lib") C.libs = LIBS.filter((l) => box.querySelector(`[data-c="lib:${CSS.escape(l)}"]`).checked);
      else if (a === "sort") C.sort = t.value;
      else if (a === "top") { if (e.type !== "click") return; C.topN = +b; }
      sync(); onChange();
    };
    box.addEventListener("input", act); box.addEventListener("change", act); box.addEventListener("click", (e) => { const t = e.target.closest('[data-c^="ro5:"], [data-c^="top:"]'); if (t) act(e); });
    return sync;
  }
  const presetBar = (id) => `<div class="s2-presets"><span class="vz-lab">빠른 시작</span>${Object.entries(PRESETS).map(([k, p]) => `<button type="button" class="vz-btn" id="s2-${id}-pre-${k}" data-pre="${k}">${esc(p.l)}</button>`).join("")}</div>`;

  /* ─────────── 01 기준 설계실 ─────────── */
  function v1() {
    const C = PRESETS.game.c(), r = run(C);
    return `<p class="s2-q">220개 중 3단계 도킹에 보낼 후보를 고른다. <b>어떤 기준을 켜고, 문턱을 어디에 둘지</b> 직접 정해 보자. 약 계열 12개를 지키면서 나머지를 많이 걸러낼수록 좋은 기준이다.</p>
      ${presetBar("v1")}
      <div class="s2-two"><div>${ctl("v1", C, { hist: true })}</div>
      <div style="display:grid;gap:12px" data-res>${v1res(r, C)}</div></div>`;
  }
  const v1res = (r, C) => `${tiles(r, C)}<div><span class="vz-lab">내 기준을 차례로 지나며 남은 분자(노란 막대 = 약 계열)</span>${funnel(r)}</div>
    <div><span class="vz-lab">3단계로 보낼 상위 ${C.topN} · ${esc(SORTS[C.sort].l)}</span>${topChips(r)}</div>${legendA}`;
  function v1mount(el) {
    const C = PRESETS.game.c();
    const draw = () => { el.querySelector("[data-res]").innerHTML = v1res(run(C), C); };
    const sync = bindCtl(el, "v1", C, draw);
    el.querySelectorAll("[data-pre]").forEach((b) => b.addEventListener("click", () => { Object.assign(C, PRESETS[b.dataset.pre].c()); sync(); draw(); }));
  }

  /* ─────────── 02 분포 보고 문턱 정하기 ─────────── */
  function v2view(k, t) {
    const p = PK[k], C = mk({ on: { [k]: 1 } }); C.th[k] = t;
    const r = run(C), lostA = DC.filter((c) => isA(c) && !gateFn(k, C)(c));
    return `${hist(k, C, 820, 290, true)}
      <p class="s2-out">이 문턱 하나로 <b>${r.alive.length}</b>개가 남고(−${DC.length - r.alive.length}), 약 계열 <b>${r.a} / ${NA}</b>, 농축도 <b>${efTxt(r.ef)}</b>.
      ${lostA.length ? `<br><span style="color:var(--bad);font-weight:600">버려지는 약 계열: ${lostA.map((c) => `${esc(c.n.split(" (")[0])}(${p.fmt(c[k])})`).join(", ")}</span>` : `<br><span style="color:var(--good);font-weight:600">약 계열은 하나도 버리지 않는다.</span>`}</p>`;
  }
  function v2() {
    const k = "tpsa", p = PK[k];
    return `<p class="s2-q">지표를 하나 고르고 <b>분포를 본 다음</b> 문턱을 정해 '내 기준표'에 담자. 노란 칸(약 계열)이 어디 몰려 있는지가 힌트다.</p>
      <div class="s2-tabs" role="group" aria-label="지표 고르기">${PROPS.map((q) => `<button type="button" class="vz-btn" id="s2-v2-tab-${q.k}" data-tab="${q.k}" aria-pressed="${q.k === k}">${q.l} ${q.ab}</button>`).join("")}</div>
      <div class="s2-tip" data-tip><b>${p.ab} · ${p.l}</b> — ${esc(p.what)} ${esc(p.why)}</div>
      <div data-view>${v2view(k, p.def)}</div>
      <div class="vz-row"><label for="s2-v2-th" class="vz-lab" style="margin:0">문턱</label><input class="vz-rng" style="flex:1;min-width:160px" type="range" id="s2-v2-th" min="${p.d[0]}" max="${p.d[1]}" step="${p.st}" value="${p.def}"><output class="t-m" data-o style="font-family:var(--mono);font-weight:600;min-width:64px">${p.dir === "max" ? "≤" : "≥"} ${p.fmt(p.def)}</output>
        <button type="button" class="vz-btn" id="s2-v2-add" data-add style="background:var(--ink);color:var(--paper)">내 기준표에 담기</button></div>
      <div style="display:grid;gap:8px;border-top:1px dashed var(--line-strong);padding-top:10px"><div class="vz-row"><span class="vz-lab" style="margin:0">내 기준표</span><button type="button" class="vz-btn" id="s2-v2-clear" data-clear>비우기</button></div><div data-list>${v2list({})}</div></div>`;
  }
  function v2list(set) {
    const ks = Object.keys(set);
    if (!ks.length) return `<p class="vz-note">아직 담은 기준이 없습니다. 지표마다 문턱을 정해 담아 보세요. 담은 기준은 모두 함께(그리고) 적용됩니다.</p>`;
    const C = mk({ on: Object.fromEntries(ks.map((k) => [k, 1])) }); ks.forEach((k) => (C.th[k] = set[k]));
    const r = run(C);
    return `<div class="s2-top">${ks.map((k) => `<span class="vz-chip" style="font-size:12px">${esc(gateLabel(k, C))}</span>`).join("")}</div>${tiles(r, C)}`;
  }
  function v2mount(el) {
    let k = "tpsa"; const set = {};
    const rg = el.querySelector("#s2-v2-th"), o = el.querySelector("[data-o]");
    const show = () => { const p = PK[k]; o.textContent = `${p.dir === "max" ? "≤" : "≥"} ${p.fmt(+rg.value)}`; el.querySelector("[data-view]").innerHTML = v2view(k, +rg.value); };
    el.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
      k = b.dataset.tab; const p = PK[k];
      el.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      el.querySelector("[data-tip]").innerHTML = `<b>${p.ab} · ${p.l}</b> — ${esc(p.what)} ${esc(p.why)}`;
      rg.min = p.d[0]; rg.max = p.d[1]; rg.step = p.st; rg.value = set[k] ?? p.def; show();
    }));
    rg.addEventListener("input", show);
    el.querySelector("[data-add]").addEventListener("click", () => { set[k] = +rg.value; el.querySelector("[data-list]").innerHTML = v2list(set); });
    el.querySelector("[data-clear]").addEventListener("click", () => { for (const x of Object.keys(set)) delete set[x]; el.querySelector("[data-list]").innerHTML = v2list(set); });
  }

  /* ─────────── 03 화학 공간에 울타리 치기 ─────────── */
  const AX = ["mw", "logp", "tpsa", "hbd", "rotb", "qed"];
  const G3 = { W: 820, H: 430, x0: 64, x1: 800, y0: 22, y1: 380 };
  function v3plot(ax, ay, box, lip) {
    const { W, H, x0, x1, y0, y1 } = G3, px = PK[ax], py = PK[ay];
    const sx = CV.scale(px.d, [x0, x1]), sy = CV.scale(py.d, [y1, y0]);
    let s = "";
    for (const v of CV.ticks(py.d[0], py.d[1], 5)) s += `<line x1="${x0}" x2="${x1}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--line)" stroke-width="1"/>` + tx(x0 - 6, sy(v) + 4, py.fmt(v), { a: "end", cls: "t-m t-mu", fs: 11 });
    for (const v of CV.ticks(px.d[0], px.d[1], 6)) s += tx(sx(v), y1 + 17, px.fmt(v), { a: "middle", cls: "t-m t-mu", fs: 11 });
    s += `<line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" stroke="var(--ink)" stroke-width="1"/><line x1="${x0}" x2="${x0}" y1="${y0}" y2="${y1}" stroke="var(--ink)" stroke-width="1"/>`;
    if (lip) {
      const L = { mw: 500, logp: 5, hbd: 5, tpsa: 140, rotb: 10 };
      if (L[ax] != null) s += `<line x1="${sx(L[ax])}" x2="${sx(L[ax])}" y1="${y0}" y2="${y1}" stroke="var(--good)" stroke-width="1.6" stroke-dasharray="6 4"/>` + tx(sx(L[ax]) + 4, y0 + 12, `교과서 기준 ${L[ax]}`, { fs: 11, w: 600, fill: "var(--good)" });
      if (L[ay] != null) s += `<line x1="${x0}" x2="${x1}" y1="${sy(L[ay])}" y2="${sy(L[ay])}" stroke="var(--good)" stroke-width="1.6" stroke-dasharray="6 4"/>` + tx(x1 - 4, sy(L[ay]) - 5, `교과서 기준 ${L[ay]}`, { a: "end", fs: 11, w: 600, fill: "var(--good)" });
    }
    if (box) {
      const bx0 = sx(Math.min(box[0], box[2])), bx1 = sx(Math.max(box[0], box[2])), by0 = sy(Math.max(box[1], box[3])), by1 = sy(Math.min(box[1], box[3]));
      s += `<rect x="${bx0.toFixed(1)}" y="${by0.toFixed(1)}" width="${(bx1 - bx0).toFixed(1)}" height="${(by1 - by0).toFixed(1)}" fill="var(--hi)" fill-opacity="0.16" stroke="var(--ink)" stroke-width="2"/>`;
    }
    const inside = (c) => box && c[ax] >= Math.min(box[0], box[2]) && c[ax] <= Math.max(box[0], box[2]) && c[ay] >= Math.min(box[1], box[3]) && c[ay] <= Math.max(box[1], box[3]);
    const jit = CV.rng(3);
    for (const c of DC.filter((c) => !isA(c))) {
      const j = ["hbd", "rotb"].includes(ax) ? (jit() - 0.5) * 0.5 : 0, jy = ["hbd", "rotb"].includes(ay) ? (jit() - 0.5) * 0.5 : 0;
      s += `<circle cx="${sx(CV.clamp(c[ax] + j, px.d[0], px.d[1])).toFixed(1)}" cy="${sy(CV.clamp(c[ay] + jy, py.d[0], py.d[1])).toFixed(1)}" r="3.6" fill="${inside(c) ? "var(--ink)" : "var(--muted)"}" fill-opacity="${inside(c) ? 0.85 : 0.35}"><title>${esc(c.n)} · ${px.ab} ${px.fmt(c[ax])} · ${py.ab} ${py.fmt(c[ay])}</title></circle>`;
    }
    for (const c of DC.filter(isA)) s += `<g>${star(sx(CV.clamp(c[ax], px.d[0], px.d[1])), sy(CV.clamp(c[ay], py.d[0], py.d[1])), 7)}<title>${esc(c.n)} (약 계열) · ${px.ab} ${px.fmt(c[ax])} · ${py.ab} ${py.fmt(c[ay])}</title></g>`;
    s += tx((x0 + x1) / 2, H - 4, `${px.l} ${px.ab} →`, { a: "middle", cls: "t-mu", fs: 11.5 }) + tx(x0 + 4, 12, `↑ ${py.l} ${py.ab}`, { cls: "t-mu", fs: 11.5 });
    s += `<rect data-hit x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="transparent" style="cursor:crosshair;touch-action:none"/>`;
    return { svg: CV.svg(W, H, s, "화학 공간 산점도 — 끌어서 울타리 치기"), inside };
  }
  function v3out(ax, ay, box) {
    if (!box) return `<p class="s2-out">그림 위에서 <b>끌어서</b> 사각형 울타리를 치세요. 울타리 안의 분자만 다음 단계로 갑니다.</p>`;
    const [a, b] = [Math.min(box[0], box[2]), Math.max(box[0], box[2])], [c2, d] = [Math.min(box[1], box[3]), Math.max(box[1], box[3])];
    const inn = DC.filter((c) => c[ax] >= a && c[ax] <= b && c[ay] >= c2 && c[ay] <= d), ia = inn.filter(isA), out = DC.filter((c) => isA(c) && !inn.includes(c));
    const ef = inn.length ? ia.length / inn.length / BASE : 0, px = PK[ax], py = PK[ay];
    return `<p class="s2-out">내 울타리: <b>${px.ab} ${px.fmt(a)}~${px.fmt(b)}</b> · <b>${py.ab} ${py.fmt(c2)}~${py.fmt(d)}</b><br>
      안에 든 분자 <b>${inn.length}</b>개 · 약 계열 <b>${ia.length} / ${NA}</b> · 농축도 <b>${efTxt(ef)}</b>
      ${out.length ? `<br><span style="color:var(--bad)">울타리 밖 약 계열: ${out.map((c) => esc(c.n.split(" (")[0])).join(", ")}</span>` : ""}</p>`;
  }
  function v3() {
    const box = [150, 1, 450, 5];
    return `<p class="s2-q">두 지표로 그린 '화학 공간' 지도. 별(★)은 알츠하이머 약 계열이다. <b>끌어서 울타리를 쳐</b> 약이 될 만한 동네를 직접 정해 보자.</p>
      <div class="vz-row"><label class="vz-lab" style="margin:0" for="s2-v3-x">가로</label><select id="s2-v3-x" class="vz-btn" data-ax="x">${AX.map((k) => `<option value="${k}" ${k === "mw" ? "selected" : ""}>${PK[k].l} ${PK[k].ab}</option>`).join("")}</select>
        <label class="vz-lab" style="margin:0" for="s2-v3-y">세로</label><select id="s2-v3-y" class="vz-btn" data-ax="y">${AX.map((k) => `<option value="${k}" ${k === "logp" ? "selected" : ""}>${PK[k].l} ${PK[k].ab}</option>`).join("")}</select>
        <button type="button" class="vz-btn" id="s2-v3-lip" data-lip aria-pressed="false">교과서 기준선 겹쳐 보기</button><button type="button" class="vz-btn" id="s2-v3-clr" data-clr>울타리 지우기</button></div>
      <div data-plot>${v3plot("mw", "logp", box, false).svg}</div><div data-out>${v3out("mw", "logp", box)}</div>`;
  }
  function v3mount(el) {
    let ax = "mw", ay = "logp", box = [150, 1, 450, 5], lip = false, drag = null;
    const draw = () => { el.querySelector("[data-plot]").innerHTML = v3plot(ax, ay, box, lip).svg; el.querySelector("[data-out]").innerHTML = v3out(ax, ay, box); };
    const toData = (e) => {
      const svg = el.querySelector("[data-plot] svg"), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse()), { x0, x1, y0, y1 } = G3;
      const vx = CV.scale([x0, x1], PK[ax].d)(CV.clamp(q.x, x0, x1)), vy = CV.scale([y1, y0], PK[ay].d)(CV.clamp(q.y, y0, y1));
      return [vx, vy];
    };
    const plot = el.querySelector("[data-plot]");
    plot.addEventListener("pointerdown", (e) => { if (!e.target.closest("[data-hit]")) return; e.preventDefault(); const [a, b] = toData(e); drag = [a, b]; box = [a, b, a, b]; plot.setPointerCapture && plot.setPointerCapture(e.pointerId); draw(); });
    plot.addEventListener("pointermove", (e) => { if (!drag) return; const [a, b] = toData(e); box = [drag[0], drag[1], a, b]; el.querySelector("[data-plot]").innerHTML = v3plot(ax, ay, box, lip).svg; el.querySelector("[data-out]").innerHTML = v3out(ax, ay, box); });
    const end = () => { if (drag && box && Math.abs(box[0] - box[2]) < 1e-6) box = null; drag = null; draw(); };
    plot.addEventListener("pointerup", end); plot.addEventListener("pointercancel", end);
    el.querySelectorAll("[data-ax]").forEach((s) => s.addEventListener("change", () => { if (s.dataset.ax === "x") ax = s.value; else ay = s.value; box = null; draw(); }));
    el.querySelector("[data-lip]").addEventListener("click", (e) => { lip = !lip; e.currentTarget.setAttribute("aria-pressed", String(lip)); draw(); });
    el.querySelector("[data-clr]").addEventListener("click", () => { box = null; draw(); });
  }

  /* ─────────── 04 내가 심사관 ─────────── */
  const CARD_IDS = ["CRX-ACHE-03", "CHEMBL95", "CHEMBL481", "CHEMBL408", "CRX-ACHE-05", "CHEMBL266349", "CHEMBL30", "CHEMBL807"];
  const STORY = {
    "CRX-ACHE-03": "우리 사내 합성 유도체. 이 모둠이 결국 리드로 고르는 분자다.",
    "CHEMBL95": "실제 첫 알츠하이머 약. 방향족 아민 조각 때문에 간 독성이 잦아 지금은 거의 쓰이지 않는다. 구조 경고가 실제 위험을 미리 잡은 예.",
    "CHEMBL481": "항암제. 이 표적에 도킹하면 220개 중 1위(−13.62)가 나오지만, 분자량이 커서 그런 것이다. 큰 분자는 도킹 점수가 부풀기 쉽다.",
    "CHEMBL408": "당뇨약. 규칙은 모두 통과하지만 실제로는 간 독성으로 시장에서 철수했다. 규칙이 모든 위험을 잡지는 못한다.",
    "CRX-ACHE-05": "사내 유도체. cLogP 5.01 로 Lipinski 기준을 살짝 넘는다. '위반 1개까지 허용'이면 살고 '0개'면 떨어진다.",
    "CHEMBL266349": "혈액 응고 억제제 후보. 극성 넓이(TPSA)가 커서 장 흡수가 어렵다 — 실제로 먹는 약으로는 실패했다.",
    "CHEMBL30": "위산 억제제. 작고 무난해 보이지만 약다움 점수(QED)가 0.23 으로 낮게 나온다.",
    "CHEMBL807": "알츠하이머 약(메만틴). 아주 작고 가볍다. 분자량 하한을 두면 떨어질 수 있다."
  };
  const CARDS = CARD_IDS.map((id) => CV.CMP.get(id)).filter(Boolean);
  const IND4 = ["mw", "tpsa", "logp", "hbd", "rotb", "qed"];
  function card(c, i) {
    const rows = IND4.map((k) => {
      const p = PK[k], [lo, hi] = p.d, x = (v) => ((CV.clamp(v, lo, hi) - lo) / (hi - lo)) * 100, out = c[k] < p.ref[0] || c[k] > p.ref[1];
      return `<div class="s2-ir"><span>${p.ab}</span><span class="tr"><u style="left:${x(p.ref[0])}%;width:${x(p.ref[1]) - x(p.ref[0])}%"></u><i class="${out ? "out" : ""}" style="left:${x(c[k])}%"></i></span><span style="${out ? "color:var(--bad)" : ""}">${p.fmt(c[k])}</span></div>`;
    }).join("");
    return `<article class="s2-card" data-card="${i}"><div class="h"><b>${esc(c.n)}</b><span>${esc(c.lib)}</span></div>
      <div class="m">${CV.mol(c.s, 230, 104)}</div>
      <div class="ind">${rows}${c.al.length ? `<span class="al">구조 경고: ${c.al.map((a) => CV.ALERT[a] || a).join(" · ")}</span>` : `<span class="vz-note" style="font-size:11.5px">구조 경고 없음</span>`}</div>
      <div class="dec" role="group" aria-label="${esc(c.n)} 판정"><button type="button" class="vz-btn y" id="s2-v4-y${i}" data-d="${i}:y" aria-pressed="false">통과</button><button type="button" class="vz-btn n" id="s2-v4-n${i}" data-d="${i}:n" aria-pressed="false">탈락</button></div>
      <div class="rev" data-rev hidden></div></article>`;
  }
  function v4() {
    return `<p class="s2-q">분자 카드 8장을 보고 <b>내가 직접 통과 · 탈락</b>을 정한다. 초록 띠는 시판 약 대부분이 있는 범위(참고)일 뿐 정답이 아니다. 다 정하면 게임 규칙의 판정과 실제 이야기를 열어 보자.</p>
      <div class="s2-cards">${CARDS.map(card).join("")}</div>
      <div class="vz-row"><button type="button" class="vz-btn" id="s2-v4-open" data-reveal style="background:var(--ink);color:var(--paper)">규칙 판정 · 실제 이야기 열기</button><span class="vz-note" data-score>아직 0 / ${CARDS.length}장 정함</span></div>`;
  }
  function v4mount(el) {
    const dec = {}, C = PRESETS.game.c();
    const score = () => { el.querySelector("[data-score]").textContent = `${Object.keys(dec).length} / ${CARDS.length}장 정함`; };
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-d]");
      if (b) { const [i, v] = b.dataset.d.split(":"); dec[i] = v; b.parentElement.querySelectorAll(".vz-btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); score(); return; }
      if (e.target.closest("[data-reveal]")) {
        let same = 0;
        CARDS.forEach((c, i) => {
          const f = fails(c, C), ok = !f.length, mine = dec[i];
          if (mine && (mine === "y") === ok) same++;
          const box = el.querySelector(`[data-card="${i}"] [data-rev]`); box.hidden = false;
          box.innerHTML = `<span>게임 규칙: <b style="color:${ok ? "var(--good)" : "var(--bad)"}">${ok ? "통과" : "탈락"}</b>${ok ? "" : ` — ${f.map((k) => esc(gateLabel(k, C))).join(" · ")} 에 걸림`}</span>
            ${mine ? `<span class="${(mine === "y") === ok ? "same" : "diff"}">${(mine === "y") === ok ? "내 판정과 같음" : "내 판정과 다름 — 왜 다르게 봤는지 말해 보자"}</span>` : ""}<span>${esc(STORY[c.id] || "")}</span>`;
        });
        el.querySelector("[data-score]").innerHTML = `규칙과 같은 판정 <b class="t-m">${same} / ${CARDS.length}</b> · 규칙이 놓친 위험(Troglitazone)과 규칙이 맞힌 위험(타크린)을 찾아보자.`;
      }
    });
  }

  /* ─────────── 05 도킹할 5개 직접 고르기 ─────────── */
  const COLS5 = [["n", "분자", 0], ["lib", "라이브러리", 0], ["mw", "MW", 1], ["tpsa", "TPSA", 1], ["logp", "cLogP", 1], ["hbd", "HBD", 1], ["qed", "QED", 1], ["al", "경고", 0], ["sc", `${gene} 점수`, 1]];
  const vk = (c) => c.vk[tid];
  const VKR = new Map(DC.slice().sort((a, b) => vk(a) - vk(b)).map((c, i) => [c.id, i + 1]));
  function v5table(S) {
    const G = PRESETS.game.c();
    let rows = DC.filter((c) => !S.only || !fails(c, G).length).filter((c) => !S.q || c.n.toLowerCase().includes(S.q.toLowerCase()));
    const get = (c, k) => (k === "sc" ? sc(c) : k === "al" ? c.al.length : c[k]);
    rows = rows.slice().sort((a, b) => { const x = get(a, S.k), y = get(b, S.k); return (typeof x === "string" ? x.localeCompare(y) : x - y) * (S.d === "desc" ? -1 : 1); });
    const full = S.pick.length >= 5;
    return `<div class="s2-tw"><table class="s2-t"><thead><tr><th>고름</th>${COLS5.map(([k, l, n]) => `<th class="${n ? "n" : ""}"><button type="button" data-sort="${k}" aria-sort="${S.k === k ? (S.d === "desc" ? "descending" : "ascending") : "none"}">${l}</button></th>`).join("")}</tr></thead><tbody>
      ${rows.map((c) => { const on = S.pick.includes(c.id); return `<tr class="${on ? "on" : ""}"><td><input type="checkbox" id="s2-v5-p-${esc(c.id)}" data-pick="${esc(c.id)}" ${on ? "checked" : ""} ${!on && full ? "disabled" : ""} aria-label="${esc(c.n)} 고르기"></td>
        <td><span class="nm">${esc(c.n)}</span></td><td>${esc(LSHORT[c.lib])}</td><td class="n ${c.mw > 500 ? "x" : ""}">${f1(c.mw)}</td><td class="n ${c.tpsa > 140 ? "x" : ""}">${f1(c.tpsa)}</td><td class="n ${c.logp > 5 ? "x" : ""}">${f2(c.logp)}</td><td class="n">${c.hbd}</td><td class="n ${c.qed < 0.3 ? "x" : ""}">${f2(c.qed)}</td><td class="${c.al.length ? "x" : ""}">${c.al.length ? "있음" : ""}</td><td class="n">${f2(sc(c))}</td></tr>`; }).join("")}
      </tbody></table></div><p class="vz-note">${rows.length}개 보는 중 · 머리글을 누르면 줄이 바뀐다 · 빨간 숫자 = 교과서 기준을 넘은 값</p>`;
  }
  function v5picked(S, open) {
    if (!S.pick.length) return `<p class="vz-note">아직 고른 분자가 없습니다(최대 5개).</p>`;
    const P = S.pick.map((id) => CV.CMP.get(id));
    const chips = `<div class="s2-top">${P.map((c) => `<span class="vz-chip${isA(c) ? " a" : ""}">${esc(c.n.split(" (")[0])}</span>`).join("")}</div>`;
    if (!open) return chips;
    const mean = (L) => L.reduce((a, c) => a + vk(c), 0) / L.length;
    const base = DC.filter((c) => !fails(c, PRESETS.game.c()).length).sort((a, b) => sc(b) - sc(a)).slice(0, 5);
    const ref = EX.t.refKcal;
    return `${chips}<div class="s2-tw" style="max-height:none"><table class="s2-t" style="min-width:520px"><thead><tr><th>고른 분자</th><th class="n">도킹 ΔG (kcal/mol)</th><th class="n">220개 중 순위</th><th>기준 약 ${esc(EX.t.ref)} ${f2(ref)} 과 비교</th></tr></thead><tbody>
      ${P.slice().sort((a, b) => vk(a) - vk(b)).map((c) => `<tr><td><span class="nm">${esc(c.n)}</span></td><td class="n"><b>${f2(vk(c))}</b></td><td class="n">${VKR.get(c.id)}위</td><td>${vk(c) <= ref ? "기준 약만큼 · 그 이상 단단히 붙음" : vk(c) <= ref + 2 ? "조금 약함" : "많이 약함"}</td></tr>`).join("")}</tbody></table></div>
      <p class="s2-out">내 5개 평균 <b>${f2(mean(P))}</b> · 그냥 '게임 기본 기준 + ${gene} 점수 상위 5'를 골랐다면 평균 <b>${f2(mean(base))}</b>. ΔG 는 음수가 클수록 단단히 붙는다(2.1 단계). <br>
      도킹 1위 Irinotecan(−13.62)은 분자량 586 인 큰 항암제다. 점수만 보고 고르면 이런 분자가 섞인다.</p>`;
  }
  function v5() {
    const S = { k: "sc", d: "desc", only: true, q: "", pick: [] };
    return `<p class="s2-q">지표 표를 직접 정렬 · 검색하면서 <b>3단계에서 도킹할 분자 5개</b>를 고르자. 고른 뒤 '도킹 결과 열어 보기'를 누르면 실제 결합 값이 나온다.</p>
      <div class="vz-row"><label class="vz-btn" for="s2-v5-only" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="s2-v5-only" data-only checked> 게임 기본 기준 통과한 것만(179개)</label>
        <label class="sr" for="s2-v5-q">이름 검색</label><input id="s2-v5-q" data-q class="vz-btn" style="font-weight:400;min-width:160px" placeholder="이름 검색(예: 도네페질)"></div>
      <div data-tbl>${v5table(S)}</div>
      <div style="display:grid;gap:8px;border-top:1px dashed var(--line-strong);padding-top:10px"><div class="vz-row"><span class="vz-lab" style="margin:0" data-cnt>고른 분자 0 / 5</span><button type="button" class="vz-btn" id="s2-v5-open" data-reveal style="background:var(--ink);color:var(--paper)">도킹 결과 열어 보기</button><button type="button" class="vz-btn" id="s2-v5-reset" data-reset>다시 고르기</button></div><div data-picked>${v5picked(S, false)}</div></div>`;
  }
  function v5mount(el) {
    const S = { k: "sc", d: "desc", only: true, q: "", pick: [] };
    let open = false;
    const draw = (t = true) => { if (t) { const sc0 = el.querySelector(".s2-tw") ? el.querySelector(".s2-tw").scrollTop : 0; el.querySelector("[data-tbl]").innerHTML = v5table(S); const w = el.querySelector(".s2-tw"); if (w) w.scrollTop = sc0; }
      el.querySelector("[data-picked]").innerHTML = v5picked(S, open); el.querySelector("[data-cnt]").textContent = `고른 분자 ${S.pick.length} / 5`; };
    el.addEventListener("click", (e) => {
      const s = e.target.closest("[data-sort]");
      if (s) { const k = s.dataset.sort; S.d = S.k === k && S.d === "desc" ? "asc" : "desc"; S.k = k; draw(); return; }
      if (e.target.closest("[data-reveal]")) { if (S.pick.length) { open = true; draw(false); } return; }
      if (e.target.closest("[data-reset]")) { S.pick = []; open = false; draw(); }
    });
    el.addEventListener("change", (e) => {
      const p = e.target.closest("[data-pick]");
      if (p) { const id = p.dataset.pick; S.pick = p.checked ? S.pick.concat(id).slice(0, 5) : S.pick.filter((x) => x !== id); open = false; draw(); return; }
      if (e.target.closest("[data-only]")) { S.only = e.target.checked; draw(); }
    });
    el.querySelector("[data-q]").addEventListener("input", (e) => { S.q = e.target.value.trim(); draw(); });
  }

  /* ─────────── 06 두 사람 기준 겨루기 ─────────── */
  const K6 = ["mw", "tpsa", "logp", "hbd", "qed"];
  function v6res(A, B) {
    const ra = run(A), rb = run(B), sa = new Set(ra.alive.map((c) => c.id)), sb = new Set(rb.alive.map((c) => c.id));
    const both = ra.alive.filter((c) => sb.has(c.id)).length, oa = ra.alive.length - both, ob = rb.alive.length - both, none = DC.length - both - oa - ob;
    const seg = (n, bg, fg, l) => n ? `<div style="flex:${n};background:${bg};color:${fg}" title="${l} ${n}">${n >= 12 ? `${l} ${n}` : n}</div>` : "";
    const ta = new Set(ra.top.map((c) => c.id)), tb = new Set(rb.top.map((c) => c.id));
    const col = (r, other, name) => `<div style="display:grid;gap:6px;min-width:0"><span class="vz-lab">${name} 상위 ${r.top.length}</span><div class="s2-top">${r.top.map((c) => `<span class="vz-chip${isA(c) ? " a" : ""}" style="${other.has(c.id) ? "" : "border-style:dashed"}">${esc(c.n.split(" (")[0])}${other.has(c.id) ? "" : " · 나만"}</span>`).join("")}</div>
      <span class="s2-out">남은 <b>${r.alive.length}</b> · 약 계열 <b>${r.a}/${NA}</b> · 농축도 <b>${efTxt(r.ef)}</b> · 상위 10 중 약 계열 <b>${r.ta}</b></span></div>`;
    return `<div><span class="vz-lab">220개를 두 사람 기준으로 나누면</span><div class="s2-bar3">${seg(oa, "var(--me)", "var(--paper)", "A만")}${seg(both, "var(--ink)", "var(--hi)", "둘 다")}${seg(ob, "var(--daon)", "var(--paper)", "B만")}${seg(none, "var(--raise)", "var(--muted)", "둘 다 버림")}</div></div>
      <div class="vz-cols">${col(ra, tb, "A")}${col(rb, ta, "B")}</div>`;
  }
  function v6() {
    const A = PRESETS.game.c(), B = PRESETS.cns.c();
    return `<p class="s2-q">모둠원 두 명이 <b>각자 기준</b>을 세웠다(설계 §6.4 — 1인 1후보 병렬 실험). 두 기준이 무엇을 다르게 남기는지 보고, 모둠 기준을 하나로 합쳐 보자. "좋은 기준"은 무엇으로 판단할까?</p>
      <div class="vz-cols"><div style="display:grid;gap:6px"><span class="vz-lab" style="color:var(--me)">A · 게임 기본값에서 시작</span>${ctl("v6a", A, { keys: K6, basic: true, rank: false })}</div>
      <div style="display:grid;gap:6px"><span class="vz-lab" style="color:var(--daon)">B · 뇌로 가는 약에서 시작</span>${ctl("v6b", B, { keys: K6, basic: true, rank: false })}</div></div>
      <div data-res style="display:grid;gap:12px">${v6res(A, B)}</div>`;
  }
  function v6mount(el) {
    const A = PRESETS.game.c(), B = PRESETS.cns.c();
    const draw = () => (el.querySelector("[data-res]").innerHTML = v6res(A, B));
    bindCtl(el, "v6a", A, draw); bindCtl(el, "v6b", B, draw);
  }

  /* ─────────── 07 문턱-성과 곡선 ─────────── */
  function v7plot(k, t) {
    const p = PK[k], W = 820, H = 330, x0 = 56, x1 = 760, y0 = 20, y1 = 270, sx = CV.scale(p.d, [x0, x1]), sy = CV.scale([0, 100], [y1, y0]);
    const N = 120, xs = Array.from({ length: N + 1 }, (_, i) => p.d[0] + ((p.d[1] - p.d[0]) * i) / N);
    const keep = (c, v) => (p.dir === "max" ? c[k] <= v : c[k] >= v);
    const curve = (L) => xs.map((v, i) => `${i ? "L" : "M"}${sx(v).toFixed(1)} ${sy((100 * L.filter((c) => keep(c, v)).length) / L.length).toFixed(1)}`).join("");
    const A = DC.filter(isA);
    let s = "";
    for (const v of [0, 25, 50, 75, 100]) s += `<line x1="${x0}" x2="${x1}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--line)"/>` + tx(x0 - 6, sy(v) + 4, `${v}%`, { a: "end", cls: "t-m t-mu", fs: 11 });
    for (const v of CV.ticks(p.d[0], p.d[1], 6)) s += tx(sx(v), y1 + 17, p.fmt(v), { a: "middle", cls: "t-m t-mu", fs: 11 });
    s += `<line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" stroke="var(--ink)"/>`;
    s += `<path d="${curve(DC)}" fill="none" stroke="var(--ink)" stroke-width="2.5"/>`;
    s += `<path d="${curve(A)}" fill="none" stroke="var(--good)" stroke-width="3" stroke-dasharray="7 4"/>`;
    const nAll = DC.filter((c) => keep(c, t)).length, nA = A.filter((c) => keep(c, t)).length, x = sx(t);
    s += `<line x1="${x}" x2="${x}" y1="${y0}" y2="${y1}" stroke="var(--bad)" stroke-width="2"/>`;
    s += `<circle cx="${x}" cy="${sy((100 * nAll) / DC.length)}" r="5" fill="var(--ink)"/><circle cx="${x}" cy="${sy((100 * nA) / NA)}" r="5" fill="var(--good)" stroke="var(--paper)" stroke-width="1.5"/>`;
    const lx = 770;
    s += `<line x1="${lx - 2}" x2="${lx + 16}" y1="${y0 + 8}" y2="${y0 + 8}" stroke="var(--ink)" stroke-width="2.5"/>` + tx(lx - 2, y0 + 26, "전체", { fs: 11, w: 600 }) + tx(lx - 2, y0 + 40, "남는 %", { cls: "t-mu", fs: 10.5 });
    s += `<line x1="${lx - 2}" x2="${lx + 16}" y1="${y0 + 62}" y2="${y0 + 62}" stroke="var(--good)" stroke-width="3" stroke-dasharray="7 4"/>` + tx(lx - 2, y0 + 80, "약 계열", { fs: 11, w: 600, fill: "var(--good)" }) + tx(lx - 2, y0 + 94, "남는 %", { cls: "t-mu", fs: 10.5 });
    s += tx((x0 + x1) / 2, H - 6, `${p.ab} 문턱 (${p.dir === "max" ? "이 값 이하만 남김" : "이 값 이상만 남김"})`, { a: "middle", cls: "t-mu", fs: 11.5 });
    const ef = nAll ? nA / nAll / BASE : 0;
    return { svg: CV.svg(W, H, s, `${p.ab} 문턱에 따른 남는 비율`), txt: `문턱 <b>${p.dir === "max" ? "≤" : "≥"} ${p.fmt(t)}</b> → 전체 <b>${nAll}</b>개(${pct(nAll, DC.length)}%) 남음 · 약 계열 <b>${nA}/${NA}</b>(${pct(nA, NA)}%) · 농축도 <b>${efTxt(ef)}</b>` };
  }
  function bestCut(k) {
    /* 약 계열을 모두 지키면서 가장 많이 걸러내는 문턱 */
    const p = PK[k], A = DC.filter(isA), v = p.dir === "max" ? Math.max(...A.map((c) => c[k])) : Math.min(...A.map((c) => c[k]));
    const n = DC.filter((c) => (p.dir === "max" ? c[k] <= v : c[k] >= v)).length;
    return { v, n };
  }
  function v7() {
    const k = "tpsa", p = PK[k], r = v7plot(k, p.def);
    return `<p class="s2-q">문턱을 움직이면 <b>검은 선(전체)</b>과 <b>초록 점선(약 계열)</b>이 따로 내려간다. 두 선의 사이가 가장 벌어지는 곳이 좋은 문턱이다. 직접 찾아보자.</p>
      <div class="s2-tabs" role="group" aria-label="지표 고르기">${PROPS.map((q) => `<button type="button" class="vz-btn" id="s2-v7-tab-${q.k}" data-tab="${q.k}" aria-pressed="${q.k === k}">${q.ab}</button>`).join("")}</div>
      <div data-plot>${r.svg}</div>
      <div class="vz-row"><label class="vz-lab" style="margin:0" for="s2-v7-th">문턱</label><input class="vz-rng" style="flex:1;min-width:160px" type="range" id="s2-v7-th" min="${p.d[0]}" max="${p.d[1]}" step="${p.st}" value="${p.def}"></div>
      <p class="s2-out" data-txt>${r.txt}</p>
      <div class="vz-row"><button type="button" class="vz-btn" id="s2-v7-hint" data-hint>정답 공개: 약 계열을 다 지키는 가장 엄격한 문턱</button><span class="s2-out" data-ans></span></div>`;
  }
  function v7mount(el) {
    let k = "tpsa"; const rg = el.querySelector("#s2-v7-th");
    const draw = () => { const r = v7plot(k, +rg.value); el.querySelector("[data-plot]").innerHTML = r.svg; el.querySelector("[data-txt]").innerHTML = r.txt; };
    el.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
      k = b.dataset.tab; const p = PK[k];
      el.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      rg.min = p.d[0]; rg.max = p.d[1]; rg.step = p.st; rg.value = p.def; el.querySelector("[data-ans]").textContent = ""; draw();
    }));
    rg.addEventListener("input", draw);
    el.querySelector("[data-hint]").addEventListener("click", () => {
      const p = PK[k], b = bestCut(k);
      el.querySelector("[data-ans]").innerHTML = `${p.ab} ${p.dir === "max" ? "≤" : "≥"} <b>${p.fmt(b.v)}</b> — 약 계열 12개를 모두 지키면서 ${DC.length - b.n}개를 걸러낸다. 하지만 '아는 약만' 맞춘 문턱은 새 약을 놓칠 수 있다.`;
      rg.value = b.v; draw();
    });
  }

  /* ─────────── 08 미션 도전 ─────────── */
  const MISSIONS = [
    { t: "도킹 비용 아끼기", g: "도킹은 분자마다 비용이 든다. 남은 분자를 60개 이하로 줄이되, 약 계열은 10개 이상 지키자.",
      ck: (r) => [[r.alive.length <= 60, `남은 분자 ≤ 60 (지금 ${r.alive.length})`], [r.a >= 10, `약 계열 ≥ 10 (지금 ${r.a})`]] },
    { t: "뇌로 가는 약", g: "ACHE 는 뇌 속 표적이다. 뇌 관문을 지나기 쉬운 분자만(TPSA ≤ 90 · HBD ≤ 3) 남기고, 100개 이하로 줄이면서 약 계열 10개 이상.",
      ck: (r, C) => [[C.on.tpsa && C.th.tpsa <= 90, `TPSA 기준 ≤ 90 사용`], [C.on.hbd && C.th.hbd <= 3, `HBD 기준 ≤ 3 사용`], [r.alive.length <= 100, `남은 분자 ≤ 100 (지금 ${r.alive.length})`], [r.a >= 10, `약 계열 ≥ 10 (지금 ${r.a})`]] },
    { t: "함정 피하기", g: "표적 점수 순 상위 10에 당뇨약 Troglitazone 과 큰 항암제 Irinotecan 이 끼어 있다. 둘을 상위 10에서 빼면서 약 계열 5개 이상을 지키자. 구조 경고는 꼭 빼고.",
      ck: (r, C) => { const ids = new Set(r.top.map((c) => c.id)); return [[C.alerts, "구조 경고 빼기 사용"], [C.topN === 10 && C.sort === "sc", "표적 점수 순 상위 10"], [!ids.has("CHEMBL408") && !ids.has("CHEMBL481"), "Troglitazone · Irinotecan 이 상위 10에 없음"], [r.ta >= 5, `상위 10 중 약 계열 ≥ 5 (지금 ${r.ta})`]]; } }
  ];
  const v8mis = (r, C) => `<div class="s2-mis">${MISSIONS.map((m, i) => { const L = m.ck(r, C), ok = L.every((x) => x[0]); return `<div class="s2-m ${ok ? "done" : ""}"><span class="ck">${ok ? "✓" : i + 1}</span><b>${esc(m.t)}${ok ? " — 성공" : ""}</b><div><p class="vz-note" style="color:var(--ink)">${esc(m.g)}</p><ul>${L.map(([o, t]) => `<li class="${o ? "ok" : "no"}">${o ? "✓" : "○"} ${esc(t)}</li>`).join("")}</ul></div></div>`; }).join("")}</div>`;
  function v8() {
    const C = PRESETS.none.c(), r = run(C);
    return `<p class="s2-q">기준 없이 220개 그대로에서 시작한다. 왼쪽에서 기준을 켜고 문턱을 옮겨 <b>미션 세 개</b>를 모두 성공시켜 보자. 미션마다 다른 기준이 필요할 수 있다.</p>
      <div class="s2-two"><div>${ctl("v8", C, {})}</div><div style="display:grid;gap:10px" data-res>${tiles(r, C)}${v8mis(r, C)}</div></div>`;
  }
  function v8mount(el) {
    const C = PRESETS.none.c();
    bindCtl(el, "v8", C, () => { const r = run(C); el.querySelector("[data-res]").innerHTML = tiles(r, C) + v8mis(r, C); });
  }

  /* ─────────── 09 탈락 분자 구제하기 ─────────── */
  const GCOL = { lib: "var(--muted)", mw: "var(--bad)", tpsa: "var(--mirp)", logp: "var(--seum)", hbd: "var(--daon)", hba: "var(--daon)", rotb: "var(--daon)", ro5: "var(--seum)", alerts: "var(--daon)", qed: "var(--warn)" };
  function v9grid(C, sel) {
    const r = run(C), keepS = new Set(r.alive.map((c) => c.id)), topS = new Set(r.top.map((c) => c.id));
    const rank = (c) => (topS.has(c.id) ? 0 : keepS.has(c.id) ? 1 : 2 + ORDER.indexOf(r.drop.get(c.id)));
    const list = DC.slice().sort((a, b) => rank(a) - rank(b) || (isA(b) - isA(a)));
    const cols = 22, p = 34, sz = 30, W = cols * p + 8, H = Math.ceil(list.length / cols) * p + 8;
    let s = "";
    list.forEach((c, i) => {
      const x = 4 + (i % cols) * p, y = 4 + Math.floor(i / cols) * p, k = topS.has(c.id) ? "top" : keepS.has(c.id) ? "keep" : r.drop.get(c.id);
      const fill = k === "top" ? "var(--ink)" : k === "keep" ? "var(--good)" : GCOL[k];
      s += `<g data-id="${esc(c.id)}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${sz}" height="${sz}" fill="${fill}" fill-opacity="${k === "keep" ? 0.5 : 0.9}" stroke="${sel === c.id ? "var(--hi)" : "none"}" stroke-width="4"/>${isA(c) ? star(x + sz / 2, y + sz / 2, 8) : ""}<title>${esc(c.n)}</title></g>`;
    });
    const used = [...new Set([...r.drop.values()])];
    const leg = `<div class="s2-top" style="font-size:12px"><span class="vz-chip" style="background:var(--ink);color:var(--paper)">도킹 후보 상위 ${C.topN}</span><span class="vz-chip" style="background:var(--good-bg)">통과 · 순위 밖</span>${used.map((k) => `<span class="vz-chip" style="border-color:${GCOL[k]};color:${GCOL[k]};font-weight:600">${esc(gateLabel(k, C))} 에서 탈락 ${[...r.drop.values()].filter((x) => x === k).length}</span>`).join("")}<span class="vz-chip">★ 약 계열</span></div>`;
    return `${CV.svg(W, H, s, "분자 220칸 — 칸을 눌러 탈락 이유 보기")}${leg}`;
  }
  function relaxFor(c, C) {
    const D = clone(C);
    for (const k of fails(c, D)) {
      if (k === "lib") D.libs = D.libs.concat(c.lib);
      else if (k === "ro5") D.ro5 = c.ro5;
      else if (k === "alerts") D.alerts = false;
      else D.th[k] = c[k];
    }
    return D;
  }
  function v9info(id, C, note) {
    if (!id) return `<span>칸을 눌러 분자를 고르세요. 떨어진 분자를 고르면 <b>그 분자를 살리려면 규칙을 얼마나 바꿔야 하는지</b>, 그러면 <b>누가 같이 들어오는지</b> 볼 수 있습니다.</span>`;
    const c = CV.CMP.get(id), f = fails(c, C);
    const head = `<div><b>${esc(c.n)}</b> <span class="vz-chip">${esc(c.lib)}</span>${isA(c) ? ' <span class="vz-chip" style="background:var(--hi);border-color:var(--ink)">약 계열</span>' : ""} <span class="t-m" style="color:var(--muted);font-family:var(--mono)">MW ${f1(c.mw)} · TPSA ${f1(c.tpsa)} · cLogP ${f2(c.logp)} · HBD ${c.hbd} · QED ${f2(c.qed)}${c.al.length ? " · 경고 " + c.al.map((a) => CV.ALERT[a] || a).join("·") : ""}</span></div>`;
    if (!f.length) return `${head}<span style="color:var(--good);font-weight:600">이 분자는 지금 기준을 모두 통과한다.</span>${note ? `<span>${note}</span><div class="vz-row"><button type="button" class="vz-btn" id="s2-v9-undo" data-undo>처음 규칙으로</button></div>` : ""}`;
    const D = relaxFor(c, C), r0 = run(C), r1 = run(D), s0 = new Set(r0.alive.map((x) => x.id));
    const come = r1.alive.filter((x) => !s0.has(x.id) && x.id !== c.id), ca = come.filter(isA).length;
    const change = f.map((k) => `${gateLabel(k, C)} → ${gateLabel(k, D)}`).join(", ");
    return `${head}<span style="color:var(--bad);font-weight:600">걸린 기준: ${f.map((k) => esc(gateLabel(k, C))).join(" · ")}</span>
      <span>살리려면 <b>${esc(change)}</b> 로 바꿔야 한다. 그러면 이 분자 말고도 <b class="t-m">${come.length}</b>개가 같이 들어온다(그중 약 계열 ${ca}개).</span>
      ${come.length ? `<div class="s2-top">${come.slice(0, 12).map((x) => `<span class="vz-chip${isA(x) ? " a" : ""}">${esc(x.n.split(" (")[0])}</span>`).join("")}${come.length > 12 ? `<span class="vz-chip">… ${come.length - 12}개 더</span>` : ""}</div>` : ""}
      <div class="vz-row"><button type="button" class="vz-btn" id="s2-v9-apply" data-apply style="background:var(--ink);color:var(--paper)">이렇게 규칙 바꾸기</button><button type="button" class="vz-btn" id="s2-v9-undo" data-undo>처음 규칙으로</button></div>`;
  }
  function v9() {
    const C = PRESETS.game.c(), pick = "CHEMBL95";
    return `<p class="s2-q">게임 기본 기준으로 걸렀다. 떨어진 분자 중 <b>살리고 싶은 분자</b>를 눌러 보자. 규칙은 모두에게 똑같이 적용되므로, 하나를 살리면 다른 분자도 함께 들어온다.</p>
      <div data-grid>${v9grid(C, pick)}</div><div class="s2-info" data-info aria-live="polite">${v9info(pick, C)}</div><div data-tiles>${tiles(run(C), C)}</div>`;
  }
  function v9mount(el) {
    let C = PRESETS.game.c(), sel = "CHEMBL95", note = "";
    const draw = () => { el.querySelector("[data-grid]").innerHTML = v9grid(C, sel); el.querySelector("[data-info]").innerHTML = v9info(sel, C, note); el.querySelector("[data-tiles]").innerHTML = tiles(run(C), C); };
    el.addEventListener("click", (e) => {
      const g = e.target.closest("[data-id]"); if (g) { sel = g.dataset.id; note = ""; draw(); return; }
      if (e.target.closest("[data-apply]")) {
        const c = CV.CMP.get(sel), f = fails(c, C), D = relaxFor(c, C), r0 = run(C), r1 = run(D);
        note = `방금 <b>${f.map((k) => esc(gateLabel(k, C) + " → " + gateLabel(k, D))).join(", ")}</b> 로 바꿨다. 남은 분자 ${r0.alive.length} → <b>${r1.alive.length}</b>(+${r1.alive.length - r0.alive.length}), 약 계열 ${r0.a} → ${r1.a}, 농축도 ${efTxt(r0.ef)} → ${efTxt(r1.ef)}. 살린 보람이 있었나?`;
        C = D; draw(); return;
      }
      if (e.target.closest("[data-undo]")) { C = PRESETS.game.c(); note = ""; draw(); }
    });
  }

  /* ─────────── 10 예측하고 확인하기 ─────────── */
  const SEQ = [
    { k: "mw", t: 500, q: "분자량 500 이하만 남기면 220개 중 몇 개가 남을까?" },
    { k: "tpsa", t: 90, q: "이어서 TPSA 90 이하(뇌 약 기준)만 남기면?" },
    { k: "alerts", q: "이어서 구조 경고 조각이 있는 분자를 빼면?" },
    { k: "qed", t: 0.5, q: "이어서 약다움 QED 0.5 이상만 남기면?" },
    { k: "logp", t: 4, q: "마지막으로 cLogP 4 이하(심장 독성 위험 줄이기)만 남기면?" }
  ];
  const seqC = (i) => { const C = mk(); SEQ.slice(0, i).forEach((s) => { if (s.k === "alerts") C.alerts = true; else { C.on[s.k] = 1; C.th[s.k] = s.t; } }); return C; };
  function v10stage(i, guesses) {
    if (i >= SEQ.length) {
      const rows = SEQ.map((s, j) => ({ s, n: run(seqC(j + 1)).alive.length, g: guesses[j] }));
      const W = 720, rh = 34, H = rows.length * rh + 30, lw = 220, bw = W - lw - 60, sx = (n) => (n / DC.length) * bw;
      let b = tx(lw, 14, "실제(막대) vs 내 예측(세로선)", { cls: "t-mu", fs: 11.5 });
      rows.forEach((r, j) => { const y = 24 + j * rh; b += tx(lw - 8, y + 16, esc(r.s.k === "alerts" ? "구조 경고 빼기" : gateLabel(r.s.k, seqC(j + 1))), { a: "end", cls: "t-m", fs: 11.5, w: 600 }) + `<rect x="${lw}" y="${y + 3}" width="${sx(r.n).toFixed(1)}" height="20" fill="var(--ink)" fill-opacity=".8"/><line x1="${lw + sx(r.g)}" x2="${lw + sx(r.g)}" y1="${y}" y2="${y + 26}" stroke="var(--hi)" stroke-width="4"/><line x1="${lw + sx(r.g)}" x2="${lw + sx(r.g)}" y1="${y}" y2="${y + 26}" stroke="var(--ink)" stroke-width="1"/>` + tx(lw + Math.max(sx(r.n), sx(r.g)) + 8, y + 17, `${r.n} (예측 ${r.g})`, { cls: "t-m", fs: 11.5, w: 600 }); });
      const err = rows.reduce((a, r) => a + Math.abs(r.n - r.g), 0) / rows.length;
      return `${CV.svg(W, H, b, "예측과 실제 비교")}<p class="s2-out">평균 오차 <b>${err.toFixed(1)}</b>개. 가장 크게 빗나간 관문은 어디였나? 분포(1.2-02 시안)를 보면 왜 그런지 알 수 있다.</p>
        <button type="button" class="vz-btn" id="s2-v10-again" data-again>처음부터 다시</button>`;
    }
    const s = SEQ[i], prev = run(seqC(i)).alive.length, def = Math.round(prev * 0.7);
    return `<div class="s2-pred"><span class="vz-lab">관문 ${i + 1} / ${SEQ.length} · 지금 ${prev}개 남음</span><b style="font-size:15px">${esc(s.q)}</b>
      ${s.k !== "alerts" ? `<div>${hist(s.k, Object.assign(seqC(i), { on: { ...seqC(i).on, [s.k]: 1 }, th: { ...seqC(i).th, [s.k]: s.t } }), 640, 46)}</div><p class="vz-note">위 분포는 220개 전체. 빨간 점선 밖이 버려질 쪽이다.</p>` : `<p class="vz-note">구조 경고 조각은 220개 중 32개에 있다. 앞 관문에서 이미 빠진 것도 있을 것이다.</p>`}
      <div class="vz-row"><label class="vz-lab" style="margin:0" for="s2-v10-g">내 예측</label><input class="vz-rng" style="flex:1;min-width:160px" type="range" id="s2-v10-g" min="0" max="${prev}" step="1" value="${def}"><span class="big" data-g>${def}</span>개</div>
      <div class="vz-row"><button type="button" class="vz-btn" id="s2-v10-ok" data-ok style="background:var(--ink);color:var(--paper)">확인하기</button><span class="s2-out" data-res></span></div></div>`;
  }
  function v10() {
    return `<p class="s2-q">관문을 하나씩 걸기 전에 <b>몇 개가 남을지 먼저 예측</b>하고 확인한다. 지표의 분포를 보고 감을 잡는 연습이다.</p><div data-stage>${v10stage(0, [])}</div>`;
  }
  function v10mount(el) {
    let i = 0, guesses = [], shown = false;
    const draw = () => { el.querySelector("[data-stage]").innerHTML = v10stage(i, guesses); shown = false; };
    el.addEventListener("input", (e) => { if (e.target.id === "s2-v10-g") el.querySelector("[data-g]").textContent = e.target.value; });
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-again]")) { i = 0; guesses = []; draw(); return; }
      const ok = e.target.closest("[data-ok]"); if (!ok) return;
      if (shown) { i++; draw(); return; }
      const g = +el.querySelector("#s2-v10-g").value, real = run(seqC(i + 1)).alive.length, d = g - real;
      guesses[i] = g; shown = true;
      el.querySelector("[data-res]").innerHTML = `실제 <b>${real}</b>개 · 내 예측 ${g}개 (${d === 0 ? "정확!" : (d > 0 ? "+" : "") + d})`;
      ok.textContent = i + 1 < SEQ.length ? "다음 관문" : "결과 보기";
      el.querySelector("#s2-v10-g").disabled = true;
    });
  }

  window.VIZ[2] = [
    { name: "기준 설계실", kind: "기준 고르기 · 분포 · 점수판", idea: "지표 7개와 Lipinski · 구조 경고 · 라이브러리 · 줄 세우기 기준을 직접 켜고 문턱을 옮기면, 분포 · 깔때기 · 점수판 · 도킹 후보가 바로 바뀐다.",
      learn: "기준을 켤 때마다 약 계열을 얼마나 잃고 나머지를 얼마나 걸러내는지 저울질하며 스스로 기준을 세운다.", render: v1, mount: v1mount },
    { name: "분포 보고 문턱 정하기", kind: "히스토그램 · 문턱 · 기준표", idea: "지표 하나씩 220개의 분포와 약 계열 위치를 보고 문턱을 정해 '내 기준표'에 담는다. 담은 기준을 합친 결과가 아래에 쌓인다.",
      learn: "문턱은 감으로 정하지 않는다. 분포에서 약이 몰린 곳과 버릴 꼬리를 보고 근거 있게 정한다.", render: v2, mount: v2mount },
    { name: "화학 공간 울타리", kind: "산점도 · 끌어서 상자 그리기", idea: "가로 · 세로 지표를 골라 분자 지도를 만들고, 마우스로 끌어 '약이 될 만한 동네'에 울타리를 친다. 교과서 기준선과 견줄 수 있다.",
      learn: "두 지표를 함께 보면 한 지표로는 안 보이는 약의 동네가 보이고, Lipinski 기준도 그런 울타리라는 걸 안다.", render: v3, mount: v3mount },
    { name: "내가 심사관", kind: "분자 카드 · 직접 판정 · 정답 공개", idea: "분자 카드 8장의 지표를 읽고 직접 통과 · 탈락을 정한 뒤, 게임 규칙의 판정과 실제 이야기(타크린 간 독성, Irinotecan 큰 분자, Troglitazone 철수)를 연다.",
      learn: "규칙은 사람의 판단을 숫자로 옮긴 것이고, 규칙이 잡는 위험과 놓치는 위험이 모두 있다.", render: v4, mount: v4mount },
    { name: "도킹할 5개 고르기", kind: "정렬 표 · 고르기 · 결과 공개", idea: "220개 지표 표를 정렬 · 검색해 도킹할 5개를 직접 고르고, 결과를 열어 실제 결합 값과 순위, '점수 상위 5'를 그냥 골랐을 때와 비교한다.",
      learn: "여러 지표를 함께 보고 고른 선택이 다음 단계 결과로 돌아온다. 점수 하나만 믿으면 큰 분자 같은 함정에 빠진다.", render: v5, mount: v5mount },
    { name: "두 사람 기준 겨루기", kind: "A/B 기준 · 겹침 막대 · 상위 10 비교", idea: "모둠원 A · B 가 각자 기준을 세우면 둘 다 남긴 분자, 한 사람만 남긴 분자, 상위 10의 차이가 나란히 보인다.",
      learn: "기준이 다르면 후보가 달라진다. 모둠은 근거(약 계열 보존 · 농축도)로 토론해 기준을 합친다.", render: v6, mount: v6mount },
    { name: "문턱-성과 곡선", kind: "두 곡선 · 슬라이더 · 정답 공개", idea: "문턱을 움직이면 전체가 남는 비율과 약 계열이 남는 비율이 두 곡선 위에서 움직인다. 둘이 가장 벌어지는 문턱을 찾는다.",
      learn: "좋은 문턱은 '나머지는 많이 버리고 약은 지키는' 곳이고, 아는 약에만 맞춘 문턱은 새 약을 놓칠 수 있다.", render: v7, mount: v7mount },
    { name: "미션 도전", kind: "목표 · 실시간 체크", idea: "기준 없는 220개에서 시작해 '도킹 비용 아끼기 · 뇌로 가는 약 · 함정 피하기' 미션 3개를 기준을 조절해 성공시킨다.",
      learn: "기준은 목적(비용 · 뇌 투과 · 순위)에 따라 달라진다는 것을 목표를 이루며 익힌다.", render: v8, mount: v8mount },
    { name: "탈락 분자 구제하기", kind: "220칸 격자 · 규칙 완화 · 부작용", idea: "떨어진 분자 칸을 눌러 이유를 보고, 그 분자를 살리도록 규칙을 바꾸면 함께 들어오는 분자 수와 목록이 나온다.",
      learn: "규칙은 모두에게 똑같이 적용된다. 하나를 살리려 규칙을 풀면 원치 않는 분자도 같이 들어온다.", render: v9, mount: v9mount },
    { name: "예측하고 확인하기", kind: "분포 힌트 · 예측 슬라이더 · 비교", idea: "관문 5개를 하나씩 걸기 전에 분포를 보고 남을 개수를 예측한 뒤 실제와 맞춰 보고, 끝에 예측과 실제를 한 그림에 모은다.",
      learn: "지표 분포를 읽는 감을 기르고, 어떤 관문이 크게 거르는지 스스로 알아챈다.", render: v10, mount: v10mount }
  ];
})();
