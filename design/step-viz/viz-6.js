/* 3.2 제형 · IND 신청 — 시각화 시안 10종 */
(function () {
  "use strict";
  const CV = window.CV, { EX, esc, f1, f2, R } = CV;
  const T = EX.t, L = EX.lead, P = EX.program, I = EX.ind, B0 = EX.base, TID = EX.tid;
  const FORMS = ["oral", "iv", "transdermal"], DOSES = [10, 50, 100];
  const FS = { oral: "경구", iv: "정맥", transdermal: "경피" };
  const TH = R.th;
  const M = (v) => `$${v.toFixed(3)}M`;
  const tx = (x, y, s, a = "") => `<text x="${x}" y="${y}" ${a}>${esc(s)}</text>`;
  const G = (f, d) => EX.grid.find((g) => g.form === f && g.dose === d);
  const sc = (f, d, c = L.c, kcal = L.kcal, pop = I.pop) => CV.score(c, kcal, TID, f, d, pop);
  /* 흔들림 전 예상 점수로 어디까지 갈 수 있나 */
  function reach(E, S) {
    if (S < TH.ind.s) return { k: 0, t: "IND 보류", tone: "bad" };
    if (S < TH.phase1.s) return { k: 1, t: "IND까지", tone: "warn" };
    if (E < TH.phase2.e) return { k: 2, t: "1상까지", tone: "warn" };
    if (E < TH.phase3.e || S < TH.phase3.s) return { k: 3, t: "2상까지", tone: "warn" };
    return { k: 4, t: "3상까지", tone: "good" };
  }
  const gates = (E, S) => [
    ["IND", `S ≥ ${TH.ind.s}`, S >= TH.ind.s],
    ["1상", `S ≥ ${TH.phase1.s}`, S >= TH.phase1.s],
    ["2상", `E ≥ ${TH.phase2.e}`, E >= TH.phase2.e],
    ["3상", `E ≥ ${TH.phase3.e} · S ≥ ${TH.phase3.s}`, E >= TH.phase3.e && S >= TH.phase3.s]
  ];
  const lamps = (E, S) => gates(E, S).map(([a, b, ok]) => `<span class="vz-sig ${ok ? "good" : "bad"}">${ok ? "✓" : "✕"} ${a} · ${b}</span>`).join("");
  /* 모양으로도 제형 구분: 경구 원 · 정맥 네모 · 경피 세모 */
  const shape = (f, x, y, r, fill, stroke = "var(--ink)", sw = 1.6) =>
    f === "oral" ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
      : f === "iv" ? `<rect x="${x - r * 0.9}" y="${y - r * 0.9}" width="${r * 1.8}" height="${r * 1.8}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
      : `<path d="M${x} ${y - r * 1.1} L${x + r * 1.05} ${y + r * 0.75} L${x - r * 1.05} ${y + r * 0.75} Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  const FCOL = { oral: "var(--me)", iv: "var(--daon)", transdermal: "var(--seum)" };
  const rk = B0.parts.Rk;

  CV.css("s6", `
    .s6-ctl { display: grid; gap: 10px; }
    .s6-ctl .vz-row > .vz-lab { min-width: 64px; }
    .s6-ctl select { font: inherit; font-size: 13px; padding: 5px 8px; border: 1px solid var(--line-strong); background: var(--paper); border-radius: 0; max-width: 100%; }
    .s6-f { min-width: 0; font-family: var(--mono); font-size: 12.5px; background: var(--paper); border: 1px solid var(--line); padding: 10px 12px; display: grid; gap: 4px; overflow-x: auto; }
    .s6-f div { white-space: nowrap; }
    .s6-f b { font-weight: 600; }
    .s6-f .hl { background: var(--hi); padding: 0 3px; }
    .s6-doc { border: 1px solid var(--line-strong); background: var(--paper); padding: 16px 18px; display: grid; gap: 12px; position: relative; }
    .s6-doc h3 { margin: 0; font-family: var(--serif); font-size: 19px; }
    .s6-ck { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; }
    .s6-ck li { display: grid; grid-template-columns: 22px minmax(92px, max-content) minmax(0, 1fr); gap: 4px 10px; padding: 7px 0; border-bottom: 1px dashed var(--line); align-items: baseline; font-size: 13px; }
    .s6-ck li > b:first-child { width: 18px; height: 18px; display: inline-grid; place-items: center; background: var(--good); color: var(--paper); font-size: 11px; }
    .s6-ck li span { color: var(--muted); font-size: 12px; }
    .s6-ck li em { font-style: normal; font-family: var(--mono); font-size: 12.5px; overflow-wrap: anywhere; }
    .s6-stamp { position: absolute; right: 14px; top: 10px; width: 96px; transform: rotate(-10deg); pointer-events: none; opacity: 0.92; }
    .s6-memo { border-left: 4px solid var(--warn); background: var(--warn-bg); padding: 10px 12px; font-size: 13px; display: grid; gap: 4px; }
    .s6-memo b { color: var(--warn); }
    .s6-cap { font-size: 13.5px; margin: 0; min-height: 2.6em; }
    .s6-beam, .s6-pan { transition: transform 0.55s cubic-bezier(.3,.7,.3,1); transform-box: view-box; }
    @media (prefers-reduced-motion: reduce) { .s6-beam, .s6-pan { transition: none; } }
  `);

  /* ── 04 시소 몸통 ── */
  const SEE = { cx: 380, cy: 196, half: 220 };
  function seeState(f, d) {
    const r = sc(f, d), th = Math.max(-20, Math.min(20, -(r.E - r.S) * 0.3));
    const a = (th * Math.PI) / 180;
    const L1 = [SEE.cx - SEE.half * Math.cos(a), SEE.cy - SEE.half * Math.sin(a)], R1 = [SEE.cx + SEE.half * Math.cos(a), SEE.cy + SEE.half * Math.sin(a)];
    return { r, th, L1, R1 };
  }
  function seeBody(f, d) {
    const { r, th, L1, R1 } = seeState(f, d);
    const pan = (id, p, v, lab, col) => {
      const h = Math.max(4, v * 0.62);
      return `<g class="s6-pan" id="${id}" style="transform:translate(${f1(p[0])}px,${f1(p[1])}px)">
        <path d="M0 0 L-46 46 M0 0 L46 46" stroke="var(--line-strong)" stroke-width="1.2"/>
        <rect data-blk x="-34" y="${46 - h}" width="68" height="${h}" fill="${col}"/>
        <path d="M-52 46 H52" stroke="var(--ink)" stroke-width="3"/>
        <text data-val x="0" y="66" text-anchor="middle" font-size="14" font-weight="700" class="t-m">${esc(lab + " " + f1(v))}</text></g>`;
    };
    const yS = CV.scale([0, 100], [330, 40]);
    const scaleBar = (x, v, lab, ths, anchor) => `<rect x="${x - 5}" y="40" width="10" height="290" fill="var(--raise)" stroke="var(--line)"/>
      ${ths.map(([k, t]) => `<path d="M${x - 14} ${yS(t)} H${x + 14}" stroke="var(--ink)" stroke-dasharray="3 2"/>${tx(anchor === "end" ? x - 18 : x + 18, yS(t) + 4, `${k} ${t}`, `font-size="11" class="t-m" text-anchor="${anchor}"`)}`).join("")}
      <rect data-bar x="${x - 5}" y="${yS(v)}" width="10" height="${330 - yS(v)}" fill="var(--ink)"/>
      ${tx(x, 26, lab, `font-size="12.5" font-weight="600" text-anchor="middle"`)}${tx(x, 350, "0", `font-size="11" class="t-m t-mu" text-anchor="middle"`)}`;
    return `${scaleBar(50, r.E, "효능 E", [["2상", TH.phase2.e], ["3상", TH.phase3.e]], "start")}
      ${scaleBar(710, r.S, "안전 S", [["IND", TH.ind.s], ["1상", TH.phase1.s], ["3상", TH.phase3.s]], "end")}
      <path d="M${SEE.cx} ${SEE.cy} L${SEE.cx - 30} ${SEE.cy + 70} H${SEE.cx + 30} Z" fill="var(--ink)"/>
      <path d="M${SEE.cx - 150} ${SEE.cy + 70} H${SEE.cx + 150}" stroke="var(--ink)" stroke-width="2"/>
      <text id="s6-v4-dose" x="${SEE.cx}" y="${SEE.cy + 94}" text-anchor="middle" font-size="14" font-weight="700" class="t-m">${esc(`${FS[f]} ${d} mg`)}</text>
      <g class="s6-beam" id="s6-v4-beam" style="transform-origin:${SEE.cx}px ${SEE.cy}px;transform:rotate(${f1(th)}deg)">
        <rect x="${SEE.cx - SEE.half}" y="${SEE.cy - 5}" width="${SEE.half * 2}" height="10" fill="var(--muted)"/></g>
      <circle cx="${SEE.cx}" cy="${SEE.cy}" r="6" fill="var(--hi)" stroke="var(--ink)" stroke-width="2"/>
      ${pan("s6-v4-pl", L1, r.E, "E", "var(--me)")}${pan("s6-v4-pr", R1, r.S, "S", "var(--good)")}`;
  }

  /* ── 06 혈중 농도 곡선 몸통 ── */
  function pkBody(dose) {
    const W = 760, x = CV.scale([0, 24], [70, 604]), y = CV.scale([0, 72], [300, 30]);
    const Dt = R.doseT[dose];
    const shapeF = {
      iv: (t) => (t < 0.15 ? t / 0.15 : Math.exp(-(t - 0.15) / 5)),
      oral: (t) => { const v = (u) => Math.exp(-0.2 * u) - Math.exp(-1.2 * u); const tm = Math.log(6) / 1; return v(t) / v(tm); },
      transdermal: (t) => (1 - Math.exp(-t / 3)) / (1 - Math.exp(-8))
    };
    const lim = [["IND 한계", 65 / rk, "var(--bad)"], ["1상 한계", 50 / rk, "var(--warn)"], ["3상 한계", 45 / rk, "var(--good)"]];
    const curves = FORMS.map((f) => {
      const pk = Dt * R.peak[f];
      const pts = Array.from({ length: 97 }, (_, i) => i / 4).map((t) => `${f1(x(t))},${f1(y(pk * Math.min(1, shapeF[f](t))))}`);
      const tPk = f === "iv" ? 0.15 : f === "oral" ? Math.log(6) : 24;
      const dash = f === "oral" ? "" : f === "iv" ? 'stroke-dasharray="7 4"' : 'stroke-dasharray="2 3"';
      const lx = f === "transdermal" ? x(24) - 4 : x(tPk) + 10, anchor = f === "transdermal" ? "end" : "start";
      const ly = f === "transdermal" ? y(pk) - 8 : y(pk) + (f === "iv" ? 5 : 2);
      return `<polyline points="${pts.join(" ")}" fill="none" stroke="${FCOL[f]}" stroke-width="2.4" ${dash}/>
        ${shape(f, x(tPk), y(pk), 5, FCOL[f], "var(--ink)", 1)}
        ${tx(lx, ly, `${FS[f]} 꼭대기 ${f1(pk)} = ${Dt} × ${R.peak[f].toFixed(2)}`, `font-size="12" font-weight="600" text-anchor="${anchor}" style="fill:${FCOL[f]}"`)}`;
    }).join("");
    const grid = [0, 20, 40, 60].map((v) => `<path d="M70 ${y(v)} H604" stroke="var(--line)"/>${tx(62, y(v) + 4, v, `font-size="11" class="t-m t-mu" text-anchor="end"`)}`).join("");
    const xt = [0, 6, 12, 18, 24].map((t) => `${tx(x(t), 318, t + "시간", `font-size="11" class="t-m t-mu" text-anchor="middle"`)}`).join("");
    const limits = lim.map(([k, v, c], i) => `<path d="M70 ${f1(y(v))} H604" stroke="${c}" stroke-width="1.4" stroke-dasharray="6 4"/>${tx(610, y(v) + (i === 0 ? 4 : i === 1 ? -2 : 11), `${k} ${f1(v)}`, `font-size="11.5" class="t-m" style="fill:${c}"`)}`).join("");
    return `${grid}${xt}${limits}<path d="M70 30 V300 H604" fill="none" stroke="var(--ink)"/>
      ${tx(70, 18, "몸이 받는 독성 부담 (규칙 Dt × K)", `font-size="12" class="t-mu"`)}${curves}`;
  }

  window.VIZ[6] = [
    /* ── 01 열지도 3 × 3 ── */
    {
      name: "3×3 열지도",
      kind: "열지도 · 관문 판정",
      idea: "제형 3 × 용량 3 = 9칸마다 효능 E · 안전 S 를 막대로 넣고, 흔들림 전 점수로 어느 관문까지 갈 수 있는지 칸 색과 글자로 적습니다.",
      learn: "오른쪽(용량 큰 쪽)으로 갈수록 E 는 오르고 S 는 떨어진다 — 9칸 중 끝까지 갈 수 있는 칸은 따로 있다.",
      render: () => {
        const W = 760, lx = 128, cw = 206, ch = 112, top = 50, H = top + ch * 3 + 34;
        const bar = (x, y, v, lab, ths) => { const s = CV.scale([0, 100], [x, x + 124]);
          return `${tx(x - 4, y + 9, lab, `font-size="11.5" class="t-m" text-anchor="end"`)}<rect x="${x}" y="${y}" width="124" height="10" fill="var(--paper)" stroke="var(--line)"/>
            <rect x="${x}" y="${y}" width="${s(v) - x}" height="10" fill="var(--ink)"/>
            ${ths.map((t) => `<path d="M${s(t)} ${y - 3} V${y + 13}" stroke="var(--bad)" stroke-width="1.4"/>`).join("")}
            ${tx(x + 130, y + 9, f1(v), `font-size="12" class="t-m" font-weight="600"`)}`; };
        const cells = FORMS.map((f, ri) => DOSES.map((d, ci) => {
          const g = G(f, d), r = reach(g.E, g.S), x = lx + ci * cw, y = top + ri * ch, me = f === I.form && d === I.dose;
          return `<rect x="${x + 2}" y="${y + 2}" width="${cw - 4}" height="${ch - 4}" fill="var(--${r.tone}-bg)" stroke="${me ? "var(--ink)" : "var(--line)"}" stroke-width="${me ? 3 : 1}"/>
            ${tx(x + 12, y + 24, `${r.tone === "good" ? "●" : r.tone === "warn" ? "◐" : "✕"} ${r.t}`, `font-size="13" font-weight="700" style="fill:var(--${r.tone})"`)}
            ${me ? tx(x + cw - 10, y + 24, "우리 선택", `font-size="11.5" font-weight="700" text-anchor="end" class="t-m"`) : ""}
            ${bar(x + 28, y + 42, g.E, "E", [TH.phase2.e, TH.phase3.e])}${bar(x + 28, y + 70, g.S, "S", [TH.ind.s, TH.phase1.s, TH.phase3.s])}`;
        }).join("")).join("");
        const rowH = FORMS.map((f, ri) => { const s = CV.signals(L.c), A = f === "iv" ? 1 : f === "oral" ? R.absorption.oral[s.oral] : R.absorption.transdermal[s.td];
          return `${tx(12, top + ri * ch + 48, CV.FORM_SHORT[f], `font-size="14" font-weight="700"`)}${tx(12, top + ri * ch + 68, `흡수 A ${A.toFixed(2)}`, `font-size="11.5" class="t-m t-mu"`)}${tx(12, top + ri * ch + 84, `피크 K ×${R.peak[f].toFixed(2)}`, `font-size="11.5" class="t-m t-mu"`)}`; }).join("");
        const colH = DOSES.map((d, ci) => `${tx(lx + ci * cw + cw / 2, 22, `${d} mg`, `font-size="15" font-weight="700" text-anchor="middle"`)}${tx(lx + ci * cw + cw / 2, 40, `효능 De ${R.doseE[d]} · 부담 Dt ${R.doseT[d]}`, `font-size="11.5" class="t-m t-mu" text-anchor="middle"`)}`).join("");
        const body = `${colH}${rowH}${cells}${tx(12, H - 10, "빨간 눈금 = 관문 기준선(E: 2상 40 · 3상 45 / S: IND 35 · 1상 50 · 3상 55). 임상의 흔들림(±6) 전 예상값.", `font-size="11.5" class="t-mu"`)}`;
        return `${CV.svg(W, H, body, "제형과 용량 9칸 점수 열지도")}
          <p class="vz-note">눈여겨볼 칸: 우리가 고른 <b>경구 50 mg</b>는 IND 만 넘습니다. 같은 50 mg 이라도 <b>경피</b>는 피크가 낮아(×0.75) S ${f1(G("transdermal", 50).S)} 로 3상 기준까지 넘습니다. 대신 허가 뒤 시장 점유 배율은 경구 ×${R.approvalMult.oral}, 경피 ×${R.approvalMult.transdermal} 입니다.</p>`;
      }
    },

    /* ── 02 E–S 평면 ── */
    {
      name: "E–S 평면",
      kind: "산점도 · 기준선 사분면",
      idea: "가로 안전 S, 세로 효능 E 평면에 9가지 조합을 찍고 관문 기준선을 그어, 용량을 올릴 때마다 점이 왼쪽 위로 끌려가는 모습을 화살표로 보여 줍니다.",
      learn: "용량을 올리면 점은 늘 '왼쪽 위'로 간다 — E 를 얻는 만큼 S 를 잃으니, 오른쪽 위 초록 구역에 남는 조합을 골라야 한다.",
      render: () => {
        const W = 760, H = 470, x = CV.scale([0, 100], [70, 730]), y = CV.scale([0, 100], [420, 60]);
        const zone = `<rect x="${x(TH.phase3.s)}" y="${y(100)}" width="${x(100) - x(TH.phase3.s)}" height="${y(TH.phase3.e) - y(100)}" fill="var(--good-bg)"/>
          ${tx(x(100) - 8, y(100) + 18, "끝까지 갈 수 있는 구역", `font-size="12.5" font-weight="700" text-anchor="end" style="fill:var(--good)"`)}
          ${tx(x(100) - 8, y(100) + 34, `E ≥ ${TH.phase3.e} · S ≥ ${TH.phase3.s}`, `font-size="11.5" class="t-m" text-anchor="end" style="fill:var(--good)"`)}
          <rect x="${x(0)}" y="${y(100)}" width="${x(TH.ind.s) - x(0)}" height="${y(0) - y(100)}" fill="var(--bad-bg)"/>
          ${tx(x(TH.ind.s / 2), y(14), "IND 보류", `font-size="12.5" font-weight="700" text-anchor="middle" style="fill:var(--bad)"`)}
          ${tx(x(TH.ind.s / 2), y(14) + 16, `S < ${TH.ind.s}`, `font-size="11.5" class="t-m" text-anchor="middle" style="fill:var(--bad)"`)}`;
        const vl = [[TH.ind.s, "IND 35", 0], [TH.phase1.s, "1상 50", 0], [TH.phase3.s, "3상 55", 1]].map(([v, l, o]) => `<path d="M${x(v)} ${y(0)} V${y(100) - (o ? 22 : 8)}" stroke="var(--ink)" stroke-dasharray="4 3"/>${tx(x(v), y(100) - (o ? 26 : 12), "S " + l, `font-size="11.5" class="t-m" text-anchor="${o ? "start" : "end"}"`)}`).join("");
        const hl = [[TH.phase2.e, "2상 E 40", 15], [TH.phase3.e, "3상 E 45", -5]].map(([v, l, dy]) => `<path d="M${x(0)} ${y(v)} H${x(100)}" stroke="var(--ink)" stroke-dasharray="4 3"/>${tx(x(0) + 6, y(v) + dy, l, `font-size="11.5" class="t-m"`)}`).join("");
        const axes = [0, 20, 40, 60, 80, 100].map((v) => `${tx(x(v), y(0) + 18, v, `font-size="11" class="t-m t-mu" text-anchor="middle"`)}${tx(x(0) - 8, y(v) + 4, v, `font-size="11" class="t-m t-mu" text-anchor="end"`)}`).join("")
          + `<path d="M${x(0)} ${y(100)} V${y(0)} H${x(100)}" fill="none" stroke="var(--ink)"/>${tx(x(50), H - 6, "안전 S →", `font-size="12.5" font-weight="600" text-anchor="middle"`)}${tx(16, y(50), "효능 E ↑", `font-size="12.5" font-weight="600" text-anchor="middle" transform="rotate(-90 16 ${y(50)})"`)}`;
        const paths = FORMS.map((f) => { const p = DOSES.map((d) => G(f, d));
          const dash = f === "oral" ? "" : f === "iv" ? 'stroke-dasharray="7 4"' : 'stroke-dasharray="2 3"';
          const heads = [0, 1].map((i) => { const a = p[i], b = p[i + 1], mx = (x(a.S) + x(b.S)) / 2, my = (y(a.E) + y(b.E)) / 2, ang = (Math.atan2(y(b.E) - y(a.E), x(b.S) - x(a.S)) * 180) / Math.PI;
            return `<path d="M-6 -5 L6 0 L-6 5 Z" transform="translate(${f1(mx)} ${f1(my)}) rotate(${f1(ang)})" fill="${FCOL[f]}" stroke="var(--ink)" stroke-width="0.8"/>`; }).join("");
          return `<polyline points="${p.map((g) => `${f1(x(g.S))},${f1(y(g.E))}`).join(" ")}" fill="none" stroke="${FCOL[f]}" stroke-width="1.8" ${dash}/>${heads}`; }).join("");
        /* 라벨 위치(겹침 피하기): [dx, dy, anchor] */
        const LP = { "oral-10": [10, 18, "start"], "iv-10": [-10, 22, "end"], "transdermal-10": [12, 5, "start"], "transdermal-50": [12, -6, "start"],
          "oral-50": [0, -18, "middle"], "iv-50": [0, 26, "middle"], "transdermal-100": [-12, 4, "end"], "oral-100": [14, -6, "start"], "iv-100": [14, 10, "start"] };
        const pts = EX.grid.map((g) => { const k = `${g.form}-${g.dose}`, me = g.form === I.form && g.dose === I.dose, [dx, dy, an] = LP[k], px = x(g.S), py = y(g.E);
          const lab = k === "oral-100" ? "경구 100 · 정맥 100 (같은 점)" : k === "iv-100" ? "" : `${FS[g.form]} ${g.dose}${me ? " · 우리 선택" : ""}`;
          return `${me ? `<circle cx="${px}" cy="${py}" r="14" fill="var(--hi)" stroke="var(--ink)"/>` : ""}${shape(g.form, px, py, 6.5, FCOL[g.form])}${lab ? tx(px + dx, py + dy, lab, `font-size="12" text-anchor="${an}" ${me ? 'font-weight="700"' : ""}`) : ""}`; }).join("");
        const body = `${zone}${vl}${hl}${axes}${paths}${pts}
          <rect x="${x(56)}" y="${y(30) - 16}" width="${x(99) - x(56)}" height="44" fill="var(--paper)" stroke="var(--line-strong)"/>
          ${tx(x(56) + 10, y(30) + 2, "화살표 = 10 → 50 → 100 mg", `font-size="12" font-weight="600"`)}${tx(x(56) + 10, y(30) + 19, "용량↑ 이면 왼쪽 위로(E↑ · S↓)", `font-size="12" class="t-mu"`)}`;
        return `${CV.svg(W, H, body, "효능 E와 안전 S 평면 위 9가지 조합")}
          <div class="vz-row"><span class="vz-chip" style="color:var(--me);border-color:var(--me)">● 경구 — 실선</span><span class="vz-chip" style="color:var(--daon);border-color:var(--daon)">■ 정맥주사 — 긴 점선</span><span class="vz-chip" style="color:var(--seum);border-color:var(--seum)">▲ 경피 — 짧은 점선</span><span class="vz-note">점선 = 관문 기준선 · 흔들림 전 예상값</span></div>`;
      }
    },

    /* ── 03 공식 분해 폭포 ── */
    {
      name: "공식 폭포",
      kind: "폭포 그림 · 공식 분해",
      idea: "100점에서 출발해 공식의 곱셈 · 뺄셈 재료가 하나씩 점수를 깎아 내려가는 모습을 E 와 S 두 폭포로 나란히 그립니다.",
      learn: "E 78.8 은 결합력과 용량 효능이 깎은 결과, S 44.5 는 용량 부담 30 에 hERG · 간 위험이 곱해져 55.5 가 빠진 결과다.",
      render: () => {
        const p = B0.parts, W = 800, H = 330, y = CV.scale([0, 100], [250, 66]);
        const fb = 0.3 + 0.7 * p.p;
        const eSteps = [["출발", 100, null], ["결합력", fb, `×${fb.toFixed(3)}`, `p ${p.p.toFixed(3)}`], ["흡수 A", p.A, `×${p.A.toFixed(2)}`, "경구 좋음"], ["뇌 노출 B", p.B, `×${p.B.toFixed(2)}`, "CNS 표적"], ["용량 De", p.De, `×${p.De.toFixed(2)}`, `${I.dose} mg`]];
        const eBars = []; let cur = 100;
        eSteps.forEach(([lab, m, op, sub], i) => { const prev = cur; if (i) cur = cur * m; eBars.push({ lab, op, sub, from: i ? prev : 0, to: cur, start: !i }); });
        eBars.push({ lab: "효능 E", op: "", sub: "반올림", from: 0, to: B0.E, end: true });
        const pen = [["용량 Dt", p.Dt * p.K * 1, `−${f1(p.Dt)}`, `Dt = ${p.Dt}`], ["hERG", p.Dt * p.hergR * p.K, `−${f1(p.Dt * p.hergR * p.K)}`, `×${p.hergR}`], ["간독성", p.Dt * p.hepR * p.K, `−${f1(p.Dt * p.hepR * p.K)}`, `×${p.hepR}`]];
        const sBars = [{ lab: "출발", from: 0, to: 100, start: true, op: "", sub: "" }]; cur = 100;
        pen.forEach(([lab, v, op, sub]) => { sBars.push({ lab, op, sub, from: cur, to: cur - v }); cur -= v; });
        const kExtra = p.Dt * p.Rk * (p.K - 1);
        sBars.push({ lab: "피크 K", op: `×${p.K.toFixed(2)}`, sub: kExtra ? `−${f1(kExtra)}` : "변화 없음", from: cur, to: cur - kExtra }); cur -= kExtra;
        sBars.push({ lab: "안전 S", from: 0, to: B0.S, end: true, op: "", sub: `max(0, …)` });
        const panel = (x0, bars, title, formula, ths) => {
          const bw = 40, gap = 56;
          const g = bars.map((b, i) => { const x = x0 + i * gap, top = y(Math.max(b.from, b.to)), bot = y(Math.min(b.from, b.to));
            const fill = b.start ? "var(--raise)" : b.end ? "var(--ink)" : "var(--bad-bg)", st = b.start || b.end ? "var(--ink)" : "var(--bad)";
            const conn = i < bars.length - 1 && !b.end ? `<path d="M${x + bw} ${y(b.to)} H${x + gap}" stroke="var(--line-strong)" stroke-dasharray="2 2"/>` : "";
            return `<rect x="${x}" y="${top}" width="${bw}" height="${Math.max(1.5, bot - top)}" fill="${fill}" stroke="${st}"/>${conn}
              ${tx(x + bw / 2, top - 6, b.start || b.end ? f1(b.to) : b.op, `font-size="12" class="t-m" text-anchor="middle" font-weight="${b.end ? 700 : 500}"`)}
              ${tx(x + bw / 2, 270, b.lab, `font-size="11.5" text-anchor="middle" font-weight="600"`)}${tx(x + bw / 2, 286, b.sub || "", `font-size="10.5" class="t-m t-mu" text-anchor="middle"`)}`; }).join("");
          const w = (bars.length - 1) * gap + bw;
          const tl = ths.map(([k, v]) => `<path d="M${x0 - 6} ${y(v)} H${x0 + w + 6}" stroke="var(--good)" stroke-dasharray="4 3"/>${tx(x0 + w + 8, y(v) + 4, `${k} ${v}`, `font-size="11" class="t-m" style="fill:var(--good)"`)}`).join("");
          return `${tx(x0, 16, title, `font-size="14" font-weight="700"`)}${tx(x0, 34, formula, `font-size="11.5" class="t-m t-mu"`)}<path d="M${x0 - 6} 250 H${x0 + w + 6}" stroke="var(--ink)"/>${tl}${g}`;
        };
        const body = `${panel(10, eBars, "효능 E — 곱해서 깎인다", "100 × (0.3+0.7p) × A × B × De", [["3상", TH.phase3.e]])}
          ${panel(420, sBars, "안전 S — 빼서 깎인다", "100 − Dt × (1+hERG+간) × K", [["IND", TH.ind.s], ["1상", TH.phase1.s]])}
          ${tx(10, 318, `빨간 칸 = 깎인 만큼 · 이 분자는 hERG(심장 위험) 높음 0.60 · 간독성 보통 0.25 → 위험 배율 Rk ${p.Rk.toFixed(2)}`, `font-size="12" class="t-mu"`)}`;
        return `${CV.svg(W, H, body, "효능 E와 안전 S 공식 분해 폭포")}
          <p class="vz-note">S 쪽 빨간 칸 세 개(30 + 18 + 7.5 = ${f1(p.Dt * p.Rk * p.K)})가 모두 '용량 부담 Dt'에 곱해져 생깁니다. 그래서 용량을 10 mg(Dt 10)으로 줄이면 세 칸이 한꺼번에 3분의 1로 줄어듭니다.</p>`;
      }
    },

    /* ── 04 시소 ── */
    {
      name: "효능 · 안전 시소",
      kind: "실물 은유 시소 · 버튼",
      idea: "왼쪽 접시에 효능 E, 오른쪽 접시에 안전 S 를 무게로 올리고 용량 · 제형 버튼으로 시소를 기울여 봅니다. 양옆 눈금자에 관문 기준선이 있습니다.",
      learn: "한쪽을 올리면 다른 쪽이 내려간다 — 용량은 E 와 S 를 동시에 좋게 만들 수 없는 저울이다.",
      render: () => `<div class="vz-row" role="group" aria-label="용량">${DOSES.map((d) => `<button type="button" class="vz-btn" data-d="${d}" aria-pressed="${d === I.dose}">${d} mg</button>`).join("")}
          <span style="width:12px"></span>${FORMS.map((f) => `<button type="button" class="vz-btn" data-f="${f}" aria-pressed="${f === I.form}">${CV.FORM_SHORT[f]}</button>`).join("")}</div>
        ${CV.svg(760, 360, `<g id="s6-v4-g">${seeBody(I.form, I.dose)}</g>`, "효능과 안전의 시소")}
        <div class="vz-row" id="s6-v4-lamps">${lamps(I.E, I.S)}</div>`,
      mount: (el) => {
        let f = I.form, d = I.dose;
        const upd = () => {
          const { r, th, L1, R1 } = seeState(f, d);
          const beam = el.querySelector("#s6-v4-beam"), pl = el.querySelector("#s6-v4-pl"), pr = el.querySelector("#s6-v4-pr");
          if (!beam) return;
          beam.style.transform = `rotate(${f1(th)}deg)`;
          pl.style.transform = `translate(${f1(L1[0])}px,${f1(L1[1])}px)`; pr.style.transform = `translate(${f1(R1[0])}px,${f1(R1[1])}px)`;
          [[pl, r.E, "E"], [pr, r.S, "S"]].forEach(([g, v, lab]) => { const h = Math.max(4, v * 0.62), b = g.querySelector("[data-blk]"); b.setAttribute("y", 46 - h); b.setAttribute("height", h); g.querySelector("[data-val]").textContent = `${lab} ${f1(v)}`; });
          const yS = CV.scale([0, 100], [330, 40]), bars = el.querySelectorAll("[data-bar]");
          [r.E, r.S].forEach((v, i) => { bars[i].setAttribute("y", yS(v)); bars[i].setAttribute("height", 330 - yS(v)); });
          el.querySelector("#s6-v4-dose").textContent = `${FS[f]} ${d} mg`;
          el.querySelector("#s6-v4-lamps").innerHTML = lamps(r.E, r.S);
        };
        el.querySelectorAll("button[data-d]").forEach((b) => b.addEventListener("click", () => { d = +b.dataset.d; el.querySelectorAll("button[data-d]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); upd(); }));
        el.querySelectorAll("button[data-f]").forEach((b) => b.addEventListener("click", () => { f = b.dataset.f; el.querySelectorAll("button[data-f]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); upd(); }));
      }
    },

    /* ── 05 what-if 실험실 ── */
    {
      name: "what-if 실험실",
      kind: "슬라이더 실험 · 게이지 · 공식",
      idea: "제형 · 용량 · 후보 분자 · 환자군을 바꾸면 공식의 재료 값과 E · S 게이지, 관문 신호가 바로 다시 계산됩니다.",
      learn: "점수를 움직이는 손잡이는 넷이지만 힘은 다르다 — 용량과 분자(hERG)가 S 를 크게 흔들고, 이 표적에서 환자군은 아무것도 바꾸지 않는다.",
      render: () => `<div class="s6-ctl">
          <div class="vz-row" role="group" aria-label="제형"><span class="vz-lab">제형</span>${FORMS.map((f) => `<button type="button" class="vz-btn" data-f="${f}" aria-pressed="${f === I.form}">${esc(CV.FORM[f])}</button>`).join("")}</div>
          <div class="vz-row"><label class="vz-lab" for="s6-v5-dose">용량</label><input type="range" class="vz-rng" id="s6-v5-dose" min="0" max="2" step="1" value="${DOSES.indexOf(I.dose)}" style="flex:1 1 160px;max-width:260px"><b class="mono" id="s6-v5-dv">${I.dose} mg</b></div>
          <div class="vz-row"><label class="vz-lab" for="s6-v5-mol">후보 분자</label><select id="s6-v5-mol">${EX.admet.map((a) => `<option value="${esc(a.id)}" ${a.id === L.id ? "selected" : ""}>${esc(a.name)}${a.id === L.id ? " (리드)" : ""}</option>`).join("")}</select></div>
          <div class="vz-row"><label class="vz-lab" for="s6-v5-pop">환자군</label><select id="s6-v5-pop">${CV.TRIAL[TID].pops.map((p) => `<option ${p === I.pop ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></div></div>
        <div id="s6-v5-out" style="min-width:0;display:grid;gap:10px">${s6Lab(I.form, I.dose, L.id, I.pop)}</div>`,
      mount: (el) => {
        let f = I.form;
        const dose = el.querySelector("#s6-v5-dose"), mol = el.querySelector("#s6-v5-mol"), pop = el.querySelector("#s6-v5-pop"), out = el.querySelector("#s6-v5-out"), dv = el.querySelector("#s6-v5-dv");
        if (!dose || !out) return;
        const upd = () => { const d = DOSES[+dose.value]; dv.textContent = d + " mg"; out.innerHTML = s6Lab(f, d, mol.value, pop.value); };
        el.querySelectorAll("button[data-f]").forEach((b) => b.addEventListener("click", () => { f = b.dataset.f; el.querySelectorAll("button[data-f]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); upd(); }));
        [dose, mol, pop].forEach((c) => c.addEventListener("input", upd));
        [mol, pop].forEach((c) => c.addEventListener("change", upd));
      }
    },

    /* ── 06 혈중 농도-시간 곡선(개념) ── */
    {
      name: "피크 곡선",
      kind: "농도-시간 곡선 · 개념 그림 · 버튼",
      idea: "약이 몸에 들어간 뒤 시간에 따른 곡선을 제형별로 그리고, 꼭대기 높이를 규칙 값 Dt × K 로 맞춰 관문 한계선과 견줍니다. 용량 버튼으로 곡선이 커지고 작아집니다.",
      learn: "정맥주사는 한꺼번에 들어가 꼭대기가 높고(×1.25), 경피는 천천히 들어가 낮다(×0.75) — 같은 용량이라도 꼭대기가 한계선을 넘으면 S 가 떨어진다.",
      render: () => `<div class="vz-row" role="group" aria-label="용량">${DOSES.map((d) => `<button type="button" class="vz-btn" data-d="${d}" aria-pressed="${d === I.dose}">${d} mg</button>`).join("")}</div>
        ${CV.svg(760, 330, `<g id="s6-v6-g">${pkBody(I.dose)}</g>`, "제형별 혈중 농도 곡선 개념 그림")}
        <p class="vz-note">곡선 모양은 이해를 돕는 <b>개념 그림</b>이고 실제 약동학 측정값이 아닙니다. 꼭대기 높이만 게임 규칙 값(용량 부담 Dt × 피크 K)입니다. 한계선은 이 분자(위험 배율 Rk ${rk.toFixed(2)})가 각 관문을 넘을 수 있는 최대 부담 = (100 − 기준) ÷ ${rk.toFixed(2)} 입니다.</p>`,
      mount: (el) => {
        const g = el.querySelector("#s6-v6-g");
        el.querySelectorAll("button[data-d]").forEach((b) => b.addEventListener("click", () => {
          el.querySelectorAll("button[data-d]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          if (g) g.innerHTML = pkBody(+b.dataset.d);
        }));
      }
    },

    /* ── 07 작은 배수: 제형별 용량-반응 ── */
    {
      name: "용량-반응 3장",
      kind: "작은 배수 · 두 선 교차",
      idea: "경구 · 정맥 · 경피 세 장의 작은 그래프에 용량(가로)에 따른 E(오름)와 S(내림)를 같은 눈금으로 그리고, 3상 기준을 넘는 용량에 표시합니다.",
      learn: "세 장 모두 E 선은 오르고 S 선은 내려가 X 자로 엇갈린다 — 제형은 그 X 가 어디서 엇갈리는지를 옮길 뿐이다.",
      render: () => {
        const W = 780, H = 320, pw = 220, gap = 26;
        const halo = 'style="paint-order:stroke;stroke:var(--paper);stroke-width:6px;stroke-linejoin:round;fill:COL"';
        const panel = (f, i) => {
          const x0 = 46 + i * (pw + gap), x = CV.scale([0, 100], [x0, x0 + pw]), y = CV.scale([0, 100], [250, 40]);
          const P3 = DOSES.map((d) => ({ d, g: G(f, d) }));
          const line = (k, dash, col) => `<polyline points="${P3.map((p) => `${x(p.d)},${f1(y(p.g[k]))}`).join(" ")}" fill="none" stroke="${col}" stroke-width="2.2" ${dash}/>`;
          const gl = [[TH.phase3.s, "S 55"], [TH.phase3.e, "E 45"]].map(([v, l], j) => `<path d="M${x0} ${y(v)} H${x0 + pw}" stroke="var(--line-strong)" stroke-dasharray="3 3"/>${i === 0 ? tx(x0 - 6, y(v) + (j ? 13 : -3), l, `font-size="10.5" class="t-m t-mu" text-anchor="end"`) : ""}`).join("");
          const an = (d) => (d === 100 ? "end" : d === 10 ? "start" : "middle");
          const pts = P3.map((p) => { const ok = p.g.E >= TH.phase3.e && p.g.S >= TH.phase3.s, me = f === I.form && p.d === I.dose;
            const sLow = p.g.S < 10;
            return `${me ? `<rect x="${x(p.d) - 12}" y="36" width="24" height="218" fill="var(--hi)" opacity="0.5"/>` : ""}
              <circle cx="${x(p.d)}" cy="${y(p.g.E)}" r="4.5" fill="var(--me)"/>${tx(x(p.d) + (p.d === 10 ? -4 : p.d === 100 ? 4 : 0), y(p.g.E) - 9, f1(p.g.E), `font-size="11.5" class="t-m" font-weight="600" text-anchor="${an(p.d)}" ${halo.replace("COL", "var(--me)")}`)}
              <rect x="${x(p.d) - 4}" y="${y(p.g.S) - 4}" width="8" height="8" fill="var(--bad)"/>${tx(x(p.d) + (p.d === 10 ? -4 : p.d === 100 ? (sLow ? -8 : 4) : 0), sLow ? y(p.g.S) - 9 : y(p.g.S) + 18, f1(p.g.S), `font-size="11.5" class="t-m" font-weight="600" text-anchor="${an(p.d)}" ${halo.replace("COL", "var(--bad)")}`)}
              ${tx(x(p.d), 270, p.d + "", `font-size="11" class="t-m" text-anchor="${an(p.d)}"`)}
              ${tx(x(p.d), 290, ok ? "✓ 3상권" : "✕", `font-size="11.5" font-weight="700" text-anchor="${an(p.d)}" style="fill:var(--${ok ? "good" : "bad"})"`)}`; }).join("");
          return `<rect x="${x0}" y="40" width="${pw}" height="210" fill="var(--paper)" stroke="var(--line)"/>${gl}
            ${tx(x0, 28, `${CV.FORM_SHORT[f]} · 피크 ×${R.peak[f].toFixed(2)}`, `font-size="13.5" font-weight="700"`)}
            ${line("E", "", "var(--me)")}${line("S", 'stroke-dasharray="6 3"', "var(--bad)")}${pts}`;
        };
        const yax = [0, 100].map((v) => tx(40, CV.scale([0, 100], [250, 40])(v) + 4, v, `font-size="10.5" class="t-m t-mu" text-anchor="end"`)).join("");
        const body = `${FORMS.map(panel).join("")}${yax}${tx(46, 312, "가로 = 용량 mg(0~100 같은 눈금) · 세 점을 이은 선 · 노란 띠 = 우리 선택", `font-size="11.5" class="t-mu"`)}`;
        return `${CV.svg(W, H, body, "제형별 용량에 따른 E와 S")}
          <div class="vz-row"><span class="vz-chip" style="color:var(--me);border-color:var(--me)">● 효능 E — 실선</span><span class="vz-chip" style="color:var(--bad);border-color:var(--bad)">■ 안전 S — 점선</span><span class="vz-note">3상권 = 흔들림 전 E ≥ 45 · S ≥ 55</span></div>`;
      }
    },

    /* ── 08 IND 서류 체크리스트 ── */
    {
      name: "IND 서류",
      kind: "서류 체크리스트 · 복선 메모",
      idea: "FDA 창구에 내는 IND(임상시험 계획 승인 신청) 서류를 항목별 체크리스트로 채우고, 승인 도장 옆에 '다음 관문엔 모자라다'는 메모를 붙입니다.",
      learn: "IND 승인(S ≥ 35)은 출발 허락일 뿐이다 — 고른 50 mg 의 S 44.5 는 1상 기준 50 에 5.5 모자라 다음 단계에서 걸린다.",
      render: () => {
        const sp = I.S;
        const stamp = `<svg class="s6-stamp" viewBox="0 0 100 100" role="img" aria-label="IND 승인 도장"><circle cx="50" cy="50" r="44" fill="none" stroke="var(--good)" stroke-width="3.5"/><circle cx="50" cy="50" r="37" fill="none" stroke="var(--good)" stroke-width="1.2"/>
          <text x="50" y="50" text-anchor="middle" font-size="22" font-weight="700" style="fill:var(--good)">승인</text><text x="50" y="67" text-anchor="middle" font-size="10" style="fill:var(--good);font-family:var(--mono)">IND · FDA</text></svg>`;
        const it = [
          ["후보 물질", `${P.code} · 특허 ${P.patentNo}`, "특허 분자만 낼 수 있음"],
          ["제형", CV.FORM[I.form], `흡수 A ${B0.parts.A.toFixed(2)} · 피크 ×${B0.parts.K.toFixed(2)}`],
          ["용량", `${I.dose} mg`, `효능 De ${B0.parts.De} · 부담 Dt ${B0.parts.Dt}`],
          ["환자군", I.pop, "1상은 건강한 지원자로 안전 확인"],
          ["1차 평가지표", I.ep, "효과를 무엇으로 잴지"],
          ["예상 점수", `효능 E ${f1(I.E)} · 안전 S ${f1(I.S)}`, "공식으로 미리 계산"],
          ["비용 · 기간", `${M(R.cost.ind)} · 심사 ${R.days.ind}일`, `D+${P.day} → D+${I.day}`]
        ];
        const x = CV.scale([0, 100], [10, 610]);
        const gauge = CV.svg(620, 70, `<rect x="10" y="22" width="600" height="14" fill="var(--raise)"/><rect x="10" y="22" width="${x(sp) - 10}" height="14" fill="var(--ink)"/>
          ${[[TH.ind.s, "IND 35", "var(--good)"], [TH.phase1.s, "1상 50", "var(--bad)"], [TH.phase3.s, "3상 55", "var(--muted)"]].map(([v, l, c], i) => `<path d="M${x(v)} 14 V44" stroke="${c}" stroke-width="2" stroke-dasharray="3 2"/>${tx(x(v) + (i === 2 ? 4 : -4), 60, l, `font-size="11.5" class="t-m" text-anchor="${i === 2 ? "start" : "end"}" style="fill:${c}"`)}`).join("")}
          ${tx(x(sp) - 6, 14, `S ${f1(sp)}`, `font-size="12" class="t-m" font-weight="700" text-anchor="end"`)}
          <path d="M${x(sp)} 18 H${x(TH.phase1.s)}" stroke="var(--bad)" stroke-width="2"/>${tx(x(TH.phase1.s) + 6, 14, `1상까지 ${f1(TH.phase1.s - sp)} 모자람`, `font-size="11.5" class="t-m" style="fill:var(--bad)"`)}`, "안전 S 눈금");
        const t1 = EX.trials[0];
        return `<div class="s6-doc">${stamp}<span class="vz-lab">IND 신청서 · FDA 규제심사청</span><h3>${esc(P.code)} 임상 1상 시작 허락 신청</h3>
            <ul class="s6-ck">${it.map(([a, b, c]) => `<li><b aria-hidden="true">✓</b><span>${esc(a)}</span><div><em>${esc(b)}</em><br><span>${esc(c)}</span></div></li>`).join("")}</ul>
            <div style="max-width:640px"><span class="vz-lab">판정 · 안전 S ${f1(I.S)} ≥ ${TH.ind.s} → 승인</span>${gauge}</div></div>
          <div class="s6-memo"><b>메모 — 다음 관문 미리 보기</b><span>IND 는 넘었지만 1상 기준(S ≥ ${TH.phase1.s})에 ${f1(TH.phase1.s - I.S)} 모자랍니다. 실제로 4.1 에서 1상은 흔들림 ${t1.n > 0 ? "+" : ""}${t1.n} 이 더해져도 S ${f1(t1.S)} 로 떨어지고, FDA 에서 ${EX.finalDose} mg 로 바꾼 뒤 통과합니다.</span></div>`;
      }
    },

    /* ── 09 관문 사다리 ── */
    {
      name: "관문 사다리",
      kind: "사다리 · 두 등반 비교 · 단계 재생",
      idea: "IND → 1상 → 2상 → 3상 → 허가 관문을 사다리 칸으로 세우고, 처음 고른 경구 50 mg 와 바꾼 10 mg 가 각각 몇 칸까지 오르는지 실제 예시 실행 값으로 한 칸씩 재생합니다.",
      learn: "IND 문턱(35)은 낮고 1상(50) · 3상(55)은 높다 — 처음부터 다음 관문까지 내다보고 용량을 골라야 다시 하는 비용이 안 든다.",
      render: () => `<div class="vz-row"><button type="button" class="vz-btn" id="s6-v9-play">한 칸씩 오르기</button><span class="vz-note" id="s6-v9-cap" aria-live="polite">두 사람이 같은 사다리를 오릅니다. 왼쪽은 처음 고른 50 mg, 오른쪽은 FDA 에서 바꾼 10 mg.</span></div>
        ${CV.svg(760, 424, `<g id="s6-v9-g">${s6Ladder(9)}</g>`, "관문 사다리")}
        <p class="vz-note">값은 예시 실행(CV.EX) 그대로입니다. 임상 칸은 흔들림(1 · 2상 ±6, 3상 ±4)이 더해진 결과, IND 칸은 흔들림 없는 예상값입니다.</p>`,
      mount: (el) => {
        const g = el.querySelector("#s6-v9-g"), cap = el.querySelector("#s6-v9-cap"), btn = el.querySelector("#s6-v9-play");
        if (!g || !btn) return;
        const C = ["출발선에 섭니다.", `IND: 두 용량 모두 S ≥ ${TH.ind.s} 을 넘습니다.`, `1상: 50 mg 는 S ${f1(EX.trials[0].S)} < ${TH.phase1.s} 로 떨어지고, 10 mg 는 S ${f1(EX.trials[1].S)} 로 통과.`,
          `2상: 10 mg E ${f1(EX.trials[2].E)} ≥ ${TH.phase2.e} 통과.`, `3상: 10 mg E ${f1(EX.trials[3].E)} · S ${f1(EX.trials[3].S)} 모두 통과.`, `허가 D+${EX.approval.day} · 「${EX.approval.brand}」.`];
        let k = 0, t = null;
        const stop = () => { clearInterval(t); t = null; };
        btn.addEventListener("click", () => {
          stop(); k = 0; g.innerHTML = s6Ladder(0); cap.textContent = C[0];
          if (CV.reduced()) { g.innerHTML = s6Ladder(9); cap.textContent = C[C.length - 1]; return; }
          t = setInterval(() => { k++; g.innerHTML = s6Ladder(k); cap.textContent = C[Math.min(k, C.length - 1)]; if (k >= 5) stop(); }, 1300);
        });
        return stop;
      }
    },

    /* ── 10 몸속 경로 지도 ── */
    {
      name: "몸속 경로",
      kind: "경로 지도 · 공식 재료 표시",
      idea: "입 · 정맥 · 피부 세 입구에서 피를 거쳐 뇌의 표적까지 가는 길을 지도로 그리고, 길마다 공식 재료(흡수 A · 피크 K · 뇌 노출 B)를 붙입니다.",
      learn: "제형은 '약이 들어가는 길'이다 — 길이 다르면 얼마나 들어가는지(A)와 얼마나 한꺼번에 몰리는지(K)가 달라져 E 와 S 가 바뀐다.",
      render: () => {
        const s = CV.signals(L.c), W = 780, H = 390;
        const A = { oral: R.absorption.oral[s.oral], iv: 1, transdermal: R.absorption.transdermal[s.td] };
        const box = (x, y, w, h, t, sub, fill = "var(--paper)") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="var(--line-strong)"/>${tx(x + w / 2, y + (sub ? 22 : h / 2 + 5), t, `font-size="13" font-weight="600" text-anchor="middle"`)}${sub ? tx(x + w / 2, y + 39, sub, `font-size="11" class="t-mu" text-anchor="middle"`) : ""}`;
        const ar = (d, f) => `<path d="${d}" fill="none" stroke="${FCOL[f]}" stroke-width="${f === "iv" ? 4 : f === "oral" ? 3 : 2}" ${f === "transdermal" ? 'stroke-dasharray="3 3"' : ""} marker-end="url(#s6-ar10)"/>`;
        const rows = { oral: 58, iv: 188, transdermal: 318 };
        const tag = (f) => { const g = G(f, I.dose); return `${tx(8, rows[f] - 32, CV.FORM_SHORT[f], `font-size="14" font-weight="700" style="fill:${FCOL[f]}"`)}${tx(8, rows[f] + 42, `흡수 A ${A[f].toFixed(2)} · 피크 K ×${R.peak[f].toFixed(2)}`, `font-size="11.5" class="t-m"`)}${tx(8, rows[f] + 58, `${I.dose} mg → E ${f1(g.E)} · S ${f1(g.S)}`, `font-size="11.5" class="t-m t-mu"`)}`; };
        const body = `<defs><marker id="s6-ar10" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--ink)"/></marker></defs>
          ${FORMS.map(tag).join("")}
          ${box(8, rows.oral - 22, 72, 44, "입", "정제 · 캡슐")}${box(110, rows.oral - 22, 96, 44, "위 · 장", "녹아서 흡수")}${box(236, rows.oral - 22, 96, 44, "간", "첫 통과 걸러짐")}
          ${ar(`M80 ${rows.oral} H108`, "oral")}${ar(`M206 ${rows.oral} H234`, "oral")}${ar(`M332 ${rows.oral} C400 ${rows.oral} 400 ${rows.iv} 438 ${rows.iv - 20}`, "oral")}
          ${box(8, rows.iv - 22, 96, 44, "정맥 주사", "핏줄로 바로")}${ar(`M104 ${rows.iv} H438`, "iv")}${tx(270, rows.iv - 10, "중간 단계 없음 → 한꺼번에 몰림", `font-size="11.5" text-anchor="middle" class="t-mu"`)}
          ${box(8, rows.transdermal - 22, 96, 44, "피부 패치", "붙여 두기")}${box(134, rows.transdermal - 22, 120, 44, "피부 층", "천천히 스며듦")}
          ${ar(`M104 ${rows.transdermal} H132`, "transdermal")}${ar(`M254 ${rows.transdermal} C380 ${rows.transdermal} 400 ${rows.iv} 438 ${rows.iv + 20}`, "transdermal")}
          ${box(440, rows.iv - 50, 110, 100, "혈액", "온몸을 돎", "var(--film-2)")}
          <rect x="586" y="${rows.iv - 70}" width="14" height="140" fill="url(#s6-bbb)" stroke="var(--ink)"/>
          <defs><pattern id="s6-bbb" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--paper)"/><rect width="3" height="6" fill="var(--ink)"/></pattern></defs>
          ${tx(593, rows.iv - 78, "뇌 관문(BBB)", `font-size="12" font-weight="600" text-anchor="middle"`)}
          <path d="M550 ${rows.iv} H644" stroke="var(--ink)" stroke-width="3" marker-end="url(#s6-ar10)"/>
          ${box(646, rows.iv - 40, 124, 80, `뇌 · ${T.gene}`, "알츠하이머 표적", "var(--film-3)")}
          ${tx(593, rows.iv + 96, `뇌 노출 B ${R.bbb[s.bbb].toFixed(2)} (${CV.LV[s.bbb]})`, `font-size="12" class="t-m" font-weight="600" text-anchor="middle"`)}
          ${tx(593, rows.iv + 112, `TPSA ${f1(L.c.tpsa)} ≤ 90 · MW ${f1(L.c.mw)} ≤ 450 · HBD ${L.c.hbd} ≤ 3`, `font-size="11" class="t-m t-mu" text-anchor="middle"`)}
          ${tx(593, rows.iv + 128, "CNS 표적이라 B 가 효능에 곱해짐", `font-size="11" class="t-mu" text-anchor="middle"`)}`;
        return `${CV.svg(W, H, body, "약이 몸속 표적까지 가는 길")}
          <p class="vz-note">TPSA(분자 표면의 극성 넓이)가 작고 크기가 알맞아 이 분자는 경구 흡수 '${esc(CV.LV[s.oral])}' · 경피 '${esc(CV.LV[s.td])}' · 뇌 노출 '${esc(CV.LV[s.bbb])}' 입니다. 선 굵기는 몰리는 정도(K)의 느낌을 나타낸 그림입니다.</p>`;
      }
    }
  ];

  /* 05 실험실 결과 */
  function s6Lab(f, d, id, pop) {
    const a = EX.admet.find((x) => x.id === id) || EX.admet.find((x) => x.id === L.id);
    const r = CV.score(a.c, a.kcal, TID, f, d, pop), p = r.parts;
    const W = 720, x = CV.scale([0, 100], [70, 700]);
    const g = (y, v, lab, ths) => `${tx(10, y + 13, lab, `font-size="13" font-weight="700"`)}<rect x="70" y="${y}" width="630" height="18" fill="var(--raise)"/>
      <rect x="70" y="${y}" width="${x(v) - 70}" height="18" fill="var(--ink)"/>
      ${ths.map(([k, t], i) => `<path d="M${x(t)} ${y - 6} V${y + 24}" stroke="var(--bad)" stroke-width="1.6" stroke-dasharray="3 2"/>${tx(x(t), i % 2 ? y - 10 : y + 37, `${k} ${t}`, `font-size="11" class="t-m" text-anchor="middle" style="fill:var(--bad)"`)}`).join("")}
      ${tx(Math.min(x(v) + 6, 660), y + 13, f1(v), `font-size="13" class="t-m" font-weight="700" ${x(v) + 6 > 660 ? 'style="fill:var(--paper)"' : ""}`)}`;
    const body = `${g(26, r.E, "효능 E", [["2상", TH.phase2.e], ["3상", TH.phase3.e]])}${g(104, r.S, "안전 S", [["IND", TH.ind.s], ["1상", TH.phase1.s], ["3상", TH.phase3.s]])}`;
    const offNote = a.c.t !== TID ? `${a.name}은(는) ${T.gene}를 겨냥해 만든 분자가 아닙니다(${/troglitazone/i.test(a.name) ? "당뇨약 · PPAR 표적" : "다른 표적의 분자"}). 공식은 도킹 숫자만 보므로 점수가 좋아 보여도, 2.2에서 리드로 고르지 않았고 특허도 없어 IND에 낼 수 없습니다.` : "";
    const popNote = p.cns && !p.brainPop ? `${T.gene}는 원래 뇌 표적(CNS)이라 환자군을 바꿔도 B 가 그대로 곱해집니다 — 이 표적에선 환자군이 점수를 바꾸지 않아요.` : "";
    return `${CV.svg(W, 156, body, "효능과 안전 게이지")}
      <div class="s6-f"><div>E = 100 × (0.3 + 0.7 × <b>p ${p.p.toFixed(3)}</b>) × <b>A ${p.A.toFixed(2)}</b> × <b>B ${p.B.toFixed(2)}</b> × <b>De ${p.De.toFixed(2)}</b> = <span class="hl">${f1(r.E)}</span></div>
      <div>S = max(0, 100 − <b>Dt ${p.Dt}</b> × (1 + <b>hERG ${p.hergR.toFixed(2)}</b> + <b>간 ${p.hepR.toFixed(2)}</b>) × <b>K ${p.K.toFixed(2)}</b>) = <span class="hl">${f1(r.S)}</span></div>
      <div style="color:var(--muted)">신호 · 경구 ${esc(CV.LV[r.s.oral])} · 경피 ${esc(CV.LV[r.s.td])} · 뇌 노출 ${esc(CV.LV[r.s.bbb])} · hERG ${esc(CV.LV[r.s.herg])} · 간 ${esc(CV.LV[r.s.hep])} · ΔG ${f2(a.kcal)}</div></div>
      <div class="vz-row">${lamps(r.E, r.S)}</div>${offNote ? `<p class="vz-note" style="color:var(--warn)">${esc(offNote)}</p>` : ""}${popNote ? `<p class="vz-note">${esc(popNote)}</p>` : ""}`;
  }

  /* 09 사다리(단계 k 까지 보임) */
  function s6Ladder(k) {
    const tr = EX.trials, b10 = G(I.form, EX.finalDose);
    const rungs = ["출발", "IND", "1상", "2상", "3상", "허가"];
    const req = ["", `S ≥ ${TH.ind.s}`, `S ≥ ${TH.phase1.s}`, `E ≥ ${TH.phase2.e}`, `E ≥ ${TH.phase3.e} · S ≥ ${TH.phase3.s}`, `D+${EX.approval.day}`];
    const yR = (i) => 394 - i * 66;
    /* 각 칸 값 · 통과 */
    const A = [null, { v: `S ${f1(I.S)}`, ok: I.pass }, { v: `S ${f1(tr[0].S)}`, ok: tr[0].pass }, null, null, null];
    const Bv = [null, { v: `S ${f1(b10.S)}`, ok: b10.S >= TH.ind.s }, { v: `S ${f1(tr[1].S)}`, ok: tr[1].pass }, { v: `E ${f1(tr[2].E)}`, ok: tr[2].pass },
      { v: `E ${f1(tr[3].E)} · S ${f1(tr[3].S)}`, ok: tr[3].pass }, { v: EX.approval.brand, ok: true }];
    const reachOf = (V) => { let r = 0; for (let i = 1; i < V.length; i++) { if (!V[i]) break; if (!V[i].ok) return { top: r, fail: i }; r = i; } return { top: r, fail: -1 }; };
    const ladder = (x0, V, title, col) => {
      const rr = reachOf(V), top = Math.min(rr.top, k), failShown = rr.fail >= 0 && k >= rr.fail;
      const rails = `<path d="M${x0} ${yR(0) + 10} V${yR(5) - 14} M${x0 + 90} ${yR(0) + 10} V${yR(5) - 14}" stroke="var(--ink)" stroke-width="3"/>`;
      const rs = rungs.map((_, i) => { const v = V[i], shown = i <= k && v, ok = v && v.ok;
        return `<path d="M${x0} ${yR(i)} H${x0 + 90}" stroke="${shown ? (ok ? "var(--good)" : "var(--bad)") : "var(--line-strong)"}" stroke-width="${shown ? 4 : 2}"/>
          ${shown ? tx(x0 < 380 ? x0 - 10 : x0 + 100, yR(i) + 4, `${ok ? "✓" : "✕"} ${v.v}`, `font-size="12" class="t-m" font-weight="600" text-anchor="${x0 < 380 ? "end" : "start"}" style="fill:var(--${ok ? "good" : "bad"})"`) : ""}`; }).join("");
      const cy = yR(top) - 14;
      const who = `<circle cx="${x0 + 45}" cy="${cy}" r="11" fill="${col}" stroke="var(--ink)" stroke-width="1.5"/>`;
      const stopMark = failShown ? `${tx(x0 + 45, yR(rr.fail) - 8, "멈춤", `font-size="12" font-weight="700" text-anchor="middle" style="fill:var(--bad)"`)}` : "";
      return `${tx(x0 + 45, 22, title, `font-size="13" font-weight="700" text-anchor="middle"`)}${rails}${rs}${who}${stopMark}`;
    };
    const mid = rungs.map((r, i) => `${tx(380, yR(i) - 2, r, `font-size="13.5" font-weight="700" text-anchor="middle"`)}${tx(380, yR(i) + 14, req[i], `font-size="11" class="t-m t-mu" text-anchor="middle"`)}`).join("");
    return `${mid}${ladder(190, A, `경구 ${I.dose} mg (처음)`, "var(--hi)")}${ladder(480, Bv, `경구 ${EX.finalDose} mg (바꾼 뒤)`, "var(--film-2)")}`;
  }
})();
