/* 로그인 시안 — A 갈래 '박막 · 유리'(01~06). 첫 화면의 박막 무지개 리본 · 간섭색에서 이어진다. 규칙은 core.js 머리말. */
(() => {
  const { add, F } = window.LOGIN;

  /* 01 — 첫 화면 장면을 그대로 두고 워드마크 자리에 로그인 칸이 들어선다 */
  add({
    no: 1, fam: "a", title: "이어지는 리본", en: "Ribbon, Continued", swatch: "#f1f1e9",
    caption: "첫 화면 장면을 그대로 두고 워드마크가 있던 오른쪽에 로그인 칸이 들어섭니다. [시작하기]를 누른 뒤에도 화면이 끊기지 않습니다.",
    css: `
      .v01 { background: #f1f1e9; }
      .v01 .gl { position: absolute; inset: 0; z-index: 0; cursor: grab; }
      .v01 .scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
        background: linear-gradient(270deg, rgba(241,241,233,.94) 0%, rgba(241,241,233,.7) 30%, rgba(241,241,233,0) 56%); }
      .v01 .side { position: absolute; z-index: 2; right: clamp(24px, 4.4cqw, 72px); top: 50%; transform: translateY(-50%);
        width: min(408px, 36cqw); max-height: calc(100% - 40px); overflow-y: auto; display: grid; gap: 20px; padding: 4px; }
      .v01 .wm { font-size: 60px; }
      .v01 .sub { margin: -6px 0 0; display: flex; align-items: center; gap: 10px; font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #5b6358; }
      .v01 .sub::before { content: ""; width: 28px; height: 1px; background: currentColor; }
      .v01 .lead { margin: 0; font-size: 19px; font-weight: 600; letter-spacing: -.02em; line-height: 1.4; text-wrap: balance; }
      .v01[data-mode="signup"] .lead { display: none; }
      .v01 .f { gap: 14px; }
      .v01 .f-tabs { gap: 22px; border-bottom: 1px solid rgba(8,11,9,.18); }
      .v01 .f-tab { flex: none; border: 0; padding: 0 0 10px; background: none; color: #5b6358; position: relative; }
      .v01 .f-tab[aria-selected="true"] { background: none; color: #080b09; }
      .v01 .f-tab[aria-selected="true"]::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: #080b09; }
      .v01 .f-fields { gap: 12px; }
      .v01 .f-lab { font-family: var(--mono); font-size: 10.5px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: #5b6358; }
      .v01 .f-inp { min-height: 46px; background: rgba(251,251,246,.78); border-color: rgba(8,11,9,.22); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
      .v01 .f-inp:focus { border-color: #080b09; background: #fbfbf6; }
      .v01 .f-go { min-height: 54px; font-size: 16px; justify-content: space-between; padding: 0 22px; }
      .v01 .f-go::after { content: "→"; font-weight: 500; }
      .v01 .f-go.busy::after { content: ""; }
      @container scr (max-width: 760px) {
        .v01 .scrim { background: linear-gradient(0deg, rgba(241,241,233,.96) 0%, rgba(241,241,233,.86) 50%, rgba(241,241,233,0) 72%); }
        .v01 .side { left: 16px; right: 16px; top: auto; bottom: 16px; transform: none; width: auto; max-height: calc(100% - 32px); gap: 14px; padding: 18px 16px;
          background: rgba(241,241,233,.8); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
        .v01 .wm { font-size: 44px; }
        .v01 .lead { font-size: 16px; }
      }`,
    html: (F) => `<div class="gl"></div><div class="scrim"></div>
      <div class="side">
        ${F.word()}
        <p class="sub">${F.COPY.sub}</p>
        <p class="lead">${F.COPY.lead}</p>
        ${F.form()}
      </div>`,
    mount(root, ctx) { ctx.ribbon(root.querySelector(".gl"), { ox: 0.2, oy: 0.04 }); },
  });

  /* ── A 갈래 공용: 박막 · 파장 색 ──
     filmRGB: 공기 속 비누막(굴절률 n)이 두께 d(nm)에서 반사하는 세기 sin²(2πnd/λ) 를 R 650 · G 540 · B 460 nm 로 본 색. 아주 얇으면 검다(검은 막).
     waveRGB: 가시광선 파장(nm) → 화면 색(Bruton 근사). */
  const filmRGB = (d, n = 1.33) => [650, 540, 460].map((l) => { const x = Math.sin((2 * Math.PI * n * d) / l); return Math.round(255 * Math.pow(x * x, 0.85)); });
  const waveRGB = (l) => {
    let r = 0, g = 0, b = 0;
    if (l < 440) { r = -(l - 440) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = -(l - 510) / 20; }
    else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = -(l - 645) / 65; } else { r = 1; }
    const f = l < 420 ? 0.3 + (0.7 * (l - 380)) / 40 : l > 700 ? 0.3 + (0.7 * (780 - l)) / 80 : 1;
    return [r, g, b].map((c) => Math.round(255 * Math.pow(Math.max(0, c * f), 0.8)));
  };
  const mixRGB = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const css = (c, a = 1) => (a === 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`);
  const PAPER = [241, 241, 233];
  const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const FILM = "linear-gradient(115deg,#ffd3ea 0%,#cdeaff 28%,#e4ffc0 52%,#ffe2c2 76%,#e6d4ff 100%)";

  /* 02 — 리본을 가운데 크게 두고, 그 위에 유리 카드. 카드 너머로 리본이 흐려져 보인다 */
  add({
    no: 2, fam: "a", title: "유리 카드", en: "Glass Card", swatch: "#eef0ea",
    caption: "리본을 화면 가운데 크게 띄우고 그 앞에 유리 카드를 세웠습니다. 카드 너머로 리본의 간섭색이 번져 보이고, 테두리 1px 는 오류 · 잠금 · 성공에 따라 색이 바뀝니다.",
    css: `
      .v02 { background: #f1f1e9; }
      .v02 .gl { position: absolute; inset: 0; z-index: 0; cursor: grab; }
      .v02 .hd { position: absolute; z-index: 2; left: clamp(20px, 3.4cqw, 56px); top: clamp(20px, 4cqh, 40px); display: flex; align-items: center; gap: 14px; }
      .v02 .hd .wm { font-size: 28px; }
      .v02 .hd small { font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: #5b6358; padding-left: 14px; border-left: 1px solid rgba(8,11,9,.22); line-height: 1.6; }
      .v02 .rib { position: absolute; z-index: 2; left: clamp(20px, 3.4cqw, 56px); bottom: clamp(20px, 4cqh, 40px); margin: 0; display: grid; gap: 4px; font-family: var(--mono); font-size: 11px; color: #5b6358; letter-spacing: .02em; }
      .v02 .rib b { color: #080b09; font-weight: 500; }
      .v02 .rib span { display: flex; gap: 10px; align-items: center; }
      .v02 .rib i { width: 22px; height: 1px; background: currentColor; display: inline-block; }
      .v02 .glass { position: absolute; z-index: 2; left: 55cqw; top: 0; bottom: 0; margin-block: auto; height: fit-content; max-height: calc(100% - 48px);
        width: min(440px, 38cqw); display: flex;
        background: rgba(251,251,246,.34); -webkit-backdrop-filter: blur(22px) saturate(1.6); backdrop-filter: blur(22px) saturate(1.6);
        box-shadow: 0 40px 90px -40px rgba(8,11,9,.45), inset 0 1px 0 rgba(255,255,255,.75); }
      .v02 .glass::before { content: ""; position: absolute; inset: 0; padding: 1px; background: ${FILM}; pointer-events: none;
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); transition: background .3s ease; }
      .v02[data-msg="bad"] .glass::before { background: #b2361b; }
      .v02[data-msg="lock"] .glass::before { background: #b07800; }
      .v02[data-msg="ok"] .glass::before { background: linear-gradient(115deg, #c6ff4a, #2f6f2a); }
      .v02 .in { flex: 1; min-width: 0; overflow-y: auto; padding: 34px 34px 30px; display: grid; gap: 22px; align-content: start; }
      .v02 h2 { margin: 0; font-size: 30px; line-height: 1.15; letter-spacing: -.035em; font-weight: 700; text-wrap: balance; }
      .v02 .lead { margin: -10px 0 0; color: #3d443b; font-size: 14.5px; line-height: 1.55; text-wrap: balance; }
      .v02[data-mode="signup"] .lead { display: none; }
      .v02 .f { gap: 16px; }
      .v02 .f-tabs { background: rgba(8,11,9,.07); padding: 4px; gap: 4px; }
      .v02 .f-tab { border: 0; padding: 9px 10px; color: #5b6358; font-size: 13.5px; }
      .v02 .f-tab + .f-tab { border: 0; }
      .v02 .f-tab[aria-selected="true"] { background: #fbfbf6; color: #080b09; box-shadow: 0 1px 2px rgba(8,11,9,.14), 0 6px 14px -8px rgba(8,11,9,.3); }
      .v02 .f-fields { gap: 12px; }
      .v02 .f-lab { font-size: 12px; font-weight: 600; color: #2b312a; }
      .v02 .f-inp { min-height: 46px; background: rgba(255,255,255,.58); border-color: rgba(8,11,9,.14); transition: border-color .15s ease, background-color .15s ease; }
      .v02 .f-inp:focus { background: #fff; border-color: #080b09; }
      .v02 .f-msg { border: 0; border-left: 3px solid currentColor; background: rgba(255,255,255,.62); }
      .v02 .f-go { min-height: 52px; font-size: 15.5px; }
      .v02 .f-hint { font-size: 12.5px; color: #3d443b; opacity: 1; }
      @container scr (max-width: 760px) {
        .v02 .hd { left: 16px; top: 18px; }
        .v02 .hd .wm { font-size: 24px; }
        .v02 .rib { display: none; }
        .v02 .glass { left: 12px; right: 12px; width: auto; top: auto; bottom: 12px; margin: 0; max-height: calc(100% - 150px); }
        .v02 .in { padding: 22px 18px 20px; gap: 18px; }
        .v02 h2 { font-size: 24px; }
        .v02 .lead { font-size: 13.5px; }
      }`,
    html: (F) => `<div class="gl"></div>
      <div class="hd">${F.word()}<small>${F.COPY.sub}</small></div>
      <p class="rib"><span><i></i>유리 리본 · 예측 구조</span><span><b>잔기 91</b> · α나선 3 · β가닥 3</span><span>끌어서 돌려 보세요</span></p>
      <section class="glass" aria-label="로그인">
        <div class="in">
          <h2><span class="li">다시 실험실로</span><span class="su">우리 반 실험실에 처음 왔나요</span></h2>
          <p class="lead">${F.COPY.lead}</p>
          ${F.form()}
        </div>
      </section>`,
    mount(root, ctx) {
      ctx.ribbon(root.querySelector(".gl"), { ox: 0.07, oy: 0.03, zoom: 1.0, shadow: 0.12, narrowOy: 0.3, narrowZoom: 0.7, seed: 102 });
    },
  });

  /* 03 — 잉크 바탕 위에서 리본 가장자리만 빛난다. 라임 단추 */
  add({
    no: 3, fam: "a", title: "잉크 무대", en: "Ink Stage", swatch: "#080b09",
    caption: "어두운 무대에서 유리 리본의 가장자리만 빛나게 했습니다. 예측 구조의 신뢰도(pLDDT) 범례를 곁들이고, 주 단추는 라임으로 둡니다.",
    css: `
      .v03 { background: #080b09; color: #f1f1e9; }
      .v03 .gl { position: absolute; inset: 0; z-index: 0; cursor: grab; }
      .v03 .scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(90deg, rgba(8,11,9,.94) 0%, rgba(8,11,9,.72) 34%, rgba(8,11,9,0) 62%); }
      .v03 .bar { position: absolute; z-index: 3; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px;
        padding: clamp(18px, 3.6cqh, 32px) clamp(20px, 3.4cqw, 56px); }
      .v03 .bar .wm { font-size: 24px; color: #f1f1e9; }
      .v03 .bar .wm .mk { color: #c6ff4a; }
      .v03 .swap-top { display: flex; gap: 10px; align-items: baseline; font-size: 13px; color: #9da59a; }
      .v03 .swap-top button, .v03 .swap button { appearance: none; border: 0; background: none; padding: 0 0 2px; color: #f1f1e9; font: inherit; font-weight: 600; cursor: pointer; border-bottom: 1px solid rgba(198,255,74,.6); }
      .v03 .swap-top button:hover, .v03 .swap button:hover { color: #c6ff4a; }
      .v03 .col { position: absolute; z-index: 2; left: clamp(28px, 7cqw, 120px); top: 0; bottom: 0; margin-block: auto; height: fit-content; max-height: calc(100% - 132px);
        width: min(420px, 36cqw); overflow-y: auto; display: grid; gap: 22px; padding: 2px; }
      .v03 .eyebrow { margin: 0; font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #c6ff4a; display: flex; align-items: center; gap: 10px; }
      .v03 .eyebrow::before { content: ""; width: 8px; height: 8px; background: #c6ff4a; box-shadow: 0 0 12px rgba(198,255,74,.8); }
      .v03 h1 { margin: -8px 0 0; font-size: 50px; line-height: 1.04; letter-spacing: -.045em; font-weight: 700; text-wrap: balance; }
      .v03 .lead { margin: -8px 0 0; color: rgba(241,241,233,.66); font-size: 15px; line-height: 1.6; text-wrap: balance; }
      .v03 .f { gap: 16px; }
      .v03 .f-fields { gap: 14px; }
      .v03 .f-lab { font-family: var(--mono); font-size: 10.5px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; color: #9da59a; }
      .v03 .f-inp { min-height: 48px; background: #0f140f; border-color: rgba(241,241,233,.16); color: #f1f1e9; transition: border-color .15s ease, box-shadow .15s ease; }
      .v03 .f-inp:focus { border-color: #c6ff4a; box-shadow: 0 0 0 3px rgba(198,255,74,.14); }
      .v03 .f-inp::placeholder { color: #9da59a; opacity: .7; }
      .v03 .f-msg { background: rgba(255,106,74,.08); border-color: rgba(255,138,106,.5); color: #ff9a7e; }
      .v03 .f-msg[data-kind="lock"] { background: rgba(255,178,26,.08); border-color: rgba(255,194,74,.5); color: #ffc24a; }
      .v03 .f-msg[data-kind="ok"] { background: rgba(198,255,74,.08); border-color: rgba(198,255,74,.5); color: #c6ff4a; }
      .v03 .f-go { min-height: 54px; background: #c6ff4a; color: #080b09; font-size: 16px; justify-content: space-between; padding: 0 22px; transition: box-shadow .2s ease; }
      .v03 .f-go::after { content: "→"; }
      .v03 .f-go.busy::after { content: ""; }
      .v03 .f-go:hover:not(:disabled) { box-shadow: 0 0 0 4px rgba(198,255,74,.18), 0 10px 40px -10px rgba(198,255,74,.6); }
      .v03 .f-hint { color: #9da59a; opacity: 1; font-size: 12.5px; }
      .v03 .swap { margin: 0; font-size: 13px; color: #9da59a; display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
      .v03 .legend { position: absolute; z-index: 2; right: clamp(20px, 3.4cqw, 56px); bottom: clamp(20px, 4cqh, 36px); margin: 0; display: grid; gap: 8px; font-family: var(--mono); font-size: 10.5px; color: #9da59a; letter-spacing: .03em; }
      .v03 .legend b { color: #f1f1e9; font-weight: 500; }
      .v03 .legend ul { list-style: none; margin: 0; padding: 0; display: flex; gap: 14px; flex-wrap: wrap; }
      .v03 .legend li { display: flex; align-items: center; gap: 6px; }
      .v03 .legend li i { width: 10px; height: 10px; display: inline-block; }
      .v03[data-msg="ok"] .eyebrow::before { animation: v03pulse 1s ease-in-out infinite; }
      @keyframes v03pulse { 50% { box-shadow: 0 0 22px 4px rgba(198,255,74,.9); } }
      @container scr (max-height: 820px) {
        .v03 .col { top: 78px; bottom: 20px; max-height: calc(100% - 98px); gap: 18px; }
        .v03 h1 { font-size: 38px; }
        .v03[data-mode="signup"] .lead { display: none; }
        .v03 .f-inp { min-height: 44px; }
        .v03 .f-fields { gap: 10px; }
      }
      @container scr (max-width: 760px) {
        .v03 .scrim { background: linear-gradient(0deg, rgba(8,11,9,.96) 0%, rgba(8,11,9,.86) 58%, rgba(8,11,9,0) 80%); }
        .v03 .bar { padding: 16px; }
        .v03 .bar .wm { font-size: 20px; }
        .v03 .swap-top { display: none; }
        .v03 .col { left: 12px; right: 12px; width: auto; top: auto; bottom: 12px; margin: 0; max-height: calc(100% - 84px); gap: 18px; padding: 18px 16px;
          background: rgba(8,11,9,.8); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
        .v03 h1 { font-size: 34px; }
        .v03 .lead { font-size: 14px; }
        .v03 .legend { display: none; }
      }`,
    html: (F) => `<div class="gl"></div><div class="scrim"></div>
      <header class="bar">${F.word()}
        <p class="swap-top li">처음 왔나요? <button type="button" data-tab="signup">학급 코드로 가입</button></p>
        <p class="swap-top su">계정이 있나요? <button type="button" data-tab="login">로그인</button></p>
      </header>
      <div class="col">
        <p class="eyebrow"><span class="li">① 로그인</span><span class="su">① 회원가입 · 학생</span></p>
        <h1><span class="li">어제 돌린 계산이 기다려요</span><span class="su">학급 코드로 우리 반 연구소에 들어와요</span></h1>
        <p class="lead">${F.COPY.lead}</p>
        ${F.form({ tabs: false, after: `<p class="swap li">처음 왔나요? <button type="button" data-tab="signup">학급 코드로 가입하기</button></p><p class="swap su">이미 계정이 있나요? <button type="button" data-tab="login">로그인</button></p>` })}
      </div>
      <div class="legend" aria-hidden="true"><span>예측 구조 · <b>잔기 91</b> · 평균 pLDDT <b>92.4</b></span>
        <ul><li><i style="background:#0053d6"></i>&gt; 90 매우 높음</li><li><i style="background:#65cbf3"></i>70–90 높음</li><li><i style="background:#ffdb13"></i>50–70 낮음</li><li><i style="background:#ff7d45"></i>&lt; 50 매우 낮음</li></ul></div>`,
    mount(root, ctx) {
      ctx.ribbon(root.querySelector(".gl"), { bg: 0x080b09, tint: 0xffffff, edge: 0xeef6e8, base: 0.03, edgeA: 0.95, iri: 0.95, spec: 1.15, shadow: 0,
        ox: -0.17, oy: -0.05, zoom: 0.88, narrowOy: 0.27, narrowZoom: 0.66, seed: 102 });
    },
  });

  /* 04 — 글자 하나하나가 두께가 다른 박막. 폼은 오른쪽 위에 단단한 판으로 */
  const D04 = [280, 340, 400, 460, 520, 580];
  const letter04 = (d) => {
    const c = (x) => css(mixRGB(filmRGB(x, 1.46), PAPER, 0.28));
    return `linear-gradient(172deg, ${c(d - 50)} 0%, ${c(d - 20)} 22%, ${c(d)} 44%, ${c(d + 30)} 66%, ${c(d + 60)} 88%, ${c(d - 50)} 100%)`;
  };
  add({
    no: 4, fam: "a", title: "박막 글자", en: "Thin-Film Type", swatch: "#e9e4f2",
    caption: "화면 아래를 가로지르는 CRISTA 여섯 글자가 각각 두께 280~580 nm 인 박막입니다. 두께마다 다른 간섭색이 천천히 흘러내리고, 폼은 오른쪽 위 단단한 판에 둡니다.",
    css: `
      .v04 { background: #f1f1e9; }
      .v04 .giant { position: absolute; z-index: 0; left: 50%; bottom: -3.2cqw; transform: translateX(-50%); margin: 0; display: flex; font-weight: 700; font-size: 26.5cqw; line-height: .8;
        letter-spacing: -.065em; white-space: nowrap; user-select: none; }
      .v04 .giant span { position: relative; display: block; padding-inline: .09em; margin-inline: -.09em; color: transparent; -webkit-background-clip: text; background-clip: text; background-size: 100% 260%; -webkit-text-stroke: 2px #080b09;
        animation: v04drain 18s linear infinite; }
      .v04 .giant span:nth-child(2) { animation-duration: 21s; } .v04 .giant span:nth-child(3) { animation-duration: 16s; }
      .v04 .giant span:nth-child(4) { animation-duration: 23s; } .v04 .giant span:nth-child(5) { animation-duration: 19s; } .v04 .giant span:nth-child(6) { animation-duration: 25s; }
      @keyframes v04drain { from { background-position: 0 0; } to { background-position: 0 260%; } }
      .v04 .giant span::before { content: attr(data-d); position: absolute; left: 24%; top: -30px; font-family: var(--mono); font-size: 11px; font-weight: 500; letter-spacing: .04em; line-height: 1;
        color: #5b6358; -webkit-text-stroke: 0; white-space: nowrap; padding-left: 10px; border-left: 1px solid #5b6358; padding-bottom: 14px; }
      .v04 .head { position: absolute; z-index: 1; left: clamp(24px, 3.6cqw, 60px); top: clamp(22px, 4.4cqh, 44px); display: grid; gap: 34px; width: min(640px, 46cqw); }
      .v04 .head .wm { font-size: 26px; }
      .v04 .head h1 { margin: 0; font-size: 42px; line-height: 1.18; letter-spacing: -.04em; font-weight: 600; text-wrap: balance; }
      .v04 .head p { margin: -18px 0 0; max-width: 46ch; color: #5b6358; font-size: 14px; line-height: 1.6; }
      .v04 .slab { position: absolute; z-index: 2; right: clamp(24px, 3.6cqw, 60px); top: clamp(22px, 4.4cqh, 44px); width: min(400px, 34cqw); max-height: calc(100% - 64px);
        overflow-y: auto; background: #fbfbf6; border: 1px solid #080b09; box-shadow: 10px 10px 0 #080b09; padding: 26px 26px 24px; display: grid; gap: 18px; }
      .v04 .slab-h { display: flex; justify-content: space-between; align-items: baseline; font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: #5b6358;
        padding-bottom: 12px; border-bottom: 1px solid rgba(8,11,9,.16); }
      .v04 .slab-h b { color: #080b09; font-weight: 500; }
      .v04 .f { gap: 16px; }
      .v04 .f-tab { border-color: #080b09; }
      .v04 .f-lab { font-size: 12px; }
      .v04 .f-inp { background: #f1f1e9; border-color: rgba(8,11,9,.28); }
      .v04 .f-inp:focus { border-color: #080b09; background: #fff; box-shadow: 3px 3px 0 #080b09; }
      .v04 .f-go { min-height: 52px; }
      .v04 .f-msg { border-width: 1px 1px 1px 4px; }
      .v04[data-msg="bad"] .giant span { -webkit-text-stroke-color: #b2361b; }
      .v04[data-msg="lock"] .giant span { animation-play-state: paused; filter: grayscale(.85); }
      @container scr (max-width: 760px) {
        .v04 .giant { bottom: auto; top: 64px; font-size: 25cqw; }
        .v04 .giant span { -webkit-text-stroke-width: 1.5px; }
        .v04 .giant span::before { display: none; }
        .v04 .head { left: 16px; right: 16px; top: 16px; width: auto; }
        .v04 .head .wm { font-size: 20px; }
        .v04 .head h1, .v04 .head p { display: none; }
        .v04 .slab { left: 16px; right: 16px; width: auto; top: auto; bottom: 22px; max-height: calc(100% - 196px); box-shadow: 6px 6px 0 #080b09; padding: 20px 18px; }
        .v04[data-mode="login"] .slab { bottom: auto; top: 196px; }
      }`,
    html: (F) => `<p class="giant" aria-hidden="true">${"CRISTA".split("").map((ch, i) => `<span data-d="d ${D04[i]} nm" style="background-image:${letter04(D04[i])}">${ch}</span>`).join("")}</p>
      <div class="head">${F.word()}
        <h1>${F.COPY.lead}</h1>
        <p>글자마다 막 두께가 달라서 색도 다릅니다. 두께 280~580 nm, 굴절률 1.46(실리카 막)에서 빛이 서로 보강되는 파장만 남아요.</p>
      </div>
      <section class="slab" aria-label="로그인">
        <div class="slab-h"><span>${F.COPY.sub}</span><b>/crista/login</b></div>
        ${F.form()}
      </section>`,
  });

  /* 05 — 비눗방울. 막 두께에 따라 간섭색이 바뀌는 방울이 떠오르고, 큰 방울 하나가 폼을 감싼다 */
  const scale05 = (() => { const st = []; for (let d = 0; d <= 900; d += 30) st.push(`${css(filmRGB(d))} ${((d / 900) * 100).toFixed(1)}%`); return `linear-gradient(90deg, ${st.join(", ")})`; })();
  add({
    no: 5, fam: "a", title: "비눗방울", en: "Soap Film", swatch: "#f3efe6",
    caption: "박막 간섭은 비눗방울의 색과 같은 원리입니다. 막 두께(약 100~900 nm)에 따라 색이 바뀌는 방울이 떠오르고, 비밀번호가 틀리면 큰 방울의 위쪽이 검은 막으로 얇아집니다.",
    css: `
      .v05 { background: #f3f2ea; }
      .v05 .cvh { position: absolute; inset: 0; z-index: 0; }
      .v05 .panel { position: absolute; z-index: 2; left: clamp(40px, 11cqw, 180px); top: 0; bottom: 0; margin-block: auto; height: fit-content; max-height: calc(100% - 48px);
        width: min(380px, 32cqw); overflow-y: auto; display: grid; gap: 20px; padding: 6px; }
      .v05 .panel .wm { font-size: 46px; }
      .v05 .panel .sub { margin: -10px 0 0; font-size: 15px; line-height: 1.55; color: #2f362e; text-wrap: balance; }
      .v05[data-mode="signup"] .panel .sub { display: none; }
      .v05 .f { gap: 14px; }
      .v05 .f-tabs { gap: 18px; }
      .v05 .f-tab { flex: none; border: 0; padding: 4px 0; background: none; color: #5b6358; font-size: 15px; border-bottom: 2px solid transparent; }
      .v05 .f-tab + .f-tab { border-left: 0; }
      .v05 .f-tab[aria-selected="true"] { background: none; color: #080b09; border-bottom-color: #080b09; }
      .v05 .f-fields { gap: 10px; }
      .v05 .f-lab { font-size: 12px; color: #3d443b; }
      .v05 .f-inp { min-height: 46px; background: rgba(255,255,255,.66); border-color: rgba(8,11,9,.16); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
      .v05 .f-inp:focus { background: #fff; border-color: #080b09; }
      .v05 .f-msg { background: rgba(255,255,255,.78); }
      .v05 .f-go { min-height: 52px; }
      .v05 .f-hint { color: #3d443b; opacity: 1; }
      .v05 .note { position: absolute; z-index: 2; right: clamp(28px, 5cqw, 84px); bottom: clamp(28px, 6cqh, 60px); width: min(440px, 32cqw); display: grid; gap: 14px; padding: 20px 22px;
        background: rgba(243,242,234,.72); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
      .v05 .note h2 { margin: 0; font-family: var(--serif); font-weight: 800; font-size: 30px; line-height: 1.3; letter-spacing: -.03em; text-wrap: balance; }
      .v05 .note p { margin: 0; font-size: 13.5px; line-height: 1.65; color: #3d443b; }
      .v05 .scale { display: grid; gap: 6px; margin-top: 22px; }
      .v05 .bar { position: relative; height: 14px; border: 1px solid rgba(8,11,9,.4); background: ${scale05}; }
      .v05 .bar i { position: absolute; top: -6px; bottom: -6px; left: 44.4%; width: 2px; background: #080b09; }
      .v05 .bar i::after { content: "이 방울 ≈ 400 nm"; position: absolute; left: 8px; top: -18px; white-space: nowrap; font-family: var(--mono); font-size: 10.5px; color: #080b09; }
      .v05 .ticks { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 10px; color: #5b6358; font-variant-numeric: tabular-nums; }
      @container scr (max-width: 760px) {
        .v05 .panel { left: 16px; right: 16px; width: auto; top: auto; bottom: 16px; margin: 0; max-height: calc(100% - 32px); padding: 18px 16px; gap: 16px;
          background: rgba(243,242,234,.72); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
        .v05 .panel .wm { font-size: 34px; }
        .v05 .note { display: none; }
      }`,
    html: (F) => `<div class="cvh"></div>
      <section class="panel" aria-label="로그인">${F.word()}<p class="sub">${F.COPY.lead}</p>${F.form()}</section>
      <aside class="note" aria-hidden="true">
        <h2>방울의 색은 물감이 아니라 두께에서 나와요</h2>
        <p>비누막 위아래에서 반사된 빛이 만나 어떤 파장은 보강되고 어떤 파장은 사라집니다. 막이 흘러내려 위쪽이 얇아지면 색이 바뀌고, 10 nm 아래로 얇아지면 검게 보이다 터집니다.</p>
        <div class="scale"><div class="bar"><i></i></div><div class="ticks"><span>0</span><span>300</span><span>600</span><span>900 nm</span></div></div>
      </aside>`,
    mount(root, ctx) {
      const cv = ctx.canvas(root.querySelector(".cvh"));
      const panel = root.querySelector(".panel");
      const rnd = seeded(5);
      const B = Array.from({ length: 15 }, () => ({ x: 0.36 + rnd() * 0.62, r: 12 + Math.pow(rnd(), 1.6) * 62, v: 10 + rnd() * 16, o: rnd() * 2000, f: 0.25 + rnd() * 0.4, p: rnd() * 6.28, a: 10 + rnd() * 26, d: 180 + rnd() * 220 }));
      const big = { top: 220, bot: 820 };
      const BG = "243,242,234";
      const bubble = (g, x, y, r, dTop, dBot, rim, big) => {
        const lg = g.createLinearGradient(0, y - r, 0, y + r);
        for (let i = 0; i <= 8; i++) { const u = i / 8, c = filmRGB(dTop + (dBot - dTop) * Math.pow(u, 0.75)); lg.addColorStop(u, css(big ? mixRGB(c, [243, 242, 234], 0.3) : c)); }
        g.save();
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
        g.globalAlpha = big ? 0.42 : 0.55; g.fillStyle = lg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
        g.globalAlpha = 1;
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        if (big) { rg.addColorStop(0, `rgba(${BG},.96)`); rg.addColorStop(0.83, `rgba(${BG},.9)`); rg.addColorStop(0.985, `rgba(${BG},0)`); }
        else { rg.addColorStop(0, `rgba(${BG},.93)`); rg.addColorStop(0.7, `rgba(${BG},.8)`); rg.addColorStop(0.96, `rgba(${BG},0)`); }
        g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
        g.restore();
        g.globalAlpha = 0.9; g.lineWidth = rim; g.strokeStyle = lg;
        g.beginPath(); g.arc(x, y, r - rim / 2, 0, Math.PI * 2); g.stroke();
        g.globalAlpha = 0.85; g.fillStyle = "#ffffff";
        g.beginPath(); g.ellipse(x - r * 0.42, y - r * 0.47, r * 0.17, r * 0.075, -0.65, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 0.5;
        g.beginPath(); g.ellipse(x + r * 0.5, y + r * 0.42, r * 0.07, r * 0.035, -0.65, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      };
      ctx.loop((t, dt) => {
        const { g, w, h } = cv;
        if (!w) return;
        g.clearRect(0, 0, w, h);
        const msg = root.dataset.msg;
        const k = 1 - Math.pow(0.08, dt || 0.016);
        const tTop = msg === "bad" ? 18 : msg === "lock" ? 6 : 210 + Math.sin(t * 0.35) * 70;
        const tBot = msg === "lock" ? 300 : 760 + Math.sin(t * 0.21 + 1) * 110;
        big.top += (tTop - big.top) * (dt ? k : 1); big.bot += (tBot - big.bot) * (dt ? k : 1);
        const speed = msg === "ok" ? 3.2 : msg === "lock" ? 0.15 : 1;
        for (const b of B) {
          b.o += (dt || 0) * b.v * (speed - 1);
          const span = h + 2 * b.r;
          const y = h + b.r - ((t * b.v + b.o) % span);
          const x = b.x * w + Math.sin(t * b.f + b.p) * b.a;
          bubble(g, x, y, b.r, b.d + Math.sin(t * 0.5 + b.p) * 60, b.d + 520, Math.max(1, b.r * 0.03));
        }
        const pw = panel.offsetWidth, ph = panel.offsetHeight;
        const cx = panel.offsetLeft + pw / 2, cy = panel.offsetTop + ph / 2;
        const R = Math.min(Math.max(pw, ph) * 0.66, Math.min(w, h) * 0.62);
        bubble(g, cx + Math.sin(t * 0.3) * 6, cy + Math.cos(t * 0.26) * 5, R, big.top, big.bot, 2.2, true);
      });
    },
  });

  /* 06 — 흰 빛이 프리즘을 지나 400~700 nm 로 갈라져 폼(스크린)에 닿는다 */
  const SPEC06 = (dir) => { const st = ["#1a1f1b 0%", "#1a1f1b 14%"]; for (let l = 700; l >= 400; l -= 20) st.push(`${css(waveRGB(l))} ${(16 + ((700 - l) / 300) * 68).toFixed(1)}%`); st.push("#1a1f1b 86%", "#1a1f1b 100%"); return `linear-gradient(${dir}, ${st.join(", ")})`; };
  add({
    no: 6, fam: "a", title: "프리즘 분광", en: "Prism Spectrum", swatch: "#0d110e",
    caption: "흰 빛줄기가 유리 프리즘(BK7, n ≈ 1.52)을 지나 400~700 nm 로 갈라지고, 그 빛이 닿는 스크린이 곧 로그인 칸입니다. 비밀번호가 틀리면 빨간 빛만, 잠기면 광원이 꺼집니다.",
    css: `
      .v06 { background: #0b0e0c; color: #f1f1e9; }
      .v06 .cvh { position: absolute; inset: 0; z-index: 0; }
      .v06 .hd { position: absolute; z-index: 2; left: clamp(20px, 3.4cqw, 56px); top: clamp(20px, 4cqh, 40px); display: flex; align-items: center; gap: 14px; }
      .v06 .hd .mk { width: 24px; height: 24px; }
      .v06 .hd small { font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: #9da59a; padding-left: 14px; border-left: 1px solid rgba(241,241,233,.22); }
      .v06 .cap { position: absolute; z-index: 2; left: clamp(20px, 3.4cqw, 56px); bottom: clamp(20px, 4cqh, 40px); margin: 0; display: grid; gap: 4px; font-family: var(--mono); font-size: 11px; color: #9da59a; letter-spacing: .02em; }
      .v06 .cap b { color: #f1f1e9; font-weight: 500; }
      .v06 .screen { position: absolute; z-index: 2; left: 60cqw; top: 0; bottom: 0; margin-block: auto; height: fit-content; max-height: calc(100% - 48px);
        width: min(420px, 34cqw); overflow-y: auto; background: #f1f1e9; color: #080b09; padding: 30px 30px 26px 36px; display: grid; gap: 18px;
        box-shadow: 0 0 0 1px rgba(241,241,233,.2), 0 40px 120px -30px rgba(198,255,74,.12); }
      .v06 .screen::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: ${SPEC06("180deg")}; }
      .v06[data-msg="bad"] .screen::before { background: linear-gradient(180deg, transparent 18%, rgb(255,40,0) 22% 30%, transparent 34%); }
      .v06[data-msg="lock"] .screen::before { background: #2a2f2a; }
      .v06 .screen .wm { font-size: 34px; }
      .v06 .lead { margin: -8px 0 0; color: #3d443b; font-size: 14px; line-height: 1.55; text-wrap: balance; }
      .v06[data-mode="signup"] .lead { display: none; }
      .v06 .f { gap: 14px; }
      .v06 .f-fields { gap: 11px; }
      .v06 .f-tab { border-color: rgba(8,11,9,.3); }
      .v06 .f-lab { font-family: var(--mono); font-size: 10.5px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: #5b6358; }
      .v06 .f-inp { background: #fbfbf6; }
      .v06 .f-go { min-height: 52px; }
      @container scr (max-width: 760px) {
        .v06 .hd { left: 16px; top: 16px; }
        .v06 .hd, .v06 .cap { display: none; }
        .v06 .screen { left: 14px; right: 14px; width: auto; top: auto; bottom: 14px; margin: 0; max-height: calc(100% - 270px); padding: 26px 18px 20px; }
        .v06 .screen::before { left: 0; right: 0; top: 0; bottom: auto; width: auto; height: 6px; background: ${SPEC06("90deg")}; }
        .v06[data-msg="bad"] .screen::before { background: linear-gradient(90deg, transparent 18%, rgb(255,40,0) 22% 30%, transparent 34%); }
        .v06 .screen .wm { font-size: 28px; }
      }`,
    html: (F) => `<div class="cvh"></div>
      <div class="hd">${F.mark()}<small>${F.COPY.sub} · 분광 실험대</small></div>
      <p class="cap"><span>백색광 → 프리즘 <b>BK7 · n ≈ 1.52</b> → 가시광선 <b>400–700 nm</b></span><span>파장이 짧을수록 더 많이 꺾여요</span></p>
      <section class="screen" aria-label="로그인">${F.word()}<p class="lead">${F.COPY.lead}</p>${F.form()}</section>`,
    mount(root, ctx) {
      const cv = ctx.canvas(root.querySelector(".cvh"));
      const scr = root.querySelector(".screen");
      const STEP = 6, WL = [];
      for (let l = 400; l <= 700; l += STEP) WL.push([l, waveRGB(l)]);
      let lum = 1;
      ctx.loop((t, dt) => {
        const { g, w, h } = cv;
        if (!w) return;
        g.clearRect(0, 0, w, h);
        const msg = root.dataset.msg;
        const target = msg === "lock" ? 0 : 1;
        lum += (target - lum) * (dt ? 1 - Math.pow(0.02, dt) : 1);
        const S = { x: scr.offsetLeft, y: scr.offsetTop, w: scr.offsetWidth, h: scr.offsetHeight };
        const narrow = w < 760;
        let cx, cy, s;
        if (!narrow) { cx = S.x * 0.44; cy = h * 0.5; s = Math.min(h * 0.36, S.x * 0.34); }
        else { cx = w * 0.5; cy = S.y * 0.5; s = Math.min(S.y * 0.5, w * 0.4); }
        const A = [cx, cy - s * 0.577], B = [cx - s / 2, cy + s * 0.289], C = [cx + s / 2, cy + s * 0.289];
        const on = (P, Q, u) => [P[0] + (Q[0] - P[0]) * u, P[1] + (Q[1] - P[1]) * u];
        const inP = on(A, B, 0.56), outP = on(A, C, 0.5);
        const src = narrow ? [0, inP[1] - s * 0.55] : [0, inP[1] - s * 0.22];
        const target06 = (l) => {
          const u = (700 - l) / 300;
          return narrow ? [S.x + S.w * (0.16 + 0.68 * u), S.y] : [S.x, S.y + S.h * (0.16 + 0.68 * u)];
        };
        const flick = 0.92 + Math.sin(t * 2.1) * 0.04 + Math.sin(t * 7.3) * 0.02;
        g.save();
        g.globalCompositeOperation = "lighter";
        /* 들어오는 흰 빛 */
        if (lum > 0.02) {
          for (const [wid, al] of [[16, 0.05], [7, 0.12], [2.2, 0.85]]) {
            g.strokeStyle = `rgba(255,255,250,${al * lum * flick})`; g.lineWidth = wid; g.lineCap = "round";
            g.beginPath(); g.moveTo(src[0], src[1]); g.lineTo(inP[0], inP[1]); g.stroke();
          }
          g.strokeStyle = `rgba(255,255,250,${0.35 * lum})`; g.lineWidth = 3;
          g.beginPath(); g.moveTo(inP[0], inP[1]); g.lineTo(outP[0], outP[1]); g.stroke();
          /* 갈라진 빛 */
          for (let i = 0; i < WL.length - 1; i++) {
            const [l, c] = WL[i];
            let a = 0.5 * lum * (0.9 + Math.sin(t * 1.3 + l * 0.04) * 0.1);
            if (msg === "bad") a *= l > 620 && l < 680 ? 1.6 : 0.05;
            if (msg === "ok") a *= 1.35;
            const p1 = target06(l), p2 = target06(l + STEP);
            g.fillStyle = css(c, Math.min(1, a));
            g.beginPath(); g.moveTo(outP[0], outP[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.closePath(); g.fill();
          }
        }
        g.restore();
        /* 프리즘 */
        g.save();
        g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineTo(C[0], C[1]); g.closePath();
        const pg = g.createLinearGradient(B[0], A[1], C[0], B[1]);
        pg.addColorStop(0, "rgba(241,241,233,.10)"); pg.addColorStop(1, "rgba(241,241,233,.03)");
        g.fillStyle = pg; g.fill();
        g.strokeStyle = `rgba(241,241,233,${0.35 + 0.35 * lum})`; g.lineWidth = 1.4; g.stroke();
        g.restore();
        /* 파장 눈금 */
        g.fillStyle = "rgba(241,241,233,.62)"; g.strokeStyle = "rgba(241,241,233,.4)"; g.lineWidth = 1;
        g.font = "500 10.5px 'IBM Plex Mono', monospace";
        g.textAlign = narrow ? "center" : "right"; g.textBaseline = narrow ? "bottom" : "middle";
        for (let l = 400; l <= 700; l += 50) {
          const p = target06(l + STEP / 2);
          g.beginPath();
          if (narrow) { g.moveTo(p[0], p[1] - 4); g.lineTo(p[0], p[1] - 10); g.stroke(); if ((l - 400) % 100 === 0) g.fillText(String(l), p[0], p[1] - 13); }
          else { g.moveTo(p[0] - 4, p[1]); g.lineTo(p[0] - 10, p[1]); g.stroke(); g.fillText(`${l} nm`, p[0] - 14, p[1]); }
        }
        g.textAlign = "left"; g.textBaseline = "alphabetic";
        g.fillStyle = "rgba(241,241,233,.55)";
        const lab = msg === "lock" ? "광원 꺼짐 · 1분 뒤 다시 켜져요" : msg === "bad" ? "필터 650 nm · 빨간 빛만 지나갑니다" : "백색광";
        if (narrow) { g.textAlign = "left"; g.fillText(lab, 16, B[1] + 22); } else g.fillText(lab, Math.max(16, src[0] + 24), src[1] - 14);
      });
    },
  });
})();
