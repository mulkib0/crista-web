/* 로그인 시안 — B 갈래 '실험실 기록'(07~12). 연구 노트 · 시약 라벨 · 웰 플레이트 · 배치 기록서 · 에어락 · 전기영동 젤의 형식을 로그인 칸으로. 규칙은 core.js 머리말. */
(() => {
  const { add, F } = window.LOGIN;

  /* 입력값 읽기 · 입력 · 탭 · 상태가 바뀔 때마다 다시 그리기 */
  const val = (root, k) => { const i = root.querySelector(".f-inp-" + k); return i ? i.value : ""; };
  const fieldsOf = (root) => (root.dataset.mode === "signup" ? ["code", "id", "name", "pw", "pw2"] : ["id", "pw"]);
  function watch(root, ctx, fn) {
    fn();
    ctx.onField(() => fn());
    const mo = new MutationObserver(() => fn());
    mo.observe(root, { attributes: true, attributeFilter: ["data-mode", "data-msg", "data-busy"] });
    ctx.cleanup(() => mo.disconnect());
  }

  /* ─────────────────────────────────────────────────────────────
     07 — 연구 노트: 펼친 실험 노트 두 쪽. 왼쪽은 인쇄된 머리 · 손글씨 기록, 오른쪽은 기입란, 들어가기는 확인 도장 */
  add({
    no: 7, fam: "b", title: "연구 노트", en: "Lab Notebook", swatch: "#fbfaf4",
    caption: "펼친 실험 노트 두 쪽에 파란 볼펜으로 쓰듯 입력합니다. 쓰는 칸은 형광펜이 칠해지고, 들어가기는 빨간 확인 도장입니다.",
    css: `
      .v07 { background: #c9cdbf; color: #1b2a5c; }
      .v07 .desk { position: absolute; inset: 0; background: radial-gradient(120% 90% at 28% 18%, #dfe2d6 0%, #c6cabc 72%); }
      .v07 .book { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(-0.5deg); width: min(1240px, calc(100% - 112px)); height: calc(100% - 72px);
        display: grid; grid-template-columns: 1fr 1fr; box-shadow: 0 34px 60px -24px rgba(30,40,20,.45), 0 0 0 1px rgba(30,40,20,.08); }
      .v07 .pg { position: relative; min-width: 0; padding: 30px 40px 28px; overflow: hidden; background-color: #fbfaf4;
        background-image: linear-gradient(rgba(70,110,190,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(70,110,190,.14) 1px, transparent 1px);
        background-size: 19px 19px; background-position: 0 6px; }
      .v07 .pg-l { box-shadow: inset -30px 0 32px -26px rgba(0,0,0,.26); display: grid; grid-template-rows: auto auto auto auto 1fr; gap: 18px; align-content: start; }
      .v07 .pg-r { box-shadow: inset 30px 0 32px -26px rgba(0,0,0,.2); overflow-y: auto; display: grid; align-content: start; gap: 18px; }
      .v07 .pg-r::before { content: ""; position: absolute; left: 88px; top: 0; bottom: 0; width: 1.5px; background: rgba(214,92,74,.55); }
      .v07 .nb-head { display: flex; justify-content: space-between; gap: 12px; font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #5b6358; border-bottom: 1.5px solid #1b2a5c; padding-bottom: 8px; background: #fbfaf4; }
      .v07 .nb-head b { font-weight: 600; color: #1b2a5c; }
      .v07 .hw { font-family: var(--hand); color: #2140a8; font-size: 27px; line-height: 1.05; }
      .v07 .nb-meta { margin: 0; display: grid; gap: 6px; }
      .v07 .nb-meta div { display: grid; grid-template-columns: 76px 1fr; align-items: end; border-bottom: 1px dashed rgba(27,42,92,.35); padding-bottom: 2px; }
      .v07 .nb-meta dt { font-family: var(--mono); font-size: 10.5px; letter-spacing: .08em; color: #5b6358; padding-bottom: 5px; }
      .v07 .nb-meta dd { margin: 0; }
      .v07 .nb-brand { display: grid; gap: 8px; margin-top: 6px; color: #080b09; }
      .v07 .nb-brand .wm { font-size: 70px; }
      .v07 .nb-sub { margin: 0; font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #5b6358; }
      .v07 .nb-lead { margin: 0; font-size: 19px; font-weight: 600; line-height: 1.42; letter-spacing: -.02em; color: #080b09; max-width: 21em; text-wrap: balance; }
      .v07 .nb-proc { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; align-self: end; position: relative; }
      .v07 .nb-proc li { font-family: var(--hand); font-size: 26px; color: #2140a8; line-height: 1.15; }
      .v07 .nb-proc li b { font-weight: 400; background: linear-gradient(transparent 55%, rgba(198,255,74,.7) 55% 90%, transparent 90%); }
      .v07 .nb-tape { position: absolute; right: 46px; top: 46%; width: 214px; padding: 16px 16px 14px; background: #fff8b8; transform: rotate(3deg); box-shadow: 0 6px 14px -6px rgba(40,40,20,.35); font-family: var(--hand); color: #2a2a2a; display: grid; gap: 2px; }
      .v07 .nb-tape::before { content: ""; position: absolute; left: 50%; top: -11px; width: 86px; height: 22px; transform: translateX(-50%) rotate(-4deg); background: rgba(230,232,220,.78); box-shadow: 0 0 0 1px rgba(0,0,0,.04); }
      .v07 .nb-tape small { font-size: 19px; color: #5b6358; line-height: 1; }
      .v07 .nb-tape b { font-family: var(--mono); font-weight: 600; font-size: 22px; letter-spacing: .14em; color: #080b09; }
      .v07 .nb-tape span { font-size: 19px; line-height: 1.05; }
      .v07 .nb-sketch { position: absolute; right: 34px; bottom: 30px; width: 150px; color: #2140a8; text-align: center; }
      .v07 .nb-sketch svg { width: 120px; height: 110px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .v07 .nb-sketch span { display: block; font-family: var(--hand); font-size: 21px; transform: rotate(-4deg); }
      .v07 .nb-tabs { position: absolute; left: 100%; top: 72px; display: grid; gap: 8px; }
      .v07 .nb-tab { appearance: none; border: 1px solid rgba(8,11,9,.25); border-left: 0; width: 42px; padding: 16px 0; writing-mode: vertical-rl; font: inherit; font-size: 13px; font-weight: 600; letter-spacing: .06em; color: #080b09; cursor: pointer; transform: translateX(-10px); transition: transform .2s ease; box-shadow: 3px 3px 0 rgba(30,40,20,.12); }
      .v07 .nb-tab[data-tab="login"] { background: #c6ff4a; }
      .v07 .nb-tab[data-tab="signup"] { background: #ffd3ea; }
      .v07 .nb-tab[aria-selected="true"] { transform: none; }
      .v07 .nb-mini { display: none; }
      .v07 .nb-h { margin: 0; display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-left: 60px; font-size: 13px; font-weight: 600; color: #1b2a5c; }
      .v07 .nb-h small { font-family: var(--mono); font-size: 10.5px; font-weight: 400; letter-spacing: .08em; color: #5b6358; }
      .v07 .nb-note { margin: -6px 0 0; padding-left: 60px; transform: rotate(-1.5deg); transform-origin: left; }
      .v07 .f { gap: 16px; padding-left: 60px; }
      .v07 .f-fields { gap: 4px; }
      .v07 .f-fld { grid-template-columns: 112px minmax(0, 1fr); align-items: end; gap: 10px; min-height: 57px; }
      .v07 .f-lab { font-family: var(--mono); font-size: 11px; font-weight: 500; letter-spacing: .06em; color: #5b6358; padding-bottom: 9px; }
      .v07 .f-inp { min-height: 46px; padding: 6px 4px 2px; border: 0; border-bottom: 1.5px solid #1b2a5c; font-family: var(--hand); font-size: 31px; line-height: 1; color: #2140a8; background: transparent; }
      .v07 .f-inp[type="password"] { font-family: var(--sans); font-size: 20px; letter-spacing: 4px; }
      .v07 .f-inp:focus { background: linear-gradient(transparent 30%, rgba(198,255,74,.55) 30% 92%, transparent 92%); border-bottom-color: #2140a8; }
      .v07 .f-inp::placeholder { font-family: var(--sans); font-size: 13px; letter-spacing: 0; color: #5b6358; opacity: .55; }
      .v07 .f-go { justify-self: start; margin: 8px 0 0 118px; min-height: 0; padding: 12px 26px 11px; background: transparent; color: #c2351d; border: 3px solid #c2351d; border-radius: 7px; box-shadow: 0 0 0 2px #fbfaf4, 0 0 0 3.5px #c2351d;
        font-family: var(--serif); font-weight: 800; font-size: 19px; letter-spacing: .14em; transform: rotate(-4deg); transition: transform .15s ease, background-color .15s ease; }
      .v07 .f-go:hover { background: rgba(194,53,29,.07); transform: rotate(-2deg); }
      .v07 .f-go:active { transform: rotate(-4deg) scale(.96); }
      .v07 .f-go:disabled { opacity: .35; }
      .v07 .f-msg { position: relative; padding: 0 0 0 34px; border: 0; background: none; color: #c2351d; font-family: var(--hand); font-size: 27px; line-height: 1.05; gap: 0; }
      .v07 .f-msg::before { content: "✗"; position: absolute; left: 4px; top: -2px; font-size: 28px; }
      .v07 .f-msg-t { font-weight: 400; }
      .v07 .f-msg-d { font-size: 23px; color: #5b6358; }
      .v07 .f-msg[data-kind="lock"] { color: #8a5a00; }
      .v07 .f-msg[data-kind="lock"]::before { content: "!"; left: 10px; }
      .v07 .f-msg[data-kind="ok"] { color: #2f6f2a; }
      .v07 .f-msg[data-kind="ok"]::before { content: "✓"; }
      .v07 .f-hint { font-family: var(--hand); font-size: 23px; line-height: 1.1; color: #2140a8; opacity: .85; }
      .v07 .f-hint::before { content: "※ "; }
      @container scr (max-width: 760px) {
        .v07 .book { left: 10px; right: 10px; top: 10px; bottom: 10px; width: auto; height: auto; transform: none; grid-template-columns: 1fr; }
        .v07 .pg-l { display: none; }
        .v07 .pg-r { padding: 62px 16px 22px; box-shadow: none; gap: 14px; }
        .v07 .pg-r::before { left: 12px; }
        .v07 .nb-tabs { left: 14px; right: 14px; top: 0; display: flex; gap: 6px; }
        .v07 .nb-tab { writing-mode: horizontal-tb; width: auto; flex: 1; padding: 10px 6px; border: 1px solid rgba(8,11,9,.25); border-top: 0; transform: translateY(-8px); }
        .v07 .nb-tab[aria-selected="true"] { transform: none; }
        .v07 .nb-mini { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; color: #080b09; padding-left: 12px; }
        .v07 .nb-mini .wm { font-size: 34px; }
        .v07 .nb-mini .nb-no { font-family: var(--mono); font-size: 10px; letter-spacing: .08em; color: #5b6358; }
        .v07 .nb-h, .v07 .nb-note, .v07 .f { padding-left: 12px; }
        .v07 .f-fld { grid-template-columns: 1fr; gap: 0; min-height: 0; }
        .v07 .f-lab { padding-bottom: 0; }
        .v07 .f-go { margin-left: 4px; }
      }`,
    html: (F) => `<div class="desk"></div>
      <div class="book">
        <section class="pg pg-l" aria-hidden="true">
          <header class="nb-head"><span>실험 노트 · Lab Notebook</span><span>No. <b>07</b> · 쪽 <b>001</b></span></header>
          <dl class="nb-meta">
            <div><dt>프로젝트</dt><dd class="hw">신약 후보 발굴 — 우리 모둠 스타트업</dd></div>
            <div><dt>날짜</dt><dd class="hw">2026. 10. 24. (토)</dd></div>
            <div><dt>목적</dt><dd class="hw">파이프라인 랩 들어가기</dd></div>
          </dl>
          <div class="nb-brand">${F.word()}<p class="nb-sub">${F.COPY.sub}</p></div>
          <p class="nb-lead">${F.COPY.lead}</p>
          <ol class="nb-proc">
            <li>1) 아이디 · 비밀번호 쓰기</li>
            <li>2) <b>확인 도장</b> 꾹</li>
            <li>3) 사옥 지구로 걸어가기 →</li>
          </ol>
          <div class="nb-tape"><small>3반 칠판에 적힌 것 (예)</small><b>K7M3QX</b><span>학급 코드 = 처음 가입할 때 한 번만!</span></div>
          <div class="nb-sketch">
            <svg viewBox="0 0 120 110"><path d="M60 8 L104 31 L103 80 L61 103 L16 79 L17 30 Z"/><path d="M60 24 L89 40"/><path d="M90 72 L61 88"/><path d="M31 70 L31 39"/><path d="M104 31 L117 22"/></svg>
            <span>오늘의 고리 연습</span>
          </div>
        </section>
        <section class="pg pg-r">
          <div class="nb-mini">${F.word()}<span class="nb-no">실험 노트 No. 07</span></div>
          <h2 class="nb-h">기입란 · 실험자 확인 <small>2026.10.24</small></h2>
          <p class="nb-note hw li">처음 왔다면 → 회원가입 탭!</p>
          <p class="nb-note hw su">학급 코드 = 선생님이 알려 준 6자 (0 · O · 1 · I · L 없음)</p>
          ${F.form({ tabs: false, labels: { id: "실험자 아이디", name: "실험자 이름" }, go: { login: "확인 · 들어가기", signup: "등록 · 가입하고 들어가기" } })}
        </section>
        <div class="nb-tabs" role="tablist" aria-label="로그인 또는 회원가입">
          <button type="button" class="nb-tab" role="tab" data-tab="login" aria-selected="true">로그인</button>
          <button type="button" class="nb-tab" role="tab" data-tab="signup" aria-selected="false">회원가입(학생)</button>
        </div>
      </div>`,
  });

  /* ─────────────────────────────────────────────────────────────
     08 — 시약 라벨: 갈색 병 위 큰 라벨이 곧 폼. 아이디가 바코드가 되고, 가입하면 학급 코드가 Lot No. 가 된다 */
  function barcode(text) {
    const s = (text || "").toUpperCase() || "CRISTA";
    let x = 0;
    const bars = [];
    const put = (w, on) => { if (on) bars.push(`<rect x="${x}" y="0" width="${w}" height="40"/>`); x += w; };
    [2, 1, 1, 2, 3, 1].forEach((w, i) => put(w, i % 2 === 0));
    for (const ch of s.slice(0, 20)) {
      let h = Math.imul(ch.charCodeAt(0) + 7, 2654435761) >>> 0;
      for (let j = 0; j < 6; j++) { put(1 + ((h & 7) % 3), j % 2 === 0); h >>>= 3; }
    }
    [2, 3, 3, 1, 1, 1, 2].forEach((w, i) => put(w, i % 2 === 0));
    return `<svg class="bc" viewBox="0 0 ${x} 40" preserveAspectRatio="none" aria-hidden="true">${bars.join("")}</svg>`;
  }
  add({
    no: 8, fam: "b", title: "시약 라벨", en: "Reagent Label", swatch: "#7a3f12",
    caption: "갈색 시약병의 라벨이 곧 로그인 칸입니다. 순도 · 보관 온도 · 주의 표시 사이에 입력하고, 아이디를 치면 아래 바코드가 바뀝니다.",
    css: `
      .v08 { background: #120d09; color: #f1f1e9; }
      .v08 .shelf { position: absolute; inset: 0; background: radial-gradient(70% 90% at 72% 40%, rgba(233,161,75,.16), transparent 70%), linear-gradient(180deg, #19120c, #0d0906); }
      .v08 .wrap { position: absolute; inset: 0; display: grid; grid-template-rows: minmax(0, 1fr); grid-template-columns: minmax(0, 1fr) min(600px, 46cqw); gap: 64px; padding: 0 84px 0 80px; }
      .v08 .info { align-self: center; display: grid; gap: 20px; max-width: 520px; }
      .v08 .info .wm { font-size: 66px; color: #f1f1e9; }
      .v08 .sub { margin: -8px 0 0; font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #e9a14b; }
      .v08 .lead { margin: 0; font-size: 22px; font-weight: 600; line-height: 1.4; letter-spacing: -.02em; text-wrap: balance; }
      .v08 .care { margin: 8px 0 0; display: grid; border-top: 1px solid rgba(241,241,233,.18); }
      .v08 .care div { display: grid; grid-template-columns: 64px 1fr; gap: 14px; padding: 12px 0; border-bottom: 1px solid rgba(241,241,233,.18); }
      .v08 .care dt { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; color: #e9a14b; padding-top: 2px; }
      .v08 .care dd { margin: 0; font-size: 14px; color: rgba(241,241,233,.78); }
      .v08 .bt { position: relative; display: grid; grid-template-rows: 62px 30px minmax(0, 1fr); justify-items: center; padding-top: 26px; margin-bottom: -70px; min-height: 0; }
      .v08 .bt-cap { width: 44%; background: repeating-linear-gradient(90deg, #0c0c0c 0 6px, #232323 6px 9px); border-radius: 6px 6px 2px 2px; box-shadow: inset 0 -5px 0 rgba(255,255,255,.06), 0 6px 10px rgba(0,0,0,.5); }
      .v08 .bt-neck { width: 36%; background: linear-gradient(90deg, #3a1c06, #8a4a16 32%, #5a2c0b 70%, #2a1404); }
      .v08 .bt-body { position: relative; width: 100%; min-height: 0; padding: 64px 34px 100px; border-radius: 34% 34% 24px 24px / 84px 84px 24px 24px;
        background: linear-gradient(90deg, #2c1404 0%, #6b3610 14%, #a35a1e 28%, #7c4013 48%, #5a2c0b 72%, #241002 100%); box-shadow: inset 0 0 70px rgba(0,0,0,.55), 0 30px 80px rgba(0,0,0,.6); }
      .v08 .bt-body::before { content: ""; position: absolute; left: 8%; top: 56px; bottom: 90px; width: 16px; border-radius: 10px; background: linear-gradient(rgba(255,226,180,0), rgba(255,226,180,.32), rgba(255,226,180,0)); filter: blur(2px); }
      .v08 .bt-body::after { content: ""; position: absolute; inset: 64px 34px 100px; pointer-events: none; background: linear-gradient(90deg, rgba(60,30,8,.22), transparent 10%, transparent 86%, rgba(60,30,8,.28)); }
      .v08 .lb { position: relative; height: 100%; overflow-y: auto; background: #fbfbf6; color: #080b09; display: grid; align-content: start; gap: 12px; padding: 16px 22px 18px; box-shadow: 0 0 0 1px rgba(0,0,0,.3), 0 8px 20px rgba(0,0,0,.35); }
      .v08 .lb-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: -16px -22px 0; padding: 9px 22px; background: #080b09; color: #f1f1e9; font-family: var(--mono); font-size: 11px; letter-spacing: .08em; }
      .v08 .lb-brand { display: inline-flex; align-items: center; gap: 7px; }
      .v08 .lb-brand .mk { width: 17px; height: 17px; color: #c6ff4a; }
      .v08 .lb-brand b { font-family: var(--sans); font-size: 14px; letter-spacing: -.02em; }
      .v08 .lb-name { margin: 2px 0 0; font-size: 25px; line-height: 1.2; letter-spacing: -.03em; font-weight: 700; }
      .v08 .lb-en { margin: -8px 0 0; font-family: var(--mono); font-size: 11px; color: #5b6358; }
      .v08 .lb-spec { display: flex; flex-wrap: wrap; gap: 0; border-top: 1.5px solid #080b09; border-bottom: 1px solid rgba(8,11,9,.3); }
      .v08 .lb-spec span { padding: 6px 12px 6px 0; margin-right: 12px; font-family: var(--mono); font-size: 11.5px; border-right: 1px solid rgba(8,11,9,.2); }
      .v08 .lb-spec span:last-child { border-right: 0; }
      .v08 .lb-warn { display: flex; align-items: center; gap: 14px; font-size: 13px; }
      .v08 .ghs { flex: none; width: 26px; height: 26px; margin: 4px; border: 3px solid #d2261b; transform: rotate(45deg); display: grid; place-items: center; background: #fff; }
      .v08 .ghs::after { content: "!"; transform: rotate(-45deg); font-weight: 800; font-size: 15px; line-height: 1; }
      .v08 .f { gap: 12px; }
      .v08 .f-tab { padding: 8px; font-size: 13px; border-color: rgba(8,11,9,.4); }
      .v08 .f-fields { gap: 8px; }
      .v08 .f-fld { grid-template-columns: 104px minmax(0, 1fr); align-items: center; gap: 12px; }
      .v08 .f-lab { font-family: var(--mono); font-size: 10.5px; font-weight: 500; letter-spacing: .08em; color: #5b6358; }
      .v08 .f-inp { min-height: 40px; padding: 8px 10px; background: #fff; border-color: rgba(8,11,9,.3); font-family: var(--mono); font-size: 14px; }
      .v08 .f-inp:focus { border-color: #080b09; box-shadow: inset 0 0 0 1px #080b09; }
      .v08 .f-go { min-height: 46px; justify-content: space-between; padding: 0 18px; font-size: 15px; }
      .v08 .f-go::after { content: "→"; }
      .v08 .f-go.busy::after { content: ""; }
      .v08 .f-hint { font-size: 12px; }
      .v08 .f-msg { font-size: 12.5px; padding: 8px 10px; }
      .v08[data-mode="signup"] .lb-en, .v08[data-mode="signup"] .lb-warn { display: none; }
      @container scr (max-height: 820px) {
        .v08 .bt { grid-template-rows: 46px 20px minmax(0, 1fr); padding-top: 16px; }
        .v08 .bt-body { padding-top: 46px; }
        .v08 .bt-body::after { top: 46px; }
        .v08 .lb { gap: 10px; }
      }
      .v08 .lb-foot { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; align-items: end; padding-top: 10px; border-top: 1px dashed rgba(8,11,9,.35); }
      .v08 .lb-bc { display: grid; gap: 3px; min-width: 0; }
      .v08 .bc { width: 100%; height: 40px; fill: #080b09; display: block; }
      .v08 .bc-t { font-family: var(--mono); font-size: 11px; letter-spacing: .28em; text-align: center; }
      .v08 .lb-lot { margin: 0; display: grid; grid-template-columns: auto auto; gap: 2px 10px; font-family: var(--mono); font-size: 11px; }
      .v08 .lb-lot dt { color: #5b6358; }
      .v08 .lb-lot dd { margin: 0; font-weight: 600; }
      @container scr (max-width: 760px) {
        .v08 .wrap { grid-template-columns: 1fr; padding: 0 12px; gap: 0; }
        .v08 .info { display: none; }
        .v08 .bt { grid-template-rows: 42px 20px minmax(0, 1fr); padding-top: 14px; margin-bottom: -48px; }
        .v08 .bt-body { padding: 40px 12px 64px; border-radius: 30% 30% 18px 18px / 46px 46px 18px 18px; }
        .v08 .bt-body::after { inset: 40px 12px 64px; }
        .v08 .lb { padding: 14px 14px 16px; }
        .v08 .lb-top { margin: -14px -14px 0; padding: 9px 14px; }
        .v08 .lb-name { font-size: 21px; }
        .v08 .f-fld { grid-template-columns: 1fr; gap: 4px; }
        .v08 .lb-foot { grid-template-columns: 1fr; }
      }`,
    html: (F) => `<div class="shelf"></div>
      <div class="wrap">
        <div class="info">
          ${F.word()}
          <p class="sub">${F.COPY.sub} · 시약장 B-07</p>
          <p class="lead">${F.COPY.lead}</p>
          <dl class="care">
            <div><dt>보관</dt><dd>학급 코드 6자는 선생님께 받아요. 헷갈리는 0 · O · 1 · I · L 은 쓰지 않아요.</dd></div>
            <div><dt>주의</dt><dd>비밀번호를 5번 틀리면 1분 동안 잠겨요.</dd></div>
            <div><dt>교사</dt><dd>교사 계정은 공개 가입 없이 따로 발급돼요.</dd></div>
          </dl>
        </div>
        <div class="bt">
          <div class="bt-cap"></div><div class="bt-neck"></div>
          <div class="bt-body">
            <div class="lb">
              <div class="lb-top"><span class="lb-brand">${F.mark()}<b>CRISTA</b> Reagents</span><span>Cat. No. CR-0007</span></div>
              <h2 class="lb-name">파이프라인 랩 입장 시약</h2>
              <p class="lb-en">Pipeline Lab Access Reagent · 25 mL</p>
              <div class="lb-spec"><span>순도 ≥98% (HPLC)</span><span>보관 2–8 °C</span><span>차광</span></div>
              <div class="lb-warn"><i class="ghs" aria-hidden="true"></i><span><b>주의</b> 비밀번호를 5번 틀리면 1분 동안 잠겨요.</span></div>
              ${F.form({ hint: "교사 계정은 따로 발급돼요. 학생은 학급 코드로 처음 가입해 주세요." })}
              <div class="lb-foot">
                <div class="lb-bc"><span class="bcw">${barcode(F.DEMO.id)}</span><span class="bc-t">*${F.DEMO.id.toUpperCase()}*</span></div>
                <dl class="lb-lot"><dt>Lot No.</dt><dd class="lot">WEB-2610</dd><dt>사용 기한</dt><dd>2027-02</dd></dl>
              </div>
            </div>
          </div>
        </div>
      </div>`,
    mount(root, ctx) {
      const bw = root.querySelector(".bcw"), bt = root.querySelector(".bc-t"), lot = root.querySelector(".lot");
      let last = null;
      watch(root, ctx, () => {
        const id = val(root, "id").trim().toLowerCase();
        if (id !== last) { last = id; bw.innerHTML = barcode(id); bt.textContent = id ? `*${id.toUpperCase()}*` : "*—*"; }
        const code = val(root, "code").trim().toUpperCase().replace(/[\s-]/g, "");
        lot.textContent = root.dataset.mode === "signup" && code ? code.slice(0, 6) : "WEB-2610";
      });
    },
  });

  /* ─────────────────────────────────────────────────────────────
     09 — 96웰 플레이트: 글자 하나에 웰 하나. 칸마다 색이 다르고, 들어가면 플레이트 전체가 라임으로 찬다 */
  const WELL_C = { code: "#ffb3d9", id: "#9fd0ff", name: "#c7ef86", pw: "#ffc58a", pw2: "#d0b6ff" };
  add({
    no: 9, fam: "b", title: "96웰 플레이트", en: "96-Well Plate", swatch: "#e9ebe3",
    caption: "글자를 칠 때마다 96웰 플레이트의 다음 웰이 칸의 색으로 찹니다. 오른쪽 플레이트 리더 화면에서 로그인하면 플레이트 전체가 라임으로 읽힙니다.",
    css: `
      .v09 { background: #e6e8df; color: #080b09; }
      .v09 .wrap { position: absolute; inset: 0; display: grid; grid-template-rows: minmax(0, 1fr); grid-template-columns: minmax(0, 1fr) 452px; }
      .v09 .bench { position: relative; min-width: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 18px; padding: 36px 56px 34px;
        background: radial-gradient(90% 70% at 45% 50%, #f3f4ee 0%, #e2e4da 75%); }
      .v09 .b-top { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .v09 .b-top .wm { font-size: 34px; }
      .v09 .b-tag { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #5b6358; }
      .v09 .plate-wrap { display: grid; place-items: center; min-height: 0; }
      .v09 .plate { position: relative; width: min(820px, 100%); max-height: 100%; aspect-ratio: 127.76 / 85.48; padding: 3.2% 3.6% 3.6% 2.6%;
        background: linear-gradient(160deg, #fbfbf8, #ecede6); border: 1px solid rgba(8,11,9,.18); border-radius: 14px;
        clip-path: polygon(0 0, calc(100% - 34px) 0, 100% 34px, 100% 100%, 0 100%);
        box-shadow: 0 1px 0 #fff inset, 0 24px 40px -24px rgba(40,50,30,.45); display: grid; grid-template-columns: 22px repeat(12, minmax(0, 1fr)); grid-template-rows: 20px repeat(8, minmax(0, 1fr)); gap: 1.1% 1%; }
      .v09 .pl-l { display: grid; place-items: center; font-family: var(--mono); font-size: 11px; color: #8a9087; }
      .v09 .well { aspect-ratio: 1; align-self: center; justify-self: center; width: 100%; max-height: 100%; border-radius: 50%;
        background: radial-gradient(circle at 50% 42%, #eef0e8 0 38%, #d9dcd1 68%, #c5c9bc 100%); box-shadow: inset 0 2px 3px rgba(0,0,0,.2), 0 1px 0 #fff; transition: background .25s ease, box-shadow .25s ease, transform .25s ease; }
      .v09 .well.on { background: radial-gradient(circle at 38% 34%, rgba(255,255,255,.95) 0 10%, var(--c) 46%, var(--c) 100%); box-shadow: inset 0 0 0 1.5px rgba(8,11,9,.2), inset 0 -3px 5px rgba(0,0,0,.12); }
      .v09 .well.cur { box-shadow: inset 0 0 0 1.5px rgba(8,11,9,.25), 0 0 0 3px #080b09; transform: scale(1.06); }
      .v09[data-msg="bad"] .well.on { box-shadow: inset 0 0 0 2px #b2361b; }
      .v09[data-msg="lock"] .plate { filter: grayscale(1); opacity: .6; }
      .v09[data-msg="ok"] .well { background: radial-gradient(circle at 38% 34%, rgba(255,255,255,.95) 0 10%, #c6ff4a 46%, #b4f02c 100%); box-shadow: inset 0 0 0 1.5px rgba(8,11,9,.2); transition-delay: calc(var(--i) * 7ms); }
      .v09 .b-read { margin: 0; display: flex; flex-wrap: wrap; gap: 6px 26px; font-family: var(--mono); font-size: 11.5px; color: #5b6358; align-items: center; }
      .v09 .b-read b { color: #080b09; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
      .v09 .lg { display: inline-flex; gap: 12px; flex-wrap: wrap; }
      .v09 .lg i { display: inline-flex; align-items: center; gap: 6px; font-style: normal; }
      .v09 .lg i::before { content: ""; width: 10px; height: 10px; border-radius: 50%; background: var(--c); box-shadow: inset 0 0 0 1px rgba(8,11,9,.25); }
      .v09 .reader { position: relative; min-width: 0; background: #080b09; color: #f1f1e9; padding: 34px 40px 30px; display: grid; align-content: center; gap: 22px; overflow-y: auto; }
      .v09 .rd-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-family: var(--mono); font-size: 11px; letter-spacing: .12em; color: #9da59a; padding-bottom: 12px; border-bottom: 1px solid rgba(241,241,233,.16); }
      .v09 .rd-st { display: inline-flex; align-items: center; gap: 8px; color: #f1f1e9; }
      .v09 .rd-st i { width: 8px; height: 8px; border-radius: 50%; background: var(--st, #c6ff4a); box-shadow: 0 0 10px var(--st, #c6ff4a); }
      .v09 .rd-st em { font-style: normal; display: none; }
      .v09[data-msg="none"]:not([data-busy]) .rd-st .s-none, .v09[data-busy] .rd-st .s-busy, .v09[data-msg="bad"] .rd-st .s-bad, .v09[data-msg="lock"] .rd-st .s-lock, .v09[data-msg="ok"] .rd-st .s-ok { display: inline; }
      .v09[data-msg="bad"] { --st: #ff7a5c; } .v09[data-msg="lock"] { --st: #ffb21a; } .v09[data-busy] { --st: #9fd0ff; }
      .v09 .rd-meta { margin: -10px 0 0; font-family: var(--mono); font-size: 11px; color: #9da59a; }
      .v09 .rd-h { margin: 0; font-size: 21px; font-weight: 600; line-height: 1.4; letter-spacing: -.02em; text-wrap: balance; }
      .v09[data-mode="signup"] .rd-h { display: none; }
      .v09 .f { gap: 14px; }
      .v09 .f-tab { border-color: rgba(241,241,233,.3); color: #9da59a; }
      .v09 .f-tab[aria-selected="true"] { background: #f1f1e9; color: #080b09; border-color: #f1f1e9; }
      .v09 .f-fields { gap: 12px; }
      .v09 .f-lab { font-family: var(--mono); font-size: 10.5px; font-weight: 500; letter-spacing: .1em; color: #9da59a; display: flex; align-items: center; gap: 8px; }
      .v09 .f-lab::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
      .v09 .f-fld-code { --c: ${WELL_C.code}; } .v09 .f-fld-id { --c: ${WELL_C.id}; } .v09 .f-fld-name { --c: ${WELL_C.name}; } .v09 .f-fld-pw { --c: ${WELL_C.pw}; } .v09 .f-fld-pw2 { --c: ${WELL_C.pw2}; }
      .v09 .f-inp { min-height: 46px; background: #121812; border-color: rgba(241,241,233,.2); color: #f1f1e9; font-family: var(--mono); }
      .v09 .f-inp:focus { border-color: var(--c); box-shadow: inset 3px 0 0 var(--c); }
      .v09 .f-go { min-height: 52px; background: #c6ff4a; color: #080b09; justify-content: space-between; padding: 0 20px; }
      .v09 .f-go::after { content: "읽기 →"; font-family: var(--mono); font-size: 12px; font-weight: 500; }
      .v09 .f-go.busy::after { content: ""; }
      .v09 .f-msg { border-color: #ff7a5c; color: #ffb4a0; background: rgba(255,90,60,.12); }
      .v09 .f-msg[data-kind="lock"] { border-color: #ffb21a; color: #ffd27a; background: rgba(255,178,26,.1); }
      .v09 .f-msg[data-kind="ok"] { border-color: #c6ff4a; color: #c6ff4a; background: rgba(198,255,74,.08); }
      .v09 .f-peek { color: #9da59a; }
      .v09 .f-hint { color: #9da59a; opacity: 1; }
      @container scr (max-width: 760px) {
        .v09 .wrap { grid-template-columns: 1fr; grid-template-rows: auto auto; overflow-y: auto; }
        .v09 .bench { padding: 18px 14px 18px; gap: 12px; grid-template-rows: auto auto auto; }
        .v09 .b-top .wm { font-size: 28px; }
        .v09 .plate { grid-template-columns: 12px repeat(12, minmax(0, 1fr)); grid-template-rows: 12px repeat(8, minmax(0, 1fr)); padding: 3% 3% 3% 2%; clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%); border-radius: 8px; }
        .v09 .pl-l { font-size: 8px; }
        .v09 .b-read { gap: 4px 14px; font-size: 10.5px; }
        .v09 .b-read .z, .v09 .b-read .sbs { display: none; }
        .v09 .reader { padding: 22px 16px 26px; align-content: start; overflow: visible; }
        .v09 .rd-h { font-size: 17px; }
      }`,
    html: (F) => {
      const rows = "ABCDEFGH";
      let g = `<span class="pl-l"></span>`;
      for (let c = 1; c <= 12; c++) g += `<span class="pl-l">${c}</span>`;
      let i = 0;
      for (const r of rows) { g += `<span class="pl-l">${r}</span>`; for (let c = 1; c <= 12; c++) g += `<i class="well" style="--i:${i++}" title="${r}${c}"></i>`; }
      return `<div class="wrap">
        <section class="bench" aria-hidden="true">
          <header class="b-top">${F.word()}<span class="b-tag">1.2 화합물 스크리닝 · 96웰 플레이트 CR-PL-0907</span></header>
          <div class="plate-wrap"><div class="plate">${g}</div></div>
          <p class="b-read"><span>채운 웰 <b class="cnt">16</b> / 96</span><span>글자 하나 = 웰 하나</span>
            <span class="lg"><i class="su" style="--c:${WELL_C.code}">학급 코드</i><i style="--c:${WELL_C.id}">아이디</i><i class="su" style="--c:${WELL_C.name}">이름</i><i style="--c:${WELL_C.pw}">비밀번호</i><i class="su" style="--c:${WELL_C.pw2}">확인</i></span>
            <span class="z">Z′ 0.71 · 적합</span><span class="sbs">SBS 127.76 × 85.48 mm</span></p>
        </section>
        <aside class="reader">
          <div class="rd-top"><span>PLATE READER · ${F.COPY.sub}</span><span class="rd-st"><i></i><em class="s-none">대기</em><em class="s-busy">읽는 중</em><em class="s-bad">불일치</em><em class="s-lock">잠금</em><em class="s-ok">통과</em></span></div>
          <p class="rd-meta">흡광 450 nm · 25.0 °C · 웰당 0.1 s</p>
          <h2 class="rd-h">${F.COPY.lead}</h2>
          ${F.form({ peek: true })}
        </aside>
      </div>`;
    },
    mount(root, ctx) {
      const wells = [...root.querySelectorAll(".well")], cnt = root.querySelector(".cnt");
      watch(root, ctx, () => {
        const seq = [];
        for (const k of fieldsOf(root)) for (let j = 0; j < val(root, k).length; j++) seq.push(WELL_C[k]);
        const n = Math.min(96, seq.length);
        wells.forEach((w, i) => {
          w.classList.toggle("on", i < n);
          w.classList.toggle("cur", i === n - 1 && root.dataset.msg !== "ok");
          if (i < n) w.style.setProperty("--c", seq[i]);
        });
        cnt.textContent = root.dataset.msg === "ok" ? 96 : n;
      });
    },
  });

  /* ─────────────────────────────────────────────────────────────
     10 — 배치 기록서: GMP 제조 기록서 양식. 칸마다 단계 번호 · 확인 칸이 있고, 기록을 마치면 승인 도장이 찍힌다 */
  add({
    no: 10, fam: "b", title: "배치 기록서", en: "Batch Record", swatch: "#f4f4ef",
    caption: "GMP 제조 기록서 한 장을 클립보드에 끼웠습니다. 칸을 채우면 확인 칸에 체크가 들어가고, 들어가면 승인 도장이 찍힙니다.",
    css: `
      .v10 { background: #1d231c; color: #14213d; }
      .v10 .room { position: absolute; inset: 0; background: radial-gradient(80% 80% at 35% 40%, #2b3329 0%, #161b15 80%); }
      .v10 .board { position: absolute; left: 64px; top: 30px; bottom: 30px; width: min(960px, calc(100% - 520px)); background: linear-gradient(135deg, #8d6c46, #75583a 60%, #6a4f33); border-radius: 14px;
        box-shadow: 0 30px 70px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.06); }
      .v10 .clip { position: absolute; left: 50%; top: -14px; transform: translateX(-50%); width: 230px; height: 56px; border-radius: 10px 10px 18px 18px; z-index: 3;
        background: linear-gradient(180deg, #f0f1ee 0%, #b8bdb9 45%, #8f9592 70%, #c9cdca 100%); box-shadow: 0 6px 10px rgba(0,0,0,.4), inset 0 -3px 0 rgba(0,0,0,.18); }
      .v10 .clip::after { content: ""; position: absolute; left: 50%; top: 12px; width: 56px; height: 14px; transform: translateX(-50%); border-radius: 8px; background: #6f7572; box-shadow: inset 0 2px 3px rgba(0,0,0,.4); }
      .v10 .doc { position: absolute; inset: 30px 24px 24px; background: #f6f6f1; overflow-y: auto; padding: 40px 38px 30px; box-shadow: 0 2px 6px rgba(0,0,0,.25); display: grid; align-content: start; gap: 16px; font-family: var(--mono); }
      .v10 .hd { display: grid; grid-template-columns: 190px minmax(0, 1fr) 210px; border: 1.5px solid #14213d; }
      .v10 .hd > div { padding: 10px 14px; min-width: 0; }
      .v10 .hd > div + div { border-left: 1px solid #14213d; }
      .v10 .hd-logo { display: grid; gap: 2px; align-content: center; font-family: var(--sans); color: #080b09; }
      .v10 .hd-logo .wm { font-size: 26px; }
      .v10 .hd-logo small { font-family: var(--mono); font-size: 10px; letter-spacing: .1em; color: #5b6358; }
      .v10 .hd-t { display: grid; align-content: center; gap: 2px; }
      .v10 .hd-t b { font-family: var(--sans); font-size: 21px; letter-spacing: -.02em; }
      .v10 .hd-t span { font-size: 11px; letter-spacing: .16em; color: #5b6358; }
      .v10 .hd-n { font-size: 11px; display: grid; gap: 3px; align-content: center; }
      .v10 .hd-n b { font-weight: 600; }
      .v10 .meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid #14213d; margin-top: -8px; }
      .v10 .meta div { display: grid; grid-template-columns: auto 1fr; gap: 10px; padding: 7px 12px; font-size: 12px; min-width: 0; }
      .v10 .meta div + div { border-left: 1px solid #14213d; }
      .v10 .meta dt { color: #5b6358; }
      .v10 .meta dd { margin: 0; font-weight: 600; color: #1f3a8a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .v10 .f { display: grid; gap: 0; grid-template-columns: minmax(0, 1fr) 260px; grid-template-areas: "bf bf" "fl fl" "msg msg" "sg go" "hint hint"; }
      .v10 .bf { grid-area: bf; }
      .v10 .f-fields { grid-area: fl; }
      .v10 .f-msg { grid-area: msg; }
      .v10 .sign { grid-area: sg; }
      .v10 .f-go { grid-area: go; }
      .v10 .f-hint { grid-area: hint; }
      .v10 .kind { display: flex; align-items: center; gap: 18px; padding: 0 0 12px; font-size: 12px; }
      .v10 .kind > span { color: #5b6358; letter-spacing: .08em; }
      .v10 .kind button { appearance: none; border: 0; background: none; padding: 4px 2px; font: inherit; font-family: var(--sans); font-size: 14px; font-weight: 600; color: #14213d; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
      .v10 .kind button::before { content: ""; width: 16px; height: 16px; border: 1.5px solid #14213d; background: #fff; }
      .v10 .kind button[aria-selected="true"]::before { background: #fff center / 12px 12px no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M1.5 6.5 4.5 9.5 10.5 2' fill='none' stroke='%231f3a8a' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); }
      .v10 .th, .v10 .f-fld { display: grid; grid-template-columns: 58px 210px minmax(0, 1fr) 64px; }
      .v10 .th { border: 1.5px solid #14213d; border-bottom: 1px solid #14213d; background: #e4e6de; font-size: 10.5px; letter-spacing: .1em; color: #5b6358; }
      .v10 .th span { padding: 7px 12px; }
      .v10 .th span + span { border-left: 1px solid #14213d; }
      .v10 .th span:last-child { text-align: center; }
      .v10 .f-fields { gap: 0; counter-reset: st; border: 1.5px solid #14213d; border-top: 0; }
      .v10 .f-fld { counter-increment: st; gap: 0; align-items: stretch; min-height: 50px; }
      .v10 .f-fld + .f-fld { border-top: 1px solid #14213d; }
      .v10 .f-fld::before { content: counter(st, decimal-leading-zero); display: grid; place-items: center; border-right: 1px solid #14213d; font-size: 12px; color: #5b6358; }
      .v10 .f-fld::after { content: "☐"; display: grid; place-items: center; border-left: 1px solid #14213d; font-size: 22px; color: #14213d; }
      .v10 .f-fld:has(.f-inp:not(:placeholder-shown))::after { content: "☑"; color: #1f3a8a; }
      .v10 .f-lab { display: flex; align-items: center; padding: 0 12px; border-right: 1px solid #14213d; font-family: var(--sans); font-size: 13px; font-weight: 600; color: #14213d; }
      .v10 .f-inp { border: 0; min-height: 50px; padding: 8px 14px; font-family: var(--mono); font-size: 16px; color: #1f3a8a; background: transparent; }
      .v10 .f-inp:focus { background: rgba(31,58,138,.06); box-shadow: inset 0 -2px 0 #1f3a8a; }
      .v10 .f-inp::placeholder { font-size: 12px; color: #5b6358; opacity: .6; }
      .v10 .f-msg { margin-top: 12px; border: 1.5px solid #b2361b; background: rgba(178,54,27,.06); display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 0 14px; padding: 9px 12px; font-family: var(--sans); }
      .v10 .f-msg::before { content: "일탈"; grid-row: span 2; align-self: center; text-align: center; padding: 4px 0; border: 1px solid currentColor; font-family: var(--mono); font-size: 11px; letter-spacing: .12em; font-weight: 600; }
      .v10 .f-msg[data-kind="lock"]::before { content: "공정 중지"; font-size: 10px; letter-spacing: .02em; }
      .v10 .f-msg[data-kind="ok"]::before { content: "적합"; }
      .v10 .sign { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); margin-top: 14px; border: 1.5px solid #14213d; border-right: 0; }
      .v10 .sign div { display: grid; gap: 2px; padding: 8px 12px; min-width: 0; }
      .v10 .sign div + div { border-left: 1px solid #14213d; }
      .v10 .sign small { font-size: 10.5px; letter-spacing: .08em; color: #5b6358; }
      .v10 .sign .signer { font-family: var(--hand); font-size: 30px; line-height: 1; color: #1f3a8a; min-height: 30px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .v10 .sign .who { font-family: var(--sans); font-size: 14px; font-weight: 600; padding-top: 6px; }
      .v10 .f-go { margin-top: 14px; min-height: 0; background: #14213d; color: #f6f6f1; font-family: var(--sans); font-size: 15px; border: 1.5px solid #14213d; }
      .v10 .f-go:hover { background: #1f3a8a; border-color: #1f3a8a; }
      .v10 .f-hint { margin-top: 12px; font-family: var(--sans); font-size: 12px; color: #5b6358; opacity: 1; }
      .v10 .stamp { position: absolute; right: 60px; bottom: 120px; width: 132px; height: 132px; border-radius: 50%; display: grid; place-items: center; text-align: center; pointer-events: none; z-index: 2;
        color: #c2351d; border: 4px solid currentColor; box-shadow: inset 0 0 0 4px #f6f6f1, inset 0 0 0 6px currentColor; transform: rotate(-14deg) scale(1.6); opacity: 0; transition: opacity .2s ease, transform .35s cubic-bezier(.2,1.6,.4,1); font-family: var(--sans); }
      .v10 .stamp b { display: block; font-size: 30px; letter-spacing: .1em; line-height: 1; }
      .v10 .stamp small { display: block; font-family: var(--mono); font-size: 10px; letter-spacing: .1em; margin-top: 4px; }
      .v10[data-msg="ok"] .stamp { opacity: .88; transform: rotate(-14deg) scale(1); }
      .v10 .alcoa { margin: 4px 0 0; font-size: 10.5px; line-height: 1.6; color: #5b6358; border-top: 1px dashed rgba(20,33,61,.35); padding-top: 10px; }
      .v10 .side { position: absolute; top: 0; bottom: 0; right: 64px; width: 360px; display: grid; align-content: center; gap: 22px; color: #f1f1e9; }
      .v10 .side .wm { font-size: 58px; }
      .v10 .side .sub { margin: -10px 0 0; font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #c6ff4a; }
      .v10 .side .lead { margin: 0; font-size: 21px; font-weight: 600; line-height: 1.42; letter-spacing: -.02em; text-wrap: balance; }
      .v10 .side ol { margin: 0; padding: 0; list-style: none; display: grid; gap: 0; border-top: 1px solid rgba(241,241,233,.2); }
      .v10 .side li { display: grid; grid-template-columns: 28px 1fr; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(241,241,233,.2); font-size: 13.5px; color: rgba(241,241,233,.78); }
      .v10 .side li b { font-family: var(--mono); font-weight: 500; color: #c6ff4a; }
      @container scr (max-width: 1180px) { .v10 .side { display: none; } .v10 .board { width: auto; right: 64px; } }
      @container scr (max-width: 760px) {
        .v10 .board { left: 8px; right: 8px; top: 22px; bottom: 8px; width: auto; border-radius: 10px; }
        .v10 .clip { width: 150px; height: 40px; top: -12px; }
        .v10 .doc { inset: 24px 10px 10px; padding: 26px 14px 20px; gap: 12px; }
        .v10 .hd { grid-template-columns: 1fr; }
        .v10 .hd > div + div { border-left: 0; border-top: 1px solid #14213d; }
        .v10 .hd-n { grid-template-columns: repeat(3, auto); gap: 10px; }
        .v10 .meta { grid-template-columns: 1fr; margin-top: -4px; }
        .v10 .meta div + div { border-left: 0; border-top: 1px solid #14213d; }
        .v10 .f { grid-template-columns: 1fr; grid-template-areas: "bf" "fl" "msg" "sg" "go" "hint"; }
        .v10 .th { display: none; }
        .v10 .f-fields { border-top: 1.5px solid #14213d; }
        .v10 .f-fld { grid-template-columns: 38px minmax(0, 1fr) 44px; grid-template-rows: auto auto; }
        .v10 .f-fld::before { grid-row: 1 / 3; }
        .v10 .f-fld::after { grid-row: 1 / 3; grid-column: 3; }
        .v10 .f-lab { grid-column: 2; border-right: 0; padding: 8px 12px 0; font-size: 12px; }
        .v10 .f-inp { grid-column: 2; min-height: 40px; padding: 4px 12px 8px; }
        .v10 .sign { border-right: 1.5px solid #14213d; }
        .v10 .f-go { min-height: 50px; }
        .v10 .stamp { right: 24px; bottom: 150px; width: 110px; height: 110px; }
      }`,
    html: (F) => `<div class="room"></div>
      <div class="board">
        <i class="clip" aria-hidden="true"></i>
        <div class="doc">
          <div class="hd">
            <div class="hd-logo">${F.word()}<small>${F.COPY.sub}</small></div>
            <div class="hd-t"><b>제조 기록서</b><span>BATCH MANUFACTURING RECORD</span></div>
            <div class="hd-n"><span>문서 <b>BMR-CR-010</b></span><span>개정 <b>03</b></span><span>쪽 <b>1 / 1</b></span></div>
          </div>
          <dl class="meta">
            <div><dt>제품명</dt><dd>파이프라인 랩 입장</dd></div>
            <div><dt>배치 번호</dt><dd class="lot">WEB-261024</dd></div>
            <div><dt>작성일</dt><dd>2026-10-24</dd></div>
          </dl>
          ${F.form({
            tabs: false,
            labels: { code: "학급 코드 확인", id: "아이디 기입", name: "이름 기입", pw: "비밀번호 기입", pw2: "비밀번호 재확인" },
            ph: { code: "선생님이 알려 준 6자", id: "영문 소문자 · 숫자 3~20자", name: "별명도 돼요", pw: "기입", pw2: "한 번 더", pwSu: "8자 이상" },
            go: { login: "기록 완료 · 들어가기", signup: "기록 완료 · 가입하기" },
            before: `<div class="bf"><div class="kind" role="tablist" aria-label="구분"><span>구분</span>
                <button type="button" role="tab" data-tab="login" aria-selected="true">로그인</button>
                <button type="button" role="tab" data-tab="signup" aria-selected="false">회원가입(학생)</button></div>
              <div class="th" aria-hidden="true"><span>단계</span><span>작업 내용</span><span>기록</span><span>확인</span></div></div>`,
            after: `<div class="sign"><div><small>작성자 서명</small><span class="signer">${F.DEMO.id}</span></div><div><small>확인자</small><span class="who">담임 교사</span></div></div>`,
          })}
          <p class="alcoa">ALCOA+ 기록 원칙 — 쓴 사람이 드러나게, 알아보기 쉽게, 그때그때, 원본 그대로, 정확하게. 틀린 기록은 지우지 않고 한 줄 그은 뒤 고쳐 씁니다.</p>
          <div class="stamp" aria-hidden="true"><span><b>승인</b><small>QA · 10.24</small></span></div>
        </div>
      </div>
      <div class="side">
        ${F.word()}
        <p class="sub">${F.COPY.sub}</p>
        <p class="lead">${F.COPY.lead}</p>
        <ol>
          <li><b>01</b>로그인은 아이디 · 비밀번호 두 단계만 기록합니다.</li>
          <li><b>02</b>처음이면 구분에서 회원가입(학생)을 고르고 학급 코드 6자부터 씁니다.</li>
          <li><b>03</b>비밀번호를 5번 틀리면 공정이 1분 동안 멈춥니다.</li>
          <li><b>04</b>교사 계정은 따로 발급합니다.</li>
        </ol>
      </div>`,
    mount(root, ctx) {
      const signer = root.querySelector(".signer"), lot = root.querySelector(".lot");
      watch(root, ctx, () => {
        signer.textContent = val(root, root.dataset.mode === "signup" ? "name" : "id").trim();
        const code = val(root, "code").trim().toUpperCase();
        lot.textContent = root.dataset.mode === "signup" && code ? `${code.slice(0, 6)}-261024` : "WEB-261024";
      });
    },
  });

  /* ─────────────────────────────────────────────────────────────
     11 — 클린룸 에어락: 왼쪽은 상태등이 달린 에어락 문, 오른쪽은 벽에 붙은 출입 단말. 들어가면 문이 열린다 */
  add({
    no: 11, fam: "b", title: "클린룸 에어락", en: "Cleanroom Airlock", swatch: "#2b3335",
    caption: "무균 구역 앞 출입 단말에서 로그인합니다. 문 위 상태등이 가압 · 거부 · 잠김을 알려 주고, 통과하면 에어락 문이 양쪽으로 열립니다.",
    css: `
      .v11 { --led: #ffb21a; --teal: #3fd0bd; background: #1e2426; color: #e8ece6; }
      .v11[data-msg="bad"], .v11[data-msg="lock"] { --led: #ff5a3c; }
      .v11[data-msg="ok"] { --led: #8dff5a; }
      .v11[data-busy] { --led: #3fd0bd; }
      .v11 .wall { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,.05), transparent 30%, rgba(0,0,0,.25)), repeating-linear-gradient(90deg, #252c2e 0 2px, #2a3234 2px 5px, #272e30 5px 7px); }
      .v11 .wall::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 84px; background: linear-gradient(180deg, #161b1c, #101415); border-top: 1px solid rgba(255,255,255,.08); }
      .v11 .wrap { position: absolute; inset: 0; display: grid; grid-template-rows: minmax(0, 1fr); grid-template-columns: minmax(0, 1fr) 470px; gap: 64px; padding: 40px 72px 0; }
      .v11 .lock-area { position: relative; min-width: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; justify-items: center; gap: 16px; }
      .v11 .sig { display: inline-flex; align-items: center; gap: 12px; padding: 10px 18px; background: #0b0e0f; border: 1px solid rgba(255,255,255,.12); font-family: var(--mono); font-size: 15px; font-weight: 600; letter-spacing: .08em; color: var(--led); text-shadow: 0 0 10px var(--led); min-width: 320px; justify-content: center; }
      .v11 .sig .led { width: 12px; height: 12px; border-radius: 50%; background: var(--led); box-shadow: 0 0 14px 2px var(--led); }
      .v11 .sig > span { display: none; }
      .v11[data-msg="none"]:not([data-busy]) .sig .s-none, .v11[data-busy] .sig .s-busy, .v11[data-msg="bad"] .sig .s-bad, .v11[data-msg="lock"] .sig .s-lock, .v11[data-msg="ok"] .sig .s-ok { display: inline; }
      .v11[data-msg="lock"] .sig { animation: v11-blink 1s steps(2) infinite; }
      @keyframes v11-blink { 50% { opacity: .35; } }
      .v11 .door { position: relative; width: min(560px, 100%); height: 100%; min-height: 0; overflow: hidden; border: 14px solid #3c4649; border-bottom: 0; box-shadow: inset 0 0 0 2px #1a2022, 0 0 0 1px rgba(255,255,255,.08), 0 20px 60px rgba(0,0,0,.4); background: #0e1213; }
      .v11 .room { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 10px; background: radial-gradient(80% 70% at 50% 40%, #ffffff 0%, #eef2ec 50%, #d6ded8 100%); color: #080b09; text-align: center; }
      .v11 .room .wm { font-size: 54px; }
      .v11 .room p { margin: 0; font-family: var(--mono); font-size: 11px; letter-spacing: .14em; color: #5b6358; }
      .v11 .leaf { position: absolute; top: 0; bottom: 0; width: 50%; background: linear-gradient(90deg, #8f999b, #c3cbcc 22%, #a3adaf 50%, #b9c1c2 78%, #8a9496); transition: transform 1.4s cubic-bezier(.65,0,.25,1); display: grid; justify-items: center; align-content: start; padding-top: 18%; gap: 26px; }
      .v11 .leaf-l { left: 0; box-shadow: inset -2px 0 0 #5f696b; }
      .v11 .leaf-r { right: 0; box-shadow: inset 2px 0 0 #5f696b; }
      .v11 .win { width: 46%; aspect-ratio: 3 / 5; border: 6px solid #6d777a; border-radius: 4px; background: linear-gradient(150deg, rgba(160,240,230,.55), rgba(60,120,120,.65) 55%, rgba(20,50,52,.85)); box-shadow: inset 0 0 18px rgba(0,0,0,.35); }
      .v11 .tag { font-family: var(--mono); font-size: 11px; font-weight: 600; letter-spacing: .08em; color: #1e2426; padding: 6px 10px; background: #ffd23a; border: 2px solid #1e2426; text-align: center; }
      .v11[data-msg="ok"] .leaf-l { transform: translateX(-97%); }
      .v11[data-msg="ok"] .leaf-r { transform: translateX(97%); }
      .v11 .tape { width: min(620px, 100%); height: 16px; background: repeating-linear-gradient(-45deg, #ffd23a 0 14px, #1e2426 14px 28px); }
      .v11 .env { margin: 0 0 18px; display: grid; grid-template-columns: repeat(4, auto); gap: 0; border: 1px solid rgba(255,255,255,.14); background: rgba(10,14,15,.6); }
      .v11 .env div { padding: 8px 14px; min-width: 0; }
      .v11 .env div + div { border-left: 1px solid rgba(255,255,255,.14); }
      .v11 .env dt { font-family: var(--mono); font-size: 9.5px; letter-spacing: .1em; color: #8d9a98; }
      .v11 .env dd { margin: 2px 0 0; font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--teal); white-space: nowrap; }
      .v11 .term { align-self: center; position: relative; padding: 20px; background: linear-gradient(160deg, #4a5558, #353e41); border: 1px solid rgba(255,255,255,.12); box-shadow: 0 30px 60px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.14); max-height: calc(100% - 40px); display: grid; grid-template-rows: minmax(0, 1fr); min-height: 0; }
      .v11 .term::before, .v11 .term::after { content: ""; position: absolute; top: 8px; width: 6px; height: 6px; border-radius: 50%; background: #23292b; box-shadow: inset 0 1px 1px rgba(0,0,0,.6); }
      .v11 .term::before { left: 8px; } .v11 .term::after { right: 8px; }
      .v11 .scrn { background: #071012; border: 1px solid #0b1a1c; box-shadow: inset 0 0 40px rgba(63,208,189,.08); padding: 22px 24px 20px; display: grid; gap: 16px; overflow-y: auto; min-height: 0; }
      .v11 .t-top { display: flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 11px; letter-spacing: .1em; color: #8d9a98; padding-bottom: 12px; border-bottom: 1px solid rgba(63,208,189,.2); }
      .v11 .t-top .mk { width: 20px; height: 20px; color: var(--teal); }
      .v11 .t-top b { font-family: var(--sans); font-size: 16px; letter-spacing: -.02em; color: #e8ece6; margin-right: auto; }
      .v11 .gown { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
      .v11 .gown li { display: grid; gap: 4px; padding: 8px 6px; border: 1px solid rgba(232,236,230,.16); font-size: 11.5px; text-align: center; color: #8d9a98; transition: border-color .2s ease, color .2s ease; }
      .v11 .gown li b { font-family: var(--mono); font-size: 10px; font-weight: 500; }
      .v11 .gown li.done { border-color: var(--teal); color: #e8ece6; box-shadow: inset 0 -2px 0 var(--teal); }
      .v11 .gown li.done b::after { content: " ✓"; color: var(--teal); }
      .v11 .f { gap: 14px; }
      .v11 .f-tab { border-color: rgba(63,208,189,.35); color: #8d9a98; font-size: 13px; }
      .v11 .f-tab[aria-selected="true"] { background: var(--teal); color: #071012; border-color: var(--teal); }
      .v11 .f-fields { gap: 10px; }
      .v11 .f-lab { font-family: var(--mono); font-size: 10.5px; font-weight: 500; letter-spacing: .1em; color: #8d9a98; }
      .v11 .f-inp { min-height: 44px; background: #030809; border-color: rgba(63,208,189,.3); color: #e8ece6; font-family: var(--mono); }
      .v11 .f-inp:focus { border-color: var(--teal); box-shadow: 0 0 0 3px rgba(63,208,189,.15); }
      .v11 .f-go { min-height: 50px; background: var(--teal); color: #071012; }
      .v11 .f-go:hover { filter: brightness(1.08); }
      .v11 .f-msg { border-color: #ff5a3c; color: #ffa390; background: rgba(255,90,60,.1); }
      .v11 .f-msg[data-kind="lock"] { border-color: #ff5a3c; color: #ffa390; background: rgba(255,90,60,.16); }
      .v11 .f-msg[data-kind="ok"] { border-color: #8dff5a; color: #b6ff94; background: rgba(141,255,90,.08); }
      .v11 .f-hint { color: #8d9a98; opacity: 1; font-size: 12px; }
      @container scr (max-height: 820px) { .v11[data-mode="signup"] .gown { display: none; } .v11 .scrn { gap: 12px; padding-block: 16px; } .v11 .f-fields { gap: 8px; } .v11 .f-inp { min-height: 40px; } .v11 .t-top { padding-bottom: 8px; } }
      @container scr (max-width: 1100px) { .v11 .wrap { gap: 36px; padding: 32px 36px 0; grid-template-columns: minmax(0, 1fr) 420px; } .v11 .env { grid-template-columns: repeat(2, auto); } .v11 .env div:nth-child(3) { border-left: 0; } .v11 .env div:nth-child(n+3) { border-top: 1px solid rgba(255,255,255,.14); } }
      @container scr (max-width: 760px) {
        .v11 .wrap { grid-template-columns: 1fr; grid-template-rows: auto auto; gap: 18px; padding: 16px 12px 24px; overflow-y: auto; align-content: start; }
        .v11 .wall::after { display: none; }
        .v11 .lock-area { grid-template-rows: auto 250px auto; gap: 10px; }
        .v11 .sig { min-width: 0; width: 100%; font-size: 13px; padding: 8px 12px; }
        .v11 .door { border-width: 10px; width: 100%; }
        .v11 .room .wm { font-size: 34px; }
        .v11 .leaf { padding-top: 12%; gap: 12px; }
        .v11 .win { width: 40%; }
        .v11 .tag { font-size: 9.5px; padding: 4px 6px; }
        .v11 .env { display: none; }
        .v11 .term { align-self: start; padding: 10px; max-height: none; }
        .v11 .scrn { padding: 16px 14px; overflow: visible; }
        .v11 .gown li { font-size: 10.5px; padding: 6px 2px; }
      }`,
    html: (F) => `<div class="wall"></div>
      <div class="wrap">
        <section class="lock-area" aria-hidden="true">
          <div class="sig"><i class="led"></i><span class="s-none">가압 중 · +15 Pa</span><span class="s-busy">확인 중 · 잠시만요</span><span class="s-bad">출입 거부</span><span class="s-lock">잠김 · 1분</span><span class="s-ok">출입 허가 · 문 열림</span></div>
          <div class="door">
            <div class="room">${F.word()}<p>${F.COPY.sub} · 무균 구역</p></div>
            <div class="leaf leaf-l"><i class="win"></i><span class="tag">무균 구역 · ISO 7</span></div>
            <div class="leaf leaf-r"><i class="win"></i><span class="tag">갱의 후 출입</span></div>
          </div>
          <div class="tape"></div>
          <dl class="env">
            <div><dt>차압</dt><dd>+15 Pa</dd></div>
            <div><dt>온도 · 습도</dt><dd>21.0 °C · 45 %</dd></div>
            <div><dt>입자 ≥0.5 µm</dt><dd>18,400 /m³</dd></div>
            <div><dt>기준 ISO 7</dt><dd>352,000 /m³</dd></div>
          </dl>
        </section>
        <aside class="term">
          <div class="scrn">
            <div class="t-top">${F.mark()}<b>CRISTA</b><span>출입 단말 A-07</span></div>
            <ol class="gown" aria-label="갱의 순서">
              <li data-g="1"><b>01</b>덧신</li><li data-g="2"><b>02</b>가운 · 마스크</li><li data-g="3"><b>03</b>장갑</li><li data-g="4"><b>04</b>에어 샤워</li>
            </ol>
            ${F.form({ hint: "교사 계정은 따로 발급돼요. 처음 온 학생은 회원가입에서 학급 코드부터 써 주세요." })}
          </div>
        </aside>
      </div>`,
    mount(root, ctx) {
      const li = [...root.querySelectorAll(".gown li")];
      watch(root, ctx, () => {
        const ks = fieldsOf(root);
        const filled = ks.filter((k) => val(root, k).length > 0).length;
        const n = Math.floor((filled / ks.length) * 3);
        li.forEach((el, i) => el.classList.toggle("done", i < 3 ? i < n : root.dataset.msg === "ok"));
      });
    },
  });

  /* ─────────────────────────────────────────────────────────────
     12 — 전기영동 젤: UV 위 SDS-PAGE 젤. 칸마다 레인이 하나, 글자 수만큼 밴드가 내려가고 kDa 로 읽힌다 */
  const LADDER = [250, 150, 100, 75, 50, 37, 25, 20, 15, 10];
  const LOG_HI = Math.log10(250), LOG_SPAN = Math.log10(250) - Math.log10(10);
  const yOf = (mw) => 0.08 + 0.84 * (LOG_HI - Math.log10(mw)) / LOG_SPAN;
  const kdaOf = (y) => Math.round(Math.pow(10, LOG_HI - ((y - 0.08) / 0.84) * LOG_SPAN));
  const LANES = [
    { k: "M", lab: "M" }, { k: "ctl", lab: "대조" }, { k: "code", lab: "코드" }, { k: "id", lab: "아이디" },
    { k: "name", lab: "이름" }, { k: "pw", lab: "비번" }, { k: "pw2", lab: "확인" }, { k: "blank", lab: "—" },
  ];
  add({
    no: 12, fam: "b", title: "전기영동 젤", en: "SDS-PAGE Gel", swatch: "#0b2a6e",
    caption: "UV 위에 놓인 SDS-PAGE 젤에서 칸 하나가 레인 하나입니다. 글자 수만큼 밴드가 내려가 kDa 로 읽히고, 로그인하면 모든 밴드가 한 줄로 맞춰집니다.",
    css: `
      .v12 { background: #040b20; color: #e6ecfb; }
      .v12 .uv { position: absolute; inset: 0; background: radial-gradient(60% 70% at 34% 52%, rgba(40,90,255,.32), transparent 70%), linear-gradient(180deg, #06102b, #030818); }
      .v12 .wrap { position: absolute; inset: 0; display: grid; grid-template-rows: minmax(0, 1fr); grid-template-columns: minmax(0, 1fr) 460px; }
      .v12 .gel-area { position: relative; min-width: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 18px; padding: 32px 48px 30px 56px; }
      .v12 .psu { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 26px; font-family: var(--mono); font-size: 11px; letter-spacing: .1em; color: #8ea3d6; }
      .v12 .psu b { font-size: 19px; font-weight: 600; letter-spacing: .04em; color: #ff8a3c; text-shadow: 0 0 10px rgba(255,138,60,.6); font-variant-numeric: tabular-nums; }
      .v12 .psu .tm { color: #c6ff4a; text-shadow: 0 0 10px rgba(198,255,74,.5); }
      .v12[data-msg="lock"] .psu b { color: #5a6788; text-shadow: none; }
      .v12 .gel-box { position: relative; display: grid; place-items: center; min-height: 0; padding: 0 0 34px 52px; }
      .v12 .gel { position: relative; height: 100%; max-height: 640px; aspect-ratio: 1.08; max-width: 100%; display: grid; grid-template-columns: repeat(8, minmax(0, 1fr));
        background: linear-gradient(180deg, rgba(48,100,230,.5), rgba(26,64,170,.46)); border: 1px solid rgba(160,200,255,.32); border-radius: 3px;
        box-shadow: 0 0 90px rgba(40,100,255,.28), inset 0 0 50px rgba(0,0,30,.55); transition: filter .4s ease; }
      .v12[data-msg="lock"] .gel { filter: brightness(.4) saturate(.3); }
      .v12 .ln { position: relative; min-width: 0; }
      .v12 .ln + .ln { box-shadow: inset 1px 0 0 rgba(160,200,255,.06); }
      .v12 .well { position: absolute; top: 2%; left: 20%; right: 20%; height: 3.2%; background: #03102e; border: 1px solid rgba(160,200,255,.4); border-top: 0; }
      .v12 .band { position: absolute; left: 17%; right: 17%; top: var(--y, 50%); height: 11px; margin-top: -5.5px; border-radius: 3px; background: #dcff70;
        box-shadow: 0 0 10px 2px rgba(205,255,95,.6), 0 0 28px 8px rgba(160,255,80,.22); transition: top 1s cubic-bezier(.2,.8,.2,1), opacity .3s ease, filter .3s ease, background-color .3s ease; }
      .v12 .band.none { opacity: 0; }
      .v12 .ln.off .band { opacity: 0; }
      .v12 .ln.off .well { opacity: .45; }
      .v12 .ld .band { height: 6px; margin-top: -3px; background: #cfe6ff; box-shadow: 0 0 8px rgba(150,200,255,.65); }
      .v12 .ctl .band { opacity: .75; }
      .v12[data-msg="bad"] .ln-pw .band { background: #ff7a5c; box-shadow: 0 0 18px 6px rgba(255,100,70,.4); filter: blur(2.5px); height: 26px; }
      .v12[data-msg="ok"] .ln[data-k]:not(.off) .band { top: 47% !important; }
      .v12[data-msg="ok"] .ok-line { opacity: 1; }
      .v12 .ok-line { position: absolute; left: -6px; right: -6px; top: 47%; height: 0; border-top: 1px dashed rgba(198,255,74,.8); opacity: 0; transition: opacity .4s ease .8s; pointer-events: none; }
      .v12 .ok-line span { position: absolute; right: 0; top: -22px; font-family: var(--mono); font-size: 11px; color: #c6ff4a; }
      .v12 .lab { position: absolute; bottom: -26px; left: 0; right: 0; text-align: center; font-family: var(--mono); font-size: 11px; color: #8ea3d6; white-space: nowrap; }
      .v12 .ln.off .lab { opacity: .45; }
      .v12 .kda { position: absolute; left: -52px; top: 0; bottom: 0; width: 44px; }
      .v12 .kda span { position: absolute; right: 0; top: var(--y); transform: translateY(-50%); font-family: var(--mono); font-size: 10.5px; color: #9fb6e8; }
      .v12 .kda .u { top: -18px; transform: none; color: #5f74a8; }
      .v12 .read { margin: 0; display: flex; flex-wrap: wrap; gap: 6px 22px; font-family: var(--mono); font-size: 11.5px; color: #8ea3d6; padding-left: 52px; }
      .v12 .read b { color: #dcff70; font-weight: 600; }
      .v12 .side { position: relative; min-width: 0; background: rgba(8,18,48,.86); border-left: 1px solid rgba(160,200,255,.16); padding: 36px 40px 30px; display: grid; align-content: center; gap: 22px; overflow-y: auto; }
      .v12 .side .wm { font-size: 50px; color: #f1f1e9; }
      .v12 .sub { margin: -12px 0 0; font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #8ea3d6; }
      .v12 .lead { margin: 0; font-size: 19px; font-weight: 600; line-height: 1.42; letter-spacing: -.02em; text-wrap: balance; }
      .v12[data-mode="signup"] .lead { display: none; }
      .v12 .f { gap: 14px; }
      .v12 .f-tab { border-color: rgba(160,200,255,.3); color: #8ea3d6; }
      .v12 .f-tab[aria-selected="true"] { background: #dcff70; color: #040b20; border-color: #dcff70; }
      .v12 .f-fields { gap: 11px; }
      .v12 .f-lab { font-family: var(--mono); font-size: 10.5px; font-weight: 500; letter-spacing: .1em; color: #8ea3d6; display: flex; justify-content: space-between; }
      .v12 .f-lab::after { content: attr(data-lane); color: #5f74a8; }
      .v12 .f-inp { min-height: 44px; background: #030a1f; border-color: rgba(160,200,255,.26); color: #e6ecfb; font-family: var(--mono); }
      .v12 .f-inp:focus { border-color: #dcff70; box-shadow: 0 0 0 3px rgba(220,255,112,.14); }
      .v12 .f-go { min-height: 52px; background: #dcff70; color: #040b20; }
      .v12 .f-go:hover { box-shadow: 0 0 24px rgba(220,255,112,.35); }
      .v12 .f-msg { border-color: #ff7a5c; color: #ffb4a0; background: rgba(255,90,60,.12); }
      .v12 .f-msg[data-kind="lock"] { border-color: #ff8a3c; color: #ffc59a; background: rgba(255,138,60,.12); }
      .v12 .f-msg[data-kind="ok"] { border-color: #dcff70; color: #dcff70; background: rgba(220,255,112,.08); }
      .v12 .f-hint { color: #8ea3d6; opacity: 1; font-size: 12px; }
      .v12 .run .band { animation: none; }
      @container scr (max-width: 760px) {
        .v12 .wrap { grid-template-columns: 1fr; grid-template-rows: auto auto; overflow-y: auto; }
        .v12 .gel-area { padding: 16px 12px 14px; gap: 10px; grid-template-rows: auto 330px auto; }
        .v12 .psu { gap: 4px 14px; font-size: 9.5px; }
        .v12 .psu b { font-size: 14px; }
        .v12 .gel-box { padding: 0 0 26px 34px; }
        .v12 .kda { left: -36px; width: 30px; }
        .v12 .kda span { font-size: 9px; }
        .v12 .kda .u { display: none; }
        .v12 .lab { font-size: 9px; bottom: -20px; }
        .v12 .band { height: 8px; margin-top: -4px; }
        .v12 .read { padding-left: 0; font-size: 10.5px; gap: 4px 14px; }
        .v12 .side { border-left: 0; border-top: 1px solid rgba(160,200,255,.16); padding: 22px 16px 26px; align-content: start; overflow: visible; }
        .v12 .side .wm { font-size: 36px; }
        .v12 .lead { font-size: 16px; }
      }`,
    html: (F) => {
      const lanes = LANES.map((l) => {
        if (l.k === "M") return `<div class="ln ld">${LADDER.map((mw) => `<i class="band" style="--y:${(yOf(mw) * 100).toFixed(2)}%"></i>`).join("")}<i class="well"></i><span class="lab">${l.lab}</span></div>`;
        if (l.k === "ctl") return `<div class="ln ctl"><i class="well"></i>${[66, 45, 29].map((mw) => `<i class="band" style="--y:${(yOf(mw) * 100).toFixed(2)}%"></i>`).join("")}<span class="lab">${l.lab}</span></div>`;
        if (l.k === "blank") return `<div class="ln"><i class="well"></i><span class="lab">${l.lab}</span></div>`;
        return `<div class="ln ln-${l.k}" data-k="${l.k}"><i class="well"></i><i class="band none"></i><span class="lab">${l.lab}</span></div>`;
      }).join("");
      return `<div class="uv"></div>
        <div class="wrap">
          <section class="gel-area" aria-hidden="true">
            <div class="psu"><span>SDS-PAGE 12% · 형광 염색</span><span><b>150 V</b></span><span><b>42 mA</b></span><span>남은 시간 <b class="tm">38:12</b></span></div>
            <div class="gel-box"><div class="gel">
              <div class="kda"><span class="u">kDa</span>${LADDER.map((mw) => `<span style="--y:${(yOf(mw) * 100).toFixed(2)}%">${mw}</span>`).join("")}</div>
              ${lanes}
              <div class="ok-line"><span>모두 같은 높이 · 일치</span></div>
            </div></div>
            <p class="read"></p>
          </section>
          <aside class="side">
            ${F.word()}
            <p class="sub">${F.COPY.sub}</p>
            <p class="lead">${F.COPY.lead}</p>
            ${F.form()}
          </aside>
        </div>`;
    },
    mount(root, ctx) {
      const lanes = [...root.querySelectorAll(".ln[data-k]")], read = root.querySelector(".read"), tm = root.querySelector(".tm");
      const names = { code: "코드", id: "아이디", name: "이름", pw: "비번", pw2: "확인" };
      root.querySelectorAll(".f-lab").forEach((l) => { const k = (l.htmlFor.match(/-(\w+)$/) || [])[1]; if (names[k]) l.dataset.lane = `레인 ${LANES.findIndex((x) => x.k === k) + 1}`; });
      watch(root, ctx, () => {
        const su = root.dataset.mode === "signup";
        const out = [];
        lanes.forEach((ln) => {
          const k = ln.dataset.k, on = su || k === "id" || k === "pw";
          const L = on ? val(root, k).length : 0;
          ln.classList.toggle("off", !on);
          const b = ln.querySelector(".band");
          b.classList.toggle("none", L === 0);
          const y = 0.08 + 0.84 * Math.min(L, 24) / 24;
          b.style.setProperty("--y", (y * 100).toFixed(2) + "%");
          if (on) out.push(`${names[k]} ${L}자 ≈ <b>${L ? kdaOf(y) : "—"}</b>${L ? " kDa" : ""}`);
        });
        read.innerHTML = out.map((s) => `<span>${s}</span>`).join("") + `<span>글자가 많을수록 멀리 내려가요</span>`;
      });
      ctx.loop((t) => {
        const left = Math.max(0, 45 * 60 - 408 - Math.floor(t));
        const s = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
        if (tm.textContent !== s) tm.textContent = root.dataset.msg === "lock" ? "정지" : s;
      });
    },
  });
})();
