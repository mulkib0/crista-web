/* 로그인 시안 — D 갈래 '데이터 · 구조'(19~24). 수업에서 다룰 데이터 그림이 배경이 되고, 입력하면 함께 움직인다. 규칙은 core.js 머리말.
   분자식 · 분자량 · 결합 길이 · ABL1 잔기 번호는 실제 값이고, 측정값(곡선 · 스펙트럼 세기 · 밀도 지도)은 예시다.
   비밀번호는 글자 수만 쓴다 — 어떤 글자를 쳤는지는 그림에 드러나지 않는다. */
(() => {
  const { add, F } = window.LOGIN;
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans KR', -apple-system, sans-serif";
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const rand = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* 지금 보이는 입력칸의 글자 수(가입 전용 칸은 가입 때만 센다) */
  function typed(root) {
    const su = root.dataset.mode === "signup";
    let n = 0;
    root.querySelectorAll(".f-inp").forEach((i) => { if (su || !i.closest(".su")) n += i.value.length; });
    return n;
  }
  const inpVal = (root, k) => (root.querySelector(".f-inp-" + k) || { value: "" }).value;
  /* 포인터 시차(크게 보기에서만) */
  function pointer(root, ctx) {
    const p = { x: 0, y: 0, tx: 0, ty: 0, step(dt) { const k = 1 - Math.pow(0.004, dt || 0.016); p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; } };
    if (!ctx.live) return p;
    const mv = (e) => { const r = root.getBoundingClientRect(); p.tx = ((e.clientX - r.left) / r.width) * 2 - 1; p.ty = ((e.clientY - r.top) / r.height) * 2 - 1; };
    const lv = () => { p.tx = 0; p.ty = 0; };
    root.addEventListener("pointermove", mv);
    root.addEventListener("pointerleave", lv);
    ctx.cleanup(() => { root.removeEventListener("pointermove", mv); root.removeEventListener("pointerleave", lv); });
    return p;
  }

  /* 어두운 바탕의 폼(20 · 23 · 24) */
  const darkForm = (p) => `
    ${p} .f-tabs { border: 1px solid rgba(241,241,233,.22); }
    ${p} .f-tab { border: 0; color: #9da59a; padding: 9px 10px; font-size: 13.5px; }
    ${p} .f-tab + .f-tab { border-left: 1px solid rgba(241,241,233,.22); }
    ${p} .f-tab[aria-selected="true"] { background: #c6ff4a; color: #080b09; border-color: transparent; }
    ${p} .f-lab { color: #9da59a; font: 500 10.5px/1.2 var(--mono); letter-spacing: .08em; text-transform: uppercase; }
    ${p} .f-inp { background: rgba(241,241,233,.04); border-color: rgba(241,241,233,.2); color: #f1f1e9; font-family: var(--mono); }
    ${p} .f-inp:focus { border-color: #c6ff4a; background: rgba(241,241,233,.07); }
    ${p} .f-go { background: #c6ff4a; color: #080b09; }
    ${p} .f-hint { color: #9da59a; opacity: 1; }
    ${p} .f-msg { border-color: #ff7a5c; color: #ffb3a1; background: rgba(255,122,92,.1); }
    ${p} .f-msg[data-kind="lock"] { border-color: #ffc24a; color: #ffd98a; background: rgba(255,194,74,.1); }
    ${p} .f-msg[data-kind="ok"] { border-color: #c6ff4a; color: #c6ff4a; background: rgba(198,255,74,.08); }
    ${p} .f-peek { color: #f1f1e9; }`;
  /* 밝은 바탕의 폼(19 · 21 · 22) */
  const lightForm = (p) => `
    ${p} .f-lab { font: 500 10.5px/1.2 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: #5b6358; }
    ${p} .f-inp { background: #fbfbf6; border-color: rgba(8,11,9,.24); }
    ${p} .f-inp:focus { border-color: #080b09; }`;

  /* ───────────────────────── 19 SMILES 타자 ───────────────────────── */
  const SMILES = "Cc1ccc(NC(=O)c2ccc(CN3CCN(C)CC3)cc2)cc1Nc1nccc(-c2cccnc2)n1"; // 이마티닙 C29H31N7O
  const smCls = (c) => (c === "N" ? "aN" : c === "n" ? "aN ar" : c === "O" ? "aO" : c === "C" ? "aC" : c === "c" ? "aC ar" : /\d/.test(c) ? "rg" : c === "(" || c === ")" ? "br" : c === "=" ? "b2" : "b1");
  add({
    no: 19, fam: "d", title: "SMILES 타자", en: "SMILES Typewriter", swatch: "#f1f1e9",
    caption: "이마티닙 분자를 한 줄 글자로 적은 SMILES가 화면 가득 타자됩니다. 질소는 파랑, 산소는 빨강, 방향족 고리는 라임 밑줄로 읽힙니다.",
    css: `
      .v19 { background: #f1f1e9; }
      .v19 .hd { position: absolute; z-index: 3; left: 56px; right: 56px; top: 30px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .v19 .hd .wm { font-size: 30px; }
      .v19 .meta { margin: 0; font: 500 11px/1.4 var(--mono); letter-spacing: .06em; color: #5b6358; text-align: right; }
      .v19 .meta b { color: #080b09; font-weight: 600; margin-right: 8px; }
      .v19 .meta i { font-style: normal; color: #080b09; background: #c6ff4a; padding: 1px 6px; margin-left: 4px; }
      .v19 .sm { position: absolute; z-index: 1; left: 50px; right: 50px; top: 100px; margin: 0; font: 500 8.6cqw/1.04 var(--mono); letter-spacing: -.02em; word-break: break-all; color: #080b09; user-select: none; }
      .v19 .ch { color: transparent; -webkit-text-stroke: 1.2px rgba(8,11,9,.14); }
      .v19 .ch.on { -webkit-text-stroke: 0; color: #080b09; }
      .v19 .ch.on.aN { color: #2747d6; }
      .v19 .ch.on.aO { color: #d8321e; }
      .v19 .ch.on.ar { box-shadow: inset 0 -.1em 0 #c6ff4a; }
      .v19 .ch.on.rg { color: #8b9387; font-style: italic; }
      .v19 .ch.on.br { color: #a6ada2; }
      .v19 .ch.on.b1, .v19 .ch.on.b2 { color: #5b6358; }
      .v19 .caret { display: inline-block; width: 0; height: 1em; position: relative; vertical-align: -.14em; }
      .v19 .caret::after { content: ""; position: absolute; left: .03em; top: 0; width: .52em; height: 1em; background: #080b09; animation: v19-blink 1.06s steps(1) infinite; }
      @keyframes v19-blink { 50% { opacity: 0; } }
      .v19 .leg { position: absolute; z-index: 2; left: 56px; bottom: 44px; width: min(560px, 44cqw); display: grid; gap: 12px; }
      .v19 .mol { margin: 0; font-size: 13px; line-height: 1.55; color: #5b6358; }
      .v19 .mol b { color: #080b09; font-weight: 600; margin-right: 6px; }
      .v19 .leg ul { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12px; color: #5b6358; }
      .v19 .leg li { display: inline-flex; align-items: center; gap: 6px; }
      .v19 .k { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 4px; font: 600 13px/1 var(--mono); font-style: normal; background: #fbfbf6; border: 1px solid rgba(8,11,9,.16); }
      .v19 .k.aN { color: #2747d6; } .v19 .k.aO { color: #d8321e; } .v19 .k.ar { box-shadow: inset 0 -3px 0 #c6ff4a; } .v19 .k.rg { color: #8b9387; font-style: italic; } .v19 .k.br, .v19 .k.b2 { color: #5b6358; }
      .v19 .pane { position: absolute; z-index: 2; right: 56px; bottom: 44px; width: 404px; max-height: calc(100% - 128px); overflow-y: auto; background: #fbfbf6; border: 1px solid #080b09; padding: 22px 24px 20px; display: grid; gap: 16px; }
      .v19 .pane-h { margin: 0; display: flex; justify-content: space-between; gap: 12px; font: 500 10.5px/1.3 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: #5b6358; }
      .v19 .lead { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: -.02em; line-height: 1.4; text-wrap: balance; }
      .v19[data-mode="signup"] .lead { display: none; }
      .v19 .f { gap: 14px; }
      .v19 .f-tabs { gap: 2px; padding-bottom: 10px; border-bottom: 1px dashed rgba(8,11,9,.28); }
      .v19 .f-tab { flex: none; border: 0; padding: 5px 10px; background: none; font: 500 13px/1.3 var(--mono); color: #5b6358; }
      .v19 .f-tab[aria-selected="true"] { background: #080b09; color: #f1f1e9; }
      .v19 .f-fields { gap: 10px; }
      .v19 .f-fld { gap: 2px; }
      ${lightForm(".v19")}
      .v19 .f-inp { font: 500 16px/1.2 var(--mono); border: 0; border-bottom: 2px solid rgba(8,11,9,.22); background: transparent; padding: 8px 0 7px; min-height: 40px; }
      .v19 .f-inp:focus { border-bottom-color: #080b09; box-shadow: 0 3px 0 -1px #c6ff4a; }
      .v19 .f-cells .f-inp { border: 0; box-shadow: none; }
      .v19 .f-go { font-family: var(--mono); justify-content: space-between; padding: 0 18px; margin-top: 4px; }
      .v19 .f-go kbd { font: 500 12px/1 var(--mono); border: 1px solid rgba(241,241,233,.4); padding: 3px 6px; }
      .v19 .f-msg { font-family: var(--mono); font-size: 12.5px; border-width: 0 0 0 3px; }
      .v19 .f-msg::before { font: 600 10px/1 var(--mono); letter-spacing: .1em; justify-self: start; padding: 3px 5px; margin-bottom: 3px; color: #fbfbf6; background: #b2361b; }
      .v19 .f-msg[data-kind="bad"]::before { content: "ERROR"; }
      .v19 .f-msg[data-kind="lock"]::before { content: "LOCKED 60 s"; background: #8a5a00; }
      .v19 .f-msg[data-kind="ok"]::before { content: "OK"; background: #2f6f2a; }
      .v19 .f-hint { font-size: 12px; }
      @container scr (max-width: 760px) {
        .v19 .hd { left: 16px; right: 16px; top: 18px; }
        .v19 .hd .wm { font-size: 24px; }
        .v19 .meta b, .v19 .meta .lb { display: none; }
        .v19 .sm { left: 14px; right: 14px; top: 62px; font-size: 12.4cqw; }
        .v19 .leg { display: none; }
        .v19 .pane { left: 12px; right: 12px; bottom: 12px; width: auto; max-height: calc(100% - 76px); padding: 18px 16px 16px; gap: 12px; }
        .v19 .lead { font-size: 15px; }
      }`,
    html: (F) => `
      <div class="hd">${F.word()}<p class="meta"><b>SMILES</b><span class="lb">분자를 한 줄 글자로 · 작성</span><i class="who">${F.DEMO.id}</i></p></div>
      <p class="sm" aria-hidden="true">${[...SMILES].map((c) => `<span class="ch ${smCls(c)}">${c}</span>`).join("")}<i class="caret"></i></p>
      <div class="leg">
        <p class="mol"><b>이마티닙(글리벡)</b>C₂₉H₃₁N₇O · 493.6 g/mol. 만성 골수성 백혈병을 일으키는 BCR-ABL 효소를 막는 약을 글자 59개로 적었어요.</p>
        <ul><li><i class="k aN">N</i>질소</li><li><i class="k aO">O</i>산소</li><li><i class="k ar">c</i>방향족 고리의 탄소</li><li><i class="k rg">1</i>고리 닫기</li><li><i class="k br">( )</i>곁가지</li><li><i class="k b2">=</i>이중 결합</li></ul>
      </div>
      <section class="pane" aria-label="로그인">
        <p class="pane-h"><span>${F.COPY.brand} · ${F.COPY.sub}</span><span>C₂₉H₃₁N₇O</span></p>
        <h1 class="lead">${F.COPY.lead}</h1>
        ${F.form({ go: { login: "들어가기 <kbd>↵ Enter</kbd>", signup: "가입하고 들어가기 <kbd>↵</kbd>" } })}
      </section>`,
    mount(root, ctx) {
      const spans = [...root.querySelectorAll(".ch")], caret = root.querySelector(".caret"), who = root.querySelector(".who");
      const N = spans.length;
      let last = -1;
      const set = (n) => {
        if (n === last) return;
        last = n;
        spans.forEach((s, i) => s.classList.toggle("on", i < n));
        if (n > 0) spans[n - 1].after(caret); else spans[0].before(caret);
      };
      set(N);
      ctx.loop((t) => {
        if (ctx.reduce) return set(N);
        const cyc = N + 34;
        set(Math.min(N, Math.floor((t + 6) * 7.5) % cyc));
      });
      ctx.onField((k, v, r) => { if (k === "id" || k === "reset") who.textContent = inpVal(r, "id") || "…"; });
    },
  });

  /* ───────────────────────── 20 분자 모형 ───────────────────────── */
  /* 카페인(1,3,7-트라이메틸잔틴) — 고리 결합 1.40 Å · C=O 1.23 Å · N–CH₃ 1.47 Å · C–H 1.09 Å 정사면체로 세웠다 */
  const CAF = (() => {
    const A = [], B = [];
    const at = (e, x, y, z = 0) => (A.push({ e, x, y, z }), A.length - 1);
    const bd = (a, b, o = 1) => B.push([a, b, o]);
    const c5 = at("C", 1.212, 0.7), c6 = at("C", 0, 1.4), n1 = at("N", -1.212, 0.7), c2 = at("C", -1.212, -0.7), n3 = at("N", 0, -1.4), c4 = at("C", 1.212, -0.7);
    const n7 = at("N", 2.544, 1.133), c8 = at("C", 3.367, 0), n9 = at("N", 2.544, -1.133);
    const o6 = at("O", 0, 2.63), o2 = at("O", -2.277, -1.315);
    bd(n1, c2); bd(c2, n3); bd(n3, c4); bd(c4, c5, 2); bd(c5, c6); bd(c6, n1); bd(c5, n7); bd(n7, c8); bd(c8, n9, 2); bd(n9, c4); bd(c6, o6, 2); bd(c2, o2, 2);
    const methyl = (n, dx, dy) => {
      const c = at("C", A[n].x + dx * 1.47, A[n].y + dy * 1.47);
      bd(n, c);
      const ux = -dy, uy = dx;
      for (const th of [Math.PI / 2, Math.PI / 2 + 2.0944, Math.PI / 2 + 4.1888]) {
        bd(c, at("H", A[c].x + 1.09 * (0.334 * dx + 0.943 * Math.cos(th) * ux), A[c].y + 1.09 * (0.334 * dy + 0.943 * Math.cos(th) * uy), 1.09 * 0.943 * Math.sin(th)));
      }
    };
    methyl(n1, -0.866, 0.5); methyl(n3, 0, -1); methyl(n7, 0.309, 0.951);
    bd(c8, at("H", 4.447, 0));
    let cx = 0, cy = 0;
    A.forEach((a) => { cx += a.x; cy += a.y; });
    cx /= A.length; cy /= A.length;
    A.forEach((a) => { a.x -= cx; a.y -= cy; });
    return { A, B };
  })();
  /* CPK: [밝은 점, 바탕, 그늘, 반지름 Å] */
  const CPK = { C: ["#d3dacf", "#6f776d", "#1f241f", 0.34], H: ["#ffffff", "#e4e6dd", "#81867e", 0.2], N: ["#c9d2ff", "#3b5bff", "#101a5c", 0.32], O: ["#ffd0c8", "#ff3d2e", "#651006", 0.32] };
  add({
    no: 20, fam: "d", title: "분자 모형", en: "Ball & Stick", swatch: "#080b09",
    caption: "실제 결합 길이로 세운 카페인 공-막대 모형이 천천히 돕니다. 글자를 칠 때마다 분자가 떨리고, 비밀번호가 틀리면 크게 흔들리고, 잠기면 멈춥니다.",
    css: `
      .v20 { background: #080b09; color: #f1f1e9; }
      .v20 .stage { position: absolute; top: 0; right: 0; bottom: 0; left: 500px; }
      .v20 .glow { position: absolute; inset: 0; background: radial-gradient(closest-side, rgba(198,255,74,.07), rgba(198,255,74,0) 70%); pointer-events: none; }
      .v20 .hud { position: absolute; z-index: 2; right: 48px; top: 40px; margin: 0; text-align: right; display: grid; gap: 4px; font: 500 11px/1.4 var(--mono); letter-spacing: .06em; color: #9da59a; }
      .v20 .hud b { font: 600 22px/1.2 var(--sans); letter-spacing: -.02em; color: #f1f1e9; }
      .v20 .hud em { font-style: normal; color: #c6ff4a; }
      .v20 .cpk { position: absolute; z-index: 2; right: 48px; bottom: 40px; margin: 0; padding: 0; list-style: none; display: flex; gap: 18px; font-size: 12px; color: #9da59a; }
      .v20 .cpk li { display: inline-flex; align-items: center; gap: 7px; }
      .v20 .cpk i { width: 14px; height: 14px; border-radius: 50%; display: inline-block; }
      .v20 .cpk .C { background: radial-gradient(circle at 35% 32%, #d3dacf, #6f776d 50%, #1f241f); }
      .v20 .cpk .H { background: radial-gradient(circle at 35% 32%, #fff, #e4e6dd 50%, #81867e); }
      .v20 .cpk .N { background: radial-gradient(circle at 35% 32%, #c9d2ff, #3b5bff 50%, #101a5c); }
      .v20 .cpk .O { background: radial-gradient(circle at 35% 32%, #ffd0c8, #ff3d2e 50%, #651006); }
      .v20 .cpk b { color: #f1f1e9; font-family: var(--mono); font-weight: 500; }
      .v20 .col { position: absolute; z-index: 3; left: 72px; top: 0; bottom: 0; width: 392px; display: flex; flex-direction: column; justify-content: center; gap: 22px; padding-block: 96px 40px; overflow-y: auto; }
      .v20 .tp { position: absolute; z-index: 4; left: 72px; top: 36px; display: flex; align-items: baseline; gap: 14px; }
      .v20 .tp .wm { font-size: 30px; }
      .v20 .tp-s { font: 500 11px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: #9da59a; }
      .v20 .lead { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -.035em; line-height: 1.3; text-wrap: balance; }
      .v20 .lead em { font-style: normal; color: #c6ff4a; }
      .v20[data-mode="signup"] .lead { font-size: 20px; }
      .v20 .f { gap: 14px; }
      .v20 .f-fields { gap: 12px; }
      ${darkForm(".v20")}
      .v20 .f-go { min-height: 52px; font-size: 16px; }
      @container scr (max-width: 760px) {
        .v20 .stage { left: 0; bottom: auto; height: 36%; }
        .v20 .hud { right: 16px; top: 64px; font-size: 10px; } .v20 .hud b { font-size: 16px; } .v20 .hud .x { display: none; }
        .v20 .cpk { display: none; }
        .v20 .tp { left: 16px; top: 18px; } .v20 .tp .wm { font-size: 24px; } .v20 .tp-s { display: none; }
        .v20 .col { left: 0; right: 0; width: auto; top: 36%; justify-content: flex-start; padding: 14px 16px 20px; gap: 14px; background: linear-gradient(#080b09 0, #080b09 100%); border-top: 1px solid rgba(241,241,233,.14); }
        .v20 .lead { font-size: 18px; } .v20[data-mode="signup"] .lead { display: none; }
      }`,
    html: (F) => `
      <div class="stage"><div class="glow"></div></div>
      <p class="hud"><span>공-막대 모형 · 결합 길이 Å 그대로</span><b>카페인</b><span class="x">1,3,7-트라이메틸잔틴</span><span><em>C₈H₁₀N₄O₂</em> · 194.19 g/mol</span></p>
      <ul class="cpk" aria-label="원자 색"><li><i class="C"></i><b>C</b>탄소 8</li><li><i class="H"></i><b>H</b>수소 10</li><li><i class="N"></i><b>N</b>질소 4</li><li><i class="O"></i><b>O</b>산소 2</li></ul>
      <div class="tp">${F.word()}<span class="tp-s">${F.COPY.sub}</span></div>
      <div class="col">
        <h1 class="lead">분자 하나에서 시작해 <em>신약</em>까지, 모둠이 회사가 되어 계산해요</h1>
        ${F.form()}
      </div>`,
    mount(root, ctx) {
      const s = ctx.canvas(root.querySelector(".stage"));
      const p = pointer(root, ctx);
      const { A, B } = CAF;
      let kick = 0, spin = 0.32, yaw = 0.7, lastMsg = root.dataset.msg;
      ctx.onField((k) => { if (k !== "reset") kick = Math.min(1.2, kick + 0.42); });
      const P = A.map(() => ({ X: 0, Y: 0, Z: 0, f: 1 }));
      ctx.loop((t, dt) => {
        const { g, w, h } = s;
        if (!w) return;
        p.step(dt);
        const msg = root.dataset.msg;
        if (msg !== lastMsg) { if (msg === "bad") kick = 1.5; lastMsg = msg; }
        const want = msg === "lock" ? 0 : msg === "ok" ? 1.5 : 0.32;
        spin += (want - spin) * Math.min(1, dt * 2.5);
        yaw += spin * dt;
        kick *= Math.pow(0.05, dt);
        const sc = Math.min(w / 9.4, h / 8.2);
        const cx = w / 2, cy = h / 2;
        const ya = yaw + p.x * 0.6, pa = 0.32 + Math.sin(t * 0.13) * 0.25 + p.y * 0.35;
        const cyw = Math.cos(ya), syw = Math.sin(ya), cp = Math.cos(pa), sp = Math.sin(pa);
        A.forEach((a, i) => {
          const j = kick * 0.1;
          const x = a.x + Math.sin(t * 41 + i * 1.7) * j, y = a.y + Math.sin(t * 37 + i * 2.3) * j, z = a.z + Math.sin(t * 43 + i * 0.9) * j;
          const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
          const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
          const f = 16 / (16 - z2);
          const q = P[i];
          q.X = cx + x1 * sc * f; q.Y = cy - y1 * sc * f; q.Z = z2; q.f = f;
        });
        g.clearRect(0, 0, w, h);
        g.globalAlpha = msg === "lock" ? 0.42 : 1;
        if (msg === "ok") {
          const gr = g.createRadialGradient(cx, cy, 0, cx, cy, sc * 5);
          gr.addColorStop(0, "rgba(198,255,74,.22)"); gr.addColorStop(1, "rgba(198,255,74,0)");
          g.fillStyle = gr; g.fillRect(0, 0, w, h);
        }
        const items = [];
        B.forEach((b) => items.push({ z: (P[b[0]].Z + P[b[1]].Z) / 2 - 0.05, b }));
        A.forEach((a, i) => items.push({ z: P[i].Z, i }));
        items.sort((u, v) => u.z - v.z);
        g.lineCap = "round";
        for (const it of items) {
          if (it.b) {
            const [ia, ib, o] = it.b, a = P[ia], b = P[ib];
            const ea = A[ia].e, eb = A[ib].e;
            const lw = 0.15 * sc * (a.f + b.f) / 2;
            const nx = -(b.Y - a.Y), ny = b.X - a.X, L = Math.hypot(nx, ny) || 1;
            const offs = o === 2 ? [-1, 1] : [0];
            for (const sg of offs) {
              const ox = (nx / L) * 0.12 * sc * sg, oy = (ny / L) * 0.12 * sc * sg;
              const W = o === 2 ? lw * 0.6 : lw;
              const mx = (a.X + b.X) / 2 + ox, my = (a.Y + b.Y) / 2 + oy;
              g.lineWidth = W;
              g.strokeStyle = CPK[ea][2]; g.beginPath(); g.moveTo(a.X + ox, a.Y + oy); g.lineTo(mx, my); g.stroke();
              g.strokeStyle = CPK[eb][2]; g.beginPath(); g.moveTo(mx, my); g.lineTo(b.X + ox, b.Y + oy); g.stroke();
              g.lineWidth = W * 0.38;
              g.strokeStyle = CPK[ea][1]; g.beginPath(); g.moveTo(a.X + ox, a.Y + oy - W * 0.12); g.lineTo(mx, my - W * 0.12); g.stroke();
              g.strokeStyle = CPK[eb][1]; g.beginPath(); g.moveTo(mx, my - W * 0.12); g.lineTo(b.X + ox, b.Y + oy - W * 0.12); g.stroke();
            }
          } else {
            const q = P[it.i], c = CPK[A[it.i].e], r = c[3] * sc * q.f;
            const gr = g.createRadialGradient(q.X - r * 0.35, q.Y - r * 0.38, r * 0.06, q.X, q.Y, r);
            gr.addColorStop(0, c[0]); gr.addColorStop(0.48, c[1]); gr.addColorStop(1, c[2]);
            g.fillStyle = gr;
            g.beginPath(); g.arc(q.X, q.Y, r, 0, Math.PI * 2); g.fill();
          }
        }
        g.globalAlpha = 1;
      });
    },
  });

  /* ───────────────────────── 21 서열 정렬 ───────────────────────── */
  /* 키나제 도메인 활성 고리 부근(HRD → DFG → APE). 첫 칸 = ABL1 His361, DFG = 381~383 */
  const ALN = [
    ["ABL1", "HRDLAARNCLVGENHLVKVADFGLSRLMT-GDTYTAHAGAKFPIKWTAPE"],
    ["KIT", "HRDLAARNILLTHGRITKICDFGLARDIKNDSNYVVKGNARLPVKWMAPE"],
    ["SRC", "HRDLRAANILVGENLVCKVADFGLARLIE-DNEYTARQGAKFPIKWTAPE"],
    ["LCK", "HRDLRAANILVSDTLSCKIADFGLARLIE-DNEYTAREGAKFPIKWTAPE"],
    ["EGFR", "HRDLAARNVLVKTPQHVKITDFGLAKLLGAEEKEYHAEGGKVPIKWMALE"],
  ];
  const NCOL = 50, WIN = [14, 36]; // 휴대폰에서는 DFG 둘레 22칸만
  const aaCls = (r) => (!r ? "" : "AILMFWV".includes(r) ? "hy" : "KR".includes(r) ? "po" : "ED".includes(r) ? "ne" : "NQST".includes(r) ? "pl" : r === "C" ? "cy" : r === "G" ? "gl" : r === "P" ? "pr" : "HY".includes(r) ? "ar" : r === "U" || r === "O" ? "rare" : r === "X" ? "unk" : "");
  const toAA = (ch) => { const c = ch.toUpperCase(); if ("ACDEFGHIKLMNPQRSTVWYUO".includes(c)) return c; return /[A-Z]/.test(c) ? "X" : "-"; };
  const COLS = Array.from({ length: NCOL }, (_, c) => {
    const res = ALN.map((r) => r[1][c]);
    const cnt = {}, cc = {};
    res.forEach((r) => { if (r !== "-") { cnt[r] = (cnt[r] || 0) + 1; const k = aaCls(r); cc[k] = (cc[k] || 0) + 1; } });
    return { cons: Math.max(0, ...Object.values(cnt)) / ALN.length, cc };
  });
  const abl1No = (() => { const m = []; let n = 361; for (const r of ALN[0][1]) { m.push(r === "-" ? null : n); if (r !== "-") n++; } return m; })();
  const MOTIF = { 0: "HRD", 20: "DFG", 47: "APE" };
  const inWin = (c) => c >= WIN[0] && c < WIN[1];
  const userCells = (id) => Array.from({ length: NCOL }, (_, c) => { const r = c < id.length ? toAA(id[c]) : ""; return [r, aaCls(r)]; });
  const score = (id) => userCells(id).filter(([r], c) => r && r !== "-" && r === ALN[0][1][c]).length;
  add({
    no: 21, fam: "d", title: "서열 정렬", en: "Sequence Alignment", swatch: "#fbfbf6",
    caption: "아이디의 영문 글자를 아미노산 한 글자 기호로 읽어 이마티닙 표적 ABL1 · KIT와 나란히 정렬합니다. 칠 때마다 맨 윗줄이 바뀌고 같은 자리 수를 셉니다.",
    css: `
      .v21 { background: #f1f1e9; }
      .v21 .in { position: absolute; inset: 0; display: flex; flex-direction: column; }
      .v21 .hd { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 28px 56px 0; }
      .v21 .hd .wm { font-size: 30px; }
      .v21 .hd p { margin: 0; font: 500 11px/1.4 var(--mono); letter-spacing: .06em; color: #5b6358; text-align: right; }
      .v21 .hd p b { color: #080b09; font-weight: 600; }
      .v21 .band { flex: none; margin: 22px 56px 0; background: #fbfbf6; border: 1px solid rgba(8,11,9,.2); padding: 14px 18px 12px; }
      .v21 .bar { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; font: 500 10.5px/1.3 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: #5b6358; }
      .v21 .aln { --nw: 132px; --cols: ${NCOL}; position: relative; display: grid; grid-template-columns: var(--nw) repeat(var(--cols), minmax(0, 1fr)); grid-template-rows: 20px 18px 30px repeat(${ALN.length}, 24px) 34px; font: 500 clamp(10px, .92cqw, 13.5px)/1 var(--mono); }
      .v21 .aln > * { display: grid; place-items: center; font-style: normal; min-width: 0; }
      .v21 .aln > .nm { display: flex; align-items: center; justify-content: flex-start; padding-right: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; }
      .v21 .nm small { font-weight: 400; color: #5b6358; margin-left: 6px; font-size: .86em; }
      .v21 .nm.me { color: #080b09; }
      .v21 .nm.me b { color: #5b6358; font-weight: 500; margin-right: 2px; }
      .v21 .nm.me i { font-style: normal; background: #c6ff4a; padding: 2px 4px; }
      .v21 .nm.sub { color: #5b6358; font-weight: 400; font-size: .86em; }
      .v21 .mt { place-items: end start !important; position: relative; }
      .v21 .mt.on { border-top: 2px solid #080b09; margin-top: 12px; }
      .v21 .mt b { position: absolute; left: 0; top: -14px; font: 600 10px/1 var(--mono); letter-spacing: .1em; white-space: nowrap; }
      .v21 .rl { place-items: end start !important; color: #5b6358; font-size: .78em; border-left: 1px solid transparent; white-space: nowrap; overflow: visible; }
      .v21 .rl.t { border-left-color: rgba(8,11,9,.4); padding-left: 2px; }
      .v21 .r { color: #080b09; }
      .v21 .r.gap { color: #a6ada2; }
      .v21 .u { border-top: 1px solid #080b09; border-bottom: 1px solid #080b09; margin-bottom: 4px; background: #fff; }
      .v21 .u.eq { box-shadow: inset 0 0 0 2px #080b09; }
      .v21 .hy { background: #a9bff5; } .v21 .po { background: #f6928a; } .v21 .ne { background: #dda0dd; } .v21 .pl { background: #93dc93; }
      .v21 .cy { background: #f5b3b3; } .v21 .gl { background: #f6c08f; } .v21 .pr { background: #dcdc7a; } .v21 .ar { background: #8ccfcf; }
      .v21 .rare { background: #080b09; color: #c6ff4a; } .v21 .unk { background: #e7e8de; color: #5b6358; }
      .v21 .cs { place-items: end center !important; padding: 4px 1px 0; }
      .v21 .cs i { display: block; width: 100%; height: calc(var(--h) * 26px); background: #5b6358; }
      .v21 .cs.full i { background: #080b09; }
      .v21 .sweep { position: absolute; top: 34px; bottom: 0; left: var(--nw); width: calc((100% - var(--nw)) / var(--cols)); outline: 2px solid #080b09; outline-offset: -1px; box-shadow: 0 -4px 0 #c6ff4a; pointer-events: none; animation: v21-sw 16s steps(var(--cols)) infinite; }
      @keyframes v21-sw { to { transform: translateX(calc(100% * var(--cols))); } }
      .v21[data-mode="signup"] .aln { grid-template-rows: 20px 18px 26px repeat(${ALN.length}, 20px) 22px; }
      .v21[data-mode="signup"] .low { padding-top: 16px; }
      .v21 .low { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 404px; gap: 56px; padding: 26px 56px 28px; }
      .v21 .note { min-width: 0; display: grid; align-content: start; gap: 14px; }
      .v21 .note h1 { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: -.035em; line-height: 1.2; text-wrap: balance; }
      .v21 .note p { margin: 0; color: #5b6358; font-size: 14px; line-height: 1.65; max-width: 54ch; }
      .v21 .note .sc { color: #080b09; font-weight: 600; }
      .v21 .note .sc b { font-family: var(--mono); background: #c6ff4a; padding: 1px 6px; }
      .v21 .lg { margin: 2px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: #5b6358; }
      .v21 .lg li { display: inline-flex; align-items: center; gap: 6px; }
      .v21 .lg i { width: 12px; height: 12px; display: inline-block; }
      .v21 .side { min-width: 0; min-height: 0; overflow-y: auto; display: grid; align-content: start; gap: 14px; padding: 2px; }
      .v21 .side h2 { margin: 0; font: 500 10.5px/1.3 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: #5b6358; display: flex; gap: 10px; align-items: center; }
      .v21 .side h2::after { content: ""; flex: 1; height: 1px; background: rgba(8,11,9,.2); }
      .v21 .f { gap: 12px; }
      .v21 .f-fields { gap: 10px; }
      ${lightForm(".v21")}
      .v21 .f-tab[aria-selected="true"] { background: #080b09; }
      .v21 .f-fld-id .f-lab::after { content: "  → 맨 윗줄 서열"; color: #080b09; text-transform: none; letter-spacing: 0; }
      .v21 .f-inp { min-height: 42px; font-family: var(--mono); }
      @container scr (max-width: 760px) {
        .v21 .in { overflow-y: auto; }
        .v21 .hd { padding: 18px 16px 0; } .v21 .hd .wm { font-size: 24px; } .v21 .hd p .x { display: none; }
        .v21 .band { margin: 14px 12px 0; padding: 10px 10px 8px; }
        .v21 .bar span + span { display: none; }
        .v21 .aln { --nw: 74px; --cols: ${WIN[1] - WIN[0]}; font-size: 11px; grid-template-rows: 20px 16px 26px repeat(${ALN.length}, 20px) 26px; }
        .v21 .aln .x { display: none; }
        .v21 .nm small { display: none; } .v21 .aln > .nm.sub { visibility: hidden; }
        .v21 .cs i { height: calc(var(--h) * 18px); }
        .v21 .low { flex: none; grid-template-columns: 1fr; gap: 16px; padding: 16px 16px 20px; }
        .v21 .note h1 { font-size: 19px; } .v21 .note .long, .v21 .lg { display: none; }
        .v21 .side { overflow: visible; }
      }`,
    html: (F) => {
      const cells = (fn) => Array.from({ length: NCOL }, (_, c) => fn(c, inWin(c) ? "" : " x")).join("");
      const motif = cells((c, x) => { const st = Object.keys(MOTIF).map(Number).find((s) => c >= s && c < s + 3); return `<i class="mt${st != null ? " on" : ""}${x}">${st === c ? `<b>${MOTIF[st]}</b>` : ""}</i>`; });
      const ruler = cells((c, x) => { const n = abl1No[c]; return `<i class="rl${n && n % 10 === 0 ? " t" : ""}${x}">${n && n % 10 === 0 ? n : ""}</i>`; });
      const me = userCells(F.DEMO.id).map(([r, k], c) => `<i class="u ${k}${r && r !== "-" && r === ALN[0][1][c] ? " eq" : ""}${inWin(c) ? "" : " x"}">${r}</i>`).join("");
      const rows = ALN.map(([nm, seq]) => `<span class="nm">${nm}${nm === "ABL1" || nm === "KIT" ? "<small>이마티닙 표적</small>" : ""}</span>` +
        cells((c, x) => { const r = seq[c], k = aaCls(r), col = COLS[c]; const on = r !== "-" && (k === "gl" || k === "pr" || (col.cc[k] || 0) >= 3); return `<i class="r ${on ? k : ""}${r === "-" ? " gap" : ""}${x}">${r}</i>`; })).join("");
      const cons = cells((c, x) => `<i class="cs${COLS[c].cons === 1 ? " full" : ""}${x}" style="--h:${COLS[c].cons.toFixed(2)}"><i></i></i>`);
      return `
      <div class="in">
      <div class="hd">${F.word()}<p><b>${F.COPY.sub}</b><span class="x"> · 키나제 도메인 활성 고리 · 예시 정렬</span></p></div>
      <section class="band" aria-label="서열 정렬(예시)">
        <div class="bar"><span>Clustal 색 · 보존도 = 같은 글자 비율</span><span>번호는 ABL1 기준</span></div>
        <div class="aln" aria-hidden="true">
          <span class="nm sub">모티프</span>${motif}
          <span class="nm sub">ABL1 번호</span>${ruler}
          <span class="nm me"><b>&gt;</b><i class="me-id">${F.esc(F.DEMO.id)}</i></span>${me}
          ${rows}
          <span class="nm sub">보존도</span>${cons}
          <i class="sweep"></i>
        </div>
      </section>
      <div class="low">
        <div class="note">
          <h1>내 아이디를 서열 맨 윗줄에 세워요</h1>
          <p class="long">아이디의 영문 글자를 아미노산 한 글자 기호로 읽습니다. 숫자는 빈칸(-)이 되고 B · J · X · Z는 X(모르는 아미노산)로, U와 O는 드문 아미노산인 셀레노시스테인 · 피롤리신으로 읽어요.</p>
          <p class="sc">ABL1과 같은 자리 <b class="score">${score(F.DEMO.id)}</b>개</p>
          <p class="long">HRD · DFG · APE는 키나제가 일하는 자리예요. 이마티닙은 DFG가 바깥으로 젖혀진 모양(DFG-out)의 ABL1에 붙습니다.</p>
          <ul class="lg"><li><i class="hy"></i>소수성</li><li><i class="po"></i>양전하</li><li><i class="ne"></i>음전하</li><li><i class="pl"></i>극성</li><li><i class="gl"></i>글리신</li><li><i class="pr"></i>프롤린</li><li><i class="ar"></i>방향족</li><li><i class="cy"></i>시스테인</li></ul>
        </div>
        <div class="side"><h2>${F.COPY.brand} 들어가기</h2>${F.form()}</div>
      </div>
      </div>`;
    },
    mount(root, ctx) {
      const us = [...root.querySelectorAll(".u")], idEl = root.querySelector(".me-id"), sc = root.querySelector(".score");
      ctx.onField((k, v, r) => {
        if (k !== "id" && k !== "reset") return;
        const id = inpVal(r, "id");
        userCells(id).forEach(([res, cls], c) => {
          const el = us[c];
          el.textContent = res;
          el.className = `u ${cls}${res && res !== "-" && res === ALN[0][1][c] ? " eq" : ""}${inWin(c) ? "" : " x"}`;
        });
        idEl.textContent = id || "아이디";
        sc.textContent = score(id);
      });
    },
  });

  /* ───────────────────────── 22 용량-반응 곡선 ───────────────────────── */
  const LOG_IC50 = Math.log10(2.5e-7), HILL = 1;
  const hill = (x) => 100 / (1 + Math.pow(10, (LOG_IC50 - x) * HILL));
  const DOSE = Array.from({ length: 10 }, (_, i) => -9 + i * 0.5);
  const NOISE = [3.1, -2.4, 1.8, -3.6, 2.2, -1.5, 2.9, -2.1, 1.2, -0.8], SD = [2.4, 3.1, 2.8, 4.6, 5.2, 4.9, 3.8, 2.9, 2.2, 1.6];
  const PTS = DOSE.map((x, i) => [x, clamp(hill(x) + NOISE[i], 0, 100), SD[i]]);
  const SUP = { "-9": "⁻⁹", "-8": "⁻⁸", "-7": "⁻⁷", "-6": "⁻⁶", "-5": "⁻⁵", "-4": "⁻⁴" };
  add({
    no: 22, fam: "d", title: "용량-반응 곡선", en: "Dose–Response", swatch: "#fbfbf6",
    caption: "반로그 모눈종이 위에 입력한 글자 수만큼 측정점이 찍힙니다. 점이 넷이면 곡선을 맞추고, 50%를 넘는 점이 생겨야 IC₅₀ 250 nM을 정합니다.",
    css: `
      .v22 { background: #f1f1e9; }
      .v22 .in { position: absolute; inset: 0; }
      .v22 .hd { position: absolute; left: 56px; right: 56px; top: 30px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .v22 .hd .wm { font-size: 30px; }
      .v22 .hd p { margin: 0; font: 500 11px/1.4 var(--mono); letter-spacing: .06em; color: #5b6358; }
      .v22 .fig { position: absolute; left: 56px; top: 96px; bottom: 44px; right: 520px; margin: 0; display: flex; flex-direction: column; background: #fbfbf6; border: 1px solid rgba(8,11,9,.22); }
      .v22 .plot { position: relative; flex: 1; min-height: 0; }
      .v22 figcaption { flex: none; padding: 10px 16px 12px; border-top: 1px solid rgba(8,11,9,.12); font-size: 12.5px; line-height: 1.5; color: #5b6358; }
      .v22 figcaption b { color: #080b09; font-weight: 600; margin-right: 6px; }
      .v22 .side { position: absolute; right: 56px; top: 96px; bottom: 44px; width: 408px; overflow-y: auto; display: grid; align-content: start; gap: 18px; padding: 2px; }
      .v22 .lead { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -.035em; line-height: 1.28; text-wrap: balance; }
      .v22 .lead em { font-style: normal; box-shadow: inset 0 -.32em 0 #c6ff4a; }
      .v22[data-mode="signup"] .lead { font-size: 20px; }
      .v22 .f { gap: 14px; }
      .v22 .f-fields { gap: 11px; }
      .v22 .f-tabs { gap: 18px; border-bottom: 1px solid rgba(8,11,9,.18); }
      .v22 .f-tab { flex: none; border: 0; background: none; padding: 0 0 10px; display: inline-flex; align-items: center; gap: 8px; color: #5b6358; }
      .v22 .f-tab::before { content: ""; width: 10px; height: 10px; border: 1.5px solid currentColor; border-radius: 50%; }
      .v22 .f-tab[aria-selected="true"] { background: none; color: #080b09; }
      .v22 .f-tab[aria-selected="true"]::before { background: #080b09; }
      ${lightForm(".v22")}
      .v22 .f-inp { border-width: 0 0 1.5px; background: transparent; padding: 8px 2px; min-height: 40px; }
      .v22 .f-cells .f-inp { border: 0; }
      .v22 .f-go { min-height: 52px; justify-content: space-between; padding: 0 20px; }
      .v22 .f-go::after { content: "→"; }
      .v22 .f-go.busy::after { content: ""; }
      @container scr (max-width: 760px) {
        .v22 .in { overflow-y: auto; }
        .v22 .hd { left: 16px; right: 16px; top: 18px; } .v22 .hd .wm { font-size: 24px; } .v22 .hd p { display: none; }
        .v22 .fig { left: 12px; right: 12px; top: 62px; bottom: auto; height: 300px; }
        .v22 figcaption { font-size: 11px; padding: 6px 10px 8px; } .v22 figcaption .x { display: none; }
        .v22 .side { position: relative; left: auto; right: auto; top: auto; bottom: auto; width: auto; margin: 376px 16px 0; padding-bottom: 20px; overflow: visible; gap: 14px; }
        .v22 .lead { font-size: 19px; } .v22[data-mode="signup"] .lead { display: none; }
      }`,
    html: (F) => `
      <div class="in">
      <div class="hd">${F.word()}<p>반로그 모눈 · 예시 데이터 · n = 3</p></div>
      <figure class="fig">
        <div class="plot"></div>
        <figcaption><b>그림 1.</b>화합물 농도에 따른 ABL 키나제 저해율<span class="x">(평균 ± 표준편차). 입력한 글자 하나가 측정점 하나예요.</span></figcaption>
      </figure>
      <div class="side">
        <h1 class="lead">곡선 하나로 <em>약의 세기</em>를 읽는 수업, 모둠 회사로 들어가요</h1>
        ${F.form()}
      </div>
      </div>`,
    mount(root, ctx) {
      const s = ctx.canvas(root.querySelector(".plot"));
      const born = new Array(10).fill(null);
      let curveAt = null;
      ctx.loop((t) => {
        const { g, w, h } = s;
        if (!w) return;
        const narrow = w < 560;
        const msg = root.dataset.msg;
        const n = ctx.live ? Math.min(10, typed(root)) : 10;
        for (let i = 0; i < 10; i++) { if (i < n && born[i] == null) born[i] = ctx.live && !ctx.reduce ? t : -9; if (i >= n) born[i] = null; }
        if (n >= 4 && curveAt == null) curveAt = ctx.live && !ctx.reduce ? t : -9;
        if (n < 4) curveAt = null;
        const x0 = narrow ? 50 : 82, x1 = w - (narrow ? 14 : 32), y0 = narrow ? 22 : 44, y1 = h - (narrow ? 40 : 66);
        const X = (lx) => x0 + ((lx + 9) / 5) * (x1 - x0), Y = (v) => y1 - (v / 100) * (y1 - y0);
        g.clearRect(0, 0, w, h);
        /* 반로그 모눈: 세로줄은 10년마다 1~9, 가로줄은 5%마다 */
        g.lineWidth = 1;
        for (let d = -9; d < -4; d++) for (let k = 1; k < 10; k++) {
          const xx = Math.round(X(d + Math.log10(k))) + 0.5;
          g.strokeStyle = k === 1 ? "rgba(0,120,104,.34)" : "rgba(0,120,104,.13)";
          g.beginPath(); g.moveTo(xx, y0); g.lineTo(xx, y1); g.stroke();
        }
        for (let v = 0; v <= 100; v += 5) {
          const yy = Math.round(Y(v)) + 0.5;
          g.strokeStyle = v % 25 === 0 ? "rgba(0,120,104,.34)" : "rgba(0,120,104,.13)";
          g.beginPath(); g.moveTo(x0, yy); g.lineTo(x1, yy); g.stroke();
        }
        g.globalAlpha = msg === "lock" ? 0.38 : 1;
        /* 축 · 눈금 */
        g.strokeStyle = "#080b09"; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y1); g.lineTo(x1, y1); g.stroke();
        g.fillStyle = "#080b09"; g.font = `500 ${narrow ? 10 : 12}px ${MONO}`; g.textAlign = "center"; g.textBaseline = "top";
        for (let d = -9; d <= -4; d++) { const xx = X(d); g.beginPath(); g.moveTo(xx, y1); g.lineTo(xx, y1 + 6); g.stroke(); g.fillText("10" + SUP[d], xx, y1 + 9); }
        g.lineWidth = 1;
        for (let d = -9; d < -4; d++) for (let k = 2; k < 10; k++) { const xx = X(d + Math.log10(k)); g.beginPath(); g.moveTo(xx, y1); g.lineTo(xx, y1 + 3); g.stroke(); }
        g.textAlign = "right"; g.textBaseline = "middle";
        for (let v = 0; v <= 100; v += 25) { const yy = Y(v); g.beginPath(); g.moveTo(x0 - 6, yy); g.lineTo(x0, yy); g.stroke(); g.fillText(String(v), x0 - 10, yy); }
        g.fillStyle = "#5b6358"; g.font = `500 ${narrow ? 10 : 11.5}px ${SANS}`; g.textAlign = "center"; g.textBaseline = "alphabetic";
        g.fillText("농도 [M] · 로그 눈금", (x0 + x1) / 2, h - (narrow ? 6 : 16));
        g.save(); g.translate(narrow ? 12 : 24, (y0 + y1) / 2); g.rotate(-Math.PI / 2); g.fillText("저해율 (%)", 0, 0); g.restore();
        /* 곡선 */
        const fit = n >= 6;
        if (curveAt != null) {
          const pr = ease((t - curveAt) / 1.0);
          const steps = 120, upto = Math.floor(steps * pr);
          g.lineCap = "round";
          if (msg === "ok" && fit) { g.strokeStyle = "rgba(198,255,74,.9)"; g.lineWidth = 9; trace(); }
          g.strokeStyle = "#080b09"; g.lineWidth = 2.2;
          g.setLineDash(fit ? [] : [6, 6]);
          trace();
          g.setLineDash([]);
          function trace() { g.beginPath(); for (let i = 0; i <= upto; i++) { const lx = -9 + (5 * i) / steps; i ? g.lineTo(X(lx), Y(hill(lx))) : g.moveTo(X(lx), Y(hill(lx))); } g.stroke(); }
          if (fit && pr > 0.6) {
            const a = clamp((pr - 0.6) / 0.4), ix = X(LOG_IC50), iy = Y(50);
            g.globalAlpha = (msg === "lock" ? 0.38 : 1) * a;
            g.strokeStyle = "#080b09"; g.lineWidth = 1; g.setLineDash([3, 4]);
            g.beginPath(); g.moveTo(x0, iy); g.lineTo(ix, iy); g.lineTo(ix, y1); g.stroke(); g.setLineDash([]);
            const tag = "IC₅₀ = 250 nM", fs = narrow ? 11 : 13;
            g.font = `600 ${fs}px ${MONO}`;
            const tw = g.measureText(tag).width + 14;
            g.fillStyle = "#c6ff4a"; g.fillRect(ix + 10, iy - fs - 16, tw, fs + 10);
            g.fillStyle = "#080b09"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(tag, ix + 17, iy - fs / 2 - 11);
            if (!narrow) { g.font = `500 11px ${MONO}`; g.fillStyle = "#5b6358"; g.fillText("Hill 기울기 1.0", ix + 10, iy - fs - 28); }
            g.globalAlpha = msg === "lock" ? 0.38 : 1;
          }
        }
        /* 측정점 */
        for (let i = 0; i < n; i++) {
          const [lx, v, sd] = PTS[i], a = ease((t - born[i]) / 0.35);
          const px = X(lx), py = Y(v), r = (narrow ? 3.6 : 5) * a;
          const isBad = msg === "bad" && i === n - 1;
          g.strokeStyle = isBad ? "#b2361b" : "#080b09"; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(px, Y(v + sd)); g.lineTo(px, Y(v - sd)); g.moveTo(px - 4, Y(v + sd)); g.lineTo(px + 4, Y(v + sd)); g.moveTo(px - 4, Y(v - sd)); g.lineTo(px + 4, Y(v - sd)); g.stroke();
          g.fillStyle = isBad ? "#b2361b" : "#080b09";
          g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
          if (isBad) { g.font = `600 ${narrow ? 10 : 12}px ${SANS}`; g.textAlign = "right"; g.textBaseline = "middle"; g.fillText("다시 재 볼까요?", px - 10, py + 18); }
        }
        g.globalAlpha = 1;
        /* 상태 글 */
        g.font = `500 ${narrow ? 10 : 12}px ${MONO}`; g.textAlign = "left"; g.textBaseline = "top"; g.fillStyle = "#5b6358";
        const note = msg === "lock" ? "측정 잠김 · 1분 뒤 다시" : n < 4 ? `점 ${n} / 10 · 4개부터 곡선을 맞춰요` : !fit ? `점 ${n} / 10 · 50%를 넘는 점이 없어 IC₅₀ 미정` : `점 ${n} / 10`;
        g.fillText(note, x0 + 10, y0 + 6);
      });
    },
  });

  /* ───────────────────────── 23 질량 스펙트럼 ───────────────────────── */
  /* 이마티닙 ESI+ : [M+H]⁺ 494.3(기준), 동위원소 495.3 · 496.3, [M+2H]²⁺ 247.6, 조각 394.2 */
  const MS_BASE = [[247.6, 42, "[M+2H]²⁺"], [248.1, 13], [394.2, 18, "조각"], [395.2, 5], [494.3, 100, "[M+H]⁺"], [495.3, 33], [496.3, 6]];
  const MS_NOISE = (() => { const r = rand(23); return Array.from({ length: 34 }, () => [100 + r() * 500, 1 + r() * 6]); })();
  const idPeak = (ch, i) => { const c = ch.charCodeAt(0); let mz = 104 + ((c * 37 + i * 53) % 470) + ((c * 7) % 10) / 10; if (MS_BASE.some(([b, , tag]) => tag && Math.abs(b - mz) < 12)) mz += 24; return [mz, 18 + ((c * 29 + i * 11) % 56)]; };
  add({
    no: 23, fam: "d", title: "질량 스펙트럼", en: "Mass Spectrum", swatch: "#080b09",
    caption: "이마티닙의 ESI 질량 스펙트럼 위에 아이디 글자마다 라임 봉우리가 섭니다. 기준 봉우리 494.3이 화면의 큰 숫자가 됩니다.",
    css: `
      .v23 { background: #080b09; color: #f1f1e9; }
      .v23 .band { position: absolute; left: 0; right: 0; top: 0; height: 54%; transition: height .45s cubic-bezier(.2,.7,.2,1); }
      .v23[data-mode="signup"] .band { height: 30%; }
      .v23 .hd { position: absolute; z-index: 2; left: 56px; right: 56px; top: 28px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .v23 .hd .wm { font-size: 30px; }
      .v23 .hd p { margin: 0; font: 500 11px/1.4 var(--mono); letter-spacing: .06em; color: #9da59a; text-align: right; }
      .v23 .hd p b { color: #c6ff4a; font-weight: 500; }
      .v23 .low { position: absolute; left: 56px; right: 56px; top: 54%; bottom: 0; display: grid; grid-template-columns: minmax(0, 1fr) 408px; gap: 56px; padding-block: 30px 32px; transition: top .45s cubic-bezier(.2,.7,.2,1); }
      .v23[data-mode="signup"] .low { top: 30%; padding-top: 18px; }
      .v23 .read { min-width: 0; display: grid; align-content: start; gap: 10px; }
      .v23 .read .big { margin: 0; font: 600 clamp(64px, 9.4cqw, 148px)/.9 var(--mono); letter-spacing: -.05em; color: #c6ff4a; font-variant-numeric: tabular-nums; }
      .v23 .big small { font-size: .26em; letter-spacing: 0; color: #9da59a; margin-left: .3em; font-weight: 500; }
      .v23 .read p { margin: 0; color: #b7beb3; font-size: 14px; line-height: 1.6; max-width: 46ch; }
      .v23 .read p b { color: #f1f1e9; font-weight: 600; }
      .v23 .read .cnt { font-family: var(--mono); font-size: 12.5px; color: #9da59a; }
      .v23 .read .cnt b { color: #c6ff4a; font-weight: 500; }
      .v23 .read .lead { font-size: 15px; color: #f1f1e9; }
      .v23[data-mode="signup"] .read .lead, .v23[data-mode="signup"] .read .long { display: none; }
      .v23 .side { min-width: 0; min-height: 0; overflow-y: auto; display: grid; align-content: start; gap: 14px; padding: 2px; }
      .v23 .f { gap: 13px; }
      .v23 .f-fields { gap: 11px; }
      ${darkForm(".v23")}
      @container scr (max-width: 760px) {
        .v23 .band { height: 34%; } .v23[data-mode="signup"] .band { height: 24%; }
        .v23 .hd { left: 16px; right: 16px; top: 16px; } .v23 .hd .wm { font-size: 24px; } .v23 .hd p .x { display: none; }
        .v23 .low { left: 0; right: 0; top: 34%; grid-template-columns: 1fr; gap: 14px; padding: 14px 16px 20px; overflow-y: auto; align-content: start; }
        .v23[data-mode="signup"] .low { top: 24%; }
        .v23 .read .big { font-size: 54px; } .v23 .read .long, .v23 .read .lead { display: none; }
        .v23[data-mode="signup"] .read { display: none; }
        .v23 .side { overflow: visible; }
      }`,
    html: (F) => `
      <div class="band"></div>
      <div class="hd">${F.word()}<p><b>ESI+</b> 스캔 m/z 100–600<span class="x"> · 예시 스펙트럼</span></p></div>
      <div class="low">
        <div class="read">
          <p class="big">494.3<small>m/z</small></p>
          <p class="long"><b>기준 봉우리(100%) · [M+H]⁺</b> 이마티닙 C₂₉H₃₁N₇O에 양성자 하나가 붙은 이온이에요. 흰 봉우리는 약, 라임 봉우리는 내 아이디 글자예요.</p>
          <p class="cnt">아이디 봉우리 <b class="n">0</b>개 · 비밀번호는 글자 수만큼 작은 잡음으로</p>
          <p class="lead">${F.COPY.lead}</p>
        </div>
        <div class="side">${F.form()}</div>
      </div>`,
    mount(root, ctx) {
      const s = ctx.canvas(root.querySelector(".band"));
      const cnt = root.querySelector(".cnt .n");
      let idP = [], pwP = [], dirty = true, base = [];
      const rebuild = (t) => {
        const id = inpVal(root, "id"), pw = inpVal(root, "pw").length;
        const nb = (x) => (ctx.live && !ctx.reduce && dirtyBorn ? t : -9);
        idP = [...id].map((ch, i) => { const [mz, I] = idPeak(ch, i); const old = idP[i]; return { mz, I, ch, born: old && old.ch === ch ? old.born : nb() }; });
        const r = rand(97);
        pwP = Array.from({ length: pw }, (_, i) => { const mz = 110 + r() * 480, I = 4 + r() * 10; return pwP[i] ? pwP[i] : { mz, I, born: nb() }; });
        cnt.textContent = idP.length;
        dirty = false;
      };
      let dirtyBorn = false;
      ctx.onField((k) => { dirty = true; dirtyBorn = k !== "reset"; });
      ctx.loop((t) => {
        const { g, w, h } = s;
        if (!w) return;
        if (dirty) rebuild(t);
        const narrow = w < 760, msg = root.dataset.msg;
        const x0 = narrow ? 40 : 76, x1 = w - (narrow ? 16 : 56), y0 = narrow ? 70 : 104, y1 = h - (narrow ? 30 : 40);
        const X = (mz) => x0 + ((mz - 100) / 500) * (x1 - x0), Y = (I) => y1 - (I / 100) * (y1 - y0);
        g.clearRect(0, 0, w, h);
        g.lineWidth = 1;
        g.font = `500 ${narrow ? 9.5 : 11}px ${MONO}`; g.fillStyle = "#9da59a";
        g.textAlign = "right"; g.textBaseline = "middle";
        for (let v = 0; v <= 100; v += 25) {
          const yy = Math.round(Y(v)) + 0.5;
          g.strokeStyle = v ? "rgba(241,241,233,.08)" : "rgba(241,241,233,.5)";
          g.beginPath(); g.moveTo(x0, yy); g.lineTo(x1, yy); g.stroke();
          if (!narrow || v % 50 === 0) g.fillText(v + (v === 100 ? "%" : ""), x0 - 8, yy);
        }
        g.textAlign = "center"; g.textBaseline = "top";
        for (let mz = 100; mz <= 600; mz += 10) {
          const xx = Math.round(X(mz)) + 0.5, major = mz % 50 === 0;
          g.strokeStyle = "rgba(241,241,233,.5)";
          g.beginPath(); g.moveTo(xx, y1); g.lineTo(xx, y1 + (major ? 6 : 3)); g.stroke();
          if (major && (!narrow || mz % 100 === 0)) g.fillText(String(mz), xx, y1 + 9);
        }
        if (!narrow) { g.textAlign = "right"; g.fillText("m/z", x1, y1 + 22); }
        const peak = (mz, I, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(X(mz), y1); g.lineTo(X(mz), Y(I)); g.stroke(); };
        const dim = msg === "lock" ? 0.35 : 1;
        g.globalAlpha = dim;
        MS_NOISE.forEach(([mz, I]) => peak(mz, I, "rgba(241,241,233,.32)", 1));
        pwP.forEach((p) => peak(p.mz, p.I * ease((t - p.born) / 0.4), "rgba(198,255,74,.4)", 1.2));
        MS_BASE.forEach(([mz, I]) => peak(mz, I, "#f1f1e9", narrow ? 1.6 : 2.2));
        const idCol = msg === "bad" ? "#ff7a5c" : "#c6ff4a";
        if (msg === "ok") { g.shadowColor = "rgba(198,255,74,.8)"; g.shadowBlur = 12; }
        idP.forEach((p) => peak(p.mz, p.I * ease((t - p.born) / 0.45), idCol, narrow ? 2 : 3));
        g.shadowBlur = 0;
        /* 라벨: 약 봉우리 셋 + 아이디 글자 */
        g.textAlign = "center"; g.textBaseline = "bottom";
        MS_BASE.forEach(([mz, I, tag]) => {
          if (!tag) return;
          g.fillStyle = "#f1f1e9"; g.font = `600 ${narrow ? 10 : 12}px ${MONO}`; g.fillText(mz.toFixed(1), X(mz), Y(I) - 6);
          if (!narrow) { g.fillStyle = "#9da59a"; g.font = `500 11px ${MONO}`; g.fillText(tag, X(mz), Y(I) - 22); }
        });
        g.font = `600 ${narrow ? 10 : 12}px ${MONO}`;
        idP.forEach((p) => { const a = ease((t - p.born) / 0.45); if (a < 0.6) return; g.fillStyle = idCol; g.fillText(p.ch, X(p.mz), Y(p.I * a) - 5); });
        g.globalAlpha = 1;
        if (msg === "lock") { g.fillStyle = "#ffd98a"; g.font = `600 ${narrow ? 11 : 13}px ${SANS}`; g.textAlign = "right"; g.textBaseline = "top"; g.fillText("스캔 멈춤 · 1분 뒤 다시", x1, y0 - 34); }
      });
    },
  });

  /* ───────────────────────── 24 전자 밀도 지도 ───────────────────────── */
  /* 이마티닙 2D 배치(고리 1.40 Å). 고리 A 피리딘 → B 피리미딘 → NH → C 메틸페닐 → 아마이드 → D 페닐 → CH₂ → E N-메틸피페라진 */
  const IMA = (() => {
    const A = [], B = [];
    const at = (e, x, y) => (A.push({ e, x, y }), A.length - 1);
    const bd = (a, b, o = 1) => B.push([a, b, o]);
    const hex = (cx, cy, els) => els.map((e, k) => at(e, cx + 1.4 * Math.cos((k * Math.PI) / 3), cy + 1.4 * Math.sin((k * Math.PI) / 3)));
    const ring = (ids, aro) => ids.forEach((a, k) => bd(a, ids[(k + 1) % 6], aro && k % 2 === 0 ? 2 : 1));
    const out = (i, deg, L, e) => at(e, A[i].x + L * Math.cos((deg * Math.PI) / 180), A[i].y + L * Math.sin((deg * Math.PI) / 180));
    const ra = hex(0, 0, ["C", "C", "N", "C", "C", "C"]); ring(ra, true);
    const rb = hex(4.28, 0, ["N", "C", "N", "C", "C", "C"]); ring(rb, true); bd(ra[0], rb[3]);
    const nl = out(rb[1], 60, 1.38, "N"); bd(rb[1], nl);
    const rc = hex(A[nl].x + 2.8, A[nl].y, ["C", "C", "C", "C", "C", "C"]); ring(rc, true); bd(nl, rc[3]);
    const me1 = out(rc[2], 120, 1.5, "C"); bd(rc[2], me1);
    const nam = out(rc[5], 300, 1.38, "N"); bd(rc[5], nam);
    const cam = out(nam, 30, 1.36, "C"); bd(nam, cam);
    const o1 = out(cam, 90, 1.23, "O"); bd(cam, o1, 2);
    const c30 = Math.cos(-Math.PI / 6), s30 = Math.sin(-Math.PI / 6);
    const rD = hex(A[cam].x + 1.48 * c30 + 1.4, A[cam].y + 1.48 * s30, ["C", "C", "C", "C", "C", "C"]); ring(rD, true); bd(cam, rD[3]);
    const ch2 = out(rD[0], 30, 1.5, "C"); bd(rD[0], ch2);
    const rE = hex(A[ch2].x + 1.47 * c30 + 1.4, A[ch2].y + 1.47 * s30, ["N", "C", "C", "N", "C", "C"]); ring(rE, false); bd(ch2, rE[3]);
    const me2 = out(rE[0], 30, 1.47, "C"); bd(rE[0], me2);
    const cnt = {};
    A.forEach((a) => { cnt[a.e] = (cnt[a.e] || 0) + 1; a.name = a.e + cnt[a.e]; });
    let mx = 0, my = 0; A.forEach((a) => { mx += a.x; my += a.y; }); mx /= A.length; my /= A.length;
    A.forEach((a) => { a.x -= mx; a.y -= my; });
    const r = rand(24);
    const W = [[-12.4, 3.1], [-7.9, -3.4], [-3.0, -2.8], [0.6, 3.8], [3.9, 3.0], [6.8, -3.1], [11.2, -2.6], [-10.8, -2.0], [-4.6, 4.6], [9.4, 3.6]];
    const blobs = Array.from({ length: 54 }, () => [(r() - 0.5) * 44, (r() - 0.5) * 22, 0.3 + r() * 0.42]).filter(([x, y]) => A.every((a) => (a.x - x) ** 2 + (a.y - y) ** 2 > 5));
    return { A, B, W, blobs };
  })();
  add({
    no: 24, fam: "d", title: "전자 밀도 지도", en: "Electron Density", swatch: "#05070a",
    caption: "결정 구조를 풀 때 보는 파란 밀도 그물 속에 이마티닙 막대 모형이 앉아 있습니다. 비밀번호가 틀리면 빨간 음의 차이 밀도, 맞으면 초록 양의 차이 밀도가 뜹니다.",
    css: `
      .v24 { background: #05070a; color: #f1f1e9; }
      .v24 .map { position: absolute; inset: 0; }
      .v24 .hd { position: absolute; z-index: 2; left: 48px; top: 32px; display: grid; gap: 10px; }
      .v24 .hd .wm { font-size: 30px; }
      .v24 .strip { margin: 0; display: flex; flex-wrap: wrap; gap: 0; font: 500 11px/1 var(--mono); letter-spacing: .04em; color: #9db4ff; }
      .v24 .strip span { padding: 6px 10px; border: 1px solid rgba(110,150,255,.32); background: rgba(5,7,10,.7); }
      .v24 .strip span + span { border-left: 0; }
      .v24 .strip b { color: #f1f1e9; font-weight: 500; }
      .v24 .lg { position: absolute; z-index: 2; left: 48px; bottom: 34px; margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 12px; color: #9da59a; max-width: calc(100% - 560px); }
      .v24 .lg li { display: inline-flex; align-items: center; gap: 7px; }
      .v24 .lg i { width: 16px; height: 10px; display: inline-block; border: 1.5px solid; border-radius: 40%; }
      .v24 .lg .b { border-color: #5a86ff; } .v24 .lg .g { border-color: #37d67a; } .v24 .lg .r { border-color: #ff4d4d; }
      .v24 .lg .w { border: 0; width: 12px; height: 12px; background: linear-gradient(45deg, transparent 43%, #ff5a4a 43% 57%, transparent 57%), linear-gradient(-45deg, transparent 43%, #ff5a4a 43% 57%, transparent 57%); }
      .v24 .pnl { position: absolute; z-index: 3; right: 40px; top: 50%; transform: translateY(-50%); max-height: calc(100% - 80px); width: 416px; display: flex; flex-direction: column; background: rgba(9,12,16,.9); border: 1px solid rgba(110,150,255,.3); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
      .v24 .pnl-h { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; border-bottom: 1px solid rgba(110,150,255,.3); font: 500 11px/1.2 var(--mono); letter-spacing: .06em; color: #9db4ff; }
      .v24 .pnl-h b { color: #f1f1e9; font-weight: 500; }
      .v24 .pnl-h .mk { width: 16px; height: 16px; color: #c6ff4a; }
      .v24 .pnl-b { flex: 0 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; padding: 26px 26px 24px; }
      .v24 .lead { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -.03em; line-height: 1.32; text-wrap: balance; }
      .v24 .lead em { font-style: normal; color: #9db4ff; }
      .v24[data-mode="signup"] .lead { display: none; }
      .v24 .f { gap: 13px; }
      .v24 .f-fields { gap: 11px; }
      ${darkForm(".v24")}
      .v24 .f-tab[aria-selected="true"] { background: #5a86ff; color: #05070a; }
      .v24 .f-inp:focus { border-color: #5a86ff; }
      .v24 .f-go { background: #f1f1e9; }
      .v24 .f-msg[data-kind="bad"] { border-color: #ff4d4d; color: #ff9c9c; background: rgba(255,77,77,.1); }
      .v24 .f-msg[data-kind="ok"] { border-color: #37d67a; color: #8ff0b6; background: rgba(55,214,122,.1); }
      @container scr (max-width: 760px) {
        .v24 .map { bottom: auto; height: 40%; }
        .v24 .hd { left: 16px; top: 16px; gap: 8px; } .v24 .hd .wm { font-size: 24px; }
        .v24 .strip { font-size: 9.5px; } .v24 .strip span { padding: 4px 6px; } .v24 .strip .x { display: none; }
        .v24 .lg { display: none; }
        .v24 .pnl { left: 0; right: 0; top: 40%; bottom: 0; transform: none; max-height: none; width: auto; border-width: 1px 0 0; }
        .v24 .pnl-b { flex: 1; }
        .v24 .pnl-b { justify-content: flex-start; padding: 16px; gap: 14px; }
        .v24 .lead { font-size: 18px; }
      }`,
    html: (F) => `
      <div class="map"></div>
      <div class="hd">${F.word()}<p class="strip"><span><b>2Fo−Fc</b> 1.50 σ</span><span class="x">0.38 e/Å³</span><span>해상도 <b>1.8 Å</b></span><span class="x">예시 맵</span></p></div>
      <ul class="lg"><li><i class="b"></i>2Fo−Fc 밀도</li><li><i class="g"></i>Fo−Fc 양(+) · 모형이 모자란 곳</li><li><i class="r"></i>Fo−Fc 음(−) · 모형이 틀린 곳</li><li><i class="w"></i>물 분자</li></ul>
      <section class="pnl" aria-label="로그인">
        <div class="pnl-h"><span>${F.mark()}</span><span><b>LIG 501</b> · <span class="ctr">N3</span></span></div>
        <div class="pnl-b">
          <h1 class="lead">약이 단백질에 앉은 모습을 <em>밀도 지도</em>로 확인하는 수업, 모둠으로 들어가요</h1>
          ${F.form()}
        </div>
      </section>`,
    mount(root, ctx) {
      const s = ctx.canvas(root.querySelector(".map"));
      const p = pointer(root, ctx);
      const ctr = root.querySelector(".ctr");
      const { A, B, W, blobs } = IMA;
      let geo = null, ci = 16, hx = 0, hy = 0, keys = 0;
      ctx.onField((k) => { if (k === "reset") return; keys++; ci = (16 + keys * 7) % A.length; ctr.textContent = A[ci].name; });
      ctr.textContent = A[ci].name;
      const build = (w, h) => {
        const narrow = w < 760;
        const th = narrow ? -0.62 : -0.24;
        const sc = narrow ? Math.min(w / 17, h / 13) : Math.min((w - 470) / 25, h / 11);
        const cx = narrow ? w * 0.5 : (w - 470) * 0.52, cy = narrow ? h * 0.56 : h * 0.52;
        const cs = Math.cos(th), sn = Math.sin(th);
        const fw = (x, y) => [cx + (x * cs - y * sn) * sc, cy - (x * sn + y * cs) * sc];
        const inv = (X, Y) => { const a = (X - cx) / sc, b = -(Y - cy) / sc; return [a * cs + b * sn, -a * sn + b * cs]; };
        const src = [];
        A.forEach((a) => src.push([a.x, a.y, a.e === "C" ? 1 : 1.18, 0.36]));
        W.forEach(([x, y]) => src.push([x, y, 0.95, 0.3]));
        blobs.forEach(([x, y, k]) => src.push([x, y, k, 0.55]));
        const gs = Math.max(7, Math.round(0.34 * sc));
        const nx = Math.ceil(w / gs) + 2, ny = Math.ceil(h / gs) + 2;
        const Fd = new Float32Array(nx * ny);
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const [x, y] = inv(i * gs - gs, j * gs - gs);
          let v = 0;
          for (const [sx, sy, k, s2] of src) { const d = (x - sx) ** 2 + (y - sy) ** 2; if (d < 9) v += k * Math.exp(-d / s2); }
          Fd[j * nx + i] = v;
        }
        const at = (i, j) => Fd[j * nx + i];
        const XY = (i, j) => [i * gs - gs, j * gs - gs];
        const mesh = new Path2D(), rim = new Path2D(), outer = new Path2D();
        const T = 0.42, T2 = 0.24;
        const segLine = (path, t, i0, j0, i1, j1) => {
          const a = at(i0, j0), b = at(i1, j1);
          if (a < t && b < t) return;
          const [x0, y0] = XY(i0, j0), [x1, y1] = XY(i1, j1);
          let u0 = 0, u1 = 1;
          if (a < t) u0 = (t - a) / (b - a); else if (b < t) u1 = (t - a) / (b - a);
          path.moveTo(x0 + (x1 - x0) * u0, y0 + (y1 - y0) * u0); path.lineTo(x0 + (x1 - x0) * u1, y0 + (y1 - y0) * u1);
        };
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx - 1; i++) segLine(mesh, T, i, j, i + 1, j);
        for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx; i++) segLine(mesh, T, i, j, i, j + 1);
        const contour = (path, t) => {
          for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
            const v = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
            const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
            const pts = [];
            for (let e = 0; e < 4; e++) {
              const a = v[e], b = v[(e + 1) % 4];
              if ((a >= t) !== (b >= t)) { const u = (t - a) / (b - a); const [x0, y0] = XY(...c[e]), [x1, y1] = XY(...c[(e + 1) % 4]); pts.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]); }
            }
            for (let q = 0; q + 1 < pts.length; q += 2) { path.moveTo(pts[q][0], pts[q][1]); path.lineTo(pts[q + 1][0], pts[q + 1][1]); }
          }
        };
        contour(rim, T); contour(outer, T2);
        return { w, h, sc, fw, mesh, rim, outer, narrow };
      };
      const ECOL = { C: "#c6ff4a", N: "#6f8cff", O: "#ff4d3d" };
      ctx.loop((t, dt) => {
        const { g, w, h } = s;
        if (!w) return;
        if (!geo || geo.w !== w || geo.h !== h) geo = build(w, h);
        p.step(dt);
        const msg = root.dataset.msg;
        g.clearRect(0, 0, w, h);
        g.save();
        g.translate(p.x * -14, p.y * -10);
        const pulse = 0.62 + Math.sin(t * 0.9) * 0.12;
        g.lineWidth = 1;
        g.strokeStyle = msg === "lock" ? "rgba(140,150,170,.22)" : `rgba(70,120,255,${0.2 * pulse})`; g.stroke(geo.outer);
        g.strokeStyle = msg === "lock" ? "rgba(140,150,170,.4)" : `rgba(90,134,255,${pulse})`; g.stroke(geo.mesh);
        g.lineWidth = 1.4; g.stroke(geo.rim);
        /* 막대 모형: 결합을 반씩 원소 색으로 */
        const lw = Math.max(1.6, geo.sc * 0.1);
        g.lineCap = "round"; g.lineWidth = lw;
        B.forEach(([ia, ib, o]) => {
          const [ax, ay] = geo.fw(A[ia].x, A[ia].y), [bx, by] = geo.fw(A[ib].x, A[ib].y);
          const nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny) || 1;
          for (const sg of o === 2 ? [-1, 1] : [0]) {
            const ox = (nx / L) * lw * 1.1 * sg, oy = (ny / L) * lw * 1.1 * sg, mx = (ax + bx) / 2 + ox, my = (ay + by) / 2 + oy;
            g.strokeStyle = ECOL[A[ia].e]; g.beginPath(); g.moveTo(ax + ox, ay + oy); g.lineTo(mx, my); g.stroke();
            g.strokeStyle = ECOL[A[ib].e]; g.beginPath(); g.moveTo(mx, my); g.lineTo(bx + ox, by + oy); g.stroke();
          }
        });
        /* 물 분자 × */
        g.strokeStyle = "#ff5a4a"; g.lineWidth = 1.6;
        W.forEach(([x, y]) => { const [X, Y] = geo.fw(x, y), k = Math.max(4, geo.sc * 0.16); g.beginPath(); g.moveTo(X - k, Y - k); g.lineTo(X + k, Y + k); g.moveTo(X + k, Y - k); g.lineTo(X - k, Y + k); g.stroke(); });
        /* 화면 중심 십자 — 입력할 때마다 다음 원자로 */
        const [tx, ty] = geo.fw(A[ci].x, A[ci].y);
        const k = ctx.reduce ? 1 : 1 - Math.pow(0.002, dt || 0.016);
        if (!hx && !hy) { hx = tx; hy = ty; }
        hx += (tx - hx) * k; hy += (ty - hy) * k;
        /* 차이 밀도(상태) */
        if (msg === "bad" || msg === "ok") {
          g.strokeStyle = msg === "bad" ? "#ff4d4d" : "#37d67a"; g.lineWidth = 1.3;
          const R = geo.sc * 0.55;
          [[0.9, 0.7], [-0.8, 1.0], [0.2, -1.1]].forEach(([ox, oy], q) => {
            const cx = hx + ox * geo.sc, cy = hy + oy * geo.sc, wob = 1 + Math.sin(t * 2 + q) * 0.08;
            for (let rr = 1; rr <= 3; rr++) { g.beginPath(); g.ellipse(cx, cy, R * rr * 0.42 * wob, R * rr * 0.32 * wob, q, 0, Math.PI * 2); g.stroke(); }
          });
        }
        g.strokeStyle = "#f1f1e9"; g.lineWidth = 1;
        const c = 12;
        g.beginPath(); g.moveTo(hx - c, hy); g.lineTo(hx - 4, hy); g.moveTo(hx + 4, hy); g.lineTo(hx + c, hy); g.moveTo(hx, hy - c); g.lineTo(hx, hy - 4); g.moveTo(hx, hy + 4); g.lineTo(hx, hy + c); g.stroke();
        g.font = `500 ${geo.narrow ? 10 : 11}px ${MONO}`; g.fillStyle = "#f1f1e9"; g.textAlign = "left"; g.textBaseline = "bottom";
        g.fillText(`LIG 501 · ${A[ci].name}`, hx + 10, hy - 10);
        g.restore();
      });
    },
  });
})();
