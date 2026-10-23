/* 4.2 최종 허가 — 시각화 시안 10종 */
(function () {
  "use strict";
  const CV = window.CV, { EX, esc, f1, f2, R } = CV;
  const MX = CV.MX;

  /* ── 이 파일 도우미 ── */
  const TR = EX.trials, LEAD = EX.lead, AP = EX.approval, PG = EX.program, T0 = EX.t;
  const POP = EX.ind ? EX.ind.pop : CV.TRIAL[EX.tid].pops[0];
  const FORM0 = EX.ind ? EX.ind.form : "oral";
  const PH = ["phase1", "phase2", "phase3"], PHL = { phase1: "1상", phase2: "2상", phase3: "3상" };
  const sc = (form, dose) => CV.score(LEAD.c, LEAD.kcal, EX.tid, form, +dose, POP);
  const r1 = (v) => Math.round(v * 10) / 10;
  const pc = (p) => (p * 100).toFixed(1) + "%";
  const share = (form) => Math.min(20, 12 * R.approvalMult[form]);
  /* 단계마다 끝난 날(index.html 위 띠의 dayAt 과 같은 값) · 실제로 쓴 돈 */
  const trialSum = Math.round(TR.reduce((a, t) => a + t.cost, 0) * 1000) / 1000;
  const DAY = { 1: 0, 2: 0, 3: 2, 4: 4, 5: PG.day, 6: EX.ind.day, 7: TR[TR.length - 1].day, 8: AP.day };
  const COST = { 1: 0, 2: R.cost.htvs, 3: R.cost.docking, 4: R.cost.admet, 5: R.cost.patent, 6: R.cost.ind, 7: trialSum, 8: R.cost.final };
  const LEFT = Math.round((R.startCash - AP.spent) * 1000) / 1000;
  const N0 = EX.screen.stages[0].n;
  /* 흔들림 통과 확률(게임 규칙: −r..+r 정수 균등, E · S 에 같은 n) */
  function prob(b, k) {
    const r = R.noise[k], th = R.th[k]; let ok = 0;
    for (let n = -r; n <= r; n++) { const e = Math.max(0, r1(b.E + n)), s = Math.max(0, r1(b.S + n)); if ((th.e == null || e >= th.e) && (th.s == null || s >= th.s)) ok++; }
    return { ok, tot: 2 * r + 1, p: ok / (2 * r + 1) };
  }
  const T = (x, y, s, a = "") => `<text x="${x}" y="${y}" ${a}>${esc(s)}</text>`;
  const btns = (id, key, items, cur) => items.map(([v, l]) =>
    `<button type="button" class="vz-btn" id="${id}-${v}" data-${key}="${v}" aria-pressed="${String(v) === String(cur)}">${esc(l)}</button>`).join("");
  function wire(el, keys, state, draw) {
    const out = el.querySelector("[data-out]");
    const on = (e) => {
      const b = e.target.closest("button"); if (!b || !el.contains(b)) return;
      for (const k of keys) if (b.dataset[k] != null) {
        state[k] = b.dataset[k];
        el.querySelectorAll(`button[data-${k}]`).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        out.innerHTML = draw(state); return;
      }
    };
    el.addEventListener("click", on);
    return () => el.removeEventListener("click", on);
  }
  const tone = (pass) => (pass ? "var(--good)" : "var(--bad)");

  CV.css("s8", `
    .s8-ctl { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
    .s8-ctl [role="group"] { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .s8-ctl .vz-lab { margin-right: 4px; }
    .s8-src { font-size: 11px; color: var(--muted); margin: 0; max-width: 90ch; }
    /* 허가증 */
    .s8-cert { border: 2px solid var(--ink); background: var(--paper); padding: 18px 20px; display: grid; gap: 12px; min-width: 0; max-width: 760px;
      box-shadow: inset 0 0 0 4px var(--paper), inset 0 0 0 5px var(--line-strong); }
    .s8-cert-top { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: baseline; font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; color: var(--muted); text-transform: uppercase; }
    .s8-cert-h { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .s8-cert-h h3 { margin: 0; font-family: var(--serif); font-size: 34px; letter-spacing: -0.02em; line-height: 1.1; }
    .s8-cert-h p { margin: 4px 0 0; font-size: 13px; color: var(--muted); }
    .s8-cert-h .s8-kind { font-family: var(--serif); font-size: 15px; font-weight: 700; color: var(--ink); }
    .s8-stamp { width: 112px; flex: none; transform: rotate(-11deg); }
    .s8-dl { display: grid; grid-template-columns: max-content minmax(0, 1fr) auto; margin: 0; border-top: 1px solid var(--line-strong); }
    .s8-dl > * { padding: 6px 8px; border-bottom: 1px solid var(--line); margin: 0; font-size: 13px; }
    .s8-dl dt { color: var(--muted); font-size: 12px; padding-left: 0; }
    .s8-dl dd.s8-st { padding-right: 0; text-align: right; }
    .s8-st span { display: inline-block; font-family: var(--mono); font-size: 10.5px; padding: 1px 5px; background: var(--film); border: 1px solid var(--line-strong); white-space: nowrap; }
    .s8-dl .mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }
    .s8-cert-f { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; }
    .s8-cert-f b { font-family: var(--mono); }
    @media (max-width: 520px) { .s8-dl { grid-template-columns: max-content minmax(0, 1fr); } .s8-dl dd.s8-st { grid-column: 1 / -1; text-align: left; border-bottom: 1px solid var(--line-strong); } .s8-cert-h h3 { font-size: 26px; } }
    /* 바인더 */
    .s8-bind { display: grid; grid-template-columns: minmax(0, 1fr) 150px; border: 1px solid var(--line-strong); background: var(--paper); min-width: 0; }
    .s8-tabs { display: flex; flex-direction: column; border-left: 1px solid var(--line-strong); background: var(--raise); }
    .s8-tab { appearance: none; border: 0; border-bottom: 1px solid var(--line); background: transparent; border-radius: 0; text-align: left; padding: 7px 10px; display: grid; gap: 0; font-size: 12px; }
    .s8-tab b { font-family: var(--mono); font-size: 11px; }
    .s8-tab:hover { background: var(--surface); }
    .s8-tab[aria-pressed="true"] { background: var(--paper); box-shadow: inset 4px 0 0 var(--ink); margin-left: -1px; }
    .s8-tab[data-last] { background: var(--hi); }
    .s8-tab[data-last][aria-pressed="true"] { background: var(--hi); }
    .s8-page { padding: 16px 18px; display: grid; gap: 10px; align-content: start; min-width: 0; }
    .s8-page h4 { margin: 0; font-size: 16px; }
    .s8-page .s8-proof { margin: 0; font-family: var(--serif); font-size: 15px; font-weight: 700; }
    .s8-page ul { margin: 0; padding-left: 18px; display: grid; gap: 3px; font-size: 13px; }
    .s8-page .mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }
    .s8-sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); gap: 6px; }
    .s8-sheet span { border: 1px solid var(--line); padding: 4px 6px; font-size: 12px; background: var(--surface); }
    @media (max-width: 560px) { .s8-bind { grid-template-columns: minmax(0, 1fr); } .s8-tabs { flex-direction: row; flex-wrap: wrap; border-left: 0; border-top: 1px solid var(--line-strong); order: -1; } .s8-tab { flex: 1 1 25%; border-right: 1px solid var(--line); } .s8-tab[aria-pressed="true"] { box-shadow: inset 0 -3px 0 var(--ink); margin-left: 0; } }
    /* LED */
    .s8-board { background: var(--night); padding: 12px 14px; display: flex; gap: 10px 18px; flex-wrap: wrap; align-items: center; }
    .s8-led { font-family: var(--mono); font-weight: 600; letter-spacing: 0.05em; font-size: 19px; color: var(--led); text-shadow: 0 0 8px rgba(255, 178, 26, 0.55);
      -webkit-mask-image: radial-gradient(circle, #000 0.95px, transparent 1.3px); -webkit-mask-size: 3px 3px; mask-image: radial-gradient(circle, #000 0.95px, transparent 1.3px); mask-size: 3px 3px; }
    .s8-led.g { color: var(--led-g); text-shadow: 0 0 8px rgba(141, 255, 90, 0.5); }
    /* 영수증 */
    .s8-rc { font-family: var(--mono); font-size: 12.5px; font-variant-numeric: tabular-nums; background: var(--paper); border: 1px solid var(--line-strong); padding: 16px 16px 20px; max-width: 460px; width: 100%;
      -webkit-mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 12px 100%; mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 12px 100%; }
    .s8-rc h4 { margin: 0; text-align: center; font-size: 14px; letter-spacing: 0.12em; }
    .s8-rc p { margin: 0; text-align: center; color: var(--muted); font-size: 11.5px; }
    .s8-rc table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .s8-rc td { padding: 3px 0; vertical-align: top; }
    .s8-rc td:nth-child(2) { color: var(--muted); padding: 3px 8px; white-space: nowrap; }
    .s8-rc td:last-child { text-align: right; white-space: nowrap; }
    .s8-rc tr.s8-sep td { border-top: 1px dashed var(--line-strong); padding-top: 6px; }
    .s8-rc tr.s8-fail td { color: var(--bad); }
    .s8-rc tr.s8-tot td { font-size: 15px; font-weight: 600; }
    .s8-rcbar { display: flex; height: 16px; border: 1px solid var(--ink); margin: 8px 0 4px; }
    .s8-rcbar i { display: block; height: 100%; }
    .s8-rcleg { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 11px; }
    .s8-rcleg i { display: inline-block; width: 9px; height: 9px; margin-right: 4px; border: 1px solid var(--line-strong); }
    .s8-side { display: grid; gap: 10px; align-content: start; }
    .s8-big { display: grid; gap: 2px; border-left: 3px solid var(--ink); padding: 4px 0 4px 12px; }
    .s8-big b { font-family: var(--mono); font-size: 26px; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
    .s8-big span { font-size: 12.5px; color: var(--muted); }
    /* 포장 */
    .s8-txt { display: grid; gap: 4px; max-width: 280px; }
    .s8-txt label { font-size: 12.5px; font-weight: 600; }
    .s8-txt input { border: 1px solid var(--line-strong); border-radius: 0; background: var(--paper); padding: 6px 8px; font-size: 14px; }
  `);

  /* ───────── 1. 품목 허가증 ───────── */
  function stamp() {
    return `<svg class="s8-stamp" viewBox="0 0 120 120" role="img" aria-label="허가 도장">
      <circle cx="60" cy="60" r="54" fill="none" stroke="var(--bad)" stroke-width="4"/><circle cx="60" cy="60" r="45" fill="none" stroke="var(--bad)" stroke-width="1.5"/>
      <text x="60" y="66" text-anchor="middle" font-size="30" font-weight="700" style="fill:var(--bad);font-family:var(--serif)">허가</text>
      <text x="60" y="36" text-anchor="middle" font-size="11" style="fill:var(--bad);font-family:var(--mono)">FDA · NDA</text>
      <text x="60" y="88" text-anchor="middle" font-size="11" style="fill:var(--bad);font-family:var(--mono)">D+${AP.day}</text></svg>`;
  }
  function v1() {
    const s = LEAD.s, LV = CV.LV;
    const t1 = TR[1], t2 = TR[2], t3 = TR[3];
    const rows = [
      ["회사", `${PG.company} (${PG.ticker})`, ["3.1"]],
      ["적응증", `${T0.disease} — ${POP}`, ["1.1", "3.2"]],
      ["표적 · 기전", `${T0.gene} (PDB ${T0.pdb}) · ${PG.mech}`, ["1.1"]],
      ["성분", LEAD.name, ["1.2", "2.2"]],
      ["결합", `${f2(LEAD.kcal)} kcal/mol (기준 ${T0.ref} ${f2(T0.refKcal)})`, ["2.1"], 1],
      ["몸속 신호", `경구 흡수 ${LV[s.oral]} · 뇌 노출 ${LV[s.bbb]} · hERG ${LV[s.herg]} · 간독성 ${LV[s.hep]}`, ["2.2"]],
      ["물질특허", `${PG.patentNo} (D+${PG.day})`, ["3.1"], 1],
      ["제형 · 용량", `${CV.FORM[FORM0]} · ${AP.dose} mg (IND ${EX.ind.dose} mg → 1상 뒤 변경)`, ["3.2", "4.1"]],
      ["임상 결과", `1상 S ${f1(t1.S)} · 2상 E ${f1(t2.E)} · 3상 E ${f1(t3.E)} / S ${f1(t3.S)}`, ["4.1"], 1],
      ["최종 심사", `서류 심사 ${R.days.final}일 · ${MX(R.cost.final)} · 새 판정 없음`, ["4.2"]],
      ["시장 점유 기본값", `${f1(AP.share)}% (12% × ${CV.FORM_SHORT[FORM0]} 배율 ${AP.mult})`, ["4.2"], 1]
    ];
    return `<div class="s8-cert">
      <div class="s8-cert-top"><span>품목 허가증 · New Drug Application</span><span>No. ${esc(PG.code)}-${AP.day}</span></div>
      <div class="s8-cert-h"><div><span class="s8-kind">신약 품목 허가</span><h3>${esc(AP.brand)}</h3><p>${esc(PG.code)} · ${esc(LEAD.name)} · ${AP.dose} mg</p></div>${stamp()}</div>
      <dl class="s8-dl">${rows.map(([k, v, st, m]) => `<dt>${esc(k)}</dt><dd${m ? ' class="mono"' : ""}>${esc(v)}</dd><dd class="s8-st">${st.map((x) => `<span>${x}</span>`).join(" ")}</dd>`).join("")}</dl>
      <div class="s8-cert-f"><span>허가일 <b>D+${AP.day}</b></span><span>쓴 연구비 <b>${MX(AP.spent)}</b> / 처음 ${MX(R.startCash)}</span><span>분자 <b>${N0} → 1</b></span></div>
    </div><p class="vz-note">오른쪽 무지개 꼬리표 = 그 줄의 증거가 나온 단계. 도장 하나 뒤에 1.1부터 4.1까지 모든 단계의 결과가 모여 있다.</p>`;
  }

  /* ───────── 2. 증거 바인더 ───────── */
  function pages() {
    const tg = (EX.disease && EX.disease.targets) || [];
    const st = EX.screen.stages, dk = EX.dock, ld = LEAD;
    return [
      { k: "1.1", t: "표적", proof: "이 단백질을 막으면 병에 도움이 된다", body: `<p class="vz-note">${esc(T0.disease)} 연관 표적 ${tg.length}개 중, 결정구조가 준비돼 도킹할 수 있는 것은 ${esc(T0.gene)}(${esc(T0.pdb)}) 하나.</p>
        <div class="s8-sheet">${tg.map((x) => `<span class="mono">${esc(x.symbol)} ${f2(x.overallScore)} ${x.dockingTargetId ? "✓ 구조" : "✕ 구조 없음"}</span>`).join("")}</div>` },
      { k: "1.2", t: "스크리닝", proof: "약 같은 모양의 분자만 골랐다", body: `<ul>${st.map((x) => `<li><span class="mono">${x.n}</span> — ${esc(x.label)} <span class="muted">(${esc(x.rule)})</span></li>`).join("")}</ul>` },
      { k: "2.1", t: "도킹", proof: "표적 주머니에 단단히 붙는다(예측)", body: `<ul>${dk.map((d) => `<li class="mono">${f2(d.kcal)} kcal/mol · p ${f2(d.p)} — ${esc(d.name)}${d.id === ld.id ? " ← 리드" : ""}</li>`).join("")}</ul>` },
      { k: "2.2", t: "ADMET", proof: "몸속에서 잘 돌고, 위험 신호도 알고 있다", body: `<ul>${["ro5", "oral", "bbb", "herg", "hep"].map((k) => `<li>${esc(ld.n[k])}</li>`).join("")}</ul>
        <p class="vz-note">hERG(심장 리듬 위험) 높음 같은 나쁜 신호도 숨기지 않고 서류에 넣는다.</p>` },
      { k: "3.1", t: "특허", proof: "이 분자는 우리 것이다", body: `<ul><li>${esc(PG.company)} (${esc(PG.ticker)}) · 프로그램 ${esc(PG.code)}</li><li>${esc(PG.plabel)} · ${esc(PG.mech)}</li><li class="mono">물질특허 ${esc(PG.patentNo)} · D+${PG.day}</li></ul>` },
      { k: "3.2", t: "IND", proof: "사람에게 처음 줘도 될 만큼 안전하다", body: `<ul><li>${esc(CV.FORM[EX.ind.form])} · ${EX.ind.dose} mg · ${esc(EX.ind.pop)}</li><li>평가지표: ${esc(EX.ind.ep)}</li>
        <li class="mono">S ${f1(EX.ind.S)} ≥ ${R.th.ind.s} → 승인 · D+${EX.ind.day}</li></ul>` },
      { k: "4.1", t: "임상", proof: "사람에게 안전하고 효과가 있다", body: `<ul>${TR.map((t) => `<li class="mono" style="color:${tone(t.pass)}">${t.label} ${t.dose} mg · E ${f1(t.E)} · S ${f1(t.S)} · ${t.pass ? "통과 ✓" : "실패 ✕"} · D+${t.day}</li>`).join("")}</ul>
        <p class="vz-note">실패한 1상 기록도 지우지 않는다 — 왜 10 mg 로 바꿨는지의 증거다.</p>` },
      { k: "4.2", t: "허가 신청", last: true, proof: "앞의 7장을 한 묶음으로 낸다", body: `<ul><li>새 실험 없음 — 서류만 심사</li><li class="mono">${R.days.final}일 · ${MX(R.cost.final)}</li><li>허가 → 브랜드 「${esc(AP.brand)}」 공개 · 전광판 · 증권거래소</li></ul>` }
    ];
  }
  function page(k) {
    const p = pages().find((x) => x.k === k);
    return `<h4>${esc(p.k)} ${esc(p.t)}</h4><p class="s8-proof">증명: ${esc(p.proof)}</p>${p.body}`;
  }
  function v2() {
    const P = pages();
    return `<div class="s8-bind"><div class="s8-page" data-out aria-live="polite">${page("4.2")}</div>
      <div class="s8-tabs" role="group" aria-label="서류 탭">${P.map((p) => `<button type="button" class="s8-tab" id="s8-v2-t-${p.k.replace(".", "")}" data-p="${p.k}" aria-pressed="${p.k === "4.2"}" ${p.last ? "data-last" : ""}><b>${p.k}</b>${esc(p.t)}</button>`).join("")}</div></div>
      <p class="vz-note">탭을 눌러 서류철을 넘겨 보세요. 최종 심사 ${R.days.final}일 동안 FDA 는 이 8장을 읽고 판단한다 — 새로운 운(흔들림)은 없다.</p>`;
  }

  /* ───────── 3. 여정 노선도 ───────── */
  function v3() {
    const W = 900, H = 360, X = (i) => 60 + i * 111, LY = 110;
    const GC = { 1: "var(--seum)", 2: "var(--daon)", 3: "var(--mirp)", 4: "var(--me)" };
    let s = "";
    CV.STEPS.forEach((st, i) => {
      if (i < 7) s += `<line x1="${X(i)}" x2="${X(i + 1)}" y1="${LY}" y2="${LY}" stroke="${GC[CV.STEPS[i + 1].ph === st.ph ? st.ph : CV.STEPS[i + 1].ph]}" stroke-width="9"/>`;
    });
    /* 4.1 되돌이: 1상 실패 → 용량 변경 → 재시험 */
    const x7 = X(6);
    s += `<path d="M${x7 - 10} ${LY + 6} C ${x7 - 54} ${LY + 92}, ${x7 + 54} ${LY + 92}, ${x7 + 10} ${LY + 6}" fill="none" stroke="var(--bad)" stroke-width="3" stroke-dasharray="6 4"/>`;
    s += `<rect x="${x7 - 8}" y="${LY + 62}" width="16" height="16" fill="var(--paper)" stroke="var(--bad)" stroke-width="2"/>` + T(x7, LY + 75, "✕", 'font-size="12" text-anchor="middle" font-weight="700" style="fill:var(--bad)"');
    s += T(x7 - 50, LY + 100, `1상 50 mg 실패 → 10 mg 로 재시험`, 'font-size="11.5" text-anchor="end" style="fill:var(--bad)"');
    s += T(x7 - 50, LY + 115, `+${R.days.phase1}일 · +${MX(R.cost.phase1)}`, 'font-size="11" class="t-m" text-anchor="end" style="fill:var(--bad)"');
    CV.STEPS.forEach((st, i) => {
      const x = X(i), last = i === 7;
      s += last ? `<circle cx="${x}" cy="${LY}" r="15" fill="var(--hi)" stroke="var(--ink)" stroke-width="3"/>` : `<circle cx="${x}" cy="${LY}" r="9" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/>`;
      s += T(x, 42, st.code, 'font-size="13" class="t-m" text-anchor="middle" font-weight="700"');
      s += T(x, 60, st.short, 'font-size="12.5" text-anchor="middle"');
      s += T(x, 80, i === 6 ? `D+${DAY[st.n]} · ${MX(COST[st.n])}` : `D+${DAY[st.n]}`, `font-size="11.5" class="t-m ${i === 6 ? "" : "t-mu"}" text-anchor="middle" ${i === 6 ? 'font-weight="700"' : ""}`);
      if (i !== 6) s += T(x, LY + 34, COST[st.n] ? MX(COST[st.n]) : "무료", 'font-size="11" class="t-m" text-anchor="middle"');
    });
    /* 시간 띠: 역 간격은 같지만 실제 시간은 이렇다 */
    const SY = 300, TX = (d) => 60 + (d / AP.day) * (X(7) - 60);
    s += T(X(6) - 70, SY - 20, "같은 간격의 역을 진짜 날짜 위로 옮기면 ↓", 'font-size="12" font-weight="600" text-anchor="end"');
    CV.STEPS.forEach((st, i) => { s += `<line x1="${X(i)}" y1="${LY + (i === 6 ? 120 : 44)}" x2="${TX(DAY[st.n])}" y2="${SY - 8}" stroke="var(--line-strong)" stroke-dasharray="2 3"/>`; });
    s += `<rect x="60" y="${SY - 8}" width="${X(7) - 60}" height="16" fill="var(--raise)" stroke="var(--line-strong)"/>`;
    s += `<rect x="${TX(EX.ind.day)}" y="${SY - 8}" width="${TX(DAY[7]) - TX(EX.ind.day)}" height="16" fill="var(--me)"/>`;
    s += T((TX(EX.ind.day) + TX(DAY[7])) / 2, SY + 4, `임상 ${DAY[7] - EX.ind.day}일`, 'font-size="11.5" text-anchor="middle" font-weight="600" style="fill:var(--paper)"');
    CV.STEPS.forEach((st) => { s += `<line x1="${TX(DAY[st.n])}" x2="${TX(DAY[st.n])}" y1="${SY - 10}" y2="${SY + 10}" stroke="var(--ink)" stroke-width="1.5"/>`; });
    s += T(60, SY + 28, "D+0", 'font-size="11" class="t-m t-mu"') + T(X(7), SY + 28, `D+${AP.day}`, 'font-size="11" class="t-m" text-anchor="end" font-weight="700"');
    s += T(60, SY + 50, `출발 ${MX(R.startCash)} · 분자 ${N0}개 → 도착 D+${AP.day} · 남은 돈 ${MX(LEFT)} · 허가 1개. 앞의 여섯 역은 ${EX.ind.day}일 만에 지나갔다.`, 'font-size="12.5" font-weight="600"');
    return CV.svg(W, H, s, "1.1 부터 4.2 까지 여정 노선도와 실제 날짜 띠");
  }

  /* ───────── 4. 220 → 1 점 지도 ───────── */
  function v4() {
    const sc0 = EX.screen, sel = new Set(sc0.sel.map((c) => c.id)), pk = new Set(EX.picks.map((c) => c.id));
    const fates = [
      ...sc0.gates.map((g, i) => ({ key: "g" + i, lab: `${g.label}에서 탈락`, rule: g.rule, st: "1.2", fill: ["var(--raise)", "var(--raise)", "var(--film-1)", "var(--film-1)", "var(--muted)"][i] || "var(--raise)" })),
      { key: "top", lab: "점수 상위 10 밖", rule: `${T0.gene} 스크리닝 점수 순`, st: "1.2", fill: "var(--film-2)" },
      { key: "dock", lab: "도킹 후보 5개에 못 듦", rule: "기준 리간드와 같은 분자 포함", st: "2.1", fill: "var(--film-5)" },
      { key: "adm", lab: "ADMET 에서 리드가 못 됨", rule: "표적 계열 · E · S 균형", st: "2.2", fill: "var(--film-4)" },
      { key: "lead", lab: "리드 → 특허 · IND · 임상 · 허가", rule: AP.brand, st: "4.2", fill: "var(--hi)" }
    ];
    const fateOf = (c) => {
      const f = sc0.failAt.get(c.id);
      if (f >= 0) return "g" + f;
      if (!sel.has(c.id)) return "top";
      if (!pk.has(c.id)) return "dock";
      return c.id === LEAD.id ? "lead" : "adm";
    };
    const cnt = {}; for (const c of CV.D.compounds) { const k = fateOf(c); cnt[k] = (cnt[k] || 0) + 1; }
    const shown = fates.filter((f) => cnt[f.key]);
    const W = 880, cs = 15, gp = 3, cols = 22, X0 = 20, Y0 = 44;
    let s = T(20, 24, `${N0}개 분자 하나하나가 어디서 멈췄나`, 'font-size="14" font-weight="700"');
    let i = 0;
    for (const f of shown) for (let j = 0; j < cnt[f.key]; j++, i++) {
      const x = X0 + (i % cols) * (cs + gp), y = Y0 + Math.floor(i / cols) * (cs + gp);
      s += f.key === "lead" ? `<rect x="${x - 2}" y="${y - 2}" width="${cs + 4}" height="${cs + 4}" fill="var(--hi)" stroke="var(--ink)" stroke-width="2.5"/>`
        : `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${f.fill}" stroke="var(--line-strong)" stroke-width="0.6"/>`;
    }
    const rowsN = Math.ceil(i / cols), gridB = Y0 + rowsN * (cs + gp);
    const LX = 440;
    shown.forEach((f, k) => {
      const y = Y0 + 4 + k * 34;
      s += `<rect x="${LX}" y="${y}" width="16" height="16" fill="${f.fill}" stroke="${f.key === "lead" ? "var(--ink)" : "var(--line-strong)"}" stroke-width="${f.key === "lead" ? 2 : 0.8}"/>`;
      s += T(LX + 26, y + 12, `${f.st} · ${f.lab}`, `font-size="12.5" ${f.key === "lead" ? 'font-weight="700"' : ""}`);
      s += T(LX + 26, y + 27, f.rule, 'font-size="11" class="t-mu"');
      s += T(864, y + 13, `${cnt[f.key]}개`, 'font-size="14" class="t-m" text-anchor="end" font-weight="700"');
    });
    const H = Math.max(gridB, Y0 + shown.length * 34) + 40;
    const seq = EX.screen.stages.map((x) => x.n).filter((n, j, a) => j === 0 || n !== a[j - 1]);
    s += T(20, H - 14, `${seq.join(" → ")} → 도킹 ${EX.picks.length} → 리드 1 → 허가 1 · 남은 비율 ${(100 / N0).toFixed(2)}%`, 'font-size="12.5" class="t-m" font-weight="600"');
    return CV.svg(W, H, s, "220개 분자가 멈춘 단계를 칠한 점 지도");
  }

  /* ───────── 5. 제형 바꿔 보기 ───────── */
  function whatSVG(st) {
    const f = st.f, d = +st.d, b = sc(f, d), indOk = b.S >= R.th.ind.s;
    const ps = PH.map((k) => prob(b, k)), all = indOk ? ps.reduce((a, q) => a * q.p, 1) : 0, sh = share(f), exp = sh * all;
    const W = 880, H = 360, cx = 140, cy = 170, rr = 100, ri = 62;
    const arc = (a0, a1, ro, rin) => {
      const p = (a, r) => [cx + r * Math.sin(a), cy - r * Math.cos(a)], L = a1 - a0 > Math.PI ? 1 : 0;
      const [x0, y0] = p(a0, ro), [x1, y1] = p(a1, ro), [x2, y2] = p(a1, rin), [x3, y3] = p(a0, rin);
      return `M${x0} ${y0} A${ro} ${ro} 0 ${L} 1 ${x1} ${y1} L${x2} ${y2} A${rin} ${rin} 0 ${L} 0 ${x3} ${y3} Z`;
    };
    const A = (sh / 100) * 2 * Math.PI;
    let s = T(20, 24, `허가 받은 뒤 시장 점유 기본값`, 'font-size="14" font-weight="700"');
    s += `<path d="${arc(0, 2 * Math.PI - 0.0001, rr, ri)}" fill="var(--raise)" stroke="var(--line-strong)"/>`;
    s += `<path d="${arc(0, A, rr, ri)}" fill="var(--me)"/>`;
    s += T(cx, cy + 2, `${f1(sh)}%`, 'font-size="26" class="t-m" text-anchor="middle" font-weight="700"');
    s += T(cx, cy + 22, "시장 점유", 'font-size="12" text-anchor="middle" class="t-mu"');
    s += T(cx, cy + rr + 26, `나머지 ${f1(100 - sh)}% 는 다른 약`, 'font-size="11.5" text-anchor="middle" class="t-mu"');
    /* 오른쪽: 제형 배율 막대 */
    const BX = 400, BW = 360, BXs = (v) => BX + (v / 20) * BW;
    s += T(290, 56, "12% × 제형 배율 (상한 20%)", 'font-size="13" font-weight="700"');
    ["oral", "iv", "transdermal"].forEach((k, i) => {
      const y = 72 + i * 30, on = k === f;
      s += T(290, y + 14, `${CV.FORM_SHORT[k]} × ${R.approvalMult[k]}`, `font-size="12.5" class="t-m" ${on ? 'font-weight="700"' : ""}`);
      s += `<rect x="${BX}" y="${y}" width="${BXs(share(k)) - BX}" height="20" fill="${on ? "var(--me)" : "var(--raise)"}" stroke="var(--line-strong)"/>`;
      s += T(BXs(share(k)) + 6, y + 14, `${f1(share(k))}%`, `font-size="12" class="t-m" ${on ? 'font-weight="700"' : ""}`);
    });
    s += `<line x1="${BXs(20)}" x2="${BXs(20)}" y1="64" y2="166" stroke="var(--ink)" stroke-dasharray="4 3"/>` + T(BXs(20), 180, "상한 20", 'font-size="11" class="t-m" text-anchor="middle"');
    /* 임상 통과 확률 → 기대 점유 */
    s += T(290, 214, `하지만 ${CV.FORM_SHORT[f]} ${d} mg 로 임상을 넘을 확률은?`, 'font-size="13" font-weight="700"');
    const cells = [["IND", indOk ? 1 : 0, indOk ? "승인" : "보류"], ...PH.map((k, i) => [PHL[k], ps[i].p, `${ps[i].ok}/${ps[i].tot}`])];
    cells.forEach(([lab, p, t], i) => {
      const x = 290 + i * 118;
      s += `<rect x="${x}" y="226" width="110" height="44" fill="${p >= 0.999 ? "var(--good-bg)" : p > 0 ? "var(--warn-bg)" : "var(--bad-bg)"}" stroke="var(--line)"/>`;
      s += T(x + 8, 243, lab, 'font-size="12" font-weight="600"');
      s += T(x + 8, 262, `${t}${i ? " · " + pc(p) : ""}`, `font-size="11.5" class="t-m" style="fill:${p >= 0.999 ? "var(--good)" : p > 0 ? "var(--warn)" : "var(--bad)"}"`);
    });
    s += T(290, 300, `기대 점유 = ${f1(sh)}% × 통과 ${pc(all)} = ${f1(exp)}%`, `font-size="15" class="t-m" font-weight="700" style="fill:${all > 0.5 ? "var(--ink)" : "var(--bad)"}"`);
    s += T(290, 322, `예상 E ${f1(b.E)} · S ${f1(b.S)} — 허가 날 주가 반응도 ▲ ${f1(sh)}%`, 'font-size="12" class="t-m t-mu"');
    s += T(290, 344, all === 0 ? "점유율이 높아도 허가를 못 받으면 0 이다." : all < 0.999 ? "기준 근처라 떨어질 수 있어 기대 점유가 줄어든다." : sh < share("oral") ? "통과는 확실하지만 배율이 낮아 점유가 작다." : "배율도 높고 통과도 확실한 조합이다.", 'font-size="12.5" font-weight="600"');
    return CV.svg(W, H, s, "제형과 용량에 따른 시장 점유와 기대 점유");
  }
  function v5() {
    const st = { f: FORM0, d: String(AP.dose) };
    return `<div class="s8-ctl"><div role="group" aria-label="제형"><span class="vz-lab">제형</span>${btns("s8-v5-f", "f", [["oral", "경구"], ["iv", "정맥주사"], ["transdermal", "경피"]], st.f)}</div>
      <div role="group" aria-label="용량"><span class="vz-lab">용량</span>${btns("s8-v5-d", "d", [["10", "10 mg"], ["50", "50 mg"], ["100", "100 mg"]], st.d)}</div></div>
      <div data-out>${whatSVG(st)}</div>`;
  }

  /* ───────── 6. 포장 미리보기 ───────── */
  const SHAPES = [["tablet", "정제"], ["capsule", "캡슐"], ["vial", "바이알"], ["patch", "패치"]];
  const COLORS = [["ivory", "아이보리"], ["sage", "세이지"], ["sand", "샌드"]];
  const CFILL = { ivory: "color-mix(in srgb, var(--film-4) 45%, var(--paper))", sage: "color-mix(in srgb, var(--good) 26%, var(--paper))", sand: "color-mix(in srgb, var(--mirp) 36%, var(--paper))" };
  const FIT = { tablet: "oral", capsule: "oral", vial: "iv", patch: "transdermal" };
  function packSVG(st) {
    const brand = (st.brand || "").trim() || PG.code, col = CFILL[st.c], W = 880, H = 330;
    let s = "";
    /* 상자 */
    s += `<path d="M40 70 l40 -30 h300 l-40 30 z" style="fill:${col}" stroke="var(--ink)" stroke-width="1.5" fill-opacity="0.75"/>`;
    s += `<path d="M340 70 l40 -30 v220 l-40 30 z" style="fill:${col}" stroke="var(--ink)" stroke-width="1.5"/><path d="M340 70 l40 -30 v220 l-40 30 z" fill="var(--ink)" fill-opacity="0.12"/>`;
    s += `<rect x="40" y="70" width="300" height="220" style="fill:${col}" stroke="var(--ink)" stroke-width="1.5"/>`;
    s += `<rect x="40" y="70" width="300" height="10" fill="var(--me)"/>`;
    const fs = Math.max(14, Math.min(34, Math.floor(270 / Math.max(1, [...brand].length))));
    s += `<text x="60" y="140" font-size="${fs}" font-weight="700" style="font-family:var(--serif)">${esc(brand)}</text>`;
    s += T(60, 166, `${PG.code} · ${AP.dose} mg`, 'font-size="13" class="t-m"');
    s += T(60, 186, LEAD.name, 'font-size="11.5" class="t-mu"');
    s += T(60, 254, `${PG.company}`, 'font-size="12.5" font-weight="600"');
    s += T(60, 272, `${CV.FORM[FORM0]} · 품목 허가 D+${AP.day}`, 'font-size="11.5" class="t-mu"');
    s += `<rect x="270" y="236" width="56" height="40" fill="var(--paper)" stroke="var(--ink)"/>` + Array.from({ length: 14 }, (_, i) => `<rect x="${274 + i * 3.5}" y="240" width="${i % 3 ? 1.2 : 2.2}" height="26" fill="var(--ink)"/>`).join("");
    /* 안의 약 */
    const PX = 450;
    if (st.s === "tablet" || st.s === "capsule") {
      s += `<rect x="${PX}" y="60" width="380" height="200" fill="var(--raise)" stroke="var(--line-strong)"/>`;
      s += T(PX + 12, 252, brand, 'font-size="12" class="t-m t-mu"');
      for (let i = 0; i < 10; i++) {
        const x = PX + 40 + (i % 5) * 72, y = 100 + Math.floor(i / 5) * 72;
        s += `<circle cx="${x}" cy="${y}" r="27" fill="var(--paper)" stroke="var(--line-strong)"/>`;
        s += st.s === "tablet" ? `<ellipse cx="${x}" cy="${y}" rx="19" ry="19" style="fill:${col}" stroke="var(--ink)" stroke-width="1.2"/><line x1="${x - 12}" x2="${x + 12}" y1="${y}" y2="${y}" stroke="var(--ink)" stroke-opacity="0.4"/>`
          : `<rect x="${x - 22}" y="${y - 9}" width="44" height="18" rx="9" style="fill:${col}" stroke="var(--ink)" stroke-width="1.2"/><path d="M${x} ${y - 9} h13 a9 9 0 0 1 0 18 h-13 z" fill="var(--me)"/>`;
      }
    } else if (st.s === "vial") {
      for (let i = 0; i < 3; i++) {
        const x = PX + 40 + i * 120;
        s += `<rect x="${x + 18}" y="60" width="44" height="22" fill="var(--muted)"/><rect x="${x + 24}" y="82" width="32" height="14" fill="var(--raise)" stroke="var(--line-strong)"/>`;
        s += `<rect x="${x}" y="96" width="80" height="160" rx="8" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.5"/><rect x="${x + 4}" y="190" width="72" height="62" rx="5" fill="var(--film-2)"/>`;
        s += `<rect x="${x}" y="130" width="80" height="44" style="fill:${col}" stroke="var(--ink)"/>` + T(x + 40, 150, brand.slice(0, 6), 'font-size="12" text-anchor="middle" font-weight="700"') + T(x + 40, 166, `${AP.dose} mg`, 'font-size="11" class="t-m" text-anchor="middle"');
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const x = PX + 10 + (i % 2) * 190, y = 50 + Math.floor(i / 2) * 110;
        s += `<rect x="${x}" y="${y}" width="170" height="96" fill="var(--paper)" stroke="var(--line-strong)" stroke-dasharray="3 3"/>`;
        s += `<rect x="${x + 25}" y="${y + 12}" width="120" height="72" rx="14" style="fill:${col}" stroke="var(--ink)" stroke-width="1.2"/>`;
        s += T(x + 85, y + 46, brand.slice(0, 8), 'font-size="13" text-anchor="middle" font-weight="700"') + T(x + 85, y + 64, `${AP.dose} mg`, 'font-size="11" class="t-m" text-anchor="middle"');
      }
    }
    const ok = FIT[st.s] === FORM0;
    s += `<rect x="${PX}" y="282" width="380" height="30" fill="var(--${ok ? "good" : "bad"}-bg)"/>`;
    s += T(PX + 12, 302, ok ? `✓ 허가 제형(${CV.FORM_SHORT[FORM0]})과 맞는 포장` : `✕ ${SHAPES.find((x) => x[0] === st.s)[1]}${CV.josa(SHAPES.find((x) => x[0] === st.s)[1], "은", "는")} ${CV.FORM_SHORT[FIT[st.s]]}용 — 허가 제형(${CV.FORM_SHORT[FORM0]})과 다름`, `font-size="12.5" font-weight="700" style="fill:var(--${ok ? "good" : "bad"})"`);
    return CV.svg(W, H, s, "브랜드 이름이 인쇄된 약 포장 미리보기");
  }
  function v6() {
    const st = { s: AP.shape, c: AP.color, brand: AP.brand };
    return `<div class="s8-ctl"><div class="s8-txt"><label for="s8-v6-brand">브랜드 이름 (1~20자)</label><input id="s8-v6-brand" maxlength="20" value="${esc(st.brand)}" autocomplete="off"></div>
      <div role="group" aria-label="포장 모양"><span class="vz-lab">모양</span>${btns("s8-v6-s", "s", SHAPES, st.s)}</div>
      <div role="group" aria-label="포장 색"><span class="vz-lab">색</span>${btns("s8-v6-c", "c", COLORS, st.c)}</div></div>
      <div data-out>${packSVG(st)}</div>
      <p class="vz-note">허가가 나는 순간 그동안 코드명(${esc(PG.code)})으로만 불리던 약이 브랜드 이름으로 학급 전광판에 공개된다. 포장 모양은 허가받은 제형과 맞아야 한다.</p>`;
  }
  function m6(el) {
    const st = { s: AP.shape, c: AP.color, brand: AP.brand };
    const out = el.querySelector("[data-out]"), inp = el.querySelector("#s8-v6-brand");
    const off = wire(el, ["s", "c"], st, (x) => { x.brand = inp.value; return packSVG(x); });
    const on = () => { st.brand = inp.value; out.innerHTML = packSVG(st); };
    inp.addEventListener("input", on);
    return () => { off(); inp.removeEventListener("input", on); };
  }

  /* ───────── 7. 주가 반응 ───────── */
  /* 사건별 주가 등락 기본값(%) — pipeline-board-30-variants.html 의 DELTA 기본값 · 허가는 min(20, 12 × 제형 배율) */
  const DEL = { patent: 2, indPass: 2, phase1Fail: -6, phase1Pass: 4, phase2Pass: 8, phase3Pass: 10 };
  function v7() {
    const ev = [{ d: PG.day, k: "patent", lab: "특허", v: DEL.patent }, { d: EX.ind.day, k: "indPass", lab: "IND 승인", v: DEL.indPass }];
    TR.forEach((t) => ev.push({ d: t.day, lab: `${t.label}${t.pass ? " 통과" : " 실패"}`, v: DEL[t.k + (t.pass ? "Pass" : "Fail")] }));
    ev.push({ d: AP.day, lab: `「${AP.brand}」 허가`, v: r1(share(FORM0)), big: true });
    let px = 100; const pts = [{ d: 0, v: px }];
    for (const e of ev) { px = px * (1 + e.v / 100); e.after = px; pts.push({ d: e.d, v: px }); }
    const W = 880, H = 360, X0 = 70, X1 = 790, Y0 = 290, Y1 = 40, dmax = 840, vlo = 90, vhi = 150;
    const X = (d) => X0 + (d / dmax) * (X1 - X0), Y = (v) => Y0 - ((v - vlo) / (vhi - vlo)) * (Y0 - Y1);
    let s = "";
    for (let v = vlo; v <= vhi; v += 10) { s += `<line x1="${X0}" x2="${X1}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" ${v === 100 ? 'stroke="var(--line-strong)" stroke-dasharray="6 3"' : 'stroke-dasharray="2 4"'}/>` + T(X0 - 8, Y(v) + 4, v, 'font-size="11" class="t-m t-mu" text-anchor="end"'); }
    for (let d = 0; d <= dmax; d += 120) s += T(X(d), Y0 + 18, `D+${d}`, 'font-size="11" class="t-m t-mu" text-anchor="middle"');
    s += T(X0, 24, "CRX 주가 지수 (D+0 = 100) · 사건마다 기본 등락", 'font-size="13" font-weight="700"');
    let d = `M${X(0)} ${Y(100)}`;
    for (const p of pts.slice(1)) d += ` H${X(p.d)} V${Y(p.v)}`;
    s += `<path d="${d} H${X(dmax)}" fill="none" stroke="var(--ink)" stroke-width="2.5"/>`;
    const dy = { 0: 34, 1: -26 };
    ev.forEach((e, i) => {
      const up = e.v > 0, x = X(e.d), y = Y(e.after);
      s += up ? `<path d="M${x} ${y - 13} l6 9 h-12 z" fill="var(--good)"/>` : `<path d="M${x} ${y + 13} l6 -9 h-12 z" fill="var(--bad)"/>`;
      const ly = y + (dy[i] != null ? dy[i] : up ? -20 : 30);
      const anc = e.big ? "end" : i < 2 ? "start" : "middle";
      s += T(x + (e.big ? -8 : i < 2 ? -4 : 0), ly, `${e.lab} ${up ? "▲" : "▼"}${f1(Math.abs(e.v))}%`, `font-size="${e.big ? 13 : 11.5}" text-anchor="${anc}" font-weight="${e.big ? 700 : 600}" style="fill:${tone(up)}"`);
    });
    /* 다른 제형이었다면: 허가 날 등락만 바뀐다 */
    const before = ev[ev.length - 2].after;
    const alt = ["iv", "transdermal"].map((k) => {
      const v = before * (1 + share(k) / 100);
      s += `<line x1="${X(AP.day) - 4}" x2="${X(AP.day) + 8}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--muted)" stroke-width="2"/>`;
      return `${CV.FORM_SHORT[k]} ▲${f1(share(k))}% → ${f1(v)}`;
    });
    s += T(X0 + 10, Y(vhi) + 22, `회색 눈금 = 다른 제형이었다면 허가 날: ${alt.join(" · ")}`, 'font-size="11.5" class="t-m t-mu"');
    s += T(X(AP.day) + 14, Y(px) + 4, `${f1(px)}`, 'font-size="12.5" class="t-m" font-weight="700"');
    s += T(16, H - 16, `실패 한 번 ▼${Math.abs(DEL.phase1Fail)}%, 허가 하루 ▲${f1(share(FORM0))}%. 숫자는 게임 기본값(실제 게임에선 ±1.5 정도 흔들린다).`, 'font-size="12.5" class="t-mu"');
    return `<div class="s8-board" role="img" aria-label="전광판 헤드라인"><span class="s8-led g">◆ ${esc(PG.ticker)} 「${esc(AP.brand)}」 최종 허가 ▲ ${f1(share(FORM0))}%</span><span class="s8-led">${esc(T0.disease)} 신약 출시 · 시장 점유 기본값 ${f1(AP.share)}%</span></div>`
      + CV.svg(W, H, s, "사건마다 오르내린 주가 지수 선 그래프");
  }

  /* ───────── 8. 연구비 영수증 ───────── */
  function v8() {
    const rows = [];
    CV.STEPS.forEach((st) => {
      if (st.n !== 7) { rows.push({ c: st.code, t: st.t, d: DAY[st.n], m: COST[st.n] }); return; }
      TR.forEach((t, i) => rows.push({ c: i ? "" : st.code, t: `임상 ${t.label} ${t.dose} mg${t.pass ? "" : " ✕ 실패"}`, d: t.day, m: t.cost, fail: !t.pass }));
    });
    const sum = Math.round(rows.reduce((a, r) => a + r.m, 0) * 1000) / 1000;
    const grp = [
      { lab: "발견 · 최적화", v: COST[1] + COST[2] + COST[3] + COST[4], fill: "var(--film-2)" },
      { lab: "특허 · IND", v: COST[5] + COST[6], fill: "var(--film-4)" },
      { lab: "임상", v: trialSum, fill: "var(--me)" },
      { lab: "허가", v: COST[8], fill: "var(--hi)" }
    ];
    return `<div class="vz-cols" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      <div class="s8-rc"><h4>CRISTA 연구비 영수증</h4><p>${esc(PG.company)} (${esc(PG.ticker)}) · ${esc(PG.code)} 「${esc(AP.brand)}」</p>
        <table><tbody>${rows.map((r) => `<tr${r.fail ? ' class="s8-fail"' : ""}><td>${esc(r.c)} ${esc(r.t)}</td><td>D+${r.d}</td><td>${MX(r.m)}</td></tr>`).join("")}
        <tr class="s8-sep s8-tot"><td>합계</td><td></td><td>${MX(sum)}</td></tr>
        <tr><td>처음 연구비</td><td></td><td>${MX(R.startCash)}</td></tr>
        <tr class="s8-tot"><td>남은 돈</td><td></td><td>${MX(LEFT)}</td></tr>
        <tr class="s8-sep"><td>걸린 날</td><td></td><td>${AP.day}일</td></tr>
        <tr><td>분자</td><td></td><td>${N0} → 1</td></tr></tbody></table>
        <div class="s8-rcbar" role="img" aria-label="쓴 돈 나누기">${grp.map((g) => `<i style="width:${(g.v / sum) * 100}%;background:${g.fill}"></i>`).join("")}</div>
        <div class="s8-rcleg">${grp.map((g) => `<span><i style="background:${g.fill}"></i>${esc(g.lab)} ${Math.round((g.v / sum) * 100)}%</span>`).join("")}</div>
        <p style="margin-top:10px">*** 허가 ${esc(AP.brand)} · D+${AP.day} ***</p></div>
      <div class="s8-side">
        <div class="s8-big"><b>${AP.day}일</b><span>D+0 → D+${AP.day} (임상만 ${DAY[7] - EX.ind.day}일)</span></div>
        <div class="s8-big"><b>${MX(AP.spent)}</b><span>처음 ${MX(R.startCash)} 의 ${Math.round((AP.spent / R.startCash) * 100)}% · 임상이 ${Math.round((trialSum / AP.spent) * 100)}%</span></div>
        <div class="s8-big"><b>${N0} → 1</b><span>분자 ${N0}개 중 1개가 약이 됐다</span></div>
        <p class="vz-note">빨간 줄: 실패한 1상도 ${MX(R.cost.phase1)} 가 그대로 영수증에 남는다. 연구비 대부분은 사람에게 시험하는 임상에 쓰였다.</p>
      </div></div>`;
  }

  /* ───────── 9. 시간 비교 ───────── */
  function v9() {
    const W = 880, H = 380, X0 = 150, X1 = 860, BW = X1 - X0;
    const game = [
      { lab: "발견 · 최적화", v: DAY[4], fill: "var(--film-2)", txt: `${DAY[4]}일` },
      { lab: "특허 · IND", v: EX.ind.day - DAY[4], fill: "var(--film-4)", txt: `${EX.ind.day - DAY[4]}일` },
      { lab: "임상", v: DAY[7] - EX.ind.day, fill: "var(--me)", txt: `${DAY[7] - EX.ind.day}일` },
      { lab: "허가 심사", v: AP.day - DAY[7], fill: "var(--hi)", txt: `${AP.day - DAY[7]}일` }
    ];
    /* 실제(대략, PhRMA 2015): 발견 · 전임상 3~6년 · 임상 6~7년 · 심사 0.5~2년 → 가운데 값으로 비율만 그림 */
    const real = [
      { lab: "발견 · 전임상", v: 4.5, fill: "var(--film-2)", txt: "약 3~6년" },
      { lab: "임상", v: 6.5, fill: "var(--me)", txt: "약 6~7년" },
      { lab: "허가 심사", v: 1.25, fill: "var(--hi)", txt: "약 0.5~2년" }
    ];
    const bar = (y, segs, title, sub) => {
      const tot = segs.reduce((a, x) => a + x.v, 0); let x = X0, o = T(16, y + 18, title, 'font-size="14" font-weight="700"') + T(16, y + 36, sub, 'font-size="11.5" class="t-m t-mu"');
      const left = [];
      segs.forEach((g, i) => {
        const w = (g.v / tot) * BW, dark = g.fill === "var(--me)", pct = Math.round((g.v / tot) * 100);
        o += `<rect x="${x}" y="${y}" width="${w}" height="40" fill="${g.fill}" stroke="var(--ink)" stroke-width="0.8"/>`;
        if (w > 140) { o += T(x + 6, y + 17, g.lab, `font-size="12" font-weight="600" ${dark ? 'style="fill:var(--paper)"' : ""}`) + T(x + 6, y + 33, `${g.txt} · ${pct}%`, `font-size="11.5" class="t-m" ${dark ? 'style="fill:var(--paper)"' : ""}`); }
        else if (i === segs.length - 1) o += T(x + w, y + 56, `${g.lab} ${g.txt} · ${pct}%`, 'font-size="11" text-anchor="end" class="t-m"');
        else left.push(`${g.lab} ${g.txt}`);
        x += w;
      });
      if (left.length) o += T(X0, y + 56, left.join(" · "), 'font-size="11" class="t-m"');
      return o;
    };
    let s = T(16, 22, "비율로 보기 — 막대 길이를 같게 맞춤", 'font-size="12.5" class="t-mu"');
    s += bar(40, game, "이 게임", `${AP.day}게임일`);
    s += bar(130, real, "실제 신약", "대략 10~15년");
    /* 같은 눈금(년)으로 보기 */
    const Y = 260, YX = (yr) => X0 + (yr / 15) * BW;
    s += T(16, Y - 16, "같은 눈금(년)으로 보기 — 1게임일 = 1일이라고 치면", 'font-size="12.5" class="t-mu"');
    for (let yr = 0; yr <= 15; yr += 1) { s += `<line x1="${YX(yr)}" x2="${YX(yr)}" y1="${Y}" y2="${Y + 66}" stroke="var(--line)" ${yr % 5 ? 'stroke-dasharray="1 4"' : ""}/>`; if (yr % 5 === 0) s += T(YX(yr), Y + 82, `${yr}년`, 'font-size="11" class="t-m t-mu" text-anchor="middle"'); }
    const gy = AP.day / 365;
    s += T(16, Y + 20, "이 게임", 'font-size="13" font-weight="700"') + `<rect x="${X0}" y="${Y + 6}" width="${YX(gy) - X0}" height="20" fill="var(--ink)"/>` + T(YX(gy) + 8, Y + 21, `${AP.day}일 ≈ ${gy.toFixed(1)}년`, 'font-size="12" class="t-m" font-weight="600"');
    s += T(16, Y + 54, "실제 신약", 'font-size="13" font-weight="700"') + `<rect x="${X0}" y="${Y + 40}" width="${YX(10) - X0}" height="20" fill="var(--muted)"/><rect x="${YX(10)}" y="${Y + 40}" width="${YX(15) - YX(10)}" height="20" fill="var(--muted)" fill-opacity="0.35" stroke="var(--muted)" stroke-dasharray="3 3"/>`;
    s += T(YX(15) - 6, Y + 55, "10~15년", 'font-size="12" class="t-m" text-anchor="end" font-weight="700"');
    s += T(16, H - 6, "둘 다 임상이 가장 길다. 게임은 발견 단계를 며칠로 줄였지만, 실제로는 분자를 찾는 데만 몇 년이 걸린다.", 'font-size="12.5" font-weight="600"');
    return CV.svg(W, H, s, "게임 일정과 실제 신약 개발 기간 비교") + `<p class="s8-src">실제 기간은 대략값 — PhRMA, Biopharmaceutical Research &amp; Development: The Process Behind New Medicines (2015): 평균 10~15년, 임상 6~7년, 심사 0.5~2년. 약마다 크게 다르다.</p>`;
  }

  /* ───────── 10. 지름길 회고 ───────── */
  function v10() {
    const b50 = sc(FORM0, 50), q1 = prob(b50, "phase1"), q3 = prob(b50, "phase3");
    const tries = Math.round(1 / q1.p); /* 1상 통과까지 평균 시도 횟수(기댓값 = 1/p) */
    const pre = EX.ind.day, preM = R.cost.htvs + R.cost.docking + R.cost.admet + R.cost.patent + R.cost.ind;
    const routes = [
      { t: "실제로 간 길", sub: "50 mg 실패 → 10 mg", segs: [["pre", pre], ...TR.map((t) => [t.pass ? "ok" : "bad", R.days[t.k]]), ["fin", R.days.final]],
        end: `${AP.day}일 · ${MX(AP.spent)} · 허가 ✓`, ok: true },
      { t: "IND 때 10 mg 였다면", sub: "실패 없이", segs: [["pre", pre], ...TR.filter((t) => t.pass).map((t) => ["ok", R.days[t.k]]), ["fin", R.days.final]],
        end: `${AP.day - R.days.phase1}일 · ${MX(Math.round((AP.spent - R.cost.phase1) * 1000) / 1000)} · 허가 ✓`, ok: true },
      { t: "50 mg 로 계속 다시", sub: `1상 평균 ${tries}번 시도`, segs: [["pre", pre], ...Array.from({ length: tries }, (_, i) => [i < tries - 1 ? "bad" : "ok", R.days.phase1]), ["ok", R.days.phase2], ["bad", R.days.phase3]],
        end: `평균 ${(pre + tries * R.days.phase1 + R.days.phase2 + R.days.phase3).toLocaleString("en-US")}일 · ${MX(Math.round((preM + tries * R.cost.phase1 + R.cost.phase2 + R.cost.phase3) * 1000) / 1000)} · 3상 실패 ✕`, ok: false }
    ];
    const W = 880, H = 400, X0 = 170, X1 = 860, Dm = 1800, X = (d) => X0 + (d / Dm) * (X1 - X0);
    let s = "";
    for (let d = 0; d <= Dm; d += 300) s += `<line x1="${X(d)}" x2="${X(d)}" y1="30" y2="300" stroke="var(--line)" stroke-dasharray="2 4"/>` + T(X(d), 22, `D+${d}`, 'font-size="11" class="t-m t-mu" text-anchor="middle"');
    const FL = { pre: "var(--raise)", ok: "var(--good)", bad: "var(--bad)", fin: "var(--hi)" };
    routes.forEach((r, i) => {
      const y = 56 + i * 84; let d = 0;
      s += T(16, y + 14, r.t, 'font-size="13.5" font-weight="700"') + T(16, y + 31, r.sub, 'font-size="11.5" class="t-mu"');
      for (const [k, len] of r.segs) { s += `<rect x="${X(d)}" y="${y}" width="${X(d + len) - X(d)}" height="22" fill="${FL[k]}" stroke="var(--paper)" stroke-width="0.8"/>`; d += len; }
      s += T(X(d), y + 42, r.end, `font-size="12" class="t-m" text-anchor="end" font-weight="700" style="fill:${tone(r.ok)}"`);
    });
    /* 경고 신호 */
    s += `<line x1="${X(pre)}" x2="${X(pre)}" y1="40" y2="300" stroke="var(--warn)" stroke-width="2"/>`;
    s += `<rect x="${X(pre) + 6}" y="300" width="560" height="44" fill="var(--warn-bg)"/>`;
    s += T(X(pre) + 14, 318, `경고 신호 D+${pre}: IND 때 S ${f1(EX.ind.S)} — IND 기준 ${R.th.ind.s} 은 넘었지만 1상 기준 ${R.th.phase1.s} 아래`, 'font-size="12" font-weight="700" style="fill:var(--warn)"');
    s += T(X(pre) + 14, 336, `50 mg 는 1상 통과 ${q1.ok}/${q1.tot}, 3상(S ≥ ${R.th.phase3.s})은 ${q3.ok}/${q3.tot} — 다시 해도 끝내 막힌다`, 'font-size="12" class="t-m" style="fill:var(--warn)"');
    s += T(16, 376, "다음 단계 기준을 미리 내다보면 실패 한 번(90일 · $0.300M)을 아낄 수 있었다. 실패에서 원인을 찾아 바꾼 것이 허가로 이어졌다.", 'font-size="12.5" font-weight="600"');
    s += `<rect x="16" y="386" width="10" height="10" fill="var(--good)"/>` + T(30, 395, "통과", 'font-size="11"') + `<rect x="70" y="386" width="10" height="10" fill="var(--bad)"/>` + T(84, 395, "실패", 'font-size="11"') + `<rect x="124" y="386" width="10" height="10" fill="var(--raise)" stroke="var(--line-strong)"/>` + T(138, 395, "1.1~3.2", 'font-size="11"') + `<rect x="196" y="386" width="10" height="10" fill="var(--hi)"/>` + T(210, 395, "허가 심사", 'font-size="11"');
    return CV.svg(W, H + 6, s, "실제 경로와 다른 두 경로의 기간 · 비용 비교");
  }

  window.VIZ[8] = [
    { name: "품목 허가증", kind: "실물 서류 · 도장",
      idea: "허가증의 한 줄 한 줄 옆에 그 증거가 나온 단계 꼬리표(1.1~4.2)를 붙여, 도장 하나가 무엇을 묶은 것인지 보여 준다.",
      learn: "최종 허가는 새 실험이 아니라 지금까지 모은 모든 증거를 한 장으로 묶은 결과다.",
      render: v1 },
    { name: "증거 바인더", kind: "탭 서류철 · 넘겨 보기",
      idea: "서류철 탭 8장(표적 · 스크리닝 · 도킹 · ADMET · 특허 · IND · 임상 · 신청)을 넘기며 각 장이 증명하는 한 문장과 실제 값을 본다.",
      learn: "단계마다 증명하는 것이 하나씩 쌓여야 심사관이 '팔아도 된다'고 판단할 수 있다.",
      render: v2, mount: (el) => wire(el, ["p"], { p: "4.2" }, (st) => page(st.p)) },
    { name: "여정 노선도", kind: "지하철 노선도 · 날짜 띠",
      idea: "8개 역(1.1~4.2)을 노선도로 잇고 4.1 의 실패 되돌이를 그린 뒤, 같은 역을 실제 날짜 띠 위로 옮겨 시간이 어디에 몰렸는지 보여 준다.",
      learn: "앞의 여섯 단계는 42일 만에 지나갔고, 시간 대부분은 사람에게 시험하는 임상에 들었다.",
      render: v3 },
    { name: "220 → 1 점 지도", kind: "점 지도 · 소모 회고",
      idea: "분자 220개를 칸 하나씩 그리고, 각 분자가 멈춘 단계(관문 · 상위 10 · 도킹 · ADMET)로 칠해 끝까지 간 1개를 찾는다.",
      learn: "허가받은 약 하나 뒤에는 중간에 멈춘 분자 219개가 있다.",
      render: v4 },
    { name: "제형 바꿔 보기", kind: "원그래프 · what-if",
      idea: "제형 · 용량을 바꾸면 시장 점유 기본값(12% × 제형 배율)과 임상 통과 확률이 함께 바뀌고, 둘을 곱한 기대 점유를 보여 준다.",
      learn: "점유 배율이 높은 제형이라도 임상을 넘지 못하면 0 — 시장과 안전을 함께 따져야 한다.",
      render: v5, mount: (el) => wire(el, ["f", "d"], { f: FORM0, d: String(AP.dose) }, whatSVG) },
    { name: "포장 미리보기", kind: "실물 · 브랜드 인쇄",
      idea: "브랜드 이름을 직접 입력하고 정제 · 캡슐 · 바이알 · 패치 포장을 골라 보며, 허가 제형과 맞는 포장인지 확인한다.",
      learn: "허가가 나야 코드명이 브랜드 이름으로 공개되고, 포장은 허가받은 제형을 따라야 한다.",
      render: v6, mount: m6 },
    { name: "주가 반응", kind: "계단 선 그래프 · LED 헤드라인",
      idea: "특허 · IND · 임상 통과 · 실패 · 허가 때마다 주가 지수가 오르내린 계단을 그리고, 허가 헤드라인을 전광판 글씨로 띄운다.",
      learn: "허가 하루의 주가 반응(▲15.6%)이 가장 크고, 그 크기는 제형 배율에 따라 달라진다.",
      render: v7 },
    { name: "연구비 영수증", kind: "영수증 · 비율 띠",
      idea: "1.1~4.2 에 쓴 돈을 날짜와 함께 영수증 한 장에 적고, 합계 · 남은 돈 · 걸린 날 · 분자 수와 쓴 돈의 몫을 띠로 보여 준다.",
      learn: "처음 $6.000M 중 $2.800M 을 썼고, 그중 대부분이 임상이었다.",
      render: v8 },
    { name: "시간 비교", kind: "비율 막대 · 같은 눈금",
      idea: "게임 822일과 실제 신약 개발(대략 10~15년)을 비율 막대와 같은 년 눈금으로 두 번 견준다.",
      learn: "둘 다 임상이 가장 길지만, 실제 신약은 게임보다 훨씬 오래 걸린다.",
      render: v9 },
    { name: "지름길 회고", kind: "비교 타임라인 · 회고",
      idea: "실제로 간 길, IND 때 10 mg 였다면, 50 mg 로 계속 다시 했다면 — 세 경로의 날짜 · 돈 · 결과를 같은 눈금에 놓는다.",
      learn: "다음 단계 기준을 미리 내다보면 실패를 줄이고, 실패했을 땐 원인을 바꿔야 허가에 닿는다.",
      render: v10 }
  ];
})();
