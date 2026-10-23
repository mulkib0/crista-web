/* 2.2 ADMET 예측 · 리드 — 시각화 시안 10종 */
(function () {
  "use strict";
  const CV = window.CV, { EX, esc, f1, f2, R } = CV;

  /* ── 이 파일 전용 도우미 ── */
  const AD = EX.admet, LEAD = EX.lead, TID = EX.tid;
  const POP = (EX.ind && EX.ind.pop) || CV.TRIAL[TID].pops[0];
  const isCRX = (a) => /^CRX-ACHE-/.test(a.id);
  const isLead = (a) => !!LEAD && a.id === LEAD.id;
  const own = (a) => a.c.t === TID;                     /* ACHE 를 겨냥해 만든 분자인가 */
  const nm = (a) => isCRX(a) ? "CRX-" + a.id.slice(-2) : String(a.name).split(" (")[0];
  const sub = (a) => isCRX(a) ? String(a.name).replace(/^도네페질 /, "").replace(/ 유도체$/, "") : "당뇨약 · PPAR 작용제";
  const colOf = (a) => isLead(a) ? "var(--me)" : own(a) ? "var(--ink)" : "var(--daon)";
  const LV = CV.LV, TONE = CV.tone, RTONE = CV.riskTone;
  const MARK = { good: "●", warn: "▲", bad: "■" };
  const toneOf = (k, v) => k === "herg" || k === "hep" ? RTONE[v] : k === "ro5" ? (v === 0 ? "good" : v === 1 ? "warn" : "bad") : TONE[v];
  const textOf = (k, v) => k === "ro5" ? `위반 ${v}` : LV[v];
  const chip = (tone, t) => `<span class="vz-sig ${tone}">${MARK[tone]} ${esc(t)}</span>`;
  const SIG = [
    { k: "oral", t: "경구 흡수", rule: "TPSA ≤ 140 · RotB ≤ 10 · Ro5 위반" },
    { k: "bbb", t: "뇌 노출", rule: "TPSA ≤ 90 · MW ≤ 450 · HBD ≤ 3" },
    { k: "herg", t: "심장 hERG", rule: "염기성 아민 + cLogP 2.5 / 3.7" },
    { k: "hep", t: "간독성", rule: "구조 경고 · cLogP > 3 & TPSA < 75" },
    { k: "td", t: "경피 투과", rule: "MW ≤ 500 · cLogP 1~4" }
  ];
  const bindAll = (el, sel, ev, fn) => { const L = [...el.querySelectorAll(sel)]; L.forEach((b) => b.addEventListener(ev, fn)); return () => L.forEach((b) => b.removeEventListener(ev, fn)); };
  const pick = (id) => AD.find((a) => a.id === id) || AD[0];
  const picker = (v, cur) => AD.map((a) => `<button type="button" class="vz-btn" id="s4-v${v}-${a.id.replace(/[^A-Za-z0-9]/g, "")}" data-m="${esc(a.id)}" aria-pressed="${a.id === cur}">${esc(nm(a))}${isLead(a) ? " · 리드" : ""}</button>`).join("");

  CV.css("s4", `
    .s4-tw { overflow-x: auto; border: 1px solid var(--line-strong); }
    .s4-tbl { border-collapse: collapse; width: 100%; min-width: 780px; font-size: 12.5px; background: var(--surface); }
    .s4-tbl th, .s4-tbl td { border-bottom: 1px solid var(--line); padding: 7px 8px; text-align: left; }
    .s4-tbl thead th { font-weight: 600; background: var(--raise); vertical-align: bottom; }
    .s4-tbl thead small { display: block; font-family: var(--mono); font-size: 10px; font-weight: 400; color: var(--muted); line-height: 1.35; margin-top: 2px; }
    .s4-tbl td.n { font-family: var(--mono); text-align: right; white-space: nowrap; }
    .s4-tbl tr.lead td { background: var(--film-3); }
    .s4-tbl tr.lead td:first-child { box-shadow: inset 4px 0 0 var(--me); }
    .s4-tbl .nm b { display: block; }
    .s4-tbl .nm span { font-size: 11px; color: var(--muted); }
    .s4-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); gap: 10px; }
    .s4-cards > div { border: 1px solid var(--line-strong); background: var(--paper); padding: 9px; display: grid; gap: 5px; align-content: start; }
    .s4-cards > div.lead { border: 2px solid var(--me); }
    .s4-cards > div.out { border-style: dashed; }
    .s4-cards h4 { margin: 0; font-size: 13px; display: flex; gap: 6px; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
    .s4-cards p { margin: 0; font-size: 11.5px; color: var(--muted); line-height: 1.45; }
    .s4-ctl { display: grid; gap: 8px; }
    .s4-sl { display: grid; gap: 2px; }
    .s4-sl label { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; font-weight: 600; }
    .s4-sl .val { font-family: var(--mono); font-weight: 600; }
    .s4-read { font-size: 12.5px; padding: 9px 10px; border: 1px solid var(--line); background: var(--paper); margin: 0; }
    .s4-read b { font-weight: 700; }
    .s4-read .hl { background: var(--hi); padding: 0 3px; }
    .s4-rowwrap { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .s4-sigs { display: flex; flex-wrap: wrap; gap: 8px 12px; }
    .s4-sigs > span { display: grid; gap: 2px; justify-items: start; }
    .s4-sigs .vz-lab { font-size: 10px; }
    .s4-sigs em { font-style: normal; font-size: 11px; color: var(--muted); }
    .s4-sl .vz-svg { max-width: 520px; }
  `);

  /* ───────────── 01 BOILED-Egg ───────────── */
  function v1() {
    const W = 840, H = 460, X = (v) => 74 + ((v + 2) / 9) * 720, Y = (t) => 404 - t * 2.42;
    const tro = AD.find((a) => !own(a));
    let b = `<defs><clipPath id="s4-v1-c"><rect x="74" y="40" width="720" height="364"/></clipPath></defs>`;
    b += `<rect x="74" y="40" width="720" height="364" fill="var(--raise)"/>`;
    b += `<g clip-path="url(#s4-v1-c)">`;
    b += `<ellipse cx="${X(2.3)}" cy="${Y(70)}" rx="364" ry="172" fill="var(--surface)" stroke="var(--line-strong)" stroke-width="1"/>`;
    b += `<ellipse cx="${X(3.2)}" cy="${Y(46)}" rx="196" ry="80" fill="var(--led)" fill-opacity="0.4" stroke="var(--warn)" stroke-width="1"/>`;
    b += `</g>`;
    b += `<text x="${X(-1.3)}" y="${Y(118)}" font-size="12.5" font-weight="600">흰자 — 장에서 잘 흡수(근사)</text>`;
    b += `<text x="${X(1.1)}" y="${Y(20)}" font-size="12.5" font-weight="600" fill="var(--warn)" style="fill:var(--warn)">노른자 — 뇌까지 들어감(근사)</text>`;
    b += `<text x="${X(-1.7)}" y="${Y(8)}" font-size="12" class="t-mu">회색 — 흡수 낮음</text>`;
    const hline = (t, lab) => `<line x1="74" x2="794" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="6 4" fill="none"/><text x="790" y="${Y(t) - 6}" text-anchor="end" font-size="11.5" class="t-m">${lab}</text>`;
    b += hline(140, "게임 규칙 · 경구 TPSA ≤ 140");
    b += hline(90, "게임 규칙 · 뇌 노출 TPSA ≤ 90");
    b += `<line x1="${X(5)}" x2="${X(5)}" y1="40" y2="404" stroke="var(--bad)" stroke-width="1.2" stroke-dasharray="3 4" fill="none"/>`;
    b += `<text x="${X(5) + 6}" y="${Y(118)}" font-size="11.5" class="t-m" fill="var(--bad)" style="fill:var(--bad)">Ro5 cLogP ≤ 5</text>`;
    for (let v = -2; v <= 7; v++) { b += `<line x1="${X(v)}" x2="${X(v)}" y1="404" y2="410" stroke="var(--ink)" stroke-width="1" fill="none"/><text x="${X(v)}" y="426" text-anchor="middle" font-size="12" class="t-m">${v}</text>`; }
    for (let t = 0; t <= 150; t += 30) { b += `<line x1="68" x2="74" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--ink)" stroke-width="1" fill="none"/><text x="63" y="${Y(t) + 4}" text-anchor="end" font-size="12" class="t-m">${t}</text>`; }
    b += `<text x="434" y="450" text-anchor="middle" font-size="12.5">cLogP — 기름에 녹는 정도 →</text>`;
    b += `<text x="8" y="26" font-size="12.5">TPSA(분자 표면의 극성 넓이, Å²) ↑</text>`;
    AD.forEach((a) => {
      const x = X(a.c.logp), y = Y(a.c.tpsa), c = colOf(a);
      if (isLead(a)) b += `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="var(--me)" stroke-width="2"/>`;
      b += own(a) ? `<circle cx="${x}" cy="${y}" r="6.5" fill="${c}" stroke="var(--paper)" stroke-width="1.5"/>`
        : `<rect x="${x - 6.5}" y="${y - 6.5}" width="13" height="13" transform="rotate(45 ${x} ${y})" fill="${c}" stroke="var(--paper)" stroke-width="1.5"/>`;
    });
    if (LEAD) b += `<text x="${X(LEAD.c.logp) - 18}" y="${Y(LEAD.c.tpsa) - 6}" text-anchor="end" font-size="12.5" font-weight="700" fill="var(--me)" style="fill:var(--me)">${esc(nm(LEAD))} · 리드</text>`;
    if (tro) b += `<text x="${X(tro.c.logp) + 14}" y="${Y(tro.c.tpsa) + 20}" font-size="12.5" font-weight="600" fill="var(--daon)" style="fill:var(--daon)">${esc(nm(tro))}</text>`;
    const near = AD.filter((a) => own(a) && !isLead(a));
    near.forEach((a, i) => { b += `<text x="${X(a.c.logp)}" y="${Y(a.c.tpsa) + 22 + (i % 2) * 14}" text-anchor="middle" font-size="11.5" class="t-m">${a.id.slice(-2)}</text>`; });
    return `${CV.svg(W, H, b, "cLogP 와 TPSA 평면에 놓인 다섯 분자")}
      <p class="vz-note">흰자 · 노른자 경계는 SwissADME 의 BOILED-Egg 그림(Daina &amp; Zoete, 2016)을 눈대중으로 옮긴 <b>근사</b>다(원래 가로축은 WLOGP). 게임 판정은 점선으로 그린 규칙을 따른다. CRX 4종은 TPSA ${f1(Math.min(...AD.filter(own).map((a) => a.c.tpsa)))}~${f1(Math.max(...AD.filter(own).map((a) => a.c.tpsa)))} 로 아래쪽에 몰려 있다 — 작고 기름져서 뇌에는 잘 가지만, 기름질수록 심장 · 간 신호가 나빠진다.</p>`;
  }

  /* ───────────── 02 물성 레이더 ───────────── */
  const AX = [
    { k: "logp", t: "지용성", min: -2, max: 6, lo: -0.7, hi: 5, d: 2 },
    { k: "mw", t: "크기", min: 0, max: 620, lo: 150, hi: 500, d: 1 },
    { k: "tpsa", t: "극성", min: 0, max: 160, lo: 20, hi: 130, d: 1 },
    { k: "rotb", t: "유연성", min: 0, max: 12, lo: 0, hi: 9, d: 0 },
    { k: "hbd", t: "HBD", min: 0, max: 8, lo: 0, hi: 5, d: 0 },
    { k: "hba", t: "HBA", min: 0, max: 14, lo: 0, hi: 10, d: 0 }
  ];
  function radar(a) {
    const cx = 112, cy = 116, Rr = 74, n = AX.length;
    const ang = (i) => ((-90 + (360 / n) * i) * Math.PI) / 180;
    const rr = (ax, v) => Rr * Math.max(0.04, Math.min(1.1, (v - ax.min) / (ax.max - ax.min)));
    const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
    const ring = (f) => AX.map((ax, i) => pt(i, f(ax)).map((v) => v.toFixed(1)).join(",")).join(" L");
    let b = "";
    [0.5, 1].forEach((q) => { b += `<polygon points="${ring(() => Rr * q).replace(/ L/g, " ")}" fill="none" stroke="var(--line)" stroke-width="1"/>`; });
    AX.forEach((ax, i) => { const [x, y] = pt(i, Rr); b += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="1" fill="none"/>`; });
    b += `<path d="M${ring((ax) => rr(ax, ax.hi))} Z M${ring((ax) => rr(ax, ax.lo))} Z" fill="var(--film-1)" fill-rule="evenodd" stroke="var(--line-strong)" stroke-width="1"/>`;
    b += `<polygon points="${ring((ax) => rr(ax, a.c[ax.k])).replace(/ L/g, " ")}" fill="var(--ink)" fill-opacity="0.07" stroke="${colOf(a)}" stroke-width="2"/>`;
    const outs = [];
    AX.forEach((ax, i) => {
      const v = a.c[ax.k], [x, y] = pt(i, rr(ax, v)), bad = v < ax.lo || v > ax.hi;
      if (bad) { outs.push(`${ax.t} ${v.toFixed(ax.d)}`); b += `<rect x="${(x - 5).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="10" height="10" fill="var(--bad)"/>`; }
      else b += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="${colOf(a)}"/>`;
      const [lx, ly] = pt(i, Rr + 16), anc = Math.abs(lx - cx) < 5 ? "middle" : lx > cx ? "start" : "end";
      b += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anc}" font-size="12" ${bad ? 'font-weight="700" fill="var(--bad)" style="fill:var(--bad)"' : ""}>${ax.t}</text>`;
    });
    return { svg: CV.svg(226, 232, b, `${a.name} 물성 레이더`), outs };
  }
  function v2() {
    const cells = AD.map((a) => {
      const r = radar(a);
      return `<div class="${isLead(a) ? "lead" : ""}"><h4>${esc(nm(a))}${isLead(a) ? ` <span class="vz-chip">리드</span>` : ""}</h4>${r.svg}
        <p>${r.outs.length ? `${chip("bad", `띠 밖 ${r.outs.length}곳`)} ${esc(r.outs.join(" · "))}` : chip("good", "여섯 축 모두 띠 안")}</p></div>`;
    }).join("");
    return `<div class="s4-cards">${cells}</div>
      <p class="vz-note">SwissADME 의 Bioavailability Radar 식 그림. 분홍 띠 = 먹는 약으로 알맞다고 보는 범위(지용성 cLogP −0.7~5 · 크기 MW 150~500 · 극성 TPSA 20~130 · 유연성 RotB ≤ 9). 원래 6축 중 용해도 · 포화도는 이 자료에 없어 Lipinski 의 HBD(수소결합 주는 자리 ≤ 5) · HBA(받는 자리 ≤ 10)로 바꿨다. 모양이 띠를 벗어난 쪽이 그 분자의 약점이다.</p>`;
  }
  /* ───────────── 03 신호등 표 ───────────── */
  function v3() {
    const head = `<tr><th>분자</th><th>결합력 p<small>2.1 도킹 결과</small></th><th>Ro5<small>위반 수</small></th>${SIG.map((s) => `<th>${esc(s.t)}<small>${esc(s.rule)}</small></th>`).join("")}<th>효능 E<small>경구 50 mg</small></th><th>안전 S<small>경구 50 mg</small></th></tr>`;
    const rows = AD.map((a) => `<tr class="${isLead(a) ? "lead" : ""}">
      <td class="nm"><b>${esc(nm(a))}${isLead(a) ? " · 리드" : ""}</b><span>${esc(sub(a))}</span></td>
      <td class="n">${f2(a.p)}</td><td>${chip(toneOf("ro5", a.s.ro5), textOf("ro5", a.s.ro5))}</td>
      ${SIG.map((s) => `<td>${chip(toneOf(s.k, a.s[s.k]), textOf(s.k, a.s[s.k]))}</td>`).join("")}
      <td class="n">${f1(a.sc.E)}</td><td class="n">${f1(a.sc.S)}</td></tr>`).join("");
    return `<div class="s4-tw"><table class="s4-tbl"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
      <div class="vz-row">${chip("good", "좋음 · 위험 낮음")}${chip("warn", "보통")}${chip("bad", "나쁨 · 위험 높음")}<span class="vz-chip">색 + 모양 + 글자</span></div>
      <p class="vz-note">잘 붙는 것(p)과 안전한 것(오른쪽 신호)은 따로 논다. CRX 4종은 결합력이 거의 같은데도 심장 hERG(심장 박동을 맡는 칼륨 통로) 위험이 모두 '높음'이라 안전 S 가 44.5 로 똑같이 깎였다. 표의 신호는 빠른 거름망일 뿐 모든 위험을 잡지는 못한다 — Troglitazone 은 신호가 깨끗해 보여도 실제로는 간 손상으로 2000년 미국 시장에서 내려갔다.</p>`;
  }

  /* ───────────── 04 몸속 여행 지도 ───────────── */
  function v4map(a) {
    const W = 880, H = 420, P = a.sc.parts, s = a.s;
    const bar = (x, y, w, v, tone) => `<rect x="${x}" y="${y}" width="${w}" height="12" fill="var(--raise)" stroke="var(--line-strong)" stroke-width="1"/><rect x="${x}" y="${y}" width="${(w * v).toFixed(1)}" height="12" fill="var(--${tone})"/>`;
    const organ = (x, y, w, h, title) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x + 10}" y="${y + 21}" font-size="13.5" font-weight="700">${esc(title)}</text>`;
    const arrow = (x1, y1, x2, y2, lab, pct) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink)" stroke-width="${1 + 3 * pct}" marker-end="url(#s4m)" fill="none"/><text x="${(x1 + x2) / 2 + 8}" y="${(y1 + y2) / 2 - 6}" font-size="11.5" class="t-m">${esc(lab)}</text>`;
    let b = `<defs><marker id="s4m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="var(--ink)"/></marker></defs>`;
    /* 입 → 장 */
    b += organ(20, 26, 180, 76, "입 — 먹는다");
    b += `<text x="30" y="68" font-size="12.5">경구 정제 50 mg</text>`;
    b += `<text x="30" y="88" font-size="11.5" class="t-mu">용량 계수 De ${f2(P.De)}</text>`;
    b += arrow(200, 64, 252, 64, "", 1);
    b += organ(252, 26, 220, 110, "장 — 피로 넘어간다");
    b += `<text x="262" y="70" font-size="12.5">경구 흡수 ${esc(LV[s.oral])} · ${esc(a.n.oral.split(" — ")[1] || "")}</text>`;
    b += bar(262, 82, 200, P.A, TONE[s.oral]);
    b += `<text x="262" y="110" font-size="12.5" class="t-m">흡수 계수 A = ${f2(P.A)}</text>`;
    b += `<text x="262" y="128" font-size="11.5" class="t-mu">100 중 ${Math.round(P.A * 100)} 만 피에 닿는다</text>`;
    b += arrow(472, 80, 524, 110, "", P.A);
    /* 혈액 */
    b += organ(524, 60, 150, 70, "피를 타고");
    b += `<text x="534" y="104" font-size="12" class="t-mu">몸 구석구석으로</text>`;
    /* 뇌 · 심장 · 간 */
    const toOrgan = (y, w) => `<polyline points="599,130 630,130 630,${y} 623,${y}" fill="none" stroke="var(--ink)" stroke-width="${w}" marker-end="url(#s4m)"/>`;
    b += toOrgan(202, 1 + 3 * P.B) + toOrgan(286, 1.6) + toOrgan(370, 1.6);
    b += organ(120, 170, 500, 64, "뇌 — 여기서 약효가 난다 (ACHE 는 CNS 표적)");
    b += `<text x="130" y="214" font-size="12.5">뇌 노출 ${esc(LV[s.bbb])} · ${esc(a.n.bbb.split(" — ")[1] || "")}</text>`;
    b += bar(396, 203, 120, P.B, TONE[s.bbb]);
    b += `<text x="610" y="214" text-anchor="end" font-size="12.5" class="t-m">B = ${f2(P.B)}</text>`;
    b += organ(120, 254, 500, 64, "심장 — hERG 통로를 막으면 박동이 흔들린다");
    b += `<text x="130" y="298" font-size="12.5">hERG 위험 ${esc(LV[s.herg])} · ${esc(a.n.herg.split(" — ")[1] || "")}</text>`;
    b += `<text x="610" y="298" text-anchor="end" font-size="12.5" class="t-m">위험 +${f2(P.hergR)}</text>`;
    b += organ(120, 338, 500, 64, "간 — 약을 부수다 상할 수 있다");
    b += `<text x="130" y="382" font-size="12.5">간독성 위험 ${esc(LV[s.hep])} · ${esc(a.n.hep.split(" — ")[1] || "")}</text>`;
    b += `<text x="610" y="382" text-anchor="end" font-size="12.5" class="t-m">위험 +${f2(P.hepR)}</text>`;
    /* 두 결과 */
    b += `<rect x="640" y="170" width="228" height="104" fill="var(--film-3)" stroke="var(--ink)" stroke-width="1.4"/>`;
    b += `<text x="650" y="192" font-size="11.5" class="t-m t-mu">E = (0.3+0.7p) × A × B × De × 100</text>`;
    b += `<text x="650" y="228" font-size="28" font-weight="700" class="t-m">${f1(a.sc.E)}</text>`;
    b += `<text x="650" y="252" font-size="11.5" class="t-mu">p ${f2(a.p)} · A ${f2(P.A)} · B ${f2(P.B)} · De ${f2(P.De)}</text>`;
    b += `<rect x="640" y="286" width="228" height="116" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.4"/>`;
    b += `<text x="650" y="308" font-size="11.5" class="t-m t-mu">S = 100 − Dt × (1+심장+간) × K</text>`;
    b += `<text x="650" y="344" font-size="28" font-weight="700" class="t-m">${f1(a.sc.S)}</text>`;
    b += `<text x="650" y="368" font-size="11.5" class="t-mu">Dt ${P.Dt} × ${f2(P.Rk)} × ${f2(P.K)} = ${f1(P.Dt * P.Rk * P.K)} 깎임</text>`;
    b += `<text x="650" y="390" font-size="11.5" font-weight="600" fill="${a.sc.S >= R.th.ind.s ? "var(--good)" : "var(--bad)"}" style="fill:${a.sc.S >= R.th.ind.s ? "var(--good)" : "var(--bad)"}">${a.sc.S >= R.th.ind.s ? `IND 기준 ${R.th.ind.s} 넘음` : `IND 기준 ${R.th.ind.s} 못 넘음`}</text>`;
    return CV.svg(W, H, b, `${a.name} 가 몸속에서 지나는 길`);
  }
  const V4 = {
    name: "몸속 여행 지도",
    kind: "흐름 지도 · 분자 고르기",
    idea: "고른 분자가 입에서 장 · 피 · 뇌 · 심장 · 간을 지나며 효능과 안전이 어떻게 깎이는지 길 위에 적는다.",
    learn: "잘 붙는 분자라도 장에서 덜 흡수되거나 뇌에 못 들어가면 효능이 줄고, 심장 · 간 위험이 크면 안전이 깎인다.",
    render: () => `<div class="vz-row">${picker(4, LEAD ? LEAD.id : AD[0].id)}</div><div class="s4-v4-map">${v4map(LEAD || AD[0])}</div>
      <p class="vz-note">화살표 굵기 = 그 길로 실제 지나가는 양. ACHE 는 뇌 안의 표적이라 뇌 노출 B 가 효능에 곱해진다(뇌에 못 들어가면 아무리 잘 붙어도 소용없다). Dt 는 용량에 따른 독성 부담(10 mg = 10 · 50 mg = 30 · 100 mg = 55), K 는 제형 계수(경구 1 · 정맥주사 1.25 · 경피 0.75)다.</p>`,
    mount: (el) => {
      const box = el.querySelector(".s4-v4-map");
      return bindAll(el, "[data-m]", "click", (e) => {
        const id = e.currentTarget.dataset.m;
        el.querySelectorAll("[data-m]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.m === id)));
        box.innerHTML = v4map(pick(id));
      });
    }
  };

  /* ───────────── 05 규칙 눈금자 ───────────── */
  function v5() {
    const W = 880, X0 = 240, X1 = 836;
    const ROWS = [
      { t: "경구 흡수 — TPSA", sub: "", k: "tpsa", lo: 0, hi: 160, unit: "Å²", d: 1, cuts: [{ v: 140, lab: "140 넘으면 '나쁨'" }] },
      { t: "뇌 노출 — TPSA", sub: "", k: "tpsa", lo: 0, hi: 160, unit: "Å²", d: 1, cuts: [{ v: 90, lab: "90 넘으면 '높음' 아님" }, { v: 120, lab: "120 넘으면 '낮음'" }] },
      { t: "뇌 노출 — 분자량 MW", sub: "", k: "mw", lo: 100, hi: 620, unit: "Da", d: 1, cuts: [{ v: 450, lab: "450 넘으면 '높음' 아님" }, { v: 500, lab: "500 · Ro5 경계" }] },
      { t: "심장 hERG — cLogP", sub: "염기성 아민이 있을 때만", k: "logp", lo: 0, hi: 6, unit: "", d: 2, cuts: [{ v: 2.5, lab: "2.5 넘으면 '보통'" }, { v: 3.7, lab: "3.7 넘으면 '높음'" }] },
      { t: "간독성 — cLogP", sub: "구조 경고가 없을 때", k: "logp", lo: 0, hi: 6, unit: "", d: 2, cuts: [{ v: 3, lab: "3 넘고 TPSA < 75 면 '보통'" }] },
      { t: "경피 투과 — cLogP", sub: "", k: "logp", lo: 0, hi: 6, unit: "", d: 2, cuts: [{ v: 1, lab: "1 아래면 '부적합'" }, { v: 4, lab: "4 넘으면 '부적합'" }] }
    ];
    /* 글자 너비를 어림해 겹치지 않는 줄에 라벨을 놓는다 */
    const wd = (s) => String(s).replace(/[가-힣]/g, "aa").length * 6.4;
    const place = (items, lanes) => items.map((it) => {
      const half = wd(it.text) / 2, l = it.x - half, r = it.x + half;
      let k = 0;
      while (lanes[k] && lanes[k].some((s) => !(r < s[0] - 6 || l > s[1] + 6))) k++;
      (lanes[k] = lanes[k] || []).push([l, r]);
      return Object.assign({ lane: k }, it);
    });
    let b = "", y = 30;
    ROWS.forEach((r) => {
      const X = (v) => X0 + ((v - r.lo) / (r.hi - r.lo)) * (X1 - X0);
      /* 경계값 라벨(축 위) */
      const cl = place(r.cuts.map((c) => ({ x: X(c.v), text: c.lab, v: c.v })), []);
      const cutRows = cl.length ? Math.max(...cl.map((c) => c.lane)) + 1 : 0;
      y += cutRows * 18;
      const ay = y;
      b += `<text x="10" y="${ay + 4}" font-size="13" font-weight="600">${esc(r.t)}</text>`;
      if (r.sub) b += `<text x="10" y="${ay + 22}" font-size="11" class="t-mu">${esc(r.sub)}</text>`;
      b += `<line x1="${X0}" x2="${X1}" y1="${ay}" y2="${ay}" stroke="var(--ink)" stroke-width="1.4" fill="none"/>`;
      [r.lo, r.hi].forEach((v, i) => {
        b += `<line x1="${X(v)}" x2="${X(v)}" y1="${ay - 5}" y2="${ay + 5}" stroke="var(--ink)" stroke-width="1.2" fill="none"/>`;
        b += `<text x="${X(v) + (i ? 0 : 0)}" y="${ay + 22}" text-anchor="${i ? "end" : "start"}" font-size="11.5" class="t-m t-mu">${v}${r.unit}</text>`;
      });
      cl.forEach((c) => {
        const ly = ay - 12 - c.lane * 18;
        b += `<line x1="${X(c.v)}" x2="${X(c.v)}" y1="${ly}" y2="${ay + 7}" stroke="var(--bad)" stroke-width="1.4" stroke-dasharray="3 3" fill="none"/>`;
        b += `<text x="${X(c.v)}" y="${ly - 4}" text-anchor="middle" font-size="11.5" font-weight="600" fill="var(--bad)" style="fill:var(--bad)">${esc(c.text)}</text>`;
      });
      /* 같은 값은 한 라벨로 묶는다 */
      const groups = [];
      AD.forEach((a) => {
        const v = a.c[r.k], g = groups.find((o) => Math.abs(o.v - v) < 1e-9);
        if (g) g.names.push(nm(a)); else groups.push({ v, names: [nm(a)], lead: isLead(a), col: colOf(a) });
        if (g && isLead(a)) { g.lead = true; g.col = colOf(a); }
      });
      groups.forEach((g) => { b += `<circle cx="${X(g.v)}" cy="${ay}" r="${g.lead ? 6 : 4.5}" fill="${g.col}" stroke="var(--paper)" stroke-width="1.2"/>`; });
      const gl = place(groups.map((g) => ({ x: X(g.v), text: `${g.names.join(" · ")} ${g.v.toFixed(r.d)}`, g })), []);
      gl.forEach((o) => { b += `<line x1="${o.x}" y1="${ay + 7}" x2="${o.x}" y2="${ay + 32 + o.lane * 18}" stroke="var(--line-strong)" stroke-width="1" fill="none"/>`; });
      gl.forEach((o) => {
        const ly = ay + 42 + o.lane * 18;
        b += `<text x="${o.x}" y="${ly}" text-anchor="middle" font-size="11.5" class="t-m" ${o.g.lead ? `font-weight="700" fill="var(--me)" style="fill:var(--me)"` : ""}>${esc(o.text)}</text>`;
      });
      const labRows = gl.length ? Math.max(...gl.map((o) => o.lane)) + 1 : 1;
      y = ay + 42 + labRows * 18 + 16;
    });
    return `${CV.svg(W, y, b, "신호 규칙의 경계값과 다섯 분자의 자리")}
      <p class="vz-note">규칙마다 경계가 있고, 분자는 그 선의 어느 쪽에 서느냐로 신호가 갈린다. 리드 ${esc(LEAD ? nm(LEAD) : "")}의 cLogP ${LEAD ? f2(LEAD.c.logp) : ""} 은 hERG 경계 3.7 을 겨우 ${LEAD ? f2(LEAD.c.logp - 3.7) : ""} 넘어서 위험 '높음'이 됐다 — 조금만 덜 기름지게 만들면 신호가 바뀐다.</p>`;
  }
  /* ───────────── 06 효능-안전 평면 ───────────── */
  function v6() {
    const W = 880, H = 470, PX0 = 76, PX1 = 600, PY0 = 60, PY1 = 400;
    const X = (e) => PX0 + (e / 100) * (PX1 - PX0), Y = (s) => PY1 - (s / 100) * (PY1 - PY0);
    const d10 = AD.map((a) => ({ a, r: CV.score(a.c, a.kcal, TID, "oral", 10, POP) }));
    let b = `<defs><marker id="s4d" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="var(--muted)"/></marker></defs>`;
    b += `<rect x="${X(45)}" y="${Y(100)}" width="${X(100) - X(45)}" height="${Y(55) - Y(100)}" fill="var(--good-bg)"/>`;
    b += `<text x="${X(72)}" y="${Y(96)}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--good)" style="fill:var(--good)">3상까지 통과하는 칸</text>`;
    b += `<text x="${X(72)}" y="${Y(89)}" text-anchor="middle" font-size="11.5" class="t-m" fill="var(--good)" style="fill:var(--good)">E ≥ 45 · S ≥ 55</text>`;
    b += `<line x1="${X(40)}" x2="${X(40)}" y1="${PY0}" y2="${PY1}" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="5 4" fill="none"/>`;
    b += `<text x="${X(40) - 5}" y="${PY0 + 14}" text-anchor="end" font-size="11.5" class="t-m t-mu">2상 E ≥ 40</text>`;
    b += `<line x1="${X(45)}" x2="${X(45)}" y1="${PY0}" y2="${PY1}" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="5 4" fill="none"/>`;
    b += `<text x="${X(45) + 5}" y="${PY1 - 10}" font-size="11.5" class="t-m">3상 E ≥ 45</text>`;
    const hl = (s, lab, col, dy) => `<line x1="${PX0}" x2="${PX1}" y1="${Y(s)}" y2="${Y(s)}" stroke="${col}" stroke-width="1.2" stroke-dasharray="5 4" fill="none"/><text x="${PX0 + 5}" y="${Y(s) + dy}" font-size="11.5" class="t-m" fill="${col}" style="fill:${col}">${lab}</text>`;
    b += hl(35, "IND S ≥ 35", "var(--muted)", 15) + hl(50, "1상 S ≥ 50", "var(--bad)", -5) + hl(55, "3상 S ≥ 55", "var(--ink)", -5);
    for (let v = 0; v <= 100; v += 20) {
      b += `<line x1="${X(v)}" x2="${X(v)}" y1="${PY1}" y2="${PY1 + 6}" stroke="var(--ink)" stroke-width="1" fill="none"/><text x="${X(v)}" y="${PY1 + 22}" text-anchor="middle" font-size="12" class="t-m">${v}</text>`;
      b += `<line x1="${PX0 - 6}" x2="${PX0}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--ink)" stroke-width="1" fill="none"/><text x="${PX0 - 11}" y="${Y(v) + 4}" text-anchor="end" font-size="12" class="t-m">${v}</text>`;
    }
    b += `<line x1="${PX0}" x2="${PX1}" y1="${PY1}" y2="${PY1}" stroke="var(--ink)" stroke-width="1.4" fill="none"/><line x1="${PX0}" x2="${PX0}" y1="${PY0}" y2="${PY1}" stroke="var(--ink)" stroke-width="1.4" fill="none"/>`;
    b += `<text x="${(PX0 + PX1) / 2}" y="${PY1 + 46}" text-anchor="middle" font-size="12.5">효능 E — 얼마나 잘 듣는가 →</text>`;
    b += `<text x="8" y="${PY0 - 12}" font-size="12.5">안전 S ↑</text>`;
    d10.forEach(({ a, r }) => {
      b += `<line x1="${X(a.sc.E)}" y1="${Y(a.sc.S)}" x2="${X(r.E)}" y2="${Y(r.S)}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#s4d)" fill="none"/>`;
      b += `<circle cx="${X(r.E)}" cy="${Y(r.S)}" r="3.5" fill="none" stroke="${colOf(a)}" stroke-width="1.4"/>`;
    });
    AD.forEach((a) => {
      const x = X(a.sc.E), y = Y(a.sc.S);
      if (isLead(a)) b += `<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="var(--me)" stroke-width="2"/>`;
      b += own(a) ? `<circle cx="${x}" cy="${y}" r="6" fill="${colOf(a)}" stroke="var(--paper)" stroke-width="1.4"/>`
        : `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" transform="rotate(45 ${x} ${y})" fill="${colOf(a)}" stroke="var(--paper)" stroke-width="1.4"/>`;
    });
    const rows = AD.slice().sort((p, q) => q.sc.E - p.sc.E);
    b += `<text x="632" y="${PY0 - 12}" font-size="12.5" font-weight="700">경구 50 mg 결과 — 점이 겹쳐 목록으로도 적는다</text>`;
    rows.forEach((a, i) => {
      const y = PY0 + 6 + i * 62;
      b += `<rect x="632" y="${y}" width="240" height="54" fill="${isLead(a) ? "var(--film-3)" : "var(--surface)"}" stroke="${isLead(a) ? "var(--me)" : "var(--line-strong)"}" stroke-width="${isLead(a) ? 2 : 1}"/>`;
      const cx = 648, cy = y + 18;
      b += own(a) ? `<circle cx="${cx}" cy="${cy}" r="6" fill="${colOf(a)}"/>` : `<rect x="${cx - 6}" y="${cy - 6}" width="12" height="12" transform="rotate(45 ${cx} ${cy})" fill="${colOf(a)}"/>`;
      b += `<text x="664" y="${cy + 5}" font-size="13" font-weight="600">${esc(nm(a))}${isLead(a) ? " · 리드" : ""}</text>`;
      b += `<text x="864" y="${cy + 5}" text-anchor="end" font-size="12" class="t-m">E ${f1(a.sc.E)} · S ${f1(a.sc.S)}</text>`;
      const note = !own(a) ? "표적이 달라 제외" : a.sc.S >= R.th.phase1.s ? "1상 기준 통과" : `1상 기준까지 ${f1(R.th.phase1.s - a.sc.S)} 모자람`;
      b += `<text x="648" y="${y + 44}" font-size="11.5" class="t-mu">${esc(note)}</text>`;
    });
    b += `<text x="${PX0}" y="${H - 8}" font-size="11.5" class="t-mu">속 빈 점 + 점선 = 같은 분자를 10 mg 로 낮췄을 때 — 안전은 오르고 효능은 내려간다</text>`;
    return `${CV.svg(W, H, b, "효능 E 와 안전 S 평면 위의 다섯 분자")}
      <p class="vz-note">경구 50 mg 기준. CRX 4종은 모두 1상 기준선(S ≥ 50) 아래에 있어 이대로는 임상에서 막힌다. 점선 화살표를 따라 10 mg 로 낮추면 안전은 기준 위로 올라가지만 효능은 내려간다 — 다음 단계(3.2 제형 · 용량)에서 이 맞바꿈을 정한다.</p>`;
  }

  /* ───────────── 07 리드 저울 ───────────── */
  function v7() {
    const W = 880, cards = AD.slice().sort((p, q) => Math.min(q.sc.E, q.sc.S) - Math.min(p.sc.E, p.sc.S) || q.sc.E - p.sc.E);
    const one = (a, i) => {
      const w = 236, H = 190, E = a.sc.E, S = a.sc.S, lo = Math.min(E, S);
      const tilt = Math.max(-16, Math.min(16, (E - S) * 0.5));
      const cx = w / 2, cy = 74, hw = 78;
      const rad = (tilt * Math.PI) / 180, dx = Math.cos(rad) * hw, dy = Math.sin(rad) * hw;
      let b = `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="150" stroke="var(--ink)" stroke-width="3" fill="none"/>`;
      b += `<polygon points="${cx - 22},150 ${cx + 22},150 ${cx},128" fill="var(--ink)"/>`;
      b += `<line x1="${cx - dx}" y1="${cy - dy}" x2="${cx + dx}" y2="${cy + dy}" stroke="var(--ink)" stroke-width="3" fill="none"/>`;
      const pan = (px, py, v, lab, col) => `<line x1="${px}" y1="${py}" x2="${px}" y2="${py + 16}" stroke="var(--line-strong)" stroke-width="1" fill="none"/>
        <rect x="${px - 34}" y="${py + 16}" width="68" height="30" fill="${col}" stroke="var(--ink)" stroke-width="1.2"/>
        <text x="${px}" y="${py + 37}" text-anchor="middle" font-size="15" font-weight="700" class="t-m" fill="var(--paper)" style="fill:var(--paper)">${f1(v)}</text>
        <text x="${px}" y="${py + 60}" text-anchor="middle" font-size="11.5" class="t-mu">${lab}</text>`;
      b += pan(cx - dx, cy - dy, E, "효능 E", "var(--ink)") + pan(cx + dx, cy + dy, S, "안전 S", "var(--me)");
      b += `<text x="${cx}" y="20" text-anchor="middle" font-size="13" font-weight="700">${i + 1}. ${esc(nm(a))}</text>`;
      b += `<text x="${cx}" y="38" text-anchor="middle" font-size="11.5" class="t-mu">약한 쪽 ${f1(lo)} 로 줄 세움</text>`;
      const bad = !own(a);
      return `<div class="${isLead(a) ? "lead" : bad ? "out" : ""}">${CV.svg(w, H, b, `${a.name} 효능과 안전 저울`)}
        ${isLead(a) ? chip("good", "리드로 뽑힘") : bad ? chip("bad", "제외 — 표적이 다름") : chip("warn", "후보로 남김")}
        <p>${bad ? "ACHE 가 아니라 PPAR(당 대사 수용체)을 겨냥해 만든 당뇨약이다. 점수가 가장 좋아도 이 프로그램의 리드가 될 수 없다." : esc(sub(a)) + ` · p ${f2(a.p)}`}</p></div>`;
    };
    return `<div class="s4-cards">${cards.map(one).join("")}</div>
      <p class="vz-note">효능과 안전 중 <b>약한 쪽</b>으로 줄을 세운다. 한쪽만 아주 좋은 분자는 결국 그 약한 쪽에서 막히기 때문이다. 약한 쪽이 같으면 효능이 큰 쪽을 고른다 — CRX 4종의 안전은 모두 44.5 라 효능 ${LEAD ? f1(LEAD.sc.E) : ""} 인 ${esc(LEAD ? nm(LEAD) : "")}가 리드가 됐다.</p>`;
  }

  /* ───────────── 08 신호 규칙 결정나무 ───────────── */
  function v8() {
    const W = 880, H = 440;
    const who = (f) => {
      const L = AD.filter(f).map(nm);
      if (!L.length) return "없음";
      return L.every((x) => x.startsWith("CRX-")) ? "CRX-" + L.map((x) => x.slice(4)).join(" · ") : L.join(" · ");
    };
    const box = (x, y, w, h, t, sm, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill || "var(--surface)"}" stroke="var(--ink)" stroke-width="1.3"/>
      <text x="${x + w / 2}" y="${y + 21}" text-anchor="middle" font-size="12.5" font-weight="600">${esc(t)}</text>
      ${sm ? `<text x="${x + w / 2}" y="${y + 39}" text-anchor="middle" font-size="11.5" class="t-mu">${esc(sm)}</text>` : ""}`;
    const leaf = (x, y, lvl, add, list) => {
      const tone = RTONE[lvl];
      return `<rect x="${x}" y="${y}" width="186" height="76" fill="var(--${tone}-bg)" stroke="var(--${tone})" stroke-width="1.6"/>
        <text x="${x + 93}" y="${y + 22}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--${tone})" style="fill:var(--${tone})">${MARK[tone]} ${esc(LV[lvl])}</text>
        <text x="${x + 93}" y="${y + 42}" text-anchor="middle" font-size="12" class="t-m">안전 깎임 +${add}</text>
        <text x="${x + 93}" y="${y + 62}" text-anchor="middle" font-size="11.5" class="t-mu">${esc(list)}</text>`;
    };
    const link = (x1, y1, x2, y2, lab, yes) => `<polyline points="${x1},${y1} ${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}" fill="none" stroke="var(--ink)" stroke-width="1.2"/>
      <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" text-anchor="middle" font-size="11.5" font-weight="600" fill="${yes ? "var(--bad)" : "var(--good)"}" style="fill:${yes ? "var(--bad)" : "var(--good)"}">${esc(lab)}</text>`;
    let b = `<text x="10" y="20" font-size="13.5" font-weight="700">심장 hERG 위험을 정하는 길</text>`;
    b += box(300, 34, 280, 50, "염기성 아민(+전하 질소)이 있나?", "signals(): p.ba > 0");
    b += link(380, 84, 180, 134, "없다", false) + link(500, 84, 640, 134, "있다", true);
    b += leaf(87, 134, "low", "0.00", who((a) => a.c.ba === 0));
    b += box(520, 134, 240, 50, "cLogP 가 3.7 이상인가?", "기름진 정도");
    b += link(580, 184, 420, 234, "아니다", false) + link(700, 184, 760, 234, "그렇다", true);
    b += leaf(327, 234, "moderate", "0.30", "이 다섯 중엔 없음");
    b += leaf(667, 234, "high", "0.60", who((a) => a.c.ba > 0 && a.c.logp >= 3.7));
    b += `<text x="10" y="334" font-size="13.5" font-weight="700">간독성 위험을 정하는 길</text>`;
    b += box(300, 348, 280, 50, "구조 경고가 있나? 없다면 cLogP > 3 이고 TPSA < 75 인가?", "");
    b += leaf(87, 348, "low", "0.00", who((a) => !(a.c.al.length || (a.c.logp > 3 && a.c.tpsa < 75))));
    b += leaf(667, 348, "moderate", "0.25", who((a) => !a.c.al.length && a.c.logp > 3 && a.c.tpsa < 75));
    b += `<text x="283" y="378" text-anchor="end" font-size="11.5" font-weight="600" fill="var(--good)" style="fill:var(--good)">아니다 ←</text>`;
    b += `<text x="597" y="378" font-size="11.5" font-weight="600" fill="var(--bad)" style="fill:var(--bad)">→ 그렇다</text>`;
    b += `<rect x="87" y="434" width="0" height="0" fill="none"/>`;
    return `${CV.svg(W, H, b, "심장과 간 위험 신호를 정하는 규칙 나무")}
      <p class="vz-note">두 위험을 더해 안전 계수 Rk = 1 + 심장 + 간 이 되고, 안전 S = 100 − Dt × Rk × K 로 깎인다. CRX 4종은 0.60 + 0.25 = 0.85 가 붙어 Rk ${f2(LEAD ? LEAD.sc.parts.Rk : 1.85)} 이 됐다. 규칙이 보는 것은 구조식에서 바로 세는 숫자뿐이라 빠르지만 거칠다 — 실제 실험에서는 다르게 나올 수 있다.</p>`;
  }
  /* ───────────── 09 물성 바꿔 보기 ───────────── */
  const BASE = (LEAD || AD[0]).c, BK = (LEAD || AD[0]).kcal;
  const WI = [
    { k: "logp", t: "cLogP — 기름에 녹는 정도", min: 0, max: 6, step: 0.01, d: 2, cuts: [1, 2.5, 3, 3.7, 4, 5] },
    { k: "tpsa", t: "TPSA — 표면의 극성 넓이(Å²)", min: 10, max: 160, step: 0.1, d: 1, cuts: [75, 90, 120, 140] },
    { k: "mw", t: "MW — 분자량(Da)", min: 150, max: 620, step: 0.1, d: 1, cuts: [450, 500] }
  ];
  function v9panel(st) {
    const c = Object.assign({}, BASE, st), s = CV.signals(c), r = CV.score(c, BK, TID, "oral", 50, POP);
    const b0 = LEAD ? LEAD.s : s, r0 = LEAD ? LEAD.sc : r;
    const row = (sg) => {
      const now = s[sg.k], was = b0[sg.k], chg = now !== was;
      return `<span><span class="vz-lab">${esc(sg.t)}</span>${chip(toneOf(sg.k, now), textOf(sg.k, now))}${chg ? `<em>처음엔 ${esc(LV[was])}</em>` : ""}</span>`;
    };
    const dE = r.E - r0.E, dS = r.S - r0.S;
    const sgn = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + f1(Math.abs(v));
    return `<div class="s4-sigs">${SIG.map(row).join("")}</div>
      <p class="s4-read">효능 E <b class="hl">${f1(r.E)}</b> (처음 ${f1(r0.E)} · ${sgn(dE)}) · 안전 S <b class="hl">${f1(r.S)}</b> (처음 ${f1(r0.S)} · ${sgn(dS)})<br>
      <span class="t-mu">A ${f2(r.parts.A)} · B ${f2(r.parts.B)} · 심장 ${f2(r.parts.hergR)} + 간 ${f2(r.parts.hepR)} → Rk ${f2(r.parts.Rk)}</span><br>
      ${r.S >= R.th.phase1.s ? `<span class="vz-sig good">● 1상 기준 S ≥ ${R.th.phase1.s} 넘음</span>` : r.S >= R.th.ind.s ? `<span class="vz-sig warn">▲ IND 는 통과(S ≥ ${R.th.ind.s}) · 1상 기준 ${R.th.phase1.s} 에는 모자람</span>` : `<span class="vz-sig bad">■ IND 기준 S ≥ ${R.th.ind.s} 에도 못 미침</span>`}</p>`;
  }
  function v9ruler(w, st) {
    const X = (v) => 16 + ((v - w.min) / (w.max - w.min)) * 568, v = st[w.k];
    let b = `<line x1="16" x2="584" y1="26" y2="26" stroke="var(--ink)" stroke-width="1.2" fill="none"/>`;
    w.cuts.forEach((c) => { b += `<line x1="${X(c)}" x2="${X(c)}" y1="14" y2="32" stroke="var(--bad)" stroke-width="1.4" stroke-dasharray="3 3" fill="none"/><text x="${X(c)}" y="48" text-anchor="middle" font-size="11.5" class="t-m" fill="var(--bad)" style="fill:var(--bad)">${c}</text>`; });
    b += `<circle cx="${X(BASE[w.k])}" cy="26" r="4" fill="none" stroke="var(--muted)" stroke-width="1.4"/>`;
    b += `<polygon points="${X(v)},18 ${X(v) - 7},4 ${X(v) + 7},4" fill="var(--me)"/>`;
    return CV.svg(600, 54, b, `${w.t} 눈금`);
  }
  const V9 = {
    name: "물성 바꿔 보기",
    kind: "what-if 슬라이더",
    idea: "리드 분자의 cLogP · TPSA · MW 를 움직여 보며, 어느 지점에서 신호와 효능 · 안전 점수가 바뀌는지 직접 넘겨 본다.",
    learn: "신호는 경계값 하나로 갈린다. 기름기를 조금만 줄여도 심장 위험이 내려가 안전 점수가 크게 오른다.",
    render: () => {
      const st = { logp: BASE.logp, tpsa: BASE.tpsa, mw: BASE.mw };
      const sl = WI.map((w) => `<div class="s4-sl"><label for="s4-v9-${w.k}">${esc(w.t)}<span class="val" data-v="${w.k}">${st[w.k].toFixed(w.d)}</span></label>
        <input type="range" class="vz-rng" id="s4-v9-${w.k}" data-k="${w.k}" min="${w.min}" max="${w.max}" step="${w.step}" value="${st[w.k]}">
        <div data-r="${w.k}">${v9ruler(w, st)}</div></div>`).join("");
      return `<div class="s4-wi">
        <div class="s4-ctl">${sl}<div class="vz-row"><button type="button" class="vz-btn" id="s4-v9-reset">리드 값으로 되돌리기</button></div></div>
        <div class="s4-v9-out">${v9panel(st)}</div></div>
        <p class="vz-note">바꾸는 것은 물성뿐이고 결합력 p ${f2((LEAD || AD[0]).p)} 는 그대로 뒀다(실제로는 구조를 바꾸면 결합력도 함께 바뀐다). 빨간 눈금은 규칙의 경계값, 빈 동그라미는 리드의 원래 값이다. 경구 50 mg 기준.</p>`;
    },
    mount: (el) => {
      const st = { logp: BASE.logp, tpsa: BASE.tpsa, mw: BASE.mw }, out = el.querySelector(".s4-v9-out");
      const draw = () => {
        out.innerHTML = v9panel(st);
        WI.forEach((w) => { el.querySelector(`[data-v="${w.k}"]`).textContent = st[w.k].toFixed(w.d); el.querySelector(`[data-r="${w.k}"]`).innerHTML = v9ruler(w, st); });
      };
      const off1 = bindAll(el, "input[data-k]", "input", (e) => { st[e.currentTarget.dataset.k] = +e.currentTarget.value; draw(); });
      const rs = el.querySelector("#s4-v9-reset");
      const onR = () => { WI.forEach((w) => { st[w.k] = BASE[w.k]; el.querySelector(`#s4-v9-${w.k}`).value = BASE[w.k]; }); draw(); };
      rs.addEventListener("click", onR);
      return () => { off1(); rs.removeEventListener("click", onR); };
    }
  };

  /* ───────────── 10 점수 분해 사슬 ───────────── */
  function v10chain(form, dose) {
    const a = LEAD || AD[0], r = CV.score(a.c, a.kcal, TID, form, dose, POP), P = r.parts, s = r.s;
    const W = 880, H = 330;
    const blk = (x, y, w, h, top, big, bot, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill || "var(--surface)"}" stroke="var(--ink)" stroke-width="1.3"/>
      <text x="${x + w / 2}" y="${y + 20}" text-anchor="middle" font-size="11.5" class="t-mu">${esc(top)}</text>
      <text x="${x + w / 2}" y="${y + 46}" text-anchor="middle" font-size="19" font-weight="700" class="t-m">${esc(big)}</text>
      <text x="${x + w / 2}" y="${y + 66}" text-anchor="middle" font-size="11" class="t-mu">${esc(bot)}</text>`;
    const op = (x, y, t) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="20" font-weight="700">${t}</text>`;
    const pstep = 0.3 + 0.7 * P.p;
    let b = `<text x="10" y="20" font-size="13" font-weight="700">효능 E — 얼마나 잘 듣는가</text>`;
    const Y1 = 30, Y2 = 190;
    b += blk(10, Y1, 118, 80, "결합력에서", f2(pstep), `0.3 + 0.7 × p ${f2(P.p)}`);
    b += op(142, Y1 + 48, "×") + blk(156, Y1, 118, 80, `장 흡수 ${LV[s.oral]}`, f2(P.A), `A · ${CV.FORM_SHORT[form]}`, `var(--${TONE[form === "transdermal" ? s.td : s.oral]}-bg)`);
    b += op(288, Y1 + 48, "×") + blk(302, Y1, 118, 80, `뇌 노출 ${LV[s.bbb]}`, f2(P.B), "B · CNS 표적", `var(--${TONE[s.bbb]}-bg)`);
    b += op(434, Y1 + 48, "×") + blk(448, Y1, 118, 80, `${dose} mg`, f2(P.De), "De · 용량 효과");
    b += op(580, Y1 + 48, "×") + blk(594, Y1, 70, 80, "", "100", "");
    b += op(678, Y1 + 48, "=") + blk(694, Y1, 176, 80, "효능 E", f1(r.E), r.E >= R.th.phase3.e ? `3상 기준 ${R.th.phase3.e} 넘음` : `3상 기준 ${R.th.phase3.e} 에 모자람`, "var(--film-3)");
    b += `<text x="10" y="180" font-size="13" font-weight="700">안전 S — 얼마나 덜 해로운가</text>`;
    b += blk(10, Y2, 118, 80, "", "100", "다치지 않은 상태");
    b += op(142, Y2 + 48, "−") + blk(156, Y2, 118, 80, `${dose} mg 부담`, String(P.Dt), "Dt · 용량 독성");
    b += op(288, Y2 + 48, "×") + blk(302, Y2, 118, 80, `심장 ${LV[s.herg]} · 간 ${LV[s.hep]}`, f2(P.Rk), `1 + ${f2(P.hergR)} + ${f2(P.hepR)}`, `var(--${RTONE[s.herg]}-bg)`);
    b += op(434, Y2 + 48, "×") + blk(448, Y2, 118, 80, CV.FORM_SHORT[form], f2(P.K), "K · 제형 계수");
    b += op(580, Y2 + 48, "=") + blk(594, Y2, 70, 80, "깎임", f1(P.Dt * P.Rk * P.K), P.Dt * P.Rk * P.K > 100 ? "100 넘음" : "");
    b += op(678, Y2 + 48, "→") + blk(694, Y2, 176, 80, "안전 S", f1(r.S), r.S >= R.th.phase1.s ? `1상 기준 ${R.th.phase1.s} 넘음` : r.S >= R.th.ind.s ? `IND ${R.th.ind.s} 통과 · 1상 ${R.th.phase1.s} 모자람` : r.S <= 0 ? "0 아래로는 안 내려감 · 탈락" : `IND 기준 ${R.th.ind.s} 미만`, r.S >= R.th.phase1.s ? "var(--good-bg)" : r.S >= R.th.ind.s ? "var(--warn-bg)" : "var(--bad-bg)");
    return CV.svg(W, H, b, "효능과 안전 점수를 재료별로 분해한 사슬");
  }
  const V10 = {
    name: "점수 분해 사슬",
    kind: "공식 분해 · 버튼",
    idea: "리드의 효능 E 와 안전 S 가 어떤 재료의 곱으로 나오는지 블록으로 늘어놓고, 제형과 용량을 바꿔 가며 어느 칸이 변하는지 본다.",
    learn: "점수는 결합력 하나가 아니라 흡수 · 뇌 노출 · 용량 · 위험이 곱해진 결과다. 한 칸만 0.75 가 돼도 전체가 함께 줄어든다.",
    render: () => `<div class="vz-row"><span class="vz-lab">제형</span>${Object.keys(CV.FORM).map((f) => `<button type="button" class="vz-btn" id="s4-v10-f-${f}" data-f="${f}" aria-pressed="${f === "oral"}">${esc(CV.FORM_SHORT[f])}</button>`).join("")}
      <span class="vz-lab">용량</span>${[10, 50, 100].map((d) => `<button type="button" class="vz-btn" id="s4-v10-d-${d}" data-d="${d}" aria-pressed="${d === 50}">${d} mg</button>`).join("")}</div>
      <div class="s4-v10-c">${v10chain("oral", 50)}</div>
      <p class="vz-note">${esc(LEAD ? LEAD.name : "")} 기준. 경구는 장을 지나야 해서 흡수 신호가 A 로 들어가고, 정맥주사는 바로 피에 들어가 A = 1 이지만 한 번에 높은 농도가 몰려 K 가 1.25 로 커진다(그만큼 안전이 더 깎인다). 이 선택은 다음 단계 3.2 에서 확정한다.</p>`,
    mount: (el) => {
      let form = "oral", dose = 50;
      const box = el.querySelector(".s4-v10-c");
      const redraw = () => { box.innerHTML = v10chain(form, dose); };
      const off1 = bindAll(el, "[data-f]", "click", (e) => {
        form = e.currentTarget.dataset.f;
        el.querySelectorAll("[data-f]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === form)));
        redraw();
      });
      const off2 = bindAll(el, "[data-d]", "click", (e) => {
        dose = +e.currentTarget.dataset.d;
        el.querySelectorAll("[data-d]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.d === dose)));
        redraw();
      });
      return () => { off1(); off2(); };
    }
  };

  window.VIZ[4] = [
    {
      name: "BOILED-Egg",
      kind: "산점도 · 허용 영역",
      idea: "cLogP 와 TPSA 두 물성만으로 그린 평면에 다섯 분자를 놓고, 장 흡수(흰자) · 뇌 투과(노른자) 영역과 게임 규칙선을 함께 그린다.",
      learn: "흡수와 뇌 노출은 분자의 물성 두 가지로 대강 가늠할 수 있고, 규칙마다 경계가 조금씩 다르다.",
      render: v1
    },
    {
      name: "물성 레이더",
      kind: "레이더 · 작은 배수",
      idea: "분자마다 여섯 축 레이더를 그려, 먹는 약으로 알맞은 분홍 띠를 벗어나는 축이 어디인지 한눈에 견준다.",
      learn: "분자마다 약점이 다르다. 모양이 띠를 벗어난 축이 그 분자가 약이 되기 어려운 이유다.",
      render: v2
    },
    {
      name: "신호등 표",
      kind: "표 · 신호등",
      idea: "다섯 분자의 결합력과 다섯 가지 안전 · 흡수 신호, 그리고 효능 E · 안전 S 를 한 표에 나란히 놓는다.",
      learn: "잘 붙는다고 좋은 약이 아니다. 결합력과 안전 신호를 함께 봐야 리드를 고를 수 있다.",
      render: v3
    },
    V4,
    {
      name: "규칙 눈금자",
      kind: "눈금자 · 경계값",
      idea: "신호 규칙마다 눈금자를 하나씩 놓고 경계값을 점선으로 그은 뒤, 다섯 분자가 선의 어느 쪽에 서는지 찍는다.",
      learn: "신호는 경계값 하나로 갈린다. 우리 리드는 심장 위험 경계를 아슬아슬하게 넘어 '높음'이 됐다.",
      render: v5
    },
    {
      name: "효능-안전 평면",
      kind: "산점도 · 기준선",
      idea: "효능 E 를 가로, 안전 S 를 세로로 놓고 IND · 1 · 2 · 3상 기준선을 그어 다섯 분자가 어느 칸에 있는지 본다.",
      learn: "리드는 두 축을 함께 넘겨야 하고, 용량을 낮추면 안전이 오르는 대신 효능이 내려간다.",
      render: v6
    },
    {
      name: "리드 저울",
      kind: "실물 은유 · 저울",
      idea: "분자마다 효능과 안전을 양쪽 접시에 올린 저울을 그리고, 약한 쪽 숫자로 줄을 세운다.",
      learn: "리드는 약한 쪽이 가장 덜 나쁜 분자다. 점수 1위라도 표적이 다르면 아예 후보에서 빠진다.",
      render: v7
    },
    {
      name: "규칙 나무",
      kind: "결정나무 · 흐름도",
      idea: "심장 hERG 와 간독성 신호를 정하는 질문을 가지로 그리고, 다섯 분자가 어느 잎에 떨어지는지 적는다.",
      learn: "위험 신호는 구조에서 바로 세는 숫자 몇 개로 갈린다. 빠르지만 거칠어서 실제 실험과 다를 수 있다.",
      render: v8
    },
    V9,
    V10
  ];
})();

