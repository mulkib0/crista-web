/* 활동 11–20 — 기준 정하기(11–14) · 후보 고르기(15–20). 공통 뼈대(screening-learn-30.html)의 SV.add 로 등록한다. */
(() => {
  "use strict";

  /* ── 이 파일의 공통 도우미 ── */
  const NUM = "①②③④⑤⑥";
  const GATE_NAME = { 1: "라이브러리", 2: "크기 · 극성 (MW · TPSA)", 3: "리핀스키 5규칙", 4: "구조 경고", 5: "약다움 QED" };
  /* el 에 이벤트를 위임하고 정리 함수를 돌려준다 */
  function bind(el, map) {
    for (const [t, f] of Object.entries(map)) el.addEventListener(t, f);
    return () => { for (const [t, f] of Object.entries(map)) el.removeEventListener(t, f); };
  }
  /* 내 기준을 통과한 분자 — 표적 점수 순 */
  const passed = (ctx) => ctx.X.filter((c) => c.f >= 6).sort((a, b) => b.score - a.score);
  const emptyFb = (ctx) => `<div class="fb wrong"><b>내 기준을 통과한 분자가 없어요.</b> 왼쪽 사전에서 기준을 조금 풀어 보세요. 예: ${ctx.ind("qed")} 최소값을 낮추거나 ${ctx.ind("tpsa")} 최대값을 올리기.</div>`;
  const nm = (ctx, c, k = 14) => ctx.esc(ctx.short(c.n, k));
  /* 기준 묶음 하나가 미션 조언을 몇 개 지키는지 */
  function advMatch(ctx, cut) {
    const a = ctx.M.advice, s = Object.assign({}, ctx.S, cut), out = [];
    if (a.tpsaMax != null) out.push({ ok: s.tpsaMax <= a.tpsaMax, t: `TPSA ≤ ${a.tpsaMax}` });
    if (a.mwMax != null) out.push({ ok: s.mwMax <= a.mwMax, t: `MW ≤ ${a.mwMax}` });
    if (a.ro5Max != null) out.push({ ok: s.ro5Max <= a.ro5Max, t: `Ro5 위반 ≤ ${a.ro5Max}` });
    if (a.noAlerts) out.push({ ok: !!s.noAlerts, t: "구조 경고 빼기" });
    if (a.qedMin != null) out.push({ ok: s.qedMin >= a.qedMin, t: `QED ≥ ${a.qedMin}` });
    return { list: out, n: out.filter((x) => x.ok).length, t: out.length };
  }
  const cutText = (s) => `MW ≤ ${s.mwMax} · TPSA ≤ ${s.tpsaMax} · Ro5 ${s.ro5Max}개까지 · 경고 ${s.noAlerts ? "빼기" : "허용"} · QED ≥ ${(+s.qedMin).toFixed(2)}`;
  /* 범위 슬라이더 한 줄 — data-k 로 기준 이름, data-pre 로 ≤/≥ */
  const slider = (id, label, k, min, max, step, val, fix = 0, pre = "≤", unit = "") =>
    `<div class="ctlrow"><label class="lab" for="${id}"><span>${label}</span><span class="val" data-val="${id}">${pre} ${(+val).toFixed(fix)}${unit ? " " + unit : ""}</span></label>
     <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" data-k="${k}" data-fix="${fix}" data-pre="${pre}" data-unit="${unit}"></div>`;
  const setVal = (input) => {
    const v = document.querySelector(`[data-val="${input.id}"]`);
    if (v) v.textContent = `${input.dataset.pre} ${(+input.value).toFixed(+input.dataset.fix)}${input.dataset.unit ? " " + input.dataset.unit : ""}`;
  };
  const seg = (name, key, opts, val, lab) => `<div class="seg" role="group" aria-label="${name}">${opts.map((v) => `<button type="button" data-seg="${key}" data-v="${v}" aria-pressed="${val === v}">${lab(v)}</button>`).join("")}</div>`;

  /* ─────────────── 11 딱 알맞은 깔때기 ─────────────── */
  const pct11 = (n) => Math.sqrt(Math.max(0, Math.min(220, n)) / 220) * 100;
  function paint11(ctx) {
    const g = document.getElementById("g11"); if (!g) return;
    const { REM, DROP } = ctx, n = REM[5];
    const zone = n < 8 ? "s" : n <= 40 ? "g" : "l";
    g.innerHTML = `<div class="gz">
        <span class="z s" style="left:0;width:${pct11(8)}%">너무 엄격</span>
        <span class="z g" style="left:${pct11(8)}%;width:${pct11(40) - pct11(8)}%">알맞음</span>
        <span class="z l" style="left:${pct11(40)}%;right:0">너무 느슨</span>
        <i class="mk" style="left:${pct11(n)}%"><b>${n}</b></i></div>
      <div class="gt">${[0, 8, 40, 100, 220].map((v) => `<span style="left:${pct11(v)}%">${v}</span>`).join("")}</div>`;
    const ks = [1, 2, 3, 4, 5].filter((k) => k > 1 || DROP[1]);
    document.getElementById("b11").innerHTML = `<p class="b11h">관문마다 걸러지는 분자</p>${ks.map((k) => `<div class="br" data-f="${k}"><span>${NUM[k - 1]} ${GATE_NAME[k]}</span><div class="bt"><i style="width:${(DROP[k] / 220) * 100}%"></i></div><b class="mono">−${DROP[k]}</b></div>`).join("")}
      <div class="br"><span><b>남은 분자</b></span><div class="bt"><i style="width:${(n / 220) * 100}%;background:var(--fg)"></i></div><b class="mono">${n}</b></div>`;
    const adv = ctx.adviceCheck(), allAdv = adv.every((a) => a.ok);
    const advChips = adv.map((a) => `<span class="chip ${a.ok ? "ok" : "warn"}">${a.ok ? "✓" : "!"} ${ctx.esc(a.t)}</span>`).join(" ");
    let fb;
    if (zone === "g" && allAdv) fb = `<div class="fb right"><b>딱 알맞아요!</b> 통과 ${n}개, 미션 조언 ${adv.length}개를 모두 지켰어요. 이 정도면 모둠원이 나눠 맡기 좋아요. 이제 활동 15 '분자 쇼핑'에서 후보를 담아 보세요.</div>`;
    else if (zone === "s") {
      const big = [2, 3, 4, 5].sort((a, b) => DROP[b] - DROP[a])[0];
      fb = `<div class="fb wrong"><b>너무 엄격해요.</b> 통과 ${n}개로는 고를 게 거의 없어요. 가장 많이 걸러 내는 관문은 ${NUM[big - 1]} ${GATE_NAME[big]}(−${DROP[big]})예요. 이 기준을 조금 풀어 보세요.</div>`;
    } else if (zone === "l") {
      const bad = adv.filter((a) => !a.ok);
      fb = `<div class="fb wrong"><b>아직 너무 많아요.</b> ${n}개를 모두 도킹하려면 비용과 시간이 너무 들어요. ${bad.length ? `미션 조언대로 조여 보세요: ${bad.map((a) => ctx.esc(a.t)).join(" · ")}` : `${ctx.ind("qed")} 최소값을 올리거나 ${ctx.ind("tpsa")} 최대값을 내려 보세요.`}</div>`;
    } else fb = `<div class="fb"><b>개수는 알맞아요.</b> 그런데 미션 조언과 다른 기준이 있어요. 미션에 맞는 약을 찾으려면 조언도 지켜야 해요: ${adv.filter((a) => !a.ok).map((a) => ctx.esc(a.t)).join(" · ")}</div>`;
    document.getElementById("fb11").innerHTML = `${fb}<div class="row" style="margin-top:8px"><span class="sub">미션 조언</span>${advChips}</div>`;
  }
  SV.add({
    id: "11",
    line: "기준 슬라이더를 움직이면 바늘이 바로 움직여요. 통과하는 분자가 8~40개가 되고, 위쪽 미션 조언도 모두 지키도록 맞춰 보세요.",
    goal: "기준을 조이고 풀면 후보 수가 어떻게 바뀌는지, 어느 기준이 가장 많이 걸러 내는지",
    render(el, ctx) {
      const S = ctx.S;
      el.innerHTML = `<style>
          .gz { position: relative; height: 46px; margin-top: 18px; border: 1px solid var(--line-strong); }
          .gz .z { position: absolute; top: 0; bottom: 0; display: flex; align-items: flex-end; padding: 0 6px 4px; font-size: 11.5px; overflow: hidden; white-space: nowrap; }
          .gz .z.s { background: var(--bad-bg); color: var(--bad); }
          .gz .z.g { background: var(--good-bg); color: var(--good); font-weight: 600; border-left: 1px dashed var(--line-strong); border-right: 1px dashed var(--line-strong); }
          .gz .z.l { background: var(--warn-bg); color: var(--warn); justify-content: flex-end; }
          .gz .mk { position: absolute; top: -10px; bottom: -4px; width: 3px; margin-left: -1.5px; background: var(--fg); transition: left .25s ease; }
          .gz .mk b { position: absolute; top: -18px; left: 50%; transform: translateX(-50%); background: var(--fg); color: var(--bg); font-family: var(--mono); font-size: 12px; padding: 0 6px; white-space: nowrap; }
          .gt { position: relative; height: 16px; font-family: var(--mono); font-size: 10.5px; color: var(--muted); }
          .gt span { position: absolute; transform: translateX(-50%); }
          .gt span:first-child { transform: none; } .gt span:last-child { transform: translateX(-100%); }
          .a11 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 18px; }
          .a11c { display: flex; flex-direction: column; gap: 12px; }
          .b11h { margin: 0 0 6px; font-size: 12px; color: var(--muted); }
          .br { display: grid; grid-template-columns: minmax(0, 11em) minmax(0, 1fr) 3.2em; gap: 8px; align-items: center; font-size: 12.5px; padding: 3px 0; }
          .br > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .br .bt { height: 10px; background: var(--raise); }
          .br .bt i { display: block; height: 100%; background: var(--c); transition: width .25s ease; }
          .br b.mono { text-align: right; font-weight: 500; }
          @media (max-width: 700px) { .a11 { grid-template-columns: minmax(0, 1fr); } .br { grid-template-columns: minmax(0, 8em) minmax(0, 1fr) 3em; } }
        </style>
        <p class="q">통과하는 분자가 8~40개가 되도록 기준을 맞춰 보세요</p>
        <p class="sub">너무 엄격하면 고를 게 없고, 너무 느슨하면 도킹실이 감당하지 못해요. 눈금은 작은 수를 잘 보이게 늘려 그렸어요.</p>
        <div id="g11"></div>
        <div class="a11">
          <div class="a11c">
            ${slider("a11-mw", `${ctx.ind("mw")} 최대`, "mwMax", 250, 650, 10, S.mwMax, 0, "≤", "Da")}
            ${slider("a11-tpsa", `${ctx.ind("tpsa")} 최대`, "tpsaMax", 40, 180, 5, S.tpsaMax, 0, "≤", "Å²")}
            <div class="ctlrow"><span class="lab"><span>${ctx.ind("ro5")} 위반 허용</span></span>${seg("Ro5", "ro5Max", [0, 1, 2], S.ro5Max, (v) => `${v}개까지`)}</div>
            <div class="ctlrow"><span class="lab"><span>${ctx.ind("alert", "구조 경고")}</span></span><label class="chk"><input type="checkbox" id="a11-al" ${S.noAlerts ? "checked" : ""}> 방향족 아민 · 니트로 빼기</label></div>
            ${slider("a11-qed", `${ctx.ind("qed")} 최소`, "qedMin", 0, 0.9, 0.05, S.qedMin, 2, "≥")}
          </div>
          <div id="b11"></div>
        </div>
        <div id="fb11"></div>`;
      paint11(ctx);
      return bind(el, {
        input: (e) => { const t = e.target; if (t.dataset.k) { setVal(t); ctx.set({ [t.dataset.k]: +t.value }, true); } },
        change: (e) => { if (e.target.id === "a11-al") ctx.set({ noAlerts: e.target.checked }, true); },
        click: (e) => {
          const b = e.target.closest("[data-seg]"); if (!b) return;
          ctx.set({ [b.dataset.seg]: +b.dataset.v }, true);
          b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
        }
      });
    },
    update(ctx) { paint11(ctx); }
  });

  /* ─────────────── 12 전략 카드 고르기 ─────────────── */
  const STRATS = [
    { k: "brain", name: "뇌 투과형", ph: "뇌혈관 장벽을 넘으려면 작고, 물과 덜 친해야 해요.", cut: { mwMax: 450, tpsaMax: 90, ro5Max: 0, noAlerts: true, qedMin: 0.4 } },
    { k: "oral", name: "먹는 약 엄격형", ph: "장에서 잘 흡수되는 교과서 기준을 그대로 지켜요.", cut: { mwMax: 500, tpsaMax: 140, ro5Max: 0, noAlerts: false, qedMin: 0.3 } },
    { k: "safe", name: "안전 제일형", ph: "오래 먹을 약이라면 독성 부품부터 없애요.", cut: { mwMax: 500, tpsaMax: 120, ro5Max: 0, noAlerts: true, qedMin: 0.5 } },
    { k: "wide", name: "넓게 보기형", ph: "처음엔 넓게 보고, 표적 점수로 고르면 돼요.", cut: { mwMax: 600, tpsaMax: 160, ro5Max: 2, noAlerts: false, qedMin: 0.2 } },
    { k: "qed", name: "약다움 우선형", ph: "진짜 약처럼 생긴 분자만 남겨요.", cut: { mwMax: 500, tpsaMax: 140, ro5Max: 1, noAlerts: true, qedMin: 0.65 } },
    { k: "small", name: "작게 시작형", ph: "작은 분자에서 시작해야 나중에 키울 여지가 있어요.", cut: { mwMax: 350, tpsaMax: 100, ro5Max: 0, noAlerts: true, qedMin: 0.5 } }
  ];
  let sel12 = "oral", applied12 = null;
  SV.add({
    id: "12",
    line: "전략 카드 6장 가운데 하나를 눌러 미리 돌려 보세요. 몇 개가 남는지, 이 미션의 실제 약이 살아남는지 확인한 뒤 '이 전략 적용'을 누르면 내 기준이 됩니다.",
    goal: "기준 묶음 뒤에는 '어떤 약을 만들고 싶은지'라는 생각(전략)이 있다는 것",
    render(el, ctx) {
      const { M, XM, esc } = ctx, ref = XM.get(M.ref);
      const fit = (s) => advMatch(ctx, s.cut);
      const best = Math.max(...STRATS.map((s) => fit(s).n));
      const stars = (s) => { const f = fit(s); return "★".repeat(f.n) + "☆".repeat(f.t - f.n); };
      const st = STRATS.find((s) => s.k === sel12) || STRATS[0];
      const r = ctx.runFunnel(st.cut), refIn = r.pass.includes(M.ref), f = fit(st);
      el.innerHTML = `<style>
          .sc12 { border: 1px solid var(--line-strong); background: var(--bg); text-align: left; padding: 12px; display: flex; flex-direction: column; gap: 6px; min-height: 150px; }
          .sc12:hover { border-color: var(--fg); }
          .sc12[aria-pressed="true"] { box-shadow: inset 0 0 0 2px var(--fg); background: var(--surface); }
          .sc12 .sn { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; display: flex; justify-content: space-between; gap: 6px; }
          .sc12 .st { font-family: var(--mono); font-size: 12px; color: var(--warn); letter-spacing: 0.05em; }
          .sc12 .sp { font-size: 12.5px; color: var(--muted); line-height: 1.45; }
          .sc12 .sk { margin-top: auto; font-family: var(--mono); font-size: 10.5px; color: var(--muted); line-height: 1.5; }
          .sc12 .ap { font-family: var(--mono); font-size: 10.5px; background: var(--hi); color: var(--hi-fg); padding: 0 5px; align-self: flex-start; }
          .pv12 { border: 1px solid var(--line-strong); padding: 14px; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 18px; align-items: start; }
          .pv12 .big { font-family: var(--mono); font-size: 40px; font-weight: 600; letter-spacing: -0.04em; line-height: 1; }
          .pv12 .big small { display: block; font-family: var(--sans); font-size: 12px; font-weight: 400; color: var(--muted); letter-spacing: 0; margin-top: 4px; }
          .pv12 ol { margin: 0; padding-left: 20px; font-size: 13px; }
          @media (max-width: 560px) { .pv12 { grid-template-columns: minmax(0, 1fr); } }
        </style>
        <p class="q">어떤 전략으로 거를까요?</p>
        <div class="grid" style="--min:200px">${STRATS.map((s) => `<button type="button" class="sc12" data-s12="${s.k}" aria-pressed="${s.k === sel12}">
          <span class="sn">${s.name}${applied12 ? `<span class="st" title="미션 조언과 맞는 정도">${stars(s)}</span>` : ""}</span>
          <span class="sp">${s.ph}</span><span class="sk">${cutText(s.cut)}</span>${applied12 === s.k ? `<span class="ap">적용함</span>` : ""}</button>`).join("")}</div>
        <div class="pv12">
          <div class="big">${r.pass.length}<small>통과 분자</small></div>
          <div style="display:flex;flex-direction:column;gap:8px;min-width:0">
            <b>'${st.name}'으로 미리 돌려 본 결과</b>
            <span class="row">${refIn ? `<span class="chip ok">✓ 실제 약 ${ref ? esc(ctx.short(ref.n, 12)) : ""} 살아남음</span>` : `<span class="chip no">✕ 실제 약 ${ref ? esc(ctx.short(ref.n, 12)) : ""} 걸러짐</span>`}
              <span class="chip ${r.pass.length >= 8 && r.pass.length <= 40 ? "ok" : "warn"}">${r.pass.length < 8 ? "너무 엄격" : r.pass.length > 40 ? "너무 느슨" : "개수 알맞음"}</span></span>
            ${r.top.length ? `<span class="sub">${ctx.gene} 점수 상위 5</span><ol>${r.top.slice(0, 5).map((id) => `<li data-cid="${id}">${nm(ctx, XM.get(id), 22)} <span class="mono muted">${XM.get(id).score.toFixed(3)}</span></li>`).join("")}</ol>` : `<span class="sub">통과한 분자가 없어요.</span>`}
            <div class="row"><button type="button" class="btn pri" data-apply12="${st.k}">이 전략 적용 → 내 기준으로</button>${applied12 ? `<span class="sub">카드의 별은 미션 조언과 맞는 정도예요.</span>` : `<span class="sub">적용하면 카드마다 미션과 맞는 정도(별)가 공개돼요.</span>`}</div>
          </div>
        </div>
        ${applied12 ? (() => { const a = STRATS.find((s) => s.k === applied12), fa = fit(a);
          return fa.n === best ? `<div class="fb right"><b>미션과 잘 맞는 전략이에요.</b> '${a.name}'은 미션 조언 ${fa.t}개 중 ${fa.n}개를 지켜요. 왼쪽 사전에서 내 기준이 바뀐 것을 확인해 보세요.</div>`
            : `<div class="fb wrong"><b>더 잘 맞는 전략이 있어요.</b> '${a.name}'은 미션 조언 ${fa.t}개 중 ${fa.n}개만 지켜요. 지키지 못한 조언: ${fa.list.filter((x) => !x.ok).map((x) => esc(x.t)).join(" · ")}. 별이 가장 많은 카드를 미리 돌려 비교해 보세요.</div>`; })()
          : `<div class="fb">미션: ${esc(M.title)}. 이 미션에 맞는 전략은 무엇일까요? ${ctx.ind("tpsa")} · ${ctx.ind("alert", "구조 경고")} · ${ctx.ind("qed")} 설명을 떠올려 보세요.</div>`}`;
      return bind(el, {
        click: (e) => {
          const c = e.target.closest("[data-s12]"), a = e.target.closest("[data-apply12]");
          if (c) { sel12 = c.dataset.s12; ctx.rerender(); }
          else if (a) { const s = STRATS.find((x) => x.k === a.dataset.apply12); applied12 = s.k; ctx.set(Object.assign({}, s.cut)); }
        }
      });
    }
  });

  /* ─────────────── 13 A안 vs B안 ─────────────── */
  const plans13 = {
    A: { mwMax: 500, tpsaMax: 140, ro5Max: 1, noAlerts: false, qedMin: 0.3 },
    B: { mwMax: 450, tpsaMax: 90, ro5Max: 0, noAlerts: true, qedMin: 0.5 }
  };
  let won13 = null;
  function paint13(ctx) {
    const box = document.getElementById("cmp13"); if (!box) return;
    const { XM, M, esc } = ctx;
    const ra = ctx.runFunnel(plans13.A), rb = ctx.runFunnel(plans13.B);
    const fa = advMatch(ctx, plans13.A), fb = advMatch(ctx, plans13.B);
    const ta = new Set(ra.top), tb = new Set(rb.top);
    const both = ra.top.filter((id) => tb.has(id)), onlyA = ra.top.filter((id) => !tb.has(id)), onlyB = rb.top.filter((id) => !ta.has(id));
    const chips = (ids, cls) => ids.length ? ids.map((id) => `<span class="chip ${cls}" data-cid="${id}">${nm(ctx, XM.get(id), 12)}</span>`).join(" ") : `<span class="sub">없음</span>`;
    const col = (k, r, f) => `<div class="c13"><b>${k}안</b><span class="big13">${r.pass.length}<small> 통과</small></span>
      <span class="chip ${f.n === f.t ? "ok" : "warn"}">미션 조언 ${f.n}/${f.t}</span>
      <span class="chip ${r.pass.includes(M.ref) ? "ok" : "no"}">${r.pass.includes(M.ref) ? "✓" : "✕"} 실제 약</span>
      <span class="chip ${r.pass.length >= 8 && r.pass.length <= 40 ? "ok" : "warn"}">${r.pass.length < 8 ? "너무 엄격" : r.pass.length > 40 ? "너무 느슨" : "개수 알맞음"}</span></div>`;
    const better = fa.n === fb.n ? null : fa.n > fb.n ? "A" : "B";
    box.innerHTML = `<div class="v13">${col("A", ra, fa)}<span class="vs">vs</span>${col("B", rb, fb)}</div>
      <div class="ov13"><div><span class="sub">둘 다 상위 ${ctx.S.topN}</span><div class="row">${chips(both, "ok")}</div></div>
        <div><span class="sub">A안에만</span><div class="row">${chips(onlyA, "")}</div></div>
        <div><span class="sub">B안에만</span><div class="row">${chips(onlyB, "")}</div></div></div>
      <div class="fb ${better ? "" : ""}">${better ? `<b>${better}안이 미션 조언을 더 많이 지켜요</b>(${better === "A" ? fa.n : fb.n}/${fa.t}). 그래도 상위 분자가 얼마나 달라지는지 보세요. 겹치지 않는 분자는 기준 하나 차이로 운명이 갈린 분자예요.`
        : `<b>두 안이 미션 조언을 똑같이 지켜요</b>(${fa.n}/${fa.t}). 통과 수와 실제 약이 살아남는지로 비교해 보세요.`}</div>
      <div class="row"><button type="button" class="btn ${better === "A" ? "pri" : ""}" data-win13="A">A안을 내 기준으로</button><button type="button" class="btn ${better === "B" ? "pri" : ""}" data-win13="B">B안을 내 기준으로</button>${won13 ? `<span class="chip ok">✓ ${won13}안을 내 기준으로 적용함</span>` : ""}</div>`;
  }
  SV.add({
    id: "13",
    line: "기준 묶음 두 개(A안 · B안)를 각각 조절해 나란히 돌려 보세요. 통과 수, 상위 분자가 어떻게 겹치고 갈리는지, 미션 조언을 몇 개 지키는지 비교합니다.",
    goal: "기준 하나를 바꾸면 어떤 분자의 운명이 갈리는지 — 비교하면서 기준을 고르는 법",
    render(el, ctx) {
      const ctl = (k) => { const p = plans13[k];
        return `<div class="p13"><b>${k}안</b>
          ${slider(`p13${k}-mw`, "MW 최대", `${k}.mwMax`, 250, 650, 10, p.mwMax, 0, "≤")}
          ${slider(`p13${k}-tpsa`, "TPSA 최대", `${k}.tpsaMax`, 40, 180, 5, p.tpsaMax, 0, "≤")}
          <div class="ctlrow"><span class="lab"><span>Ro5 위반</span></span>${seg(k + " Ro5", `${k}.ro5Max`, [0, 1, 2], p.ro5Max, (v) => `${v}개`)}</div>
          <label class="chk"><input type="checkbox" id="p13${k}-al" data-k="${k}.noAlerts" ${p.noAlerts ? "checked" : ""}> 구조 경고 빼기</label>
          ${slider(`p13${k}-qed`, "QED 최소", `${k}.qedMin`, 0, 0.9, 0.05, p.qedMin, 2, "≥")}</div>`; };
      el.innerHTML = `<style>
          .pp13 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .p13 { border: 1px solid var(--line-strong); padding: 12px; display: flex; flex-direction: column; gap: 8px; background: var(--bg); }
          .p13 > b { font-family: var(--mono); font-size: 14px; }
          .v13 { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 12px; align-items: start; }
          .v13 .vs { align-self: center; font-family: var(--mono); color: var(--muted); }
          .c13 { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
          .c13 > b { font-family: var(--mono); flex-basis: 100%; }
          .big13 { font-family: var(--mono); font-size: 34px; font-weight: 600; letter-spacing: -0.04em; line-height: 1; flex-basis: 100%; }
          .big13 small { font-family: var(--sans); font-size: 12px; font-weight: 400; color: var(--muted); letter-spacing: 0; }
          .ov13 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
          .ov13 .row { gap: 4px; margin-top: 4px; }
          @media (max-width: 640px) { .pp13, .ov13 { grid-template-columns: minmax(0, 1fr); } }
        </style>
        <p class="q">A안과 B안, 어느 쪽이 이 미션에 맞을까요?</p>
        <p class="sub">처음 두 안은 예시예요. A안은 느슨한 교과서 기준, B안은 뇌 투과까지 노린 엄격한 기준입니다. 숫자를 바꿔 보세요.</p>
        <div class="pp13">${ctl("A")}${ctl("B")}</div>
        <div id="cmp13" style="display:flex;flex-direction:column;gap:12px"></div>`;
      paint13(ctx);
      const put = (k, v) => { const [p, key] = k.split("."); plans13[p][key] = v; won13 = null; paint13(ctx); };
      return bind(el, {
        input: (e) => { const t = e.target; if (t.type === "range" && t.dataset.k) { setVal(t); put(t.dataset.k, +t.value); } },
        change: (e) => { const t = e.target; if (t.type === "checkbox" && t.dataset.k) put(t.dataset.k, t.checked); },
        click: (e) => {
          const s = e.target.closest("[data-seg]");
          if (s) { put(s.dataset.seg, +s.dataset.v); s.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === s)); return; }
          const w = e.target.closest("[data-win13]");
          if (w) { won13 = w.dataset.win13; ctx.set(Object.assign({}, plans13[won13])); }
        }
      });
    }
  });

  /* ─────────────── 14 근거 서명 체크리스트 ─────────────── */
  const sign14 = {};
  const ITEMS14 = [
    { k: "lib", name: "라이브러리", ind: null, rule: (S, ctx) => ctx.LIBS.filter((l) => S.lib[l]).join(" · ") || "선택 없음",
      rs: [{ t: "가능성을 넓게 보려고 세 상자를 모두 넣었어요", bad: (S, ctx) => !ctx.LIBS.every((l) => S.lib[l]) && "세 상자를 모두 넣지 않았어요" },
        { t: "안전 정보가 많은 승인약은 꼭 넣었어요", bad: (S) => !S.lib["ChEMBL 승인약"] && "승인약 상자가 빠져 있어요" },
        { t: "새 물질 특허를 노려 사내 후보를 꼭 넣었어요", bad: (S) => !S.lib["사내 합성 후보"] && "사내 합성 후보 상자가 빠져 있어요" }] },
    { k: "size", name: "크기 · 극성", ind: "tpsa", rule: (S) => `MW ≤ ${S.mwMax} · TPSA ≤ ${S.tpsaMax}`,
      rs: [{ t: "뇌까지 가야 해서 작고 덜 극성인 분자로 (TPSA 90 이하)", bad: (S) => S.tpsaMax > 90 && `TPSA 기준이 ${S.tpsaMax} 라서 90 을 넘어요` },
        { t: "장에서 흡수되면 충분해서 (TPSA 140 · MW 500 이하)", bad: (S) => (S.tpsaMax > 140 || S.mwMax > 500) && `기준(MW ${S.mwMax} · TPSA ${S.tpsaMax})이 흡수 한계보다 느슨해요` },
        { t: "처음엔 넓게 보려고 느슨하게", bad: (S) => S.tpsaMax < 120 && S.mwMax < 500 && "MW 와 TPSA 기준이 모두 엄격해요" }] },
    { k: "ro5", name: "리핀스키 5규칙", ind: "ro5", rule: (S) => `위반 ${S.ro5Max}개까지`,
      rs: [{ t: "먹는 약이라 규칙을 모두 지키게 (0개)", bad: (S) => S.ro5Max !== 0 && `기준이 ${S.ro5Max}개까지예요` },
        { t: "한 개 정도는 봐주려고 (1개까지)", bad: (S) => S.ro5Max !== 1 && `기준이 ${S.ro5Max}개까지예요` },
        { t: "효과가 크면 규칙을 넘어도 돼서 (2개까지)", bad: (S) => S.ro5Max !== 2 && `기준이 ${S.ro5Max}개까지예요` }] },
    { k: "alert", name: "구조 경고", ind: "alert", rule: (S) => (S.noAlerts ? "빼기" : "허용"),
      rs: [{ t: "오래 먹는 약이라 독성 부품은 처음부터 빼요", bad: (S) => !S.noAlerts && "구조 경고를 허용하고 있어요" },
        { t: "점수가 좋으면 나중에 부품을 바꿔 고칠 수 있어서 허용해요", bad: (S) => S.noAlerts && "구조 경고를 빼고 있어요" },
        { t: "독성은 2.2 ADMET 예측에서 확인하려고 지금은 허용해요", bad: (S) => S.noAlerts && "구조 경고를 빼고 있어요" }] },
    { k: "qed", name: "약다움 QED", ind: "qed", rule: (S) => `≥ ${S.qedMin.toFixed(2)}`,
      rs: [{ t: "진짜 약처럼 생긴 분자만 (0.6 이상)", bad: (S) => S.qedMin < 0.6 && `기준이 ${S.qedMin.toFixed(2)} 라서 0.6 보다 낮아요` },
        { t: "무난한 정도면 충분해서 (0.4~0.6)", bad: (S) => (S.qedMin < 0.4 || S.qedMin > 0.6) && `기준이 ${S.qedMin.toFixed(2)} 예요` },
        { t: "약다움보다 표적 점수를 믿어서 (0.4 미만)", bad: (S) => S.qedMin >= 0.4 && `기준이 ${S.qedMin.toFixed(2)} 라서 0.4 이상이에요` }] },
    { k: "topN", name: "도킹실로 보낼 수", ind: "score", rule: (S) => `상위 ${S.topN}`,
      rs: [{ t: "도킹 비용을 아끼려고 5개만", bad: (S) => S.topN !== 5 && `기준이 상위 ${S.topN}개예요` },
        { t: "모둠원이 1~2개씩 맡으려고 10개", bad: (S) => S.topN !== 10 && `기준이 상위 ${S.topN}개예요` },
        { t: "기회를 넓게 주려고 20개", bad: (S) => S.topN !== 20 && `기준이 상위 ${S.topN}개예요` }] }
  ];
  /* 미션과 어긋나는 이유 — 모순은 아니지만 짚어 준다 */
  const missionNote14 = (ctx, it, ri) => {
    const a = ctx.M.advice;
    if (it.k === "size" && ri !== 0 && a.tpsaMax === 90) return "미션은 뇌에 도착해야 하는 약이에요. TPSA 90 이하가 필요해요.";
    if (it.k === "alert" && ri !== 0 && a.noAlerts) return "미션 조언은 구조 경고를 빼라고 해요.";
    if (it.k === "ro5" && ri === 2) return "먹는 약 미션에서는 위반 2개는 많은 편이에요.";
    return "";
  };
  SV.add({
    id: "14",
    line: "기준 6개마다 '왜 이 기준을 골랐는지' 이유를 하나씩 고르면 서명이 됩니다. 고른 이유가 실제 기준값과 맞지 않으면 빨간 표시가 떠요. 왼쪽 사전에서 기준을 고치거나 이유를 바꾸세요.",
    goal: "기준마다 이유를 말할 수 있어야 한다는 것 — 숫자와 이유가 서로 맞는지 확인하는 습관",
    render(el, ctx) {
      const S = ctx.S, esc = ctx.esc;
      let signed = 0, contra = 0;
      const rows = ITEMS14.map((it) => {
        const ri = sign14[it.k], r = ri != null ? it.rs[ri] : null, bad = r ? r.bad(S, ctx) : false, note = r ? missionNote14(ctx, it, ri) : "";
        if (r) signed++; if (bad) contra++;
        return `<div class="r14 ${r ? (bad ? "bad" : "ok") : ""}">
          <div class="h14"><b>${it.ind ? ctx.ind(it.ind, it.name) : it.name}</b><span class="mono muted">${esc(it.rule(S, ctx))}</span></div>
          <div class="o14">${it.rs.map((x, i) => `<button type="button" class="btn sm" data-r14="${it.k}" data-i="${i}" aria-pressed="${ri === i}">${esc(x.t)}</button>`).join("")}</div>
          <div class="s14">${!r ? `<span class="sig">서명 전</span>` : bad ? `<span class="chip no">✕ 모순: ${esc(bad)}</span>` : `<span class="sig on">✓ 서명</span>`}${note && !bad ? ` <span class="chip warn">! ${esc(note)}</span>` : ""}</div></div>`;
      });
      const done = signed === ITEMS14.length && !contra;
      el.innerHTML = `<style>
          .r14 { border: 1px solid var(--line); padding: 10px 12px; display: grid; grid-template-columns: minmax(0, 12em) minmax(0, 1fr) minmax(0, 13em); gap: 8px 14px; align-items: center; background: var(--bg); }
          .r14.ok { border-color: var(--good); } .r14.bad { border-color: var(--bad); }
          .h14 { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
          .h14 .mono { font-size: 11.5px; }
          .o14 { display: flex; flex-direction: column; gap: 4px; }
          .o14 .btn { justify-content: flex-start; text-align: left; white-space: normal; }
          .s14 { font-size: 12px; display: flex; flex-wrap: wrap; gap: 4px; }
          .sig { font-family: "Brush Script MT", cursive, var(--sans); font-size: 15px; border-bottom: 1px solid var(--line-strong); padding: 0 12px 2px; color: var(--muted); }
          .sig.on { color: var(--good); border-color: var(--good); }
          .cert14 { border: 2px solid var(--fg); padding: 16px; background: var(--surface); display: flex; flex-direction: column; gap: 6px; }
          .cert14 h3 { margin: 0; font-size: 18px; letter-spacing: -0.02em; }
          .cert14 dl { margin: 0; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3px 12px; font-size: 13px; }
          .cert14 dt { font-weight: 600; } .cert14 dd { margin: 0; color: var(--muted); }
          @media (max-width: 760px) { .r14 { grid-template-columns: minmax(0, 1fr); } }
        </style>
        <div class="row" style="justify-content:space-between"><p class="q">내 기준마다 이유를 고르고 서명하세요</p><span class="mono muted">서명 ${signed} / ${ITEMS14.length}</span></div>
        <div class="prog">${ITEMS14.map((it) => { const ri = sign14[it.k]; const b = ri != null && it.rs[ri].bad(S, ctx); return `<i class="${ri == null ? "" : b ? "no" : "ok"}"></i>`; }).join("")}</div>
        ${rows.join("")}
        ${done ? `<div class="cert14"><span class="mono muted">기준 확정서 · ${esc(ctx.M.gene)} · ${esc(ctx.M.title)}</span><h3>내 기준으로 ${ctx.REM[5]}개가 통과했어요</h3>
            <dl>${ITEMS14.map((it) => `<dt>${it.name} <span class="mono muted">${esc(it.rule(S, ctx))}</span></dt><dd>${esc(it.rs[sign14[it.k]].t)}</dd>`).join("")}</dl></div>`
          : contra ? `<div class="fb wrong"><b>모순 ${contra}개.</b> 이유와 실제 기준값이 맞지 않아요. 왼쪽 사전에서 기준을 바꾸거나, 지금 기준에 맞는 이유를 다시 고르세요.</div>`
          : `<div class="fb">아직 서명하지 않은 기준이 ${ITEMS14.length - signed}개 있어요. 모두 서명하면 '기준 확정서'가 만들어져요.</div>`}`;
      return bind(el, {
        click: (e) => { const b = e.target.closest("[data-r14]"); if (!b) return; sign14[b.dataset.r14] = +b.dataset.i; ctx.rerender(); }
      });
    }
  });

  /* ─────────────── 15 분자 쇼핑 ─────────────── */
  const FILT15 = [
    { k: "brain", lab: "TPSA ≤ 90 · 뇌", f: (c) => c.tpsa <= 90 },
    { k: "qed", lab: "QED ≥ 0.67", f: (c) => c.qed >= 0.67 },
    { k: "small", lab: "MW ≤ 400", f: (c) => c.mw <= 400 },
    { k: "clean", lab: "경고 없음", f: (c) => !c.al.length },
    { k: "appr", lab: "승인약", f: (c) => c.lib === "ChEMBL 승인약" }
  ];
  const SORT15 = { score: ["표적 점수 높은 순", (a, b) => b.score - a.score], qed: ["QED 높은 순", (a, b) => b.qed - a.qed], tpsa: ["TPSA 낮은 순", (a, b) => a.tpsa - b.tpsa], mw: ["가벼운 순", (a, b) => a.mw - b.mw] };
  let sort15 = "score", page15 = 0;
  const filt15 = new Set();
  SV.add({
    id: "15",
    line: "내 기준을 통과한 분자가 진열대에 있어요. 정렬과 필터로 둘러보고, 마음에 드는 분자를 '+ 후보로 담기'로 바구니에 넣으세요. 가격표 대신 표적 점수가 붙어 있어요.",
    goal: "점수만 보지 않고 여러 지표를 함께 보며 후보를 고르는 법",
    render(el, ctx) {
      const all = passed(ctx);
      let list = all.filter((c) => [...filt15].every((k) => FILT15.find((f) => f.k === k).f(c))).sort(SORT15[sort15][1]);
      const per = 12, pages = Math.max(1, Math.ceil(list.length / per));
      page15 = Math.min(page15, pages - 1);
      const view = list.slice(page15 * per, page15 * per + per);
      el.innerHTML = `<style>
          .bar15 { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
          .bar15 .fl { display: flex; gap: 4px; flex-wrap: wrap; }
          .price { font-family: var(--mono); font-size: 12px; background: var(--fg); color: var(--bg); padding: 1px 6px; clip-path: polygon(6px 0, 100% 0, 100% 100%, 6px 100%, 0 50%); padding-left: 10px; }
          .pg15 { display: flex; gap: 4px; align-items: center; justify-content: center; flex-wrap: wrap; }
        </style>
        <div class="row" style="justify-content:space-between"><p class="q">분자 진열대 <span class="mono muted" style="font-size:13px;font-weight:400">${list.length} / ${all.length}개</span></p><span class="sub">바구니 ${ctx.S.picks.length} / ${ctx.PICK_MAX}</span></div>
        <div class="bar15"><label class="sub" for="s15">정렬</label><select id="s15">${Object.entries(SORT15).map(([k, v]) => `<option value="${k}" ${k === sort15 ? "selected" : ""}>${v[0]}</option>`).join("")}</select>
          <div class="fl">${FILT15.map((f) => `<button type="button" class="btn sm" data-f15="${f.k}" aria-pressed="${filt15.has(f.k)}">${f.lab}</button>`).join("")}</div></div>
        ${!all.length ? emptyFb(ctx) : !list.length ? `<div class="fb">필터에 맞는 분자가 없어요. 필터를 하나 꺼 보세요.</div>`
          : `<div class="grid" style="--min:210px">${view.map((c) => ctx.mcard(c, { foot: `<span class="price" title="표적 점수">${c.score.toFixed(3)}</span>` })).join("")}</div>`}
        ${pages > 1 ? `<div class="pg15"><button type="button" class="btn sm" data-p15="${page15 - 1}" ${page15 ? "" : "disabled"}>← 이전</button>${Array.from({ length: pages }, (_, i) => `<button type="button" class="btn sm" data-p15="${i}" aria-pressed="${i === page15}">${i + 1}</button>`).join("")}<button type="button" class="btn sm" data-p15="${page15 + 1}" ${page15 < pages - 1 ? "" : "disabled"}>다음 →</button></div>` : ""}
        <div class="fb">빨간 ✕ 값은 내 기준에서 걸리는 지표예요. 진열대에는 통과한 분자만 있으니, 숫자가 빨갛다면 ${ctx.ind("logp")} · ${ctx.ind("hbd")} 같은 참고 지표가 Ro5 경계에 있다는 뜻이에요.</div>`;
      return bind(el, {
        change: (e) => { if (e.target.id === "s15") { sort15 = e.target.value; page15 = 0; ctx.rerender(); } },
        click: (e) => {
          const f = e.target.closest("[data-f15]"), p = e.target.closest("[data-p15]");
          if (f) { const k = f.dataset.f15; filt15.has(k) ? filt15.delete(k) : filt15.add(k); page15 = 0; ctx.rerender(); }
          else if (p && !p.disabled) { page15 = +p.dataset.p15; ctx.rerender(); el.scrollIntoView({ block: "start", behavior: ctx.reduced ? "auto" : "smooth" }); }
        }
      });
    }
  });

  /* ─────────────── 16 드래프트 픽 ─────────────── */
  const R16 = [
    { k: "score", t: "셋 중 표적 점수가 가장 높아요", ok: (c, o) => c.score >= Math.max(...o.map((x) => x.score)), fact: (o, ctx) => { const b = o.reduce((a, x) => (x.score > a.score ? x : a)); return `표적 점수가 가장 높은 건 ${nm(ctx, b)}(${b.score.toFixed(3)})예요.`; } },
    { k: "tpsa", t: "셋 중 TPSA 가 가장 낮아 흡수에 유리해요", ok: (c, o) => c.tpsa <= Math.min(...o.map((x) => x.tpsa)), fact: (o, ctx) => { const b = o.reduce((a, x) => (x.tpsa < a.tpsa ? x : a)); return `TPSA 가 가장 낮은 건 ${nm(ctx, b)}(${b.tpsa.toFixed(0)})예요.`; } },
    { k: "qed", t: "셋 중 QED 가 가장 높아 약답게 생겼어요", ok: (c, o) => c.qed >= Math.max(...o.map((x) => x.qed)), fact: (o, ctx) => { const b = o.reduce((a, x) => (x.qed > a.qed ? x : a)); return `QED 가 가장 높은 건 ${nm(ctx, b)}(${b.qed.toFixed(2)})예요.`; } },
    { k: "mw", t: "셋 중 가장 가벼워 나중에 키울 여지가 있어요", ok: (c, o) => c.mw <= Math.min(...o.map((x) => x.mw)), fact: (o, ctx) => { const b = o.reduce((a, x) => (x.mw < a.mw ? x : a)); return `가장 가벼운 건 ${nm(ctx, b)}(${b.mw.toFixed(0)} Da)예요.`; } },
    { k: "alert", t: "구조 경고 부품이 없어요", ok: (c) => !c.al.length, fact: (o, ctx, c) => `이 분자에는 경고 부품(${c.al.map(ctx.alName).join(" · ")})이 있어요.` },
    { k: "logp", t: "logP 가 1~4 라서 물과 기름의 균형이 좋아요", ok: (c) => c.logp >= 1 && c.logp <= 4, fact: (o, ctx, c) => `이 분자의 logP 는 ${c.logp.toFixed(1)} 라서 1~4 밖이에요.` }
  ];
  const D16 = { drafted: [], sel: null, fb: null, key: "" };
  const ROUNDS16 = 6;
  SV.add({
    id: "16",
    line: "라운드마다 점수가 비슷한 분자 3개가 나와요. 하나를 지명하고, 왜 골랐는지 이유를 하나 고르세요. 이유가 사실이면 바구니에 근거와 함께 담깁니다. 6라운드.",
    goal: "점수가 비슷할 때 다른 지표로 결정하고, 그 이유를 사실에 맞게 말하는 법",
    render(el, ctx) {
      const key = ctx.S.tid + "|" + ctx.REM[5];
      if (D16.key !== key) { D16.drafted = []; D16.sel = null; D16.fb = null; D16.key = key; }
      const pool = passed(ctx), taken = new Set(D16.drafted.map((d) => d.id));
      const avail = pool.filter((c) => !taken.has(c.id));
      const round = D16.drafted.length, over = round >= ROUNDS16 || avail.length < 3;
      let offer = avail.slice(0, 3);
      const rnd = ctx.rng(31 + round); offer = offer.map((c) => [rnd(), c]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
      const sel = offer.find((c) => c.id === D16.sel);
      el.innerHTML = `<style>
          .of16 .mc { cursor: pointer; }
          .of16 .mc.sel16 { box-shadow: inset 0 0 0 3px var(--fg); }
          .rs16 { display: flex; flex-direction: column; gap: 4px; }
          .rs16 .btn { justify-content: flex-start; text-align: left; white-space: normal; }
          .log16 { margin: 0; padding-left: 20px; font-size: 13px; display: flex; flex-direction: column; gap: 3px; }
        </style>
        <div class="row" style="justify-content:space-between"><p class="q">${over ? "드래프트 끝!" : `라운드 ${round + 1} / ${ROUNDS16} — 누구를 지명할까요?`}</p><button type="button" class="btn sm" data-reset16="1">처음부터</button></div>
        <div class="prog">${Array.from({ length: ROUNDS16 }, (_, i) => `<i class="${i < round ? "ok" : i === round && !over ? "on" : ""}"></i>`).join("")}</div>
        ${!pool.length ? emptyFb(ctx) : over ? `<div class="fb right"><b>${D16.drafted.length}명을 지명했어요.</b> 근거와 함께 바구니에 담겼어요(가득 차면 근거만 남아요). 아래 바구니의 '내 선택 점검하기'로 확인해 보세요.</div>`
          : `<div class="grid of16" style="--min:240px">${offer.map((c) => ctx.mcard(c, { pick: false, keys: ["score", "tpsa", "qed", "mw", "logp", "alert"], foot: `<button type="button" class="btn sm ${c.id === D16.sel ? "pri" : ""}" data-sel16="${c.id}">${c.id === D16.sel ? "✓ 지명 중" : "이 분자 지명"}</button>` }).replace('class="mc', `class="mc ${c.id === D16.sel ? "sel16" : ""}`)).join("")}</div>
            ${sel ? `<p class="sub"><b>${nm(ctx, sel, 20)}</b>을 고른 이유는?</p><div class="rs16">${R16.map((r) => `<button type="button" class="btn sm" data-r16="${r.k}">${r.t}</button>`).join("")}</div>` : `<p class="sub">카드의 ${ctx.ind("score")} 차이가 작아요. ${ctx.ind("tpsa")} · ${ctx.ind("qed")} · ${ctx.ind("alert", "구조 경고")}도 비교해 보세요.</p>`}`}
        ${D16.fb ? `<div class="fb ${D16.fb.ok ? "right" : "wrong"}"><b>${D16.fb.ok ? "지명 완료." : "사실이 아니에요."}</b> ${D16.fb.t}</div>` : ""}
        ${D16.drafted.length ? `<p class="sub">지명 기록</p><ol class="log16">${D16.drafted.map((d) => `<li data-cid="${d.id}"><b>${nm(ctx, ctx.XM.get(d.id), 18)}</b> — ${ctx.esc(d.why)}</li>`).join("")}</ol>` : ""}`;
      return bind(el, {
        click: (e) => {
          const s = e.target.closest("[data-sel16]"), r = e.target.closest("[data-r16]"), z = e.target.closest("[data-reset16]");
          if (z) { D16.drafted = []; D16.sel = null; D16.fb = null; ctx.rerender(); return; }
          if (s) { D16.sel = s.dataset.sel16; D16.fb = null; ctx.rerender(); return; }
          if (r && sel) {
            const rule = R16.find((x) => x.k === r.dataset.r16);
            if (!rule.ok(sel, offer)) { D16.fb = { ok: false, t: rule.fact(offer, ctx, sel) + " 다른 이유를 고르거나 다른 분자를 지명하세요." }; ctx.rerender(); return; }
            D16.drafted.push({ id: sel.id, why: rule.t.replace("셋 중 ", "후보 셋 중 ") });
            D16.sel = null;
            const inBasket = ctx.S.picks.includes(sel.id), full = !inBasket && ctx.S.picks.length >= ctx.PICK_MAX;
            D16.fb = { ok: true, t: `${nm(ctx, sel, 18)} — ${rule.t}${full ? " 바구니가 가득 차서 근거만 기록했어요." : ""}` };
            ctx.setWhy(sel.id, rule.t.replace("셋 중 ", "후보 셋 중 "));
            if (!full) ctx.pick(sel.id, true); else ctx.rerender();
          }
        }
      });
    }
  });

  /* ─────────────── 17 스카우트 리포트 ─────────────── */
  const J17 = [
    { k: "mw", f: (c) => (c.mw <= 400 ? "s" : c.mw <= 500 ? "m" : "w"), why: () => "400 이하 강점 · 500 이하 보통 · 넘으면 약점" },
    { k: "tpsa", f: (c, ctx) => { const a = ctx.M.advice.tpsaMax; if (a && c.tpsa > a) return "w"; return c.tpsa <= 90 ? "s" : c.tpsa <= 140 ? "m" : "w"; },
      why: (ctx) => `90 이하면 뇌까지(강점) · 140 이하 장 흡수(보통)${ctx.M.advice.tpsaMax ? ` · 이 미션은 ${ctx.M.advice.tpsaMax} 를 넘으면 약점` : ""}` },
    { k: "logp", f: (c) => (c.logp >= 1 && c.logp <= 4 ? "s" : c.logp >= 0 && c.logp <= 5 ? "m" : "w"), why: () => "1~4 강점 · 0~5 보통 · 그 밖은 약점" },
    { k: "ro5", f: (c) => (c.ro5 === 0 ? "s" : c.ro5 === 1 ? "m" : "w"), why: () => "위반 0개 강점 · 1개 보통 · 2개 이상 약점" },
    { k: "alert", f: (c) => (c.al.length ? "w" : "s"), why: () => "경고 부품이 없으면 강점, 있으면 약점(보통은 없음)" },
    { k: "qed", f: (c) => (c.qed >= 0.67 ? "s" : c.qed >= 0.4 ? "m" : "w"), why: () => "0.67 이상 강점 · 0.4 이상 보통 · 그 아래 약점" },
    { k: "score", f: (c) => (c.srank <= 20 ? "s" : c.srank <= 60 ? "m" : "w"), why: () => "220종 중 20위 안 강점 · 60위 안 보통 · 그 밖 약점" }
  ];
  const JL = { s: "강점", m: "보통", w: "약점" };
  const R17 = { id: null, j: {}, sub: false };
  SV.add({
    id: "17",
    line: "스카우트처럼 분자 하나를 평가해 보세요. 지표마다 강점 · 보통 · 약점을 고르고 제출하면 모범 판정과 비교해 줍니다. 리포트를 근거로 바구니에 담을 수 있어요.",
    goal: "지표 값을 보고 '좋다 · 보통 · 나쁘다'를 스스로 판단하는 눈",
    render(el, ctx) {
      const pool = passed(ctx).slice(0, 40);
      if (!pool.length) { el.innerHTML = `<p class="q">스카우트 리포트</p>${emptyFb(ctx)}`; return; }
      if (!pool.some((c) => c.id === R17.id)) { R17.id = pool[0].id; R17.j = {}; R17.sub = false; }
      const c = ctx.XM.get(R17.id), I = ctx.INDM;
      const right = J17.filter((j) => R17.j[j.k] === j.f(c, ctx)).length, all = J17.every((j) => R17.j[j.k]);
      const sum = () => { const g = (v) => J17.filter((j) => j.f(c, ctx) === v).map((j) => I[j.k].sym); const s = g("s"), w = g("w");
        return `스카우트 리포트 — 강점: ${s.join("·") || "없음"} / 약점: ${w.join("·") || "없음"}`; };
      el.innerHTML = `<style>
          .sc17 { display: grid; grid-template-columns: minmax(0, 260px) minmax(0, 1fr); gap: 16px; align-items: start; }
          .sc17 .mc .molbox { height: 150px; }
          .jr { display: grid; grid-template-columns: minmax(0, 9em) 5em minmax(0, 1fr); gap: 6px 10px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
          .jr .val { font-family: var(--mono); }
          .jr .seg { max-width: 260px; }
          .jr .seg button[data-ok="1"] { box-shadow: inset 0 -3px 0 var(--good); }
          .jr .seg button[data-ok="0"][aria-pressed="true"] { background: var(--bad); color: var(--bg); }
          .jr .mdl { grid-column: 1 / -1; font-size: 12px; color: var(--muted); }
          @media (max-width: 700px) { .sc17 { grid-template-columns: minmax(0, 1fr); } .jr { grid-template-columns: minmax(0, 1fr) auto; } .jr .seg { grid-column: 1 / -1; max-width: none; } }
        </style>
        <div class="row"><label class="sub" for="s17">평가할 분자</label><select id="s17">${pool.map((x, i) => `<option value="${x.id}" ${x.id === R17.id ? "selected" : ""}>${i + 1}. ${ctx.esc(ctx.short(x.n, 26))}</option>`).join("")}</select></div>
        <div class="sc17">
          ${ctx.mcard(c, { pick: false, keys: ["mw", "tpsa", "qed"], molH: 150, judge: false })}
          <div>
            <p class="q" style="margin-bottom:6px">지표마다 판정하세요</p>
            ${J17.map((j) => { const d = I[j.k], mine = R17.j[j.k], model = j.f(c, ctx);
              return `<div class="jr"><span>${ctx.ind(j.k, d.name)}</span><span class="val">${j.k === "alert" ? (c.al.length ? c.al.map(ctx.alName).join("·") : "없음") : d.fmt(d.val(c))}</span>
                <div class="seg">${["s", "m", "w"].map((v) => `<button type="button" data-j17="${j.k}" data-v="${v}" aria-pressed="${mine === v}" ${R17.sub ? `data-ok="${v === model ? 1 : 0}" disabled` : ""}>${JL[v]}</button>`).join("")}</div>
                ${R17.sub ? `<span class="mdl">${mine === model ? "✓ 맞았어요" : `✕ 모범 판정은 '${JL[model]}'`} — ${j.why(ctx)}</span>` : ""}</div>`; }).join("")}
          </div>
        </div>
        ${R17.sub ? `<div class="fb ${right >= 5 ? "right" : "wrong"}"><b>${J17.length}개 중 ${right}개 맞았어요.</b> ${right >= 5 ? "지표를 보는 눈이 좋아요." : "틀린 지표의 설명을 왼쪽 사전에서 다시 읽어 보세요."}</div>
            <div class="row"><button type="button" class="btn hi" data-take17="1" ${!ctx.S.picks.includes(c.id) && ctx.S.picks.length >= ctx.PICK_MAX ? "disabled" : ""}>${ctx.S.picks.includes(c.id) ? "✓ 바구니에 있음 · 리포트를 근거로 저장" : "바구니에 담고 리포트를 근거로"}</button><button type="button" class="btn" data-again17="1">다시 판정</button></div>
            <p class="sub">${ctx.esc(sum())}</p>`
          : `<div class="row"><button type="button" class="btn pri" data-sub17="1" ${all ? "" : "disabled"}>제출하고 모범 판정 보기</button><span class="sub">${J17.filter((j) => R17.j[j.k]).length} / ${J17.length} 판정</span></div>`}`;
      return bind(el, {
        change: (e) => { if (e.target.id === "s17") { R17.id = e.target.value; R17.j = {}; R17.sub = false; ctx.rerender(); } },
        click: (e) => {
          const b = e.target.closest("[data-j17]");
          if (b && !R17.sub) { R17.j[b.dataset.j17] = b.dataset.v; ctx.rerender(); return; }
          if (e.target.closest("[data-sub17]")) { R17.sub = true; ctx.rerender(); return; }
          if (e.target.closest("[data-again17]")) { R17.j = {}; R17.sub = false; ctx.rerender(); return; }
          if (e.target.closest("[data-take17]")) { ctx.setWhy(c.id, sum()); if (!ctx.S.picks.includes(c.id)) ctx.pick(c.id, true); }
        }
      });
    }
  });

  /* ─────────────── 18 비교표에서 고르기 ─────────────── */
  const chk18 = new Set();
  let key18 = "";
  const ROWS18 = [["mw", -1], ["tpsa", -1], ["logp", 0], ["hbd", -1], ["hba", -1], ["ro5", -1], ["alert", -1], ["qed", 1], ["score", 1], ["vina", -1]];
  SV.add({
    id: "18",
    line: "통과한 분자 가운데 최대 4개를 체크해 비교표를 만드세요. 지표마다 가장 좋은 값은 라임, 내 기준에 걸리는 값은 빨강으로 표시됩니다. 비교한 뒤 하나를 담으세요.",
    goal: "여러 분자를 같은 줄에 놓고 지표별로 비교하는 법 — 모든 지표에서 이기는 분자는 드물다는 것",
    render(el, ctx) {
      const pool = passed(ctx), I = ctx.INDM;
      const k = ctx.S.tid + "|" + pool.length;
      if (key18 !== k || ![...chk18].every((id) => pool.some((c) => c.id === id))) { chk18.clear(); pool.slice(0, 3).forEach((c) => chk18.add(c.id)); key18 = k; }
      const cols = pool.filter((c) => chk18.has(c.id));
      const best = (row) => {
        const [kk, dir] = row, vals = cols.map((c) => I[kk].val(c));
        /* 모두 같으면 아무도 이기지 않은 것 */
        const sc = dir === 0 ? vals.map((v) => -Math.abs(v - 2.5)) : vals.map((v) => v * dir), m = Math.max(...sc);
        return sc.every((v) => v === m) ? sc.map(() => false) : sc.map((v) => v === m);
      };
      el.innerHTML = `<style>
          .l18 { max-height: 220px; overflow: auto; border: 1px solid var(--line); background: var(--bg); }
          .l18 label { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 4px 10px; font-size: 12.5px; border-bottom: 1px solid var(--line); }
          .l18 label:has(input:disabled) { opacity: 0.5; }
          .t18w { overflow-x: auto; border: 1px solid var(--line-strong); }
          .t18 { border-collapse: collapse; width: 100%; min-width: ${140 + cols.length * 150}px; font-size: 12.5px; }
          .t18 th, .t18 td { border-bottom: 1px solid var(--line); padding: 6px 10px; text-align: left; vertical-align: middle; }
          .t18 thead th { vertical-align: bottom; background: var(--bg); }
          .t18 thead .molbox { height: 84px; }
          .t18 td { font-family: var(--mono); font-variant-numeric: tabular-nums; }
          .t18 td.best { background: var(--hi); color: var(--hi-fg); font-weight: 600; }
          .t18 td.bad { color: var(--bad); font-weight: 600; }
          .t18 td.bad::after { content: " ✕"; font-size: 10px; }
          .t18 tbody th { font-weight: 600; white-space: nowrap; }
          .t18 tbody th .muted { font-weight: 400; font-size: 11px; display: block; }
          .t18 tfoot td { font-family: var(--sans); }
        </style>
        <p class="q">비교할 분자를 2~4개 체크하세요</p>
        ${!pool.length ? emptyFb(ctx) : `<div class="l18" role="group" aria-label="비교할 분자">${pool.map((c, i) => `<label><input type="checkbox" id="c18-${c.id}" data-c18="${c.id}" ${chk18.has(c.id) ? "checked" : ""} ${!chk18.has(c.id) && chk18.size >= 4 ? "disabled" : ""}><span>${i + 1}. ${nm(ctx, c, 26)}</span><span class="mono muted">${c.score.toFixed(3)}</span></label>`).join("")}</div>
          ${cols.length ? `<div class="t18w"><table class="t18"><thead><tr><th>지표 <span class="muted" style="font-weight:400">좋은 쪽</span></th>${cols.map((c) => `<th>${ctx.mol(c.s, 150, 84)}<b>${nm(ctx, c, 16)}</b></th>`).join("")}</tr></thead>
            <tbody>${ROWS18.map((row) => { const d = I[row[0]], b = best(row);
              return `<tr><th>${ctx.ind(d.k, d.sym)} <span class="muted">${row[1] > 0 ? "높을수록" : row[1] < 0 ? (d.k === "vina" ? "더 음수일수록" : "낮을수록") : "2.5 근처"}</span></th>${cols.map((c, i) => {
                const bad = !d.ok(c, ctx.S); return `<td class="${b[i] && cols.length > 1 ? "best" : ""} ${bad ? "bad" : ""}">${d.k === "alert" ? (c.al.length ? c.al.map(ctx.alName).join("·") : "없음") : d.fmt(d.val(c))}</td>`; }).join("")}</tr>`; }).join("")}
              <tr><th>이긴 지표 수</th>${cols.map((c, i) => `<td><b>${ROWS18.filter((row) => best(row)[i]).length}</b> / ${ROWS18.length}</td>`).join("")}</tr></tbody>
            <tfoot><tr><td></td>${cols.map((c) => `<td>${ctx.pickBtn(c)}</td>`).join("")}</tr></tfoot></table></div>` : ""}
          <div class="fb">라임 칸이 가장 많은 분자가 꼭 정답은 아니에요. 미션에서 중요한 지표(${ctx.M.hints.map((h) => ctx.esc(h.split("→")[1] || h)).join(" ·")})에서 이기는지 보세요.</div>`}`;
      return bind(el, {
        change: (e) => { const t = e.target; if (!t.dataset.c18) return; t.checked ? chk18.add(t.dataset.c18) : chk18.delete(t.dataset.c18); ctx.rerender(); }
      });
    }
  });

  /* ─────────────── 19 지도에서 직접 고르기 ─────────────── */
  const AX19 = { mw: "MW 분자량", tpsa: "TPSA 극성 표면적", logp: "logP 기름 친화도", qed: "QED 약다움", score: "표적 점수" };
  const V19 = { x: "mw", y: "tpsa", sel: null };
  /* 축마다 내 기준이 허용하는 구간 */
  const allow19 = (k, S) => (k === "mw" ? [-Infinity, S.mwMax] : k === "tpsa" ? [-Infinity, S.tpsaMax] : k === "logp" ? [-Infinity, 5] : k === "qed" ? [S.qedMin, Infinity] : [-Infinity, Infinity]);
  function ticks(lo, hi) {
    const span = hi - lo, raw = span / 5, p = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) || raw;
    const out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(+v.toFixed(6)); return out;
  }
  SV.add({
    id: "19",
    line: "분자 220개를 지도 위에 펼쳤어요. 두 축을 바꿔 가며 보고, 점을 눌러 오른쪽에서 자세히 본 뒤 담으세요. 밝게 칠한 구역이 내 기준을 통과하는 곳이에요.",
    goal: "지표 두 개를 동시에 보며 '좋은 구역'에 있는 분자를 찾는 법",
    render(el, ctx) {
      const { X, S, XM, M } = ctx;
      if (!V19.sel || !XM.get(V19.sel)) V19.sel = (passed(ctx)[0] || XM.get(M.ref) || X[0]).id;
      el.innerHTML = `<style>
          .m19 { display: grid; grid-template-columns: minmax(0, 1fr) 250px; gap: 14px; align-items: start; }
          .m19 .pl svg { display: block; width: 100%; height: auto; }
          .m19 .pl circle[data-sel19] { cursor: pointer; }
          .m19 .ax text { font-family: var(--mono); font-size: 10.5px; fill: var(--muted); }
          @media (max-width: 760px) { .m19 { grid-template-columns: minmax(0, 1fr); } }
        </style>
        <div class="row"><label class="sub" for="x19">가로축</label><select id="x19">${Object.entries(AX19).map(([k, v]) => `<option value="${k}" ${k === V19.x ? "selected" : ""}>${v}</option>`).join("")}</select>
          <label class="sub" for="y19">세로축</label><select id="y19">${Object.entries(AX19).map(([k, v]) => `<option value="${k}" ${k === V19.y ? "selected" : ""}>${v}</option>`).join("")}</select>
          <span class="sub">● 통과 · <span style="opacity:.5">●</span> 걸림 · <span style="color:var(--good)">◉</span> 바구니</span></div>
        <div class="m19"><div class="pl" id="pl19"></div><div id="sd19"></div></div>`;
      const pl = document.getElementById("pl19"), I = ctx.INDM;
      const W = Math.max(280, pl.clientWidth), H = Math.round(Math.min(460, Math.max(280, W * 0.72)));
      const L = 48, R = 12, T = 12, B = 38;
      const rx = X.map((c) => I[V19.x].val(c)), ry = X.map((c) => I[V19.y].val(c));
      const pad = (a) => { const lo = Math.min(...a), hi = Math.max(...a), p = (hi - lo) * 0.04 || 1; return [lo - p, hi + p]; };
      const [x0, x1] = pad(rx), [y0, y1] = pad(ry);
      const sx = (v) => L + ((v - x0) / (x1 - x0)) * (W - L - R), sy = (v) => H - B - ((v - y0) / (y1 - y0)) * (H - T - B);
      const ax = allow19(V19.x, S), ay = allow19(V19.y, S);
      const cx = (v) => Math.max(L, Math.min(W - R, sx(v))), cy = (v) => Math.max(T, Math.min(H - B, sy(v)));
      const zx0 = cx(Math.max(ax[0], x0)), zx1 = cx(Math.min(ax[1], x1)), zy0 = cy(Math.min(ay[1], y1)), zy1 = cy(Math.max(ay[0], y0));
      let out = `<rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="var(--bg)"/>`;
      out += `<rect x="${zx0}" y="${zy0}" width="${Math.max(0, zx1 - zx0)}" height="${Math.max(0, zy1 - zy0)}" fill="var(--good-bg)" stroke="var(--good)" stroke-dasharray="4 3"/>`;
      out += `<g class="ax">${ticks(x0, x1).map((v) => `<line x1="${sx(v)}" x2="${sx(v)}" y1="${T}" y2="${H - B}" stroke="var(--line)"/><text x="${sx(v)}" y="${H - B + 14}" text-anchor="middle">${+v.toFixed(2)}</text>`).join("")}
        ${ticks(y0, y1).map((v) => `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${sy(v) + 3}" text-anchor="end">${+v.toFixed(2)}</text>`).join("")}
        <text x="${W - R}" y="${H - 4}" text-anchor="end">${AX19[V19.x]} →</text><text x="${L}" y="${T + 10}" dx="4">↑ ${AX19[V19.y]}</text></g>`;
      const order = [...X].sort((a, b) => (a.f >= 6) - (b.f >= 6) || S.picks.includes(a.id) - S.picks.includes(b.id));
      out += order.map((c) => {
        const x = sx(I[V19.x].val(c)), y = sy(I[V19.y].val(c)), pk = S.picks.includes(c.id), ok = c.f >= 6;
        return `<circle data-cid="${c.id}" data-sel19="${c.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${pk ? 6 : ok ? 4 : 3.2}" fill="${pk ? "var(--f7)" : ok ? "var(--fg)" : "var(--faint)"}" ${pk ? 'stroke="var(--hit-ring)" stroke-width="1.5"' : ""} opacity="${ok || pk ? 1 : 0.55}"/>`;
      }).join("");
      const sel = XM.get(V19.sel), ref = XM.get(M.ref);
      if (ref) out += `<circle cx="${sx(I[V19.x].val(ref))}" cy="${sy(I[V19.y].val(ref))}" r="8" fill="none" stroke="var(--muted)" stroke-dasharray="2 2"/><text x="${sx(I[V19.x].val(ref)) + 10}" y="${sy(I[V19.y].val(ref)) - 8}" font-size="11" class="t-muted">실제 약</text>`;
      if (sel) out += `<circle cx="${sx(I[V19.x].val(sel))}" cy="${sy(I[V19.y].val(sel))}" r="10" fill="none" stroke="var(--fg)" stroke-width="2"/>`;
      pl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${AX19[V19.x]} 대 ${AX19[V19.y]} 산점도">${out}</svg>`;
      document.getElementById("sd19").innerHTML = sel ? `${ctx.mcard(sel)}<p class="sub" style="margin-top:8px">${ctx.esc(ctx.FATE[sel.f])}${sel.f < 6 ? ` — ${ctx.esc(ctx.reason(sel))}` : ""}</p>` : "";
      return bind(el, {
        change: (e) => { const t = e.target; if (t.id === "x19" || t.id === "y19") { V19[t.id[0]] = t.value; ctx.rerender(); } },
        click: (e) => { const p = e.target.closest("[data-sel19]"); if (p) { V19.sel = p.dataset.sel19; ctx.rerender(); } }
      });
    }
  });

  /* ─────────────── 20 레이더 겹쳐 고르기 ─────────────── */
  const AXES20 = [
    { k: "mw", lab: "MW", n: (c) => 1 - (c.mw - 150) / 450 },
    { k: "tpsa", lab: "TPSA", n: (c) => 1 - (c.tpsa - 20) / 140 },
    { k: "logp", lab: "logP", n: (c) => 1 - Math.abs(c.logp - 2.5) / 4 },
    { k: "ro5", lab: "Ro5", n: (c) => 1 - c.ro5 / 3 },
    { k: "qed", lab: "QED", n: (c) => (c.qed - 0.1) / 0.85 },
    { k: "score", lab: "점수", n: (c, lo, hi) => (c.score - lo) / (hi - lo || 1) }
  ];
  const sel20 = [];
  let key20 = "";
  const COL20 = ["var(--f2)", "var(--f3)", "var(--f4)", "var(--f5)"];
  SV.add({
    id: "20",
    line: "후보를 2~4개 골라 모양을 겹쳐 보세요. 모든 축은 바깥으로 갈수록 좋은 값이에요. 넓고 고르게 퍼진 모양일수록 균형 잡힌 분자입니다. 점선은 이 미션의 실제 약이에요.",
    goal: "한 지표만 뛰어난 분자와 고르게 좋은 분자의 차이를 모양으로 보는 법",
    render(el, ctx) {
      const pool = passed(ctx).slice(0, 30), { XM, M, X } = ctx;
      const k = ctx.S.tid + "|" + pool.map((c) => c.id).join(",").length;
      if (key20 !== k || !sel20.every((id) => pool.some((c) => c.id === id))) { sel20.length = 0; pool.slice(0, 3).forEach((c) => sel20.push(c.id)); key20 = k; }
      const lo = Math.min(...X.map((c) => c.score)), hi = Math.max(...X.map((c) => c.score));
      const clamp = (v) => Math.max(0.02, Math.min(1, v));
      const S = Math.min(440, Math.max(260, el.clientWidth - 40)), cx = S / 2, cy = S / 2 + 4, Rr = S / 2 - 46;
      const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / AXES20.length; return [cx + Math.cos(a) * Rr * v, cy + Math.sin(a) * Rr * v]; };
      const poly = (c) => AXES20.map((a, i) => pt(i, clamp(a.n(c, lo, hi))).map((v) => v.toFixed(1)).join(",")).join(" ");
      let svg = [0.25, 0.5, 0.75, 1].map((r) => `<polygon points="${AXES20.map((a, i) => pt(i, r).join(",")).join(" ")}" fill="none" stroke="var(--line)"/>`).join("");
      svg += AXES20.map((a, i) => { const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.13); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/><text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="12" font-weight="600">${a.lab}</text>`; }).join("");
      const ref = XM.get(M.ref);
      if (ref) svg += `<polygon points="${poly(ref)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
      const chosen = sel20.map((id) => XM.get(id)).filter(Boolean);
      svg += chosen.map((c, i) => `<polygon data-cid="${c.id}" points="${poly(c)}" fill="${COL20[i]}" fill-opacity="0.12" stroke="${COL20[i]}" stroke-width="2"/>`).join("");
      const area = (c) => { const v = AXES20.map((a) => clamp(a.n(c, lo, hi))); let s = 0; for (let i = 0; i < v.length; i++) s += v[i] * v[(i + 1) % v.length]; return s / v.length; };
      const bestA = chosen.length ? chosen.reduce((a, c) => (area(c) > area(a) ? c : a)) : null;
      el.innerHTML = `<style>
          .r20 { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 16px; align-items: start; }
          .r20 svg { width: ${S}px; max-width: 100%; height: auto; display: block; }
          .lg20 { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
          .lg20 .it { display: grid; grid-template-columns: 14px minmax(0, 1fr) auto; gap: 4px 8px; align-items: center; border: 1px solid var(--line); padding: 6px 8px; background: var(--bg); font-size: 12.5px; }
          .lg20 .it i { width: 14px; height: 3px; background: var(--c20); }
          .lg20 .it .mono { grid-column: 2 / -1; font-size: 11px; color: var(--muted); }
          .l20 { max-height: 180px; overflow: auto; border: 1px solid var(--line); background: var(--bg); }
          .l20 label { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 3px 10px; font-size: 12.5px; border-bottom: 1px solid var(--line); }
          .l20 label:has(input:disabled) { opacity: 0.5; }
          @media (max-width: 760px) { .r20 { grid-template-columns: minmax(0, 1fr); } }
        </style>
        ${!pool.length ? emptyFb(ctx) : `<div class="r20">
          <svg viewBox="0 0 ${S} ${S + 8}" role="img" aria-label="후보 레이더 비교">${svg}</svg>
          <div class="lg20">
            <p class="q" style="font-size:15px">겹친 후보 ${chosen.length} / 4</p>
            ${chosen.map((c, i) => `<div class="it" data-cid="${c.id}" style="--c20:${COL20[i]}"><i></i><b>${nm(ctx, c, 18)}</b>${ctx.pickBtn(c)}<span class="mono">점수 ${c.score.toFixed(3)} · TPSA ${c.tpsa.toFixed(0)} · QED ${c.qed.toFixed(2)}</span></div>`).join("")}
            ${ref ? `<div class="it" style="--c20:var(--muted)"><i style="background:none;border-top:2px dashed var(--muted)"></i><span>실제 약 ${nm(ctx, ref, 14)}</span><span></span></div>` : ""}
            <div class="l20" role="group" aria-label="겹쳐 볼 후보">${pool.map((c, i) => `<label><input type="checkbox" id="c20-${c.id}" data-c20="${c.id}" ${sel20.includes(c.id) ? "checked" : ""} ${!sel20.includes(c.id) && sel20.length >= 4 ? "disabled" : ""}><span>${i + 1}. ${nm(ctx, c, 22)}</span><span class="mono muted">${c.score.toFixed(3)}</span></label>`).join("")}</div>
          </div></div>
          ${bestA ? `<div class="fb">겹친 후보 가운데 모양이 가장 넓고 고른 분자는 <b>${nm(ctx, bestA, 20)}</b>예요. 그래도 한 축이 움푹 들어갔다면 그 지표(${ctx.ind("tpsa")}, ${ctx.ind("qed")} 등)가 약점이에요. 실제 약(점선)과 모양을 비교해 보세요.</div>` : ""}`}`;
      return bind(el, {
        change: (e) => { const t = e.target; if (!t.dataset.c20) return; const id = t.dataset.c20, i = sel20.indexOf(id); if (t.checked && i < 0 && sel20.length < 4) sel20.push(id); if (!t.checked && i >= 0) sel20.splice(i, 1); ctx.rerender(); }
      });
    }
  });
})();
