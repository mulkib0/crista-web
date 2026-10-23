/* 단계 시각화 시안의 공통 바탕 — 규칙 · 예시 실행 · 그리기 도구.
   규칙 값은 pipeline-board-30-variants.html(= packages/game-rules 사본)에서 그대로 옮겼다.
   DOM 을 건드리지 않으므로 node 에서도 불러 시험할 수 있다(window 만 흉내 내면 된다). */
(function () {
  "use strict";
  const D = window.DD || { diseases: [], compounds: [], meta: {} };
  const CMP = new Map(D.compounds.map((c) => [c.id, c]));

  /* ── 글자 · 숫자 ── */
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const f1 = (v) => Number(v).toFixed(1);
  const f2 = (v) => Number(v).toFixed(2);
  const f3 = (v) => Number(v).toFixed(3);
  const MX = (v) => `$${v.toFixed(3)}M`;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  /* 선형 눈금: scale([d0, d1], [r0, r1])(v) */
  const scale = (dom, rng) => (v) => rng[0] + ((v - dom[0]) / (dom[1] - dom[0])) * (rng[1] - rng[0]);
  /* 받침에 맞춘 조사: josa("ACHE", "을", "를") */
  const josa = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };
  /* 고정 씨앗 난수 — 미리보기가 열 때마다 같은 그림이 되도록 */
  const rng = (seed = 7) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

  /* ── 규칙(game-rules 사본) ── */
  const TARGETS = {
    "ache-4ey7": { gene: "ACHE", label: "아세틸콜린에스테라아제", pdb: "4EY7", disease: "알츠하이머병", ref: "도네페질", refSmiles: "COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccccc3)CC1)C2", cns: true, refKcal: -11.84, rmsd: 0.82 },
    "egfr-1m17": { gene: "EGFR", label: "상피세포 성장인자 수용체", pdb: "1M17", disease: "비소세포폐암", ref: "엘로티닙", refSmiles: "C#Cc1cccc(Nc2ncnc3cc(OCCOC)c(OCCOC)cc23)c1", cns: false, refKcal: -7.24, rmsd: 1.33 },
    "dpp4-1x70": { gene: "DPP4", label: "디펩티딜 펩티다아제-4", pdb: "1X70", disease: "2형 당뇨병", ref: "시타글립틴", refSmiles: "NC(CC(=O)N1CCn2c(nnc2C(F)(F)F)C1)Cc1cc(F)c(F)cc1F", cns: false, refKcal: -9.02, rmsd: 0.8 },
    "cox2-3ln1": { gene: "PTGS2", label: "사이클로옥시게나아제-2", pdb: "3LN1", disease: "류마티스 관절염", ref: "세레콕시브", refSmiles: "Cc1ccc(-c2cc(C(F)(F)F)nn2-c2ccc(S(N)(=O)=O)cc2)cc1", cns: false, refKcal: -12.26, rmsd: 0.51 }
  };
  const TRIAL = {
    "ache-4ey7": { pops: ["경도 알츠하이머병 환자", "중등도~중증 알츠하이머병 환자", "경도인지장애(MCI) 환자"], eps: ["인지 기능 점수(ADAS-Cog) 변화", "일상 생활 기능(ADCS-ADL) 변화", "임상의 종합 평가(CIBIC-plus)"] },
    "egfr-1m17": { pops: ["EGFR 변이 양성 국소진행성 · 전이성 비소세포폐암 환자", "백금 기반 화학요법 후 재발 비소세포폐암 환자", "뇌전이를 동반한 EGFR 변이 비소세포폐암 환자"], eps: ["무진행 생존기간(PFS)", "객관적 반응률(ORR · RECIST 1.1)", "전체 생존기간(OS)"], brain: ["뇌전이를 동반한 EGFR 변이 비소세포폐암 환자"] },
    "dpp4-1x70": { pops: ["메트포르민 단독요법으로 혈당이 조절되지 않는 2형 당뇨병 환자", "신기능 저하를 동반한 2형 당뇨병 환자", "식이 · 운동요법 중인 초기 2형 당뇨병 환자"], eps: ["24주 시점 당화혈색소(HbA1c) 변화량", "공복 혈장 포도당(FPG) 변화량", "식후 2시간 혈당(PPG) 변화량"] },
    "cox2-3ln1": { pops: ["중등도~중증 활동성 류마티스 관절염 성인 환자", "기존 NSAID 위장관 부작용 위험군 관절염 환자", "급성 염증성 관절 통증 환자"], eps: ["ACR20 반응 달성률(24주)", "관절 통증 시각아날로그척도(VAS) 변화", "건강평가설문 장애지수(HAQ-DI) 변화"] }
  };
  const R = {
    cost: { htvs: 0.05, docking: 0.05, admet: 0.05, patent: 0.05, ind: 0.1, phase1: 0.3, phase2: 0.6, phase3: 1.2, final: 0.1 },
    days: { ind: 30, phase1: 90, phase2: 180, phase3: 360, final: 60 },
    absorption: { oral: { good: 1, moderate: 0.75, poor: 0.45 }, iv: 1, transdermal: { suitable: 0.85, unsuitable: 0.4 } },
    bbb: { high: 1, moderate: 0.7, low: 0.35 },
    doseE: { 10: 0.6, 50: 0.85, 100: 1 }, doseT: { 10: 10, 50: 30, 100: 55 },
    risk: { herg: { low: 0, moderate: 0.3, high: 0.6 }, hep: { low: 0, moderate: 0.25, high: 0.6 } },
    peak: { oral: 1, iv: 1.25, transdermal: 0.75 },
    th: { ind: { e: null, s: 35 }, phase1: { e: null, s: 50 }, phase2: { e: 40, s: null }, phase3: { e: 45, s: 55 } },
    noise: { phase1: 6, phase2: 6, phase3: 4 },
    approvalMult: { oral: 1.3, iv: 1, transdermal: 1.15 },
    startCash: 6
  };
  const FORM = { oral: "경구용 정제 · 캡슐", iv: "정맥주사제", transdermal: "경피 패치 · 비강 스프레이" };
  const FORM_SHORT = { oral: "경구", iv: "정맥주사", transdermal: "경피" };
  const ALERT = { aromatic_amine: "방향족 아민", nitro_aromatic: "방향족 니트로" };
  const LV = { good: "좋음", moderate: "보통", poor: "나쁨", high: "높음", low: "낮음", suitable: "적합", unsuitable: "부적합" };

  function signals(p) {
    const v = (p.mw > 500) + (p.logp > 5) + (p.hbd > 5) + (p.hba > 10);
    const oral = v === 0 && p.tpsa <= 140 && p.rotb <= 10 ? "good" : v <= 1 && p.tpsa <= 140 ? "moderate" : "poor";
    const bbb = p.tpsa <= 90 && p.mw <= 450 && p.hbd <= 3 ? "high" : p.tpsa <= 120 && p.mw <= 500 ? "moderate" : "low";
    const herg = p.ba > 0 && p.logp >= 3.7 ? "high" : p.ba > 0 && p.logp >= 2.5 ? "moderate" : "low";
    const hep = p.al.length ? "high" : p.logp > 3 && p.tpsa < 75 ? "moderate" : "low";
    const td = p.mw <= 500 && p.logp >= 1 && p.logp <= 4 ? "suitable" : "unsuitable";
    return { ro5: v, oral, bbb, herg, hep, td };
  }
  function notes(p, s) {
    return {
      ro5: `Ro5 위반 ${s.ro5} — MW ${p.mw.toFixed(1)} · cLogP ${f2(p.logp)} · HBD ${p.hbd} · HBA ${p.hba}`,
      oral: `경구 흡수 ${LV[s.oral]} — TPSA ${p.tpsa.toFixed(1)} · RotB ${p.rotb} · Ro5 위반 ${s.ro5}`,
      bbb: `뇌 노출 ${LV[s.bbb]} — TPSA ${p.tpsa.toFixed(1)} · MW ${p.mw.toFixed(1)} · HBD ${p.hbd}`,
      herg: p.ba === 0 ? "hERG 위험 낮음 — 염기성 아민 없음" : `hERG 위험 ${LV[s.herg]} — 염기성 아민 ${p.ba} · cLogP ${f2(p.logp)}`,
      hep: s.hep === "high" ? `간독성 위험 높음 — 구조 경고(${p.al.map((a) => ALERT[a] || a).join(" · ")})` : `간독성 위험 ${LV[s.hep]} — 구조 경고 없음 · cLogP ${f2(p.logp)} · TPSA ${p.tpsa.toFixed(1)}`,
      td: `경피 투과 ${LV[s.td]} — MW ${p.mw.toFixed(1)} · cLogP ${f2(p.logp)} (1~4)`
    };
  }
  /* 결합력 p: 기준 리간드보다 4.5 kcal/mol 약하면 0, 0.5 더 강하면 1 */
  const strength = (kcal, ref) => Math.min(1, Math.max(0, (ref + 4.5 - kcal) / 5));
  /* 효능 E · 안전 S 와 그 재료(parts)를 함께 돌려준다 */
  function score(c, kcal, tid, form, dose, pop) {
    const t = TARGETS[tid], s = signals(c);
    const brainPop = !!(TRIAL[tid].brain && TRIAL[tid].brain.includes(pop));
    const cns = t.cns || brainPop;
    const p = strength(kcal, t.refKcal);
    const A = form === "iv" ? 1 : form === "oral" ? R.absorption.oral[s.oral] : R.absorption.transdermal[s.td];
    const B = cns ? R.bbb[s.bbb] : 1;
    const De = R.doseE[dose], Dt = R.doseT[dose];
    const hergR = R.risk.herg[s.herg], hepR = R.risk.hep[s.hep];
    const Rk = 1 + hergR + hepR;
    const K = R.peak[form];
    const E = Math.round(100 * (0.3 + 0.7 * p) * A * B * De * 10) / 10;
    const S = Math.round(Math.max(0, 100 - Dt * Rk * K) * 10) / 10;
    return { E, S, s, parts: { p, A, B, De, Dt, hergR, hepR, Rk, K, cns, brainPop } };
  }

  const STEPS = [
    { n: 1, code: "1.1", t: "질환 · 표적 선정", short: "표적", sub: "Open Targets · 표적 탐색실", ph: 1, cost: 0,
      q: "어떤 단백질을 막으면 이 병이 나을까?" },
    { n: 2, code: "1.2", t: "화합물 스크리닝", short: "스크리닝", sub: "ChEMBL · RDKit 깔때기", ph: 1, cost: R.cost.htvs,
      q: "220개 분자 중 약이 될 만한 것만 어떻게 추릴까?" },
    { n: 3, code: "2.1", t: "분자 도킹", short: "도킹", sub: "AutoDock Vina · 서버실", ph: 2, cost: R.cost.docking,
      q: "후보 분자는 표적의 주머니에 얼마나 단단히 붙을까?" },
    { n: 4, code: "2.2", t: "ADMET 예측 · 리드", short: "ADMET", sub: "ADMET-AI v2 · ADMET실", ph: 2, cost: R.cost.admet,
      q: "잘 붙는 분자가 몸속에서도 안전하게 잘 돌아다닐까?" },
    { n: 5, code: "3.1", t: "선언 · 물질특허", short: "특허", sub: "시청 · 특허청 창구", ph: 3, cost: R.cost.patent,
      q: "우리가 찾은 분자를 어떻게 우리 것으로 지킬까?" },
    { n: 6, code: "3.2", t: "제형 · IND 신청", short: "IND", sub: "FDA 규제심사청", ph: 3, cost: R.cost.ind,
      q: "어떤 모양 · 얼마의 양으로 사람에게 처음 시험할까?" },
    { n: 7, code: "4.1", t: "임상 1 · 2 · 3상", short: "임상", sub: "대학병원 임상센터", ph: 4, cost: R.cost.phase1 + R.cost.phase2 + R.cost.phase3,
      q: "사람에게 안전하고, 정말 효과가 있을까?" },
    { n: 8, code: "4.2", t: "최종 허가", short: "허가", sub: "FDA 규제심사청", ph: 4, cost: R.cost.final,
      q: "환자에게 팔아도 된다는 허가를 받을 수 있을까?" }
  ];
  const PHASES = [{ n: 1, t: "발견" }, { n: 2, t: "최적화" }, { n: 3, t: "개발 · 규제" }, { n: 4, t: "임상 · 허가" }];

  /* ── 예시 실행: 알츠하이머 → ACHE(4EY7) 로 한 모둠이 1.1~4.2 를 밟은 결과 ──
     모든 시안이 같은 값을 그리므로, 시안끼리 공정하게 견줄 수 있다. */
  function buildExample() {
    const tid = "ache-4ey7", t = TARGETS[tid];
    const disease = D.diseases.find((d) => d.tid === tid) || D.diseases[0];
    const target = disease ? disease.targets.find((x) => x.dockingTargetId === tid) : null;

    /* 1.2 스크리닝: 단계마다 어떤 분자가 떨어졌는지 기록 */
    const P = { lib: Object.keys(D.meta.counts || {}), mwMax: 500, tpsaMax: 140, ro5Max: 1, noAlerts: true, qedMin: 0.3, topN: 10 };
    const gates = [
      { key: "lib", label: "라이브러리", rule: "고른 라이브러리 3종", test: (c) => P.lib.includes(c.lib) },
      { key: "mwTpsa", label: "MW · TPSA", rule: `분자량 ≤ ${P.mwMax} Da · TPSA ≤ ${P.tpsaMax} Å²`, test: (c) => c.mw <= P.mwMax && c.tpsa <= P.tpsaMax },
      { key: "ro5", label: "Ro5", rule: `Lipinski 위반 ≤ ${P.ro5Max}개`, test: (c) => c.ro5 <= P.ro5Max },
      { key: "alerts", label: "구조 경고", rule: "방향족 아민 · 니트로 빼기", test: (c) => !c.al.length },
      { key: "qed", label: "QED", rule: `QED ≥ ${P.qedMin}`, test: (c) => c.qed >= P.qedMin }
    ];
    const failAt = new Map();
    for (const c of D.compounds) {
      const i = gates.findIndex((g) => !g.test(c));
      failAt.set(c.id, i); /* -1 = 모두 통과 */
    }
    const passed = D.compounds.filter((c) => failAt.get(c.id) === -1).sort((a, b) => (b.sc[tid] || 0) - (a.sc[tid] || 0));
    const sel = passed.slice(0, P.topN);
    const stages = [{ key: "all", label: "전체", rule: "ChEMBL · ZINC · 사내 합성", n: D.compounds.length }];
    let alive = D.compounds.length;
    gates.forEach((g, i) => { alive -= D.compounds.filter((c) => failAt.get(c.id) === i).length; stages.push({ key: g.key, label: g.label, rule: g.rule, n: alive }); });
    stages.push({ key: "top", label: `점수 상위 ${P.topN}`, rule: `${t.gene} 스크리닝 점수 순`, n: sel.length });

    /* 2.1 도킹: 후보 상위 5 + 기준 리간드 */
    /* 기준 리간드와 같은 분자는 늘 함께 도킹하므로 후보에서 뺀다 */
    const picks = sel.filter((c) => c.s !== t.refSmiles).slice(0, 5);
    const ref = { id: "REF", n: `${t.ref} (기준)`, s: t.refSmiles, ref: true };
    const dock = picks.map((c) => ({ id: c.id, c, name: c.n, kcal: c.vk[tid], p: strength(c.vk[tid], t.refKcal), ref: false }))
      .concat([{ id: "REF", c: ref, name: ref.n, kcal: t.refKcal, p: strength(t.refKcal, t.refKcal), ref: true }])
      .sort((a, b) => a.kcal - b.kcal);

    /* 2.2 ADMET · 리드: 경구 50 mg · 첫 환자군에서 min(E, S) 가 가장 큰 분자 */
    const pop = TRIAL[tid].pops[0], ep = TRIAL[tid].eps[0];
    const admet = dock.filter((d) => !d.ref).map((d) => {
      const s = signals(d.c);
      return { id: d.id, c: d.c, name: d.name, kcal: d.kcal, p: d.p, s, n: notes(d.c, s), sc: score(d.c, d.kcal, tid, "oral", 50, pop) };
    });
    /* 이 표적을 겨냥해 만든 계열(c.t === tid)을 먼저 본다. 도킹 1위 Troglitazone 은 당뇨약(PPAR)이라 리드에서 빠지는 예시가 된다. */
    const byBalance = (a, b) => Math.min(b.sc.E, b.sc.S) - Math.min(a.sc.E, a.sc.S) || b.sc.E - a.sc.E;
    const lead = admet.filter((a) => a.c.t === tid).sort(byBalance)[0] || admet.slice().sort(byBalance)[0];

    /* 3.1 선언 · 특허 */
    const program = { company: "크리스타바이오", ticker: "CRX", code: "CRX-101", mech: `${t.gene} 선택적 가역 억제제`,
      plabel: `${lead ? lead.name.split(" ")[0] : ""} 계열 화합물`, patentNo: "KR-37-4821", day: 12 };

    /* 3.2 제형 · IND: 고른 값 + 모든 조합의 점수판 */
    const form = "oral", dose = 50;
    const base = lead ? score(lead.c, lead.kcal, tid, form, dose, pop) : null;
    const grid = [];
    if (lead) for (const f of Object.keys(FORM)) for (const d of [10, 50, 100]) {
      const r = score(lead.c, lead.kcal, tid, f, d, pop);
      grid.push({ form: f, dose: d, E: r.E, S: r.S, ind: r.S >= R.th.ind.s });
    }
    const ind = base ? { form, dose, pop, ep, E: base.E, S: base.S, pass: base.S >= R.th.ind.s, day: program.day + R.days.ind } : null;

    /* 4.1 임상: 흔들림을 고정값으로 둔 한 이야기.
       50 mg 1상이 안전 기준(S ≥ 50)에 못 미쳐 떨어지고 → FDA 에서 10 mg 로 바꿔(무료) → 1 · 2 · 3상을 통과한다. */
    const trials = [];
    let finalDose = dose;
    if (base) {
      let day = ind.day;
      const run = (k, d, n, note) => {
        const r = score(lead.c, lead.kcal, tid, form, d, pop);
        const E = Math.max(0, Math.round((r.E + n) * 10) / 10), S = Math.max(0, Math.round((r.S + n) * 10) / 10), th = R.th[k];
        const pass = (th.e == null || E >= th.e) && (th.s == null || S >= th.s);
        day += R.days[k];
        trials.push({ k, label: { phase1: "1상", phase2: "2상", phase3: "3상" }[k], dose: d, base: { E: r.E, S: r.S }, n, E, S, pass, th, day, cost: R.cost[k], note });
      };
      run("phase1", 50, 3, "건강한 지원자 · 안전 확인");
      finalDose = 10; /* 실패 뒤 FDA 에서 용량 변경(무료 · 0일) */
      run("phase1", 10, -2, "같은 프로토콜 · 10 mg 로 다시");
      run("phase2", 10, 1, "환자 소수 · 효능 확인");
      run("phase3", 10, -1, "환자 다수 · 효능 + 안전");
    }

    /* 4.2 허가 */
    const spent = Math.round((R.cost.htvs + R.cost.docking + R.cost.admet + R.cost.patent + R.cost.ind + trials.reduce((a, x) => a + x.cost, 0) + R.cost.final) * 1000) / 1000;
    const finalDay = (trials.length ? trials[trials.length - 1].day : 0) + R.days.final;
    const approval = { dose: finalDose, brand: "메모렉스", shape: "tablet", color: "ivory", day: finalDay, spent, share: Math.min(20, 12 * R.approvalMult[form]), mult: R.approvalMult[form] };

    return { tid, t, disease, target, diseases: D.diseases, screen: { P, gates, stages, failAt, passed, sel }, picks, dock, admet, lead, program, ind, grid, base, trials, finalDose, approval };
  }
  const EX = buildExample();

  /* ── 그리기 도구 ── */
  /* 구조식 자리. 화면에 붙인 뒤 CV.drawMols() 가 SmilesDrawer 로 채운다. */
  const molCache = new Map();
  function mol(smiles, w = 260, h = 170, cls = "") {
    const key = smiles + "|" + w + "|" + h;
    const box = `<div class="molbox ${cls}" style="aspect-ratio:${w} / ${h}">`;
    if (molCache.has(key)) return `${box}${molCache.get(key)}</div>`;
    return `${box}<svg class="mol" data-smiles="${esc(smiles)}" data-w="${w}" data-h="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="구조식"></svg></div>`;
  }
  function drawMols(root) {
    const SD = window.SmilesDrawer;
    for (const el of (root || document).querySelectorAll("svg[data-smiles]")) {
      const smi = el.getAttribute("data-smiles"), w = +el.dataset.w, h = +el.dataset.h, key = smi + "|" + w + "|" + h;
      el.removeAttribute("data-smiles");
      if (!SD) { el.outerHTML = `<span class="fallback">${esc(smi)}</span>`; continue; }
      try {
        const sd = new SD.SmiDrawer({ width: w, height: h, padding: 6, bondThickness: 1.1, compactDrawing: false, fontSizeLarge: 7, fontSizeSmall: 5 });
        sd.draw(smi, el, "light", () => {
          el.removeAttribute("style"); el.removeAttribute("width"); el.removeAttribute("height"); el.setAttribute("class", "mol");
          try { const b = el.getBBox(); if (b.width && b.height) el.setAttribute("viewBox", `${b.x - 6} ${b.y - 6} ${b.width + 12} ${b.height + 12}`); } catch (e) {}
          el.setAttribute("preserveAspectRatio", "xMidYMid meet");
          molCache.set(key, el.outerHTML);
        }, () => { el.outerHTML = `<span class="fallback">${esc(smi)}</span>`; });
      } catch (e) { el.outerHTML = `<span class="fallback">${esc(smi)}</span>`; }
    }
  }
  /* SVG 한 장: 너비는 상자에 맞춰 늘고, 글자는 viewBox 단위로 */
  const svg = (w, h, body, label = "") => `<svg class="vz-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;
  /* 눈금값 n개(양 끝 포함) */
  const ticks = (lo, hi, n = 5) => Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
  /* 신호 → 색 이름(CSS 변수) */
  const tone = { good: "good", high: "good", suitable: "good", moderate: "warn", poor: "bad", low: "bad", unsuitable: "bad" };
  const riskTone = { low: "good", moderate: "warn", high: "bad" };

  /* 시안 파일이 자기 스타일을 한 번만 붙인다: CV.css("s3-", `.s3-bar { … }`) */
  const cssDone = new Set();
  function css(id, text) {
    if (cssDone.has(id) || typeof document === "undefined") return;
    cssDone.add(id);
    const st = document.createElement("style"); st.dataset.viz = id; st.textContent = text; document.head.appendChild(st);
  }
  const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.CV = { css, reduced, D, CMP, esc, pad, f1, f2, f3, MX, clamp, lerp, scale, josa, rng, TARGETS, TRIAL, R, FORM, FORM_SHORT, ALERT, LV,
    signals, notes, strength, score, STEPS, PHASES, EX, mol, drawMols, svg, ticks, tone, riskTone };
  window.VIZ = window.VIZ || {};
})();
