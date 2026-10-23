/* 활동 21–30 — 화합물 스크리닝 학습(후보 고르기 21–23 · 점검 · 되돌아보기 24–30). 공통 뼈대(screening-learn-30.html)의 SV.add 로 등록한다. */
(() => {
  "use strict";

  /* ── 이 파일의 공통 도우미 ── */
  const CSS = `<style>
    .l3-split { display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: 16px; align-items: start; }
    .l3-box { border: 1px solid var(--line); background: var(--bg); padding: 12px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .l3-box h4 { margin: 0; font-size: 13.5px; }
    .l3-opts { display: flex; flex-wrap: wrap; gap: 6px; }
    .l3-opts .btn { text-align: left; }
    .l3-tag { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.08em; color: var(--muted); text-transform: uppercase; }
    .l3-big { font-family: var(--mono); font-size: 30px; font-weight: 600; letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums; }
    .l3-in { border: 1px solid var(--line-strong); background: var(--surface); padding: 5px 8px; border-radius: 0; min-width: 0; width: 100%; }
    textarea.l3-in { resize: vertical; min-height: 56px; line-height: 1.45; }
    .l3-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .l3-tbl th, .l3-tbl td { border-bottom: 1px solid var(--line); padding: 6px 8px; text-align: left; vertical-align: top; }
    .l3-tbl th { font-family: var(--mono); font-size: 10.5px; color: var(--muted); font-weight: 500; letter-spacing: 0.04em; }
    .l3-tbl .num { text-align: right; font-family: var(--mono); font-variant-numeric: tabular-nums; }
    .l3-scroll { overflow-x: auto; }
    .l3-line { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 7px 9px; border: 1px solid var(--line); background: var(--bg); min-width: 0; }
    .l3-line b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .l3-ex { border: 1px dashed var(--line-strong); padding: 10px 12px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: 13px; }
    @media (max-width: 720px) { .l3-split { grid-template-columns: minmax(0, 1fr); } }
  </style>`;
  const sig = (S) => [S.tid, S.mwMax, S.tpsaMax, S.ro5Max, S.noAlerts, S.qedMin, S.topN, Object.values(S.lib).join("")].join("|");
  const passList = (ctx) => ctx.X.filter((c) => c.f >= 6).sort((a, b) => a.rank - b.rank);
  const picks = (ctx) => ctx.S.picks.map((id) => ctx.XM.get(id)).filter(Boolean);
  const nm = (ctx, c, k = 16) => ctx.esc(ctx.short(c.n, k));
  const NUM = "①②③④⑤⑥";
  const GATE_NM = { 2: "② 크기 · 극성", 3: "③ 리핀스키 5규칙", 4: "④ 구조 경고", 5: "⑤ 약다움 QED" };
  /* 바구니가 비었을 때 — 통과 상위 3개를 담아 체험. whys 는 예시 근거 함수 목록 */
  const exBox = (ctx, msg) => `<div class="l3-ex"><span>${msg || "바구니가 비어 있어요. 예시 후보 3개(내 기준 통과 상위)로 먼저 체험해 보세요."}</span><button type="button" class="btn sm hi" data-ex3="1">예시 후보로 체험</button></div>`;
  function tryExample(ctx, whys) {
    const top = passList(ctx).slice(0, 3);
    top.forEach((c) => { if (!ctx.S.picks.includes(c.id) && ctx.S.picks.length < ctx.PICK_MAX) ctx.S.picks.push(c.id); });
    top.forEach((c, i) => { if (whys && whys[i] && !ctx.S.why[c.id]) ctx.S.why[c.id] = whys[i](c); });
    ctx.set({}, false); /* 바구니 · 요약 · 활동을 다시 그린다 */
  }
  /* el 에 이벤트를 위임하고 정리 함수를 돌려준다. 바구니 · 사전 링크 클릭은 뼈대가 처리하므로 건너뛴다 */
  function listen(el, map) {
    const fns = Object.entries(map).map(([type, fn]) => {
      const h = (e) => { if (type === "click" && e.target.closest("[data-pick],[data-ind]")) return; fn(e); };
      el.addEventListener(type, h); return [type, h];
    });
    return () => fns.forEach(([t, h]) => el.removeEventListener(t, h));
  }
  const goAct = (n) => { const b = document.querySelector(`#pick [data-v="${n}"]`); if (b) { b.click(); scrollTo({ top: 0 }); } };

  /* ── 21 토너먼트 ── */
  const R21 = [
    { k: "abs", t: "흡수가 더 잘 될 것 같아서", ind: "tpsa", better: (a, b) => a.tpsa <= b.tpsa, val: (c) => `TPSA ${c.tpsa.toFixed(0)}` },
    { k: "safe", t: "더 안전해서", ind: "alert", better: (a, b) => a.al.length * 2 + a.ro5 <= b.al.length * 2 + b.ro5, val: (c) => `경고 ${c.al.length}개 · Ro5 ${c.ro5}개` },
    { k: "qed", t: "더 약다워서", ind: "qed", better: (a, b) => a.qed >= b.qed, val: (c) => `QED ${c.qed.toFixed(2)}` },
    { k: "bind", t: "표적에 더 잘 붙어서", ind: "score", better: (a, b) => a.score >= b.score, val: (c) => `점수 ${c.score.toFixed(3)}` }
  ];
  const ORDER21 = [0, 7, 3, 4, 1, 6, 2, 5];
  const MATCHES21 = ["r1-0", "r1-1", "r1-2", "r1-3", "r2-0", "r2-1", "r3-0"];
  const T21 = { key: null, seeds: [], res: {}, chip: null, last: null };
  function players21(m) {
    const [r, i] = m.split("-"), n = +i;
    if (r === "r1") return [T21.seeds[ORDER21[2 * n]] || null, T21.seeds[ORDER21[2 * n + 1]] || null];
    const prev = r === "r2" ? "r1" : "r2";
    const a = T21.res[`${prev}-${2 * n}`], b = T21.res[`${prev}-${2 * n + 1}`];
    return [a ? a.w : undefined, b ? b.w : undefined];
  }
  function resolve21() {
    /* 부전승 — 한쪽이 비면 다른 쪽이 자동 진출 */
    for (const m of MATCHES21) {
      if (T21.res[m]) continue;
      const [a, b] = players21(m);
      if (a === undefined || b === undefined) continue;
      if (a && !b) T21.res[m] = { w: a, l: null, bye: true };
      else if (!a && b) T21.res[m] = { w: b, l: null, bye: true };
      else if (!a && !b) T21.res[m] = { w: null, l: null, bye: true };
    }
  }
  SV.add({
    id: "21",
    line: "내 기준을 통과한 상위 8개가 토너먼트를 벌입니다. 매 경기 이유를 먼저 고르고 승자를 정하세요. 고른 이유가 실제 값과 맞는지 바로 알려 줘요.",
    goal: "두 분자를 지표로 비교하고, '왜 이겼는지'를 값으로 말하는 법",
    render(el, ctx) {
      const pass = passList(ctx), key = sig(ctx.S);
      if (T21.key !== key) { T21.key = key; T21.seeds = pass.slice(0, 8).map((c) => c.id); T21.res = {}; T21.chip = null; T21.last = null; }
      if (T21.seeds.length < 2) {
        el.innerHTML = `${CSS}<p class="q">통과 분자가 ${pass.length}개뿐이라 토너먼트를 열 수 없어요.</p><div class="fb">왼쪽 사전에서 기준을 조금 넓혀 보세요. 예를 들어 ${ctx.ind("tpsa")} 상한을 올리거나 ${ctx.ind("qed")} 최소를 낮추면 돼요.</div>`;
        return;
      }
      resolve21();
      const cur = MATCHES21.find((m) => !T21.res[m] && players21(m).every((p) => p));
      const rName = { r1: "8강", r2: "4강", r3: "결승" };
      const C = (id) => ctx.XM.get(id);
      const slot = (m) => {
        const [a, b] = players21(m), r = T21.res[m];
        const line = (id) => !id ? `<span class="muted">—</span>` : `<span data-cid="${id}" style="${r && r.l === id ? "text-decoration:line-through;color:var(--muted)" : r && r.w === id ? "font-weight:600" : ""}">${r && r.w === id ? "✓ " : ""}${nm(ctx, C(id), 12)}</span>`;
        return `<div class="b21 ${m === cur ? "now" : ""}">${line(a)}${line(b)}</div>`;
      };
      const champ = T21.res["r3-0"] && T21.res["r3-0"].w ? C(T21.res["r3-0"].w) : null;
      let match = "";
      if (cur) {
        const [a, b] = players21(cur).map(C), i = MATCHES21.indexOf(cur) + 1;
        match = `<div class="row" style="justify-content:space-between"><p class="q">경기 ${i} · ${rName[cur.slice(0, 2)]} — 누가 이길까요?</p><span class="mono muted">${Object.keys(T21.res).filter((m) => !T21.res[m].bye).length} / ${MATCHES21.length}</span></div>
          <div><span class="l3-tag">1. 이유 먼저 고르기</span><div class="l3-opts" style="margin-top:6px">${R21.map((r) => `<button type="button" class="btn sm" data-chip21="${r.k}" aria-pressed="${T21.chip === r.k}">${r.t}</button>`).join("")}</div></div>
          <span class="l3-tag">2. 승자 고르기 ${T21.chip ? "" : "— 이유를 먼저 고르세요"}</span>
          <div class="grid" style="--min:230px">${[a, b].map((c) => ctx.mcard(c, { keys: ["mw", "tpsa", "logp", "ro5", "qed", "score"], pick: false, foot: `<button type="button" class="btn sm pri" data-win21="${c.id}" ${T21.chip ? "" : "disabled"}>이 분자 승리</button>` })).join("")}</div>`;
      }
      let fb = "";
      if (T21.last) {
        const { w, l, r, ok } = T21.last, R = R21.find((x) => x.k === r), W = C(w), L = C(l);
        fb = ok ? `<div class="fb right"><b>근거가 값과 맞아요.</b>${R.t}: ${nm(ctx, W)} ${R.val(W)} vs ${nm(ctx, L)} ${R.val(L)}. ${ctx.ind(R.ind, ctx.INDM[R.ind].sym)} 기준으로 정말 더 나아요.</div>`
          : `<div class="fb wrong"><b>이유와 값이 어긋나요.</b>'${R.t}'라고 했지만 ${nm(ctx, W)} ${R.val(W)}, ${nm(ctx, L)} ${R.val(L)}로 진 쪽이 더 나아요. 다른 이유로 이겼다면 그 이유를 골라야 설득력이 생겨요. ${ctx.ind(R.ind, ctx.INDM[R.ind].sym + " 뜻 보기")}</div>`;
      }
      const fin = T21.res["r3-0"];
      el.innerHTML = `${CSS}<style>
          .br21 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; align-items: center; min-width: 520px; }
          .br21 .col { display: flex; flex-direction: column; gap: 8px; justify-content: space-around; height: 100%; min-width: 0; }
          .br21 .ct { font-family: var(--mono); font-size: 10.5px; color: var(--muted); letter-spacing: 0.08em; }
          .b21 { border: 1px solid var(--line-strong); background: var(--bg); padding: 4px 7px; display: flex; flex-direction: column; font-size: 12px; min-width: 0; }
          .b21 span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .b21.now { box-shadow: inset 0 0 0 2px var(--fg); }
          .ch21 { border: 2px solid var(--hit-ring); background: var(--f7); color: var(--hi-fg); padding: 8px; font-weight: 700; font-size: 13px; overflow: hidden; text-overflow: ellipsis; }
        </style>
        <div class="l3-scroll"><div class="br21" aria-label="대진표">
          <div class="col"><span class="ct">8강</span>${["r1-0", "r1-1", "r1-2", "r1-3"].map(slot).join("")}</div>
          <div class="col"><span class="ct">4강</span>${["r2-0", "r2-1"].map(slot).join("")}</div>
          <div class="col"><span class="ct">결승</span>${slot("r3-0")}</div>
          <div class="col"><span class="ct">우승</span>${champ ? `<div class="ch21" data-cid="${champ.id}">🏆 ${nm(ctx, champ, 12)}</div>` : `<div class="b21"><span class="muted">?</span></div>`}</div>
        </div></div>
        ${fb}${match}
        ${champ ? `<div class="l3-box"><h4>우승 — ${ctx.esc(champ.n)}</h4><p class="sub">결승 이유: ${fin.r ? R21.find((x) => x.k === fin.r).t : "부전승"}. 우승 분자를 바구니에 담으면 결승 이유가 근거로 함께 저장돼요.</p>
          <div class="row"><button type="button" class="btn hi" data-champ21="${champ.id}" ${ctx.S.picks.includes(champ.id) ? "disabled" : ""}>${ctx.S.picks.includes(champ.id) ? "✓ 바구니에 있음" : "우승 분자 담기 + 근거 저장"}</button><button type="button" class="btn sm" data-reset21="1">다시 하기</button></div></div>`
          : `<div class="row"><button type="button" class="btn sm" data-reset21="1">처음부터 다시</button><span class="sub">시드: 통과 1위 vs 8위, 4위 vs 5위, 2위 vs 7위, 3위 vs 6위</span></div>`}`;
      return listen(el, {
        click(e) {
          const ch = e.target.closest("[data-chip21]"), w = e.target.closest("[data-win21]"), cp = e.target.closest("[data-champ21]"), rs = e.target.closest("[data-reset21]");
          if (ch) { T21.chip = ch.dataset.chip21; ctx.rerender(); }
          else if (w && cur && T21.chip) {
            const [a, b] = players21(cur), win = w.dataset.win21, lose = win === a ? b : a, R = R21.find((x) => x.k === T21.chip);
            T21.res[cur] = { w: win, l: lose, r: T21.chip };
            T21.last = { w: win, l: lose, r: T21.chip, ok: R.better(C(win), C(lose)) };
            T21.chip = null; ctx.rerender();
          } else if (cp) {
            const R = fin.r ? R21.find((x) => x.k === fin.r) : null, c = C(cp.dataset.champ21);
            ctx.pick(c.id, true);
            ctx.setWhy(c.id, `토너먼트 우승 — 결승 이유: ${R ? `${R.t} (${R.val(c)})` : "부전승"}`);
          } else if (rs) { T21.key = null; ctx.rerender(); }
        }
      });
    }
  });

  /* ── 22 심사위원 점수표 ── */
  const C22 = [
    { k: "abs", t: "흡수", inds: ["tpsa", "mw"], show: (c) => `TPSA ${c.tpsa.toFixed(0)} · MW ${c.mw.toFixed(0)}`,
      auto: (c) => (c.tpsa <= 60 ? 5 : c.tpsa <= 90 ? 4 : c.tpsa <= 120 ? 3 : c.tpsa <= 140 ? 2 : 1) - (c.mw > 500 ? 1 : 0) },
    { k: "safe", t: "안전", inds: ["alert", "ro5"], show: (c) => `경고 ${c.al.length ? c.al.length + "개" : "없음"} · Ro5 ${c.ro5}`,
      auto: (c) => (c.al.length ? 1 : c.ro5 === 0 ? 5 : c.ro5 === 1 ? 3 : 2) },
    { k: "qed", t: "약다움", inds: ["qed"], show: (c) => `QED ${c.qed.toFixed(2)}`,
      auto: (c) => (c.qed >= 0.75 ? 5 : c.qed >= 0.6 ? 4 : c.qed >= 0.5 ? 3 : c.qed >= 0.35 ? 2 : 1) },
    { k: "bind", t: "결합", inds: ["score"], show: (c) => `점수 ${c.score.toFixed(3)}`,
      auto: (c) => (c.score >= 0.8 ? 5 : c.score >= 0.7 ? 4 : c.score >= 0.6 ? 3 : c.score >= 0.5 ? 2 : 1) }
  ];
  const J22 = { key: null, ids: [], marks: {}, w: { abs: 1, safe: 1, qed: 1, bind: 1 }, hint: false, taken: false };
  SV.add({
    id: "22",
    line: "통과 분자 5개를 심사위원처럼 채점합니다. 흡수 · 안전 · 약다움 · 결합을 값을 보며 1~5점으로 매기고, 무엇을 더 중요하게 볼지 가중치를 정하세요.",
    goal: "여러 지표를 한꺼번에 저울질하는 법 — 점수 하나(계산 순위)와 내 판단이 왜 다른지",
    render(el, ctx) {
      const pass = passList(ctx), key = sig(ctx.S);
      if (J22.key !== key) {
        J22.key = key; J22.taken = false;
        J22.ids = [0, 2, 5, 9, 14].map((i) => pass[i]).filter(Boolean).map((c) => c.id);
        if (J22.ids.length < 5) J22.ids = pass.slice(0, 5).map((c) => c.id);
        for (const id of J22.ids) if (!J22.marks[id]) J22.marks[id] = { abs: 3, safe: 3, qed: 3, bind: 3 };
      }
      const list = J22.ids.map((id) => ctx.XM.get(id));
      if (!list.length) { el.innerHTML = `${CSS}<p class="q">통과 분자가 없어요.</p><div class="fb">왼쪽 사전에서 기준을 넓혀 보세요.</div>`; return; }
      const clamp = (v) => Math.max(1, Math.min(5, v));
      const row = (c) => `<tr><td><b data-cid="${c.id}">${nm(ctx, c, 14)}</b><div class="mono muted" style="font-size:10.5px">통과 ${c.rank}위</div></td>
        ${C22.map((k) => `<td><div class="mono" style="font-size:11px;white-space:nowrap">${k.show(c)}</div><div class="seg" style="margin-top:4px;min-width:150px">${[1, 2, 3, 4, 5].map((v) => `<button type="button" data-mark22="${c.id}|${k.k}|${v}" aria-pressed="${J22.marks[c.id][k.k] === v}">${v}</button>`).join("")}</div>
          ${J22.hint ? `<div class="sub" style="font-size:11px;margin-top:2px">힌트 ${clamp(k.auto(c))}점</div>` : ""}</td>`).join("")}</tr>`;
      el.innerHTML = `${CSS}
        <div class="row" style="justify-content:space-between"><p class="q">심사위원 점수표 — ${ctx.gene} 미션</p><button type="button" class="btn sm" data-hint22="1" aria-pressed="${J22.hint}">${J22.hint ? "힌트 숨기기" : "계산 힌트 보기"}</button></div>
        <p class="sub">${ctx.ind("tpsa")}·${ctx.ind("mw")} → 흡수, ${ctx.ind("alert")}·${ctx.ind("ro5")} → 안전, ${ctx.ind("qed")} → 약다움, ${ctx.ind("score")} → 결합. 모든 칸은 3점에서 시작해요.</p>
        <div class="l3-scroll"><table class="l3-tbl"><thead><tr><th>후보</th>${C22.map((k) => `<th>${k.t}</th>`).join("")}</tr></thead><tbody>${list.map(row).join("")}</tbody></table></div>
        <div class="l3-box"><h4>가중치 — 무엇을 더 중요하게 볼까?</h4>
          <div class="grid" style="--min:150px">${C22.map((k) => `<label class="ctlrow"><span class="lab"><span>${k.t}</span><span class="val" id="w22v-${k.k}">×${J22.w[k.k]}</span></span><input type="range" id="w22-${k.k}" min="0" max="3" step="1" value="${J22.w[k.k]}" data-w22="${k.k}"></label>`).join("")}</div>
          <p class="sub" style="font-size:12px">미션 '${ctx.esc(ctx.M.title)}'에 맞게 정해 보세요. ${ctx.esc(ctx.M.hints[0])}.</p></div>
        <div id="r22"></div>`;
      const res = () => {
        const sw = C22.reduce((s, k) => s + J22.w[k.k], 0) || 1;
        const tot = (c) => C22.reduce((s, k) => s + J22.marks[c.id][k.k] * J22.w[k.k], 0) / sw;
        const mine = [...list].sort((a, b) => tot(b) - tot(a)), calc = [...list].sort((a, b) => b.score - a.score);
        const diffs = mine.map((c, i) => calc.indexOf(c) - i);
        const moved = diffs.filter((d) => d !== 0).length;
        el.querySelector("#r22").innerHTML = `<div class="l3-box"><h4>내 심사 순위 vs 계산 순위(${ctx.gene} 점수만)</h4>
          <table class="l3-tbl"><thead><tr><th class="num">내 순위</th><th>후보</th><th class="num">내 점수</th><th class="num">계산 순위</th><th>차이</th></tr></thead><tbody>
          ${mine.map((c, i) => `<tr><td class="num">${i + 1}</td><td data-cid="${c.id}">${nm(ctx, c, 18)}</td><td class="num">${tot(c).toFixed(2)}</td><td class="num">${calc.indexOf(c) + 1}</td>
            <td>${diffs[i] > 0 ? `<span class="chip ok">▲ ${diffs[i]} 올림</span>` : diffs[i] < 0 ? `<span class="chip warn">▼ ${-diffs[i]} 내림</span>` : `<span class="chip">같음</span>`}</td></tr>`).join("")}</tbody></table>
          <div class="fb">${moved ? `순위가 ${moved}곳에서 달라졌어요. 계산 순위는 표적에 잘 붙는지만 보지만, 여러분은 흡수와 안전도 함께 봤기 때문이에요. 어느 쪽이 미션에 더 맞는지 말할 수 있으면 돼요.` : "계산 순위와 똑같아요. 결합 가중치만 크게 두었거나, 다른 지표의 차이가 작았다는 뜻이에요. 가중치를 바꿔 보세요."}</div>
          <div class="row"><button type="button" class="btn hi" data-take22="1">내 순위 상위 2개 바구니에 담기</button>${J22.taken ? `<span class="chip ok">✓ 담았어요 — 심사 점수가 근거로 저장됨</span>` : ""}</div></div>`;
        return { mine, tot };
      };
      let R = res();
      return listen(el, {
        click(e) {
          const m = e.target.closest("[data-mark22]"), h = e.target.closest("[data-hint22]"), t = e.target.closest("[data-take22]");
          if (m) { const [id, k, v] = m.dataset.mark22.split("|"); J22.marks[id][k] = +v; ctx.rerender(); }
          else if (h) { J22.hint = !J22.hint; ctx.rerender(); }
          else if (t) {
            const top = R.mine.slice(0, 2);
            top.forEach((c) => { if (!ctx.S.picks.includes(c.id) && ctx.S.picks.length < ctx.PICK_MAX) ctx.S.picks.push(c.id);
              ctx.S.why[c.id] = `심사 점수 ${R.tot(c).toFixed(2)} — ${C22.map((k) => `${k.t} ${J22.marks[c.id][k.k]}`).join(" · ")} (가중치 ${C22.map((k) => k.t + "×" + J22.w[k.k]).join(" ")})`; });
            J22.taken = true; ctx.set({}, false);
          }
        },
        input(e) { const w = e.target.dataset.w22; if (w) { J22.w[w] = +e.target.value; el.querySelector(`#w22v-${w}`).textContent = "×" + e.target.value; R = res(); } }
      });
    }
  });

  /* ── 23 모둠 찜 보드 ── */
  const G23 = { key: null, names: ["모둠원 1", "모둠원 2", "모둠원 3", "모둠원 4"], claims: [[], [], [], []], why: {}, act: 0, done: null };
  SV.add({
    id: "23",
    line: "모둠원 네 명이 통과 분자 중에서 1인 1~2개씩 '내 담당 후보'를 찜합니다. 왜 그 분자를 맡는지 한 줄씩 쓰고, 모두 모이면 모둠 후보로 확정하세요.",
    goal: "후보를 나눠 맡고, 각자 근거를 대며 모둠의 최종 후보를 함께 정하는 법",
    render(el, ctx) {
      const pass = passList(ctx), key = sig(ctx.S), top = pass.slice(0, 16);
      if (G23.key !== key) {
        G23.key = key; G23.done = null;
        const ok = new Set(pass.map((c) => c.id));
        G23.claims = G23.claims.map((l) => l.filter((id) => ok.has(id)));
        if (!G23.claims.some((l) => l.length) && top[0]) { G23.claims[0] = [top[0].id]; G23.why[`0:${top[0].id}`] = `예시 — ${ctx.gene} 점수가 통과 분자 중 1위(${top[0].score.toFixed(3)})예요`; }
      }
      const who = (id) => G23.claims.map((l, i) => (l.includes(id) ? i : -1)).filter((i) => i >= 0);
      const mem = (i) => {
        const l = G23.claims[i];
        return `<div class="l3-box" style="${G23.act === i ? "box-shadow: inset 0 0 0 2px var(--fg)" : ""}">
          <div class="row"><input class="l3-in" style="flex:1;width:auto" id="n23-${i}" data-name23="${i}" value="${ctx.esc(G23.names[i])}" aria-label="모둠원 이름"><span class="mono muted">${l.length}/2</span></div>
          <button type="button" class="btn sm" data-act23="${i}" aria-pressed="${G23.act === i}">${G23.act === i ? "지금 찜하는 중" : "이 사람이 찜하기"}</button>
          ${l.length ? l.map((id) => { const c = ctx.XM.get(id), dup = who(id).length > 1;
            return `<div style="display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--line);padding-top:6px"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b data-cid="${id}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nm(ctx, c, 14)}</b><button type="button" class="btn sm" data-un23="${i}:${id}" aria-label="찜 취소">✕</button></div>
              ${dup ? `<span class="chip warn">! ${who(id).filter((j) => j !== i).map((j) => ctx.esc(G23.names[j])).join(", ")}도 찜함</span>` : ""}
              <input class="l3-in" id="y23-${i}-${id}" data-why23="${i}:${id}" value="${ctx.esc(G23.why[`${i}:${id}`] || "")}" placeholder="왜 이 분자를 맡나요? (예: TPSA 62로 흡수 좋음)"></div>`; }).join("")
          : `<span class="sub" style="font-size:12px">아직 찜한 분자가 없어요.</span>`}</div>`;
      };
      const empty = G23.claims.map((l, i) => (l.length ? -1 : i)).filter((i) => i >= 0);
      const dups = [...new Set(G23.claims.flat())].filter((id) => who(id).length > 1);
      el.innerHTML = `${CSS}
        <p class="q">모둠 찜 보드 — ${ctx.esc(G23.names[G23.act])} 차례</p>
        <div class="grid" style="--min:190px">${[0, 1, 2, 3].map(mem).join("")}</div>
        <div class="l3-box"><h4>내 기준 통과 상위 ${top.length}개 <span class="sub" style="font-weight:400">— '찜'을 누르면 ${ctx.esc(G23.names[G23.act])}에게 들어가요</span></h4>
          <div class="grid" style="--min:260px;gap:6px">${top.map((c) => { const mine = G23.claims[G23.act].includes(c.id), full = !mine && G23.claims[G23.act].length >= 2, w = who(c.id);
            return `<div class="l3-line"><span class="mono muted" style="font-size:11px">${c.rank}</span><b data-cid="${c.id}" style="flex:1">${nm(ctx, c, 14)}</b>
              <span class="chip">TPSA ${c.tpsa.toFixed(0)}</span><span class="chip">QED ${c.qed.toFixed(2)}</span>${c.al.length ? `<span class="chip no">경고</span>` : ""}
              ${w.length ? `<span class="chip ok">${w.map((j) => ctx.esc(G23.names[j]).slice(0, 6)).join("·")}</span>` : ""}
              <button type="button" class="btn sm ${mine ? "hi" : ""}" data-claim23="${c.id}" ${full ? "disabled" : ""}>${mine ? "✓ 찜함" : full ? "2개 다 찼어요" : "찜"}</button></div>`; }).join("")}</div></div>
        ${dups.length ? `<div class="fb wrong"><b>같은 분자를 두 사람이 찜했어요.</b>${dups.map((id) => nm(ctx, ctx.XM.get(id))).join(", ")} — 한 분자는 한 사람이 맡아야 도킹 실험을 나눠 할 수 있어요. 한 명이 다른 분자로 바꿔 보세요.</div>` : ""}
        <div class="row"><button type="button" class="btn pri" data-ok23="1">모둠 후보로 확정 → 바구니</button>
          ${empty.length ? `<span class="sub">${empty.map((i) => ctx.esc(G23.names[i])).join(", ")} 아직 찜하지 않음</span>` : `<span class="chip ok">✓ 모두 찜했어요</span>`}</div>
        ${G23.done ? `<div class="fb right"><b>확정했어요.</b>${G23.done}</div>` : ""}`;
      return listen(el, {
        click(e) {
          const a = e.target.closest("[data-act23]"), cl = e.target.closest("[data-claim23]"), un = e.target.closest("[data-un23]"), ok = e.target.closest("[data-ok23]");
          if (a) { G23.act = +a.dataset.act23; ctx.rerender(); }
          else if (cl) { const id = cl.dataset.claim23, l = G23.claims[G23.act]; if (l.includes(id)) G23.claims[G23.act] = l.filter((x) => x !== id); else if (l.length < 2) l.push(id); ctx.rerender(); }
          else if (un) { const [i, id] = un.dataset.un23.split(":"); G23.claims[+i] = G23.claims[+i].filter((x) => x !== id); ctx.rerender(); }
          else if (ok) {
            const ids = [];
            G23.claims.forEach((l, i) => l.forEach((id) => { if (!ids.find((x) => x.id === id)) ids.push({ id, i }); }));
            const room = ctx.PICK_MAX - ctx.S.picks.filter((id) => !ids.some((x) => x.id === id)).length;
            const take = ids.slice(0, Math.max(0, room));
            take.forEach(({ id, i }) => { if (!ctx.S.picks.includes(id)) ctx.S.picks.push(id); ctx.S.why[id] = `${G23.names[i]} 담당 — ${G23.why[`${i}:${id}`] || "이유 없음"}`; });
            G23.done = take.length ? `${take.length}개를 바구니에 담고, 각자 쓴 이유를 근거로 저장했어요.${ids.length > take.length ? ` 바구니(최대 ${ctx.PICK_MAX}개)가 차서 ${ids.length - take.length}개는 못 담았어요.` : ""}` : "찜한 분자가 없어요.";
            ctx.set({}, false);
          }
        },
        input(e) {
          const n = e.target.dataset.name23, y = e.target.dataset.why23;
          if (n != null) G23.names[+n] = e.target.value.slice(0, 12) || `모둠원 ${+n + 1}`;
          if (y) G23.why[y] = e.target.value;
        },
        change(e) { if (e.target.dataset.name23 != null) ctx.rerender(); }
      });
    }
  });

  /* ── 24 근거 일관성 점검 ── */
  const KW = [
    { k: "tpsa", re: /TPSA|극성/i }, { k: "mw", re: /MW|분자량|무게|크기가|작아|작고|작은/i }, { k: "logp", re: /logP|기름/i },
    { k: "qed", re: /QED|약다/i }, { k: "score", re: /점수|결합|잘 붙|붙어/ }, { k: "alert", re: /경고|독성|안전/ },
    { k: "ro5", re: /Ro5|리핀스키|5규칙/i }, { k: "vina", re: /Vina|에너지|kcal/i }
  ];
  function judgeInd(k, c, ctx) {
    const a = ctx.M.advice, I = ctx.INDM[k];
    switch (k) {
      case "tpsa": { const lim = a.tpsaMax || 120; return { ok: c.tpsa <= lim, t: `TPSA ${c.tpsa.toFixed(0)} — ${a.tpsaMax ? "미션 조언" : "장 흡수 기준"} ≤ ${lim}` }; }
      case "mw": { const lim = a.mwMax || 500; return { ok: c.mw <= lim, t: `MW ${c.mw.toFixed(0)} — ${a.mwMax ? "미션 조언" : "먹는 약 기준"} ≤ ${lim}` }; }
      case "logp": return { ok: c.logp >= 0 && c.logp <= 5, t: `logP ${c.logp.toFixed(1)} — 적당한 범위 0~5` };
      case "qed": { const lim = a.qedMin || 0.5; return { ok: c.qed >= lim, t: `QED ${c.qed.toFixed(2)} — ${a.qedMin ? "미션 조언" : "무난한 기준"} ≥ ${lim}` }; }
      case "score": return { ok: c.srank <= 30, t: `${ctx.gene} 점수 ${c.score.toFixed(3)} — 전체 220개 중 ${c.srank}위${c.srank <= 30 ? "(상위권)" : ""}` };
      case "alert": return { ok: !c.al.length, t: c.al.length ? `경고 부품 ${c.al.map(ctx.alName).join(" · ")} 있음` : "경고 부품 없음" };
      case "ro5": return { ok: c.ro5 === 0, t: `Ro5 위반 ${c.ro5}개` };
      case "vina": return { ok: c.vina != null && c.vina <= -9, t: `Vina ${c.vina != null ? c.vina.toFixed(1) : "—"} kcal/mol — 강한 편 ≤ −9` };
    }
    return { ok: true, t: I ? I.sym : k };
  }
  const E24 = { edit: new Set(), draft: {} };
  SV.add({
    id: "24",
    line: "바구니의 분자마다 내가 쓴 근거를 실제 지표 값과 대조합니다. 근거에 나온 지표(TPSA · QED · 점수 등)를 찾아 그 값이 정말 좋은지 판정해요.",
    goal: "근거를 말로만이 아니라 값으로 뒷받침하기 — 근거와 데이터가 어긋나는 곳 찾기",
    render(el, ctx) {
      const list = picks(ctx);
      const block = (c) => {
        const why = ctx.S.why[c.id] || "", found = KW.filter((w) => w.re.test(why)).map((w) => w.k);
        const js = found.map((k) => ({ k, ...judgeInd(k, c, ctx) }));
        const bad = js.filter((j) => !j.ok);
        const missed = ctx.issues(c).filter((i) => !found.some((k) => i.t.includes(ctx.INDM[k].sym) || (k === "alert" && i.t.includes("경고"))));
        const editing = !why || E24.edit.has(c.id);
        return `<div class="l3-box"><div class="row" style="justify-content:space-between"><h4 data-cid="${c.id}">${ctx.esc(c.n)}</h4><span class="mono muted" style="font-size:11px">${ctx.esc(c.lib)}</span></div>
          ${editing ? `<label class="sub" for="t24-${c.id}">근거 쓰기 — 지표 이름과 값을 넣어 보세요</label><textarea class="l3-in" id="t24-${c.id}" data-draft24="${c.id}" placeholder="예: TPSA가 ${c.tpsa.toFixed(0)}로 낮아 장에서 잘 흡수되고, QED ${c.qed.toFixed(2)}로 약다워요.">${ctx.esc(E24.draft[c.id] ?? why)}</textarea>
              <div class="row"><button type="button" class="btn sm pri" data-save24="${c.id}">근거 저장하고 점검</button>${why ? `<button type="button" class="btn sm" data-cancel24="${c.id}">취소</button>` : ""}</div>`
            : `<div class="fb">“${ctx.esc(why)}”</div><div class="row"><button type="button" class="btn sm" data-edit24="${c.id}">근거 고치기</button></div>`}
          ${why ? `<div style="display:flex;flex-direction:column;gap:4px">
            ${js.length ? js.map((j) => `<div class="row" style="gap:6px"><span class="chip ${j.ok ? "ok" : "no"}">${j.ok ? "✓ 맞음" : "✕ 모순"}</span>${ctx.ind(j.k)}<span class="mono" style="font-size:12px">${ctx.esc(j.t)}</span></div>`).join("")
              : `<div class="row"><span class="chip warn">! 지표 없음</span><span class="sub">근거에 지표 이름이 없어요. '${ctx.INDM.tpsa.sym}', '${ctx.INDM.qed.sym}'처럼 지표로 말해야 다른 사람이 확인할 수 있어요.</span></div>`}
            ${missed.length ? `<div class="row" style="gap:4px"><span class="sub" style="font-size:12px">근거가 놓친 점</span>${missed.slice(0, 3).map((i) => `<span class="chip ${i.lv}">${ctx.esc(i.t)}</span>`).join("")}</div>` : ""}
            ${bad.length ? `<div class="fb wrong"><b>근거와 값이 어긋나요.</b>${bad.map((j) => `${ctx.INDM[j.k].sym}: ${ctx.esc(j.t)}`).join(" / ")}. 근거를 고치거나 다른 분자를 골라 보세요.</div>`
              : js.length ? `<div class="fb right"><b>근거가 값과 맞아요.</b>${js.length}개 지표를 값으로 확인했어요.</div>` : ""}</div>` : ""}</div>`;
      };
      const all = list.length, ok = list.filter((c) => { const why = ctx.S.why[c.id] || ""; const f = KW.filter((w) => w.re.test(why)); return why && f.length && f.every((w) => judgeInd(w.k, c, ctx).ok); }).length;
      el.innerHTML = `${CSS}
        <div class="row" style="justify-content:space-between"><p class="q">근거 일관성 점검</p>${all ? `<span class="mono muted">근거가 값과 맞는 분자 ${ok} / ${all}</span>` : ""}</div>
        ${all ? `<div class="prog">${list.map((c) => { const why = ctx.S.why[c.id]; const f = why ? KW.filter((w) => w.re.test(why)) : []; return `<i class="${!why ? "" : f.length && f.every((w) => judgeInd(w.k, c, ctx).ok) ? "ok" : "no"}"></i>`; }).join("")}</div>
          <div class="grid" style="--min:300px">${list.map(block).join("")}</div>`
          : exBox(ctx, "바구니가 비어 있어요. 예시 후보 3개와 예시 근거로 점검을 체험해 보세요. (예시 근거 가운데 값과 어긋나는 것이 있는지 찾아보세요)")}`;
      return listen(el, {
        click(e) {
          const s = e.target.closest("[data-save24]"), ed = e.target.closest("[data-edit24]"), cn = e.target.closest("[data-cancel24]"), ex = e.target.closest("[data-ex3]");
          if (s) { const id = s.dataset.save24, v = (el.querySelector(`[data-draft24="${id}"]`) || {}).value || E24.draft[id] || ""; E24.edit.delete(id); delete E24.draft[id]; ctx.setWhy(id, v.trim()); ctx.rerender(); }
          else if (ed) { E24.edit.add(ed.dataset.edit24); ctx.rerender(); }
          else if (cn) { E24.edit.delete(cn.dataset.cancel24); delete E24.draft[cn.dataset.cancel24]; ctx.rerender(); }
          else if (ex) tryExample(ctx, [(c) => `TPSA가 ${c.tpsa.toFixed(0)}로 낮아 흡수가 잘 되고 점수도 높아요`,
            (c) => { const k = ["qed", "tpsa", "mw", "score"].find((x) => !judgeInd(x, c, ctx).ok); return k ? `${ctx.INDM[k].sym} 값이 아주 좋아서 골랐어요` : `QED가 높아 약다워요`; }, null]);
        },
        input(e) { const d = e.target.dataset.draft24; if (d) E24.draft[d] = e.target.value; }
      });
    }
  });

  /* ── 25 나 vs 계산 순위 ── */
  const N25 = { memo: {}, draft: {} };
  SV.add({
    id: "25",
    line: "내 바구니와 계산(내 기준 + 표적 점수 상위 N)을 나란히 놓습니다. 나만 고른 분자는 왜 골랐는지, 계산만 고른 분자는 왜 안 골랐는지 적어 보세요.",
    goal: "계산 순위를 그대로 따르지 않을 때, 그 차이를 근거로 설명하는 법",
    render(el, ctx) {
      const mine = picks(ctx), calc = ctx.X.filter((c) => c.f === 7).sort((a, b) => a.rank - b.rank);
      const mset = new Set(mine.map((c) => c.id)), cset = new Set(calc.map((c) => c.id));
      const both = mine.filter((c) => cset.has(c.id)), me = mine.filter((c) => !cset.has(c.id)), cal = calc.filter((c) => !mset.has(c.id));
      const uni = new Set([...mset, ...cset]).size;
      const tag = (c) => (c.f >= 6 ? `<span class="chip">통과 ${c.rank}위</span>` : `<span class="chip no">내 기준에서 걸림</span>`);
      const item = (c, kind) => `<div class="l3-line" style="flex-direction:column;align-items:stretch">
          <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b data-cid="${c.id}">${nm(ctx, c, 16)}</b><span class="mono muted" style="font-size:11px">${c.score.toFixed(3)}</span></div>
          <div class="row" style="gap:4px">${tag(c)}${ctx.issues(c).slice(0, 2).map((i) => `<span class="chip ${i.lv}">${ctx.esc(i.t.split(" — ")[0].split("(")[0])}</span>`).join("")}</div>
          ${kind === "me" ? `<textarea class="l3-in" id="w25-${c.id}" data-d25="${c.id}" placeholder="계산은 안 골랐는데 왜 골랐나요?">${ctx.esc(N25.draft[c.id] ?? ctx.S.why[c.id] ?? "")}</textarea><button type="button" class="btn sm" data-s25="${c.id}">근거 저장</button>`
            : kind === "cal" ? `<input class="l3-in" id="m25-${c.id}" data-m25="${c.id}" value="${ctx.esc(N25.memo[c.id] || "")}" placeholder="왜 안 골랐나요? (메모)"><div>${ctx.pickBtn(c)}</div>`
            : ctx.S.why[c.id] ? `<span class="sub" style="font-size:12px">근거: ${ctx.esc(ctx.S.why[c.id])}</span>` : `<span class="sub" style="font-size:12px">근거 없음</span>`}</div>`;
      const col = (t, l, kind, hint) => `<div class="l3-box"><h4>${t} <span class="mono muted">${l.length}</span></h4><p class="sub" style="font-size:12px">${hint}</p>${l.length ? l.map((c) => item(c, kind)).join("") : `<span class="sub">없음</span>`}</div>`;
      const W = 300, H = 120;
      const venn = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:340px" role="img" aria-label="겹침 그림">
        <circle cx="115" cy="60" r="52" fill="var(--f7)" fill-opacity="0.45" stroke="var(--hit-ring)"/><circle cx="185" cy="60" r="52" fill="var(--f2)" fill-opacity="0.22" stroke="var(--f2)"/>
        <text x="85" y="64" text-anchor="middle" font-size="20" class="t-mono">${me.length}</text><text x="150" y="64" text-anchor="middle" font-size="20" font-weight="600" class="t-mono">${both.length}</text><text x="215" y="64" text-anchor="middle" font-size="20" class="t-mono">${cal.length}</text>
        <text x="85" y="114" text-anchor="middle" font-size="11" class="t-muted">나만</text><text x="150" y="114" text-anchor="middle" font-size="11" class="t-muted">둘 다</text><text x="215" y="114" text-anchor="middle" font-size="11" class="t-muted">계산만</text></svg>`;
      const badMe = me.filter((c) => c.f <= 5);
      el.innerHTML = `${CSS}
        <div class="row" style="justify-content:space-between;align-items:flex-start"><div style="display:flex;flex-direction:column;gap:6px;min-width:0;flex:1">
          <p class="q">나 vs 계산 순위</p><p class="sub">계산 = 내 기준을 통과한 분자 중 ${ctx.ind("score", ctx.gene + " 점수")} 상위 ${ctx.S.topN}개.</p>
          ${mine.length ? `<div><span class="l3-big">${Math.round((both.length / (mine.length || 1)) * 100)}%</span> <span class="sub">내 선택 중 계산과 겹침 (${both.length}/${mine.length}) · 전체 겹침 ${both.length}/${uni}</span></div>` : ""}</div>${venn}</div>
        ${mine.length ? "" : exBox(ctx)}
        ${badMe.length ? `<div class="fb wrong"><b>내 기준에서 걸린 분자를 골랐어요.</b>${badMe.map((c) => `${nm(ctx, c)}(${ctx.esc(ctx.reason(c))})`).join(", ")}. 기준을 바꿀지, 분자를 바꿀지 정하세요.</div>` : ""}
        ${me.length && !badMe.length ? `<div class="fb">나만 고른 분자는 기준을 통과했지만 점수 순위는 낮아요. 점수 대신 무엇을 봤는지(흡수 · 안전 · 미션 적합성) 적어 두면 좋은 근거가 돼요.</div>` : ""}
        <div class="grid" style="--min:240px">${col("나만", me, "왜 골랐는지 근거로 남기세요.", "")}${col("둘 다", both, "계산과 내가 모두 고른 분자예요.", "")}${col("계산만", cal, "점수는 높은데 고르지 않은 분자예요.", "")}</div>`;
      return listen(el, {
        click(e) {
          const s = e.target.closest("[data-s25]"), ex = e.target.closest("[data-ex3]");
          if (s) { const id = s.dataset.s25; ctx.setWhy(id, (N25.draft[id] ?? ctx.S.why[id] ?? "").trim()); delete N25.draft[id]; ctx.rerender(); }
          else if (ex) tryExample(ctx);
        },
        input(e) { const d = e.target.dataset.d25, m = e.target.dataset.m25; if (d) N25.draft[d] = e.target.value; if (m) N25.memo[m] = e.target.value; }
      });
    }
  });

  /* ── 26 왜 떨어졌을까 탐정 ── */
  const STD26 = { mwMax: 500, tpsaMax: 120, ro5Max: 0, noAlerts: true, qedMin: 0.5 };
  function fail26(c, cut) {
    if (c.mw > cut.mwMax || c.tpsa > cut.tpsaMax) return { g: 2, inds: [c.mw > cut.mwMax && "mw", c.tpsa > cut.tpsaMax && "tpsa"].filter(Boolean) };
    if (c.ro5 > cut.ro5Max) { const b = [c.mw > 500 && "mw", c.logp > 5 && "logp", c.hbd > 5 && "hbd", c.hba > 10 && "hba"].filter(Boolean); return { g: 3, inds: b.length ? b : ["mw", "logp", "hbd", "hba"] }; }
    if (cut.noAlerts && c.al.length) return { g: 4, inds: ["alert"] };
    if (c.qed < cut.qedMin) return { g: 5, inds: ["qed"] };
    return null;
  }
  const D26 = { key: null, seed: 26, qs: [], cut: null, std: false, i: 0, a1: null, a2: null, log: [] };
  const IND26 = ["mw", "tpsa", "logp", "hbd", "hba", "alert", "qed"];
  function limit26(k, cut) {
    return { mw: `≤ ${cut.mwMax}${cut.mwMax !== 500 ? "" : ""}`, tpsa: `≤ ${cut.tpsaMax}`, logp: "≤ 5 (Ro5)", hbd: "≤ 5 (Ro5)", hba: "≤ 10 (Ro5)", alert: "없어야 함", qed: `≥ ${cut.qedMin.toFixed(2)}` }[k];
  }
  SV.add({
    id: "26",
    line: "기준에서 떨어진 분자 카드를 보고 탐정처럼 추리하세요. 먼저 어느 관문에서 걸렸는지, 그다음 어느 지표 때문인지 맞혀요. 10문제.",
    goal: "기준표와 지표 값을 대조해 '왜 탈락했는지'를 스스로 찾아내는 법 — 깔때기는 순서대로 거른다는 것",
    render(el, ctx) {
      const S = ctx.S, mine = { mwMax: S.mwMax, tpsaMax: S.tpsaMax, ro5Max: S.ro5Max, noAlerts: S.noAlerts, qedMin: S.qedMin };
      const pool = (cut) => ctx.X.filter((c) => c.p.lib).map((c) => ({ c, fl: fail26(c, cut) })).filter((x) => x.fl);
      const key = sig(S) + "|" + D26.seed;
      if (D26.key !== key) {
        let cut = mine, pl = pool(mine);
        D26.std = pl.length < 10 || new Set(pl.map((x) => x.fl.g)).size < 2;
        if (D26.std) { cut = STD26; pl = pool(STD26); }
        D26.cut = cut;
        const rng = ctx.rng(D26.seed), by = {};
        pl.forEach((x) => (by[x.fl.g] = by[x.fl.g] || []).push(x.c.id));
        Object.values(by).forEach((l) => l.sort(() => rng() - 0.5));
        const gs = Object.keys(by), qs = [];
        for (let r = 0; qs.length < 10 && gs.some((g) => by[g].length > r); r++) gs.forEach((g) => { if (qs.length < 10 && by[g][r]) qs.push(by[g][r]); });
        D26.qs = qs; D26.key = key; D26.i = 0; D26.a1 = null; D26.a2 = null; D26.log = [];
      }
      const cut = D26.cut, n = D26.qs.length;
      const cutChips = `<div class="row" style="gap:4px"><span class="l3-tag">${D26.std ? "탐정용 표준 기준" : "내 기준"}</span><span class="chip">MW ≤ ${cut.mwMax}</span><span class="chip">TPSA ≤ ${cut.tpsaMax}</span><span class="chip">Ro5 위반 ≤ ${cut.ro5Max}</span><span class="chip">경고 ${cut.noAlerts ? "빼기" : "허용"}</span><span class="chip">QED ≥ ${cut.qedMin.toFixed(2)}</span></div>
        ${D26.std ? `<p class="sub" style="font-size:12px">지금 내 기준으로는 떨어지는 분자가 적어서, 문제를 내려고 표준 기준을 썼어요.</p>` : ""}`;
      const prog = `<div class="prog">${Array.from({ length: n }, (_, i) => { const l = D26.log[i]; return `<i class="${l ? (l.ok1 && l.ok2 ? "ok" : "no") : i === D26.i ? "on" : ""}"></i>`; }).join("")}</div>`;
      if (!n) { el.innerHTML = `${CSS}<p class="q">떨어진 분자가 없어요.</p>${cutChips}`; return; }
      if (D26.i >= n) {
        const s = D26.log.filter((l) => l.ok1 && l.ok2).length;
        el.innerHTML = `${CSS}<p class="q">탐정 결과 — ${s} / ${n} 완벽 추리</p>${prog}${cutChips}
          <div class="fb ${s >= 7 ? "right" : ""}"><b>${s >= 7 ? "훌륭해요." : "조금 더 연습해 봐요."}</b>관문 맞힘 ${D26.log.filter((l) => l.ok1).length}개 · 지표 맞힘 ${D26.log.filter((l) => l.ok2).length}개. 기억할 점: 깔때기는 ② → ③ → ④ → ⑤ 순서로 걸러서, 여러 관문을 어긴 분자도 '처음 걸린 관문'에서 떨어져요.</div>
          <div class="row"><button type="button" class="btn pri" data-new26="1">새 문제 10개</button></div>`;
        return listen(el, { click(e) { if (e.target.closest("[data-new26]")) { D26.seed++; ctx.rerender(); } } });
      }
      const c = ctx.XM.get(D26.qs[D26.i]), fl = fail26(c, cut);
      const all = [2, 3, 4, 5].filter((g) => {
        if (g === 2) return c.mw > cut.mwMax || c.tpsa > cut.tpsaMax; if (g === 3) return c.ro5 > cut.ro5Max;
        if (g === 4) return cut.noAlerts && c.al.length; return c.qed < cut.qedMin; });
      let q1 = `<div class="l3-box"><span class="l3-tag">질문 1</span><h4>어느 관문에서 걸렸을까?</h4><div class="l3-opts">${[2, 3, 4, 5].map((g) => `<button type="button" class="btn sm" data-a1="${g}" ${D26.a1 != null ? "disabled" : ""} aria-pressed="${D26.a1 === g}">${GATE_NM[g]}</button>`).join("")}</div>`;
      if (D26.a1 != null) {
        const ok = D26.a1 === fl.g;
        q1 += `<div class="fb ${ok ? "right" : "wrong"}"><b>${ok ? "맞아요." : "아니에요."}</b>${GATE_NM[fl.g]}에서 처음 걸렸어요.${all.length > 1 ? ` 이 분자는 ${all.map((g) => GATE_NM[g]).join(", ")}을 모두 어겼지만, 깔때기는 순서대로 거르니 가장 앞 관문에서 떨어져요.` : ""}</div>`;
      }
      q1 += `</div>`;
      let q2 = "";
      if (D26.a1 != null) {
        q2 = `<div class="l3-box"><span class="l3-tag">질문 2</span><h4>${GATE_NM[fl.g]}에서 어느 지표 때문일까?</h4><div class="l3-opts">${IND26.map((k) => `<button type="button" class="btn sm" data-a2="${k}" ${D26.a2 != null ? "disabled" : ""} aria-pressed="${D26.a2 === k}">${ctx.INDM[k].sym} · ${ctx.INDM[k].name}</button>`).join("")}</div>`;
        if (D26.a2 != null) {
          const ok = fl.inds.includes(D26.a2), I = ctx.INDM[fl.inds[0]];
          q2 += `<div class="fb ${ok ? "right" : "wrong"}"><b>${ok ? "맞아요." : "아니에요."}</b>${fl.inds.map((k) => `${ctx.INDM[k].sym} ${ctx.INDM[k].fmt(ctx.INDM[k].val(c))} (기준 ${limit26(k, cut)})`).join(", ")}${fl.g === 3 ? ` → Ro5 위반 ${c.ro5}개 > 허용 ${cut.ro5Max}개` : ""}. ${I.an}</div>
            <div class="row"><button type="button" class="btn pri" data-next26="1">${D26.i + 1 < n ? "다음 문제 →" : "결과 보기"}</button></div>`;
        }
        q2 += `</div>`;
      }
      el.innerHTML = `${CSS}<div class="row" style="justify-content:space-between"><p class="q">사건 ${D26.i + 1} / ${n} — 이 분자는 왜 떨어졌을까?</p><span class="mono muted">${D26.log.filter((l) => l.ok1 && l.ok2).length}점</span></div>${prog}${cutChips}
        <div class="l3-split"><div>${ctx.mcard(c, { keys: ["mw", "tpsa", "logp", "hbd", "hba", "ro5", "alert", "qed", "score"], pick: false, judge: false })}</div>
        <div style="display:flex;flex-direction:column;gap:12px;min-width:0">${q1}${q2}</div></div>`;
      return listen(el, {
        click(e) {
          const a1 = e.target.closest("[data-a1]"), a2 = e.target.closest("[data-a2]"), nx = e.target.closest("[data-next26]");
          if (a1 && D26.a1 == null) { D26.a1 = +a1.dataset.a1; ctx.rerender(); }
          else if (a2 && D26.a2 == null) { D26.a2 = a2.dataset.a2; ctx.rerender(); }
          else if (nx) { D26.log[D26.i] = { ok1: D26.a1 === fl.g, ok2: fl.inds.includes(D26.a2) }; D26.i++; D26.a1 = null; D26.a2 = null; ctx.rerender(); }
        }
      });
    }
  });

  /* ── 27 실수 찾기 ── 다른 모둠 '뉴로링크'의 알츠하이머(ACHE) 약 기준표와 후보 */
  const M27 = { found: new Set(), okSeen: new Set(), last: null };
  function case27(ctx) {
    const C = ctx.CMP && ctx.CMP.size ? [...ctx.CMP.values()] : ctx.X;
    const ache = (c) => c.sc["ache-4ey7"] || 0;
    const A = C.filter((c) => c.al.length && c.mw <= 450).sort((a, b) => ache(b) - ache(a))[0];
    const B = C.filter((c) => c.qed <= 0.3 && !c.al.length).sort((a, b) => ache(b) - ache(a))[0];
    const G = C.find((c) => c.id === "CHEMBL502");
    return [
      { id: "c1", kind: "기준", t: "분자량 MW ≤ 450 Da", bad: false, ex: "뇌 약은 작을수록 뇌혈관 장벽을 넘기 쉬워서 450 이하로 둔 건 잘한 선택이에요.", ind: "mw" },
      { id: "c2", kind: "기준", t: "극성 표면적 TPSA ≤ 150 Å²", bad: true, ex: "뇌에 들어가려면 TPSA 90 이하여야 해요. 150은 장 흡수 기준(140)보다도 느슨해서, 뇌에 못 가는 분자가 잔뜩 통과해요.", ind: "tpsa" },
      { id: "c3", kind: "기준", t: "Ro5 위반 2개까지 허용", bad: true, ex: "먹는 약은 위반 0~1개가 안전해요. 매일 먹는 노인 환자 약인데 2개까지 허용하면 흡수가 안 되는 분자가 섞여요.", ind: "ro5" },
      { id: "c4", kind: "기준", t: "구조 경고 부품 허용", bad: true, ex: "노인 환자가 몇 년씩 먹을 약이라 몸속에서 독성 물질로 바뀌는 부품(방향족 아민 · 니트로)은 처음부터 빼야 해요.", ind: "alert" },
      { id: "c5", kind: "기준", t: "약다움 QED ≥ 0.5", bad: false, ex: "QED 0.5 이상은 무난한 기준이에요.", ind: "qed" },
      A && { id: "p1", kind: "후보", c: A, t: `${ctx.short(A.n, 18)} — 경고 ${A.al.map(ctx.alName).join("·")} · TPSA ${A.tpsa.toFixed(0)} · QED ${A.qed.toFixed(2)}`, bad: true, ex: `${ctx.short(A.n, 14)}에는 ${A.al.map(ctx.alName).join("·")} 부품이 있어요. ACHE 점수(${ache(A).toFixed(3)})가 높아도 오래 먹을 약엔 위험해요.`, ind: "alert" },
      B && { id: "p2", kind: "후보", c: B, t: `${ctx.short(B.n, 18)} — QED ${B.qed.toFixed(2)} · TPSA ${B.tpsa.toFixed(0)}`, bad: true, ex: `QED ${B.qed.toFixed(2)}로, 팀이 스스로 정한 QED ≥ 0.5 기준도 어겼어요. 자기 기준과 맞지 않는 선택은 근거가 될 수 없어요.`, ind: "qed" },
      G && { id: "p3", kind: "후보", c: G, t: `${ctx.short(G.n, 18)} — TPSA ${G.tpsa.toFixed(0)} · QED ${G.qed.toFixed(2)} · 경고 없음`, bad: false, ex: `도네페질은 실제 알츠하이머 약이에요. TPSA ${G.tpsa.toFixed(1)}로 뇌에 잘 들어가요. 잘 고른 후보예요.`, ind: "tpsa" }
    ].filter(Boolean);
  }
  SV.add({
    id: "27",
    line: "다른 모둠 '뉴로링크'가 알츠하이머 약을 찾으려고 만든 기준표와 후보예요. 숨어 있는 실수 5개를 찾아 줄을 눌러 보세요.",
    goal: "미션(뇌에 가야 하는 약)과 맞지 않는 기준, 자기 기준과 어긋나는 선택을 알아보는 눈",
    render(el, ctx) {
      const rows = case27(ctx), total = rows.filter((r) => r.bad).length, got = rows.filter((r) => r.bad && M27.found.has(r.id)).length;
      const line = (r) => {
        const open = M27.found.has(r.id) || M27.okSeen.has(r.id);
        return `<button type="button" class="r27 ${open ? (r.bad ? "bad" : "good") : ""}" data-r27="${r.id}" ${r.c ? `data-cid="${r.c.id}"` : ""}>
          <span class="l3-tag">${r.kind}</span><span class="t">${ctx.esc(r.t)}</span>
          ${open ? `<span class="chip ${r.bad ? "no" : "ok"}">${r.bad ? "✕ 실수" : "✓ 맞는 줄"}</span><span class="ex">${ctx.esc(r.ex)}</span>` : ""}</button>`;
      };
      el.innerHTML = `${CSS}<style>
          .r27 { width: 100%; border: 1px solid var(--line); background: var(--bg); text-align: left; padding: 9px 11px; display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 4px 10px; align-items: baseline; }
          .r27:hover { border-color: var(--fg); }
          .r27 .t { font-size: 13.5px; min-width: 0; }
          .r27 .ex { grid-column: 2 / -1; font-size: 12.5px; color: var(--muted); line-height: 1.5; }
          .r27.bad { border-color: var(--bad); background: var(--bad-bg); }
          .r27.good { border-color: var(--good); }
        </style>
        <div class="row" style="justify-content:space-between"><p class="q">모둠 '뉴로링크' · 알츠하이머(ACHE) 약 — 실수 ${got} / ${total}</p><button type="button" class="btn sm" data-reset27="1">다시</button></div>
        <div class="prog">${rows.filter((r) => r.bad).map((r) => `<i class="${M27.found.has(r.id) ? "no" : ""}"></i>`).join("")}</div>
        <div class="fb">뉴로링크의 미션: 약이 뇌혈관 장벽을 넘어 뇌 속 ACHE 를 막아야 해요. 노인 환자가 몇 년씩 매일 먹어요. 이상한 줄을 누르세요. ${M27.okSeen.size ? `(맞는 줄을 ${M27.okSeen.size}번 눌렀어요)` : ""}</div>
        <div style="display:flex;flex-direction:column;gap:6px"><span class="l3-tag">기준표</span>${rows.filter((r) => r.kind === "기준").map(line).join("")}
          <span class="l3-tag" style="margin-top:8px">고른 후보 3개</span>${rows.filter((r) => r.kind === "후보").map(line).join("")}</div>
        ${got === total ? `<div class="fb right"><b>실수 ${total}개를 모두 찾았어요.</b>이제 우리 모둠 차례예요. 지금 내 기준을 미션 조언과 비교해 보세요: ${ctx.adviceCheck().map((a) => `<span class="chip ${a.ok ? "ok" : "warn"}">${a.ok ? "✓" : "!"} ${ctx.esc(a.t)} · ${ctx.esc(a.mine)}</span>`).join(" ")}</div>` : ""}`;
      return listen(el, {
        click(e) {
          const r = e.target.closest("[data-r27]"), rs = e.target.closest("[data-reset27]");
          if (r) { const row = rows.find((x) => x.id === r.dataset.r27); (row.bad ? M27.found : M27.okSeen).add(row.id); ctx.rerender(); }
          else if (rs) { M27.found.clear(); M27.okSeen.clear(); ctx.rerender(); }
        }
      });
    }
  });

  /* ── 28 예측 → 실행 → 확인 ── */
  const P28 = { phase: "predict", opt: null, pred: "", before: null, after: null, prev: null, reflect: "", rounds: [] };
  const OPT28 = [
    { k: "tpsa90", t: "TPSA 상한을 90으로 (뇌 투과)", p: { tpsaMax: 90 } },
    { k: "ro50", t: "Ro5 위반 0개만", p: { ro5Max: 0 } },
    { k: "noal", t: "구조 경고 빼기", p: { noAlerts: true } },
    { k: "qed6", t: "QED 0.6 이상", p: { qedMin: 0.6 } },
    { k: "mw450", t: "분자량 450 이하", p: { mwMax: 450 } },
    { k: "tpsa140", t: "TPSA 상한을 140으로 (느슨하게)", p: { tpsaMax: 140 } },
    { k: "qed3", t: "QED 0.3 이상 (느슨하게)", p: { qedMin: 0.3 } },
    { k: "ro52", t: "Ro5 위반 2개까지 (느슨하게)", p: { ro5Max: 2 } }
  ];
  SV.add({
    id: "28",
    line: "기준 하나를 바꾸기 전에 통과 수를 먼저 예측하고, 실제로 바꿔서 결과와 비교합니다. 어느 관문에서 차이가 났는지 보고 한 줄 성찰을 남기세요.",
    goal: "기준 하나가 깔때기 전체에 미치는 영향을 감으로 예측하고, 데이터로 확인하는 습관",
    render(el, ctx) {
      const S = ctx.S, opts = OPT28.filter((o) => Object.entries(o.p).some(([k, v]) => S[k] !== v));
      const gates = [2, 3, 4, 5];
      const table = () => `<table class="l3-tbl" style="margin-top:4px"><thead><tr><th>라운드</th><th>바꾼 것</th><th class="num">전</th><th class="num">예측</th><th class="num">실제</th><th class="num">차이</th><th>성찰</th></tr></thead><tbody>
        ${P28.rounds.length ? P28.rounds.map((r, i) => `<tr><td class="num">${i + 1}</td><td>${ctx.esc(r.t)}</td><td class="num">${r.b}</td><td class="num">${r.p}</td><td class="num">${r.a}</td><td class="num">${r.a - r.p > 0 ? "+" : ""}${r.a - r.p}</td><td>${ctx.esc(r.r || "—")}</td></tr>`).join("")
          : `<tr style="opacity:0.55"><td class="num">예시</td><td>TPSA 상한을 90으로</td><td class="num">209</td><td class="num">150</td><td class="num">171</td><td class="num">+21</td><td>TPSA 큰 분자가 생각보다 적었다</td></tr>`}</tbody></table>`;
      let body = "";
      if (P28.phase === "predict") {
        body = `<div class="l3-split"><div class="l3-box"><span class="l3-tag">지금 내 기준 통과</span><span class="l3-big">${ctx.REM[5]}</span><span class="sub">220개 중 · 관문별로 ${gates.map((g) => `${NUM[g - 1]} −${ctx.DROP[g]}`).join(" ")}</span></div>
          <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
            <div class="l3-box"><span class="l3-tag">① 바꿀 기준 하나 고르기</span><div class="l3-opts">${opts.map((o) => `<button type="button" class="btn sm" data-o28="${o.k}" aria-pressed="${P28.opt === o.k}">${o.t}</button>`).join("")}</div></div>
            <div class="l3-box"><label class="l3-tag" for="p28">② 바꾸면 통과 수는 몇 개가 될까? (예측)</label><div class="row"><input class="l3-in" type="number" min="0" max="220" id="p28" data-p28="1" value="${ctx.esc(P28.pred)}" style="width:120px" placeholder="예: 150"><span class="sub">지금 ${ctx.REM[5]}개</span></div></div>
            <div class="row"><button type="button" class="btn pri" data-run28="1">③ 기준 바꾸고 결과 보기</button><span class="sub" id="m28"></span></div></div></div>`;
      } else {
        if (P28.after == null) P28.after = { rem: ctx.REM[5], drop: ctx.DROP.slice() };
        const o = OPT28.find((x) => x.k === P28.opt), b = P28.before, a = P28.after, p = +P28.pred, d = a.rem - p;
        const dg = gates.map((g) => ({ g, d: a.drop[g] - b.drop[g] })), big = [...dg].sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
        body = `<div class="grid" style="--min:150px">${[["전", b.rem], ["예측", p], ["실제", a.rem]].map(([t, v]) => `<div class="l3-box"><span class="l3-tag">${t}</span><span class="l3-big">${v}</span></div>`).join("")}
            <div class="l3-box"><span class="l3-tag">예측 차이</span><span class="l3-big">${d > 0 ? "+" : ""}${d}</span><span class="sub">${Math.abs(d) <= 5 ? "아주 잘 맞혔어요" : Math.abs(d) <= 20 ? "꽤 가까워요" : d > 0 ? "생각보다 많이 남았어요" : "생각보다 많이 걸렸어요"}</span></div></div>
          <div class="l3-box"><h4>바꾼 것: ${ctx.esc(o.t)} — 관문별로 걸린 수</h4>
            <table class="l3-tbl"><thead><tr><th>관문</th><th class="num">전</th><th class="num">후</th><th class="num">변화</th></tr></thead><tbody>
            ${dg.map((x) => `<tr style="${x.g === big.g && x.d ? "background:var(--raise)" : ""}"><td>${GATE_NM[x.g]}</td><td class="num">${b.drop[x.g]}</td><td class="num">${a.drop[x.g]}</td><td class="num">${x.d > 0 ? "+" : ""}${x.d}</td></tr>`).join("")}</tbody></table>
            <div class="fb">${big.d ? `${GATE_NM[big.g]}에서 가장 크게 변했어요(${big.d > 0 ? "+" : ""}${big.d}개).${dg.filter((x) => x.d && x.g !== big.g).length ? " 다른 관문 수도 바뀐 건, 앞 관문이 바뀌면 뒤 관문에 도착하는 분자가 달라지기 때문이에요." : ""}` : "관문별 수가 그대로예요. 이 기준에 걸리는 분자가 원래 없었다는 뜻이에요."}</div></div>
          <div class="l3-box"><label class="l3-tag" for="r28">④ 한 줄 성찰 — 예측이 왜 맞았거나 틀렸을까?</label><input class="l3-in" id="r28" data-r28="1" value="${ctx.esc(P28.reflect)}" placeholder="예: TPSA 90을 넘는 분자가 생각보다 많았다">
            <div class="row"><button type="button" class="btn pri" data-save28="1">기록하고 다음 라운드</button><button type="button" class="btn sm" data-undo28="1">기준 되돌리기</button></div></div>`;
      }
      el.innerHTML = `${CSS}<div class="row" style="justify-content:space-between"><p class="q">예측 → 실행 → 확인 · 라운드 ${P28.rounds.length + 1}</p><span class="mono muted">${P28.phase === "predict" ? "① ② 예측 단계" : "③ ④ 확인 단계"}</span></div>
        ${body}<div class="l3-box"><h4>라운드 기록</h4><div class="l3-scroll">${table()}</div></div>`;
      return listen(el, {
        click(e) {
          const o = e.target.closest("[data-o28]"), run = e.target.closest("[data-run28]"), sv = e.target.closest("[data-save28]"), un = e.target.closest("[data-undo28]");
          if (o) { P28.opt = o.dataset.o28; ctx.rerender(); }
          else if (run) {
            const m = el.querySelector("#m28");
            if (!P28.opt) { m.textContent = "바꿀 기준을 먼저 고르세요."; return; }
            if (P28.pred === "" || isNaN(+P28.pred)) { m.textContent = "예측 숫자를 먼저 쓰세요."; el.querySelector("#p28").focus(); return; }
            const opt = OPT28.find((x) => x.k === P28.opt);
            P28.before = { rem: ctx.REM[5], drop: ctx.DROP.slice() }; P28.prev = Object.fromEntries(Object.keys(opt.p).map((k) => [k, S[k]]));
            P28.after = null; P28.phase = "result"; ctx.set(opt.p);
          } else if (sv) {
            const opt = OPT28.find((x) => x.k === P28.opt);
            P28.rounds.push({ t: opt.t, b: P28.before.rem, p: +P28.pred, a: P28.after.rem, r: P28.reflect.trim() });
            Object.assign(P28, { phase: "predict", opt: null, pred: "", before: null, after: null, prev: null, reflect: "" }); ctx.rerender();
          } else if (un) { const prev = P28.prev; Object.assign(P28, { phase: "predict", opt: null, pred: "", before: null, after: null, prev: null, reflect: "" }); ctx.set(prev); }
        },
        input(e) { if (e.target.dataset.p28) P28.pred = e.target.value; if (e.target.dataset.r28) P28.reflect = e.target.value; }
      });
    }
  });

  /* ── 29 학습 퀘스트 지도 ── */
  SV.add({
    id: "29",
    line: "스크리닝 학습의 네 단계를 지도로 보여 줍니다. 단계마다 지금 상태로 달성했는지 판정하고, 다음에 할 활동을 추천해요.",
    goal: "지표 배우기 → 기준 정하기 → 후보 고르기 → 근거 남기기, 전체 흐름에서 내가 어디쯤인지",
    render(el, ctx) {
      const S = ctx.S, D = ctx.DEF;
      const changed = ["mwMax", "tpsaMax", "ro5Max", "noAlerts", "qedMin", "topN"].filter((k) => S[k] !== D[k]);
      const adv = ctx.adviceCheck(), advOk = adv.filter((a) => a.ok).length, list = picks(ctx), whys = list.filter((c) => (S.why[c.id] || "").trim()).length;
      const quiz = D26.log.filter((l) => l.ok1 && l.ok2).length;
      const stages = [
        { t: "지표 배우기", acts: [["01", "지표 카드 뒤집기"], ["04", "통과할까? 예측 퀴즈"], ["26", "왜 떨어졌을까 탐정"]],
          checks: [{ ok: D26.log.length >= 5, t: `탐정 문제 5개 이상 풀기 (${D26.log.length}개 · 완벽 ${quiz})` }, { ok: M27.found.size >= 3, t: `실수 찾기 3개 이상 (${M27.found.size}/5)` }], need: 1 },
        { t: "기준 정하기", acts: [["09", "미션 브리핑 → 기준 정하기"], ["10", "기준 코치"], ["28", "예측 → 실행 → 확인"]],
          checks: [{ ok: changed.length > 0, t: `처음 기준에서 바꾸기 (${changed.length}개 바꿈)` }, { ok: advOk >= Math.ceil(adv.length / 2), t: `미션 조언과 절반 이상 맞추기 (${advOk}/${adv.length})` }], need: 2 },
        { t: "후보 고르기", acts: [["15", "분자 쇼핑"], ["21", "토너먼트"], ["23", "모둠 찜 보드"]],
          checks: [{ ok: list.length >= 3, t: `바구니에 3개 이상 (${list.length}/${ctx.PICK_MAX})` }, { ok: list.length > 0 && list.every((c) => c.f >= 6), t: "고른 분자가 모두 내 기준 통과" }], need: 2 },
        { t: "근거 남기기", acts: [["30", "근거 문장 만들기"], ["24", "근거 일관성 점검"], ["25", "나 vs 계산 순위"]],
          checks: [{ ok: list.length > 0 && whys === list.length, t: `모든 후보에 근거 (${whys}/${list.length})` }], need: 1 }
      ].map((s) => ({ ...s, done: s.checks.filter((c) => c.ok).length >= s.need }));
      const cur = stages.findIndex((s) => !s.done);
      const W = Math.max(320, el.clientWidth - 36), narrow = W < 560;
      let svg;
      if (!narrow) {
        const H = 170, xs = stages.map((_, i) => 60 + (i * (W - 120)) / 3), ys = [110, 60, 110, 60];
        const path = xs.map((x, i) => `${i ? "L" : "M"}${x} ${ys[i]}`).join(" ");
        svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="퀘스트 지도"><path d="${path}" fill="none" stroke="var(--line-strong)" stroke-width="3" stroke-dasharray="6 6"/>
          ${stages.map((s, i) => `<g><circle cx="${xs[i]}" cy="${ys[i]}" r="24" fill="${s.done ? "var(--f7)" : "var(--surface)"}" stroke="${s.done ? "var(--hit-ring)" : i === cur ? "var(--fg)" : "var(--line-strong)"}" stroke-width="${i === cur ? 3 : 1.5}"/>
            <text x="${xs[i]}" y="${ys[i] + 6}" text-anchor="middle" font-size="17" font-weight="700" class="t-mono" style="fill:${s.done ? "var(--hi-fg)" : "var(--fg)"}">${s.done ? "✓" : i + 1}</text>
            <text x="${xs[i]}" y="${ys[i] + (ys[i] > 80 ? 46 : -34)}" text-anchor="middle" font-size="13" font-weight="600">${s.t}</text>
            ${i === cur ? `<text x="${xs[i]}" y="${ys[i] + (ys[i] > 80 ? 62 : -50)}" text-anchor="middle" font-size="11" class="t-muted">지금 여기</text>` : ""}</g>`).join("")}</svg>`;
      } else {
        const H = 4 * 64;
        svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="퀘스트 지도"><path d="M34 32 V${H - 32}" stroke="var(--line-strong)" stroke-width="3" stroke-dasharray="6 6"/>
          ${stages.map((s, i) => { const y = 32 + i * 64; return `<circle cx="34" cy="${y}" r="20" fill="${s.done ? "var(--f7)" : "var(--surface)"}" stroke="${s.done ? "var(--hit-ring)" : i === cur ? "var(--fg)" : "var(--line-strong)"}" stroke-width="${i === cur ? 3 : 1.5}"/>
            <text x="34" y="${y + 5}" text-anchor="middle" font-size="15" font-weight="700" class="t-mono" style="fill:${s.done ? "var(--hi-fg)" : "var(--fg)"}">${s.done ? "✓" : i + 1}</text>
            <text x="66" y="${y + 5}" font-size="14" font-weight="600">${s.t}${i === cur ? " — 지금 여기" : ""}</text>`; }).join("")}</svg>`;
      }
      el.innerHTML = `${CSS}<div class="row" style="justify-content:space-between"><p class="q">학습 퀘스트 지도 — ${stages.filter((s) => s.done).length} / 4 단계 달성</p><span class="mono muted">${ctx.gene} 미션</span></div>
        ${svg}
        <div class="grid" style="--min:220px">${stages.map((s, i) => `<div class="l3-box" style="${i === cur ? "box-shadow: inset 0 0 0 2px var(--fg)" : ""}">
          <div class="row" style="justify-content:space-between"><h4>${i + 1}. ${s.t}</h4><span class="chip ${s.done ? "ok" : i === cur ? "warn" : ""}">${s.done ? "✓ 달성" : i === cur ? "진행 중" : "대기"}</span></div>
          ${s.checks.map((c) => `<div class="row" style="gap:6px;flex-wrap:nowrap;align-items:baseline"><span class="chip ${c.ok ? "ok" : "no"}">${c.ok ? "✓" : "✕"}</span><span style="font-size:12.5px">${ctx.esc(c.t)}</span></div>`).join("")}
          ${s.checks.length > s.need ? `<span class="sub" style="font-size:11.5px">${s.checks.length}개 중 ${s.need}개 이상이면 달성</span>` : ""}
          <div style="display:flex;flex-direction:column;gap:4px;margin-top:2px">${s.acts.map(([n, t]) => `<button type="button" class="btn sm ${i === cur ? "" : ""}" data-go29="${n}" style="justify-content:space-between"><span>활동 ${n} · ${t}</span><span>→</span></button>`).join("")}</div></div>`).join("")}</div>
        ${cur < 0 ? `<div class="fb right"><b>네 단계를 모두 마쳤어요.</b>바구니의 후보 ${list.length}개를 2.1 분자 도킹으로 보낼 준비가 됐어요.</div>`
          : `<div class="fb">다음 추천: <b>활동 ${stages[cur].acts[0][0]} · ${stages[cur].acts[0][1]}</b> — ${stages[cur].checks.filter((c) => !c.ok).map((c) => ctx.esc(c.t)).join(", ")}</div>`}`;
      return listen(el, { click(e) { const g = e.target.closest("[data-go29]"); if (g) goAct(g.dataset.go29); } });
    }
  });

  /* ── 30 근거 문장 만들기 ── */
  const EFF30 = {
    tpsa: "기름막인 세포막과 장 벽을 잘 통과할 수 있기", mw: "크기가 작아 몸에 잘 흡수되기", logp: "막을 지나면서도 피에 녹을 수 있는 균형이 맞기",
    qed: "실제 약들과 닮아 약으로 개발하기 쉽기", alert: "몸속에서 독성 물질로 바뀔 위험이 적기", ro5: "먹는 약이 될 가능성이 높기",
    score: "표적 단백질에 잘 붙어 효과를 낼 가능성이 크기"
  };
  const K30 = ["tpsa", "mw", "logp", "qed", "alert", "ro5", "score"];
  const DIR30 = { tpsa: -1, mw: -1, ro5: -1, alert: -1, qed: 1, score: 1, logp: 0 };
  const W30 = { id: null, k: null, cmp: null, eff: null, msg: null, fill: false };
  function cmps30(k, c, ctx, pass) {
    const S = ctx.S, a = ctx.M.advice, I = ctx.INDM[k], v = I.val(c), out = [];
    if (k === "logp") return [{ k: "range", t: "적당한 범위(0~5)", good: v >= 0 && v <= 5, word: "안에 있어서" }];
    if (k === "alert") return [{ k: "none", t: "경고 부품 목록", good: !c.al.length, word: "에 해당하는 부품이 없어서" }];
    const word = DIR30[k] < 0 ? (k === "ro5" ? "적어서" : "작아서") : "높아서";
    if (k !== "score") {
      const lim = { tpsa: S.tpsaMax, mw: S.mwMax, ro5: S.ro5Max, qed: S.qedMin }[k];
      out.push({ k: "mine", t: `내 기준(${DIR30[k] < 0 ? "≤" : "≥"} ${k === "qed" ? lim.toFixed(2) : lim})`, good: DIR30[k] < 0 ? v <= lim : v >= lim, word: DIR30[k] < 0 ? (k === "ro5" ? "적거나 같아서" : "작거나 같아서") : "높거나 같아서" });
      const al = { tpsa: a.tpsaMax, mw: a.mwMax, ro5: a.ro5Max, qed: a.qedMin }[k];
      if (al != null) out.push({ k: "adv", t: `미션 조언(${DIR30[k] < 0 ? "≤" : "≥"} ${al})`, good: DIR30[k] < 0 ? v <= al : v >= al, word: DIR30[k] < 0 ? (k === "ro5" ? "적거나 같아서" : "작거나 같아서") : "높거나 같아서" });
    }
    const avg = pass.length ? pass.reduce((s, x) => s + I.val(x), 0) / pass.length : v;
    out.push({ k: "avg", t: `통과 분자 평균(${I.fmt(avg)})`, good: DIR30[k] < 0 ? v < avg : v > avg, word });
    return out;
  }
  SV.add({
    id: "30",
    line: "바구니의 분자 하나를 골라 근거 문장을 칩으로 완성합니다. 지표를 고르면 값이 자동으로 들어가고, 비교 대상과 몸속 효과를 맞게 고르면 근거로 저장돼요.",
    goal: "'지표 + 실제 값 + 비교 기준 + 몸속에서 생기는 효과'로 짜인 근거 한 문장 쓰기",
    render(el, ctx) {
      const list = picks(ctx), pass = passList(ctx), example = !list.length;
      const pool = example ? pass.slice(0, 1) : list;
      if (!pool.length) { el.innerHTML = `${CSS}<p class="q">고를 분자가 없어요.</p><div class="fb">왼쪽 사전에서 기준을 넓혀 보세요.</div>`; return; }
      if (!pool.some((c) => c.id === W30.id)) Object.assign(W30, { id: pool[0].id, k: example ? "tpsa" : null, cmp: null, eff: null, msg: null, fill: example });
      const c = ctx.XM.get(W30.id), I = W30.k ? ctx.INDM[W30.k] : null;
      const cs = W30.k ? cmps30(W30.k, c, ctx, pass) : [];
      if (W30.fill && W30.k && cs[0]) { W30.cmp = (cs.find((x) => x.good) || cs[0]).k; W30.eff = W30.k; W30.fill = false; }
      const cmp = cs.find((x) => x.k === W30.cmp);
      const rng = ctx.rng([...(c.id + (W30.k || ""))].reduce((s, ch) => s + ch.charCodeAt(0), 1));
      const effs = W30.k ? [W30.k, ...K30.filter((k) => k !== W30.k).sort(() => rng() - 0.5).slice(0, 2)].sort(() => rng() - 0.5) : [];
      const blank = (t, on) => `<span class="bl30 ${on ? "on" : ""}">${t}</span>`;
      const valTxt = I ? (W30.k === "alert" ? (c.al.length ? c.al.map(ctx.alName).join("·") : "없음") : I.fmt(I.val(c)) + (I.unit && I.unit.length <= 4 ? " " + I.unit : "")) : "";
      const sentence = !I ? null
        : W30.k === "alert" ? `나는 「${ctx.short(c.n, 30)}」 분자를 골랐다. ${cmp ? cmp.t : "[비교]"}${cmp ? cmp.word : ""} ${W30.eff ? EFF30[W30.eff] : "[몸속 효과]"} 때문이다.`
        : `나는 「${ctx.short(c.n, 30)}」 분자를 골랐다. ${I.sym} 값이 ${valTxt}이고 ${cmp ? cmp.t + (cmp.k === "range" ? " " : "보다 ") + cmp.word : "[비교 대상]"}, ${W30.eff ? EFF30[W30.eff] : "[몸속 효과]"} 때문이다.`;
      const ready = I && cmp && W30.eff;
      el.innerHTML = `${CSS}<style>
          .s30 { font-size: 16px; line-height: 2.1; padding: 12px 14px; background: var(--bg); border: 1px solid var(--line-strong); }
          .bl30 { border-bottom: 2px solid var(--line-strong); padding: 1px 6px; background: var(--raise); }
          .bl30.on { border-color: var(--fg); background: var(--hi); color: var(--hi-fg); font-weight: 600; }
        </style>
        <div class="row" style="justify-content:space-between"><p class="q">근거 문장 만들기</p>${example ? `<span class="chip warn">예시 — 바구니가 비어 통과 1위 분자로 보여 줘요</span>` : `<span class="mono muted">근거 있는 후보 ${list.filter((x) => ctx.S.why[x.id]).length} / ${list.length}</span>`}</div>
        <div><span class="l3-tag">분자 고르기</span><div class="l3-opts" style="margin-top:6px">${pool.map((x) => `<button type="button" class="btn sm" data-m30="${x.id}" aria-pressed="${x.id === W30.id}">${nm(ctx, x, 14)}${ctx.S.why[x.id] ? " ✓" : ""}</button>`).join("")}</div></div>
        <div class="s30">나는 ${blank("「" + ctx.esc(ctx.short(c.n, 22)) + "」", true)} 분자를 골랐다.
          ${W30.k === "alert" ? "" : `${blank(I ? I.sym : "[지표]", !!I)} 값이 ${blank(I ? ctx.esc(valTxt) : "[값]", !!I)}이고`}
          ${blank(cmp ? ctx.esc(cmp.t) : "[비교 대상]", !!cmp)}${cmp && W30.k !== "alert" ? (cmp.k === "range" ? " " : "보다 ") : ""}${blank(cmp ? cmp.word : "[어떻게]", !!cmp)},
          ${blank(W30.eff ? EFF30[W30.eff] : "[몸속 효과]", !!W30.eff)} 때문이다.</div>
        <div class="grid" style="--min:240px">
          <div class="l3-box"><span class="l3-tag">1. 지표</span><div class="l3-opts">${K30.map((k) => `<button type="button" class="btn sm" data-k30="${k}" aria-pressed="${W30.k === k}">${ctx.INDM[k].sym} ${ctx.INDM[k].name}</button>`).join("")}</div>${I ? `<span class="sub" style="font-size:12px">${I.one} ${ctx.ind(W30.k, "더 읽기")}</span>` : ""}</div>
          <div class="l3-box"><span class="l3-tag">2. 무엇과 비교할까</span>${I ? `<div class="l3-opts">${cs.map((x) => `<button type="button" class="btn sm" data-c30="${x.k}" aria-pressed="${W30.cmp === x.k}">${ctx.esc(x.t)}</button>`).join("")}</div>` : `<span class="sub">지표를 먼저 고르세요.</span>`}</div>
          <div class="l3-box"><span class="l3-tag">3. 몸속에서 생기는 효과</span>${I ? `<div class="l3-opts" style="flex-direction:column;align-items:stretch">${effs.map((k) => `<button type="button" class="btn sm" data-e30="${k}" aria-pressed="${W30.eff === k}">…${EFF30[k]} 때문</button>`).join("")}</div>` : `<span class="sub">지표를 먼저 고르세요.</span>`}</div></div>
        ${W30.msg ? `<div class="fb ${W30.msg.ok ? "right" : "wrong"}"><b>${W30.msg.ok ? "저장했어요." : "다시 생각해 봐요."}</b>${ctx.esc(W30.msg.t)}</div>` : ""}
        <div class="row"><button type="button" class="btn pri" data-save30="1" ${ready ? "" : "disabled"}>${example ? "바구니에 담고 근거로 저장" : "근거로 저장"}</button>${ctx.S.why[c.id] ? `<span class="sub">지금 근거: ${ctx.esc(ctx.S.why[c.id])}</span>` : ""}</div>`;
      return listen(el, {
        click(e) {
          const m = e.target.closest("[data-m30]"), k = e.target.closest("[data-k30]"), cc = e.target.closest("[data-c30]"), ef = e.target.closest("[data-e30]"), sv = e.target.closest("[data-save30]");
          if (m) { Object.assign(W30, { id: m.dataset.m30, k: null, cmp: null, eff: null, msg: null }); ctx.rerender(); }
          else if (k) { Object.assign(W30, { k: k.dataset.k30, cmp: null, eff: null, msg: null }); ctx.rerender(); }
          else if (cc) { W30.cmp = cc.dataset.c30; W30.msg = null; ctx.rerender(); }
          else if (ef) { W30.eff = ef.dataset.e30; W30.msg = null; ctx.rerender(); }
          else if (sv && ready) {
            if (!cmp.good) { W30.msg = { ok: false, t: `실제로는 ${I.sym} ${valTxt}로 ${cmp.t} 쪽이 더 나아요. 이 분자의 강점이 아니에요 — 다른 지표나 비교 대상을 골라 보세요.` }; }
            else if (W30.eff !== W30.k) { W30.msg = { ok: false, t: `'${EFF30[W30.eff]}'는 ${ctx.INDM[W30.eff].sym}(${ctx.INDM[W30.eff].name})에 대한 설명이에요. ${I.sym}가 몸속에서 하는 일을 골라 보세요.` }; }
            else {
              if (!ctx.S.picks.includes(c.id) && ctx.S.picks.length < ctx.PICK_MAX) ctx.S.picks.push(c.id);
              ctx.S.why[c.id] = sentence; W30.msg = { ok: true, t: sentence }; ctx.set({}, false); return;
            }
            ctx.rerender();
          }
        }
      });
    }
  });
})();
