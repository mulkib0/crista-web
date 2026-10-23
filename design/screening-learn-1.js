/* 활동 01–10 — 화합물 스크리닝 학습. 공통 뼈대(screening-learn-30.html)의 SV.add 로 등록한다. */
(() => {
  "use strict";

  /* 01 지표 카드 뒤집기 — 앞면은 질문, 뒷면은 설명과 이 미션의 실제 예. */
  const Q01 = {
    mw: "분자가 무거우면 왜 문제일까?", tpsa: "물과 친한 겉면이 넓으면 어디를 못 지나갈까?", logp: "기름을 좋아하는 게 좋은 걸까, 나쁜 걸까?",
    hbd: "물과 손을 너무 많이 잡으면?", hba: "손을 받아 주는 자리도 세는 이유는?", ro5: "'5규칙'인데 왜 규칙이 4개일까?",
    alert: "몸속에서 독이 되는 부품이 있다고?", qed: "'약처럼 생겼다'를 숫자로 잴 수 있을까?", score: "잘 붙는 분자면 무조건 좋은 걸까?"
  };
  const flipped01 = new Set();
  SV.add({
    id: "01",
    line: "카드 앞면의 질문을 먼저 생각해 보고, 눌러서 뒷면의 설명을 확인하세요. 뒷면에는 이 미션의 실제 약과 기준에 걸리는 분자가 나란히 나옵니다.",
    goal: "스크리닝에 쓰는 지표 9개가 각각 무엇을 재고, 왜 약에 중요한지",
    render(el, ctx) {
      const { IND, XM, M, esc, short } = ctx;
      const keys = IND.filter((d) => Q01[d.k]);
      const ref = XM.get(M.ref);
      /* 이 지표에서 가장 크게 벗어난 분자 하나 — '나쁜 예' */
      const badEx = (d) => {
        const bad = ctx.X.filter((c) => !d.ok(c, ctx.S));
        if (!bad.length) return null;
        return bad.sort((a, b) => (d.k === "qed" ? d.val(a) - d.val(b) : d.val(b) - d.val(a)))[Math.min(2, bad.length - 1)];
      };
      const card = (d) => {
        const on = flipped01.has(d.k), b = badEx(d);
        return `<button type="button" class="fc ${on ? "on" : ""}" data-f="${d.gate || ""}" data-flip="${d.k}" aria-pressed="${on}">
          ${on ? `<span class="fs">${d.sym} · ${d.name}</span><span class="fw">${d.what}</span><span class="fa">${d.an}</span><span class="fg">${d.good}</span>
            <span class="fx">${ref ? `<span class="chip ok">실제 약 ${esc(short(ref.n, 10))} ${d.fmt(d.val(ref))}</span>` : ""}${b && d.k !== "score" ? `<span class="chip no">걸리는 예 ${esc(short(b.n, 10))} ${d.fmt(d.val(b))}</span>` : ""}</span>`
          : `<span class="fsym">${d.sym}</span><span class="fn">${d.name}</span><span class="fq">${Q01[d.k]}</span><span class="fh">눌러서 뒤집기</span>`}
        </button>`;
      };
      const n = keys.filter((d) => flipped01.has(d.k)).length;
      el.innerHTML = `<style>
          .fc { border: 1px solid var(--line-strong); background: var(--bg); text-align: left; padding: 14px; min-height: 196px; display: flex; flex-direction: column; gap: 6px; position: relative; }
          .fc::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--c, var(--faint)); }
          .fc:hover { border-color: var(--fg); }
          .fc .fsym { font-family: var(--mono); font-size: 28px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.1; margin-top: 6px; }
          .fc .fn { font-size: 13px; color: var(--muted); }
          .fc .fq { font-size: 15px; font-weight: 600; line-height: 1.4; margin-top: auto; text-wrap: balance; }
          .fc .fh { font-family: var(--mono); font-size: 10.5px; color: var(--muted); letter-spacing: 0.06em; }
          .fc.on { background: var(--surface); }
          .fc .fs { font-family: var(--mono); font-size: 12px; font-weight: 600; margin-top: 4px; }
          .fc .fw { font-size: 12.5px; line-height: 1.5; }
          .fc .fa { font-size: 12.5px; line-height: 1.5; border-left: 2px solid var(--hi); padding-left: 8px; color: var(--muted); }
          .fc .fg { font-size: 12.5px; font-weight: 600; }
          .fc .fx { display: flex; gap: 4px; flex-wrap: wrap; margin-top: auto; }
        </style>
        <div class="row" style="justify-content:space-between"><p class="q">카드 ${keys.length}장 — 질문에 먼저 답해 보고 뒤집으세요</p><span class="mono muted">${n} / ${keys.length}</span></div>
        <div class="prog">${keys.map((d) => `<i class="${flipped01.has(d.k) ? "on" : ""}"></i>`).join("")}</div>
        <div class="grid" style="--min:280px">${keys.map(card).join("")}</div>
        ${n === keys.length ? `<div class="fb right"><b>다 읽었어요.</b> 이제 왼쪽 사전에서 미션에 맞게 내 기준을 정하거나, 활동 04 '통과할까? 예측 퀴즈'로 확인해 보세요.</div>`
          : `<div class="fb">밑줄 친 지표 이름(${ctx.ind("tpsa")} 처럼)은 어느 활동에서든 누르면 왼쪽 사전이 열려요.</div>`}
        <div class="row"><button type="button" class="btn sm" data-all="1">모두 뒤집기</button><button type="button" class="btn sm" data-all="0">모두 덮기</button></div>`;
      const onClick = (e) => {
        const f = e.target.closest("[data-flip]"), a = e.target.closest("[data-all]");
        if (f) { const k = f.dataset.flip; flipped01.has(k) ? flipped01.delete(k) : flipped01.add(k); ctx.rerender(); }
        else if (a) { keys.forEach((d) => (a.dataset.all === "1" ? flipped01.add(d.k) : flipped01.delete(d.k))); ctx.rerender(); }
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    }
  });
  /* ── 02~10 공통 도우미 ── */
  const shuffle = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickOne = (arr, r) => arr[Math.floor(r() * arr.length)];
  const listen = (el, map) => { for (const [t, f] of Object.entries(map)) el.addEventListener(t, f); return () => { for (const [t, f] of Object.entries(map)) el.removeEventListener(t, f); }; };
  const GATE_NUM = "①②③④⑤⑥";

  /* 02 실제 약과 나란히 — 미션의 실제 약 옆에 극단적인 분자를 세워 지표마다 비교 */
  const KIND02 = [
    { k: "big", lab: "가장 무거운 분자 (MW 큼)", by: (c) => c.mw, hi: true },
    { k: "polar", lab: "물과 아주 친한 분자 (TPSA 큼)", by: (c) => c.tpsa, hi: true },
    { k: "greasy", lab: "기름만 좋아하는 분자 (logP 큼)", by: (c) => c.logp, hi: true },
    { k: "hbd", lab: "물과 손을 많이 잡는 분자 (HBD 많음)", by: (c) => c.hbd * 100 + c.hba, hi: true },
    { k: "alert", lab: "경고 부품이 있는 분자", by: (c) => (c.al.length ? 1 + c.score : -1), hi: true },
    { k: "lowqed", lab: "약다움이 낮은 분자 (QED 낮음)", by: (c) => c.qed, hi: false },
    { k: "rival", lab: "점수가 가장 높은 분자", by: (c) => c.score, hi: true }
  ];
  const DIR02 = { mw: -1, tpsa: -1, hbd: -1, hba: -1, ro5: -1, alert: -1, qed: 1, score: 1 };
  const TXT02 = {
    mw: ["더 무거워서 장 벽을 지나 흡수되기 어려워요.", "더 가벼워서 흡수에 유리해요."],
    tpsa: ["물과 친한 겉면이 넓어 세포막(기름막)을 뚫기 어려워요.", "물과 친한 겉면이 좁아 막을 잘 지나요."],
    hbd: ["물과 손을 더 많이 잡아 막을 지나기 어려워요.", "물과 잡는 손이 적어 막을 잘 지나요."],
    hba: ["물의 손을 더 많이 받아 막을 지나기 어려워요.", "물에 덜 붙잡혀 막을 잘 지나요."],
    ro5: ["먹는 약 체크리스트를 더 많이 어겼어요.", "먹는 약 체크리스트를 덜 어겼어요."],
    alert: ["몸속에서 독이 될 수 있는 부품이 있어요.", "독이 될 부품이 더 적어요."],
    qed: ["실제 약과 덜 닮았어요.", "실제 약과 더 닮았어요."],
    score: ["표적에 덜 붙을 것 같아요.", "표적에 더 잘 붙을 것 같아요. 그래도 몸속에서 표적까지 가야 쓸모가 있어요."]
  };
  let kind02 = "big", nth02 = 0;
  SV.add({
    id: "02",
    line: "왼쪽은 이 미션의 실제 약, 오른쪽은 여러분이 고른 '극단적인' 분자예요. 지표마다 막대를 비교하고, 그 차이가 몸속에서 무슨 뜻인지 읽어 보세요.",
    goal: "지표 값이 크거나 작을 때 몸속에서 실제로 어떤 일이 생기는지",
    render(el, ctx) {
      const { X, XM, M, INDM, esc, short } = ctx;
      const ref = XM.get(M.ref);
      const kd = KIND02.find((k) => k.k === kind02) || KIND02[0];
      const pool = X.filter((c) => c.id !== M.ref && (kd.k !== "alert" || c.al.length)).sort((a, b) => (kd.hi ? kd.by(b) - kd.by(a) : kd.by(a) - kd.by(b)));
      const cmp = pool[nth02 % Math.min(5, pool.length)];
      const keys = ["mw", "tpsa", "logp", "hbd", "hba", "ro5", "alert", "qed", "score"];
      const rng = (k) => { const v = X.map((c) => INDM[k].val(c)); return [Math.min(0, ...v), Math.max(...v)]; };
      const meaning = (k) => {
        const d = INDM[k], vr = d.val(ref), vc = d.val(cmp), [lo, hi] = rng(k);
        if (k === "logp") {
          if (vc > 5) return { t: "기름을 너무 좋아해요(5 초과). 피(물)에 잘 녹지 않아요.", bad: true };
          if (vc < 0) return { t: "물만 좋아해요(0 미만). 기름막인 세포막을 못 지나요.", bad: true };
          if (Math.abs(vc - vr) < 0.5) return { t: "비슷해요. 둘 다 0~5 안이라 적당해요." };
          return { t: vc > vr ? "기름을 더 좋아해요. 그래도 0~5 안이라 괜찮아요." : "물을 더 좋아해요. 그래도 0~5 안이라 괜찮아요." };
        }
        if (Math.abs(vc - vr) <= (hi - lo) * 0.04) return { t: "비슷해요. 큰 차이가 없어요." };
        const worse = DIR02[k] < 0 ? vc > vr : vc < vr;
        return { t: TXT02[k][worse ? 0 : 1], bad: worse };
      };
      const fmtv = (k, c) => (k === "alert" ? (c.al.length ? c.al.map(ctx.alName).join("·") : "없음") : INDM[k].fmt(INDM[k].val(c)));
      const row = (k) => {
        const d = INDM[k], [lo, hi] = rng(k), w = (c) => Math.max(2, ((d.val(c) - lo) / (hi - lo || 1)) * 100), m = meaning(k);
        return `<div class="c2r"><div class="c2l">${ctx.ind(k)}<span class="muted">${d.name}</span></div>
          <div class="c2b"><div><i class="r" style="width:${w(ref)}%"></i><span class="mono">${fmtv(k, ref)}</span></div><div><i class="${d.ok(cmp, ctx.S) ? "" : "x"}" style="width:${w(cmp)}%"></i><span class="mono">${fmtv(k, cmp)}</span></div></div>
          <div class="c2m ${m.bad ? "bad" : ""}">${m.bad ? "▲ " : ""}${m.t}</div></div>`;
      };
      el.innerHTML = `<style>
          .c2r { display: grid; grid-template-columns: 150px minmax(0, 1fr) minmax(0, 1.2fr); gap: 4px 14px; align-items: center; padding: 8px 0; border-top: 1px solid var(--line); font-size: 12.5px; }
          .c2l { display: flex; flex-direction: column; }
          .c2b > div { display: flex; align-items: center; gap: 6px; height: 16px; }
          .c2b i { height: 9px; background: var(--fg); display: block; }
          .c2b i.r { background: var(--f7); box-shadow: inset 0 0 0 1px var(--hit-ring); }
          .c2b i.x { background: var(--bad); }
          .c2b .mono { font-size: 11.5px; white-space: nowrap; }
          .c2m { line-height: 1.45; }
          .c2m.bad { color: var(--bad); }
          .c2k { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--muted); }
          .c2k i { display: inline-block; width: 12px; height: 9px; margin-right: 5px; vertical-align: middle; }
          @media (max-width: 700px) { .c2r { grid-template-columns: minmax(0, 1fr); } }
        </style>
        <div class="row"><label for="k02" class="sub">비교할 분자</label>
          <select id="k02">${KIND02.map((k) => `<option value="${k.k}" ${k.k === kind02 ? "selected" : ""}>${k.lab}</option>`).join("")}</select>
          <button type="button" class="btn sm" data-next="1">같은 종류 다른 예 (${(nth02 % Math.min(5, pool.length)) + 1}/${Math.min(5, pool.length)})</button></div>
        <div class="grid" style="--min:260px;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))">
          ${ref ? ctx.mcard(ref, { tag: "실제 약 · " + M.gene, keys: ["mw", "tpsa", "qed"] }) : ""}
          ${cmp ? ctx.mcard(cmp, { tag: "비교 분자", keys: ["mw", "tpsa", "qed"] }) : ""}
        </div>
        <div class="c2k"><span><i style="background:var(--f7);box-shadow:inset 0 0 0 1px var(--hit-ring)"></i>${ref ? esc(short(ref.n, 14)) : "실제 약"}</span><span><i style="background:var(--fg)"></i>${cmp ? esc(short(cmp.n, 14)) : "비교 분자"}</span><span><i style="background:var(--bad)"></i>내 기준에 걸리는 값</span></div>
        <div>${ref && cmp ? keys.map(row).join("") : `<p class="sub">비교할 분자가 없어요.</p>`}</div>
        <div class="fb">실제 약은 대부분 지표에서 '적당한' 자리에 있어요. 막대가 한쪽 끝으로 치우친 분자는 몸속 어딘가에서 막힐 가능성이 커요. 마음에 드는 쪽은 바구니에 담아도 돼요.</div>`;
      return listen(el, {
        change: (e) => { if (e.target.id === "k02") { kind02 = e.target.value; nth02 = 0; ctx.rerender(); } },
        click: (e) => { if (e.target.closest("[data-next]")) { nth02++; ctx.rerender(); } }
      });
    }
  });

  /* 03 둘 중 더 약다운 쪽 — 값을 가린 두 분자 중 먹는 약으로 나은 쪽 고르기, 10라운드 */
  const RULE03 = {
    mw: { good: (c) => c.mw <= 350, bad: (c) => c.mw >= 470, hint: "구조가 클수록(원자가 많을수록) 무거워요." },
    tpsa: { good: (c) => c.tpsa <= 70, bad: (c) => c.tpsa >= 120, hint: "산소(O) · 질소(N)가 많을수록 물과 친한 겉면이 넓어요." },
    alert: { good: (c) => !c.al.length, bad: (c) => c.al.length > 0, hint: "NO₂(질소에 산소 둘) 또는 벤젠 고리에 바로 붙은 NH₂ 를 찾아보세요." },
    qed: { good: (c) => c.qed >= 0.75, bad: (c) => c.qed <= 0.4, hint: "너무 크거나 작지 않고, 고리와 곁가지가 적당하면 약다워요." },
    hbd: { good: (c) => c.hbd <= 1, bad: (c) => c.hbd >= 4, hint: "OH 와 NH 를 세어 보세요. 많을수록 물에 붙잡혀요." },
    logp: { good: (c) => c.logp >= 1.5 && c.logp <= 3.5, bad: (c) => c.logp > 5.2 || c.logp < -0.5, hint: "탄소 고리 · 사슬이 많으면 기름을, O · N 이 많으면 물을 좋아해요. 너무 한쪽이면 곤란해요." }
  };
  const ORDER03 = ["mw", "tpsa", "alert", "qed", "hbd", "logp", "tpsa", "mw", "alert", "qed"];
  const g03 = { seed: 3, rounds: null, i: 0, ans: [] };
  function gen03(ctx) {
    const r = ctx.rng(g03.seed * 97 + 5);
    g03.rounds = ORDER03.map((k) => {
      const R = RULE03[k], good = ctx.X.filter(R.good), bad = ctx.X.filter((c) => R.bad(c) && !R.good(c));
      const a = pickOne(good, r), b = pickOne(bad, r);
      return { k, good: a.id, bad: b.id, goodLeft: r() < 0.5 };
    });
    g03.i = 0; g03.ans = [];
  }
  SV.add({
    id: "03",
    line: "값은 가려져 있어요. 구조식과 힌트만 보고 '먹는 약으로 더 나은 쪽'을 고르세요. 고르면 값과 이유가 공개됩니다. 10라운드예요.",
    goal: "구조식 모양(크기 · O와 N의 수 · 위험 부품)과 지표 값이 어떻게 연결되는지",
    render(el, ctx) {
      if (!g03.rounds) gen03(ctx);
      const { XM, INDM } = ctx;
      const done = g03.ans.length >= g03.rounds.length;
      const score = g03.ans.filter(Boolean).length;
      const prog = `<div class="prog">${g03.rounds.map((_, i) => `<i class="${i < g03.ans.length ? (g03.ans[i] ? "ok" : "no") : i === g03.i ? "on" : ""}"></i>`).join("")}</div>`;
      if (done) {
        el.innerHTML = `${prog}<p class="q">10라운드 끝! ${score} / 10 맞혔어요.</p>
          <div class="fb ${score >= 7 ? "right" : ""}">${score >= 7 ? "구조식만 보고도 지표를 꽤 잘 읽어요." : "괜찮아요. 왼쪽 사전에서 틀린 지표를 다시 읽어 보세요."} 틀린 라운드 지표: ${g03.rounds.filter((_, i) => !g03.ans[i]).map((rd) => ctx.ind(rd.k, INDM[rd.k].sym)).join(" · ") || "없음"}</div>
          <div class="row"><button type="button" class="btn pri" data-new="1">새 문제로 다시</button></div>`;
        return listen(el, { click: (e) => { if (e.target.closest("[data-new]")) { g03.seed++; gen03(ctx); ctx.rerender(); } } });
      }
      const rd = g03.rounds[g03.i], d = INDM[rd.k], answered = g03.ans.length > g03.i;
      const A = XM.get(rd.goodLeft ? rd.good : rd.bad), B = XM.get(rd.goodLeft ? rd.bad : rd.good);
      const others = ["mw", "tpsa", "qed", "alert", "logp"].filter((k) => k !== rd.k).slice(0, 2);
      const card = (c, lab, side) => {
        const isGood = c.id === rd.good;
        const foot = answered ? `<span class="chip ${isGood ? "ok" : "no"}">${isGood ? "✓ 더 나은 쪽" : "✕ 덜 나은 쪽"}</span>` : `<button type="button" class="btn pri" data-choose="${side}">${lab}가 더 나아요</button>`;
        return ctx.mcard(c, { keys: [rd.k, ...others], hide: !answered, judge: answered, name: answered ? undefined : false, label: lab, tag: answered ? c.lib : "?", pick: false, foot });
      };
      const right = answered && g03.ans[g03.i];
      const g = XM.get(rd.good), b = XM.get(rd.bad), val = (c) => (rd.k === "alert" ? (c.al.length ? c.al.map(ctx.alName).join(" · ") : "없음") : d.fmt(d.val(c)));
      el.innerHTML = `${prog}
        <div class="row" style="justify-content:space-between"><p class="q">라운드 ${g03.i + 1} / 10 · 먹는 약으로 더 나은 쪽은? <span class="sub">볼 지표 ${ctx.ind(rd.k, d.sym + " " + d.name)}</span></p><span class="mono muted">${score}점</span></div>
        <p class="sub">힌트 · ${RULE03[rd.k].hint}</p>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))">${card(A, "A", 0)}${card(B, "B", 1)}</div>
        ${answered ? `<div class="fb ${right ? "right" : "wrong"}"><b>${right ? "맞았어요." : "아쉬워요."}</b>${d.sym}: ${ctx.esc(ctx.short(g.n, 14))} ${val(g)} vs ${ctx.esc(ctx.short(b.n, 14))} ${val(b)}. ${d.good} ${d.an}</div>
          <div class="row"><button type="button" class="btn pri" data-nx="1">${g03.i + 1 < 10 ? "다음 라운드 →" : "결과 보기"}</button></div>` : ""}
        <div class="row"><button type="button" class="btn sm" data-new="1">새 문제로 처음부터</button></div>`;
      return listen(el, {
        click: (e) => {
          const c = e.target.closest("[data-choose]");
          if (c && !answered) { const pickedGood = (+c.dataset.choose === 0) === rd.goodLeft; g03.ans[g03.i] = pickedGood; ctx.rerender(); return; }
          if (e.target.closest("[data-nx]")) { g03.i++; ctx.rerender(); return; }
          if (e.target.closest("[data-new]")) { g03.seed++; gen03(ctx); ctx.rerender(); }
        }
      });
    }
  });

  /* 04 통과할까? 예측 퀴즈 — 내 기준으로 이 분자는 어디서 걸릴까 */
  const OPT04 = [["pass", "모든 관문 통과"], [2, "② 크기 · 극성에서 걸림"], [3, "③ Ro5에서 걸림"], [4, "④ 구조 경고로 걸림"], [5, "⑤ QED에서 걸림"]];
  const g04 = { seed: 1, id: null, ans: null, streak: 0, best: 0, n: 0, ok: 0 };
  function gen04(ctx) {
    const r = ctx.rng(g04.seed * 131 + 7), live = ctx.X.filter((c) => c.f !== 1);
    const groups = [live.filter((c) => c.f >= 6), ...[2, 3, 4, 5].map((f) => live.filter((c) => c.f === f))].filter((g) => g.length);
    const pick = pickOne(pickOne(groups, r), r);
    g04.id = pick ? pick.id : null; g04.ans = null;
  }
  SV.add({
    id: "04",
    line: "분자 카드와 지금 내 기준을 보고, 이 분자가 어느 관문에서 걸릴지 예측하세요. 관문은 ②부터 순서대로 검사하고, 처음 걸린 곳에서 멈춥니다.",
    goal: "내가 정한 기준이 분자 하나하나에 어떻게 적용되는지, 관문은 순서대로 검사된다는 것",
    render(el, ctx) {
      if (!g04.id || !ctx.XM.get(g04.id) || ctx.XM.get(g04.id).f === 1) gen04(ctx);
      const c = ctx.XM.get(g04.id), S = ctx.S;
      if (!c) { el.innerHTML = `<p class="sub">문제를 낼 분자가 없어요. 왼쪽에서 라이브러리를 하나 이상 고르세요.</p>`; return; }
      const truth = c.f >= 6 ? "pass" : c.f, answered = g04.ans != null, right = answered && String(g04.ans) === String(truth);
      const fails = [[!(c.p.mw && c.p.tpsa), 2], [!c.p.ro5, 3], [!c.p.alert, 4], [!c.p.qed, 5]].filter((x) => x[0]).map((x) => x[1]);
      const rules = [[2, `${ctx.ind("mw")} ≤ ${S.mwMax} 그리고 ${ctx.ind("tpsa")} ≤ ${S.tpsaMax}`], [3, `${ctx.ind("ro5")} 위반 ≤ ${S.ro5Max}개`], [4, `${ctx.ind("alert", "구조 경고")} ${S.noAlerts ? "있으면 탈락" : "허용(검사 안 함)"}`], [5, `${ctx.ind("qed")} ≥ ${S.qedMin.toFixed(2)}`]];
      el.innerHTML = `<style>.r04 { display: grid; grid-template-columns: minmax(0, 260px) minmax(0, 1fr); gap: 16px; align-items: start; } .r04 ol { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; } .r04 li { border: 1px solid var(--line); padding: 6px 10px; font-size: 13px; display: flex; gap: 8px; } .r04 li.hit { border-color: var(--bad); background: var(--bad-bg); } .r04 li span.n { font-family: var(--mono); } .o04 { display: flex; flex-direction: column; gap: 6px; } .o04 .btn { justify-content: flex-start; } .o04 .btn.ok { background: var(--good-bg); border-color: var(--good); } .o04 .btn.no { background: var(--bad-bg); border-color: var(--bad); } @media (max-width: 700px) { .r04 { grid-template-columns: minmax(0, 1fr); } }</style>
        <div class="row" style="justify-content:space-between"><p class="q">이 분자는 내 기준으로 어디까지 갈까요?</p><span class="mono muted">연속 ${g04.streak} · 최고 ${g04.best} · ${g04.ok}/${g04.n}</span></div>
        <div class="r04">
          ${ctx.mcard(c, { keys: ["mw", "tpsa", "ro5", "alert", "qed", "logp"], judge: answered, pick: false, foot: answered ? ctx.pickBtn(c) : "" })}
          <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
            <div><p class="sub" style="margin-bottom:6px">지금 내 기준 (왼쪽 사전에서 바꿀 수 있어요)</p><ol>${rules.map(([n, t]) => `<li class="${answered && n === truth ? "hit" : ""}"><span class="n">${GATE_NUM[n - 1]}</span><span>${t}</span></li>`).join("")}</ol></div>
            <div class="o04">${OPT04.map(([v, t]) => `<button type="button" class="btn ${answered ? (String(v) === String(truth) ? "ok" : String(v) === String(g04.ans) ? "no" : "") : ""}" data-opt="${v}" ${answered ? "disabled" : ""}>${t}</button>`).join("")}</div>
          </div>
        </div>
        ${answered ? `<div class="fb ${right ? "right" : "wrong"}"><b>${right ? "정답!" : "아쉬워요."}</b>${truth === "pass" ? `모든 관문을 통과해요. 이제 ${ctx.gene} 점수 순위(통과 중 ${c.rank}위)로 도킹실에 갈지 정해져요.` : `${GATE_NUM[truth - 1]}에서 걸려요 — ${ctx.esc(ctx.reason(c))}.`}
            ${fails.length > 1 ? ` 이 분자는 ${fails.map((f) => GATE_NUM[f - 1]).join(" · ")}에 모두 걸리지만, 관문은 순서대로 검사해서 처음 걸린 ${GATE_NUM[fails[0] - 1]}에서 멈춰요.` : ""}</div>` : ""}
        <div class="row"><button type="button" class="btn ${answered ? "pri" : "sm"}" data-new="1">${answered ? "다음 문제 →" : "다른 분자로"}</button></div>`;
      return listen(el, {
        click: (e) => {
          const o = e.target.closest("[data-opt]");
          if (o && !answered) {
            g04.ans = o.dataset.opt; g04.n++;
            if (String(g04.ans) === String(truth)) { g04.ok++; g04.streak++; g04.best = Math.max(g04.best, g04.streak); } else g04.streak = 0;
            ctx.rerender(); return;
          }
          if (e.target.closest("[data-new]")) { g04.seed++; gen04(ctx); ctx.rerender(); }
        }
      });
    }
  });

  /* 05 줄 세우기 — 분자 5개를 지표 하나 기준으로 작은 것부터 */
  const KEYS05 = ["tpsa", "mw", "qed", "logp"];
  const HINT05 = { tpsa: "산소(O) · 질소(N)가 많을수록 TPSA 가 커요.", mw: "원자가 많을수록, 구조가 클수록 무거워요.", qed: "크기와 기름 친화도가 적당하고 고리가 너무 많지 않으면 QED 가 높아요.", logp: "탄소 고리 · 사슬이 많을수록 크고, O · N · 전하가 많을수록 작아요." };
  const g05 = { seed: 2, round: 0, ids: null, order: null, checked: false };
  function gen05(ctx) {
    const k = KEYS05[g05.round % KEYS05.length], d = ctx.INDM[k], r = ctx.rng(g05.seed * 53 + g05.round);
    const pool = ctx.X.filter((c) => c.mw < 520).sort((a, b) => d.val(a) - d.val(b)), n = pool.length, ids = [];
    for (let b = 0; b < 5; b++) { const lo = Math.floor((b * n) / 5), hi = Math.floor(((b + 1) * n) / 5) - 1; ids.push(pool[lo + Math.floor(r() * (hi - lo + 1))].id); }
    let order = shuffle(ids, r);
    if (order.every((id, i) => id === ids[i])) order = order.reverse();
    g05.ids = ids; g05.order = order; g05.checked = false;
  }
  SV.add({
    id: "05",
    line: "구조식을 보고 분자 5개를 지표가 작은 것부터 큰 것 순으로 줄 세우세요. ▲▼ 로 자리를 바꾸고, 다 됐으면 확인을 누르세요.",
    goal: "구조식의 어떤 특징이 그 지표를 키우거나 줄이는지 감 잡기",
    render(el, ctx) {
      if (!g05.ids || g05.ids.some((id) => !ctx.XM.get(id))) gen05(ctx);
      const k = KEYS05[g05.round % KEYS05.length], d = ctx.INDM[k];
      const sorted = g05.ids.map((id) => ctx.XM.get(id)).sort((a, b) => d.val(a) - d.val(b));
      const okAt = (c, i) => d.fmt(d.val(sorted[i])) === d.fmt(d.val(c));
      const nOk = g05.order.filter((id, i) => okAt(ctx.XM.get(id), i)).length;
      el.innerHTML = `<style>.l05 { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; } .l05 li { display: grid; grid-template-columns: 34px 150px minmax(0, 1fr) auto auto; gap: 10px; align-items: center; border: 1px solid var(--line-strong); background: var(--bg); padding: 4px 8px; } .l05 li.ok { border-color: var(--good); background: var(--good-bg); } .l05 li.no { border-color: var(--bad); background: var(--bad-bg); } .l05 .pos { font-family: var(--mono); font-size: 18px; font-weight: 600; text-align: center; } .l05 .molbox { height: 78px; } .l05 .nm { font-size: 13px; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; } .l05 .v { font-family: var(--mono); font-size: 13px; } .l05 .mv { display: flex; flex-direction: column; gap: 2px; } .l05 .mv .btn { padding: 0 8px; } @media (max-width: 600px) { .l05 li { grid-template-columns: 26px 96px minmax(0, 1fr) auto; } .l05 .v { grid-column: 3; } .l05 .mv { grid-row: 1; grid-column: 4; } }</style>
        <div class="row" style="justify-content:space-between"><p class="q">${ctx.ind(k, d.sym + " " + d.name)}이 작은 것부터 큰 것 순으로</p><span class="mono muted">문제 ${g05.round + 1}</span></div>
        <p class="sub">힌트 · ${HINT05[k]}</p>
        <ol class="l05">${g05.order.map((id, i) => { const c = ctx.XM.get(id), ok = okAt(c, i);
          return `<li class="${g05.checked ? (ok ? "ok" : "no") : ""}" data-cid="${c.id}" data-notip="1"><span class="pos">${i + 1}</span>${ctx.mol(c.s, 150, 78)}<span class="nm" title="${ctx.esc(c.n)}">${ctx.esc(ctx.short(c.n, 18))}</span>
            <span class="v">${g05.checked ? `${d.sym} ${d.fmt(d.val(c))}${ok ? " ✓" : ` · ${sorted.findIndex((x) => x.id === c.id) + 1}번 자리`}` : `${d.sym} ?`}</span>
            <span class="mv">${g05.checked ? "" : `<button type="button" class="btn sm" data-mv="${i}" data-d="-1" ${i === 0 ? "disabled" : ""} aria-label="위로">▲</button><button type="button" class="btn sm" data-mv="${i}" data-d="1" ${i === 4 ? "disabled" : ""} aria-label="아래로">▼</button>`}</span></li>`; }).join("")}</ol>
        ${g05.checked ? `<div class="fb ${nOk === 5 ? "right" : nOk >= 3 ? "" : "wrong"}"><b>${nOk} / 5 자리 맞음.</b>정답 순서: ${sorted.map((c) => `${ctx.esc(ctx.short(c.n, 10))} ${d.fmt(d.val(c))}`).join(" < ")}. ${d.what}</div>` : ""}
        <div class="row">${g05.checked ? `<button type="button" class="btn pri" data-nx="1">다음 지표로 →</button>` : `<button type="button" class="btn pri" data-check="1">확인</button>`}<button type="button" class="btn sm" data-new="1">다른 분자로</button></div>`;
      return listen(el, {
        click: (e) => {
          const m = e.target.closest("[data-mv]");
          if (m) { const i = +m.dataset.mv, j = i + +m.dataset.d; [g05.order[i], g05.order[j]] = [g05.order[j], g05.order[i]]; ctx.rerender(); return; }
          if (e.target.closest("[data-check]")) { g05.checked = true; ctx.rerender(); return; }
          if (e.target.closest("[data-nx]")) { g05.round++; gen05(ctx); ctx.rerender(); return; }
          if (e.target.closest("[data-new]")) { g05.seed++; gen05(ctx); ctx.rerender(); }
        }
      });
    }
  });

  /* 06 범위 맞히기 — 승인된 약의 분포를 추정해 보고 실제 분포로 확인 */
  const Q06 = [
    { k: "mw", txt: "승인된 약 10개 중 8개는 분자량이 몇 Da 이하일까요?", p: 0.8, lead: "≤", min: 150, max: 750, step: 10, then: "그래서 리핀스키는 '분자량 500 이하'를 먹는 약의 기준으로 삼았어요." },
    { k: "tpsa", txt: "승인된 약 10개 중 8개는 TPSA 가 몇 Å² 이하일까요?", p: 0.8, lead: "≤", min: 10, max: 200, step: 5, then: "대부분 140 아래예요. 장에서 흡수되려면 물과 친한 겉면이 너무 넓으면 안 되거든요." },
    { k: "logp", txt: "승인된 약 10개 중 8개는 logP 가 얼마 이하일까요?", p: 0.8, lead: "≤", min: -2, max: 8, step: 0.5, then: "대부분 5 이하예요. 기름만 너무 좋아하면 피에 녹지 않아요." },
    { k: "qed", txt: "승인된 약의 절반은 QED 가 얼마 이상일까요?", p: 0.5, lead: "≥", min: 0, max: 1, step: 0.05, then: "진짜 약도 QED 가 1에 가깝진 않아요. 0.5 이상이면 '무난하게 약답다'고 보는 이유예요." }
  ];
  const g06 = { i: 0, guess: {}, shown: {} };
  SV.add({
    id: "06",
    line: "실제로 승인된 약들의 지표가 어디쯤 몰려 있을지 슬라이더로 추정해 보세요. '공개'를 누르면 승인약 분포와 정답이 나옵니다.",
    goal: "Ro5 · TPSA · QED 기준값이 실제 승인약 분포에서 나왔다는 것",
    render(el, ctx) {
      const q = Q06[g06.i], d = ctx.INDM[q.k];
      const appr = ctx.X.filter((c) => c.lib === "ChEMBL 승인약").map((c) => d.val(c)).sort((a, b) => a - b);
      const ans = q.lead === "≤" ? appr[Math.floor(q.p * (appr.length - 1))] : appr[Math.floor((1 - q.p) * (appr.length - 1))];
      const guess = g06.guess[q.k] ?? +(((q.min + q.max) / 2).toFixed(2)), shown = !!g06.shown[q.k];
      const fx = (v) => (q.k === "qed" ? v.toFixed(2) : q.k === "logp" ? v.toFixed(1) : v.toFixed(0));
      const close = Math.abs(guess - ans) <= (q.max - q.min) * 0.08;
      let svg = "";
      if (shown) {
        const W = 640, H = 200, L = 30, R = 10, T = 14, B = 30, n = 24, bw = (q.max - q.min) / n, bins = new Array(n).fill(0);
        for (const v of appr) bins[Math.max(0, Math.min(n - 1, Math.floor((v - q.min) / bw)))]++;
        const mx = Math.max(...bins), sx = (v) => L + ((Math.max(q.min, Math.min(q.max, v)) - q.min) / (q.max - q.min)) * (W - L - R), sy = (b) => T + (H - T - B) * (1 - b / mx);
        svg += `<rect x="${q.lead === "≤" ? L : sx(ans)}" y="${T}" width="${q.lead === "≤" ? sx(ans) - L : W - R - sx(ans)}" height="${H - T - B}" fill="var(--f7)" opacity="0.28"/>`;
        svg += bins.map((b, i) => `<rect x="${sx(q.min + i * bw) + 0.5}" y="${sy(b)}" width="${(W - L - R) / n - 1}" height="${H - B - sy(b)}" fill="var(--fg)" opacity="0.75"/>`).join("");
        svg += `<path d="M${L} ${H - B} H${W - R}" stroke="var(--line-strong)"/>`;
        for (let t = 0; t <= 4; t++) { const v = q.min + ((q.max - q.min) * t) / 4; svg += `<text x="${sx(v)}" y="${H - B + 14}" font-size="10.5" text-anchor="middle" class="t-mono t-muted">${fx(v)}</text>`; }
        svg += `<path d="M${sx(guess)} ${T - 4} V${H - B}" stroke="var(--bad)" stroke-width="2" stroke-dasharray="4 3"/><text x="${sx(guess) + 4}" y="${T + 8}" font-size="11">내 추정 ${fx(guess)}</text>`;
        svg += `<path d="M${sx(ans)} ${T - 4} V${H - B}" stroke="var(--hit-ring)" stroke-width="2.5"/><text x="${sx(ans) + 4}" y="${T + 24}" font-size="11" font-weight="600">정답 ${fx(ans)}</text>`;
        svg += `<text x="${W - R}" y="${H - 4}" font-size="10.5" text-anchor="end" class="t-muted">승인약 ${appr.length}개의 ${d.sym} 분포 · 라임 칸이 ${q.lead === "≤" ? "아래 80%" : "위 50%"}</text>`;
      }
      el.innerHTML = `<div class="row">${Q06.map((x, i) => `<button type="button" class="btn sm" data-q="${i}" aria-pressed="${i === g06.i}">${i + 1}. ${ctx.INDM[x.k].sym}${g06.shown[x.k] ? " ✓" : ""}</button>`).join("")}</div>
        <p class="q">${q.txt}</p><p class="sub">${ctx.ind(q.k, d.sym)} · ${d.one}</p>
        <div class="ctlrow" style="max-width:520px"><label class="lab" for="g06"><span>내 추정</span><span class="val" id="g06v">${q.lead} ${fx(guess)}</span></label>
          <input type="range" id="g06" min="${q.min}" max="${q.max}" step="${q.step}" value="${guess}" ${shown ? "disabled" : ""}></div>
        ${shown ? `<div style="overflow-x:auto">${ctx.svg(640, 200, svg)}</div>
          <div class="fb ${close ? "right" : "wrong"}"><b>${close ? "거의 맞았어요!" : `정답은 ${q.lead} ${fx(ans)}.`}</b>내 추정 ${fx(guess)}, 실제 ${fx(ans)}. ${q.then}</div>
          <div class="row"><button type="button" class="btn pri" data-q="${(g06.i + 1) % Q06.length}">다음 질문 →</button><button type="button" class="btn sm" data-redo="1">다시 추정</button></div>`
        : `<div class="row"><button type="button" class="btn pri" data-show="1">공개</button></div>`}`;
      return listen(el, {
        input: (e) => { if (e.target.id === "g06") { g06.guess[q.k] = +e.target.value; const v = el.querySelector("#g06v"); if (v) v.textContent = `${q.lead} ${fx(+e.target.value)}`; } },
        click: (e) => {
          const b = e.target.closest("[data-q]"); if (b) { g06.i = +b.dataset.q; ctx.rerender(); return; }
          if (e.target.closest("[data-show]")) { if (g06.guess[q.k] == null) g06.guess[q.k] = guess; g06.shown[q.k] = true; ctx.rerender(); return; }
          if (e.target.closest("[data-redo]")) { g06.shown[q.k] = false; ctx.rerender(); }
        }
      });
    }
  });

  /* 07 비유 짝 맞추기 */
  const AN07 = {
    mw: "큰 짐가방은 좁은 문을 지나기 어렵다.",
    tpsa: "물에 흠뻑 젖은 옷으로는 기름막을 뚫고 지나가기 힘들다.",
    logp: "물만 좋아해도, 기름만 좋아해도 곤란하다. 둘 다 적당히 좋아해야 한다.",
    hbd: "손을 많이 내밀면 물 분자들이 붙잡고 놓아주지 않는다.",
    alert: "좋은 차도 불량 부품 하나면 리콜된다.",
    qed: "진짜 약들과 얼마나 닮았는지 매기는 닮은꼴 점수."
  };
  const g07 = { seed: 4, l: null, r: null, done: new Set(), wrong: null, tries: 0 };
  SV.add({
    id: "07",
    line: "왼쪽 지표와 오른쪽 비유를 하나씩 눌러 짝을 지으세요. 틀리면 그 지표가 무엇을 재는지 힌트가 나옵니다.",
    goal: "지표 6개의 뜻을 일상의 비유로 기억하기",
    render(el, ctx) {
      const keys = Object.keys(AN07), right = shuffle(keys, ctx.rng(g07.seed * 7 + 1));
      const all = g07.done.size === keys.length;
      const w = g07.wrong;
      el.innerHTML = `<style>.p07 { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); gap: 10px 18px; } .p07 .col { display: flex; flex-direction: column; gap: 6px; } .p07 .btn { text-align: left; justify-content: flex-start; min-height: 46px; white-space: normal; line-height: 1.4; } .p07 .btn.sel { background: var(--hi); color: var(--hi-fg); border-color: var(--hi-fg); } .p07 .btn.ok { background: var(--good-bg); border-color: var(--good); color: var(--good); cursor: default; } .p07 .btn.shake { border-color: var(--bad); animation: sh07 0.4s; } @keyframes sh07 { 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } } .p07 .sym { font-family: var(--mono); font-weight: 600; min-width: 3.4em; display: inline-block; }</style>
        <div class="row" style="justify-content:space-between"><p class="q">지표와 비유를 짝지으세요</p><span class="mono muted">${g07.done.size} / ${keys.length} · 시도 ${g07.tries}</span></div>
        <div class="prog">${keys.map((k) => `<i class="${g07.done.has(k) ? "ok" : ""}"></i>`).join("")}</div>
        <div class="p07"><div class="col">${keys.map((k) => { const d = ctx.INDM[k]; return `<button type="button" class="btn ${g07.done.has(k) ? "ok" : g07.l === k ? "sel" : w && w.l === k ? "shake" : ""}" data-l="${k}" ${g07.done.has(k) ? "disabled" : ""}><span class="sym">${d.sym}</span>${d.name}</button>`; }).join("")}</div>
          <div class="col">${right.map((k) => `<button type="button" class="btn ${g07.done.has(k) ? "ok" : g07.r === k ? "sel" : w && w.r === k ? "shake" : ""}" data-r="${k}" ${g07.done.has(k) ? "disabled" : ""}>${g07.done.has(k) ? `<span class="sym">${ctx.INDM[k].sym}</span>` : ""}${AN07[k]}</button>`).join("")}</div></div>
        ${all ? `<div class="fb right"><b>모두 맞혔어요! (시도 ${g07.tries}번)</b>${keys.map((k) => `${ctx.INDM[k].sym}: ${ctx.INDM[k].good}`).join(" · ")}</div>`
          : w ? `<div class="fb wrong"><b>아직 아니에요.</b>${ctx.INDM[w.l].sym}은(는) "${ctx.INDM[w.l].one}" 이 뜻에 어울리는 비유를 찾아보세요.</div>`
          : `<div class="fb">지표를 먼저 누르고 비유를 누르세요(반대 순서도 돼요). 뜻이 헷갈리면 지표 이름 ${ctx.ind("tpsa")} 처럼 밑줄 친 글자를 눌러 사전을 보세요.</div>`}
        <div class="row"><button type="button" class="btn sm" data-reset="1">섞어서 다시</button></div>`;
      return listen(el, {
        click: (e) => {
          const L = e.target.closest("[data-l]"), R = e.target.closest("[data-r]");
          if (L) g07.l = L.dataset.l; else if (R) g07.r = R.dataset.r;
          else if (e.target.closest("[data-reset]")) { g07.seed++; g07.done = new Set(); g07.l = g07.r = g07.wrong = null; g07.tries = 0; ctx.rerender(); return; }
          else return;
          g07.wrong = null;
          if (g07.l && g07.r) {
            g07.tries++;
            if (g07.l === g07.r) g07.done.add(g07.l); else g07.wrong = { l: g07.l, r: g07.r };
            g07.l = g07.r = null;
          }
          ctx.rerender();
        }
      });
    }
  });

  /* 08 구조식 보고 맞히기 — 경고 부품 찾기 · OH/NH 세기 */
  const g08 = { seed: 5, n: 0, id: null, kind: "alert", ans: null, ok: 0, total: 0 };
  function gen08(ctx) {
    const r = ctx.rng(g08.seed * 61 + g08.n), small = ctx.X.filter((c) => c.mw >= 120 && c.mw <= 460);
    g08.kind = g08.n % 2 === 0 ? "alert" : "hbd";
    let pool;
    if (g08.kind === "alert") pool = r() < 0.5 ? small.filter((c) => c.al.length) : small.filter((c) => !c.al.length);
    else { const want = Math.floor(r() * 5); pool = small.filter((c) => Math.min(c.hbd, 5) === want); if (!pool.length) pool = small; }
    g08.id = pickOne(pool, r).id; g08.ans = null;
  }
  SV.add({
    id: "08",
    line: "구조식만 보고 답하세요. 한 번은 '위험 부품이 있나?', 한 번은 'OH · NH 가 몇 개?'를 번갈아 물어요.",
    goal: "구조식에서 구조 경고 부품(니트로 · 방향족 아민)과 수소결합 주개(OH · NH)를 직접 찾는 눈",
    render(el, ctx) {
      if (!g08.id || !ctx.XM.get(g08.id)) gen08(ctx);
      const c = ctx.XM.get(g08.id), answered = g08.ans != null;
      const isA = g08.kind === "alert";
      const opts = isA ? [["yes", "있다"], ["no", "없다"]] : [0, 1, 2, 3, 4, 5].map((v) => [String(v), v === 5 ? "5개 이상" : `${v}개`]);
      const truth = isA ? (c.al.length ? "yes" : "no") : String(Math.min(c.hbd, 5)), right = answered && g08.ans === truth;
      const why = isA
        ? (c.al.length ? `이 분자에는 ${c.al.map(ctx.alName).join(" · ")}가 있어요. ${c.al.includes("nitro_aromatic") ? "니트로기는 고리에 붙은 N 하나에 O 두 개가 달린 모양(그림에서 N⁺ 와 O⁻)이에요. " : ""}${c.al.includes("aromatic_amine") ? "방향족 아민은 벤젠 같은 고리에 NH₂ 가 바로 붙은 모양이에요. " : ""}간에서 대사되면 DNA 를 망가뜨리는 물질로 바뀔 수 있어서 미리 빼요.`
          : "이 분자에는 경고 부품이 없어요. NH₂ 가 있어도 고리에 바로 붙지 않았거나, 질소에 산소 둘이 달린 니트로 모양이 없으면 경고가 아니에요.")
        : `정답 ${c.hbd}개. 산소나 질소에 수소가 붙은 OH · NH 를 셉니다(NH₂ 도 질소 하나라 1개로 세요). ${c.hbd > 5 ? "5개를 넘어서 Ro5 위반이에요." : "5개 이하라 Ro5 는 통과예요."}`;
      el.innerHTML = `<style>.s08 { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 16px; align-items: start; } .s08 .pic { border: 1px solid var(--line-strong); background: var(--bg); padding: 8px; } .s08 .pic .molbox { height: 260px; } .s08 .opts { display: flex; flex-wrap: wrap; gap: 6px; } .s08 .opts .btn { min-width: 64px; justify-content: center; } .s08 .btn.ok { background: var(--good-bg); border-color: var(--good); } .s08 .btn.no { background: var(--bad-bg); border-color: var(--bad); } @media (max-width: 700px) { .s08 { grid-template-columns: minmax(0, 1fr); } .s08 .pic .molbox { height: 200px; } }</style>
        <div class="row" style="justify-content:space-between"><p class="q">${isA ? `이 분자에 ${ctx.ind("alert", "구조 경고")} 부품이 있을까요?` : `이 분자의 OH · NH 는 몇 개일까요? (${ctx.ind("hbd")})`}</p><span class="mono muted">${g08.ok} / ${g08.total}</span></div>
        <div class="s08"><div class="pic">${ctx.mol(c.s, 420, 260)}${answered ? `<p class="sub" style="margin:4px 0 0">${ctx.esc(c.n)} · HBD ${c.hbd} · 경고 ${c.al.length ? c.al.map(ctx.alName).join(" · ") : "없음"}</p>` : ""}</div>
          <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
            <p class="sub">${isA ? "찾을 것: ① 질소(N)에 산소(O) 두 개가 달린 니트로기 ② 육각 고리에 바로 붙은 NH₂(방향족 아민)" : "찾을 것: 그림에서 OH, NH, NH₂ 로 적힌 곳. 고리 안의 N 처럼 수소가 없는 N 은 세지 않아요."}</p>
            <div class="opts">${opts.map(([v, t]) => `<button type="button" class="btn ${answered ? (v === truth ? "ok" : v === g08.ans ? "no" : "") : ""}" data-opt="${v}" ${answered ? "disabled" : ""}>${t}</button>`).join("")}</div>
            ${answered ? `<div class="fb ${right ? "right" : "wrong"}"><b>${right ? "정답!" : "아쉬워요."}</b>${ctx.esc(why)}</div>` : ""}
            <div class="row"><button type="button" class="btn ${answered ? "pri" : "sm"}" data-new="1">${answered ? "다음 문제 →" : "다른 분자로"}</button></div>
          </div></div>`;
      return listen(el, {
        click: (e) => {
          const o = e.target.closest("[data-opt]");
          if (o && !answered) { g08.ans = o.dataset.opt; g08.total++; if (g08.ans === truth) g08.ok++; ctx.rerender(); return; }
          if (e.target.closest("[data-new]")) { g08.n++; gen08(ctx); ctx.rerender(); }
        }
      });
    }
  });

  /* 09 미션 브리핑 → 기준 정하기 — 질문 4개에 답하면 기준이 만들어진다 */
  const Q09 = [
    { q: "이 약은 뇌 안까지 들어가야 하나요?", why: "뇌혈관 장벽은 아주 촘촘해서 작고 물과 덜 친한 분자만 지나가요.", yes: { tpsaMax: 90, mwMax: 450 }, no: { tpsaMax: 120, mwMax: 500 }, yl: "TPSA ≤ 90 · MW ≤ 450", nl: "TPSA ≤ 120 · MW ≤ 500" },
    { q: "환자가 알약으로 삼켜 먹는 약인가요?", why: "먹는 약은 장에서 흡수돼야 해서 리핀스키 5규칙을 지켜야 해요. 주사약은 조금 느슨해도 돼요.", yes: { ro5Max: 1 }, no: { ro5Max: 2 }, yl: "Ro5 위반 ≤ 1", nl: "Ro5 위반 ≤ 2" },
    { q: "몇 년씩 매일 먹는 약인가요?", why: "오래 먹을수록 작은 독성도 쌓여요. 경고 부품은 빼고, 먹는 약이면 Ro5 도 더 엄격하게.", yes: { noAlerts: true }, no: { noAlerts: false }, yl: "구조 경고 빼기 (+ 먹는 약이면 Ro5 0개)", nl: "구조 경고 허용" },
    { q: "실제 약처럼 생긴 분자만 볼까요?", why: "약다움을 높이면 안전한 쪽이지만, 새로운 모양의 분자는 놓칠 수 있어요.", yes: { qedMin: 0.6 }, no: { qedMin: 0.3 }, yl: "QED ≥ 0.6", nl: "QED ≥ 0.3" }
  ];
  const EXP09 = {
    "egfr-1m17": [[null, "뇌 전이 환자까지 노리면 '예', 폐만 생각하면 '아니오'. 둘 다 근거가 있어요."], [true, "집에서 먹는 알약이에요."], [true, "항암 알약은 몇 년씩 매일 먹기도 해요."], [null, "항암제는 새로운 모양도 많아서 어느 쪽도 괜찮아요."]],
    "ache-4ey7": [[true, "알츠하이머 약은 뇌 속 효소를 막아야 해요."], [true, "매일 먹는 알약이에요."], [true, "노인 환자가 오래 먹어요."], [null, "어느 쪽도 근거가 있어요."]],
    "dpp4-1x70": [[false, "당뇨약은 혈액과 장에서 일해요. 뇌에 갈 필요가 없어요."], [true, "매일 먹는 알약이에요."], [true, "수십 년 먹는 약이에요."], [true, "오래 먹으니 검증된 약다운 모양이 안전해요."]],
    "cox2-3ln1": [[false, "관절의 염증을 잡는 약이라 뇌에 갈 필요가 없어요."], [true, "먹는 진통제예요."], [true, "류마티스 환자는 오래 먹어요."], [true, "부작용이 적어야 해서 약다운 모양이 좋아요."]]
  };
  const g09 = { tid: null, a: [null, null, null, null], applied: false };
  function cut09() {
    const c = { mwMax: 500, tpsaMax: 140, ro5Max: 1, noAlerts: false, qedMin: 0.3 };
    Q09.forEach((q, i) => { if (g09.a[i] != null) Object.assign(c, g09.a[i] ? q.yes : q.no); });
    if (g09.a[1] === true && g09.a[2] === true) c.ro5Max = 0;
    return c;
  }
  SV.add({
    id: "09",
    line: "미션 이야기를 읽고 질문 4개에 '예/아니오'로 답하세요. 답에 따라 기준이 만들어지고, '이 기준 적용'을 누르면 왼쪽 내 기준이 바뀝니다.",
    goal: "미션(어떤 환자 · 어떻게 먹는 약)에서 스크리닝 기준을 끌어내는 생각의 순서",
    render(el, ctx) {
      if (g09.tid !== ctx.S.tid) { g09.tid = ctx.S.tid; g09.a = [null, null, null, null]; g09.applied = false; }
      const M = ctx.M, exp = EXP09[ctx.S.tid] || EXP09["egfr-1m17"], cur = g09.a.findIndex((x) => x == null), all = cur === -1;
      const cut = cut09(), prev = ctx.runFunnel(cut).pass.length;
      const chip = (k, v) => `<span class="chip">${k} ${v}</span>`;
      el.innerHTML = `<style>.m09 { border: 1px solid var(--line-strong); background: var(--bg); padding: 14px; display: flex; flex-direction: column; gap: 6px; } .m09 h3 { margin: 0; font-size: 18px; letter-spacing: -0.02em; } .q09 { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 4px 10px; padding: 10px 0; border-top: 1px solid var(--line); } .q09.off { opacity: 0.4; } .q09 .n { font-family: var(--mono); font-size: 18px; font-weight: 600; } .q09 .yn { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }</style>
        <div class="m09"><span class="mono muted" style="font-size:11px">미션 브리핑 · ${M.gene} · ${M.disease}</span><h3>${ctx.esc(M.title)}</h3><p style="margin:0">${ctx.esc(M.story)}</p></div>
        <div>${Q09.map((q, i) => { const a = g09.a[i], off = !all && i > cur, e = exp[i];
          return `<div class="q09 ${off ? "off" : ""}"><span class="n">${i + 1}</span><div><b>${q.q}</b><p class="sub">${q.why}</p>
            <div class="yn"><button type="button" class="btn sm" data-a="${i}" data-v="1" aria-pressed="${a === true}" ${off ? "disabled" : ""}>예 → ${q.yl}</button><button type="button" class="btn sm" data-a="${i}" data-v="0" aria-pressed="${a === false}" ${off ? "disabled" : ""}>아니오 → ${q.nl}</button></div>
            ${a != null ? `<p class="sub" style="margin-top:4px">${e[0] == null ? `<span class="chip">어느 쪽도 OK</span>` : e[0] === a ? `<span class="chip ok">✓ 미션과 맞아요</span>` : `<span class="chip warn">! 미션 이야기를 다시 읽어 보세요</span>`} ${e[1]}</p>` : ""}</div></div>`; }).join("")}</div>
        ${all ? `<div class="fb"><b>만들어진 기준</b>${chip("MW ≤", cut.mwMax)} ${chip("TPSA ≤", cut.tpsaMax)} ${chip("Ro5 위반 ≤", cut.ro5Max)} ${chip("구조 경고", cut.noAlerts ? "빼기" : "허용")} ${chip("QED ≥", cut.qedMin)}
            <br>이 기준이면 220종 중 <b>${prev}개</b>가 통과해요. (지금 내 기준은 ${ctx.REM[5]}개)</div>
          <div class="row"><button type="button" class="btn pri" data-apply="1">이 기준 적용</button><button type="button" class="btn sm" data-reset="1">처음부터 다시 답하기</button></div>
          ${g09.applied ? `<div class="fb right"><b>적용했어요.</b>왼쪽 사전의 내 기준이 바뀌었어요. 미션 조언과 비교: ${ctx.adviceCheck().map((x) => `<span class="chip ${x.ok ? "ok" : "warn"}">${x.ok ? "✓" : "!"} ${ctx.esc(x.t)}</span>`).join(" ")} 다음은 활동 10 '기준 코치'로 다듬거나, 15 '분자 쇼핑'에서 후보를 고르세요.</div>` : ""}`
          : `<p class="sub">질문 ${cur + 1}에 답하면 다음 질문이 열려요.</p>`}`;
      return listen(el, {
        click: (e) => {
          const b = e.target.closest("[data-a]");
          if (b) { g09.a[+b.dataset.a] = b.dataset.v === "1"; g09.applied = false; ctx.rerender(); return; }
          if (e.target.closest("[data-apply]")) { g09.applied = true; ctx.set(cut09()); return; }
          if (e.target.closest("[data-reset]")) { g09.a = [null, null, null, null]; g09.applied = false; ctx.rerender(); }
        }
      });
    }
  });

  /* 10 기준 코치 — 기준을 움직일 때마다 코치가 바로 말해 준다 */
  function coach10(ctx) {
    const n = ctx.REM[5], out = [], ref = ctx.XM.get(ctx.M.ref);
    if (n < 10) out.push(["no", `너무 엄격해요. 통과한 분자가 ${n}개뿐이라 도킹실에 보낼 후보를 고를 여유가 없어요. 가장 많이 거르는 관문을 조금 풀어 보세요.`]);
    else if (n > 150) out.push(["warn", `너무 느슨해요. ${n}개가 통과해서 거의 거르지 않은 셈이에요. 미션에 꼭 필요한 기준부터 조여 보세요.`]);
    else out.push(["ok", `통과 ${n}개 — 고를 여유도 있고 충분히 걸렀어요.`]);
    for (const a of ctx.adviceCheck()) if (!a.ok) out.push(["warn", `미션 조언은 ${a.t} 인데 ${a.mine}이에요. "${ctx.M.title}"에 맞는지 생각해 보세요.`]);
    if (ref && ref.f >= 1 && ref.f <= 5) out.push(["warn", `실제 약 ${ctx.short(ref.n, 12)}도 내 기준에 걸려요(${ctx.reason(ref)}). 진짜 약까지 떨어뜨리는 기준은 지나치게 엄격할 수 있어요.`]);
    else if (ref) out.push(["ok", `실제 약 ${ctx.short(ref.n, 12)}은 내 기준을 통과해요.`]);
    const g = [2, 3, 4, 5].reduce((m, k) => (ctx.DROP[k] > ctx.DROP[m] ? k : m), 2);
    if (ctx.DROP[g]) out.push(["", `가장 많이 거르는 관문은 ${GATE_NUM[g - 1]} ${["", "", "크기 · 극성", "Ro5", "구조 경고", "QED"][g]} (−${ctx.DROP[g]}개)예요.`]);
    if (out.filter((o) => o[0] === "warn" || o[0] === "no").length === 0) out.push(["ok", "좋아요! 미션 조언과 맞고 통과 수도 알맞아요. 이제 후보를 고르러 가요."]);
    return out;
  }
  SV.add({
    id: "10",
    line: "슬라이더로 기준을 바꿔 보세요. 움직일 때마다 코치가 '너무 엄격해요', '미션과 어긋나요'처럼 바로 말해 줍니다.",
    goal: "기준을 조였다 풀었다 하며 '알맞은 깔때기'의 감각 익히기",
    render(el, ctx) {
      const S = ctx.S;
      const rng = (k, lab, min, max, step, fix, lead) => `<div class="ctlrow"><label class="lab" for="c10-${k}"><span>${lab}</span><span class="val" data-v10="${k}">${lead} ${(+S[k]).toFixed(fix)}</span></label><input type="range" id="c10-${k}" data-k10="${k}" data-fix="${fix}" data-lead="${lead}" min="${min}" max="${max}" step="${step}" value="${S[k]}"></div>`;
      el.innerHTML = `<style>.k10 { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 18px; align-items: start; } .k10 .ctls { display: flex; flex-direction: column; gap: 12px; } .k10 .bub { border: 1px solid var(--line-strong); background: var(--bg); padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; position: relative; } .k10 .bub::before { content: "코치"; position: absolute; top: -10px; left: 12px; background: var(--fg); color: var(--bg); font-size: 11px; padding: 0 6px; font-family: var(--mono); } .k10 .msg { display: flex; gap: 8px; font-size: 13px; line-height: 1.5; } .k10 .msg i { font-style: normal; flex: none; width: 18px; text-align: center; font-weight: 700; } .k10 .msg.ok i { color: var(--good); } .k10 .msg.no i { color: var(--bad); } .k10 .msg.warn i { color: var(--warn); } @media (max-width: 760px) { .k10 { grid-template-columns: minmax(0, 1fr); } }</style>
        <div id="gauge10"></div>
        <div class="k10"><div class="ctls">
          ${rng("mwMax", "② 분자량 MW 최대", 250, 650, 10, 0, "≤")}
          ${rng("tpsaMax", "② 극성 표면적 TPSA 최대", 40, 180, 5, 0, "≤")}
          <div class="ctlrow"><span class="lab"><span>③ Ro5 위반 허용</span></span><div class="seg">${[0, 1, 2].map((v) => `<button type="button" data-ro5="${v}" aria-pressed="${S.ro5Max === v}">${v}개까지</button>`).join("")}</div></div>
          <label class="chk"><input type="checkbox" id="c10-al" ${S.noAlerts ? "checked" : ""}> ④ 구조 경고 부품 빼기</label>
          ${rng("qedMin", "⑤ 약다움 QED 최소", 0, 0.9, 0.05, 2, "≥")}
        </div><div class="bub" id="coach10" aria-live="polite"></div></div>`;
      const paint = () => {
        const n = ctx.REM[5], W = 640, H = 64, L = 6, R = 6, sx = (v) => L + (v / 220) * (W - L - R);
        let s = `<rect x="${sx(0)}" y="18" width="${sx(10) - sx(0)}" height="16" fill="var(--bad-bg)"/><rect x="${sx(10)}" y="18" width="${sx(150) - sx(10)}" height="16" fill="var(--good-bg)"/><rect x="${sx(150)}" y="18" width="${sx(220) - sx(150)}" height="16" fill="var(--warn-bg)"/>`;
        s += `<text x="${sx(5)}" y="50" font-size="10.5" text-anchor="middle" class="t-muted">엄격</text><text x="${sx(80)}" y="50" font-size="10.5" text-anchor="middle" class="t-muted">알맞음</text><text x="${sx(185)}" y="50" font-size="10.5" text-anchor="middle" class="t-muted">느슨</text>`;
        s += `<path d="M${sx(n)} 12 V40" stroke="var(--hit-ring)" stroke-width="2.5"/><rect x="${sx(n) - 5}" y="12" width="10" height="6" fill="var(--f7)" stroke="var(--hit-ring)"/><text x="${sx(n) > W - 120 ? sx(n) - 8 : sx(n) + 8}" y="11" font-size="11.5" font-weight="600" class="t-mono" text-anchor="${sx(n) > W - 120 ? "end" : "start"}">통과 ${n} / 220</text>`;
        el.querySelector("#gauge10").innerHTML = ctx.svg(W, H, s);
        el.querySelector("#coach10").innerHTML = coach10(ctx).map(([lv, t]) => `<div class="msg ${lv}"><i>${lv === "ok" ? "✓" : lv === "no" ? "✕" : lv === "warn" ? "!" : "·"}</i><span>${ctx.esc(t)}</span></div>`).join("");
      };
      this._paint = paint;
      paint();
      return listen(el, {
        input: (e) => {
          const t = e.target; if (!t.dataset.k10) return;
          const v = el.querySelector(`[data-v10="${t.dataset.k10}"]`); if (v) v.textContent = `${t.dataset.lead} ${(+t.value).toFixed(+t.dataset.fix)}`;
          ctx.set({ [t.dataset.k10]: +t.value }, true);
        },
        change: (e) => { if (e.target.id === "c10-al") ctx.set({ noAlerts: e.target.checked }, true); },
        click: (e) => {
          const b = e.target.closest("[data-ro5]"); if (!b) return;
          ctx.set({ ro5Max: +b.dataset.ro5 }, true);
          el.querySelectorAll("[data-ro5]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        }
      });
    },
    update(ctx) { if (this._paint && document.getElementById("gauge10")) this._paint(); else ctx.rerender(); }
  });
})();
