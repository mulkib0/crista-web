/* 2.1 분자 도킹 — 시각화 시안 10종 */
(function () {
  "use strict";
  const CV = window.CV, { EX, esc, f1, f2, R } = CV;

  /* ── 이 파일 전용 도우미 ── */
  const T = EX.t, REF = T.refKcal, P0 = REF + 4.5, P1 = REF - 0.5;
  const DK = EX.dock;
  const RT = 0.0019872 * 298; /* kcal/mol, 298 K */
  const LN10RT = RT * Math.LN10; /* 10배마다 필요한 ΔG 차이 ≈ 1.364 */
  const kd = (g) => Math.exp(g / RT); /* 몰농도(M) */
  const mn = (v, d = 2) => { const s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? "−" : "") + s; };
  const fmtM = (M) => {
    const U = [[1, "M"], [1e-3, "mM"], [1e-6, "µM"], [1e-9, "nM"], [1e-12, "pM"]];
    const u = U.find(([b]) => M >= b) || U[U.length - 1];
    const v = M / u[0];
    return `${v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)} ${u[1]}`;
  };
  const isCRX = (d) => /^CRX-ACHE-/.test(d.id);
  const short = (d) => d.ref ? "도네페질" : d.extra ? d.name : isCRX(d) ? "CRX-" + d.id.slice(-2) : String(d.name).split(" (")[0];
  const sub = (d) => d.ref ? "기준 리간드" : isCRX(d) ? String(d.name).replace(/^도네페질 /, "").replace(/ 유도체$/, "") : "당뇨약 · PPAR";
  const colOf = (d) => d.ref ? "var(--ink)" : d.extra ? "var(--muted)" : isCRX(d) ? "var(--me)" : "var(--daon)";
  const sp = (k) => (CV.CMP.get(k) || null);
  const extra = (id, label, why) => { const c = sp(id); return c ? { id, c, name: label, kcal: c.vk[EX.tid], p: CV.strength(c.vk[EX.tid], REF), extra: true, why } : null; };
  const HIS = extra("CHEMBL90", "히스타민", "작아서 헐렁함");
  const GAL = extra("CRX-ACHE-04", "갈란타민 O-에틸 유도체", "겨우 기준선 안");
  const ALLV = CV.D.compounds.map((c) => c.vk[EX.tid]).filter((v) => typeof v === "number").sort((a, b) => a - b);
  const MED = ALLV.length ? (ALLV[(ALLV.length - 1) >> 1] + ALLV[ALLV.length >> 1]) / 2 : -9;
  const TOPC = CV.D.compounds.slice().sort((a, b) => a.vk[EX.tid] - b.vk[EX.tid])[0];
  const TOPFAIL = TOPC ? EX.screen.failAt.get(TOPC.id) : -1;
  const TRO = DK.find((d) => !d.ref && !isCRX(d)) || DK[0];
  const REFROW = DK.find((d) => d.ref);
  const LEADROW = DK.find((d) => EX.lead && d.id === EX.lead.id) || DK[1];
  const hex = (cx, cy, r, rot = 0) => Array.from({ length: 6 }, (_, i) => { const a = ((60 * i + rot) * Math.PI) / 180; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
  const poly = (cx, cy, r, n, rot = -90) => Array.from({ length: n }, (_, i) => { const a = ((360 / n * i + rot) * Math.PI) / 180; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
  const arrowDef = (id, col) => `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="${col}"/></marker></defs>`;
  /* 라벨끼리 겹치지 않게 아래로 민다 */
  const spread = (ys, gap) => { const o = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y); for (let k = 1; k < o.length; k++) o[k].y = Math.max(o[k].y, o[k - 1].y + gap); const r = []; o.forEach((x) => (r[x.i] = x.y)); return r; };
  const bindAll = (el, sel, ev, fn) => { const L = [...el.querySelectorAll(sel)]; L.forEach((b) => b.addEventListener(ev, fn)); return () => L.forEach((b) => b.removeEventListener(ev, fn)); };

  CV.css("s3", `
    .s3-ctl { display: grid; gap: 6px; }
    .s3-ctl label { font-weight: 600; font-size: 12.5px; }
    .s3-read { font-family: var(--mono); font-size: 12.5px; line-height: 1.6; padding: 8px 10px; border: 1px solid var(--line); background: var(--paper); overflow-x: auto; }
    .s3-read b { font-weight: 600; }
    .s3-read .hl { background: var(--hi); padding: 0 3px; }
    .s3-leg { display: flex; flex-wrap: wrap; gap: 6px; }
    .s3-leg .vz-btn { display: inline-flex; gap: 6px; align-items: center; }
    .s3-leg svg { width: 34px; height: 10px; flex: none; }
    .s3-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(178px, 1fr)); gap: 10px; }
    .s3-card { border: 1px solid var(--line-strong); background: var(--paper); padding: 10px; display: grid; gap: 6px; align-content: start; position: relative; }
    .s3-card.warn { border: 2px solid var(--warn); }
    .s3-card .top { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
    .s3-card .rk { font-family: var(--mono); font-weight: 600; font-size: 12px; background: var(--ink); color: var(--hi); padding: 1px 6px; }
    .s3-card h4 { margin: 0; font-size: 13.5px; line-height: 1.3; }
    .s3-card .g { font-family: var(--mono); font-size: 22px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; }
    .s3-card .g small { font-size: 11px; color: var(--muted); font-weight: 500; }
    .s3-card .pb { height: 8px; background: var(--raise); position: relative; }
    .s3-card .pb i { position: absolute; inset: 0 auto 0 0; background: var(--ink); }
    .s3-card .pt { font-family: var(--mono); font-size: 11px; color: var(--muted); }
    .s3-card .stamp { font-size: 11.5px; font-weight: 700; color: var(--warn); border: 1.5px solid var(--warn); padding: 1px 6px; justify-self: start; }
    .s3-card p { margin: 0; font-size: 12px; color: var(--muted); line-height: 1.45; }
    .s3-ok { color: var(--good); font-weight: 700; }
    .s3-no { color: var(--bad); font-weight: 700; }
  `);

  /* ───────────── 01 에너지 우물 ───────────── */
  function v1() {
    const W = 880, H = 372, y0 = 58, k = 18.4, Y = (g) => y0 - g * k;
    const wells = DK.concat(HIS ? [HIS] : []);
    const x0 = 112, st = 104;
    let b = "";
    for (let g = 0; g >= -14; g -= 2) {
      b += `<line x1="58" x2="776" y1="${Y(g)}" y2="${Y(g)}" stroke="var(--line)" stroke-width="1" fill="none"/>`;
      b += `<text x="52" y="${Y(g) + 4}" text-anchor="end" font-size="12" class="t-m t-mu">${mn(g, 0)}</text>`;
    }
    b += `<text x="8" y="22" font-size="12" class="t-m t-mu">ΔG kcal/mol</text>`;
    b += `<text x="112" y="22" font-size="13" font-weight="600">0 = 단백질과 분자가 떨어져 있을 때. 붙으면 에너지가 빠져나가 0 아래로 내려간다.</text>`;
    b += `<line x1="58" x2="776" y1="${y0}" y2="${y0}" stroke="var(--ink)" stroke-width="1.5" fill="none"/>`;
    /* 기준선 · p=0 선 */
    b += `<line x1="58" x2="780" y1="${Y(REF)}" y2="${Y(REF)}" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="6 4" fill="none"/>`;
    b += `<text x="784" y="${Y(REF) + 4}" font-size="12" font-weight="600">기준 ${mn(REF)}</text>`;
    b += `<line x1="58" x2="780" y1="${Y(P0)}" y2="${Y(P0)}" stroke="var(--bad)" stroke-width="1.2" stroke-dasharray="3 4" fill="none"/>`;
    b += `<text x="784" y="${Y(P0) - 4}" font-size="12" font-weight="600" fill="var(--bad)" style="fill:var(--bad)">p = 0 선</text>`;
    b += `<text x="784" y="${Y(P0) + 11}" font-size="11" class="t-m t-mu">${mn(P0)}</text>`;
    wells.forEach((d, i) => {
      const cx = x0 + i * st, yb = Y(d.kcal);
      b += `<path d="M${cx - 46},${y0} C${cx - 46},${yb + 2} ${cx - 34},${yb} ${cx},${yb} C${cx + 34},${yb} ${cx + 46},${yb + 2} ${cx + 46},${y0} Z" fill="var(--film-2)" stroke="var(--ink)" stroke-width="1.4"/>`;
      b += `<circle cx="${cx}" cy="${yb - 8}" r="8" fill="${colOf(d)}" stroke="var(--paper)" stroke-width="1.5"/>`;
      b += `<text x="${cx}" y="${yb - 24}" text-anchor="middle" font-size="12.5" font-weight="600" class="t-m">${mn(d.kcal)}</text>`;
      b += `<text x="${cx}" y="${H - 26}" text-anchor="middle" font-size="12.5" font-weight="600">${esc(short(d))}</text>`;
      b += `<text x="${cx}" y="${H - 10}" text-anchor="middle" font-size="11.5" class="t-m t-mu">p ${f2(d.p)}${d.extra ? " · 비교" : ""}</text>`;
    });
    /* 꺼내는 데 드는 에너지 화살표: 1위와 비교용 히스타민 */
    const arrow = (i, d) => {
      const cx = x0 + i * st + 30, yb = Y(d.kcal) - 4;
      return `<line x1="${cx}" x2="${cx}" y1="${yb}" y2="${y0 + 6}" stroke="var(--bad)" stroke-width="1.6" marker-end="url(#s3a1)" fill="none"/>`;
    };
    b += arrowDef("s3a1", "var(--bad)");
    b += arrow(0, wells[0]);
    if (HIS) b += arrow(wells.length - 1, HIS);
    return `${CV.svg(W, H, b, "결합 자유에너지를 우물 깊이로 그린 그림")}
      <p class="vz-note"><b>음수일수록 더 단단하다.</b> 공이 깊은 우물 바닥에 있을수록 꺼내기(떼어 내기) 어렵다. 빨간 화살표 길이 = 떼어 낼 때 다시 넣어 줘야 하는 에너지.
      ${esc(short(wells[0]))} ${mn(wells[0].kcal)} 은 ${HIS ? `히스타민 ${mn(HIS.kcal)} 보다 ${f1(wells[0].kcal / HIS.kcal)}배 깊다.` : ""}</p>`;
  }

  /* ───────────── 02 ΔG → p 변환기 ───────────── */
  const v2X = (g) => 80 + ((g + 14) / 10) * 740, v2Y = (p) => 290 - p * 220;
  function v2plot(g) {
    const W = 860, H = 350, p = CV.strength(g, REF);
    let b = "";
    b += `<rect x="80" y="70" width="${v2X(P1) - 80}" height="220" fill="var(--good-bg)"/>`;
    b += `<rect x="${v2X(P0)}" y="70" width="${820 - v2X(P0)}" height="220" fill="var(--bad-bg)"/>`;
    b += `<text x="${(80 + v2X(P1)) / 2}" y="276" text-anchor="middle" font-size="12" font-weight="600" fill="var(--good)" style="fill:var(--good)">p = 1 (최고점)</text>`;
    b += `<text x="${(v2X(P0) + 820) / 2}" y="160" text-anchor="middle" font-size="12" font-weight="600" fill="var(--bad)" style="fill:var(--bad)">p = 0 (점수 없음)</text>`;
    for (let x = -14; x <= -4; x++) {
      b += `<line x1="${v2X(x)}" x2="${v2X(x)}" y1="290" y2="296" stroke="var(--ink)" stroke-width="1" fill="none"/>`;
      b += `<text x="${v2X(x)}" y="312" text-anchor="middle" font-size="12" class="t-m">${mn(x, 0)}</text>`;
    }
    [0, 0.25, 0.5, 0.75, 1].forEach((q) => {
      b += `<line x1="80" x2="820" y1="${v2Y(q)}" y2="${v2Y(q)}" stroke="var(--line)" stroke-width="1" fill="none"/>`;
      b += `<text x="72" y="${v2Y(q) + 4}" text-anchor="end" font-size="12" class="t-m">${q.toFixed(2)}</text>`;
    });
    b += `<line x1="80" x2="820" y1="290" y2="290" stroke="var(--ink)" stroke-width="1.2" fill="none"/>`;
    b += `<text x="80" y="338" font-size="12" class="t-mu">← 더 음수 = 더 단단히 붙음</text>`;
    b += `<text x="820" y="338" text-anchor="end" font-size="12" class="t-mu">덜 음수 = 약하게 붙음 →</text>`;
    b += `<text x="450" y="338" text-anchor="middle" font-size="12" class="t-m">ΔG (kcal/mol)</text>`;
    b += `<text x="10" y="58" font-size="12" class="t-m">결합력 p</text>`;
    /* 세 기준선 */
    b += `<line x1="${v2X(P1)}" x2="${v2X(P1)}" y1="62" y2="290" stroke="var(--good)" stroke-width="1.2" stroke-dasharray="4 4" fill="none"/>`;
    b += `<text x="${v2X(P1) - 4}" y="58" text-anchor="end" font-size="11.5" class="t-m" fill="var(--good)" style="fill:var(--good)">기준−0.5 = ${mn(P1)}</text>`;
    b += `<line x1="${v2X(REF)}" x2="${v2X(REF)}" y1="40" y2="290" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="6 4" fill="none"/>`;
    b += `<text x="${v2X(REF) + 4}" y="44" font-size="11.5" font-weight="600">기준 도네페질 ${mn(REF)}</text>`;
    b += `<line x1="${v2X(P0)}" x2="${v2X(P0)}" y1="62" y2="290" stroke="var(--bad)" stroke-width="1.2" stroke-dasharray="4 4" fill="none"/>`;
    b += `<text x="${v2X(P0) + 4}" y="58" font-size="11.5" class="t-m" fill="var(--bad)" style="fill:var(--bad)">기준+4.5 = ${mn(P0)}</text>`;
    /* 변환선 */
    b += `<polyline points="80,${v2Y(1)} ${v2X(P1)},${v2Y(1)} ${v2X(P0)},${v2Y(0)} 820,${v2Y(0)}" fill="none" stroke="var(--ink)" stroke-width="3"/>`;
    /* 6분자 */
    DK.forEach((d) => { b += `<circle cx="${v2X(d.kcal)}" cy="${v2Y(d.p)}" r="4" fill="${colOf(d)}" stroke="var(--paper)" stroke-width="1"/>`; });
    b += `<text x="${v2X(TRO.kcal)}" y="${v2Y(1) + 20}" text-anchor="middle" font-size="11" class="t-mu">${esc(short(TRO))}</text>`;
    /* 움직이는 표시 */
    const mx = v2X(g), my = v2Y(p);
    b += `<line x1="${mx}" x2="${mx}" y1="290" y2="${my}" stroke="var(--me)" stroke-width="1.6" fill="none"/>`;
    b += `<line x1="80" x2="${mx}" y1="${my}" y2="${my}" stroke="var(--me)" stroke-width="1.6" fill="none"/>`;
    b += `<circle cx="${mx}" cy="${my}" r="8" fill="var(--hi)" stroke="var(--ink)" stroke-width="2"/>`;
    b += `<rect x="${mx - 30}" y="294" width="60" height="22" fill="var(--me)"/>`;
    b += `<text x="${mx}" y="309" text-anchor="middle" font-size="12" font-weight="600" class="t-m" fill="var(--paper)" style="fill:var(--paper)">${mn(g)}</text>`;
    b += `<rect x="84" y="${my - 22}" width="62" height="18" fill="var(--me)"/>`;
    b += `<text x="115" y="${my - 9}" text-anchor="middle" font-size="12" font-weight="600" class="t-m" fill="var(--paper)" style="fill:var(--paper)">p ${p.toFixed(3)}</text>`;
    return CV.svg(W, H, b, "결합 자유에너지를 결합력 p 로 바꾸는 그래프");
  }
  function v2read(g) {
    const raw = (P0 - g) / 5, p = CV.strength(g, REF);
    const why = raw >= 1 ? "1 보다 크면 1 로 자른다(최고점)" : raw <= 0 ? "0 보다 작으면 0 으로 자른다" : "0~1 사이라 그대로";
    return `p = (기준 ${mn(REF)} + 4.5 − ΔG) ÷ 5<br>= (${mn(P0)} − (${mn(g)})) ÷ 5 = ${mn(P0 - g)} ÷ 5 = ${mn(raw, 3)}<br>→ ${why} → <b class="hl">p = ${p.toFixed(3)}</b>`;
  }
  const V2 = {
    name: "ΔG→p 변환기",
    kind: "변환 그래프 · 슬라이더",
    idea: "결합 자유에너지 ΔG 를 왼쪽(더 음수)으로 밀면 결합력 p 가 0에서 1까지 오르는 꺾은선 위를 표시가 따라 움직인다.",
    learn: "p 는 기준 리간드와 견준 점수다. 기준보다 4.5 약하면 0, 0.5 더 강하면 1 이고, 그 사이는 곧은 선으로 바뀐다.",
    render: () => {
      const g = LEADROW.kcal;
      const pre = DK.concat(HIS ? [HIS] : []).map((d) => `<button type="button" class="vz-btn" data-g="${d.kcal}">${esc(short(d))} ${mn(d.kcal)}</button>`).join("");
      return `<div class="s3-v2-plot">${v2plot(g)}</div>
        <div class="s3-ctl"><label for="s3-v2-dg">ΔG 움직이기 (kcal/mol) — 왼쪽으로 갈수록 더 음수</label>
        <input type="range" class="vz-rng" id="s3-v2-dg" min="-14" max="-4" step="0.01" value="${g}">
        <div class="vz-row">${pre}</div>
        <div class="s3-read" aria-live="polite">${v2read(g)}</div></div>`;
    },
    mount: (el) => {
      const r = el.querySelector("#s3-v2-dg"), plot = el.querySelector(".s3-v2-plot"), rd = el.querySelector(".s3-read");
      const set = (g) => { plot.innerHTML = v2plot(g); rd.innerHTML = v2read(g); };
      const onR = () => set(+r.value);
      r.addEventListener("input", onR);
      const off = bindAll(el, "[data-g]", "click", (e) => { const g = +e.currentTarget.dataset.g; r.value = g; set(g); });
      return () => { r.removeEventListener("input", onR); off(); };
    }
  };

  /* ───────────── 03 자물쇠-열쇠 단면 ───────────── */
  function v3() {
    const W = 880, H = 396;
    const RES = [
      { n: "Trp286", x: 74, y: 76, ax: 160, ay: 92 },
      { n: "Tyr124", x: 278, y: 98, ax: 258, ay: 112 },
      { n: "Phe295", x: 88, y: 172, ax: 177, ay: 182 },
      { n: "Tyr337", x: 270, y: 214, ax: 242, ay: 226 },
      { n: "Trp86", x: 174, y: 316, ax: 210, ay: 302 }
    ];
    const pocket = (ox, title, d, lig, touch, gaps) => {
      let s = `<g transform="translate(${ox},0)">`;
      s += `<text x="10" y="22" font-size="14" font-weight="700">${esc(title)}</text>`;
      s += `<rect x="10" y="40" width="400" height="300" fill="var(--raise)" stroke="var(--line-strong)" stroke-width="1"/>`;
      s += `<polygon points="148,40 272,40 248,150 241,240 233,302 187,302 179,240 172,150" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.4"/>`;
      s += `<text x="210" y="56" text-anchor="middle" font-size="11" class="t-mu">입구</text>`;
      s += `<text x="${gaps.length ? 210 : 166}" y="296" text-anchor="middle" font-size="11" class="t-mu">바닥</text>`;
      RES.forEach((r, i) => {
        const on = touch.includes(i);
        s += `<rect x="${r.x}" y="${r.y}" width="72" height="22" fill="${on ? "var(--hi)" : "var(--surface)"}" stroke="${on ? "var(--ink)" : "var(--line-strong)"}" stroke-width="${on ? 1.6 : 1}"/>`;
        s += `<text x="${r.x + 36}" y="${r.y + 15}" text-anchor="middle" font-size="12" class="t-m" ${on ? 'font-weight="600"' : 'fill="var(--muted)" style="fill:var(--muted)"'}>${r.n}</text>`;
      });
      s += lig;
      gaps.forEach(([x, y]) => { s += `<text x="${x}" y="${y}" text-anchor="middle" font-size="11" font-style="italic" class="t-mu">빈 틈</text>`; });
      s += `<text x="10" y="364" font-size="12.5" class="t-m"><tspan font-weight="600">ΔG ${mn(d.kcal)}</tspan> · p ${f2(d.p)} · 닿는 잔기 ${touch.length}/5</text>`;
      s += `<text x="10" y="384" font-size="12" class="t-mu">${touch.length >= 4 ? "벽 여러 곳에 꼭 맞물림 → 떼기 어렵다" : "벽에 거의 안 닿아 흔들림 → 쉽게 빠진다"}</text>`;
      return s + `</g>`;
    };
    const ct = (x1, y1, r) => `<line x1="${x1}" y1="${y1}" x2="${RES[r].ax}" y2="${RES[r].ay}" stroke="var(--good)" stroke-width="2" stroke-dasharray="4 3" fill="none"/>`;
    /* 도네페질: 인다논(위) — 피페리딘(가운데) — 벤질(아래) */
    let L1 = "";
    L1 += `<line x1="210" y1="104" x2="210" y2="268" stroke="var(--ink)" stroke-width="2.4" fill="none"/>`;
    L1 += `<polygon points="${hex(196, 96, 14, 30)}" fill="var(--film-5)" stroke="var(--ink)" stroke-width="2"/>`;
    L1 += `<polygon points="${poly(217.7, 96, 11.91, 5, 144)}" fill="var(--film-5)" stroke="var(--ink)" stroke-width="2"/>`;
    L1 += `<polygon points="${hex(210, 184, 14, 30)}" fill="var(--film-5)" stroke="var(--ink)" stroke-width="2"/>`;
    L1 += `<polygon points="${hex(210, 266, 14, 30)}" fill="var(--film-5)" stroke="var(--ink)" stroke-width="2"/>`;
    L1 += ct(184, 92, 0) + ct(229, 100, 1) + ct(197, 184, 2) + ct(223, 190, 3) + ct(210, 280, 4);
    /* 히스타민: 작은 이미다졸 + 짧은 사슬, 가운데 둥둥 */
    const hd = HIS || { kcal: -4.7, p: 0 };
    let L2 = "";
    L2 += `<polygon points="${poly(206, 190, 11, 5)}" fill="var(--film-5)" stroke="var(--ink)" stroke-width="2"/>`;
    L2 += `<polyline points="216,186 226,176 222,164" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
    L2 += ct(216, 196, 3);
    const b = pocket(0, `잘 맞는 열쇠 — 도네페질(기준)`, REFROW, L1, [0, 1, 2, 3, 4], [])
      + pocket(450, `헐렁한 열쇠 — ${HIS ? "히스타민" : "작은 분자"}`, hd, L2, [3], [[210, 110], [210, 262]]);
    return `${CV.svg(W, H, b, "자물쇠 주머니 단면에 잘 맞는 분자와 헐렁한 분자를 견준 그림")}
      <p class="vz-note">예시 그림 — 실제 3차원 좌표가 아닌 모식도다. ACHE(아세틸콜린에스테라아제)의 주머니는 깊고 좁은 골짜기 모양이고, 잔기(단백질을 이루는 아미노산) 이름은 4EY7 결합 부위에서 보고된 것이다. 초록 점선 = 분자가 벽에 닿는 곳.</p>`;
  }

  /* ───────────── 04 상호작용 지도(LigPlot 식) ───────────── */
  const IT = {
    pi: { t: "π 쌓임", d: "고리끼리 겹쳐 쌓임", col: "var(--me)" },
    cat: { t: "양이온-π", d: "+전하와 고리가 당김", col: "var(--daon)" },
    hb: { t: "수소결합", d: "H 를 사이에 둔 손잡기", col: "var(--good)" },
    hyd: { t: "소수성 접촉", d: "기름끼리 모임", col: "var(--warn)" }
  };
  const legendLine = (k) => {
    const c = IT[k].col;
    if (k === "pi") return `<svg viewBox="0 0 34 10" aria-hidden="true"><line x1="0" y1="3" x2="34" y2="3" stroke="${c}" stroke-width="2" fill="none"/><line x1="0" y1="7" x2="34" y2="7" stroke="${c}" stroke-width="2" fill="none"/></svg>`;
    if (k === "cat") return `<svg viewBox="0 0 34 10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" stroke="${c}" stroke-width="2.2" stroke-dasharray="8 4" fill="none"/></svg>`;
    if (k === "hb") return `<svg viewBox="0 0 34 10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" stroke="${c}" stroke-width="2.2" stroke-dasharray="3 3" fill="none"/></svg>`;
    return `<svg viewBox="0 0 34 10" aria-hidden="true">${[4, 11, 18, 25, 32].map((x) => `<line x1="${x}" y1="9" x2="${x - 2}" y2="1" stroke="${c}" stroke-width="2" fill="none"/>`).join("")}</svg>`;
  };
  function v4() {
    const W = 860, H = 430;
    const CON = [
      { r: "Trp286", k: "pi", bx: 70, by: 72, tx: 250, ty: 215, note: "입구 쪽" },
      { r: "Phe295", k: "hb", bx: 268, by: 56, tx: 318, ty: 152, note: "C=O 와" },
      { r: "Tyr124", k: "hyd", bx: 70, by: 330, tx: 196, ty: 262, note: "메톡시와" },
      { r: "Tyr337", k: "cat", bx: 378, by: 340, tx: 428, ty: 215, note: "N⁺ 와" },
      { r: "Trp86", k: "pi", bx: 690, by: 100, tx: 600, ty: 215, note: "바닥 쪽" },
      { r: "Tyr341", k: "hyd", bx: 690, by: 330, tx: 612, ty: 240, note: "고리 옆" }
    ];
    let b = "";
    /* 리간드: 도네페질 2D 모식 */
    b += `<g>`;
    b += `<polygon points="${hex(250, 215, 28, 30)}" fill="var(--film-3)" stroke="var(--ink)" stroke-width="2"/>`;
    b += `<polygon points="274.2,201 274.2,229 300,240 314,215 300,190" fill="var(--film-3)" stroke="var(--ink)" stroke-width="2"/>`;
    b += `<line x1="300" y1="190" x2="314" y2="160" stroke="var(--ink)" stroke-width="2" fill="none"/><line x1="305" y1="192" x2="319" y2="162" stroke="var(--ink)" stroke-width="2" fill="none"/>`;
    b += `<text x="318" y="154" text-anchor="middle" font-size="13" font-weight="700" fill="var(--bad)" style="fill:var(--bad)">O</text>`;
    b += `<line x1="225.8" y1="201" x2="204" y2="188" stroke="var(--ink)" stroke-width="2" fill="none"/><text x="200" y="184" text-anchor="end" font-size="12" class="t-m">OCH₃</text>`;
    b += `<line x1="225.8" y1="229" x2="204" y2="244" stroke="var(--ink)" stroke-width="2" fill="none"/><text x="200" y="258" text-anchor="end" font-size="12" class="t-m">OCH₃</text>`;
    b += `<line x1="314" y1="215" x2="372" y2="215" stroke="var(--ink)" stroke-width="2" fill="none"/>`;
    b += `<polygon points="${hex(400, 215, 28, 0)}" fill="var(--film-3)" stroke="var(--ink)" stroke-width="2"/>`;
    b += `<circle cx="428" cy="215" r="11" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.6"/><text x="428" y="219.5" text-anchor="middle" font-size="12" font-weight="700">N⁺</text>`;
    b += `<line x1="439" y1="215" x2="520" y2="215" stroke="var(--ink)" stroke-width="2" fill="none"/>`;
    b += `<line x1="520" y1="215" x2="544" y2="215" stroke="var(--ink)" stroke-width="2" fill="none"/>`;
    b += `<polygon points="${hex(572, 215, 28, 0)}" fill="var(--film-3)" stroke="var(--ink)" stroke-width="2"/>`;
    b += `<circle cx="572" cy="215" r="12" fill="none" stroke="var(--ink)" stroke-width="1.2"/>`;
    b += `<circle cx="250" cy="215" r="12" fill="none" stroke="var(--ink)" stroke-width="1.2"/>`;
    b += `<text x="250" y="160" text-anchor="middle" font-size="11.5" class="t-mu">인다논</text>`;
    b += `<text x="400" y="262" text-anchor="middle" font-size="11.5" class="t-mu">피페리딘</text>`;
    b += `<text x="572" y="264" text-anchor="middle" font-size="11.5" class="t-mu">벤질</text>`;
    b += `</g>`;
    /* 접촉선 + 잔기 상자 */
    CON.forEach((c) => {
      const col = IT[c.k].col, cx = c.bx + 50, cy = c.by + 15;
      let ln = "";
      if (c.k === "pi") {
        const dx = c.tx - cx, dy = c.ty - cy, L = Math.hypot(dx, dy), nx = (-dy / L) * 3, ny = (dx / L) * 3;
        ln = `<line x1="${cx + nx}" y1="${cy + ny}" x2="${c.tx + nx}" y2="${c.ty + ny}" stroke="${col}" stroke-width="2" fill="none"/><line x1="${cx - nx}" y1="${cy - ny}" x2="${c.tx - nx}" y2="${c.ty - ny}" stroke="${col}" stroke-width="2" fill="none"/>`;
      } else if (c.k === "cat") ln = `<line x1="${cx}" y1="${cy}" x2="${c.tx}" y2="${c.ty + 11}" stroke="${col}" stroke-width="2.4" stroke-dasharray="8 4" fill="none"/>`;
      else if (c.k === "hb") ln = `<line x1="${cx}" y1="${cy}" x2="${c.tx}" y2="${c.ty - 14}" stroke="${col}" stroke-width="2.4" stroke-dasharray="3 3" fill="none"/>`;
      else {
        /* 소수성: 잔기 쪽과 분자 쪽에 속눈썹 표시 */
        const fan = (x, y, ang) => [-50, -25, 0, 25, 50].map((a) => { const t = ((ang + a) * Math.PI) / 180; return `<line x1="${x + Math.cos(t) * 8}" y1="${y + Math.sin(t) * 8}" x2="${x + Math.cos(t) * 16}" y2="${y + Math.sin(t) * 16}" stroke="${col}" stroke-width="2" fill="none"/>`; }).join("");
        const a1 = (Math.atan2(c.ty - cy, c.tx - cx) * 180) / Math.PI;
        ln = fan(cx, cy, a1) + fan(c.tx, c.ty, a1 + 180) + `<line x1="${cx}" y1="${cy}" x2="${c.tx}" y2="${c.ty}" stroke="${col}" stroke-width="1" stroke-dasharray="1 4" fill="none"/>`;
      }
      b += `<g data-it="${c.k}">${ln}</g>`;
      b += `<g data-itb="${c.k}"><rect x="${c.bx}" y="${c.by}" width="100" height="30" fill="var(--surface)" stroke="${col}" stroke-width="2"/>
        <text x="${cx}" y="${c.by + 20}" text-anchor="middle" font-size="13" font-weight="600" class="t-m">${c.r}</text>
        <text x="${cx}" y="${c.by < 200 ? c.by - 8 : c.by + 46}" text-anchor="middle" font-size="11" class="t-mu">${esc(IT[c.k].t)} · ${esc(c.note)}</text></g>`;
    });
    b += `<text x="430" y="420" text-anchor="middle" font-size="11.5" class="t-mu">예시 그림 — 4EY7 도네페질 복합체에서 보고된 주요 접촉을 단순화(거리 · 각도는 실제와 다름)</text>`;
    const cnt = (k) => CON.filter((c) => c.k === k).length;
    const btns = Object.keys(IT).map((k) => `<button type="button" class="vz-btn" id="s3-v4-${k}" data-k="${k}" aria-pressed="true">${legendLine(k)}${esc(IT[k].t)} <span class="t-mu">${cnt(k)}</span></button>`).join("");
    return `${CV.svg(W, H, b, "도네페질과 ACHE 잔기 사이의 상호작용 지도")}
      <div class="s3-ctl"><span class="vz-lab">접촉 종류 켜고 끄기</span><div class="s3-leg">${btns}</div>
      <p class="vz-note" aria-live="polite" data-k="cnt">켜진 접촉 ${CON.length}곳 — 접촉이 많고 단단할수록 ΔG 가 더 음수가 된다. ${Object.keys(IT).map((k) => `${IT[k].t}: ${IT[k].d}`).join(" · ")}.</p></div>`;
  }
  const V4mount = (el) => {
    const note = el.querySelector('[data-k="cnt"]'), base = note.textContent.replace(/^켜진 접촉 \d+곳/, "");
    return bindAll(el, ".s3-leg [data-k]", "click", (e) => {
      const b = e.currentTarget, k = b.dataset.k, on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(on));
      el.querySelectorAll(`[data-it="${k}"]`).forEach((g) => (g.style.display = on ? "" : "none"));
      el.querySelectorAll(`[data-itb="${k}"]`).forEach((g) => (g.style.opacity = on ? "" : "0.3"));
      const n = [...el.querySelectorAll("[data-it]")].filter((g) => g.style.display !== "none").length;
      note.textContent = `켜진 접촉 ${n}곳` + base;
    });
  };

  /* ───────────── 05 수심계 눈금 ───────────── */
  function v5() {
    const W = 800, H = 470, yA = 46, k = 27, Y = (g) => yA - g * k, tx = 230;
    let b = `<defs><linearGradient id="s3-v5-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--film-2)"/><stop offset="1" style="stop-color:var(--me)"/></linearGradient></defs>`;
    b += `<rect x="${tx}" y="${yA}" width="34" height="${14 * k}" fill="url(#s3-v5-w)" stroke="var(--ink)" stroke-width="1.4"/>`;
    for (let g = 0; g >= -14; g--) {
      const y = Y(g), big = g % 2 === 0;
      b += `<line x1="${tx - (big ? 12 : 6)}" x2="${tx}" y1="${y}" y2="${y}" stroke="var(--ink)" stroke-width="1" fill="none"/>`;
      if (big) b += `<text x="${tx - 16}" y="${y + 4}" text-anchor="end" font-size="12" class="t-m">${mn(g, 0)}</text>`;
    }
    b += `<text x="${tx + 17}" y="${yA - 12}" text-anchor="middle" font-size="12" class="t-m t-mu">ΔG kcal/mol</text>`;
    b += arrowDef("s3a5", "var(--ink)");
    b += `<text x="20" y="${Y(-1.5)}" font-size="13" font-weight="600">얕다</text><text x="20" y="${Y(-1.5) + 17}" font-size="12" class="t-mu">약하게 붙음</text>`;
    b += `<line x1="40" x2="40" y1="${Y(-3)}" y2="${Y(-11)}" stroke="var(--ink)" stroke-width="1.6" marker-end="url(#s3a5)" fill="none"/>`;
    b += `<text x="20" y="${Y(-12)}" font-size="13" font-weight="600">깊다</text><text x="20" y="${Y(-12) + 17}" font-size="12" class="t-mu">단단히 붙음</text>`;
    const crx = DK.filter(isCRX), cMin = Math.min(...crx.map((d) => d.kcal)), cMax = Math.max(...crx.map((d) => d.kcal));
    const M = [
      { g: 0, t: "0 — 떨어져 있음", s: "", line: false },
      HIS && { g: HIS.kcal, t: `히스타민 ${mn(HIS.kcal)}`, s: "작아서 헐렁함 · p 0", c: "var(--muted)" },
      { g: P0, t: `p = 0 선 ${mn(P0)}`, s: "기준 + 4.5 — 이보다 얕으면 점수 0", c: "var(--bad)", line: true },
      GAL && { g: GAL.kcal, t: `${GAL.name} ${mn(GAL.kcal)}`, s: `겨우 p ${f2(GAL.p)}`, c: "var(--muted)" },
      { g: MED, t: `라이브러리 분자들의 가운데값 ${mn(MED)}`, s: "", c: "var(--muted)" },
      { g: (cMin + cMax) / 2, t: `우리 후보 CRX 4종 ${mn(cMax)} ~ ${mn(cMin)}`, s: "", c: "var(--me)" },
      { g: REF, t: `기준 도네페질 ${mn(REF)}`, s: "실제 쓰이는 약", c: "var(--ink)", line: true },
      { g: P1, t: `p = 1 선 ${mn(P1)}`, s: "기준 − 0.5 — 이보다 깊으면 만점", c: "var(--good)", line: true },
      { g: TRO.kcal, t: `${short(TRO)} ${mn(TRO.kcal)}`, s: "도킹 1위", c: "var(--daon)" },
      TOPC && { g: TOPC.vk[EX.tid], t: `${String(TOPC.n).split(" (")[0]} ${mn(TOPC.vk[EX.tid])}`, s: TOPFAIL >= 0 ? `가장 깊지만 1.2 ${EX.screen.gates[TOPFAIL].label} 관문에서 탈락` : "라이브러리에서 가장 깊음", c: "var(--muted)" }
    ].filter(Boolean);
    const ly = spread(M.map((m) => Y(m.g) + 4), 20);
    M.forEach((m, i) => {
      const y = Y(m.g);
      if (m.line) b += `<line x1="${tx - 4}" x2="${tx + 38}" y1="${y}" y2="${y}" stroke="${m.c}" stroke-width="2" stroke-dasharray="4 3" fill="none"/>`;
      b += `<circle cx="${tx + 17}" cy="${y}" r="4" fill="${m.c || "var(--ink)"}" stroke="var(--paper)" stroke-width="1"/>`;
      b += `<polyline points="${tx + 38},${y} ${tx + 70},${y} ${tx + 90},${ly[i] - 4} ${tx + 96},${ly[i] - 4}" fill="none" stroke="var(--line-strong)" stroke-width="1"/>`;
      b += `<text x="${tx + 100}" y="${ly[i]}" font-size="12.5" font-weight="600" ${m.c ? `fill="${m.c}" style="fill:${m.c}"` : ""}>${esc(m.t)}<tspan font-weight="400" class="t-mu" dx="8">${esc(m.s)}</tspan></text>`;
    });
    return `${CV.svg(W, H, b, "결합 자유에너지 수심계와 여러 분자의 깊이")}
      <p class="vz-note">수심계처럼 아래로 내려갈수록(더 음수일수록) 깊이 잠긴다 = 단단히 붙는다. 점선 두 줄(p=0 · p=1) 사이에서만 점수가 0에서 1로 바뀌고, 기준 도네페질은 그 아래쪽 끝 가까이에 있다.</p>`;
  }

  /* ───────────── 06 주머니 100개 ───────────── */
  const V6M = [TRO, REFROW, GAL, HIS].filter(Boolean);
  function v6grids(lc) {
    const C = Math.pow(10, lc), W = 880, H = 300;
    let b = "";
    V6M.forEach((d, i) => {
      const gx = 20 + i * 218, K = kd(d.kcal), f = C / (C + K), n = Math.round(f * 100);
      b += `<text x="${gx}" y="22" font-size="13.5" font-weight="700">${esc(short(d))}</text>`;
      b += `<text x="${gx}" y="40" font-size="12" class="t-m">ΔG ${mn(d.kcal)} · Kd ${fmtM(K)}</text>`;
      for (let j = 0; j < 100; j++) {
        const x = gx + (j % 10) * 17, y = 54 + Math.floor(j / 10) * 17, on = j < n;
        b += `<rect x="${x}" y="${y}" width="14" height="14" fill="${on ? colOf(d) : "var(--surface)"}" stroke="${on ? colOf(d) : "var(--line-strong)"}" stroke-width="1"/>`;
      }
      b += `<text x="${gx}" y="${54 + 170 + 20}" font-size="15" font-weight="700" class="t-m">${n}<tspan font-size="12" font-weight="400" class="t-mu"> / 100 찼음</tspan></text>`;
      b += `<rect x="${gx}" y="${54 + 170 + 30}" width="167" height="8" fill="var(--raise)"/><rect x="${gx}" y="${54 + 170 + 30}" width="${(167 * f).toFixed(1)}" height="8" fill="${colOf(d)}"/>`;
      b += `<text x="${gx}" y="${54 + 170 + 56}" font-size="11.5" class="t-mu">${n >= 50 ? "절반 넘게 붙잡음" : n >= 1 ? "대부분 비어 있음" : "거의 못 붙음"}</text>`;
    });
    return CV.svg(W, H, b, "같은 양을 넣었을 때 주머니 100개 중 몇 개가 차는지");
  }
  const V6 = {
    name: "주머니 100개",
    kind: "점유 격자 · 슬라이더",
    idea: "주머니(표적 단백질) 100개에 같은 양의 분자를 넣었을 때, ΔG 가 다른 네 분자가 각각 몇 개를 차지하는지 칸으로 보여 준다.",
    learn: "ΔG 가 더 음수인 분자는 아주 적은 양만 넣어도 주머니를 채운다. 그래서 적은 용량으로도 약효를 기대할 수 있다.",
    render: () => `<div class="s3-v6-g">${v6grids(-8)}</div>
      <div class="s3-ctl"><label for="s3-v6-c">넣는 양(농도) — <span class="t-m" data-k="c">${fmtM(1e-8)}</span></label>
      <input type="range" class="vz-rng" id="s3-v6-c" min="-11" max="-3" step="0.05" value="-8">
      <p class="vz-note">차는 비율 = 농도 ÷ (농도 + Kd). Kd(해리 상수)는 주머니가 꼭 절반 차는 농도이고, ΔG = RT ln Kd(298 K) 로 ΔG 에서 바로 구한다. 막대를 오른쪽으로 밀면 양이 10배씩 는다.</p></div>`,
    mount: (el) => {
      const r = el.querySelector("#s3-v6-c"), g = el.querySelector(".s3-v6-g"), lab = el.querySelector('[data-k="c"]');
      const on = () => { g.innerHTML = v6grids(+r.value); lab.textContent = fmtM(Math.pow(10, +r.value)); };
      r.addEventListener("input", on);
      return () => r.removeEventListener("input", on);
    }
  };

  /* ───────────── 07 10배 계단 ───────────── */
  function v7() {
    const W = 880, H = 420, X = (g) => 96 + (-g / 14) * 700, Yl = (l) => 44 - l * 30; /* l = log10 Kd(M), 0 ~ -11 */
    let b = "";
    const bands = [[0, -3, "몰(M) ~ 밀리몰(mM)"], [-3, -6, "마이크로몰(µM)"], [-6, -9, "나노몰(nM)"], [-9, -11, "피코몰(pM)"]];
    bands.forEach(([a, c, t], i) => {
      b += `<rect x="96" y="${Yl(a)}" width="700" height="${Yl(c) - Yl(a)}" fill="${i % 2 ? "var(--surface)" : "var(--raise)"}"/>`;
      b += i ? `<text x="104" y="${Yl(a) + 18}" font-size="11.5" class="t-mu">${t}</text>` : `<text x="790" y="${Yl(a) + 18}" text-anchor="end" font-size="11.5" class="t-mu">${t}</text>`;
    });
    for (let l = 0; l >= -11; l--) {
      b += `<text x="88" y="${Yl(l) + 4}" text-anchor="end" font-size="11.5" class="t-m">${["1", "100", "10"][(-l) % 3]} ${["M", "mM", "mM", "mM", "µM", "µM", "µM", "nM", "nM", "nM", "pM", "pM"][-l]}</text>`;
      b += `<line x1="92" x2="96" y1="${Yl(l)}" y2="${Yl(l)}" stroke="var(--ink)" stroke-width="1" fill="none"/>`;
    }
    for (let g = 0; g >= -14; g -= 2) {
      b += `<line x1="${X(g)}" x2="${X(g)}" y1="${Yl(-11)}" y2="${Yl(-11) + 5}" stroke="var(--ink)" stroke-width="1" fill="none"/>`;
      b += `<text x="${X(g)}" y="${Yl(-11) + 20}" text-anchor="middle" font-size="12" class="t-m">${mn(g, 0)}</text>`;
    }
    b += `<text x="446" y="${Yl(-11) + 40}" text-anchor="middle" font-size="12" class="t-m">ΔG (kcal/mol) → 더 음수</text>`;
    b += `<text x="10" y="24" font-size="12" class="t-m t-mu">Kd — 주머니 절반을 채우는 농도</text>`;
    /* 계단 */
    let d = `M${X(0)},${Yl(0)}`;
    for (let i = 0; i < 10; i++) { const g1 = -(i + 1) * LN10RT; if (g1 < -14) break; d += ` H${X(g1)} V${Yl(-(i + 1))}`; }
    b += `<path d="${d}" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
    b += `<line x1="${X(0)}" y1="${Yl(0)}" x2="${X(-14)}" y2="${Yl(-14 / LN10RT)}" stroke="var(--me)" stroke-width="1.2" stroke-dasharray="4 4" fill="none"/>`;
    /* 한 칸 설명 */
    const s0 = -3 * LN10RT, s1 = -4 * LN10RT;
    b += `<line x1="${X(s0)}" x2="${X(s1)}" y1="${Yl(-3) - 12}" y2="${Yl(-3) - 12}" stroke="var(--bad)" stroke-width="1.4" fill="none"/>`;
    b += `<line x1="${X(s0)}" x2="${X(s0)}" y1="${Yl(-3) - 16}" y2="${Yl(-3) - 8}" stroke="var(--bad)" stroke-width="1.4" fill="none"/><line x1="${X(s1)}" x2="${X(s1)}" y1="${Yl(-3) - 16}" y2="${Yl(-3) - 8}" stroke="var(--bad)" stroke-width="1.4" fill="none"/>`;
    b += `<text x="${(X(s0) + X(s1)) / 2}" y="${Yl(-3) - 22}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--bad)" style="fill:var(--bad)">${f2(LN10RT)} 더 음수</text>`;
    b += `<text x="${X(s1) + 6}" y="${Yl(-3.5) + 4}" font-size="12" font-weight="600" fill="var(--bad)" style="fill:var(--bad)">필요한 양 10배 ↓</text>`;
    const pts = [HIS && [HIS, -1], GAL && [GAL, -1], [REFROW, -1], [TRO, 1]].filter(Boolean);
    pts.forEach(([m, side]) => {
      const K = kd(m.kcal), x = X(m.kcal), y = Yl(Math.log10(K));
      b += `<circle cx="${x}" cy="${y}" r="7" fill="${colOf(m)}" stroke="var(--paper)" stroke-width="1.5"/>`;
      if (side < 0) b += `<text x="${x - 12}" y="${y + 20}" text-anchor="end" font-size="12.5" font-weight="600">${esc(short(m))} <tspan class="t-m" font-weight="400">${fmtM(K)}</tspan></text>`;
      else b += `<text x="${x - 12}" y="${y + 26}" text-anchor="end" font-size="12.5" font-weight="600">${esc(short(m))} <tspan class="t-m" font-weight="400">${fmtM(K)}</tspan></text>`;
    });
    const ug = kd(REF) * 379.5 * 1e6;
    return `${CV.svg(W, H, b, "결합 자유에너지와 해리 상수의 10배 계단")}
      <p class="vz-note">ΔG = RT ln Kd (R = 기체 상수, T = 298 K, RT ≈ ${f2(RT * 1)} kcal/mol). ΔG 가 ${f2(LN10RT)} 더 음수가 될 때마다 필요한 양이 10배 줄어든다. 기준 도네페질의 Kd ${fmtM(kd(REF))} 는 물 1 L 에 약 ${f2(ug)} µg(1 g 의 백만분의 ${f2(ug)})만 녹아 있어도 주머니 절반이 찬다는 뜻이다(계산값).</p>`;
  }

  /* ───────────── 08 재도킹 RMSD 겹쳐 보기 ───────────── */
  const V8 = (() => {
    const A = [];
    const ring = (cx, cy, r = 1.4, rot = 30) => { const s = A.length; for (let i = 0; i < 6; i++) { const a = ((60 * i + rot) * Math.PI) / 180; A.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return s; };
    const ra = ring(-6.2, 0, 1.4, 0), extra1 = A.push([-7.8, 2.6]) - 1, extra2 = A.push([-7.8, -2.6]) - 1;
    const l1 = A.push([-3.9, 0.9]) - 1, l2 = A.push([-2.6, 0]) - 1;
    const rb = ring(0, 0, 1.4, 0), l3 = A.push([2.6, 0]) - 1, l4 = A.push([3.6, 0.9]) - 1;
    const rc = ring(6, 0.9, 1.4, 0);
    const B = [];
    [ra, rb, rc].forEach((s) => { for (let i = 0; i < 6; i++) B.push([s + i, s + ((i + 1) % 6)]); });
    B.push([ra + 2, extra1], [ra + 4, extra2], [ra + 0, l1], [l1, l2], [l2, rb + 3], [rb + 0, l3], [l3, l4], [l4, rc + 3]);
    const R0 = CV.rng(11), V = A.map(() => { const t = R0() * Math.PI * 2, m = 0.5 + R0(); return [Math.cos(t) * m, Math.sin(t) * m]; });
    const sh = [0.35, -0.2]; /* 조금 통째로 밀린 성분 */
    const Vt = V.map(([x, y]) => [x + sh[0], y + sh[1]]);
    const rms0 = Math.sqrt(Vt.reduce((s, [x, y]) => s + x * x + y * y, 0) / Vt.length);
    return { A, B, Vt, rms0 };
  })();
  function v8plot(r) {
    const W = 860, H = 330, s = 26, ox = 270, oy = 150;
    const P = (a) => [ox + a[0] * s, oy - a[1] * s];
    const k = r / V8.rms0, D = V8.A.map((a, i) => [a[0] + V8.Vt[i][0] * k, a[1] + V8.Vt[i][1] * k]);
    const ok = r <= 2;
    let b = `<rect x="10" y="20" width="520" height="270" fill="var(--paper)" stroke="var(--line)" stroke-width="1"/>`;
    b += `<defs><clipPath id="s3-v8-clip"><rect x="11" y="21" width="518" height="268"/></clipPath></defs><g clip-path="url(#s3-v8-clip)">`;
    const draw = (pts, col, w, dash) => V8.B.map(([i, j]) => { const [x1, y1] = P(pts[i]), [x2, y2] = P(pts[j]); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ""} fill="none"/>`; }).join("") +
      pts.map((a) => { const [x, y] = P(a); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="${col}"/>`; }).join("");
    b += V8.A.map((a, i) => { const [x1, y1] = P(a), [x2, y2] = P(D[i]); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--bad)" stroke-width="1" fill="none"/>`; }).join("");
    b += draw(V8.A, "var(--ink)", 3, "");
    b += draw(D, "var(--me)", 2, "5 3");
    b += `</g>`;
    b += `<line x1="24" x2="${24 + s}" y1="276" y2="276" stroke="var(--ink)" stroke-width="2" fill="none"/><line x1="24" x2="24" y1="271" y2="281" stroke="var(--ink)" stroke-width="2" fill="none"/><line x1="${24 + s}" x2="${24 + s}" y1="271" y2="281" stroke="var(--ink)" stroke-width="2" fill="none"/>`;
    b += `<text x="${24 + s + 6}" y="280" font-size="12" class="t-m">1 Å</text>`;
    b += `<line x1="24" x2="44" y1="36" y2="36" stroke="var(--ink)" stroke-width="3" fill="none"/><text x="50" y="40" font-size="12">결정구조 속 원래 자리(정답)</text>`;
    b += `<line x1="250" x2="270" y1="36" y2="36" stroke="var(--me)" stroke-width="2" stroke-dasharray="5 3" fill="none"/><text x="276" y="40" font-size="12">다시 도킹한 자리</text>`;
    b += `<line x1="410" x2="426" y1="36" y2="36" stroke="var(--bad)" stroke-width="1" fill="none"/><text x="432" y="40" font-size="12">어긋남</text>`;
    /* 게이지 */
    const gy = (v) => 280 - (Math.min(v, 4) / 4) * 240, gx = 600;
    b += `<rect x="${gx}" y="${gy(2)}" width="40" height="${gy(0) - gy(2)}" fill="var(--good-bg)" stroke="var(--line-strong)" stroke-width="1"/>`;
    b += `<rect x="${gx}" y="${gy(4)}" width="40" height="${gy(2) - gy(4)}" fill="var(--bad-bg)" stroke="var(--line-strong)" stroke-width="1"/>`;
    [0, 1, 2, 3, 4].forEach((v) => { b += `<text x="${gx - 8}" y="${gy(v) + 4}" text-anchor="end" font-size="12" class="t-m">${v} Å</text>`; });
    b += `<line x1="${gx - 4}" x2="${gx + 64}" y1="${gy(2)}" y2="${gy(2)}" stroke="var(--ink)" stroke-width="1.6" stroke-dasharray="5 3" fill="none"/>`;
    b += `<text x="${gx + 68}" y="${gy(2) + 4}" font-size="12" font-weight="600">기준 2 Å</text>`;
    b += `<text x="${gx + 48}" y="${gy(1) + 4}" font-size="11.5" fill="var(--good)" style="fill:var(--good)">믿을 만함</text>`;
    b += `<text x="${gx + 48}" y="${gy(3) + 4}" font-size="11.5" fill="var(--bad)" style="fill:var(--bad)">방법 다시</text>`;
    b += `<polygon points="${gx - 2},${gy(r)} ${gx - 14},${gy(r) - 7} ${gx - 14},${gy(r) + 7}" fill="var(--me)"/>`;
    b += `<rect x="${gx}" y="${gy(r) - 2}" width="40" height="4" fill="var(--me)"/>`;
    b += `<text x="${gx + 20}" y="22" text-anchor="middle" font-size="12" class="t-m t-mu">RMSD</text>`;
    b += `<text x="${gx + 20}" y="312" text-anchor="middle" font-size="13" font-weight="700" fill="${ok ? "var(--good)" : "var(--bad)"}" style="fill:${ok ? "var(--good)" : "var(--bad)"}">${f2(r)} Å ${ok ? "≤ 2 → 통과 ✓" : "> 2 → 실패 ✕"}</text>`;
    return CV.svg(W, H, b, "재도킹 자세와 결정구조 자세를 겹친 그림과 RMSD 게이지");
  }

  /* ───────────── 09 점수 카드 ───────────── */
  function v9() {
    const cards = DK.map((d, i) => {
      const tro = d === TRO, lead = EX.lead && d.id === EX.lead.id;
      const tag = d.ref ? "기준 리간드 · 실제 쓰이는 약" : isCRX(d) ? "ACHE 를 겨냥해 설계(사내 합성)" : "당뇨약 — PPAR 작용제";
      return `<div class="s3-card ${tro ? "warn" : ""}">
        <div class="top"><span class="rk">#${i + 1}</span><span class="vz-chip">${esc(d.ref ? "기준" : isCRX(d) ? d.id : "ChEMBL 승인약")}</span></div>
        ${CV.mol(d.c.s, 220, 140)}
        <h4>${esc(d.ref ? "도네페질 (기준)" : d.name)}</h4>
        <div class="g">${mn(d.kcal)} <small>kcal/mol</small></div>
        <div class="pb" aria-hidden="true"><i style="width:${(d.p * 100).toFixed(1)}%"></i></div>
        <div class="pt">결합력 p ${f2(d.p)}</div>
        <p>${esc(tag)}</p>
        ${tro ? `<span class="stamp">점수 1위 ≠ 리드</span><p>ACHE 가 아니라 PPAR(당 대사 수용체)을 겨냥해 만든 약이다. 실제로는 간 손상 때문에 2000년 미국 시장에서 철수했다.</p>` : ""}
        ${lead ? `<span class="vz-sig good">● 2.2 에서 리드로 뽑힘</span>` : ""}
      </div>`;
    }).join("");
    return `<div class="s3-cards">${cards}</div>
      <p class="vz-note">도킹 점수는 컴퓨터가 계산한 <b>예측</b>이지 실험으로 잰 값이 아니다. 1위 분자도 '무엇을 겨냥해 만들었나', '몸속에서 안전한가'를 따로 봐야 한다.</p>`;
  }

  /* ───────────── 10 순위의 함정 ───────────── */
  function v10() {
    const W = 800, H = 380, lo = -12.95, hi = -11.7, Yr = (i) => 76 + i * 52, Yg = (g) => 66 + ((g - lo) / (hi - lo)) * 268, xL = 300, xR = 560;
    let b = "";
    b += `<text x="${xL}" y="30" text-anchor="middle" font-size="13" font-weight="700">순위표</text><text x="${xL}" y="48" text-anchor="middle" font-size="11.5" class="t-mu">늘 같은 간격으로 보인다</text>`;
    b += `<text x="${xR}" y="30" text-anchor="middle" font-size="13" font-weight="700">실제 ΔG 눈금</text><text x="${xR}" y="48" text-anchor="middle" font-size="11.5" class="t-mu">간격 그대로</text>`;
    b += `<line x1="${xR}" x2="${xR}" y1="${Yg(lo)}" y2="${Yg(hi)}" stroke="var(--ink)" stroke-width="1.4" fill="none"/>`;
    for (let g = -12.9; g <= -11.69; g += 0.2) {
      b += `<line x1="${xR}" x2="${xR + 6}" y1="${Yg(g)}" y2="${Yg(g)}" stroke="var(--ink)" stroke-width="1" fill="none"/>`;
      b += `<text x="${xR + 10}" y="${Yg(g) + 4}" font-size="11.5" class="t-m t-mu">${mn(g, 1)}</text>`;
    }
    DK.forEach((d, i) => {
      const yl = Yr(i), yr = Yg(d.kcal), c = colOf(d);
      b += `<line x1="${xL + 8}" y1="${yl}" x2="${xR - 8}" y2="${yr}" stroke="${c}" stroke-width="${d.ref ? 2 : 1.5}" ${d.ref ? 'stroke-dasharray="5 3"' : ""} fill="none"/>`;
      b += `<circle cx="${xL}" cy="${yl}" r="7" fill="${c}"/><circle cx="${xR}" cy="${yr}" r="5" fill="${c}" stroke="var(--paper)" stroke-width="1"/>`;
      b += `<text x="${xL - 16}" y="${yl + 4}" text-anchor="end" font-size="12.5" font-weight="600">${i + 1}위 ${esc(short(d))} <tspan class="t-m" font-weight="400">${mn(d.kcal)}</tspan></text>`;
      if (i > 0) {
        const gap = d.kcal - DK[i - 1].kcal;
        b += `<text x="${xL - 16}" y="${(Yr(i - 1) + yl) / 2 + 4}" text-anchor="end" font-size="11" class="t-m" fill="${gap > 0.5 ? "var(--bad)" : "var(--muted)"}" style="fill:${gap > 0.5 ? "var(--bad)" : "var(--muted)"}">↕ ${f2(gap)}</text>`;
      }
    });
    const rest = DK.slice(1), ya = Yg(Math.min(...rest.map((d) => d.kcal))), yb = Yg(Math.max(...rest.map((d) => d.kcal)));
    const span = Math.max(...rest.map((d) => d.kcal)) - Math.min(...rest.map((d) => d.kcal));
    b += `<path d="M${xR + 56},${ya - 4} h8 V${yb + 4} h-8" fill="none" stroke="var(--ink)" stroke-width="1.4"/>`;
    b += `<text x="${xR + 72}" y="${(ya + yb) / 2 - 4}" font-size="12" font-weight="600">2~6위 5개가</text><text x="${xR + 72}" y="${(ya + yb) / 2 + 12}" font-size="12" font-weight="600">${f2(span)} 안에 몰림</text>`;
    b += `<text x="${xR + 72}" y="${Yg(TRO.kcal) + 4}" font-size="12" class="t-mu">혼자 ${f2(rest[0].kcal - TRO.kcal)} 앞섬</text>`;
    return `${CV.svg(W, H, b, "도킹 순위표와 실제 결합 자유에너지 간격을 잇는 기울기 그림")}
      <p class="vz-note">순위만 보면 2위와 6위가 멀어 보이지만 실제 차이는 ${f2(span)} kcal/mol 뿐이다. 도킹 점수는 계산으로 얻은 예측이라 이렇게 작은 차이로는 순서를 믿기 어렵다. 그래서 '기준 근처인가'만 보고, 진짜 고르기는 다음 단계(ADMET)에서 다른 잣대로 한다.</p>`;
  }

  window.VIZ[3] = [
    {
      name: "에너지 우물",
      kind: "실물 은유 · 작은 배수",
      idea: "분자마다 ΔG 만큼 깊은 우물을 파고 공을 바닥에 놓아, 음수가 클수록 우물이 깊다는 것을 한 줄로 견준다.",
      learn: "ΔG 는 음수일수록(우물이 깊을수록) 떼어 내기 어렵다 = 더 단단히 붙는다.",
      render: v1
    },
    V2,
    {
      name: "자물쇠-열쇠 단면",
      kind: "실물 은유 · 단면도",
      idea: "ACHE 의 깊은 골짜기 주머니를 잘라 보고, 꼭 맞는 도네페질과 헐렁한 히스타민이 벽에 몇 곳 닿는지 견준다.",
      learn: "주머니 벽 여러 곳에 맞물리는 분자일수록 ΔG 가 더 음수가 된다. 작고 헐렁한 분자는 거의 점수가 없다.",
      render: v3
    },
    {
      name: "상호작용 지도",
      kind: "2D 상호작용도 · 켜고 끄기",
      idea: "LigPlot 처럼 도네페질을 가운데 두고 ACHE 잔기 6곳과의 접촉을 종류별 선으로 그린 뒤, 종류마다 켜고 꺼 본다.",
      learn: "결합은 여러 작은 당김(π 쌓임 · 수소결합 · 양이온-π · 소수성)이 모인 것이고, 그 합이 ΔG 다.",
      render: v4,
      mount: V4mount
    },
    {
      name: "수심계 눈금",
      kind: "세로 게이지 · 이정표",
      idea: "0 에서 −14 까지 한 수심계에 히스타민 · p=0 선 · 라이브러리 가운데값 · 기준 · 도킹 1위를 이정표처럼 꽂는다.",
      learn: "우리 후보가 220종 전체에서 얼마나 깊은 자리에 있는지, 그리고 점수가 매겨지는 구간(p=0 ~ p=1)이 어디인지 안다.",
      render: v5
    },
    V6,
    {
      name: "10배 계단",
      kind: "로그 눈금 · 계단",
      idea: "ΔG 를 해리 상수 Kd 로 바꿔, ΔG 가 1.36 더 음수가 될 때마다 필요한 양이 10배씩 줄어드는 계단을 그린다.",
      learn: "ΔG 의 작은 차이가 '얼마나 적은 양으로 붙는가'에서는 몇 배 차이가 된다(로그 관계).",
      render: v7
    },
    {
      name: "RMSD 겹쳐 보기",
      kind: "겹침 비교 · 슬라이더",
      idea: "결정구조 속 기준 리간드 자리와 다시 도킹한 자리를 겹치고, 어긋남(RMSD)을 밀어 보며 2 Å 기준을 넘는지 본다.",
      learn: "재도킹 RMSD 0.82 Å ≤ 2 Å 이면 이 도킹 방법이 정답 자리를 찾아낸다는 뜻이라, 다른 분자의 점수도 믿고 쓴다.",
      render: () => `<div class="s3-v8-p">${v8plot(T.rmsd)}</div>
        <div class="s3-ctl"><label for="s3-v8-r">어긋남(RMSD) 바꿔 보기 — <span class="t-m" data-k="r">${f2(T.rmsd)} Å</span></label>
        <input type="range" class="vz-rng" id="s3-v8-r" min="0" max="4" step="0.01" value="${T.rmsd}">
        <div class="vz-row"><button type="button" class="vz-btn" id="s3-v8-real">실제 값 ${f2(T.rmsd)} Å (${esc(T.pdb)})</button></div>
        <p class="vz-note">재도킹 = 결정구조에 이미 들어 있던 기준 리간드를 빼냈다가 다시 도킹해서 원래 자리를 찾는지 보는 시험. RMSD(평균 어긋남) = √(원자마다 어긋난 거리² 의 평균). 원자 위치는 모식(예시)이고, RMSD 값은 그린 점에서 그대로 계산했다.</p></div>`,
      mount: (el) => {
        const r = el.querySelector("#s3-v8-r"), p = el.querySelector(".s3-v8-p"), lab = el.querySelector('[data-k="r"]'), bt = el.querySelector("#s3-v8-real");
        const set = (v) => { p.innerHTML = v8plot(v); lab.textContent = `${f2(v)} Å`; };
        const on = () => set(+r.value), rb = () => { r.value = T.rmsd; set(T.rmsd); };
        r.addEventListener("input", on); bt.addEventListener("click", rb);
        return () => { r.removeEventListener("input", on); bt.removeEventListener("click", rb); };
      }
    },
    {
      name: "점수 카드",
      kind: "카드 · 구조식",
      idea: "도킹한 6분자를 구조식 · ΔG · 결합력 p · 출신(무엇을 겨냥한 분자인가)이 적힌 카드로 늘어놓는다.",
      learn: "점수는 예측이지 측정이 아니다. 도킹 1위 Troglitazone 은 당뇨약이라 ACHE 리드가 될 수 없다.",
      render: v9
    },
    {
      name: "순위의 함정",
      kind: "기울기 그림 · 간격 비교",
      idea: "같은 간격의 순위표와 실제 ΔG 눈금을 선으로 이어, 2~6위가 0.1 kcal/mol 안에 몰려 있음을 드러낸다.",
      learn: "순위만 보면 차이가 커 보이지만 실제 간격은 아주 작다. 작은 점수 차이로 줄 세우지 말고 기준과 견준다.",
      render: v10
    }
  ];
})();
