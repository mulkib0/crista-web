/* 1.1 질환 · 표적 선정 — UI 시안 10종.
   단계 시각화 1.01 근거 열지도 · 1.03 내 점수 만들기 · 1.04 질환-유전자 망 · 1.09 점수 × 약물 근거 · 1.10 카드 뒤집기를
   '질환과 표적을 고르는 도구'로 다시 짠다. 데이터는 data.js(window.DD — Open Targets v4 · 4대 질환 × 표적 8).
   설계 §6.1.1 의 나머지 8질환은 아직 데이터가 없어 '준비 중' 타일로만 보인다(값을 지어내지 않는다).
   모둠 공유(오른쪽)는 §6.4 — 모둠원이 각자 '내 추천 표적' 카드를 올리고, 과반 찬성으로 모둠의 targetId 하나를 확정한다. */
(function () {
  "use strict";
  const D = window.DD || { diseases: [], compounds: [] };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const f2 = (v) => Number(v).toFixed(2), f3 = (v) => Number(v).toFixed(3), pad = (n) => String(n).padStart(2, "0");
  const n0 = (v) => Number(v).toLocaleString("ko-KR");
  const josa = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };
  const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rng = (seed = 7) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const scale = (dom, rng2) => (v) => rng2[0] + ((v - dom[0]) / (dom[1] - dom[0])) * (rng2[1] - rng2[0]);

  /* ── 모둠 · 직책(§6.4) — 1인 1질환군 ── */
  const MEMBERS = [
    { id: "m1", name: "김하늘", short: "하늘", role: "CEO", grp: 2 },
    { id: "m2", name: "이도윤", short: "도윤", role: "CSO", grp: 0 },
    { id: "m3", name: "박서연", short: "서연", role: "CTO", grp: 1 },
    { id: "m4", name: "정민준", short: "민준", role: "CMO", grp: 3 }
  ];
  const MM = Object.fromEntries(MEMBERS.map((m) => [m.id, m]));
  const QUORUM = Math.floor(MEMBERS.length / 2) + 1;

  /* ── 도킹 표적 4종(game-rules 사본 · core.js 와 같은 값) ── */
  const TG = {
    "ache-4ey7": { gene: "ACHE", pdb: "4EY7", lig: "E20", ref: "도네페질", refSmiles: "COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccccc3)CC1)C2", refKcal: -11.84, rmsd: 0.82, cns: true },
    "egfr-1m17": { gene: "EGFR", pdb: "1M17", lig: "AQ4", ref: "엘로티닙", refSmiles: "C#Cc1cccc(Nc2ncnc3cc(OCCOC)c(OCCOC)cc23)c1", refKcal: -7.24, rmsd: 1.33, cns: false },
    "dpp4-1x70": { gene: "DPP4", pdb: "1X70", lig: "715", ref: "시타글립틴", refSmiles: "NC(CC(=O)N1CCn2c(nnc2C(F)(F)F)C1)Cc1cc(F)c(F)cc1F", refKcal: -9.02, rmsd: 0.8, cns: false },
    "cox2-3ln1": { gene: "PTGS2", pdb: "3LN1", lig: "CEL", ref: "세레콕시브", refSmiles: "Cc1ccc(-c2cc(C(F)(F)F)nn2-c2ccc(S(N)(=O)=O)cc2)cc1", refKcal: -12.26, rmsd: 0.51, cns: false }
  };

  /* ── 12대 질환 카탈로그(§6.1.1) — 데이터가 있는 4종만 열린다 ── */
  const GROUPS = [
    { n: "Ⅰ", t: "신경계", sub: "뇌까지 가는 약 · BBB 필수", ds: [
      { tid: "ache-4ey7", short: "알츠하이머", blurb: "기억이 흐려지는 뇌 질환. 약이 뇌혈관 장벽을 넘어야 해요.", taken: "다온테라퓨틱스" },
      { name: "파킨슨병", gene: "MAOB", pdb: "2V5Z", ref: "사피나미드" },
      { name: "주요우울장애", gene: "SLC6A4", pdb: "5I71", ref: "에스시탈로프람" }] },
    { n: "Ⅱ", t: "종양 · 항암", sub: "암세포의 신호를 끊는 표적항암제", ds: [
      { tid: "egfr-1m17", short: "비소세포폐암", blurb: "폐암의 대부분. 암세포가 '자라라'는 신호를 받는 수용체를 막아요." },
      { name: "만성 골수성 백혈병", gene: "ABL1", pdb: "2HYY", ref: "이마티닙" },
      { name: "전이성 흑색종", gene: "BRAF", pdb: "3OG7", ref: "베무라페닙" }] },
    { n: "Ⅲ", t: "대사 · 심혈관", sub: "오래 먹는 약 · 안전이 먼저", ds: [
      { tid: "dpp4-1x70", short: "2형 당뇨", blurb: "혈당이 조절되지 않는 만성 질환. 평생 먹는 약이라 안전이 먼저예요." },
      { name: "고지혈증", gene: "HMGCR", pdb: "1HWK", ref: "아토르바스타틴" },
      { name: "정맥혈전색전증", gene: "F10", pdb: "2P16", ref: "아픽사반" }] },
    { n: "Ⅳ", t: "면역 · 염증 · 호흡기", sub: "먹는 약 · 바르는 약 · 흡입약", ds: [
      { tid: "cox2-3ln1", short: "류마티스", blurb: "면역이 내 관절을 공격하는 염증. 통증과 염증을 줄이는 약이에요." },
      { name: "아토피 피부염", gene: "JAK1", pdb: "6BBU", ref: "아브로시티닙" },
      { name: "천식 · COPD", gene: "PDE4B", pdb: "1XMU", ref: "로플루밀라스트" }] }
  ];
  const KO = {
    ACHE: "아세틸콜린 분해 효소", APP: "아밀로이드 전구 단백질", PSEN1: "프레세닐린 1", PSEN2: "프레세닐린 2", APOE: "아포지단백 E", ABCA7: "지질 운반 단백질 A7", SORL1: "소르틸린 관련 수용체", GRIN1: "NMDA 수용체 소단위 1",
    EGFR: "상피세포 성장인자 수용체", KRAS: "KRas GTP 분해 효소", ALK: "ALK 수용체 티로신 키나아제", ERBB2: "HER2 수용체", ROS1: "ROS1 수용체 티로신 키나아제", MET: "MET 수용체 티로신 키나아제", DICER1: "다이서 1 리보핵산 분해 효소", RET: "RET 수용체 티로신 키나아제",
    DPP4: "디펩티딜 펩티다아제-4", KCNJ11: "칼륨 통로 소단위 Kir6.2", ABCC8: "설포닐우레아 수용체 1", GCK: "글루코키나아제", PPARG: "PPAR 감마 수용체", HNF1A: "간세포 핵인자 1α", HNF4A: "간세포 핵인자 4α", HNF1B: "간세포 핵인자 1β",
    PTGS2: "사이클로옥시게나아제-2", TYK2: "티로신 키나아제 2", IL6R: "인터루킨 6 수용체", IL12B: "인터루킨 12B", JAK1: "야누스 키나아제 1", TRAF3IP2: "TRAF3 상호작용 단백질 2", TNF: "종양 괴사 인자", PADI4: "펩티딜 아르기닌 탈이민 효소 4"
  };
  const EV = [
    { k: "geneticScore", t: "유전", h: "변이", d: "환자 변이가 모이나", c: "var(--e1)" },
    { k: "drugScore", t: "약물", h: "기존 약", d: "겨냥한 약이 있나", c: "var(--e2)" },
    { k: "literatureScore", t: "문헌", h: "논문", d: "논문에 함께 나오나", c: "var(--e3)" },
    { k: "expressionScore", t: "발현", h: "조직 속 양", d: "병든 조직에서 달라지나", c: "var(--e4)" }
  ];
  const DIS = {}, DLIST = [];
  for (const g of GROUPS) for (const c of g.ds) if (c.tid) {
    const d = D.diseases.find((x) => x.tid === c.tid); if (!d) continue;
    const ts = d.targets.slice().sort((a, b) => b.overallScore - a.overallScore);
    const o = { tid: c.tid, name: d.name, short: c.short, mondo: d.mondo, en: d.en, assoc: d.assoc, pdb: d.pdb, ts, g, blurb: c.blurb, taken: c.taken || null, tg: TG[c.tid], color: `var(--d${DLIST.length + 1})`, idx: DLIST.length };
    DIS[c.tid] = o; DLIST.push(o); c.d = o; c.name = d.name;
  }
  const ALL = []; DLIST.forEach((d) => d.ts.forEach((t) => ALL.push({ t, d })));
  const tierOf = (t) => (t.dockingTargetId ? "ready" : t.pdbId ? "pdb" : "none");
  const TIER = { ready: { k: "good", g: "✓", t: "도킹 준비됨", o: 0 }, pdb: { k: "warn", g: "△", t: "구조만 있음", o: 1 }, none: { k: "bad", g: "✗", t: "구조 없음", o: 2 } };
  const rank = (d, t) => d.ts.indexOf(t) + 1;
  const readyOf = (d) => d.ts.find((t) => t.dockingTargetId);
  const findT = (tid, sym) => (DIS[tid] ? DIS[tid].ts.find((t) => t.symbol === sym) : null);
  const my = (t, w) => { const sw = w.reduce((a, x) => a + x, 0); return sw ? EV.reduce((a, e, k) => a + w[k] * t[e.k], 0) / sw : 0; };
  const myRows = (w) => ALL.map((r) => ({ ...r, seg: EV.map((e, k) => { const sw = w.reduce((a, x) => a + x, 0); return sw ? (w[k] * r.t[e.k]) / sw : 0; }), s: my(r.t, w) })).sort((a, b) => b.s - a.s);

  /* ── 추천 근거 — 데이터와 맞는지 코치가 짚는다(§5.5 찜 근거와 같은 규칙: 막음 · 주의) ── */
  const REASONS = [
    { id: "ready", t: "결정구조와 기준 약이 있어 바로 도킹할 수 있어요", check: (t) => (tierOf(t) === "ready" ? null : { k: "bad", m: `${t.symbol} 는 도킹 준비가 안 됐어요 — ${TIER[tierOf(t)].t}` }) },
    { id: "score", t: "이 질환에서 종합 점수가 높아요", check: (t, d) => { const r = rank(d, t); return r <= 3 ? null : { k: "warn", m: `종합 점수는 8개 중 ${r}위예요` }; } },
    { id: "gen", t: "환자 유전자 변이 근거가 강해요", check: (t) => (t.geneticScore >= 0.85 ? null : t.geneticScore > 0.5 ? { k: "warn", m: `유전 근거 ${f2(t.geneticScore)} — 아주 강하진 않아요` } : { k: "bad", m: `유전 근거 ${f2(t.geneticScore)} — 변이 근거가 거의 없어요` }) },
    { id: "drug", t: "이미 약이 있는 표적이라 견줄 잣대가 있어요", check: (t) => (t.drugScore >= 0.9 ? null : { k: "bad", m: `약물 근거 ${f2(t.drugScore)} — 기존 약이 없거나 약해요` }) },
    { id: "expr", t: "병든 조직에서 발현 변화가 뚜렷해요", check: (t) => (t.expressionScore >= 0.6 ? null : t.expressionScore >= 0.3 ? { k: "warn", m: `발현 근거 ${f2(t.expressionScore)} — 뚜렷하진 않아요` } : { k: "bad", m: `발현 근거 ${f2(t.expressionScore)} — 발현 변화 근거가 없어요` }) },
    { id: "free", t: "다른 모둠이 아직 안 고른 질환이라서", check: (t, d) => (d.taken ? { k: "warn", m: `${d.taken}${josa(d.taken, "이", "가")} 이미 ${d.name}${josa(d.name, "을", "를")} 골랐어요(전광판)` } : null) }
  ];
  const RR = Object.fromEntries(REASONS.map((r) => [r.id, r]));

  /* ── 상태 ── */
  const KEY = "crista-target-select-10";
  const seedPicks = () => ({
    m3: { tid: "egfr-1m17", sym: "EGFR", reasons: ["ready", "score", "gen"], note: "점수 1위이면서 도킹 준비까지 된 유일한 표적. 뇌로 안 가도 돼서 1.2 기준도 넓게 잡을 수 있어요.", at: "09:12" },
    m4: { tid: "cox2-3ln1", sym: "PTGS2", reasons: ["ready", "drug"], note: "세레콕시브가 이미 있어 견줄 잣대가 확실해요. 점수는 꼴찌(8위)라 토론이 필요해요.", at: "09:20" }
  });
  const seedLog = () => [
    { who: "m3", t: "EGFR(비소세포폐암) 추천 카드를 올렸어요", at: "09:12" },
    { who: "m4", t: "PTGS2(류마티스 관절염) 추천 카드를 올렸어요", at: "09:20" },
    { who: "m1", t: "Ⅲ 대사 · 심혈관 보는 중 — 당뇨는 DPP4 하나만 도킹돼요", at: "09:24" }
  ];
  const SEEDW = { m1: [1, 1, 1, 1], m3: [2, 1, 1, 1], m4: [0, 3, 2, 0] };
  const SEEDFLIP = { m3: { "egfr-1m17": 8 }, m4: { "cox2-3ln1": 5 }, m1: { "dpp4-1x70": 3 } };
  const fresh = () => ({ v: 1, viewer: "m2", tid: "ache-4ey7", sym: null, w: [1, 1, 1, 1], rs: { reasons: [], note: "" }, picks: seedPicks(), votes: { m3: "m3", m4: "m4" }, confirmed: null, done: false,
    flipped: {}, cmp: [], step: 1, filt: { g: [true, true, true, true], ready: false, gen: false }, drawer: "d", view: "heat", seen: {}, log: seedLog(), news: [], clock: 25, peek: null });
  let S = fresh();
  try { const r = JSON.parse(localStorage.getItem(KEY) || "null"); if (r && r.picks) S = Object.assign(fresh(), r); } catch (e) {}
  (function fromHash() { const m = /^#v(\d{1,2})$/.exec(location.hash || ""); if (m) S.v = Math.max(1, Math.min(10, +m[1])); })();
  /* ?demo — 스크린샷용 시연 상태(표적 ACHE 고른 뒤 · 견주기 2장 · 카드 3장 뒤집음 · 걸음 2 · 구조 서랍) */
  if (/\bdemo\b/.test(location.search)) Object.assign(S, { sym: "ACHE", step: 2, cmp: [{ sym: "APP", tid: "ache-4ey7" }, { sym: "ACHE", tid: "ache-4ey7" }], flipped: { "ache-4ey7": { APP: 1, PSEN1: 1, ACHE: 1 } }, drawer: "s" });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const me = () => S.viewer;
  const curD = () => DIS[S.tid] || DLIST[0];
  const curT = () => (S.sym ? findT(S.tid, S.sym) : null);
  const tick = () => { S.clock += 1 + Math.floor(Math.random() * 3); return `09:${pad(Math.min(59, S.clock))}`; };
  let timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, reduced() ? 10 : ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* ── 그리기 도구 ── */
  const tx = (x, y, s, o = {}) => `<text x="${x}" y="${y}"${o.a ? ` text-anchor="${o.a}"` : ""}${o.cls ? ` class="${o.cls}"` : ""} style="font-size:${o.fs || 12.5}px${o.w ? `;font-weight:${o.w}` : ""}${o.fill ? `;fill:${o.fill}` : ""}${o.op != null ? `;opacity:${o.op}` : ""}">${s}</text>`;
  const svg = (w, h, body, label = "") => `<svg class="vz" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;
  const chipSVG = (x, y, w, tier, short) => { const T = TIER[tier]; return `<rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="var(--${T.k}-bg)" stroke="var(--${T.k})" stroke-width="1"/>` + tx(x + w / 2, y + 15.5, `${T.g} ${short ? T.t.replace("도킹 ", "") : T.t}`, { a: "middle", fs: 12, w: 600, fill: `var(--${T.k})` }); };
  const evBars = (t) => `<div class="ev">${EV.map((e) => `<span>${e.t}<i><b style="width:${(t[e.k] * 100).toFixed(1)}%;background:${e.c}"></b></i><em>${f2(t[e.k])}</em></span>`).join("")}</div>`;
  const molCache = new Map();
  function mol(smiles, w = 220, h = 120) {
    const key = smiles + "|" + w + "|" + h, box = `<div class="molbox" style="aspect-ratio:${w} / ${h}">`;
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
          el.setAttribute("preserveAspectRatio", "xMidYMid meet"); molCache.set(key, el.outerHTML);
        }, () => { el.outerHTML = `<span class="fallback">${esc(smi)}</span>`; });
      } catch (e) { el.outerHTML = `<span class="fallback">${esc(smi)}</span>`; }
    }
  }

  /* ── 1.01 근거 열지도 — 질환 하나의 표적 8개. o.w 가 있으면 종합 점수 대신 '내 점수'(1.03)로 줄 세운다. o.compact 는 07 견주기용 ── */
  function heatSVG(d, o = {}) {
    const w = o.w, cp = !!o.compact, W = cp ? 680 : 760, top = 58, rh = 40, H = top + d.ts.length * rh + (o.nocap ? 10 : 44);
    const cx = (k) => (cp ? 128 + k * 62 : 150 + k * 64), cw = cp ? 56 : 58, bx = cp ? 384 : 414, bw = cp ? 100 : 110, px = cp ? 0 : 600, chx = cp ? 540 : 640;
    const rows = w ? d.ts.slice().sort((a, b) => my(b, w) - my(a, w)) : d.ts;
    let b = "";
    EV.forEach((e, k) => { b += tx(cx(k) + cw / 2, 24, e.t, { a: "middle", w: 700, fs: 13 }) + tx(cx(k) + cw / 2, 42, w ? `× ${w[k]}` : e.h, { a: "middle", cls: w ? "t-m t-mu" : "t-mu", fs: 11 }); });
    b += tx(bx, 24, w ? "내 점수" : "종합 점수", { w: 700, fs: 13 }) + tx(bx, 42, w ? "근거 × 가중치의 평균" : "근거를 합친 값", { cls: "t-mu", fs: 11 });
    if (!cp) b += tx(px, 24, "결정구조", { a: "middle", w: 700, fs: 13 }) + tx(px, 42, "PDB 번호", { a: "middle", cls: "t-mu", fs: 11 });
    b += tx(chx + 50, 24, "다음 단계", { a: "middle", w: 700, fs: 13 }) + tx(chx + 50, 42, "2.1 도킹", { a: "middle", cls: "t-mu", fs: 11 });
    rows.forEach((t, i) => {
      const y = top + i * rh, tier = tierOf(t), sel = o.sel === t.symbol, sc = w ? my(t, w) : t.overallScore, inCmp = o.cmp && o.cmp.includes(t.symbol);
      b += `<g class="hr" data-act="${o.act || "pick-t"}" data-sym="${t.symbol}" data-tid="${d.tid}" tabindex="0" role="button" aria-pressed="${sel || !!inCmp}" aria-label="${t.symbol} ${esc(KO[t.symbol] || "")} 종합 ${f3(t.overallScore)} ${TIER[tier].t}">`;
      b += `<rect class="bg" x="0" y="${y}" width="${W}" height="${rh}" rx="8" fill="${tier === "ready" ? "var(--hi)" : "transparent"}" fill-opacity="${tier === "ready" ? 0.45 : 1}"/>`;
      b += `<rect class="fo" x="1" y="${y + 1}" width="${W - 2}" height="${rh - 2}" rx="8" fill="none" stroke="${sel || inCmp ? "var(--fg)" : "transparent"}" stroke-width="2"/>`;
      b += `<line x1="8" x2="${W - 8}" y1="${y + rh}" y2="${y + rh}" stroke="var(--line)" stroke-width="1"/>`;
      b += tx(8, y + 17, `${i + 1}`, { cls: "t-m t-mu", fs: 11 }) + tx(26, y + 17, t.symbol, { cls: "t-m", w: 600, fs: 13.5 }) + tx(26, y + 33, esc(KO[t.symbol] || t.name), { cls: "t-mu", fs: 10.5 });
      EV.forEach((e, k) => {
        const v = t[e.k];
        b += `<rect x="${cx(k)}" y="${y + 4}" width="${cw}" height="${rh - 8}" rx="5" fill="${e.c}" fill-opacity="${(0.06 + 0.86 * v).toFixed(3)}" stroke="var(--line)" stroke-width="1"/>`;
        b += tx(cx(k) + cw / 2, y + 25, v === 0 ? "0" : f2(v), { a: "middle", cls: "t-m", fs: 12, w: 600, fill: v > 0.5 ? "var(--surface)" : "var(--fg)" });
      });
      b += `<rect x="${bx}" y="${y + 13}" width="${bw}" height="14" rx="7" fill="var(--raise)"/><rect x="${bx}" y="${y + 13}" width="${(sc * bw).toFixed(1)}" height="14" rx="7" fill="${tier === "ready" ? "var(--good)" : "var(--fg)"}"/>`;
      b += tx(bx + bw + 6, y + 25, f3(sc), { cls: "t-m", fs: 12 });
      if (w) b += `<line x1="${bx + t.overallScore * bw}" x2="${bx + t.overallScore * bw}" y1="${y + 9}" y2="${y + 31}" stroke="var(--fg)" stroke-width="2"/>`;
      if (!cp) b += tx(px, y + 25, t.pdbId ? t.pdbId : "—", { a: "middle", cls: "t-m", w: t.pdbId ? 600 : 400, fs: 12.5 });
      b += chipSVG(chx, y + 9, cp ? 96 : 100, tier, true);
      if (o.act === "cmp") b += `<rect x="${W - 22}" y="${y + 12}" width="16" height="16" rx="4" fill="${inCmp ? "var(--fg)" : "var(--surface)"}" stroke="var(--line-strong)"/>` + (inCmp ? tx(W - 14, y + 24.5, "✓", { a: "middle", fs: 11, w: 700, fill: "var(--surface)" }) : "");
      b += `</g>`;
    });
    if (!cp) { b += `<line x1="${bx + bw * 0.5}" x2="${bx + bw * 0.5}" y1="${top}" y2="${top + rows.length * rh}" stroke="var(--line-strong)" stroke-dasharray="3 3" stroke-width="1"/>` + tx(bx + bw * 0.5, top + rows.length * rh + 14, "0.5", { a: "middle", cls: "t-m t-mu", fs: 11 }); }
    if (!o.nocap) b += tx(8, H - 8, o.cap || `${d.name} 연관 표적 ${n0(d.assoc)}개 중 상위 8 · ${w ? "내 점수" : "종합 점수"} 순${w ? " · 검은 세로선 = Open Targets 종합 점수" : ""} · 도킹 준비된 표적은 ${readyOf(d).symbol} 하나`, { fs: 12.5, w: 600 });
    return `<div class="sx">${svg(W, H, b, `${d.name} 표적 8개의 근거 4종 열지도`)}</div>`;
  }

  /* ── 1.04 질환-유전자 망 — 가운데 질환, 표적은 점수만큼 가깝게, 모양은 준비 상태. o.size 'sm' 은 작은 배수 · o.flags 는 모둠원 깃발 ── */
  const ANGS = [-100, 100, -42, 42, -142, 142, 180, 60];
  function netSVG(d, o = {}) {
    const sm = o.size === "sm", W = sm ? 320 : 760, H = sm ? 290 : 540, cx = W / 2, cy = sm ? 145 : 270, k = sm ? 0.42 : 1;
    const R = (s) => (60 + (0.92 - s) * 720) * k;
    let b = "", ang = 0;
    const pts = d.ts.map((t) => { const a = ((t.dockingTargetId ? 0 : ANGS[ang++]) * Math.PI) / 180, r = R(t.overallScore); return { t, a, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; });
    if (!sm) {
      const rd = rng(11 + d.idx), nd = Math.round((d.assoc - 8) / 50); let placed = 0, guard = 0;
      while (placed < nd && guard++ < 20000) { const x = 6 + rd() * (W - 12), y = 6 + rd() * (H - 12); if (Math.hypot(x - cx, y - cy) < 300) continue; b += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="var(--muted)" fill-opacity=".35"/>`; placed++; }
      for (const s of [0.8, 0.7]) { const r = R(s); b += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--line-strong)" stroke-dasharray="3 4" stroke-width="1"/>` + tx(cx + 4, cy - r - 4, `점수 ${s}`, { cls: "t-m t-mu", fs: 11 }); }
    }
    for (const p of pts) { const rd = tierOf(p.t) === "ready"; b += `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${rd ? "var(--good)" : "var(--fg)"}" stroke-opacity="${rd ? 1 : 0.5}" stroke-width="${((1 + (p.t.overallScore - 0.6) * 18) * (sm ? 0.6 : 1)).toFixed(1)}"/>`; }
    const cr = sm ? 24 : 52;
    b += `<circle cx="${cx}" cy="${cy}" r="${cr}" fill="var(--fg)"/>` + tx(cx, cy + (sm ? 4 : -6), esc(d.short), { a: "middle", fs: sm ? 10 : 14, w: 700, fill: "var(--surface)" }) + (sm ? "" : tx(cx, cy + 13, `연관 ${n0(d.assoc)}`, { a: "middle", cls: "t-m", fs: 11.5, fill: "var(--hi)" }));
    for (const p of pts) {
      const tr = tierOf(p.t), T = TIER[tr], s = sm ? 0.55 : 1, sel = o.sel === p.t.symbol;
      const lx = p.x + Math.cos(p.a) * 30 * s, ly = p.y + Math.sin(p.a) * 30 * s + 4, anc = Math.cos(p.a) > 0.3 ? "start" : Math.cos(p.a) < -0.3 ? "end" : "middle";
      const shape = tr === "ready" ? `<rect x="${p.x - 15 * s}" y="${p.y - 15 * s}" width="${30 * s}" height="${30 * s}" rx="${4 * s}" fill="var(--good)" stroke="var(--fg)" stroke-width="1.5"/>` + tx(p.x, p.y + 5 * s, "✓", { a: "middle", fs: 14 * s, w: 700, fill: "var(--surface)" })
        : tr === "pdb" ? `<rect x="${p.x - 12 * s}" y="${p.y - 12 * s}" width="${24 * s}" height="${24 * s}" rx="${3 * s}" fill="var(--surface)" stroke="var(--warn)" stroke-width="2"/>` + tx(p.x, p.y + 4 * s, "△", { a: "middle", fs: 11 * s, fill: "var(--warn)" })
          : `<circle cx="${p.x}" cy="${p.y}" r="${12 * s}" fill="var(--surface)" stroke="var(--bad)" stroke-width="2" stroke-dasharray="3 2"/>` + tx(p.x, p.y + 4 * s, "✗", { a: "middle", fs: 11 * s, fill: "var(--bad)" });
      b += `<g class="nd" data-act="${o.act || "pick-t"}" data-sym="${p.t.symbol}" data-tid="${d.tid}" tabindex="0" role="button" aria-pressed="${sel}" aria-label="${p.t.symbol} 종합 ${f3(p.t.overallScore)} ${T.t}">` +
        (sel ? `<circle cx="${p.x}" cy="${p.y}" r="${22 * s}" fill="none" stroke="var(--fg)" stroke-width="2.5"/>` : "") + shape +
        tx(lx, ly - (anc === "middle" ? (Math.sin(p.a) < 0 ? 8 : -6) * s : 0), p.t.symbol, { a: anc, cls: "t-m", w: 700, fs: sm ? 9.5 : 13 }) +
        (sm ? "" : tx(lx, ly + 14 - (anc === "middle" ? (Math.sin(p.a) < 0 ? 8 : -6) : 0), f2(p.t.overallScore), { a: anc, cls: "t-m t-mu", fs: 11 })) + `</g>`;
      if (o.flags) for (const f of o.flags.filter((x) => x.sym === p.t.symbol)) {
        const m = MM[f.mid], fx = p.x + (sm ? 13 : 20), fy = p.y - (sm ? 13 : 20);
        b += `<circle cx="${fx}" cy="${fy}" r="${sm ? 8 : 11}" fill="var(--${m.id})" stroke="var(--surface)" stroke-width="1.5"/>` + tx(fx, fy + (sm ? 3 : 4), m.short[0], { a: "middle", fs: sm ? 8.5 : 11, w: 700, fill: "#fff" });
      }
    }
    if (!sm) { b += tx(8, 20, "가운데에 가까울수록 연관 근거가 강하다 · 선 굵기 = 종합 점수 · 점을 누르면 근거가 열린다", { fs: 12, w: 600 }); b += tx(8, H - 10, `흐린 점 하나 = 연관 표적 50개 (나머지 ${n0(d.assoc - 8)}개는 점수가 더 낮다)`, { cls: "t-mu", fs: 11.5 }); }
    return svg(W, H, b, `${d.name}와 연관 표적의 관계망`);
  }

  /* ── 1.03 내 점수 — 4질환 32표적을 가중치로 다시 줄 세운 누적 막대 ── */
  function stackSVG(w, o = {}) {
    const rows = myRows(w), lim = o.all ? rows.length : Math.min(o.limit || 14, rows.length), W = 840, top = 34, rh = 30, H = top + lim * rh + 46, bx = 236, bw = 420;
    if (!w.some((x) => x > 0)) return svg(W, 90, tx(8, 44, "가중치를 하나 이상 올려 주세요.", { fs: 14, w: 600 }), "가중치 없음");
    let b = tx(8, 20, "내 순위", { cls: "t-mu", fs: 11.5 }) + tx(70, 20, "질환 · 표적", { cls: "t-mu", fs: 11.5 }) + tx(bx, 20, "내 점수 = 근거 × 가중치의 평균 (0 ~ 1)", { cls: "t-mu", fs: 11.5 }) + tx(bx + bw + 72, 20, "도킹", { cls: "t-mu", fs: 11.5 });
    for (const v of [0, 0.25, 0.5, 0.75, 1]) b += `<line x1="${bx + v * bw}" x2="${bx + v * bw}" y1="${top - 4}" y2="${top + lim * rh}" stroke="var(--line)" stroke-width="1"/>` + tx(bx + v * bw, top + lim * rh + 14, String(v), { a: "middle", cls: "t-m t-mu", fs: 11 });
    rows.slice(0, lim).forEach((r, i) => {
      const y = top + i * rh, tr = tierOf(r.t), rd = tr === "ready", sel = o.sel === r.t.symbol && (!o.selTid || o.selTid === r.d.tid);
      b += `<g class="hr" data-act="pick-t" data-sym="${r.t.symbol}" data-tid="${r.d.tid}" tabindex="0" role="button" aria-pressed="${sel}" aria-label="${r.t.symbol} ${esc(r.d.name)} 내 점수 ${f3(r.s)}">`;
      b += `<rect class="bg" x="0" y="${y}" width="${W}" height="${rh}" rx="7" fill="${rd ? "var(--hi)" : "transparent"}" fill-opacity="${rd ? 0.45 : 1}"/>`;
      b += `<rect class="fo" x="1" y="${y + 1}" width="${W - 2}" height="${rh - 2}" rx="7" fill="none" stroke="${sel ? "var(--fg)" : "transparent"}" stroke-width="2"/>`;
      b += tx(8, y + 20, `${i + 1}위`, { cls: "t-m", w: 600, fs: 12 }) + `<circle cx="78" cy="${y + 15}" r="5" fill="${r.d.color}"/>` + tx(88, y + 19, esc(r.d.short), { fs: 11.5, fill: "var(--muted)" }) + tx(158, y + 20, r.t.symbol, { cls: "t-m", w: 600, fs: 12.5 });
      let x = bx;
      r.seg.forEach((v, k) => { const ww = v * bw; if (ww > 0.2) b += `<rect x="${x.toFixed(1)}" y="${y + 6}" width="${ww.toFixed(1)}" height="18" fill="${EV[k].c}" stroke="var(--surface)" stroke-width="1"/>`; if (ww > 30) b += tx(x + ww / 2, y + 19, EV[k].t, { a: "middle", fs: 10.5, w: 600, fill: "var(--surface)" }); x += ww; });
      b += tx(bx + bw + 10, y + 20, f3(r.s), { cls: "t-m", fs: 12, w: 600 });
      b += `<line x1="${bx + r.t.overallScore * bw}" x2="${bx + r.t.overallScore * bw}" y1="${y + 3}" y2="${y + 27}" stroke="var(--fg)" stroke-width="2"/>`;
      b += rd ? `<path d="M${bx + bw + 78} ${y + 7} l8 8 l-8 8 l-8 -8 Z" fill="var(--good)" stroke="var(--fg)" stroke-width="1.5"/>` + tx(bx + bw + 92, y + 19, "준비됨", { fs: 11, w: 600, fill: "var(--good)" }) : tx(bx + bw + 78, y + 19, TIER[tr].g, { a: "middle", fs: 11, fill: `var(--${TIER[tr].k})` });
      b += `</g>`;
    });
    const rdRanks = rows.map((r, i) => (r.t.dockingTargetId ? `${r.t.symbol} ${i + 1}위` : null)).filter(Boolean);
    b += tx(8, H - 6, o.cap || `가중치를 바꾸면 순위가 바뀐다 · 하지만 ◆ 도킹 준비된 표적은 늘 4개 — ${rdRanks.join(" · ")}`, { fs: 12.5, w: 600 });
    return `<div class="sx">${svg(W, H, b, "가중치를 바꾼 내 표적 점수 누적 막대")}</div>`;
  }

  /* ── 1.09 점수 × 약물 근거 — 32표적 산점도(축 끊김). o.x 'my' 면 가로축이 내 점수(1.03) ── */
  function scatterSVG(o = {}) {
    const W = 800, H = o.compact ? 300 : 430, x0 = 70, x1 = 780, isMy = o.x === "my", w = o.w || [1, 1, 1, 1];
    const dom = isMy ? [0.2, 1] : [0.6, 0.92], sx = scale(dom, [x0, x1]);
    const yu = scale([0.94, 1], [o.compact ? 170 : 262, 40]), yl = scale([0, 0.9], [o.compact ? 262 : 380, o.compact ? 200 : 290]), brk = o.compact ? 180 : 270;
    const sy = (v) => (v >= 0.94 ? yu(v) : yl(v));
    let b = `<rect x="${x0}" y="${yu(1)}" width="${x1 - x0}" height="${yu(0.99) - yu(1)}" fill="var(--hi)" fill-opacity=".35"/>`;
    b += tx(x1, yu(1) - 8, "연두 띠 = 약물 근거 0.99 이상 · 이미 약이 있는 표적", { a: "end", fs: 11.5, w: 600 });
    for (const v of [0.94, 0.96, 0.98, 1]) b += `<line x1="${x0}" x2="${x1}" y1="${yu(v)}" y2="${yu(v)}" stroke="var(--line)" stroke-width="1"/>` + tx(x0 - 6, yu(v) + 4, v.toFixed(2), { a: "end", cls: "t-m t-mu", fs: 11 });
    for (const v of [0, 0.3, 0.6, 0.9]) b += `<line x1="${x0}" x2="${x1}" y1="${yl(v)}" y2="${yl(v)}" stroke="var(--line)" stroke-width="1"/>` + (v < 0.9 ? tx(x0 - 6, yl(v) + 4, v.toFixed(1), { a: "end", cls: "t-m t-mu", fs: 11 }) : "");
    b += `<rect x="${x0 - 4}" y="${brk}" width="${x1 - x0 + 8}" height="14" fill="var(--surface)"/><path d="M${x0 - 10} ${brk + 4} l8 -5 M${x0 - 10} ${brk + 12} l8 -5" stroke="var(--fg)" stroke-width="1.5" fill="none"/>`;
    b += tx(x0 + 6, brk + 11, "≈ 축 끊김: 위 칸은 0.94 ~ 1.00 을 크게 펼침", { cls: "t-mu", fs: 11 });
    const ticks = isMy ? [0.2, 0.4, 0.6, 0.8, 1] : [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9];
    for (const v of ticks) b += `<line x1="${sx(v)}" x2="${sx(v)}" y1="${yl(0)}" y2="${yl(0) + 5}" stroke="var(--fg)" stroke-width="1"/>` + tx(sx(v), yl(0) + 18, v.toFixed(2), { a: "middle", cls: "t-m t-mu", fs: 11 });
    b += `<line x1="${x0}" x2="${x1}" y1="${yl(0)}" y2="${yl(0)}" stroke="var(--fg)" stroke-width="1"/>`;
    b += tx((x0 + x1) / 2, H - 6, isMy ? `내 점수(가중치 ${w.join(" · ")}) →` : "종합 점수(Open Targets) →", { a: "middle", cls: "t-mu", fs: 11.5 }) + tx(12, 24, "약물 근거 ↑", { cls: "t-mu", fs: 11.5 });
    const pts = ALL.map(({ t, d }) => ({ t, d, x: sx(isMy ? my(t, w) : t.overallScore), y: sy(t.drugScore), rd: !!t.dockingTargetId })).sort((a, b2) => a.rd - b2.rd);
    const dimmed = (p) => o.filter && !o.filter(p);
    for (const p of pts) {
      const c = p.d.color, sel = o.sel === p.t.symbol && (!o.selTid || o.selTid === p.d.tid), dm = dimmed(p);
      const lab = `${p.t.symbol} · ${p.d.name} · ${isMy ? "내 점수 " + f3(my(p.t, w)) : "종합 " + f3(p.t.overallScore)} · 약물 ${f3(p.t.drugScore)}${p.rd ? " · 도킹 준비됨" : ""}`;
      const shape = p.rd ? `<path d="M${p.x} ${p.y - 8} L${p.x + 8} ${p.y} L${p.x} ${p.y + 8} L${p.x - 8} ${p.y} Z" fill="${c}" stroke="var(--fg)" stroke-width="2"/>` : `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" fill="${c}" fill-opacity=".75" stroke="var(--surface)" stroke-width="1"/>`;
      b += `<g class="nd${dm ? " dim" : ""}" data-act="pick-t" data-sym="${p.t.symbol}" data-tid="${p.d.tid}" data-lab="${esc(lab)}" tabindex="${p.rd ? 0 : -1}" role="button" aria-pressed="${sel}" aria-label="${esc(lab)}">${sel ? `<circle cx="${p.x}" cy="${p.y}" r="13" fill="none" stroke="var(--fg)" stroke-width="2.5"/>` : ""}${shape}<title>${esc(lab)}</title></g>`;
    }
    /* 도킹 준비된 4개 이름: 가까운 것끼리 한 상자로 ── */
    const rd = pts.filter((p) => p.rd).sort((a, b2) => a.x - b2.x), groups = [];
    for (const p of rd) { const g = groups[groups.length - 1]; if (g && p.x - g[g.length - 1].x < 46) g.push(p); else groups.push([p]); }
    for (const g of groups) {
      if (g.length === 1) { const p = g[0]; b += tx(p.x, p.y + 24, p.t.symbol, { a: "middle", cls: "t-m", w: 700, fs: 12 }); continue; }
      const bx = Math.min(x1 - g.length * 64 - 12, g[0].x + 18), by = yu(0.975);
      for (const p of g) b += `<line x1="${p.x + 6}" y1="${p.y + 4}" x2="${bx}" y2="${by - 12}" stroke="var(--fg)" stroke-width="1"/>`;
      b += `<rect x="${bx}" y="${by - 16}" width="${g.length * 64 + 12}" height="24" rx="6" fill="var(--bg)" stroke="var(--fg)" stroke-width="1"/>` + tx(bx + 8, by + 1, g.map((p) => p.t.symbol).join(" · "), { cls: "t-m", w: 700, fs: 12 });
      b += tx(bx + 8, by + 22, `${isMy ? "내 점수" : "종합"} ${g.map((p) => f2(isMy ? my(p.t, w) : p.t.overallScore)).join(" · ")}`, { cls: "t-mu", fs: 11 });
    }
    if (o.flags) for (const f of o.flags) { const p = pts.find((q) => q.t.symbol === f.sym && q.d.tid === f.tid); if (!p) continue; const m = MM[f.mid]; b += `<line x1="${p.x}" y1="${p.y - 8}" x2="${p.x}" y2="${p.y - 30}" stroke="var(--fg)" stroke-width="1"/><circle cx="${p.x}" cy="${p.y - 38}" r="11" fill="var(--${m.id})" stroke="var(--surface)" stroke-width="1.5"/>` + tx(p.x, p.y - 34, m.short[0], { a: "middle", fs: 11, w: 700, fill: "#fff" }); }
    return `<div class="sx">${svg(W, H, b, "표적 32개의 점수와 약물 근거 산점도")}</div>`;
  }

  /* ── 1.10 카드 — 앞면(점수 · 근거) · 뒷면(결정구조 · 기준 약 · 검증 · 도킹 가능) ── */
  function cardHTML(t, d, i, on, sel) {
    const tr = tierOf(t), T = TIER[tr], tg = d.tg;
    return `<button type="button" class="card${sel ? " sel" : ""}" data-act="flip" data-sym="${t.symbol}" data-tid="${d.tid}" aria-pressed="${on}" aria-label="${t.symbol} 카드 ${on ? "앞면 보기" : "뒤집기"}"><span class="in">
      <span class="f"><span class="rk">점수 ${i + 1}위</span><span class="g">${esc(t.symbol)}</span><span class="ko">${esc(KO[t.symbol] || "")}</span><span class="sc">${f3(t.overallScore)}</span>
        <span class="mini">${EV.map((e) => `<span>${e.t}</span><i><b style="width:${(t[e.k] * 100).toFixed(0)}%;background:${e.c}"></b></i>`).join("")}</span><span class="hint">눌러서 뒤집기 ↻</span></span>
      <span class="b ${tr === "ready" ? "ok" : tr === "pdb" ? "mid" : ""}"><span class="g">${esc(t.symbol)}</span>
        <dl><dt>결정구조</dt><dd>${esc(t.pdbId || "없음")}</dd><dt>약 주머니</dt><dd>${t.smPocket ? "있음" : "없음"}</dd><dt>기준 약</dt><dd>${tr === "ready" ? esc(tg.ref) : "없음"}</dd><dt>검증</dt><dd>${tr === "ready" ? `RMSD ${tg.rmsd} Å` : "—"}</dd></dl>
        <span class="res" style="color:var(--${T.k})">${T.g} ${tr === "ready" ? "도킹 가능 · 다음 단계로" : "도킹 불가 · 여기서 멈춤"}</span></span></span></button>`;
  }
  function backFace(t, d, o = {}) {
    const tr = tierOf(t), T = TIER[tr], tg = d.tg;
    return `<div class="face ${tr === "ready" ? "ok" : tr === "pdb" ? "mid" : "no"}"><span class="lab-u">${o.title || "카드 뒷면 · 구조 확인"}</span><span class="g">${esc(t.symbol)}</span>
      <dl class="kv"><dt>결정구조</dt><dd>${esc(t.pdbId || "없음")}</dd><dt>약 주머니</dt><dd>${t.smPocket ? "있음" : "없음"}</dd><dt>기준 약</dt><dd>${tr === "ready" ? `${esc(tg.ref)} (${tg.lig})` : "없음"}</dd><dt>재도킹 검증</dt><dd>${tr === "ready" ? `RMSD ${tg.rmsd} Å ≤ 2 Å` : "—"}</dd><dt>기준 결합력</dt><dd>${tr === "ready" ? `${f2(tg.refKcal)} kcal/mol` : "—"}</dd></dl>
      ${tr === "ready" && o.mol ? mol(tg.refSmiles, 220, 110) : ""}
      <b style="color:var(--${T.k})">${T.g} ${tr === "ready" ? "도킹 가능 · 2.1 로 갈 수 있어요" : tr === "pdb" ? "구조는 있지만 기준 약 · 검증이 없어요" : "결정구조가 없어 주머니 모양을 몰라요"}</b></div>`;
  }
  function frontFace(t, d) {
    return `<div class="face"><span class="lab-u">카드 앞면 · 근거</span><span class="g">${esc(t.symbol)}</span><span class="note">${esc(KO[t.symbol] || "")} · ${esc(d.name)}</span>
      <div class="row"><span class="chip">종합 ${f3(t.overallScore)}</span><span class="chip">${rank(d, t)}위 / 8</span></div>${evBars(t)}</div>`;
  }

  window.__TS = { D, $, esc, f2, f3, pad, n0, josa, reduced, MEMBERS, MM, QUORUM, TG, GROUPS, KO, EV, DIS, DLIST, ALL, tierOf, TIER, rank, readyOf, findT, my, myRows, REASONS, RR,
    get S() { return S; }, set S(v) { S = v; }, fresh, save, me, curD, curT, tick, later, clearTimers, tx, svg, chipSVG, evBars, mol, drawMols, heatSVG, netSVG, stackSVG, scatterSVG, cardHTML, backFace, frontFace, SEEDW, SEEDFLIP, KEY };
})();

/* ══════════ 공통 UI 부품 — 질환 타일 · 추천 서랍 · 모둠 공유판 ══════════ */
(function () {
  "use strict";
  const X = window.__TS, { esc, f2, f3, n0, josa, MEMBERS, MM, QUORUM, GROUPS, KO, EV, DIS, DLIST, tierOf, TIER, rank, readyOf, findT, my, myRows, REASONS, RR, me, curD, curT, evBars, netSVG, scatterSVG, backFace, SEEDW, SEEDFLIP } = X;
  const S = () => X.S;
  const av = (id, cls = "") => `<span class="av ${cls}" data-m="${id}" title="${esc(MM[id].name)} ${MM[id].role}">${esc(MM[id].short[0])}</span>`;
  const who = (id) => `<span class="who">${av(id)}<span>${esc(MM[id].short)}</span><small>${MM[id].role}</small></span>`;
  const ih = (lab, title, note) => `<div class="ih"><span class="lab-u">${lab}</span><h3>${title}</h3>${note ? `<span class="note">${note}</span>` : ""}</div>`;

  /* 질환 타일 — 질환군 4 × 3. 데이터 있는 4종만 눌린다 */
  function diseaseTiles(o = {}) {
    return `<div class="grp4">${GROUPS.map((g, gi) => {
      const owner = MEMBERS.find((m) => m.grp === gi), mine = owner && owner.id === me();
      return `<div class="grp"><div class="grp-h"><b>${g.n}</b>${esc(g.t)}${o.owner !== false ? ` ${av(owner.id, "sm")}` : ""}</div>
        ${g.ds.map((c) => c.d ? `<button type="button" class="tile" data-act="pick-d" data-tid="${c.d.tid}" aria-pressed="${S().tid === c.d.tid}">
            <span class="nm"><i style="background:${c.d.color}"></i>${esc(c.d.name)}${c.d.taken ? `<span class="tk">${esc(c.d.taken)} 선점</span>` : ""}</span>
            <small>연관 표적 ${n0(c.d.assoc)} · 도킹 ${c.d.tg.gene} · ${c.d.tg.cns ? "뇌까지" : "뇌 밖"}</small>${o.blurb ? `<span class="note" style="font-size:11.5px">${esc(c.d.blurb)}</span>` : ""}</button>`
          : `<button type="button" class="tile off" disabled title="crista bio-worker 에 표적 데이터를 넣으면 열려요"><span class="nm">${esc(c.name)}</span><small>${c.gene} · ${c.pdb} · 데이터 준비 중</small></button>`).join("")}</div>`;
    }).join("")}</div>`;
  }
  const diseaseChips = (o = {}) => `<div class="dchips">${DLIST.map((d) => `<button type="button" class="dchip" data-act="pick-d" data-tid="${d.tid}" aria-pressed="${S().tid === d.tid}"><i style="background:${d.color}"></i>${esc(d.name)}${d.taken ? ` <span class="chip" style="font-size:9.5px;padding:0 5px">선점</span>` : ""}</button>`).join("")}${o.more !== false ? `<button type="button" class="dchip off" disabled title="§6.1.1 나머지 8질환 — 데이터 준비 중">+ 8질환 준비 중</button>` : ""}</div>`;

  /* 추천 근거 서랍 — 표적 하나를 고른 뒤 근거를 골라 모둠에 올린다 */
  function recForm(t, d) {
    const st = S(), tr = tierOf(t), ready = tr === "ready", sel = st.rs.reasons, mine = st.picks[me()];
    const checks = sel.map((id) => ({ id, r: RR[id].check(t, d) }));
    const blocked = checks.filter((c) => c.r && c.r.k === "bad");
    const can = ready && sel.length > 0 && !blocked.length;
    const why = !ready ? `${t.symbol} 는 ${TIER[tr].t} — 2.1 도킹으로 갈 수 없어요. 이 질환에서 도킹 준비된 표적은 <b>${readyOf(d).symbol}</b> 하나예요.` : !sel.length ? "근거를 하나 이상 고르세요." : blocked.length ? "✗ 표시된 근거는 데이터와 맞지 않아요. 빼거나 바꾸세요." : "";
    return `<div class="rec"><span class="lab-u">추천 근거 — 하나 이상 고르세요(코치가 데이터와 맞는지 짚어요)</span>
      <div class="rchips">${REASONS.map((r) => { const on = sel.includes(r.id), c = on ? r.check(t, d) : null;
        return `<button type="button" class="rchip" data-act="reason" data-r="${r.id}" aria-pressed="${on}"><span class="bx">${on ? "✓" : ""}</span><span>${esc(r.t)}</span>${on ? `<span class="co ${c ? c.k : "good"}">${c ? (c.k === "bad" ? "✗ " : "△ ") + esc(c.m) : "✓ 데이터와 맞아요"}</span>` : ""}</button>`; }).join("")}</div>
      <label style="display:grid;gap:4px;font-size:12.5px;font-weight:600">한 줄 이유(모둠원이 읽어요)<input type="text" id="rec-note" value="${esc(st.rs.note)}" placeholder="예: 점수는 낮지만 도네페질이 있어 2.1 에서 바로 견줄 수 있어요" maxlength="90"></label>
      <div class="row"><button type="button" class="btn pri" data-act="post" ${can ? "" : "disabled"}>${mine ? "다시 올리기" : "모둠에 올리기"} → ${esc(d.name)} · ${t.symbol}</button>
        ${!ready ? `<button type="button" class="btn sm" data-act="goto-ready">${readyOf(d).symbol} 보러 가기</button>` : ""}<span class="note">${why || (mine ? `지금 내 카드는 ${mine.sym} — 다시 올리면 바뀌어요` : "올리면 모둠 공유에 카드가 바로 보여요")}</span></div></div>`;
  }
  /* 표적 정보판 + 추천 서랍 */
  function infoPanel(t, d, o = {}) {
    if (!t) return `<div class="empty">${o.empty || "표적을 누르면 근거와 구조 준비 상태가 여기 열려요."}</div>`;
    const tr = tierOf(t), T = TIER[tr];
    return `<div class="pan info"><h4><span class="mono">${esc(t.symbol)}</span><span style="font-weight:500">${esc(KO[t.symbol] || t.name)}</span><span class="chip"><i class="sw" style="background:${d.color}"></i>${esc(d.name)}</span><span class="chip">종합 ${f3(t.overallScore)} · ${rank(d, t)}위</span><span class="sig ${T.k}">${T.g} ${T.t}${t.pdbId ? " · PDB " + esc(t.pdbId) : ""}</span></h4>
      ${evBars(t)}${o.back ? `<div class="cardbig">${backFace(t, d, { mol: true })}</div>` : ""}${o.noForm ? "" : recForm(t, d)}</div>`;
  }

  /* ── 모둠 공유판 ── */
  const winner = () => { const cnt = {}; Object.values(S().votes).forEach((v) => (cnt[v] = (cnt[v] || 0) + 1)); const [id, n] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0] || []; return id && n >= QUORUM ? { id, n } : null; };
  const votesFor = (id) => Object.entries(S().votes).filter(([, v]) => v === id).map(([k]) => k);
  function pickCard(mid, o = {}) {
    const st = S(), p = st.picks[mid], m = MM[mid];
    if (!p) { const g = GROUPS[m.grp]; return `<div class="empty">${mid === me() ? "아직 내 카드가 없어요 — 왼쪽에서 표적을 고르고 근거를 골라 올리세요." : `${esc(m.short)} ${m.role} 는 ${g.n} ${esc(g.t)}${josa(g.t, "을", "를")} 보는 중…`}</div>`; }
    const d = DIS[p.tid], t = findT(p.tid, p.sym), tr = tierOf(t), T = TIER[tr], vs = votesFor(mid), w = winner(), isWin = w && w.id === mid, myVote = st.votes[me()] === mid, conf = st.confirmed && st.confirmed.by === mid;
    return `<div class="pick${mid === me() ? " mine" : ""}${isWin ? " win" : ""}"><div class="t"><b>${esc(p.sym)}</b><span>${esc(KO[p.sym] || "")}</span><span class="chip"><i class="sw" style="background:${d.color}"></i>${esc(d.name)}</span><span class="chip">종합 ${f3(t.overallScore)} · ${rank(d, t)}위</span><span class="sig ${T.k}">${T.g} ${T.t}</span></div>
      ${o.compact ? "" : `<ul>${p.reasons.map((id) => { const c = RR[id].check(t, d); return `<li>${esc(RR[id].t)}${c ? ` <span class="sig ${c.k}" style="font-size:10.5px;padding:0 6px">${c.k === "bad" ? "✗" : "△"} ${esc(c.m)}</span>` : ""}</li>`; }).join("")}</ul>${p.note ? `<span class="q">“${esc(p.note)}”</span>` : ""}`}
      <div class="vt2"><span class="avs">${vs.map((v) => av(v, "sm")).join("")}</span><span class="note">찬성 ${vs.length} / ${MEMBERS.length}${isWin ? " · 정족수 채움" : ""}</span>
        ${conf ? `<span class="stamp">확정</span>` : st.confirmed ? "" : myVote ? `<span class="chip on">내 찬성</span>` : `<button type="button" class="btn sm" data-act="vote" data-for="${mid}">찬성</button>`}
        ${mid === me() && !st.confirmed ? `<button type="button" class="btn sm" data-act="withdraw">내리기</button>` : ""}</div></div>`;
  }
  function confirmBox() {
    const st = S(), w = winner();
    if (st.confirmed) { const d = DIS[st.confirmed.tid]; return `<div class="pan good"><div class="row"><span class="stamp">표적 확정</span><b class="mono" style="font-size:16px">${esc(st.confirmed.sym)}</b><span>${esc(d.name)} · PDB ${d.pdb} · 기준 약 ${esc(d.tg.ref)}</span></div>
      <span class="note">programs.target_id 에 ${st.confirmed.tid} 가 들어가요. 1.2 · 2.1 은 이 표적으로 고정되고, 바꾸려면 1.1 로 돌아와요.</span>
      <div class="row">${st.done ? `<span class="sig good">✓ 1.2 화합물 스크리닝으로 보냈어요</span>` : `<button type="button" class="btn lime" data-act="hand">1.2 화합물 스크리닝으로 보내기 →</button>`}<button type="button" class="btn sm" data-act="unconfirm">확정 풀기</button></div></div>`; }
    if (w) { const p = st.picks[w.id]; return `<div class="pan good"><div class="row"><b>${esc(p.sym)} · ${esc(DIS[p.tid].name)}</b><span class="note">찬성 ${w.n} / ${MEMBERS.length} — 정족수 ${QUORUM}명을 채웠어요</span><button type="button" class="btn pri" data-act="confirm" data-for="${w.id}">모둠 표적으로 확정</button></div></div>`; }
    return `<div class="pan tight"><span class="note">정족수 = 과반 ${QUORUM} / ${MEMBERS.length}명. 한 사람 1표. 찬성이 모이면 [모둠 표적으로 확정] 단추가 열려요.</span></div>`;
  }
  const logList = () => `<div class="pan tight"><span class="lab-u">회의 기록</span><ul class="log">${S().log.slice(-5).map((l) => `<li>${av(l.who, "sm")}<span>${esc(l.t)}</span><time>${l.at}</time></li>`).join("")}</ul></div>`;
  const boardNote = () => `<span class="note">전광판 참고: <b>다온테라퓨틱스</b>가 알츠하이머 → ACHE 를 먼저 골랐어요. 같은 표적도 고를 수 있지만 특허 경쟁(3.1)이 생겨요.</span>`;
  function lanes(o = {}) {
    return `<div class="lanes">${MEMBERS.map((m) => `<div class="lane"><div class="lane-h">${who(m.id)}<small>${GROUPS[m.grp].n} ${esc(GROUPS[m.grp].t)}</small>${m.id === me() ? `<small class="chip on" style="justify-self:start">나</small>` : ""}</div>${pickCard(m.id, o)}</div>`).join("")}</div>`;
  }
  function teamBoard(widget, o = {}) {
    return `${ih("모둠 공유 · 실시간", o.title || "추천 카드 · 표적 확정", o.note || `모둠원이 1인 1질환군을 맡아 올린 카드를 견주고, 과반 찬성으로 모둠의 표적 하나를 정해요.`)}${widget || ""}${o.lanes === false ? "" : lanes({ compact: !!widget && o.compact !== false })}${confirmBox()}${logList()}${boardNote()}`;
  }

  /* 모드별 위 부품 */
  const flags = () => Object.entries(S().picks).map(([mid, p]) => ({ mid, sym: p.sym, tid: p.tid }));
  const wNets = () => `<div class="nets4">${DLIST.map((d) => `<div class="pan"><span class="lab-u"><i class="sw" style="background:${d.color}"></i>${esc(d.name)}</span>${netSVG(d, { size: "sm", flags: flags(), sel: S().tid === d.tid ? S().sym : null })}</div>`).join("")}<span class="note" style="grid-column:1/-1">깃발 = 모둠원이 올린 표적 · ✓ 네모 = 도킹 준비됨 · 점을 누르면 왼쪽에서 그 표적이 열려요</span></div>`;
  const wScatter = () => `<div class="pan">${scatterSVG({ compact: true, flags: flags(), sel: S().sym, selTid: S().tid })}<span class="note">깃발 = 모둠원이 올린 표적. 네 깃발 모두 연두 띠(약물 근거 0.99+)의 ◆ 위에 있나요?</span></div>`;
  function wWeights() {
    const st = S();
    const rows = MEMBERS.map((m) => { const w = m.id === me() ? st.w : SEEDW[m.id] || [1, 1, 1, 1]; const top = myRows(w)[0]; const p = st.picks[m.id]; return { m, w, top, p }; });
    return `<div class="pan tight tbl-w"><span class="lab-u">모둠원마다 다른 가중치 · 다른 1위</span><table class="tbl"><thead><tr><th>모둠원</th>${EV.map((e) => `<th><i class="sw" style="background:${e.c}"></i>${e.t}</th>`).join("")}<th>내 점수 1위</th><th>올린 카드</th></tr></thead>
      <tbody>${rows.map(({ m, w, top, p }) => `<tr><td>${who(m.id)}</td>${w.map((x) => `<td class="n">× ${x}</td>`).join("")}<td class="n">${top.t.symbol} <span class="muted">${esc(top.d.short)} ${f3(top.s)}${top.t.dockingTargetId ? " ◆" : ""}</span></td><td class="n">${p ? `${p.sym}${findT(p.tid, p.sym).dockingTargetId ? " ◆" : ""}` : "—"}</td></tr>`).join("")}</tbody></table>
      <span class="note">같은 데이터인데 1위가 다르다. 점수는 '판단'이고 ◆(결정구조 준비)는 '사실'이라 올린 카드는 모두 ◆ 쪽으로 모인다.</span></div>`;
  }
  function wFlips() {
    const st = S();
    return `<div class="pan tight"><span class="lab-u">뒤집기 진행</span><div class="lanes">${MEMBERS.map((m) => { const p = st.picks[m.id]; let n, tid;
      if (m.id === me()) { tid = st.tid; n = Object.keys(st.flipped[tid] || {}).length; } else { const e = Object.entries(SEEDFLIP[m.id] || {})[0]; tid = e ? e[0] : null; n = e ? e[1] : 0; }
      const d = tid ? DIS[tid] : null;
      return `<div class="row" style="gap:10px">${who(m.id)}<span class="note">${d ? `${esc(d.name)} 카드 ${n} / 8 뒤집음` : "아직"}${p ? ` · 찾은 표적 <b>${p.sym}</b>` : n >= 8 ? " · 아직 못 찾음" : ""}</span></div>`; }).join("")}</div></div>`;
  }
  function wCompare() {
    const st = S(), ps = MEMBERS.filter((m) => st.picks[m.id]).map((m) => ({ m, p: st.picks[m.id], t: findT(st.picks[m.id].tid, st.picks[m.id].sym), d: DIS[st.picks[m.id].tid] }));
    if (!ps.length) return `<div class="empty">올린 카드가 생기면 한 표에서 나란히 견줘요.</div>`;
    const row = (k, f) => `<tr><th>${k}</th>${ps.map((x) => `<td class="n">${f(x)}</td>`).join("")}</tr>`;
    return `<div class="pan tight tbl-w"><span class="lab-u">올린 카드 나란히</span><table class="tbl"><thead><tr><th></th>${ps.map((x) => `<th>${who(x.m.id)}</th>`).join("")}</tr></thead><tbody>
      ${row("질환", (x) => esc(x.d.name))}${row("표적", (x) => `<b>${x.t.symbol}</b> <span class="muted">${esc(KO[x.t.symbol] || "")}</span>`)}${row("종합 점수", (x) => `${f3(x.t.overallScore)} · ${rank(x.d, x.t)}위`)}
      ${EV.map((e) => row(e.t, (x) => `<span style="display:inline-block;width:${(x.t[e.k] * 60).toFixed(0)}px;height:8px;border-radius:4px;background:${e.c};vertical-align:middle"></span> ${f2(x.t[e.k])}`)).join("")}
      ${row("결정구조", (x) => x.t.pdbId || "없음")}${row("기준 약", (x) => (x.t.dockingTargetId ? esc(x.d.tg.ref) : "없음"))}${row("도킹", (x) => `<span class="sig ${TIER[tierOf(x.t)].k}">${TIER[tierOf(x.t)].g} ${TIER[tierOf(x.t)].t}</span>`)}
      ${row("찬성", (x) => votesFor(x.m.id).length)}</tbody></table></div>`;
  }
  function wGroups() {
    const st = S();
    return `<div class="quad">${GROUPS.map((g, gi) => { const m = MEMBERS.find((x) => x.grp === gi); return `<div class="pan tight"><div class="grp-h"><b>${g.n}</b>${esc(g.t)} ${av(m.id, "sm")}<span class="muted" style="font-weight:400;font-size:11px">${esc(m.short)} ${m.role}</span></div>${pickCard(m.id, { compact: true })}</div>`; }).join("")}</div>`;
  }

  Object.assign(X, { av, who, ih, diseaseTiles, diseaseChips, recForm, infoPanel, winner, votesFor, pickCard, confirmBox, logList, lanes, teamBoard, wNets, wScatter, wWeights, wFlips, wCompare, wGroups, flags });
})();

/* ══════════ 시안 10종 · 그리기 · 이벤트 ══════════ */
(function () {
  "use strict";
  const X = window.__TS, { $, esc, f2, f3, pad, n0, josa, MEMBERS, MM, QUORUM, GROUPS, KO, EV, DIS, DLIST, tierOf, TIER, rank, readyOf, findT, my, me, curD, curT, tick, later, clearTimers, drawMols,
    heatSVG, netSVG, stackSVG, scatterSVG, cardHTML, backFace, frontFace, av, who, ih, diseaseTiles, diseaseChips, recForm, infoPanel, teamBoard, wNets, wScatter, wWeights, wFlips, wCompare, wGroups } = X;
  const S = () => X.S;
  const LEG = `<div class="row"><span class="sig good">✓ 도킹 준비됨 — 결정구조 + 기준 약 + 검증</span><span class="sig warn">△ 구조만 있음</span><span class="sig bad">✗ 구조 없음</span></div>`;
  const EVLEG = `<div class="row">${EV.map((e) => `<span class="chip"><i class="sw" style="background:${e.c}"></i>${e.t} · ${e.d}</span>`).join("")}</div>`;
  const DLEG = `<div class="row">${DLIST.map((d) => `<span class="chip"><i class="sw" style="background:${d.color}"></i>${esc(d.name)}</span>`).join("")}<span class="chip">◆ 도킹 준비됨 · ● 그 밖</span></div>`;
  const sliders = () => `<div class="ctl">${EV.map((e, k) => `<label for="w${k}"><span><i class="sw" style="background:${e.c}"></i>${e.t} 가중치 <output data-out="${k}">× ${S().w[k]}</output></span><input class="rng" type="range" id="w${k}" min="0" max="3" step="0.5" value="${S().w[k]}"></label>`).join("")}</div>
    <div class="row"><span class="lab-u">빠른 설정</span><button type="button" class="btn sm" data-act="pre" data-pre="1,1,1,1">똑같이</button><button type="button" class="btn sm" data-act="pre" data-pre="3,0,0,0">유전만</button><button type="button" class="btn sm" data-act="pre" data-pre="0,3,3,0">약물 · 문헌만</button><button type="button" class="btn sm" data-act="pre" data-pre="0,3,0,3">약물 · 발현</button></div>`;
  const MINE = (t, n) => ih("내 작업대 · 나만 보임 · 무료", t, n);
  const myGrp = () => GROUPS[MM[me()].grp];

  const V = [
    { no: 1, name: "질환 지도 → 열지도", kind: "타일 · 열지도 · 추천 서랍", tools: ["1.01", "1.10"],
      idea: "질환군 4칸 × 3질환 타일에서 질환을 고르면 그 질환의 표적 8개가 근거 열지도(1.01)로 펼쳐진다. 줄을 누르면 추천 서랍이 열린다.",
      learn: "종합 점수는 근거 4종을 합친 값이고, 근거가 강해도 결정구조 · 도킹 준비(연두 줄)가 없으면 2.1 로 못 간다.",
      mine: () => { const d = curD(), t = curT(), g = myGrp();
        return `${MINE("① 질환 → ② 표적 → ③ 추천", `내 담당은 ${g.n} ${esc(g.t)} 이지만 다른 질환군도 볼 수 있어요.`)}
          <div class="pan"><span class="lab-u">① 질환 고르기 — 질환군 4 × 3</span>${diseaseTiles({ blurb: true })}</div>
          <div class="pan"><span class="lab-u">② 표적 고르기 — ${esc(d.name)} 근거 열지도</span>${heatSVG(d, { sel: S().sym })}${LEG}<span class="note">줄을 누르면 ③ 이 열려요. 연두 줄 = 2.1 도킹으로 갈 수 있는 표적.</span></div>
          <div><span class="lab-u">③ 추천 서랍</span>${infoPanel(t, d)}</div>`; } },
    { no: 2, name: "망 둘러보기", kind: "관계망 · 거리 눈금 · 정보판", tools: ["1.04", "1.01"],
      idea: "질환을 가운데 둔 관계망(1.04)에서 점을 눌러 표적을 고른다. 가까울수록 점수가 높고, ✓ 네모가 도킹 준비된 표적이다.",
      learn: "한 질환에 1만 개가 넘는 연관 유전자가 있고, 가장 가까운(점수 높은) 표적이 아니라 ✓ 표적만 다음 단계로 간다.",
      mine: () => { const d = curD(), t = curT();
        return `${MINE("망에서 표적 고르기", "질환 칩을 바꾸면 망이 다시 그려져요.")}
          <div class="pan tight">${diseaseChips()}<span class="note">${esc(d.blurb)} · 연관 표적 ${n0(d.assoc)}개 중 상위 8만 그려요.</span></div>
          <div class="pan">${netSVG(d, { sel: S().sym })}${LEG}</div>${infoPanel(t, d)}`; },
      team: () => teamBoard(wNets(), { title: "모둠원 깃발 · 표적 확정" }) },
    { no: 3, name: "내 기준으로 줄 세우기", kind: "가중치 · 누적 막대 · 32표적", tools: ["1.03", "1.09"],
      idea: "근거 4종에 가중치를 주면(1.03) 4질환 32표적이 '내 점수'로 다시 줄 선다. 1위부터 눌러 추천한다. 질환은 따로 고르지 않아도 표적이 질환을 정한다.",
      learn: "가중치를 바꾸면 순위는 얼마든지 바뀌지만 ◆ 도킹 준비된 표적은 늘 4개 — 점수는 판단, 구조는 사실.",
      plot: () => stackSVG(S().w, { sel: S().sym, selTid: S().tid, all: S().all }),
      mine: () => { const d = curD(), t = curT();
        return `${MINE("내 기준으로 32개 줄 세우기", "근거마다 '얼마나 중요하게 볼지'를 정하면 내 점수가 생겨요.")}
          <div class="pan">${sliders()}</div>
          <div class="pan"><div data-plot>${V[2].plot()}</div><div class="row">${EVLEG}<button type="button" class="btn sm" data-act="all" aria-pressed="${!!S().all}">${S().all ? "상위 14만" : "32개 모두 보기"}</button></div><span class="note">검은 세로선 = Open Targets 종합 점수. 줄을 누르면 추천 서랍이 열려요.</span></div>
          ${infoPanel(t, d)}`; },
      team: () => teamBoard(wWeights(), { title: "모둠원 가중치 · 표적 확정" }) },
    { no: 4, name: "32개 한눈에", kind: "산점도 · 필터 · 축 끊김", tools: ["1.09", "1.01", "1.10"],
      idea: "4질환 32표적을 종합 점수 × 약물 근거 산점도(1.09)에 한 번에 찍고, 필터와 클릭으로 고른다. 고른 점은 근거 막대(1.01)와 카드 뒷면(1.10)으로 열린다.",
      learn: "도킹 준비된 ◆ 4개는 모두 '이미 약이 있는'(약물 근거 0.99+) 표적 — 기준 약이 있어야 후보를 견줄 수 있다.",
      mine: () => { const d = curD(), t = curT(), F = S().filt;
        const filter = (p) => F.g[p.d.g ? GROUPS.indexOf(p.d.g) : 0] && (!F.ready || p.rd) && (!F.gen || p.t.geneticScore >= 0.9);
        return `${MINE("32개 표적 한눈에 — 점수 × 약물 근거", "필터로 흐리게, 점을 눌러 고르기.")}
          <div class="pan tight"><div class="row">${GROUPS.map((g, i) => `<button type="button" class="btn sm" data-act="filt" data-f="g${i}" aria-pressed="${F.g[i]}">${g.n} ${esc(g.t)}</button>`).join("")}<span class="chip" style="border:0">|</span><button type="button" class="btn sm" data-act="filt" data-f="ready" aria-pressed="${F.ready}">◆ 도킹 준비됨만</button><button type="button" class="btn sm" data-act="filt" data-f="gen" aria-pressed="${F.gen}">유전 근거 0.9 이상</button></div></div>
          <div class="pan">${scatterSVG({ sel: S().sym, selTid: S().tid, filter })}${DLEG}<p class="note" data-pinfo>점을 가리키면 이름이 나와요. ◆ 4개는 모두 연두 띠 안에 있어요.</p></div>
          ${infoPanel(t, d, { back: true })}`; },
      team: () => teamBoard(wScatter(), { title: "모둠 깃발 · 표적 확정" }) },
    { no: 5, name: "카드 뒤집기", kind: "카드 · 맞히기 놀이", tools: ["1.10", "1.01"],
      idea: "앞면엔 점수와 근거만 보이는 카드 8장(1.10)을 뒤집어 결정구조 · 기준 약 · 도킹 가능 여부를 확인하고, ✓ 카드에서 바로 추천한다.",
      learn: "점수 높은 카드부터 뒤집어도 계속 '도킹 불가'가 나오다 마지막에야 '가능'이 나온다 — 점수와 구조는 다른 이야기다.",
      mine: () => { const d = curD(), t = curT(), fl = S().flipped[d.tid] || {}, n = Object.keys(fl).length, rd = readyOf(d), found = !!fl[rd.symbol];
        return `${MINE("카드 뒤집기 — 점수만 보고 고른 뒤 확인", "어느 카드가 2.1 도킹으로 갈 수 있을까요?")}
          <div class="pan tight">${diseaseChips()}</div>
          <div class="row"><span class="note" style="flex:1 1 240px">앞면은 점수와 근거뿐이에요. 점수만 보고 하나 찍은 뒤 뒤집어 확인해 보세요.</span><button type="button" class="btn sm" data-act="flip-all" aria-pressed="${n === 8}">${n === 8 ? "모두 앞면으로" : "모두 뒤집기"}</button></div>
          <div class="cards">${d.ts.map((x, i) => cardHTML(x, d, i, !!fl[x.symbol], S().sym === x.symbol)).join("")}</div>
          <p class="note" aria-live="polite">뒤집은 카드 ${n} / 8${found ? ` · 찾았다 — 점수 ${rank(d, rd)}위 ${rd.symbol} 만 다음 단계로 갈 수 있어요.` : n ? " · 아직 도킹할 수 있는 표적이 안 나왔어요." : ""}</p>
          ${found && S().sym !== rd.symbol ? `<div class="row"><button type="button" class="btn pri" data-act="pick-t" data-sym="${rd.symbol}" data-tid="${d.tid}">${rd.symbol} 추천 서랍 열기</button></div>` : ""}
          ${t ? infoPanel(t, d) : ""}`; },
      team: () => teamBoard(wFlips(), { title: "뒤집기 진행 · 표적 확정" }) },
    { no: 6, name: "세 걸음 마법사", kind: "걸음 띠 · 열지도 + 가중치 · 카드 뒷면", tools: ["1.01", "1.03", "1.10"],
      idea: "① 질환 → ② 근거(열지도 1.01 위에 가중치 1.03 을 얹어 내 점수로 줄 세움) → ③ 구조 확인(카드 뒷면 1.10 · 기준 약 구조식) 순서로 안내한다.",
      learn: "질환 → 근거 → 구조의 순서가 곧 표적을 고르는 논리다. 구조 확인을 거쳐야 추천 단추가 열린다.",
      plot: () => heatSVG(curD(), { w: S().w, sel: S().sym }),
      mine: () => { const d = curD(), t = curT(), st = S().step;
        const strip = `<div class="steps">${[["① 질환", "질환군 4 × 3 에서 하나"], ["② 근거 · 가중치", "열지도에 내 가중치"], ["③ 구조 확인 · 추천", "카드 뒷면 · 기준 약"]].map(([a, b], i) => `<button type="button" class="step${st > i + 1 ? " done" : ""}" data-act="step" data-s="${i + 1}" ${st === i + 1 ? 'aria-current="step"' : ""} ${i + 1 === 3 && !S().sym ? "disabled" : ""}><span>${st > i + 1 ? "✓ 끝" : `걸음 ${i + 1}`}</span><b>${a}</b><span class="note" style="font-size:11px">${b}</span></button>`).join("")}</div>`;
        let body = "";
        if (st === 1) body = `<div class="pan"><span class="lab-u">① 어떤 병을 고칠까</span>${diseaseTiles({ blurb: true })}</div><div class="row"><button type="button" class="btn pri" data-act="step" data-s="2">다음 — ${esc(d.name)} 근거 보기 →</button></div>`;
        else if (st === 2) body = `<div class="pan"><span class="lab-u">② 근거에 내 가중치 주기</span>${sliders()}</div><div class="pan"><div data-plot>${V[5].plot()}</div>${LEG}<span class="note">종합 막대가 '내 점수'로 바뀌고 줄이 다시 선다. 줄을 눌러 표적을 고르세요.</span></div>
          <div class="row"><button type="button" class="btn sm" data-act="step" data-s="1">← 질환</button><button type="button" class="btn pri" data-act="step" data-s="3" ${S().sym ? "" : "disabled"}>다음 — ${S().sym ? S().sym + " 구조 확인" : "표적을 고르세요"} →</button></div>`;
        else body = `<div class="pan"><span class="lab-u">③ 구조가 있나 · 기준 약이 있나</span><div class="cardbig">${frontFace(t, d)}${backFace(t, d, { mol: true })}</div></div><div class="pan">${recForm(t, d)}</div><div class="row"><button type="button" class="btn sm" data-act="step" data-s="2">← 근거</button></div>`;
        return `${MINE("세 걸음으로 표적 고르기", "걸음마다 하나씩만 정해요.")}${strip}${body}`; } },
    { no: 7, name: "둘 나란히 견주기", kind: "열지도 담기 · 카드 앞뒤 나란히", tools: ["1.01", "1.10"],
      idea: "열지도(1.01)에서 표적 2개를 담으면 카드 앞 · 뒷면(1.10)이 나란히 펼쳐진다. 질환이 달라도 견줄 수 있다.",
      learn: "점수 1위 APP 와 꼴찌 ACHE 를 나란히 놓으면, 다음 단계로 갈 수 있는 쪽이 어디인지 한눈에 보인다.",
      mine: () => { const d = curD(), t = curT(), cmp = S().cmp;
        const cols = cmp.map((c) => { const dd = DIS[c.tid], tt = findT(c.tid, c.sym), rd = tierOf(tt) === "ready";
          return `<div class="pan"><div class="row"><span class="chip"><i class="sw" style="background:${dd.color}"></i>${esc(dd.name)}</span><span class="chip">${rank(dd, tt)}위 / 8</span><button type="button" class="btn sm" data-act="cmp" data-sym="${c.sym}" data-tid="${c.tid}" style="margin-left:auto">빼기</button></div>
            <div class="cardbig">${frontFace(tt, dd)}${backFace(tt, dd, { mol: true })}</div>
            ${rd ? `<button type="button" class="btn pri" data-act="pick-t" data-sym="${c.sym}" data-tid="${c.tid}">${c.sym} 추천하기 →</button>` : `<span class="sig bad">✗ 도킹 불가 — 추천할 수 없어요</span>`}</div>`; });
        while (cols.length < 2) cols.push(`<div class="empty">열지도의 줄을 눌러 ${cols.length ? "하나 더" : "표적 2개를"} 담으세요. 다른 질환의 표적도 담을 수 있어요.</div>`);
        const verdict = cmp.length === 2 ? (() => { const r = cmp.filter((c) => tierOf(findT(c.tid, c.sym)) === "ready"); return `<div class="pan ${r.length ? "good" : "bad"}"><b>${r.length === 2 ? `둘 다 도킹 준비됨 — ${r.map((c) => c.sym).join(" · ")} 중 하나를 고르세요` : r.length === 1 ? `다음 단계로 갈 수 있는 쪽: ${r[0].sym}` : "둘 다 도킹 준비가 안 됐어요 — 다른 표적을 담아 보세요"}</b></div>`; })() : "";
        return `${MINE("두 표적 나란히 견주기", "담기 2개까지. 점수 1위와 ✓ 표적을 나란히 놓아 보세요.")}
          <div class="pan tight">${diseaseChips()}</div>
          <div class="pan"><span class="lab-u">열지도에서 담기 (${cmp.length} / 2)</span>${heatSVG(d, { compact: true, act: "cmp", cmp: cmp.filter((c) => c.tid === d.tid).map((c) => c.sym), nocap: true })}</div>
          <div class="cmp2">${cols.join("")}</div>${verdict}${t ? infoPanel(t, d) : ""}`; },
      team: () => teamBoard(wCompare(), { title: "올린 카드 나란히 · 표적 확정" }) },
    { no: 8, name: "1인 1질환군", kind: "작은 망 3개 · 열지도 · 질환군 4칸", tools: ["1.04", "1.01"],
      idea: "§6.4 그대로 — 내가 맡은 질환군의 3질환을 작은 관계망(1.04) 3개로 보고, 하나를 펼쳐 열지도(1.01)에서 고른다. 모둠 공유는 질환군 4칸.",
      learn: "모둠원 4명이 질환군을 나눠 동시에 탐색하고, 카드 4장을 한 판에서 견줘 하나로 모은다.",
      mine: () => { const d = curD(), t = curT(), gi = S().peek == null ? MM[me()].grp : S().peek, g = GROUPS[gi], mineG = gi === MM[me()].grp;
        return `${MINE(`${g.n} ${esc(g.t)} — ${mineG ? "내 담당 질환군" : `${esc(MEMBERS.find((m) => m.grp === gi).short)} 담당 · 참고만`}`, "질환마다 작은 망. 하나를 누르면 아래 열지도가 그 질환으로 바뀌어요.")}
          <div class="row">${GROUPS.map((x, i) => `<button type="button" class="btn sm" data-act="peek" data-g="${i}" aria-pressed="${i === gi}">${x.n} ${esc(x.t)}${i === MM[me()].grp ? " · 내 담당" : ""}</button>`).join("")}</div>
          <div class="cols" style="grid-template-columns:repeat(3,minmax(0,1fr))">${g.ds.map((c) => c.d ? `<div class="pan tight"><button type="button" class="tile" data-act="pick-d" data-tid="${c.d.tid}" aria-pressed="${S().tid === c.d.tid}"><span class="nm"><i style="background:${c.d.color}"></i>${esc(c.d.name)}${c.d.taken ? `<span class="tk">${esc(c.d.taken)} 선점</span>` : ""}</span><small>연관 ${n0(c.d.assoc)} · 도킹 ${c.d.tg.gene}</small></button>${netSVG(c.d, { size: "sm", sel: S().tid === c.d.tid ? S().sym : null })}</div>`
            : `<div class="pan tight"><button type="button" class="tile off" disabled><span class="nm">${esc(c.name)}</span><small>${c.gene} · ${c.pdb} · 데이터 준비 중</small></button><div class="empty" style="font-size:11.5px">crista bio-worker 에 표적 데이터를 넣으면 망이 그려져요.</div></div>`).join("")}</div>
          <div class="pan"><span class="lab-u">${esc(d.name)} 근거 열지도</span>${heatSVG(d, { sel: S().sym })}</div>${infoPanel(t, d)}`; },
      team: () => teamBoard(wGroups(), { title: "질환군 4칸 · 표적 확정", note: "칸마다 담당 모둠원의 카드 한 장. 네 칸을 견줘 하나로 모아요.", lanes: false }) },
    { no: 9, name: "가중치 산점도", kind: "가중치 → 산점도 가로축", tools: ["1.03", "1.09"],
      idea: "가중치(1.03)가 산점도(1.09)의 가로축 '내 점수'를 바꾼다. 점이 움직여도 연두 띠의 ◆ 는 그대로다.",
      learn: "내 판단(가중치)으로 가로 위치는 바뀌지만, 세로(약물 근거)와 ◆(구조 준비)는 바뀌지 않는다.",
      plot: () => scatterSVG({ x: "my", w: S().w, sel: S().sym, selTid: S().tid }),
      mine: () => { const d = curD(), t = curT();
        return `${MINE("가중치를 바꾸면 점이 움직인다", "가로 = 내 점수 · 세로 = 약물 근거 · ◆ = 도킹 준비됨")}
          <div class="pan">${sliders()}</div>
          <div class="pan"><div data-plot>${V[8].plot()}</div>${DLEG}<p class="note" data-pinfo>점을 가리키면 이름이 나와요. 유전만 올려 보세요 — ACHE · DPP4 · PTGS2 가 왼쪽 끝으로 가지만 여전히 ◆ 예요.</p></div>
          ${infoPanel(t, d, { back: true })}`; },
      team: () => teamBoard(wWeights(), { title: "모둠원 가중치 · 표적 확정" }) },
    { no: 10, name: "추천서 먼저", kind: "빈 칸 4개 · 칸마다 도구 서랍", tools: ["1.01", "1.04", "1.10"],
      idea: "결과물인 추천 카드의 빈 칸 4개(질환 · 표적 · 구조 확인 · 근거)를 먼저 보이고, 칸을 누르면 그 칸을 채우는 도구(타일 · 열지도/망 · 카드 뒷면 · 근거 칩)가 펼쳐진다.",
      learn: "추천 카드 한 장에 '왜 이 질환 · 왜 이 표적 · 구조가 있나 · 근거'가 다 있어야 모둠을 설득할 수 있다.",
      mine: () => { const d = curD(), t = curT(), dr = S().drawer, seen = t && S().seen[d.tid + "|" + t.symbol], nr = S().rs.reasons.length;
        const filled = (S().tid ? 1 : 0) + (t ? 1 : 0) + (seen ? 1 : 0) + (nr ? 1 : 0);
        const slot = (k, lab, v, dd, ok, dis) => `<button type="button" class="slot${ok ? " filled" : ""}" data-act="drawer" data-dr="${k}" aria-pressed="${dr === k}" ${dis ? "disabled" : ""}><span class="k">${lab}</span><span class="v${k === "t" ? " mono" : ""}">${v}</span><span class="d">${dd}</span></button>`;
        const slots = `<div class="slots">${slot("d", "① 질환", esc(d.name), `${d.g.n} ${esc(d.g.t)} · 연관 ${n0(d.assoc)}`, true)}
          ${slot("t", "② 표적", t ? t.symbol : "—", t ? `${esc(KO[t.symbol] || "")} · ${rank(d, t)}위` : "열지도 · 망에서 고르기", !!t)}
          ${slot("s", "③ 구조 확인", seen ? `✓ ${t.pdbId}` : t ? "아직" : "—", seen ? `기준 약 ${esc(d.tg.ref)} · RMSD ${d.tg.rmsd} Å` : "카드 뒷면을 열어 확인", !!seen, !t)}
          ${slot("r", "④ 근거", nr ? `${nr}개 골랐어요` : "—", S().rs.note ? `“${esc(S().rs.note.slice(0, 28))}${S().rs.note.length > 28 ? "…" : ""}”` : "근거 칩 + 한 줄 이유", !!nr, !t)}</div>`;
        let body = "";
        if (dr === "d") body = `<div class="pan"><span class="lab-u">① 질환 — 눌러서 고르기</span>${diseaseTiles()}</div>`;
        else if (dr === "t") body = `<div class="pan"><div class="row"><span class="lab-u">② 표적 — ${esc(d.name)}</span><span class="toggle" style="margin-left:auto"><button type="button" class="btn sm" data-act="view" data-view="heat" aria-pressed="${S().view === "heat"}">열지도</button><button type="button" class="btn sm" data-act="view" data-view="net" aria-pressed="${S().view === "net"}">관계망</button></span></div>${S().view === "net" ? netSVG(d, { sel: S().sym }) : heatSVG(d, { sel: S().sym })}${LEG}</div>`;
        else if (dr === "s") body = t ? `<div class="pan"><span class="lab-u">③ 구조 확인 — ${t.symbol}</span><div class="cardbig">${frontFace(t, d)}${backFace(t, d, { mol: true })}</div><div class="row"><button type="button" class="btn pri" data-act="seen" ${seen ? "disabled" : ""}>${seen ? "✓ 확인했어요" : "확인했어요 → ④ 근거로"}</button>${tierOf(t) !== "ready" ? `<span class="note">도킹 준비가 안 된 표적이라 추천은 못 해요 — ${readyOf(d).symbol} 로 바꿔 보세요.</span>` : ""}</div></div>` : "";
        else if (dr === "r") body = t ? `<div class="pan">${recForm(t, d)}</div>` : "";
        return `${MINE("추천 카드를 먼저 — 칸을 눌러 채우기", `채운 칸 ${filled} / 4 · 다 채우면 ④ 에서 모둠에 올려요.`)}${slots}${body}`; } }
  ];
  X.V = V;
  const cur = () => V[S().v - 1];

  /* ── 사이드바 · 머리 · 도구 띠 · LED ── */
  const PH = [{ n: 1, t: "발견", s: [["1.1", "질환 · 표적 선정"], ["1.2", "화합물 스크리닝"]] }, { n: 2, t: "최적화", s: [["2.1", "분자 도킹"], ["2.2", "ADMET 예측 · 특허 후보"]] }, { n: 3, t: "개발 · 규제", s: [["3.1", "선언 · 물질특허"], ["3.2", "전임상 · 동물실험"], ["3.3", "제형 · IND 신청"]] }, { n: 4, t: "임상 · 허가", s: [["4.1", "임상 1 · 2 · 3상"], ["4.2", "최종 허가"]] }];
  function renderSide() {
    const st = S(), c = st.confirmed;
    const sub = (code) => code === "1.1" ? (c ? `✓ 완료 · ${c.sym}` : "▸ 진행 · 추천 카드 모으는 중") : code === "1.2" ? (st.done ? "▸ 진행 · 미션 브리핑" : c ? "준비됨 · 250,000 크리스타" : "🔒 표적 확정 뒤") : "🔒 앞 단계 뒤";
    $("side").innerHTML = `<div class="side-h">세움제약 · 신약 파이프라인<small>${c ? `${c.sym} · ${esc(DIS[c.tid].name)}` : "표적 미정 · 1.1 진행 중"}</small></div><nav class="nv">${PH.map((p) => `<div class="nv-g"><div class="nv-gh"><b>${p.n}.</b>${esc(p.t)}<small>${p.n === 1 ? (c ? (st.done ? "1" : "1") : "0") + "/" + p.s.length : "0/" + p.s.length}</small></div><ol class="nv-l">${p.s.map(([code, t]) => `<li><button type="button" class="nv-s${code === "1.1" || (code === "1.2" && c) ? "" : " lock"}" ${code === "1.1" ? 'aria-current="step"' : ""} aria-label="${code} ${esc(t)}"><span class="nv-n">${code}</span><span class="nv-t">${esc(t)}</span><span class="nv-st">${sub(code)}</span></button></li>`).join("")}</ol></div>`).join("")}</nav>
      <div class="nv-f"><span>지금 보는 사람 <b>${esc(MM[me()].name)} · ${MM[me()].role}</b></span><span>맡은 질환군 <b>${myGrp().n} ${esc(myGrp().t)}</b></span><span>모둠 4명 · 정족수 ${QUORUM}</span></div>`;
  }
  function renderHead() {
    const v = cur();
    $("head").innerHTML = `<div class="hd"><div class="hd-n" aria-hidden="true">1.1</div><p class="hd-eb">1. 발견 · Open Targets · 표적 탐색실 · 무료</p><h1>질환 · 표적 선정</h1><p class="hd-q">어떤 단백질을 막으면 이 병이 나을까?</p></div>
      <nav class="vt" aria-label="UI 시안 10종">${V.map((x) => `<button type="button" class="vt-i" data-act="v" data-v="${x.no}" aria-pressed="${x.no === v.no}"><span>${pad(x.no)}</span><b>${esc(x.name)}</b></button>`).join("")}</nav>
      <div class="vmeta"><p><b>${pad(v.no)} ${esc(v.name)}</b> — ${esc(v.idea)}<br><span class="lab-u" style="display:inline">배우는 것</span> ${esc(v.learn)}</p><div class="vtools"><span class="chip">${esc(v.kind)}</span>${v.tools.map((t) => `<span class="chip on">${t}</span>`).join("")}</div></div>`;
  }
  function renderMine() { $("mine").innerHTML = cur().mine(); drawMols($("mine")); }
  function renderTeam() { $("team").innerHTML = cur().team ? cur().team() : teamBoard(); }
  function renderTools() {
    const st = S();
    $("tools").innerHTML = `<button type="button" class="tbt" data-act="vprev" aria-label="이전 시안">← 시안</button><button type="button" class="tbt" data-act="vnext" aria-label="다음 시안">시안 →</button>
      <label class="sr" for="vpick">시안 고르기</label><select id="vpick" class="tbt" style="appearance:auto">${V.map((x) => `<option value="${x.no}" ${x.no === st.v ? "selected" : ""}>${pad(x.no)} ${esc(x.name)}</option>`).join("")}</select>
      <span class="grp2"><span class="tip">지금 화면의 모둠원</span>${MEMBERS.map((m) => `<button type="button" class="tbt" data-act="viewer" data-viewer="${m.id}" aria-pressed="${st.viewer === m.id}">${esc(m.short)} ${m.role}</button>`).join("")}</span>
      <button type="button" class="tbt" data-act="reset">처음부터</button><button type="button" class="tbt" data-act="led">LED ${ledPaused ? "재생" : "멈춤"}</button>
      <span class="keys" aria-hidden="true"><span><kbd>←</kbd><kbd>→</kbd>시안</span><span>미리보기 전용 — 제품에서는 모둠원 4명이 각자 기기로 봐요</span></span>`;
  }
  let ledPaused = false;
  const BASE_NEWS = [["다온테라퓨틱스 표적 확정 — ACHE · 알츠하이머", ""], ["미르파마 사옥 등기 완료 · 연구비 30,000,000 크리스타", ""], ["크리스타바이오 표적 탐색 중 — Ⅱ 종양 · 항암", ""], ["학급 모둠 8 · 표적 확정 1 / 8", ""], ["세움제약 1.1 진행 중 — 추천 카드 모으는 중", "ours"]];
  function renderLED() {
    const items = S().news.map((n) => [n.text, n.cls]).concat(BASE_NEWS);
    const set = `<span class="set">${items.map(([t, c]) => `<span class="item ${c || ""}">${esc(t)}</span>`).join("")}</span>`;
    $("led-run").innerHTML = set + set; $("led").classList.toggle("paused", ledPaused);
  }
  const toastEl = $("toast"); let toastT = null;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("on"), 2200); }
  function render() { renderSide(); renderHead(); renderMine(); renderTeam(); renderTools(); }
  function go(v, keep) { const st = S(); st.v = Math.max(1, Math.min(10, v)); try { history.replaceState(null, "", `#v${pad(st.v)}`); } catch (e) {} X.save(); render(); if (!keep) window.scrollTo({ top: 0 }); }
  function replot() { const v = cur(); if (!v.plot) return renderMine(); const box = $("mine").querySelector("[data-plot]"); if (box) box.innerHTML = v.plot(); $("mine").querySelectorAll("[data-out]").forEach((o) => (o.textContent = "× " + S().w[+o.dataset.out])); if (v.team) renderTeam(); }
  const log = (who, t) => S().log.push({ who, t, at: tick() });
  const news = (text, cls = "ours") => { S().news.unshift({ text, cls }); renderLED(); };
  const resetRs = () => { S().rs = { reasons: [], note: "" }; };

  /* 추천 올리기 · 모둠원 흉내(미리보기 전용 — 제품에서는 실제 모둠원이 각자 기기에서) */
  function post() {
    const st = S(), d = curD(), t = curT(); if (!t) return;
    const by = me(); st.picks[by] = { tid: d.tid, sym: t.symbol, reasons: st.rs.reasons.slice(), note: st.rs.note.trim(), at: tick() }; st.votes[by] = by;
    log(by, `${t.symbol}(${d.name}) 추천 카드를 올렸어요`); toast("모둠에 올렸어요 — 모둠원 반응을 기다려요"); simulate(by);
  }
  function simulate(by) {
    clearTimers(); const st = S(); let delay = 1800;
    for (const m of MEMBERS) {
      if (m.id === by) continue;
      if (!st.picks[m.id]) { later(delay, () => { const p = S().picks[by]; if (!p || S().confirmed) return; S().votes[m.id] = by; log(m.id, `${MM[by].short}의 ${p.sym} 카드에 찬성 — 도킹 준비된 표적이라 1.2 로 바로 갈 수 있어요`); renderTeam(); X.save(); }); delay += 1500; }
    }
    if (by !== "m4" && st.picks.m4) later(delay + 900, () => { const p = S().picks[by]; if (!p || S().confirmed) return; S().votes.m4 = by; log("m4", `찬성을 ${p.sym} 로 옮겼어요 — PTGS2 는 점수 8위라 설득이 어려울 것 같아요`); renderTeam(); X.save(); });
  }

  /* ── 이벤트 ── */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]"); if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return;
    const st = S(), a = el.dataset.act, d = el.dataset;
    switch (a) {
      case "v": return go(+d.v, true);
      case "vprev": return go(st.v === 1 ? 10 : st.v - 1, true);
      case "vnext": return go(st.v === 10 ? 1 : st.v + 1, true);
      case "pick-d": st.tid = d.tid; st.sym = null; resetRs(); if (st.v === 10) st.drawer = "t"; break;
      case "pick-t": if (d.tid) st.tid = d.tid; if (st.sym !== d.sym || (d.tid && st.tid !== d.tid)) resetRs(); st.sym = d.sym; if (st.v === 10) st.drawer = st.seen[st.tid + "|" + st.sym] ? "r" : "s"; if (st.v === 6 && st.step === 2 && el.classList.contains("btn")) st.step = 3; break;
      case "reason": { const i = st.rs.reasons.indexOf(d.r); if (i >= 0) st.rs.reasons.splice(i, 1); else st.rs.reasons.push(d.r); break; }
      case "post": post(); break;
      case "vote": st.votes[me()] = d.for; log(me(), `${MM[d.for].short}의 ${st.picks[d.for].sym} 카드에 찬성`); break;
      case "withdraw": { delete st.picks[me()]; for (const k of Object.keys(st.votes)) if (st.votes[k] === me()) delete st.votes[k]; log(me(), "내 추천 카드를 내렸어요"); clearTimers(); break; }
      case "confirm": { const p = st.picks[d.for]; st.confirmed = { tid: p.tid, sym: p.sym, by: d.for }; log(me(), `모둠 표적 확정 — ${p.sym} · ${DIS[p.tid].name}`); news(`◆ SEUM 표적 확정 — ${p.sym} · ${DIS[p.tid].name}`); toast("표적을 확정했어요"); break; }
      case "unconfirm": st.confirmed = null; st.done = false; log(me(), "확정을 풀었어요 — 다시 논의"); break;
      case "hand": st.done = true; news(`◆ SEUM 1.2 화합물 스크리닝 진입 — ${st.confirmed.sym}`); toast("1.2 화합물 스크리닝으로 보냈어요"); break;
      case "flip": { const f = (st.flipped[d.tid] = st.flipped[d.tid] || {}); if (f[d.sym]) delete f[d.sym]; else { f[d.sym] = 1; const t = findT(d.tid, d.sym); if (tierOf(t) === "ready") { st.tid = d.tid; if (st.sym !== d.sym) resetRs(); st.sym = d.sym; } } break; }
      case "flip-all": { const dd = curD(), f = st.flipped[dd.tid] || {}; const on = Object.keys(f).length < 8; st.flipped[dd.tid] = on ? Object.fromEntries(dd.ts.map((t) => [t.symbol, 1])) : {}; if (on) { st.sym = readyOf(dd).symbol; resetRs(); } break; }
      case "cmp": { const i = st.cmp.findIndex((c) => c.sym === d.sym && c.tid === d.tid); if (i >= 0) st.cmp.splice(i, 1); else if (st.cmp.length >= 2) return toast("2개까지만 담을 수 있어요 — 하나를 빼세요"); else st.cmp.push({ sym: d.sym, tid: d.tid }); break; }
      case "step": st.step = +d.s; break;
      case "filt": if (d.f[0] === "g" && d.f.length === 2) st.filt.g[+d.f[1]] = !st.filt.g[+d.f[1]]; else st.filt[d.f] = !st.filt[d.f]; break;
      case "all": st.all = !st.all; break;
      case "peek": st.peek = +d.g; break;
      case "drawer": st.drawer = d.dr; break;
      case "view": st.view = d.view; break;
      case "seen": st.seen[st.tid + "|" + st.sym] = true; st.drawer = "r"; break;
      case "goto-ready": st.sym = readyOf(curD()).symbol; resetRs(); if (st.v === 10) st.drawer = "s"; break;
      case "pre": st.w = d.pre.split(",").map(Number); break;
      case "viewer": st.viewer = d.viewer; resetRs(); st.peek = null; break;
      case "reset": { clearTimers(); const v = st.v, viewer = st.viewer; X.S = X.fresh(); X.S.v = v; X.S.viewer = viewer; X.save(); render(); renderLED(); return toast("처음부터 다시 시작했어요"); }
      case "led": ledPaused = !ledPaused; renderLED(); return renderTools();
      default: return;
    }
    X.save(); renderMine(); renderTeam(); renderSide();
  });
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "rec-note") { S().rs.note = t.value; X.save(); const b = $("mine").querySelector('[data-act="post"]'); return; }
    if (/^w\d$/.test(t.id)) { S().w[+t.id[1]] = +t.value; X.save(); replot(); }
  });
  document.addEventListener("change", (e) => { if (e.target.id === "vpick") go(+e.target.value, true); });
  document.addEventListener("keydown", (e) => {
    const el = e.target.closest && e.target.closest("[data-act]");
    if (el && el.tagName !== "BUTTON" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); return el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
    if (e.target.closest && e.target.closest("input, select, textarea")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(S().v === 10 ? 1 : S().v + 1, true); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(S().v === 1 ? 10 : S().v - 1, true); }
  });
  document.addEventListener("mouseover", (e) => { const g = e.target.closest && e.target.closest("[data-lab]"); if (!g) return; const out = $("mine").querySelector("[data-pinfo]"); if (out) out.textContent = g.dataset.lab; });
  addEventListener("hashchange", () => { const m = /^#v(\d{1,2})$/.exec(location.hash || ""); if (m) go(+m[1], true); });

  render(); renderLED();
})();
