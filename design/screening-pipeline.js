/* 1.2 화합물 스크리닝 — 눌러 볼 수 있는 미리보기.
   흐름: ① 미션 브리핑 → ② 모둠 기준 회의(제안 · 근거 · 투표 → 합의) → ③ 합의한 기준으로 스크리닝 실행(연구비) → ④ 통과 분자 쇼핑(찜 = claimedBy) → ⑤ 연구 노트 · 2.1 로 넘기기.
   실제 수업에서는 모둠원 4명이 각자 기기로 같은 회의를 본다. 미리보기에서는 다른 모둠원 몇 명이 규칙대로 움직이고, 아래 도구로 모둠원을 바꿔 그 사람으로 누를 수 있다. */
(() => {
  "use strict";
  const D = window.DD || { compounds: [], meta: { counts: {} } };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KR = (n) => Math.round(n).toLocaleString("ko-KR");
  /* 받침이 있으면 '이', 없으면 '가' */
  const josa = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? "이" : "가"; };
  const short = (n, k = 16) => { const s = String(n).replace(/\s*\(.*\)\s*$/, ""); return s.length > k ? s.slice(0, k - 1) + "…" : s; };
  const CMP = new Map(D.compounds.map((c) => [c.id, c]));

  /* ── 비용(설계 · 학습 연구비 수지표) ── */
  const COST_RUN = 250000, COST_DOCK = 250000, BUDGET0 = 10000000, CLAIM_MAX = 2;

  /* ── 모둠원 ── */
  const MEMBERS = [
    { id: "m1", name: "김하늘", short: "하늘", role: "CEO" },
    { id: "m2", name: "이도윤", short: "도윤", role: "CSO" },
    { id: "m3", name: "박서연", short: "서연", role: "CTO" },
    { id: "m4", name: "정민준", short: "민준", role: "CMO" }
  ];
  const MM = Object.fromEntries(MEMBERS.map((m) => [m.id, m]));
  const av = (id, cls = "") => `<span class="av ${cls}" data-m="${id}" title="${esc(MM[id].name)} · ${MM[id].role}">${esc(MM[id].short)}</span>`;
  const who = (id) => `<span class="who" data-m="${id}">${av(id, "sm")}${esc(MM[id].name)}<span class="role">${MM[id].role}</span></span>`;

  /* ── 미션(1.1 에서 정한 표적) ── */
  const MISSIONS = {
    "ache-4ey7": { gene: "ACHE", disease: "알츠하이머병", ref: "CHEMBL502", title: "뇌에 도착해야 하는 알츠하이머 약", cns: "must", dur: "life",
      story: "알츠하이머병 환자의 뇌에서는 기억을 전달하는 아세틸콜린이 빨리 분해돼요. 우리 약은 알약으로 먹어서 장에서 흡수되고, 피를 타고 가다가 뇌혈관 장벽(BBB)을 넘어 뇌 속 아세틸콜린에스테라아제(ACHE)를 막아야 합니다. 환자는 대부분 노인이고, 증상이 나빠지지 않도록 오랫동안 매일 먹어요.",
      advice: { mwMax: 450, tpsaMax: 90, ro5Max: 0, noAlerts: true, qedMin: 0.5, scoreMin: 0.5 }, low: 0.3 },
    "egfr-1m17": { gene: "EGFR", disease: "비소세포폐암", ref: "CHEMBL553", title: "폐암 환자가 집에서 먹는 항암 알약", cns: "nice", dur: "years",
      story: "EGFR 유전자에 변이가 생긴 폐암 세포는 멈추지 않고 자라요. 우리 약은 집에서 매일 먹는 알약으로, 장에서 흡수돼 폐의 암세포에 있는 EGFR 을 막아야 합니다. 환자 가운데 일부는 암이 뇌로 퍼져 있어서, 약이 뇌까지 들어가면 더 좋아요.",
      advice: { mwMax: 500, tpsaMax: 120, ro5Max: 1, noAlerts: true, qedMin: 0.4, scoreMin: 0.7 }, low: 0.5 },
    "dpp4-1x70": { gene: "DPP4", disease: "2형 당뇨병", ref: "CHEMBL1422", title: "수십 년 매일 먹는 당뇨약", cns: "no", dur: "life",
      story: "2형 당뇨병 환자는 혈당을 낮추는 호르몬이 DPP4 효소 때문에 금방 사라져요. 우리 약은 장에서 흡수돼 핏속의 DPP4 를 막아야 합니다. 환자는 수십 년 동안 매일 먹기 때문에 아주 작은 독성도 몸에 쌓일 수 있어요.",
      advice: { mwMax: 500, tpsaMax: 140, ro5Max: 0, noAlerts: true, qedMin: 0.5, scoreMin: 0.6 }, low: 0.4 },
    "cox2-3ln1": { gene: "PTGS2", disease: "류마티스 관절염", ref: "CHEMBL118", title: "위가 덜 아픈 관절염 진통제", cns: "no", dur: "years",
      story: "류마티스 관절염 환자의 관절에서는 COX-2 효소가 염증과 통증을 만들어요. 예전 진통제는 위를 지키는 COX-1 까지 막아 위장 출혈이 생겼습니다. 우리 약은 알약으로 오래 먹으면서 COX-2 만 골라 막아야 해요.",
      advice: { mwMax: 500, tpsaMax: 140, ro5Max: 0, noAlerts: true, qedMin: 0.6, scoreMin: 0.4 }, low: 0.2 }
  };

  /* ── 미션 브리핑 질문 ── */
  const WARM = [
    { k: "cns", q: "우리 약은 뇌까지 들어가야 하나요?", opts: [["must", "꼭 들어가야 해요"], ["nice", "들어가면 더 좋아요"], ["no", "들어갈 필요 없어요"]],
      ans: (M) => M.cns, link: "② 회의의 극성(TPSA) · 크기(MW) 안건과 이어져요.",
      seed: { m2: (M) => M.cns, m3: () => "no" } },
    { k: "dur", q: "환자는 이 약을 얼마나 오래 먹나요?", opts: [["days", "며칠만"], ["years", "몇 달에서 몇 년"], ["life", "거의 평생"]],
      ans: (M) => M.dur, link: "② 회의의 구조 경고 · Ro5 안건과 이어져요.",
      seed: { m4: (M) => M.dur } },
    { k: "route", q: "어떻게 먹는 약인가요?", opts: [["oral", "알약(먹는 약)"], ["inj", "주사"], ["skin", "바르는 약"]],
      ans: () => "oral", link: "먹는 약이면 장에서 흡수돼야 해요. 리핀스키 5규칙이 바로 '먹는 약' 규칙이에요.",
      seed: { m2: () => "oral", m3: () => "oral" } }
  ];

  /* ── 지표 사전 ── */
  const IND = {
    mw: { sym: "MW", name: "분자량", unit: "Da", what: "분자를 이루는 원자들의 무게를 모두 더한 값이에요.", an: "큰 짐가방일수록 좁은 문을 지나기 어렵듯, 무거운 분자는 장 벽을 지나 몸에 흡수되기 어려워요.", good: "먹는 약은 대부분 500 Da 이하, 뇌로 가는 약은 450 Da 아래가 많아요." },
    tpsa: { sym: "TPSA", name: "극성 표면적", unit: "Å²", what: "분자 겉면 가운데 산소 · 질소처럼 물과 친한 부분의 넓이예요.", an: "세포막은 얇은 기름막이에요. 물과 친한 겉면이 넓을수록 기름막을 뚫고 지나가기 어려워요.", good: "140 이하면 장에서 흡수되고, 90 이하면 뇌혈관 장벽(BBB)도 넘을 수 있어요." },
    logp: { sym: "logP", name: "기름 친화도", unit: "", what: "물과 기름 중 어디에 더 잘 녹는지예요. 1 커질 때마다 기름을 10배 더 좋아해요.", an: "물만 좋아하면 기름막을 못 뚫고, 기름만 좋아하면 피(물)에 녹지 않아요.", good: "0~5 사이가 알맞아요. 5를 넘으면 Ro5 위반 1개." },
    ro5: { sym: "Ro5", name: "리핀스키 5규칙", unit: "개 위반", what: "MW ≤ 500 · logP ≤ 5 · 수소결합 주개(OH·NH) ≤ 5 · 받개(N·O) ≤ 10. 네 규칙이 모두 5의 배수라 '5규칙'이에요. 어긴 개수를 셉니다.", an: "먹는 약 합격 체크리스트예요. 승인된 먹는 약 대부분이 0~1개만 어겨요.", good: "0개면 안심, 1개까지는 봐주는 경우가 많아요." },
    alert: { sym: "경고", name: "구조 경고", unit: "", what: "방향족 아민(벤젠 고리에 붙은 NH₂)이나 니트로기(NO₂)처럼, 간에서 대사되며 DNA 를 망가뜨리는 물질로 바뀔 수 있는 부품이에요.", an: "잘 만든 자동차라도 불량 부품 하나면 리콜돼요.", good: "오래 먹는 약일수록 처음부터 빼는 게 안전해요. 대신 2.1 에서 구조를 바꿔 고칠 수도 있어요." },
    qed: { sym: "QED", name: "약다움", unit: "", what: "분자량 · logP · 극성 · 수소결합 · 고리 수 · 경고 부품 등 8가지를 실제 약들과 비교해 0~1 하나로 합친 점수예요.", an: "'약 닮은꼴 점수'예요. 1에 가까울수록 진짜 약처럼 생겼어요.", good: "0.5 이상이면 무난, 0.67 이상이면 매력적이에요. 하지만 실제 약 중에도 0.4대가 있어요." },
    score: { sym: "점수", name: "표적 점수", unit: "", what: "분자가 표적 단백질에 얼마나 잘 붙을지 계산한 스크리닝 점수(0~1)예요. 3D 결합 모양, 이미 알려진 약과의 닮음, QED 를 합쳤어요.", an: "열쇠(분자)가 자물쇠(표적)에 얼마나 잘 맞는지예요. 그래도 몸속에서 자물쇠까지 못 가면 소용없어요.", good: "높을수록 좋아요. 정확한 결합 에너지는 2.1 도킹에서 직접 계산해요." }
  };
  const ind = (k, label) => `<button type="button" class="ind" data-ind="${k}">${esc(label || IND[k].sym)}</button>`;

  /* ── 안건(기준) ── order 가 깔때기 순서. loose = 아직 안 정했을 때(거르지 않음) */
  const lossCheck = (k) => (v, M) => {
    const f = funnelWith({ [k]: v });
    if (f.final < 8) return { lv: "no", t: `그래도 이 값이면 다른 기준과 합쳐 ${f.final}개밖에 안 남아요. 모둠원 4명이 1~2개씩 찜하기에 모자라요.` };
    return null;
  };
  const refCheck = (k, okFn) => (v, M) => { const r = CMP.get(M.ref); return r && !okFn(r, v) ? { lv: "no", t: `실제 약 ${short(r.n, 10)}(${fmtVal(k, rawVal(k, r))})도 이 기준에 걸려요! 실제 약을 참고했다면 값을 다시 보세요.` } : null; };
  const AG = [
    { k: "mw", g: "mw", label: "분자 크기", sym: "MW", type: "range", min: 250, max: 650, step: 10, op: "≤", cut: "mwMax", loose: 9999, unit: "Da",
      q: (M) => "우리 약 분자는 얼마나 작아야 할까요?",
      hints: (M) => ["알약은 장 벽을 지나야 몸에 들어가요. 큰 분자는 어떨까요?", M.cns === "must" ? "뇌로 가려면 장 벽보다 더 촘촘한 벽도 지나야 해요." : "뇌까지 갈 필요가 있는지 미션을 다시 보세요.", "왼쪽 막대그래프에서 값을 바꾸면 몇 개가 걸러지는지 바로 보여요."],
      reasons: [
        { k: "gut", t: "작은 분자가 장 벽을 잘 지나서", check: (v) => (v > 500 ? { lv: "warn", t: `500 Da 를 넘으면 장 흡수가 어려워져요. 이유와 값(${v})이 맞지 않아요.` } : null) },
        { k: "bbb", t: "뇌혈관 장벽(BBB)을 넘어야 해서", check: (v, M) => (M.cns === "no" ? { lv: "warn", t: "우리 약이 뇌까지 가야 하나요? 미션 글을 다시 읽어 보세요." } : v > 450 ? { lv: "warn", t: `뇌로 가는 약은 보통 450 Da 아래예요. 이 값(${v})은 이유보다 느슨해요.` } : null) },
        { k: "keep", t: "후보를 너무 많이 잃지 않으려고", check: lossCheck("mw") },
        { k: "ref", t: "실제 약 값을 참고해서", check: refCheck("mw", (r, v) => r.mw <= v) }],
      seed: (M) => [{ by: "m2", v: M.cns === "must" ? 450 : 500, why: M.cns === "must" ? "bbb" : "gut" }, { by: "m3", v: 600, why: "keep" }] },
    { k: "tpsa", g: "tpsa", label: "극성", sym: "TPSA", type: "range", min: 40, max: 180, step: 5, op: "≤", cut: "tpsaMax", loose: 9999, unit: "Å²",
      q: (M) => "물과 친한 겉면(TPSA)은 어디까지 봐줄까요?",
      hints: (M) => ["세포막은 기름막이에요. 물과 친한 겉면이 넓으면 어떻게 될까요?", "장 벽과 뇌혈관 장벽 중 어느 쪽이 더 통과하기 어려울까요?", "실제 약의 TPSA 를 그래프의 라임 점선으로 확인해 보세요."],
      reasons: [
        { k: "gut", t: "장에서 흡수만 되면 돼서", check: (v, M) => (M.cns === "must" && v > 90 ? { lv: "no", t: "우리 약은 뇌까지 가야 해요. 장에서 흡수되는 것만으로는 부족해요." } : v > 140 ? { lv: "warn", t: "TPSA 가 140 을 넘으면 장 흡수도 어려워요." } : null) },
        { k: "bbb", t: "뇌혈관 장벽(BBB)을 넘어야 해서", check: (v, M) => (v > 90 ? { lv: "no", t: `BBB 를 넘으려면 보통 TPSA 90 이하여야 해요. 이 값(${v})은 이유와 맞지 않아요.` } : M.cns === "no" ? { lv: "warn", t: "우리 약이 뇌까지 가야 하나요? 그만큼 후보를 많이 잃어요." } : null) },
        { k: "keep", t: "후보를 너무 많이 잃지 않으려고", check: lossCheck("tpsa") },
        { k: "ref", t: "실제 약 값을 참고해서", check: refCheck("tpsa", (r, v) => r.tpsa <= v) }],
      seed: (M) => M.cns === "must" ? [{ by: "m2", v: 90, why: "bbb" }, { by: "m3", v: 140, why: "gut" }]
        : M.cns === "nice" ? [{ by: "m4", v: 90, why: "bbb" }, { by: "m3", v: 140, why: "keep" }] : [{ by: "m2", v: 120, why: "gut" }, { by: "m3", v: 160, why: "keep" }] },
    { k: "ro5", g: "ro5", label: "먹는 약 규칙", sym: "Ro5", type: "seg", opts: [[0, "0개"], [1, "1개까지"], [2, "2개까지"]], op: "위반 ≤", cut: "ro5Max", loose: 9,
      q: (M) => "리핀스키 5규칙은 몇 개까지 어겨도 될까요?",
      hints: (M) => ["먹는 약인지 주사인지 미션을 다시 확인해 보세요.", "규칙을 1개 어긴 승인약도 있어요. 엄격하게 하면 무엇을 잃을까요?"],
      reasons: [
        { k: "oral", t: "먹는 약이라 규칙을 지켜야 해서", check: (v) => (v >= 2 ? { lv: "warn", t: "2개까지 허용하면 먹는 약 규칙이 많이 느슨해져요." } : null) },
        { k: "soft", t: "규칙을 1개쯤 어긴 좋은 약도 있어서", check: (v) => (v === 0 ? { lv: "warn", t: "이유는 '1개쯤 봐주자'인데 값은 0개예요." } : null) },
        { k: "keep", t: "후보를 너무 많이 잃지 않으려고", check: lossCheck("ro5") },
        { k: "ref", t: "실제 약 값을 참고해서", check: refCheck("ro5", (r, v) => r.ro5 <= v) }],
      seed: (M) => [{ by: "m2", v: M.advice.ro5Max, why: M.advice.ro5Max ? "soft" : "oral" }, { by: "m3", v: 2, why: "keep" }] },
    { k: "alert", g: "alert", label: "독성 부품", sym: "경고", type: "seg", opts: [[true, "빼기"], [false, "허용"]], op: "", cut: "noAlerts", loose: false,
      q: (M) => "독성이 될 수 있는 부품(구조 경고)이 있는 분자는 뺄까요?",
      hints: (M) => ["환자가 이 약을 얼마나 오래 먹는지 떠올려 보세요.", "경고 부품은 2.1 에서 구조를 바꿔 고칠 수도 있어요. 그래도 빼는 게 나을까요?"],
      reasons: [
        { k: "long", t: "오래 먹는 약이라 독성이 쌓이면 안 돼서", check: (v) => (v === false ? { lv: "no", t: "독성이 걱정된다면 '빼기'를 골라야 해요." } : null) },
        { k: "fix", t: "나중에 구조를 바꿔 고칠 수 있어서", check: (v) => (v === true ? { lv: "warn", t: "이유는 '고칠 수 있다'인데 값은 '빼기'예요." } : null) },
        { k: "keep", t: "후보를 너무 많이 잃지 않으려고", check: lossCheck("alert") }],
      seed: (M) => [{ by: "m4", v: true, why: "long" }, { by: "m3", v: false, why: "fix" }] },
    { k: "qed", g: "qed", label: "약다움", sym: "QED", type: "range", min: 0, max: 0.9, step: 0.05, op: "≥", cut: "qedMin", loose: 0, unit: "",
      q: (M) => "약다움(QED)은 몇 점 이상이어야 할까요?",
      hints: (M) => ["QED 가 높으면 '약처럼 생긴' 분자예요. 너무 높게 잡으면?", "실제 약의 QED 를 그래프에서 찾아보세요. 생각보다 낮을 수도 있어요."],
      reasons: [
        { k: "like", t: "실제 약과 닮은 분자를 고르려고", check: (v) => (v < 0.3 ? { lv: "warn", t: "QED 0.3 이하는 약과 별로 닮지 않은 분자도 많이 통과해요." } : null) },
        { k: "bind", t: "약다움보다 결합력(점수)이 더 중요해서", check: (v) => (v > 0.6 ? { lv: "warn", t: "결합력을 우선한다면서 QED 를 높게 잡으면 점수 높은 분자를 많이 잃어요." } : null) },
        { k: "keep", t: "후보를 너무 많이 잃지 않으려고", check: lossCheck("qed") },
        { k: "ref", t: "실제 약 값을 참고해서", check: refCheck("qed", (r, v) => r.qed >= v) }],
      seed: (M) => [{ by: "m2", v: Math.max(0.5, M.advice.qedMin), why: "like" }, { by: "m3", v: 0.3, why: "bind" }] },
    { k: "score", g: "score", label: "결합 예측", sym: "점수", type: "range", min: 0, max: 0.9, step: 0.05, op: "≥", cut: "scoreMin", loose: 0, unit: "",
      q: (M) => `${M.gene} 에 잘 붙을 것 같은 분자만 남기려면, 표적 점수를 몇 점 이상으로 할까요?`,
      hints: (M) => ["표적마다 점수 분포가 달라요. 다른 모둠의 숫자를 따라 하지 말고 그래프를 보세요.", "점수가 높은 분자만 남기면 도킹 비용은 줄지만, 구조를 조금 바꾸면 좋아질 분자를 버릴 수도 있어요.", "남는 수를 보면서 모둠원 4명이 1~2개씩 고를 수 있을지 생각해 보세요."],
      reasons: [
        { k: "strong", t: "강하게 붙을 분자만 도킹하려고", check: (v) => (v < 0.4 ? { lv: "warn", t: `점수 ${v.toFixed(2)} 이상이면 잘 안 붙을 분자도 꽤 남아요. 이유보다 느슨해요.` } : null) },
        { k: "cost", t: "도킹 비용을 아끼려고", check: (v) => { const n = funnelWith({ score: v }).final; return n > 40 ? { lv: "warn", t: `그래도 ${n}개가 남아요. 모두 도킹하면 ${KR(n * COST_DOCK)} 크리스타예요.` } : null; } },
        { k: "grow", t: "점수가 낮아도 2.1 에서 구조를 바꿔 좋아질 수 있어서", check: (v) => (v > 0.6 ? { lv: "warn", t: "이유는 '낮아도 기회를 주자'인데 값은 꽤 높아요." } : null) },
        { k: "keep", t: "후보를 너무 많이 잃지 않으려고", check: lossCheck("score") },
        { k: "ref", t: "실제 약 값을 참고해서", check: refCheck("score", (r, v) => (r.sc[S.tid] || 0) >= v) }],
      seed: (M) => [{ by: "m2", v: M.advice.scoreMin, why: "strong" }, { by: "m3", v: M.low, why: "grow" }] }
  ];
  const AGM = Object.fromEntries(AG.map((a) => [a.k, a]));
  const rawVal = (k, c) => (k === "alert" ? c.al.length : k === "score" ? c.sc[S.tid] || 0 : c[k]);
  function fmtVal(k, v) {
    const a = AGM[k];
    if (k === "alert") return typeof v === "boolean" ? (v ? "빼기" : "허용") : v ? `${v}개` : "없음";
    if (k === "ro5") return `${v}개`;
    if (k === "qed" || k === "score") return (+v).toFixed(2);
    return `${Math.round(v)}${a && a.unit ? " " + a.unit : ""}`;
  }
  const ruleText = (k, v) => { const a = AGM[k]; return k === "alert" ? `구조 경고 ${v ? "빼기" : "허용"}` : k === "ro5" ? `Ro5 위반 ≤ ${v}` : k === "score" ? `${M().gene} 점수 ≥ ${fmtVal(k, v)}` : `${a.sym} ${a.op} ${fmtVal(k, v)}`; };
  const passOne = (k, c, v) => (k === "mw" ? c.mw <= v : k === "tpsa" ? c.tpsa <= v : k === "ro5" ? c.ro5 <= v : k === "alert" ? !v || !c.al.length : k === "score" ? (c.sc[S.tid] || 0) >= v : c.qed >= v);

  /* ── 상태 ── */
  const KEY = "crista-screening-pipeline-v2";
  let S;
  function fresh(tid = "ache-4ey7") {
    const M = MISSIONS[tid];
    const ag = {};
    for (const a of AG) {
      const props = a.seed(M).map((p, i) => ({ id: `${a.k}-s${i}`, by: p.by, v: p.v, why: p.why, t: i }));
      const votes = {}; props.forEach((p) => (votes[p.by] = { pid: p.id, why: p.why }));
      ag[a.k] = { props, votes, agreed: null, feed: props.map((p) => ({ by: p.by, kind: "prop", pid: p.id })), draft: null };
    }
    return {
      tid, viewer: "m1", step: 1, agSel: "mw", budget: BUDGET0, day: 12,
      warm: Object.fromEntries(WARM.map((w) => [w.k, Object.fromEntries(Object.entries(w.seed).map(([m, f]) => [m, f(M)]))])),
      read: { m2: true, m3: true }, ag, runs: [], claims: [], shop: { q: "", sort: "score", f: [], page: 0 },
      notes: { why: null, unknown: null, fallback: null }, quiz: "", done: false, news: [], seededShop: false, autoShop: false
    };
  }
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.ag && MISSIONS[s.tid] && AG.every((x) => s.ag[x.k])) return s; } catch (e) {} return fresh(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  S = load();
  const M = () => MISSIONS[S.tid];
  const me = () => S.viewer;

  /* ── 계산 ── */
  const score = (c) => c.sc[S.tid] || 0;
  /* 안건 값: 합의값 → 없으면 거르지 않음 */
  const agreedVal = (k) => { const g = S.ag[k]; return g.agreed ? g.agreed.v : null; };
  function cutNow(over = {}) {
    const cut = {};
    for (const a of AG) cut[a.k] = a.k in over ? over[a.k] : agreedVal(a.k) ?? a.loose;
    return cut;
  }
  /* 깔때기 — 안건 순서대로. over 로 한 안건만 바꿔 볼 수 있다 */
  function funnel(cut) {
    let alive = D.compounds.slice();
    const steps = [];
    for (const a of AG) {
      const before = alive.length;
      alive = alive.filter((c) => passOne(a.k, c, cut[a.k]));
      steps.push({ k: a.k, removed: before - alive.length, left: alive.length });
    }
    alive.sort((x, y) => score(y) - score(x));
    return { steps, final: alive.length, ids: alive.map((c) => c.id) };
  }
  const funnelWith = (over) => funnel(cutNow(over));
  /* 이 분자가 처음 걸리는 안건 */
  const firstFail = (c, cut) => AG.find((a) => !passOne(a.k, c, cut[a.k]));

  /* ── 기록 ── */
  const nowT = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  function toast(t) {
    const el = document.createElement("div"); el.className = "toast"; el.textContent = t; document.body.appendChild(el);
    $("live").textContent = t;
    setTimeout(() => el.remove(), 2600);
  }
  function news(text, cls = "ours") { S.news.unshift({ text, cls }); renderLED(); }

  /* ── 구조식 ── */
  const molCache = new Map();
  const isDark = () => { const t = document.documentElement.getAttribute("data-theme"); return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
  function mol(smiles, w, h) {
    const key = smiles + "|" + w + "|" + h + "|" + isDark();
    const box = `<div class="molbox" style="aspect-ratio:${w} / ${h}">`;
    if (molCache.has(key)) return `${box}${molCache.get(key)}</div>`;
    return `${box}<svg class="mol" data-smiles="${esc(smiles)}" data-w="${w}" data-h="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="구조식"></svg></div>`;
  }
  function drawMols(root = document) {
    const SD = window.SmilesDrawer;
    for (const el of root.querySelectorAll("svg[data-smiles]")) {
      const smi = el.getAttribute("data-smiles"), w = +el.dataset.w, h = +el.dataset.h, key = smi + "|" + w + "|" + h + "|" + isDark();
      el.removeAttribute("data-smiles");
      if (!SD) { el.outerHTML = `<span class="fallback">${esc(smi)}</span>`; continue; }
      try {
        const sd = new SD.SmiDrawer({ width: w, height: h, padding: 6, bondThickness: 1.1, compactDrawing: false, fontSizeLarge: 7, fontSizeSmall: 5 });
        sd.draw(smi, el, isDark() ? "dark" : "light", () => {
          el.removeAttribute("style"); el.removeAttribute("width"); el.removeAttribute("height"); el.setAttribute("class", "mol");
          try { const b = el.getBBox(); if (b.width && b.height) el.setAttribute("viewBox", `${b.x - 6} ${b.y - 6} ${b.width + 12} ${b.height + 12}`); } catch (e) {}
          el.setAttribute("preserveAspectRatio", "xMidYMid meet");
          molCache.set(key, el.outerHTML);
        }, () => { el.outerHTML = `<span class="fallback">${esc(smi)}</span>`; });
      } catch (e) { el.outerHTML = `<span class="fallback">${esc(smi)}</span>`; }
    }
  }

  /* ════════ 위 띠 · 전광판 · 사이드바 · 미리보기 도구 ════════ */
  function renderTop() {
    $("top").innerHTML = `<div class="brand"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1 19 10 10 19 1 10Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 6 14 10 10 14 6 10Z" fill="currentColor"/></svg>CRISTA <small>파이프라인 랩</small></div>
      <div class="co"><span class="ink"></span>세움제약 <span class="tick">SEUM</span></div>
      <span class="sp"></span>
      <span class="kpi rank">시가총액 <b>2위</b> · $10.42M</span>
      <span class="kpi money" id="money">연구비 <b>${KR(S.budget)}</b> 크리스타</span>
      <span class="kpi">게임 <b>D+${S.day}</b></span>
      <button type="button" class="tbtn" data-act="noop">사옥 지구</button>`;
  }
  const BASE_NEWS = [
    { text: "◆ DAON 화합물 스크리닝 완료 — 후보 14종 ▲ 1.0%", cls: "" },
    { text: "◆ KORA 스크리닝 후보 0종 — 기준을 너무 엄격하게 ▼ 1.5%", cls: "bad" },
    { text: "◆ MIRP 표적 확정 — EGFR · 비소세포폐암", cls: "" },
    { text: "◆ HANA 스크리닝 다시 실행 — 기준을 새로 합의 ▲ 0.4%", cls: "" },
    { text: "◆ NOVA 2.1 분자 도킹 진입 — 후보 6종", cls: "" }
  ];
  let ledPaused = false;
  function renderLED() {
    const items = S.news.concat([{ text: `◆ SEUM 표적 확정 — ${M().gene} · ${M().disease}`, cls: "ours" }], BASE_NEWS);
    const one = items.map((n) => `<span class="item ${n.cls}">${esc(n.text)}</span>`).join("");
    $("led").classList.toggle("paused", ledPaused);
    $("led").innerHTML = `<div class="track"><div class="run"><span class="set">${one}</span><span class="set" aria-hidden="true" inert>${one}</span></div></div>
      <span class="live"><i></i>LIVE</span><button type="button" data-act="led">${ledPaused ? "다시 흐르기" : "멈추기"}</button>`;
  }
  function renderSide() {
    const s12 = S.done ? "done" : "cur";
    $("side").innerHTML = `<h2>세움제약 · 신약 파이프라인<small>${M().gene} · ${M().disease}</small></h2>
      <ol class="tree">
        <li><div class="ph"><span>1. 발견</span><span class="mono">${S.done ? 2 : 1}/2</span></div>
          <ol><li class="sub-s done"><span class="n">1.1</span><span>질환 · 표적 선정</span><span class="st">✓</span></li>
          <li class="sub-s ${s12 === "done" ? "done" : ""}" ${s12 === "cur" ? 'aria-current="step"' : ""}><span class="n">1.2</span><span>화합물 스크리닝</span><span class="st">${S.done ? "✓" : "▸ 지금"}</span></li></ol></li>
        <li><div class="ph"><span>2. 최적화</span><span class="mono">0/2</span></div>
          <ol><li class="sub-s ${S.done ? "" : "lock"}" ${S.done ? 'aria-current="step"' : ""}><span class="n">2.1</span><span>분자 도킹</span><span class="st">${S.done ? "▸ 다음" : "🔒"}</span></li>
          <li class="sub-s lock"><span class="n">2.2</span><span>ADMET 예측 · 리드</span><span class="st">🔒</span></li></ol></li>
        <li><div class="ph"><span>3. 개발 · 규제</span><span class="mono">0/2</span></div>
          <ol><li class="sub-s lock"><span class="n">3.1</span><span>물질특허</span><span class="st">🔒</span></li><li class="sub-s lock"><span class="n">3.2</span><span>제형 · IND</span><span class="st">🔒</span></li></ol></li>
        <li><div class="ph"><span>4. 임상 · 허가</span><span class="mono">0/2</span></div>
          <ol><li class="sub-s lock"><span class="n">4.1</span><span>임상 1 · 2 · 3상</span><span class="st">🔒</span></li><li class="sub-s lock"><span class="n">4.2</span><span>최종 허가</span><span class="st">🔒</span></li></ol></li>
      </ol>
      <p class="note">1.2 완료 조건: 그 표적의 스크리닝 1회 이상. 기준 미리보기는 무료, 확정 실행은 ${KR(COST_RUN)} 크리스타.</p>`;
  }
  function renderPV() {
    $("pv").innerHTML = `<span class="pl">미리보기</span>
      <span class="grp"><span class="tip">지금 화면의 모둠원</span>${MEMBERS.map((m) => `<button type="button" data-viewer="${m.id}" aria-pressed="${S.viewer === m.id}">${esc(m.short)} ${m.role}</button>`).join("")}</span>
      <span class="grp"><label class="tip" for="pv-tid">1.1 표적</label><select id="pv-tid">${Object.entries(MISSIONS).map(([k, m]) => `<option value="${k}" ${k === S.tid ? "selected" : ""}>${m.gene} · ${m.disease}</option>`).join("")}</select></span>
      <button type="button" data-act="reset">처음부터</button>
      <span class="tip">실제 수업에서는 4명이 각자 기기로 같은 회의를 봅니다.</span>`;
  }

  /* ════════ 작업 영역 ════════ */
  const STEPS = [
    { n: 1, t: "미션 브리핑", s: () => { const r = Object.keys(S.read).length; return `${r}/4 읽음`; } },
    { n: 2, t: "모둠 기준 회의", s: () => `${AG.filter((a) => S.ag[a.k].agreed).length}/${AG.length} 합의` },
    { n: 3, t: "스크리닝 실행", s: () => (S.runs.length ? `${S.runs.length}회 · ${S.runs[0].n}개 통과` : "아직") },
    { n: 4, t: "분자 쇼핑", s: () => `찜 ${S.claims.length}개` },
    { n: 5, t: "넘기기", s: () => (S.done ? "2.1 로 보냄" : "노트 · 확정") }
  ];
  const stepDone = (n) => (n === 1 ? Object.keys(S.read).length >= 4 : n === 2 ? AG.every((a) => S.ag[a.k].agreed) : n === 3 ? S.runs.length > 0 : n === 4 ? S.claims.length > 0 : S.done);
  function renderWork() {
    const sy = scrollY;
    const online = MEMBERS.map((m) => av(m.id, "on" + (m.id === me() ? " me" : ""))).join("");
    $("work").innerHTML = `<header class="sh"><div class="num" aria-hidden="true">1.2</div>
        <p class="eyebrow">1. 발견 · ChEMBL 라이브러리 220종 · RDKit 물성 · 결과 성격: 자료 조회 + 실제 계산</p>
        <h1>화합물 스크리닝</h1>
        <div class="meta"><span>완료 조건 · 스크리닝 1회</span><span>미리보기 무료</span><span>확정 실행 ${KR(COST_RUN)} 크리스타</span></div>
        <div class="team"><span class="avs">${online}</span><small>모둠원 4명 접속 중 · 나 = ${esc(MM[me()].name)} ${MM[me()].role}</small></div></header>
      <nav class="steps" aria-label="1.2 진행">${STEPS.map((s) => `<button type="button" data-step="${s.n}" class="${stepDone(s.n) ? "done" : ""}" ${S.step === s.n ? 'aria-current="step"' : ""}>
        <span class="sn">${"①②③④⑤"[s.n - 1]}</span><span class="st">${s.t}</span><span class="ss">${s.s()}</span></button>`).join("")}</nav>
      <div id="stepbody">${[null, stepMission, stepMeeting, stepRun, stepShop, stepHand][S.step]()}</div>`;
    drawMols($("work"));
    if (Math.abs(scrollY - sy) > 2) scrollTo(0, sy);
    const fd = document.querySelector(".feed"); if (fd) fd.scrollTop = fd.scrollHeight;
  }

  /* ── ① 미션 브리핑 ── */
  function stepMission() {
    const m = M(), r = CMP.get(m.ref);
    const myRead = !!S.read[me()];
    const warm = WARM.map((w) => {
      const ans = S.warm[w.k] || {}, mine = ans[me()];
      const correct = w.ans(m), right = mine === correct;
      return `<div class="pane" style="background:var(--bg)"><p class="q" style="font-size:15px">${esc(w.q)}</p>
        <div class="row">${w.opts.map(([v, t]) => `<button type="button" class="rch" data-warm="${w.k}" data-v="${v}" aria-pressed="${mine === v}">${esc(t)}</button>`).join("")}</div>
        <div class="row" style="gap:10px">${MEMBERS.filter((x) => ans[x.id]).map((x) => `<span class="row" style="gap:4px">${av(x.id, "sm")}<span class="muted" style="font-size:12px">${esc(w.opts.find((o) => o[0] === ans[x.id])[1])}</span></span>`).join("") || `<span class="muted" style="font-size:12px">아직 아무도 답하지 않았어요.</span>`}</div>
        ${mine ? `<div class="coach ${right ? "ok" : "no"}"><b>${right ? "맞아요." : "다시 읽어 보세요."}</b>${right ? esc(w.link) : "미션 글 안에 답이 있어요. 모둠원 답과 다르면 이야기해 보세요."}</div>` : ""}</div>`;
    }).join("");
    return `<div class="mission" style="margin-top:14px">
      <section class="col"><div class="pane"><p class="ptitle">미션 <span class="tag">1.1 에서 정한 표적</span></p>
        <p class="q">${esc(m.title)}</p><p class="p">${esc(m.story)}</p>
        <div class="row"><span class="chip">${m.gene}</span><span class="chip">${esc(m.disease)}</span><span class="chip">PDB ${m.ref === "CHEMBL502" ? "4EY7" : m.ref === "CHEMBL553" ? "1M17" : m.ref === "CHEMBL1422" ? "1X70" : "3LN1"}</span></div></div>
        <div class="pane"><p class="ptitle">회의 전에 함께 답해요 <span class="tag">모둠 공유</span></p>${warm}</div></section>
      <section class="col"><div class="pane"><p class="ptitle">이 표적의 실제 약 <span class="tag">비교 기준</span></p>
        ${r ? `<div class="mcard-ref">${mol(r.s, 320, 150)}<div style="padding:4px 10px 8px"><b>${esc(r.n)}</b><div class="mono muted" style="font-size:11px">${esc(r.mech || "")}</div></div>
          <dl class="kv"><div><dt>${ind("mw")}</dt><dd>${r.mw.toFixed(0)}</dd></div><div><dt>${ind("tpsa")}</dt><dd>${r.tpsa.toFixed(0)}</dd></div><div><dt>${ind("logp")}</dt><dd>${r.logp.toFixed(1)}</dd></div>
          <div><dt>${ind("ro5")}</dt><dd>${r.ro5}개</dd></div><div><dt>${ind("alert")}</dt><dd>${r.al.length ? r.al.length + "개" : "없음"}</dd></div><div><dt>${ind("qed")}</dt><dd>${r.qed.toFixed(2)}</dd></div></dl></div>` : ""}
        <p class="p muted">이미 쓰이는 약의 값이에요. 기준을 정할 때 '이 약도 통과할까?'를 꼭 확인하세요. 밑줄 친 지표를 누르면 뜻이 나와요.</p></div>
        <div class="pane"><p class="ptitle">모둠원 <span class="tag">모둠 공유</span></p>
          <div class="readers">${MEMBERS.map((x) => `<div class="r">${who(x.id)}<span class="st ${S.read[x.id] ? "" : "muted"}">${S.read[x.id] ? "✓ 읽음" : x.id === "m4" ? "읽는 중…" : "아직"}</span></div>`).join("")}</div>
          <div class="row sb"><span class="muted" style="font-size:12px">${Object.keys(S.read).length}/4 명이 읽었어요.</span>
          ${myRead ? `<button type="button" class="btn pri" data-step="2">기준 회의로 →</button>` : `<button type="button" class="btn pri" data-act="read">다 읽었어요</button>`}</div></div></section></div>`;
  }

  /* ── ② 모둠 기준 회의 ── */
  function fstrip(over) {
    const cut = cutNow(over), f = funnel(cut);
    return `<div class="fstrip" aria-label="지금 기준으로 본 깔때기"><div><span class="fl">라이브러리</span><span class="fv">220</span><span class="fr muted">ChEMBL · ZINC · 사내</span></div>
      ${AG.map((a, i) => { const ag = S.ag[a.k], v = a.k in (over || {}) ? over[a.k] : ag.agreed ? ag.agreed.v : null;
        return `<div data-g="${a.g}"><span class="fl">${a.label}</span><span class="fv">${f.steps[i].left} <small>−${f.steps[i].removed}</small></span><span class="fr ${v == null ? "tbd" : ""}">${v == null ? "미정 · 거르지 않음" : esc(ruleText(a.k, v)) + (ag.agreed ? " ✓" : " (내 값)")}</span></div>`; }).join("")}
      <div><span class="fl">남는 후보</span><span class="fv">${f.final}</span><span class="fr">${f.final > 40 ? "많음" : f.final < 8 ? "적음" : "알맞음"}</span></div></div>`;
  }
  function stepMeeting() {
    const a = AGM[S.agSel], g = S.ag[a.k];
    const tabs = AG.map((x) => { const gg = S.ag[x.k], n = Object.keys(gg.votes).length;
      return `<button type="button" data-ag="${x.k}" data-g="${x.g}" aria-pressed="${S.agSel === x.k}"><span class="an">${x.label} · ${x.sym}</span>
        <span class="as ${gg.agreed ? "ok" : ""}">${gg.agreed ? "✓ " + esc(ruleText(x.k, gg.agreed.v)) : `논의 중 · ${n}/4 투표`}</span></button>`; }).join("");
    const allOk = AG.every((x) => S.ag[x.k].agreed);
    return `<div class="col" style="margin-top:14px">
      <div id="fs">${fstrip(g.agreed ? {} : { [a.k]: draftVal(a) })}</div>
      <div class="agt" role="tablist" aria-label="안건">${tabs}</div>
      <div class="split">
        <section class="col"><div class="pane" id="bench">${bench(a)}</div></section>
        <section class="col"><div class="pane team-p" id="room">${room(a)}</div>
          ${allOk ? `<div class="coach ok"><b>${AG.length}개 안건 모두 합의했어요.</b>이 기준으로 스크리닝을 실행할 수 있어요. <button type="button" class="btn pri sm" data-step="3">스크리닝 실행으로 →</button></div>` : ""}</section>
      </div></div>`;
  }
  const draftVal = (a) => { const g = S.ag[a.k]; if (g.draft != null) return g.draft; const mine = g.props.find((p) => p.by === me()); return mine ? mine.v : g.agreed ? g.agreed.v : a.type === "seg" ? a.opts[0][0] : Math.round(((a.min + a.max) / 2) / a.step) * a.step; };

  /* 내 작업대 — 설명 · 분포 · 값 바꿔 보기(무료) · 제안하기 */
  function bench(a) {
    const g = S.ag[a.k], v = draftVal(a), i = IND[a.k];
    const locked = !!g.agreed;
    const ctl = a.type === "range"
      ? `<div class="rng"><label class="lab" for="draft"><span>내가 생각하는 값</span><span class="v" id="draftv">${a.op} ${fmtVal(a.k, v)}</span></label>
          <input type="range" id="draft" min="${a.min}" max="${a.max}" step="${a.step}" value="${v}" ${locked ? "disabled" : ""}></div>`
      : `<div class="rng"><span class="lab"><span>내가 생각하는 값</span></span><div class="seg">${a.opts.map(([ov, t]) => `<button type="button" data-draft="${ov}" aria-pressed="${v === ov}" ${locked ? "disabled" : ""}>${t}</button>`).join("")}</div></div>`;
    const myP = g.props.find((p) => p.by === me());
    return `<p class="ptitle">내 작업대 <span class="tag">나만 보여요 · 무료 미리보기</span><span class="sp"></span>${who(me())}</p>
      <p class="q">${esc(a.q(M()))}</p>
      <ul class="hint-l">${a.hints(M()).map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
      <details class="expl"><summary>${i.sym} · ${i.name}${josa(i.name)} 뭐예요?</summary><div><p style="margin:0">${i.what}</p><p class="an" style="margin:0">${i.an}</p><p style="margin:0;font-weight:600">${i.good}</p></div></details>
      <div id="ev">${evidence(a, v)}</div>
      ${ctl}
      ${locked ? `<div class="coach ok"><b>합의됨.</b>모둠이 ${esc(ruleText(a.k, g.agreed.v))}로 정했어요. 바꾸려면 오른쪽에서 '다시 논의'를 누르세요.</div>`
        : `<div class="col" style="gap:6px"><span style="font-size:12.5px;font-weight:600">왜 이 값인가요? <span class="muted" style="font-weight:400">근거를 하나 골라야 제안할 수 있어요</span></span>
          <div class="row">${a.reasons.map((r) => `<button type="button" class="rch" data-preason="${r.k}" aria-pressed="${g.pwhy === r.k}">${esc(r.t)}</button>`).join("")}</div>
          <div id="pcheck">${g.pwhy ? coachFor(a, v, g.pwhy) : ""}</div>
          <div class="row end"><button type="button" class="btn pri" data-act="propose" ${g.pwhy ? "" : "disabled"}>${myP ? "내 제안 고치기" : "모둠에 제안하기"} · ${esc(ruleText(a.k, v))}</button></div></div>`}`;
  }
  function coachFor(a, v, rk) {
    const r = a.reasons.find((x) => x.k === rk); if (!r) return "";
    const c = r.check(v, M());
    return c ? `<div class="coach ${c.lv}"><b>${c.lv === "no" ? "잠깐!" : "생각해 볼 점."}</b>${esc(c.t)}</div>` : `<div class="coach ok"><b>근거와 값이 맞아요.</b>모둠원에게 이 근거로 설명할 수 있어요.</div>`;
  }
  /* 분포 그래프 + 이 값의 결과 */
  function evidence(a, v) {
    const vals = D.compounds.map((c) => rawVal(a.k, c)), r = CMP.get(M().ref);
    const W = 420, H = 120, pad = 18;
    let svg = "";
    const props = S.ag[a.k].props;
    if (a.type === "range") {
      const lo = a.min, hi = a.max, n = 28, bw = (hi - lo) / n, bins = new Array(n).fill(0);
      for (const x of vals) bins[Math.max(0, Math.min(n - 1, Math.floor((x - lo) / bw)))]++;
      const mx = Math.max(...bins), sx = (x) => pad + ((Math.max(lo, Math.min(hi, x)) - lo) / (hi - lo)) * (W - 2 * pad);
      bins.forEach((b, i) => { const mid = lo + (i + 0.5) * bw, ok = a.op === "≥" ? mid >= v : mid <= v, h = (b / mx) * (H - 44);
        svg += `<rect x="${sx(lo + i * bw) + 0.5}" y="${H - 22 - h}" width="${(W - 2 * pad) / n - 1}" height="${h}" fill="${ok ? "var(--fg)" : "var(--c)"}" opacity="${ok ? 0.8 : 0.85}"/>`; });
      props.forEach((p) => { const x = sx(p.v); svg += `<path d="M${x} 8 V${H - 22}" stroke="var(--${p.by === "m1" ? "m1" : p.by})" stroke-width="1.2" stroke-dasharray="1 2"/><circle cx="${x}" cy="8" r="5" fill="var(--${p.by})"/><text x="${x}" y="11" text-anchor="middle" style="fill:#fff;font-size:6.5px;font-family:var(--sans);font-weight:700">${esc(MM[p.by].short[0])}</text>`; });
      if (r) { const x = sx(rawVal(a.k, r)); svg += `<path d="M${x} 16 V${H - 22}" stroke="var(--hi-fg)" stroke-width="1.5" stroke-dasharray="3 2"/><rect x="${x - 3}" y="16" width="6" height="6" fill="var(--hi)" stroke="var(--ring)"/>`; }
      const cx = sx(v); svg += `<path d="M${cx} 4 V${H - 18}" stroke="var(--fg)" stroke-width="2"/><text x="${cx}" y="${H - 6}" text-anchor="middle" style="fill:var(--fg);font-weight:600">${a.op} ${fmtVal(a.k, v)}</text>`;
      svg += `<text x="${pad}" y="${H - 6}">${fmtVal(a.k, lo)}</text><text x="${W - pad}" y="${H - 6}" text-anchor="end">${fmtVal(a.k, hi)}</text>`;
    } else {
      const cats = a.k === "ro5" ? [0, 1, 2, 3] : [0, 1];
      const cnt = cats.map((cv) => (a.k === "ro5" ? vals.filter((x) => x === cv).length : vals.filter((x) => (cv ? x > 0 : x === 0)).length)), mx = Math.max(...cnt), bw = (W - 2 * pad) / cats.length;
      cats.forEach((cv, i) => { const ok = a.k === "ro5" ? cv <= v : !v || cv === 0, h = (cnt[i] / mx) * (H - 44), x = pad + i * bw;
        svg += `<rect x="${x + 6}" y="${H - 22 - h}" width="${bw - 12}" height="${h}" fill="${ok ? "var(--fg)" : "var(--c)"}" opacity="0.85"/>
          <text x="${x + bw / 2}" y="${H - 26 - h}" text-anchor="middle">${cnt[i]}</text><text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${a.k === "ro5" ? `위반 ${cv}개` : cv ? "경고 있음" : "경고 없음"}</text>`; });
    }
    const f = funnelWith({ [a.k]: v }), i = AG.findIndex((x) => x.k === a.k);
    const rp = r ? passOne(a.k, r, v) : true;
    return `<svg class="hist" viewBox="0 0 ${W} ${H}" data-g="${a.g}" role="img" aria-label="${a.sym} 분포 220종">${svg}</svg>
      <div class="row" style="gap:12px;font-size:11.5px" class="muted"><span class="row" style="gap:4px"><i style="width:10px;height:10px;background:var(--fg);opacity:.8;display:inline-block"></i>통과</span><span class="row" style="gap:4px" data-g="${a.g}"><i style="width:10px;height:10px;background:var(--c);display:inline-block"></i>이 기준에 걸림</span>${r ? `<span class="row" style="gap:4px"><i style="width:8px;height:8px;background:var(--hi);outline:1px solid var(--ring);display:inline-block"></i>실제 약 ${esc(short(r.n, 8))}</span>` : ""}<span class="muted">동그라미 = 모둠원 제안</span></div>
      <dl class="conseq"><div><dt>이 안건에서 걸러짐</dt><dd>${f.steps[i].removed}<small>개</small></dd></div><div><dt>합의된 기준과 합치면</dt><dd>${f.final}<small>개 남음</small></dd></div>
        <div><dt>실제 약 ${r ? esc(short(r.n, 6)) : ""}</dt><dd style="color:var(--${rp ? "good" : "bad"})">${rp ? "통과" : "걸림"}</dd></div></dl>`;
  }

  /* 모둠 회의실 — 제안 · 투표 · 대화 */
  function room(a) {
    const g = S.ag[a.k], M0 = M();
    const votesFor = (pid) => Object.entries(g.votes).filter(([, x]) => x.pid === pid).map(([m]) => m);
    const myVote = g.votes[me()];
    const props = g.props.map((p) => {
      const vs = votesFor(p.id), f = funnelWith({ [a.k]: p.v }), r = CMP.get(M0.ref), rp = r ? passOne(a.k, r, p.v) : true;
      const reason = a.reasons.find((x) => x.k === p.why);
      const isWin = g.agreed && g.agreed.pid === p.id, open = !g.agreed && g.voteOpen === p.id;
      return `<div class="prop ${isWin ? "win" : ""}">
        <div class="ph1">${who(p.by)}<span class="val">${esc(ruleText(a.k, p.v))}</span>${isWin ? `<span class="stamp">합의</span>` : ""}</div>
        <span class="why">근거: ${esc(reason ? reason.t : "")}</span>
        <div class="eff"><span class="chip">이 안건 −${f.steps[AG.indexOf(a)].removed}</span><span class="chip ${f.final < 8 ? "no" : f.final > 40 ? "warn" : "ok"}">남는 후보 ${f.final}개</span><span class="chip ${rp ? "ok" : "no"}">실제 약 ${rp ? "통과" : "걸림"}</span></div>
        <div class="vt">${vs.map((m) => av(m, "sm")).join("")}<span class="cnt">${vs.length} / 4 찬성</span>
          ${g.agreed ? "" : myVote && myVote.pid === p.id ? `<span class="chip hi">내 표</span>` : `<button type="button" class="btn sm" data-voteopen="${p.id}">찬성하기</button>`}</div>
        ${open ? `<div class="vote-box"><span style="font-size:12.5px;font-weight:600">왜 이 안에 찬성하나요?</span>
          <div class="row">${a.reasons.map((r2) => `<button type="button" class="rch" data-vreason="${r2.k}" aria-pressed="${g.vwhy === r2.k}">${esc(r2.t)}</button>`).join("")}</div>
          ${g.vwhy ? coachFor(a, p.v, g.vwhy) : ""}
          <div class="row end"><button type="button" class="btn sm" data-act="votecancel">취소</button><button type="button" class="btn pri sm" data-vote="${p.id}" ${g.vwhy ? "" : "disabled"}>이 근거로 찬성</button></div></div>` : ""}
      </div>`;
    }).join("");
    const feed = g.feed.map((m) => {
      if (m.kind === "sys") return `<div class="msg"><span class="av sm" style="background:var(--fg);color:var(--bg)">회의</span><div class="b"><b>${esc(m.text)}</b></div></div>`;
      if (m.kind === "typing") return `<div class="msg typing">${av(m.by, "sm")}<div class="b">${esc(MM[m.by].name)} 님이 생각하는 중…</div></div>`;
      const p = g.props.find((x) => x.id === m.pid), r = p && a.reasons.find((x) => x.k === (m.why || p.why));
      const body = m.kind === "prop" ? `<b>${esc(ruleText(a.k, p.v))}</b> 안을 제안했어요. ${r ? esc(r.t) + "." : ""}` : m.kind === "vote" ? `${p ? `<b>${esc(ruleText(a.k, p.v))}</b> 안에 찬성. ` : ""}${r ? esc(r.t) + "." : ""}` : esc(m.text || "");
      return `<div class="msg">${av(m.by, "sm")}<div class="b"><span class="t">${esc(MM[m.by].name)} · ${MM[m.by].role}</span><br>${body}${m.extra ? `<br><span class="muted">${esc(m.extra)}</span>` : ""}</div></div>`;
    }).join("");
    const votes = Object.keys(g.votes).length;
    return `<p class="ptitle">모둠 회의 · ${a.label} <span class="tag">모두에게 보여요</span><span class="sp"></span>${g.agreed ? `<button type="button" class="btn sm" data-act="reopen">다시 논의</button>` : `<span class="mono" style="font-size:11px">${votes}/4 투표 · 3표면 합의</span>`}</p>
      <div class="props">${props}</div>
      <div class="feed" aria-label="회의 대화">${feed}</div>
      ${g.agreed ? "" : `<p class="p muted" style="font-size:12px">제안은 왼쪽 '내 작업대'에서 근거와 함께 올려요. 같은 값이라도 근거가 달라야 설득이 돼요.</p>`}`;
  }

  /* 투표 · 합의 */
  function castVote(k, pid, why, by = me()) {
    const g = S.ag[k];
    g.votes[by] = { pid, why };
    g.feed.push({ by, kind: "vote", pid, why });
    settle(k);
  }
  function settle(k) {
    const g = S.ag[k], a = AGM[k];
    if (g.agreed) return;
    const tally = {}; for (const x of Object.values(g.votes)) tally[x.pid] = (tally[x.pid] || 0) + 1;
    const win = Object.entries(tally).find(([, n]) => n >= 3);
    if (win) {
      const p = g.props.find((x) => x.id === win[0]);
      g.agreed = { v: p.v, pid: p.id, at: nowT() }; g.voteOpen = null; g.vwhy = null; g.draft = null;
      g.feed.push({ kind: "sys", text: `합의! ${ruleText(k, p.v)} — 찬성 ${win[1]}명` });
      toast(`${a.label} 안건 합의: ${ruleText(k, p.v)}`);
      const next = AG.find((x) => !S.ag[x.k].agreed); if (next) setTimeout(() => { if (S.step === 2 && S.agSel === k) { S.agSel = next.k; save(); renderWork(); } }, 1400);
    } else if (Object.keys(g.votes).length >= 4) {
      g.feed.push({ kind: "sys", text: "4명 모두 투표했지만 3표를 얻은 안이 없어요. 근거를 더 나누거나 절충안을 제안해 보세요." });
    }
  }
  /* 아직 투표하지 않은 모둠원이 직책 성향대로 따라 투표한다(미리보기용 흉내) */
  let timers = [];
  function teammateTurn(k) {
    const g = S.ag[k], a = AGM[k];
    if (g.agreed) return;
    const waiting = MEMBERS.map((m) => m.id).filter((id) => id !== me() && !g.votes[id]);
    if (!waiting.length) return;
    const id = waiting[0];
    g.feed.push({ by: id, kind: "typing" }); save(); if (S.step === 2 && S.agSel === k) renderWork();
    timers.push(setTimeout(() => {
      g.feed = g.feed.filter((m) => m.kind !== "typing");
      const M0 = M(), role = MM[id].role, ok = (p) => funnelWith({ [k]: p.v }).final >= 8;
      const strict = (p, q) => (a.op === "≥" ? p.v > q.v : a.k === "alert" ? (p.v === true ? 1 : 0) - (q.v === true ? 1 : 0) > 0 : p.v < q.v);
      const adv = M0.advice[a.cut];
      const fits = (p) => (a.k === "alert" ? p.v === adv : a.op === "≥" ? p.v >= adv - 0.05 : p.v <= adv);
      let pick;
      const cand = g.props.filter(ok);
      if (role === "CTO") pick = cand.slice().sort((p, q) => (strict(p, q) ? 1 : -1))[0];
      else if (role === "CMO") pick = cand.slice().sort((p, q) => (strict(p, q) ? -1 : 1))[0];
      else pick = cand.filter(fits).sort((p, q) => Math.abs(p.v - adv) - Math.abs(q.v - adv))[0] || cand[0];
      if (!pick) pick = g.props[0];
      /* 값과 맞는 근거 가운데 더 구체적인 것부터(뇌 투과 → 장기 복용 → 먹는 약 → …), CTO 는 '후보 지키기' 먼저 */
      const PRI = ["bbb", "long", "oral", "like", "ref", "gut", "fix", "soft", "bind", "keep"];
      const rs = a.reasons.filter((r) => !r.check(pick.v, M0)).sort((x, y) => PRI.indexOf(x.k) - PRI.indexOf(y.k));
      const why = (role === "CTO" ? rs.find((r) => r.k === "keep") : rs[0]) || rs[0] || a.reasons[0];
      const mv = g.votes[me()], mine = mv && g.props.find((p) => p.id === mv.pid);
      let extra = "";
      if (mine && mine.id !== pick.id) {
        const myR = a.reasons.find((r) => r.k === mv.why), c = myR && myR.check(mine.v, M0);
        extra = c ? `${MM[me()].short} 님 안에는 걱정이 있어요 — ${c.t}` : `${MM[me()].short} 님 안도 일리가 있지만, 저는 ${why.t.replace(/서$/, "서요")}`;
      }
      g.votes[id] = { pid: pick.id, why: why.k };
      g.feed.push({ by: id, kind: "vote", pid: pick.id, why: why.k, extra });
      settle(k); save();
      if (S.step === 2) renderWork(); else renderSteps();
    }, reduced ? 200 : 1300));
  }
  const renderSteps = () => { if (S.step !== 2) renderWork(); };

  /* ── ③ 스크리닝 실행 ── */
  let job = null;
  function stepRun() {
    const allOk = AG.every((a) => S.ag[a.k].agreed);
    const cut = cutNow(), f = funnel(cut);
    const last = S.runs[0];
    const crit = AG.map((a) => { const g = S.ag[a.k]; return `<span class="chip ${g.agreed ? "" : "warn"}" data-g="${a.g}">${g.agreed ? esc(ruleText(a.k, g.agreed.v)) : a.label + " 미정"}</span>`; }).join("");
    let res = "";
    if (job) {
      res = `<div class="job" aria-live="polite"><b>작업 web-${job.id} · bio-worker · source: dataset</b>${job.lines.map((l) => `<span>${esc(l)}</span>`).join("")}<div class="bar"><i style="width:${job.p}%"></i></div></div>`;
    } else if (last) res = runResult(last);
    return `<div class="col" style="margin-top:14px">
      <div class="split">
        <section class="col"><div class="pane"><p class="ptitle">합의한 기준 <span class="tag">모둠 공유</span></p>
          <div class="row">${crit}</div>
          ${allOk ? `<p class="p">무료 미리보기로는 <b>${f.final}개</b>가 남아요. 실행하면 이 결과가 모둠 기록으로 저장되고, 통과한 분자만 ④ 분자 쇼핑에 진열돼요.</p>`
            : `<div class="coach warn"><b>아직 합의하지 않은 안건이 있어요.</b>미정 안건은 거르지 않아서 후보가 많이 남아요. <button type="button" class="btn sm" data-step="2">회의로 돌아가기</button></div>`}
          ${S.confirmRun ? `<div class="claim-box"><b>연구비에서 ${KR(COST_RUN)} 크리스타가 나가요.</b><span class="p">남는 연구비 ${KR(S.budget - COST_RUN)} 크리스타. 다시 실행할 때마다 같은 비용이 들어요.</span>
              <div class="row end"><button type="button" class="btn" data-act="runcancel">취소</button><button type="button" class="btn pri" data-act="run">실행</button></div></div>`
            : `<div class="row end"><button type="button" class="btn pri" data-act="runask" ${allOk && !job ? "" : "disabled"}>${S.runs.length ? "이 기준으로 다시 실행" : "스크리닝 실행"} <span class="cost">${KR(COST_RUN)} 크리스타</span></button></div>`}</div>
          ${S.runs.length ? `<div class="pane"><p class="ptitle">실행 기록 <span class="tag">모둠 공유</span></p><table class="hist-runs"><thead><tr><th>회차</th><th>기준</th><th>실행</th><th class="num">통과</th></tr></thead><tbody>
            ${S.runs.map((r, i) => `<tr><td>${S.runs.length - i}차</td><td class="mono" style="font-size:11px">${AG.map((a) => esc(ruleText(a.k, r.cut[a.k]))).join(" · ")}</td><td>${av(r.by, "sm")}</td><td class="num">${r.n}</td></tr>`).join("")}</tbody></table></div>` : ""}
        </section>
        <section class="col"><div class="pane team-p"><p class="ptitle">결과 <span class="tag">모둠 공유</span></p>${res || `<p class="p muted">아직 실행하지 않았어요. 실행하면 220종이 합의한 기준을 차례로 지나가요.</p>${funBars(f, false)}`}</div></section>
      </div></div>`;
  }
  function funBars(f, done = true) {
    return `<div class="fun">${[{ k: "lib", label: "라이브러리", left: 220, removed: 0, rule: "220종" }].concat(f.steps.map((s) => ({ ...s, label: AGM[s.k].label, rule: ruleText(s.k, (f.cut || cutNow())[s.k]) }))).map((s, i, arr) => {
      const prev = i ? arr[i - 1].left : 220;
      return `<div class="fun-r ${i === arr.length - 1 && done ? "last" : ""}" data-g="${s.k}"><span class="lb">${s.label}<small>${esc(s.rule)}</small></span>
        <span class="bars"><i style="width:${(s.left / 220) * 100}%"></i><s style="width:${(s.removed / 220) * 100}%"></s></span><span class="nm">${s.left}${s.removed ? ` <span class="muted">−${s.removed}</span>` : ""}</span></div>`; }).join("")}</div>`;
  }
  function runResult(r) {
    const f = Object.assign(funnel(r.cut), { cut: r.cut }), n = f.final;
    const lv = n === 0 ? ["no", "후보 0개 — 너무 엄격해요"] : n < 8 ? ["no", "너무 적어요"] : n > 40 ? ["warn", "너무 많아요"] : ["ok", "알맞아요"];
    const msg = n === 0 ? "모든 분자가 걸러졌어요. 좋은 분자까지 버렸을 수 있어요(위음성). 가장 많이 걸러 낸 안건부터 다시 회의해 보세요."
      : n < 8 ? `${n}개면 모둠원 4명이 1~2개씩 찜하기에 모자라요. 좋은 분자를 버렸을 수도 있어요(위음성).`
      : n > 40 ? `후보가 ${n}개나 남았어요. 기준이 느슨하면 스크리닝이 덜 돼서, 약이 되기 어려운 분자도 섞여 있어요(위양성). 쇼핑할 때 더 꼼꼼히 골라야 해요.`
      : `${n}개면 모둠원이 나눠 살펴보고 1~2개씩 찜하기 좋은 양이에요.`;
    const all = D.compounds.slice().sort((x, y) => score(y) - score(x));
    const missed = all.filter((c) => !r.ids.includes(c.id)).slice(0, 3);
    const biggest = f.steps.slice().sort((x, y) => y.removed - x.removed)[0];
    return `${funBars(f)}
      <div class="verdict"><span class="big">${n}</span><span class="lv" style="color:var(--${lv[0] === "ok" ? "good" : lv[0] === "no" ? "bad" : "warn"})">${lv[1]}</span><span class="p">${esc(msg)}</span></div>
      <div class="gauge"><span style="flex:8" class="${n < 8 ? "on" : ""}">적음 0~7</span><span style="flex:32" class="${n >= 8 && n <= 40 ? "on" : ""}">알맞음 8~40</span><span style="flex:40" class="${n > 40 ? "on" : ""}">많음 41~</span></div>
      <p class="p">가장 많이 걸러 낸 안건: <b>${AGM[biggest.k].label}</b>(−${biggest.removed}). 2.1 에서 후보를 모두 도킹하면 ${n} × ${KR(COST_DOCK)} = <b>${KR(n * COST_DOCK)} 크리스타</b>(연구비의 ${Math.round((n * COST_DOCK) / S.budget * 100)}%)가 들어요.</p>
      ${missed.length ? `<details class="expl"><summary>걸러진 분자 중 표적 점수가 높았던 3개 — 놓친 걸까요?</summary><div>${missed.map((c) => { const ff = firstFail(c, r.cut);
        return `<div class="row sb"><span><b>${esc(short(c.n, 20))}</b> <span class="mono muted">점수 ${score(c).toFixed(3)}</span></span><span class="chip no" data-g="${ff ? ff.g : ""}">${ff ? esc(ff.label) + "에서 걸림 · " + fmtVal(ff.k, rawVal(ff.k, c)) : ""}</span></div>`; }).join("")}
        <span class="muted">이 분자들은 정말 약이 되기 어려운 걸까요, 우리가 기준을 너무 엄격하게 잡은 걸까요? ⑤ 연구 노트의 '무엇을 모르나' 칸에 써 보세요.</span></div></details>` : ""}
      <div class="row end"><button type="button" class="btn" data-act="remeet">기준 다시 회의</button><button type="button" class="btn pri" data-step="4" ${n ? "" : "disabled"}>통과한 ${n}개 쇼핑하러 →</button></div>`;
  }
  function startRun() {
    S.confirmRun = false;
    const cut = cutNow(), f = funnel(cut);
    job = { id: Math.random().toString(16).slice(2, 8), p: 0, lines: ["대기열에 올림 · 모둠 채널에 알림"] };
    S.budget -= COST_RUN; renderTop(); const mEl = $("money"); if (mEl) { mEl.classList.add("spent"); setTimeout(() => mEl.classList.remove("spent"), 1600); }
    const seq = [[15, "ChEMBL v34 · ZINC · 사내 라이브러리 220종 불러오기"], [40, "RDKit 물성 계산 — MW · TPSA · logP · HBD · HBA · QED"], [65, "구조 경고 검색 — 방향족 아민 · 니트로"], [88, `합의 기준 적용 — 220 → ${f.final}`], [100, `${M().gene} 표적 점수 순으로 정렬 · 저장`]];
    let i = 0;
    const tick = () => {
      if (!job) return;
      const [p, l] = seq[i++]; job.p = p; job.lines.push(l); if (S.step === 3) renderWork();
      if (i < seq.length) timers.push(setTimeout(tick, reduced ? 80 : 520));
      else timers.push(setTimeout(() => {
        S.runs.unshift({ cut, n: f.final, ids: f.ids, by: me(), at: nowT() }); job = null;
        S.shop.page = 0;
        news(`◆ SEUM 화합물 스크리닝 ${S.runs.length > 1 ? "다시 실행" : "완료"} — 후보 ${f.final}종`, f.final ? "ours" : "bad");
        save(); renderWork(); toast(`스크리닝 완료 — ${f.final}개 통과`);
      }, reduced ? 80 : 500));
    };
    renderWork(); timers.push(setTimeout(tick, reduced ? 60 : 400));
  }

  /* ── ④ 분자 쇼핑 ── */
  const claimOf = (id) => S.claims.find((c) => c.id === id);
  const myClaims = (m = me()) => S.claims.filter((c) => c.by === m);
  const CLAIM_R = [
    { k: "top", t: "표적 점수가 높아요", check: (c, rank) => (rank > 10 ? { lv: "warn", t: `통과한 분자 중 ${rank}위예요. 더 높은 분자가 있는데도 고른 이유가 있나요?` } : null) },
    { k: "bbb", t: "뇌로 잘 갈 것 같아요(TPSA 낮음)", check: (c) => (c.tpsa > 90 ? { lv: "no", t: `TPSA ${c.tpsa.toFixed(0)} — 90 보다 커서 뇌혈관 장벽을 넘기 어려워요.` } : null) },
    { k: "qed", t: "약다움(QED)이 높아요", check: (c) => (c.qed < 0.6 ? { lv: "warn", t: `QED ${c.qed.toFixed(2)} — 통과는 했지만 높은 편은 아니에요.` } : null) },
    { k: "small", t: "작고 가벼워요(MW)", check: (c) => (c.mw > 400 ? { lv: "warn", t: `MW ${c.mw.toFixed(0)} — 작은 편은 아니에요.` } : null) },
    { k: "diverse", t: "다른 모둠원과 다른 종류라서(다양성)", check: (c) => { const libs = S.claims.filter((x) => x.by !== me()).map((x) => CMP.get(x.id).lib); return libs.length && libs.every((l) => l === c.lib) ? { lv: "warn", t: `다른 모둠원도 모두 '${c.lib}'에서 골랐어요. 정말 다른 종류일까요?` } : null; } },
    { k: "known", t: "이미 승인된 약이라 안전해 보여요", check: (c) => (c.lib !== "ChEMBL 승인약" ? { lv: "no", t: `이 분자는 '${c.lib}'예요. 승인약이 아니에요.` } : c.id === M().ref ? { lv: "warn", t: "이 표적의 기존 약 그 자체예요. 새 약으로 물질특허(3.1)를 받기 어려울 수 있어요." } : null) }
  ];
  function shopList() {
    const r = S.runs[0]; if (!r) return [];
    let list = r.ids.map((id, i) => Object.assign({}, CMP.get(id), { rank: i + 1 }));
    const q = S.shop.q.trim().toLowerCase();
    if (q) list = list.filter((c) => c.n.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
    for (const f of S.shop.f) list = list.filter(FILTERS[f].fn);
    const sorts = { score: (a, b) => a.rank - b.rank, qed: (a, b) => b.qed - a.qed, tpsa: (a, b) => a.tpsa - b.tpsa, mw: (a, b) => a.mw - b.mw };
    return list.sort(sorts[S.shop.sort]);
  }
  const FILTERS = {
    free: { t: "아직 찜 안 됨", fn: (c) => !claimOf(c.id) },
    bbb: { t: "TPSA ≤ 90", fn: (c) => c.tpsa <= 90 },
    qed: { t: "QED ≥ 0.67", fn: (c) => c.qed >= 0.67 },
    appr: { t: "승인약", fn: (c) => c.lib === "ChEMBL 승인약" },
    new: { t: "사내 · ZINC", fn: (c) => c.lib !== "ChEMBL 승인약" }
  };
  function stepShop() {
    const r = S.runs[0];
    if (!r) return `<div class="pane" style="margin-top:14px"><p class="q">아직 진열된 분자가 없어요.</p><p class="p">③ 에서 스크리닝을 실행하면 통과한 분자만 진열돼요.</p><div class="row"><button type="button" class="btn pri" data-step="3">스크리닝 실행으로</button></div></div>`;
    const list = shopList(), per = 12, pages = Math.max(1, Math.ceil(list.length / per)), page = Math.min(S.shop.page, pages - 1), view = list.slice(page * per, page * per + per);
    const top = r.ids[0] ? score(CMP.get(r.ids[0])) : 1;
    const cards = view.map((c) => { const cl = claimOf(c.id), mine = cl && cl.by === me();
      return `<article class="pc ${mine ? "mine" : ""}"><span class="rk">${c.rank}위</span>${cl ? `<span class="clm">${av(cl.by, "sm")}</span>` : ""}
        ${mol(c.s, 220, 112)}<div class="pn" title="${esc(c.n)}">${esc(short(c.n, 22))}</div><div class="pl">${esc(c.lib)} · ${esc(c.id)}</div>
        <div class="score"><span>${M().gene}</span><span class="sb"><i style="width:${(score(c) / top) * 100}%"></i></span><b>${score(c).toFixed(3)}</b></div>
        <div class="tags"><span class="chip">MW ${c.mw.toFixed(0)}</span><span class="chip ${c.tpsa <= 90 ? "ok" : ""}">TPSA ${c.tpsa.toFixed(0)}</span><span class="chip">logP ${c.logp.toFixed(1)}</span><span class="chip ${c.qed >= 0.67 ? "ok" : ""}">QED ${c.qed.toFixed(2)}</span></div>
        <div class="pf"><button type="button" class="btn sm" data-detail="${c.id}">자세히</button>${cl ? (mine ? `<button type="button" class="btn sm hi" data-unclaim="${c.id}">✓ 내 찜</button>` : `<button type="button" class="btn sm" disabled>${esc(MM[cl.by].short)} 님 찜</button>`)
          : `<button type="button" class="btn sm pri" data-claim="${c.id}" ${myClaims().length >= CLAIM_MAX ? "disabled" : ""}>${myClaims().length >= CLAIM_MAX ? "내 찜 2개 꽉 참" : "찜하기"}</button>`}</div></article>`; }).join("");
    return `<div class="split shop" style="margin-top:14px">
      <section class="col"><div class="pane"><p class="ptitle">진열대 <span class="tag">스크리닝 통과 ${r.ids.length}개</span><span class="sp"></span><span class="mono" style="font-size:11px">${r.at} · ${S.runs.length}차 실행</span></p>
        <div class="shop-tools"><input type="search" id="shop-q" placeholder="이름이나 ChEMBL 번호로 찾기" value="${esc(S.shop.q)}" aria-label="분자 찾기">
          <select id="shop-sort" aria-label="정렬"><option value="score" ${S.shop.sort === "score" ? "selected" : ""}>${M().gene} 점수 높은 순</option><option value="qed" ${S.shop.sort === "qed" ? "selected" : ""}>QED 높은 순</option><option value="tpsa" ${S.shop.sort === "tpsa" ? "selected" : ""}>TPSA 낮은 순</option><option value="mw" ${S.shop.sort === "mw" ? "selected" : ""}>MW 작은 순</option></select></div>
        <div class="row" style="gap:5px">${Object.entries(FILTERS).map(([k, f]) => `<button type="button" class="fchip" data-filter="${k}" aria-pressed="${S.shop.f.includes(k)}">${esc(f.t)}</button>`).join("")}<span class="muted" style="font-size:12px">${list.length}개</span></div>
        ${S.claimFor ? claimBox(S.claimFor) : ""}
        ${view.length ? `<div class="shelf">${cards}</div>` : `<p class="empty">조건에 맞는 분자가 없어요. 필터를 줄여 보세요.</p>`}
        ${pages > 1 ? `<div class="pager"><button type="button" class="btn sm" data-page="${page - 1}" ${page ? "" : "disabled"}>←</button><span>${page + 1} / ${pages}</span><button type="button" class="btn sm" data-page="${page + 1}" ${page < pages - 1 ? "" : "disabled"}>→</button></div>` : ""}</div></section>
      <section class="col">${cart()}</section></div>`;
  }
  function claimBox(id) {
    const c = CMP.get(id), r = S.runs[0], rank = r.ids.indexOf(id) + 1, sel = S.claimWhy;
    const rr = CLAIM_R.find((x) => x.k === sel), chk = rr && rr.check(c, rank);
    return `<div class="claim-box" id="claimbox"><div class="row sb"><b>${esc(short(c.n, 26))} 찜하기</b><span class="mono muted" style="font-size:11px">${rank}위 · 점수 ${score(c).toFixed(3)}</span></div>
      <span style="font-size:12.5px;font-weight:600">왜 이 분자인가요? <span class="muted" style="font-weight:400">근거는 2.1 비교표와 연구 노트에 함께 남아요</span></span>
      <div class="row">${CLAIM_R.map((x) => `<button type="button" class="rch" data-cwhy="${x.k}" aria-pressed="${sel === x.k}">${esc(x.t)}</button>`).join("")}</div>
      ${id === M().ref ? `<div class="coach warn"><b>이 분자는 ${esc(M().gene)} 의 기존 약이에요.</b>2.1 에 대조군으로 자동으로 붙어요. 새 약 후보로 찜하면 3.1 물질특허를 받기 어려울 수 있어요.</div>` : ""}
      ${sel ? (chk ? `<div class="coach ${chk.lv}"><b>${chk.lv === "no" ? "잠깐!" : "생각해 볼 점."}</b>${esc(chk.t)}</div>` : `<div class="coach ok"><b>근거가 데이터와 맞아요.</b></div>`) : ""}
      <div class="row end"><button type="button" class="btn" data-act="claimcancel">취소</button><button type="button" class="btn pri" data-act="claimok" ${sel && !(chk && chk.lv === "no") ? "" : "disabled"}>${MM[me()].short} 님 후보로 찜</button></div></div>`;
  }
  function cart() {
    const n = S.claims.length, members = new Set(S.claims.map((c) => c.by)).size;
    return `<div class="pane team-p"><p class="ptitle">모둠 장바구니 <span class="tag">모둠 공유 · 1인 2개까지</span></p>
      <div class="lanes">${MEMBERS.map((m) => { const cs = myClaims(m.id);
        return `<div class="lane ${m.id === me() ? "me" : ""}" data-m="${m.id}"><div class="lh">${who(m.id)}<span class="cnt">${cs.length}/${CLAIM_MAX}</span></div>
          ${cs.length ? cs.map((x) => { const c = CMP.get(x.id), rr = CLAIM_R.find((y) => y.k === x.why);
            return `<div class="citem"><b>${esc(short(c.n, 22))}</b>${m.id === me() ? `<button type="button" data-unclaim="${x.id}" aria-label="찜 빼기">✕</button>` : "<span></span>"}<span class="cw">${esc(rr ? rr.t : x.why)} · 점수 ${score(c).toFixed(3)}</span></div>`; }).join("")
            : `<span class="empty">${m.id === me() ? "진열대에서 '찜하기'를 눌러 보세요." : "아직 찜하지 않았어요."}</span>`}</div>`; }).join("")}</div>
      <dl class="conseq"><div><dt>찜한 후보</dt><dd>${n}<small>개</small></dd></div><div><dt>참여한 모둠원</dt><dd>${members}<small>/4</small></dd></div><div><dt>2.1 도킹 예상</dt><dd style="font-size:13px">${KR((n + 1) * COST_DOCK)}<small> 크리스타</small></dd></div></dl>
      <p class="p muted" style="font-size:12px">2.1 에서는 찜한 후보에 대조군(실제 약 ${esc(short(CMP.get(M().ref).n, 10))})이 자동으로 붙어요. 4명이 모두 찜하면 투자 심사 '4인 병렬 발굴' 점수가 올라가요.</p>
      <div class="row end"><button type="button" class="btn pri" data-step="5" ${n ? "" : "disabled"}>후보 확정하고 넘기기 →</button></div></div>`;
  }
  /* 다른 모둠원도 쇼핑한다(미리보기 흉내) */
  function seedShop() {
    const r = S.runs[0]; if (!r || S.seededShop || !r.ids.length) return;
    S.seededShop = true;
    const first = r.ids.find((id) => !claimOf(id) && id !== M().ref);
    if (first && me() !== "m2") S.claims.push({ id: first, by: "m2", why: "top" });
  }
  function teammatesShop() {
    const r = S.runs[0]; if (!r || S.autoShop) return; S.autoShop = true;
    const plan = [
      ["m3", (c) => c.lib !== "ChEMBL 승인약", "diverse"],
      ["m4", (c) => c.qed >= 0.67, "qed"]
    ].filter(([m]) => m !== me());
    plan.forEach(([m, fn, why], i) => timers.push(setTimeout(() => {
      const pool = r.ids.filter((id) => id !== M().ref).map((id) => CMP.get(id));
      const pick = pool.find((c) => !claimOf(c.id) && fn(c)) || pool.find((c) => !claimOf(c.id));
      if (!pick || myClaims(m).length >= CLAIM_MAX) return;
      S.claims.push({ id: pick.id, by: m, why }); save();
      toast(`${MM[m].name} 님이 ${short(pick.n, 14)}을(를) 찜했어요`);
      if (S.step === 4) renderWork();
    }, (reduced ? 300 : 1800) * (i + 1))));
  }

  /* ── ⑤ 넘기기 ── */
  function stepHand() {
    const r = S.runs[0], ref = CMP.get(M().ref);
    if (!r || !S.claims.length) return `<div class="pane" style="margin-top:14px"><p class="q">아직 넘길 후보가 없어요.</p><p class="p">③ 스크리닝을 실행하고 ④ 에서 후보를 찜하면 2.1 분자 도킹으로 넘길 수 있어요.</p><div class="row"><button type="button" class="btn pri" data-step="${r ? 4 : 3}">${r ? "분자 쇼핑으로" : "스크리닝 실행으로"}</button></div></div>`;
    const cutTxt = AG.map((a) => ruleText(a.k, r.cut[a.k])).join(" · ");
    const NOTE = [
      ["why", "① 왜 이 기준을 골랐나", "컷오프 설정 근거 — 미션과 지표로"],
      ["unknown", "② 무엇을 모르나", "걸러진 분자 중 놓쳤을 가능성"],
      ["fallback", "③ 실패하면 무엇을 바꾸나", "다시 스크리닝한다면 바꿀 기준"]];
    const writers = new Set(Object.values(S.notes).filter(Boolean).filter((n) => n.text.trim()).map((n) => n.by));
    return `<div class="split" style="margin-top:14px">
      <section class="col"><div class="pane"><p class="ptitle">연구 노트 · 1.2 <span class="tag">모둠 공유 · 칸마다 쓴 사람 표시</span></p>
        <div class="note3">${NOTE.map(([k, t, s]) => { const n = S.notes[k];
          return `<label for="note-${k}">${t}<small>${s}${n && n.text ? ` · 마지막 ${esc(MM[n.by].short)}` : ""}</small><textarea id="note-${k}" data-note="${k}" placeholder="${esc(s)}">${esc(n ? n.text : "")}</textarea></label>`; }).join("")}</div>
        <p class="p muted" style="font-size:12px">세 칸을 서로 다른 모둠원이 쓰면 연구비 ×1.2 (지금 ${writers.size}명). 미리보기 도구에서 모둠원을 바꿔 써 보세요. 노트를 안 써도 다음 단계로 갈 수 있어요.</p></div>
        <div class="pane"><p class="ptitle">학습 연구비 문항 · 중급 <span class="tag">선택</span></p>
          <p class="p">컷오프 <b class="mono" style="font-size:12px">${esc(cutTxt)}</b>로 220 → ${r.n}종이 남았다. ${M().gene} 이 ${M().cns === "must" ? "뇌(중추신경계)" : "뇌가 아닌(말초)"} 표적일 때 이 컷오프가 타당한가, 무엇을 바꾸겠나?</p>
          <textarea id="quiz" data-quiz="1" placeholder="두세 문장으로 써 보세요.">${esc(S.quiz)}</textarea>
          <div class="row end"><button type="button" class="btn sm" data-act="quiz" ${S.quiz.trim().length > 10 ? "" : "disabled"}>제출</button></div></div></section>
      <section class="col"><div class="recv"><h3>1.2 스크리닝 확정서</h3>
          <div class="rl"><span>표적</span><span>${M().gene} · ${esc(M().disease)}</span></div>
          ${AG.map((a) => { const g = S.ag[a.k], p = g.agreed && g.props.find((x) => x.id === g.agreed.pid), n = Object.values(g.votes).filter((x) => g.agreed && x.pid === g.agreed.pid).length;
            return `<div class="rl"><span>${a.label}</span><span>${esc(ruleText(a.k, r.cut[a.k]))}${p ? ` · ${esc(MM[p.by].short)} 제안 · 찬성 ${n}` : ""}</span></div>`; }).join("")}
          <div class="rl"><span>스크리닝</span><span>${S.runs.length}회 · 220 → ${r.n}</span></div>
          <div class="rl"><span>연구비 사용</span><span>${KR(S.runs.length * COST_RUN)} 크리스타</span></div>
          <b style="font-family:var(--sans);margin-top:6px">2.1 도킹 대기열</b>
          ${S.claims.map((x) => `<div class="rl"><span>${esc(short(CMP.get(x.id).n, 22))}</span><span>${esc(MM[x.by].short)} · ${esc((CLAIM_R.find((y) => y.k === x.why) || {}).t || "")}</span></div>`).join("")}
          <div class="rl"><span>${esc(short(ref.n, 22))}</span><span>대조군 · 자동</span></div>
          <div class="rl"><span>도킹 예상 비용</span><span>${S.claims.length + 1} × ${KR(COST_DOCK)} = ${KR((S.claims.length + 1) * COST_DOCK)}</span></div></div>
        ${S.done ? `<div class="coach ok"><b>2.1 분자 도킹으로 보냈어요.</b>사이드바의 2.1 이 열렸어요. (이 미리보기는 1.2 까지만 담고 있어요.)</div>`
          : `<div class="row end"><button type="button" class="btn" data-step="4">더 고르기</button><button type="button" class="btn pri" data-act="hand">2.1 분자 도킹으로 보내기</button></div>`}
        ${new Set(S.claims.map((c) => c.by)).size < 4 && !S.done ? `<div class="coach warn"><b>아직 찜하지 않은 모둠원이 있어요.</b>1인 1~2개씩 맡으면 2.1 에서 4명이 동시에 도킹할 수 있어요.</div>` : ""}</section></div>`;
  }

  /* ── 지표 서랍 · 분자 서랍 ── */
  function openDrawer(html) {
    $("layer").innerHTML = `<div class="scrim" data-act="close"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="자세히">${html}</aside>`;
    drawMols($("layer"));
    const b = $("layer").querySelector("[data-act=close].btn"); if (b) b.focus();
  }
  function openInd(k) {
    openDrawer(`<div class="row sb"><h2>지표 사전</h2><button type="button" class="btn sm" data-act="close">닫기</button></div>
      <p class="p muted">미션: ${esc(M().title)}</p>
      ${Object.entries(IND).map(([kk, d]) => `<div class="ent ${kk === k ? "flash" : ""}" id="d-${kk}"><h3>${d.name} <span class="mono">${d.sym}${d.unit ? " · " + d.unit : ""}</span></h3><p style="margin:0">${d.what}</p><p class="an" style="margin:0">${d.an}</p><p style="margin:0;font-weight:600">${d.good}</p></div>`).join("")}`);
    const e = document.getElementById("d-" + k); if (e) e.scrollIntoView({ block: "start" });
  }
  function openDetail(id) {
    const c = CMP.get(id), r = S.runs[0], rank = r ? r.ids.indexOf(id) + 1 : 0, cl = claimOf(id), M0 = M();
    const rows = [["mw", c.mw.toFixed(1), M0.advice.mwMax && c.mw <= M0.advice.mwMax], ["tpsa", c.tpsa.toFixed(1), c.tpsa <= M0.advice.tpsaMax], ["logp", c.logp.toFixed(2), c.logp <= 5],
      ["ro5", c.ro5 + "개", c.ro5 <= M0.advice.ro5Max], ["alert", c.al.length ? c.al.map((x) => (x === "aromatic_amine" ? "방향족 아민" : "니트로")).join(" · ") : "없음", !c.al.length], ["qed", c.qed.toFixed(2), c.qed >= M0.advice.qedMin], ["score", score(c).toFixed(3), true]];
    openDrawer(`<div class="row sb"><h2>${esc(c.n)}</h2><button type="button" class="btn sm" data-act="close">닫기</button></div>
      <span class="mono muted" style="font-size:11.5px">${esc(c.id)} · ${esc(c.lib)}${rank ? ` · 통과 중 ${rank}위` : ""}</span>
      <div class="ent" style="border:0;padding:0">${mol(c.s, 380, 160)}</div>
      ${c.mech ? `<p class="p muted">${esc(c.mech)}</p>` : ""}
      <table class="hist-runs"><thead><tr><th>지표</th><th class="num">값</th><th>미션 조언</th></tr></thead><tbody>
      ${rows.map(([k, v, ok]) => `<tr><td>${ind(k, IND[k].name)}</td><td class="num">${esc(v)}</td><td>${k === "score" ? `<span class="chip">2.1 에서 확인</span>` : ok ? `<span class="chip ok">맞음</span>` : `<span class="chip warn">벗어남</span>`}</td></tr>`).join("")}</tbody></table>
      <p class="p muted" style="font-size:12px">'미션 조언'은 참고값이에요. 모둠이 합의한 기준은 통과했어요.</p>
      ${cl ? `<div class="coach">${esc(MM[cl.by].name)} 님이 찜했어요.</div>` : S.step === 4 ? `<div class="row end"><button type="button" class="btn pri" data-claim="${c.id}" ${myClaims().length >= CLAIM_MAX ? "disabled" : ""}>찜하기</button></div>` : ""}`);
  }
  function closeDrawer() { $("layer").innerHTML = ""; }

  /* ════════ 이벤트 ════════ */
  function render() { renderTop(); renderSide(); renderWork(); renderPV(); save(); }
  function go(n) {
    S.step = n;
    if (n === 4) { seedShop(); teammatesShop(); }
    save(); renderWork(); scrollTo({ top: Math.min(scrollY, $("work").offsetTop), behavior: "auto" });
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, [data-act]"); if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.ind) return openInd(d.ind);
    if (d.step) { closeDrawer(); return go(+d.step); }
    if (d.viewer) { S.viewer = d.viewer; for (const a of AG) { S.ag[a.k].draft = null; S.ag[a.k].pwhy = null; S.ag[a.k].voteOpen = null; S.ag[a.k].vwhy = null; } S.claimFor = null; render(); toast(`이제 ${MM[d.viewer].name}(${MM[d.viewer].role}) 화면이에요`); return; }
    if (d.warm) { S.warm[d.warm][me()] = d.v; save(); return renderWork(); }
    if (d.ag) { S.agSel = d.ag; save(); return renderWork(); }
    if (d.draft != null) { const a = AGM[S.agSel]; S.ag[a.k].draft = a.k === "alert" ? d.draft === "true" : +d.draft; return renderWork(); }
    if (d.preason) { S.ag[S.agSel].pwhy = d.preason; return renderWork(); }
    if (d.voteopen) { const g = S.ag[S.agSel]; g.voteOpen = d.voteopen; g.vwhy = null; return renderWork(); }
    if (d.vreason) { S.ag[S.agSel].vwhy = d.vreason; return renderWork(); }
    if (d.vote) { const k = S.agSel, g = S.ag[k], why = g.vwhy; g.voteOpen = null; g.vwhy = null; castVote(k, d.vote, why); save(); renderWork(); teammateTurn(k); return; }
    if (d.claim) { closeDrawer(); S.claimFor = d.claim; S.claimWhy = null; renderWork(); const b = $("claimbox"); if (b) b.scrollIntoView({ block: "nearest" }); return; }
    if (d.cwhy) { S.claimWhy = d.cwhy; return renderWork(); }
    if (d.unclaim) { S.claims = S.claims.filter((c) => !(c.id === d.unclaim && c.by === me())); save(); return renderWork(); }
    if (d.detail) return openDetail(d.detail);
    if (d.filter) { const f = S.shop.f; S.shop.f = f.includes(d.filter) ? f.filter((x) => x !== d.filter) : f.concat(d.filter); S.shop.page = 0; save(); return renderWork(); }
    if (d.page != null) { S.shop.page = +d.page; save(); renderWork(); const s = document.querySelector(".shelf"); if (s) s.scrollIntoView({ block: "start" }); return; }
    switch (d.act) {
      case "close": return closeDrawer();
      case "noop": return toast("미리보기에서는 열리지 않아요");
      case "led": ledPaused = !ledPaused; return renderLED();
      case "reset": timers.forEach(clearTimeout); timers = []; job = null; S = fresh(S.tid); render(); renderLED(); return toast("처음부터 다시 시작했어요");
      case "read": S.read[me()] = true; if (!S.read.m4) timers.push(setTimeout(() => { S.read.m4 = true; save(); if (S.step === 1) renderWork(); toast("정민준 님도 다 읽었어요"); }, reduced ? 200 : 1500)); save(); return renderWork();
      case "propose": {
        const a = AGM[S.agSel], g = S.ag[a.k], v = draftVal(a), why = g.pwhy;
        let p = g.props.find((x) => x.by === me());
        if (p) { p.v = v; p.why = why; } else { p = { id: `${a.k}-${me()}-${Date.now().toString(36)}`, by: me(), v, why }; g.props.push(p); }
        g.feed.push({ by: me(), kind: "prop", pid: p.id });
        if (!g.votes[me()]) { g.votes[me()] = { pid: p.id, why }; }
        g.pwhy = null; g.draft = null; settle(a.k); save(); renderWork(); toast("모둠에 제안했어요"); teammateTurn(a.k); return;
      }
      case "votecancel": { const g = S.ag[S.agSel]; g.voteOpen = null; g.vwhy = null; return renderWork(); }
      case "reopen": { const k = S.agSel, g = S.ag[k]; g.agreed = null; g.votes = {}; g.feed.push({ kind: "sys", text: `${MM[me()].name} 님이 다시 논의하자고 했어요. 투표를 새로 해요.` }); save(); renderWork(); return; }
      case "runask": S.confirmRun = true; return renderWork();
      case "runcancel": S.confirmRun = false; return renderWork();
      case "run": return startRun();
      case "remeet": { for (const a of AG) { const g = S.ag[a.k]; if (g.agreed) { g.agreed = null; g.votes = {}; g.feed.push({ kind: "sys", text: "스크리닝 결과를 보고 다시 회의해요. 이전 제안은 남아 있어요." }); } }
        S.agSel = AG[0].k; save(); return go(2); }
      case "claimcancel": S.claimFor = null; return renderWork();
      case "claimok": if (S.claimFor && !claimOf(S.claimFor) && myClaims().length < CLAIM_MAX) { S.claims.push({ id: S.claimFor, by: me(), why: S.claimWhy }); toast("찜했어요 — 모둠 장바구니에 올라갔어요"); }
        S.claimFor = null; S.claimWhy = null; save(); return renderWork();
      case "quiz": toast("제출했어요 — 실제 화면에서는 AI 가 채점해 연구비를 줘요"); return;
      case "hand": S.done = true; news(`◆ SEUM 2.1 분자 도킹 진입 — 후보 ${S.claims.length}종`); save(); renderSide(); renderWork(); return toast("2.1 분자 도킹으로 보냈어요");
    }
  });
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "draft") {
      const a = AGM[S.agSel], v = +t.value; S.ag[a.k].draft = v;
      $("draftv").textContent = `${a.op} ${fmtVal(a.k, v)}`;
      $("ev").innerHTML = evidence(a, v); $("fs").innerHTML = fstrip({ [a.k]: v });
      const g = S.ag[a.k]; if (g.pwhy) $("pcheck").innerHTML = coachFor(a, v, g.pwhy);
      const pb = document.querySelector('[data-act="propose"]'); if (pb) pb.textContent = `${g.props.find((p) => p.by === me()) ? "내 제안 고치기" : "모둠에 제안하기"} · ${ruleText(a.k, v)}`;
    } else if (t.id === "shop-q") { S.shop.q = t.value; S.shop.page = 0; const pos = t.selectionStart; renderWork(); const n = $("shop-q"); n.focus(); n.setSelectionRange(pos, pos); }
    else if (t.dataset.note) { S.notes[t.dataset.note] = { by: me(), text: t.value }; save(); }
    else if (t.dataset.quiz) { S.quiz = t.value; const b = document.querySelector('[data-act="quiz"]'); if (b) b.disabled = t.value.trim().length <= 10; save(); }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "shop-sort") { S.shop.sort = t.value; S.shop.page = 0; save(); renderWork(); }
    else if (t.id === "pv-tid") { timers.forEach(clearTimeout); timers = []; job = null; const v = S.viewer; S = fresh(t.value); S.viewer = v; render(); renderLED(); toast(`표적을 ${MISSIONS[t.value].gene}(으)로 바꿔 처음부터 시작했어요`); }
    else if (t.id === "draft") save();
    else if (t.dataset.note) renderWork();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("layer").innerHTML) closeDrawer(); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => renderWork());
  new MutationObserver(() => renderWork()).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* 걸음 바로 열기: #s1~#s5 */
  const h = (location.hash.match(/^#s([1-5])$/) || [])[1];
  if (h) S.step = +h;
  if (S.step === 4) { seedShop(); }
  render(); renderLED();
})();
