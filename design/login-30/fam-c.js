/* 로그인 시안 — C 갈래 '사옥 거리'(13~18). 설계 §3 의 '픽셀 사옥 한 줄'을 여러 방식으로 푼다 — 로그인하면 ② 사옥 지구로 걸어 들어간다.
   사옥 그림은 apps/web/public/campus 의 SVG(외관 8종 × 3단계, crispEdges)를 정수 배율로 키워 쓰고, 밤 · 청사진 그림은 그 SVG 의 색만 바꿔 만든다.
   팔레트는 06 픽셀 타이쿤(잔디 #78C850/#70B848 · 바닥 #F8E8C8 · 선 #282828 · 펜 #2860D0 · 강조 #F85858). 규칙은 core.js 머리말. */
(() => {
  const { add, F } = window.LOGIN;
  const A = window.LOGIN_ASSETS || { hq: {} };

  /* 사옥 SVG 의 색 바꾸기 — 창(#68A8F8)은 win() 이 하나씩 정한다 */
  const rand = (seed) => {
    let a = seed >>> 0 || 1;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const uri = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  function recolor(f, t, fills, strokes, win) {
    return (A.hq[`${f}-${t}`] || "").replace(/(fill|stroke)="(#[0-9A-Fa-f]{6})"/g, (m, k, c) => {
      c = c.toUpperCase();
      if (k === "fill" && c === "#68A8F8" && win) return `fill="${win()}"`;
      const map = k === "fill" ? fills : strokes;
      return map[c] ? `${k}="${map[c]}"` : m;
    });
  }
  const NIGHT_FILL = { "#F8F8F0": "#343852", "#E8E8E0": "#2A2D44", "#B8E0F8": "#2B3D63", "#F8E8C8": "#3B3446", "#D8A868": "#2A2640",
    "#3878C8": "#182238", "#B0B0A8": "#262838", "#E8D0B0": "#332D40", "#282828": "#08080F" };
  const NIGHT_STROKE = { "#5A3820": "#0C0B14", "#282828": "#06060C", "#E8E8E0": "#3A3D58", "#3878C8": "#3A3524" };
  const night = (f, t, seed, lit = 0.55) => { const r = rand(seed); return uri(recolor(f, t, NIGHT_FILL, NIGHT_STROKE, () => (r() < lit ? "#FFD36B" : "#1D2A4A"))); };
  const BP = "#DBE8F7";
  const BP_FILL = new Proxy({}, { get: () => "none" });
  const blue = (f, t) => uri(recolor(f, t, BP_FILL, { "#5A3820": BP, "#282828": BP, "#E8E8E0": "rgba(219,232,247,.45)", "#3878C8": "rgba(219,232,247,.6)" }, () => "none"));
  const img = (src, cls = "", size = 96) => `<img class="${cls}" src="${src}" width="${size}" height="${size}" alt="" draggable="false">`;

  /* ── 13 거리 한 줄 ── */
  add({
    no: 13, fam: "c", title: "거리 한 줄", en: "HQ Street", swatch: "#78c850",
    caption: "설계 §3 기본안을 다듬었습니다. 페이퍼 표제와 로그인 칸 아래로 모둠 사옥 여덟 채가 천천히 흘러가고, 들어가기에 성공하면 내 캐릭터가 거리로 걸어 들어옵니다.",
    css: `
      .v13 { --street-h: 252px; background: #f1f1e9; }
      .v13-street { position: absolute; left: 0; right: 0; bottom: 0; height: var(--street-h); border-top: 3px solid #282828;
        background: conic-gradient(#70B848 25%, #78C850 0 50%, #70B848 0 75%, #78C850 0) 0 0 / 32px 32px; }
      .v13-street::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 40px; z-index: 1; border-top: 3px solid #282828;
        background: repeating-linear-gradient(90deg, #F8E8C8 0 62px, #E8D0B0 62px 64px); }
      .v13 .st { position: absolute; inset: 0; }
      .v13 .st-row { position: absolute; left: 0; bottom: 34px; justify-content: flex-start; gap: 0; width: max-content; animation: v13-belt 96s linear infinite; }
      .v13 .st-row .hq { margin-right: 28px; }
      @keyframes v13-belt { to { transform: translateX(-50%); } }
      .v13-plate { position: absolute; z-index: 3; left: clamp(16px, 3cqw, 48px); bottom: 40px; display: grid; justify-items: center; font-family: var(--pixel); -webkit-font-smoothing: none; }
      .v13-plate b { background: #2860D0; color: #fff; border: 3px solid #282828; padding: 3px 10px; font-size: 13px; font-weight: 700; box-shadow: inset -3px -3px 0 rgba(0,0,0,.2); white-space: nowrap; }
      .v13-plate i { width: 6px; height: 44px; background: #5A3820; border: 2px solid #282828; border-top: 0; }
      .v13-me { position: absolute; z-index: 3; bottom: 8px; left: -90px; display: none; text-align: center; }
      .v13-me b { display: inline-block; margin-bottom: 2px; padding: 1px 6px; background: #c6ff4a; border: 2px solid #282828; font-family: var(--pixel); font-size: 12px; -webkit-font-smoothing: none; }
      .v13[data-msg="ok"] .v13-me { display: block; animation: v13-in 3.2s linear forwards; }
      .v13[data-msg="ok"] .v13-me .wk { animation-duration: .6s; }
      @keyframes v13-in { to { left: 44%; } }
      .v13-top { position: absolute; left: 0; right: 0; top: 0; bottom: calc(var(--street-h) - 56px); z-index: 4; display: grid;
        grid-template-columns: minmax(0, 1fr) min(428px, 36cqw); column-gap: clamp(32px, 6cqw, 120px); align-items: center;
        padding: 32px clamp(24px, 5.6cqw, 96px) 0; pointer-events: none; }
      .v13[data-mode="signup"] .v13-top { bottom: 16px; }
      .v13-top > * { pointer-events: auto; }
      .v13-title { align-self: start; padding-top: clamp(16px, 6cqh, 72px); display: grid; gap: 14px; min-width: 0; }
      .v13-kick { margin: 0; font-family: var(--pixel); -webkit-font-smoothing: none; font-size: 13px; color: #2860D0; display: flex; align-items: center; gap: 8px; }
      .v13-kick::before { content: ""; width: 10px; height: 10px; background: #78C850; border: 2px solid #282828; }
      .v13 .wm { font-size: clamp(64px, 8.4cqw, 128px); }
      .v13-sub { margin: -4px 0 0; font-family: var(--mono); font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: #5b6358; }
      .v13-lead { margin: 6px 0 0; max-width: 21em; font-size: clamp(18px, 1.6cqw, 24px); font-weight: 600; letter-spacing: -.02em; line-height: 1.4; text-wrap: balance; }
      .v13-route { margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px; font-size: 13px; }
      .v13-route li { display: flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid rgba(8,11,9,.24); color: #5b6358; }
      .v13-route li b { font-family: var(--mono); font-weight: 600; color: #080b09; }
      .v13-route li.on { background: #080b09; color: #f1f1e9; border-color: #080b09; }
      .v13-route li.on b { color: #c6ff4a; }
      .v13-panel { align-self: center; max-height: 100%; overflow-y: auto; background: #fbfbf6; border: 2px solid #080b09; box-shadow: 6px 6px 0 #080b09; padding: 18px 22px 22px; display: grid; gap: 14px; min-width: 0; }
      .v13-ph { margin: 0; display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 10px; border-bottom: 1px solid rgba(8,11,9,.16); }
      .v13-ph b { font-size: 16px; letter-spacing: -.02em; }
      .v13-ph span { font-family: var(--mono); font-size: 10.5px; letter-spacing: .1em; color: #5b6358; }
      .v13 .f { gap: 14px; }
      .v13 .f-fields { gap: 12px; }
      .v13 .f-lab { font-size: 12px; }
      .v13 .f-inp { background: #f1f1e9; border-color: rgba(8,11,9,.28); }
      .v13 .f-inp:focus { border-color: #080b09; background: #fff; }
      .v13 .f-go { min-height: 50px; justify-content: space-between; }
      .v13 .f-go::after { content: "▶"; font-size: 12px; color: #c6ff4a; }
      .v13 .f-go.busy::after { content: ""; }
      .v13 .f-msg[data-kind="ok"] { background: #c6ff4a; color: #080b09; border-color: #080b09; }
      @container scr (max-width: 760px) {
        .v13 > * { --street-h: 132px; }
        .v13 .st { --hq: 96px !important; }
        .v13 .st-row { bottom: 30px; }
        .v13 .st-row .hq { margin-right: 14px; }
        .v13-street::after { height: 32px; }
        .v13 .st-go .wk, .v13-me .wk { transform: scale(.5); transform-origin: 50% 100%; }
        .v13 .st-go { bottom: 4px !important; }
        .v13-me { bottom: 4px; }
        .v13-plate { bottom: 32px; left: 10px; }
        .v13-plate b { font-size: 11px; padding: 2px 6px; }
        .v13-plate i { height: 22px; }
        .v13-top, .v13[data-mode="signup"] .v13-top { display: flex; flex-direction: column; gap: 16px; bottom: calc(var(--street-h) - 8px); padding: 20px 16px 16px; overflow-y: auto; }
        .v13-title { padding-top: 0; gap: 8px; }
        .v13 .wm { font-size: 44px; }
        .v13-lead { font-size: 16px; }
        .v13-route, .v13-kick { display: none; }
        .v13[data-mode="signup"] .v13-lead { display: none; }
        .v13-panel { align-self: stretch; max-height: none; overflow: visible; padding: 16px; box-shadow: 4px 4px 0 #080b09; }
        .v13[data-mode="signup"] > * { --street-h: 56px; }
        .v13[data-mode="signup"] .st-row, .v13[data-mode="signup"] .v13-plate { display: none; }
        .v13[data-mode="signup"] .v13-street::after { height: 22px; }
      }`,
    html: (F) => {
      const list = [[1, 2], [6, 1], [3, 3], [2, 1], [7, 2], [4, 1], [8, 3], [5, 2]];
      return `
      <div class="v13-street">
        ${F.street({ list: list.concat(list), size: 192, walkers: [
          { role: "ceo", dir: "east", dur: 27, delay: -4, y: 6 }, { role: "cso", dir: "west", dur: 33, delay: -14, y: 6 },
          { role: "cto", dir: "east", dur: 23, delay: -16, y: 6 }, { role: "cmo", dir: "west", dur: 29, delay: -5, y: 6 }] })}
        <span class="v13-plate" aria-hidden="true"><b>사옥 지구 1번가</b><i></i></span>
        <span class="v13-me" aria-hidden="true"><b>하늘</b>${F.walker("cso", "east", 2)}</span>
      </div>
      <div class="v13-top">
        <div class="v13-title">
          <p class="v13-kick">사옥 지구 입구 · 모둠 사옥 8채</p>
          ${F.word()}
          <p class="v13-sub">${F.COPY.sub}</p>
          <p class="v13-lead">${F.COPY.lead}</p>
          <ol class="v13-route" aria-label="들어가면 이어지는 화면">
            <li class="on"><b>①</b> 로그인</li><li><b>②</b> 거리에서 우리 사옥 찾기</li><li><b>③</b> 신약 파이프라인</li>
          </ol>
        </div>
        <div class="v13-panel">
          <p class="v13-ph"><b>출입</b><span>STREET 01 · GATE</span></p>
          ${F.form()}
        </div>
      </div>`;
    },
  });

  /* ── 14 사옥 게시판 ── */
  add({
    no: 14, fam: "c", title: "사옥 게시판", en: "Tycoon Window", swatch: "#2860d0",
    caption: "crista 게임의 픽셀 타이쿤 창으로 '입사 서류'를 띄웠습니다. 잔디 위 사옥 앞에서 CEO가 말을 걸고, 틀리거나 잠기거나 들어갈 때 대사와 창 색이 바뀝니다.",
    css: `
      .v14 { font-family: var(--pixel); -webkit-font-smoothing: none; color: #282828;
        background: conic-gradient(#70B848 25%, #78C850 0 50%, #70B848 0 75%, #78C850 0) 0 0 / 32px 32px; }
      .v14-map { position: absolute; inset: 0; }
      .v14-road { position: absolute; left: 0; right: 0; top: 60cqh; height: 72px; border-block: 3px solid #282828;
        background: repeating-linear-gradient(90deg, #F8E8C8 0 30px, #E8D0B0 30px 32px); }
      .v14-map .hq { position: absolute; }
      .v14-h1 { --hq: 288px; left: 57cqw; top: calc(60cqh - 270px); }
      .v14-h2 { --hq: 192px; left: 81cqw; top: calc(60cqh - 180px); }
      .v14-h3 { --hq: 192px; left: 47cqw; top: calc(60cqh + 96px); }
      .v14-h4 { --hq: 192px; left: 64cqw; top: calc(60cqh + 96px); }
      .v14-h5 { --hq: 192px; left: 81cqw; top: calc(60cqh + 96px); }
      .v14-npc { position: absolute; z-index: 2; left: calc(57cqw + 96px); top: calc(60cqh - 96px); }
      .v14-npc .wk { animation-duration: 1.6s; }
      .v14-go { position: absolute; left: 0; right: 0; top: calc(60cqh - 30px); height: 100px; }
      .v14 .st-go { bottom: 0; }
      .v14-bubble { position: absolute; z-index: 3; left: calc(57cqw + 186px); top: calc(60cqh - 236px); max-width: 260px; padding: 8px 12px; background: #fff;
        border: 3px solid #282828; box-shadow: 4px 4px 0 rgba(40,40,40,.3); font-size: 14px; line-height: 1.45; }
      .v14-bubble::after { content: ""; position: absolute; left: -15px; bottom: 14px; width: 12px; height: 12px; background: #fff; border-left: 3px solid #282828; border-bottom: 3px solid #282828; }
      .v14-bubble span { display: none; }
      .v14[data-msg="none"] .v14-bubble .b0 { display: block; }
      .v14[data-msg="bad"] .v14-bubble .b1, .v14[data-msg="lock"] .v14-bubble .b2, .v14[data-msg="ok"] .v14-bubble .b3 { display: block; }
      .v14-hud { position: absolute; left: 0; right: 0; top: 0; z-index: 4; display: flex; align-items: center; gap: 8px; padding: 8px max(12px, 1.6cqw);
        background: #F8F8F0; border-bottom: 3px solid #282828; box-shadow: inset 0 -3px 0 #B0B0A8; }
      .v14-brand { display: flex; align-items: center; gap: 6px; margin-right: auto; font-weight: 700; font-size: 16px; white-space: nowrap; }
      .v14-brand .mk { width: 22px; height: 22px; color: #2860D0; stroke-width: 3; }
      .v14-brand small { font-weight: 400; font-size: 12px; color: #606060; }
      .v14-chip { border: 3px solid #282828; background: #fff; padding: 2px 8px; font-size: 12px; white-space: nowrap; }
      .v14-chip b { color: #2860D0; }
      .v14-win { position: absolute; z-index: 3; left: clamp(16px, 7cqw, 120px); top: calc(50% + 24px); transform: translateY(-50%);
        width: min(468px, 44cqw); max-height: calc(100% - 92px); display: flex; flex-direction: column;
        background: #F8F8F0; border: 3px solid #282828; box-shadow: inset -3px -3px 0 #B0B0A8, inset 3px 3px 0 #fff, 8px 8px 0 rgba(40,40,40,.35); }
      .v14-tb { display: flex; align-items: center; gap: 8px; flex: none; background: #2860D0; color: #fff; font-weight: 700; font-size: 15px; padding: 5px 6px 5px 10px; border-bottom: 3px solid #282828; }
      .v14-tb span { margin-right: auto; }
      .v14-x { width: 18px; height: 18px; background: #F85858; border: 2px solid #282828; position: relative; }
      .v14-x::before, .v14-x::after { content: ""; position: absolute; left: 5px; top: 1px; width: 3px; height: 12px; background: #fff; }
      .v14-x::before { transform: rotate(45deg); } .v14-x::after { transform: rotate(-45deg); }
      .v14[data-msg="lock"] .v14-tb { background: #606060; }
      .v14[data-msg="ok"] .v14-tb { background: #48A038; }
      .v14[data-msg="bad"] .v14-win { animation: v14-shake .36s steps(6) 1; }
      @keyframes v14-shake { 0%, 100% { margin-left: 0; } 25% { margin-left: -6px; } 50% { margin-left: 6px; } 75% { margin-left: -3px; } }
      .v14-body { padding: 14px 16px 16px; overflow-y: auto; min-height: 0; display: grid; gap: 12px; }
      .v14-intro { margin: 0; font-size: 13px; color: #606060; line-height: 1.5; }
      .v14 .f { gap: 12px; }
      .v14 .f-tabs { gap: 6px; }
      .v14 .f-tab, .v14 .f-tab + .f-tab { border: 3px solid #282828; background: #E8E8E0; color: #282828; font-weight: 700; padding: 7px 8px; font-size: 14px;
        box-shadow: inset -3px -3px 0 rgba(0,0,0,.18), inset 3px 3px 0 rgba(255,255,255,.7); }
      .v14 .f-tab[aria-selected="true"] { background: #F8E858; color: #282828; border-color: #282828; box-shadow: inset 3px 3px 0 rgba(0,0,0,.16); }
      .v14 .f-fields { gap: 10px; }
      .v14 .f-fld { gap: 3px; }
      .v14 .f-lab { font-size: 12px; font-weight: 400; color: #606060; }
      .v14 .f-inp { min-height: 36px; padding: 4px 8px; background: #fff; border: 3px solid #282828; box-shadow: inset 2px 2px 0 #E0E0D8; font-family: var(--pixel); font-size: 14px; padding-left: 10px; text-indent: 2px; letter-spacing: .02em; }
      .v14 .f-inp:focus { border-color: #2860D0; }
      .v14 .f-go { min-height: 42px; background: #F85858; color: #fff; border: 3px solid #282828; font-size: 17px; text-shadow: 2px 2px 0 rgba(0,0,0,.25);
        box-shadow: inset -3px -3px 0 rgba(0,0,0,.22), inset 3px 3px 0 rgba(255,255,255,.5); }
      .v14 .f-go:active { box-shadow: inset 3px 3px 0 rgba(0,0,0,.25); }
      .v14 .f-hint { opacity: 1; font-size: 12px; line-height: 1.5; }
      .v14 .f-hint.li { background: #F8E858; border: 3px solid #282828; padding: 6px 9px; transform: rotate(-1deg); margin-top: 2px; }
      .v14 .f-hint.su { color: #606060; }
      .v14 .f-msg, .v14 .f-msg[data-kind] { border: 3px solid #282828; background: #fff; color: #D82800; font-size: 13px; box-shadow: inset 0 -4px 0 #F85858; }
      .v14 .f-msg[data-kind="lock"] { color: #282828; box-shadow: none; background: repeating-linear-gradient(45deg, #E8E8E0 0 6px, #F8F8F0 6px 12px); }
      .v14 .f-msg[data-kind="ok"] { color: #fff; background: #48A038; box-shadow: inset 0 -4px 0 rgba(0,0,0,.2); }
      @container scr (max-width: 760px) {
        .v14-chip { display: none; }
        .v14-chip.k { display: inline-block; }
        .v14-brand small { display: none; }
        .v14-win { left: 12px; right: 12px; width: auto; top: 66px; transform: none; max-height: calc(100% - 78px); }
        .v14-road { top: auto; bottom: 40px; }
        .v14-map .hq, .v14-npc, .v14-bubble { display: none; }
        .v14-map .v14-h2 { display: block; left: auto; right: 6px; top: auto; bottom: 106px; }
        .v14-go { top: auto; bottom: 46px; }
      }`,
    html: (F) => `
      <div class="v14-map" aria-hidden="true">
        <div class="v14-road"></div>
        ${F.hq(4, 3, "v14-h1")}${F.hq(2, 2, "v14-h2")}${F.hq(6, 1, "v14-h3")}${F.hq(8, 2, "v14-h4")}${F.hq(3, 1, "v14-h5")}
        <span class="v14-npc">${F.walker("ceo", "south", 3)}</span>
        <div class="v14-go">
          <span class="st-go" style="--dur:24s;--dl:-6s">${F.walker("cto", "east", 2)}</span>
          <span class="st-go w" style="--dur:30s;--dl:-19s">${F.walker("cmo", "west", 2)}</span>
        </div>
      </div>
      <div class="v14-bubble" aria-hidden="true">
        <span class="b0 li">어서 와요! 아이디랑 비밀번호를 적어 주세요.</span>
        <span class="b0 su">처음 왔군요. 선생님이 알려 준 학급 코드 6자부터!</span>
        <span class="b1">음… 한 번 더 확인해 볼까요?</span>
        <span class="b2">5번 틀렸어요. 1분만 쉬었다 해요.</span>
        <span class="b3">좋아요! 사옥 지구로 안내할게요.</span>
      </div>
      <header class="v14-hud">
        <span class="v14-brand">${F.mark()}CRISTA <small>${F.COPY.sub}</small></span>
        <span class="v14-chip">1일차 · <b>09:00</b></span>
        <span class="v14-chip">연구비 · <b>—</b></span>
        <span class="v14-chip k">학급 · <b>코드 대기</b></span>
      </header>
      <section class="v14-win" aria-label="입사 서류">
        <div class="v14-tb"><span>입사 서류 · 사옥 지구 출입</span><i class="v14-x" aria-hidden="true"></i></div>
        <div class="v14-body">
          <p class="v14-intro">${F.COPY.lead}.</p>
          ${F.form({ go: { login: "들어가기 ▶", signup: "가입하고 들어가기 ▶" } })}
        </div>
      </section>`,
  });

  /* ── 15 야경 ── */
  const FRONT = [[4, 3], [1, 2], [8, 3], [6, 2], [3, 3], [5, 3]];
  const BACK = [[2, 2], [7, 1], [5, 1], [1, 3], [6, 3], [8, 1], [3, 2], [4, 2]];
  add({
    no: 15, fam: "c", title: "야경", en: "District at Night", swatch: "#10183a",
    caption: "밤 9시 40분의 사옥 지구입니다. 사옥 창마다 불이 켜졌다 꺼지고, 광장 기둥의 LED 띠가 다른 모둠 소식(예시)을 흘리다가 들어가는 순간 내 이름을 띄웁니다.",
    css: `
      .v15 { background: #070b1d; color: #f1f1e9; }
      .v15-sky { position: absolute; inset: 0; background:
          radial-gradient(1.2px 1.2px at 22px 34px, rgba(255,255,255,.9), transparent 60%),
          radial-gradient(1px 1px at 140px 90px, rgba(255,255,255,.7), transparent 60%),
          radial-gradient(1.4px 1.4px at 210px 18px, rgba(255,255,255,.8), transparent 60%),
          radial-gradient(1px 1px at 80px 150px, rgba(205,234,255,.6), transparent 60%) 0 0 / 260px 200px,
          linear-gradient(180deg, #060a1a 0%, #0e1636 48%, #262150 78%, #3a2a55 100%); }
      .v15-sky::after { content: ""; position: absolute; inset: 0; background: radial-gradient(1px 1px at 60px 60px, #fff, transparent 60%) 0 0 / 190px 170px; opacity: .5; animation: v15-tw 5s steps(2) infinite; }
      @keyframes v15-tw { 50% { opacity: .1; } }
      .v15-moon { position: absolute; right: 24cqw; top: 3.5cqh; width: 74px; height: 74px; border-radius: 50%;
        background: radial-gradient(circle at 36% 34%, #fbfbf6, #e3e0cf 72%); box-shadow: 0 0 70px 12px rgba(205,234,255,.16); }
      .v15-moon::after { content: ""; position: absolute; inset: -10px; border-radius: 50%; opacity: .32; filter: blur(2px);
        background: conic-gradient(from 40deg, #ffd3ea, #cdeaff, #e4ffc0, #ffe2c2, #e6d4ff, #ffd3ea);
        -webkit-mask: radial-gradient(circle, transparent 62%, #000 64%, #000 70%, transparent 72%); mask: radial-gradient(circle, transparent 62%, #000 64%, #000 70%, transparent 72%); }
      .v15-back { position: absolute; left: -40px; right: -40px; bottom: 150px; display: flex; justify-content: space-between; align-items: flex-end; filter: brightness(.62) saturate(.7); }
      .v15-back img { width: 192px; height: 192px; image-rendering: pixelated; }
      .v15-front { position: absolute; left: -24px; right: -24px; bottom: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
      .v15-b { position: relative; width: 288px; height: 288px; flex: none; }
      .v15-b img { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; }
      .v15-b img + img { animation: v15-lights var(--d, 9s) steps(1) infinite; animation-delay: var(--dl, 0s); }
      @keyframes v15-lights { 0%, 100% { opacity: 1; } 46% { opacity: 0; } }
      .v15-b::after { content: ""; position: absolute; left: 10%; right: 10%; bottom: 6px; height: 40%; background: radial-gradient(closest-side, rgba(255,211,107,.16), transparent); pointer-events: none; }
      .v15-ground { position: absolute; left: 0; right: 0; bottom: 0; height: 64px; border-top: 2px solid #2a2f45;
        background: repeating-linear-gradient(90deg, transparent 0 46px, rgba(255,255,255,.04) 46px 48px), linear-gradient(#141a26, #0a0d14); }
      .v15-ground::before, .v15-ground::after { content: ""; position: absolute; top: -40px; width: 220px; height: 90px; background: radial-gradient(closest-side, rgba(255,190,90,.22), transparent); }
      .v15-ground::before { left: 18%; } .v15-ground::after { left: 63%; }
      .v15-pillar { position: absolute; z-index: 2; right: 6cqw; top: 14cqh; bottom: 40px; width: min(560px, 42cqw); display: flex; flex-direction: column; align-items: center; }
      .v15-led { width: 100%; height: 50px; flex: none; overflow: hidden; background: #0b0d0a; border: 2px solid #2b2f2a; box-shadow: 0 0 0 4px #15171f, 0 10px 40px rgba(0,0,0,.6); display: flex; align-items: center;
        -webkit-mask-image: linear-gradient(90deg, transparent, #000 18px, #000 calc(100% - 18px), transparent); mask-image: linear-gradient(90deg, transparent, #000 18px, #000 calc(100% - 18px), transparent); }
      .v15-track { display: none; width: max-content; animation: v15-mq 36s linear infinite; }
      .v15-track.okt, .v15-track.lockt { animation-duration: 18s; }
      .v15[data-msg="none"] .idle, .v15[data-msg="bad"] .idle, .v15[data-msg="ok"] .okt, .v15[data-msg="lock"] .lockt { display: flex; }
      @keyframes v15-mq { to { transform: translateX(-50%); } }
      .v15-seg { display: flex; align-items: center; gap: 30px; padding-right: 30px; }
      .v15-seg b { font-family: var(--mono); font-weight: 600; font-size: 20px; letter-spacing: .06em; white-space: nowrap; color: #ffb21a; text-shadow: 0 0 8px rgba(255,178,26,.55);
        -webkit-mask-image: radial-gradient(circle, #000 1px, transparent 1.4px); -webkit-mask-size: 3px 3px; mask-image: radial-gradient(circle, #000 1px, transparent 1.4px); mask-size: 3px 3px; }
      .v15-seg b.g { color: #8dff5a; text-shadow: 0 0 8px rgba(141,255,90,.5); }
      .v15-seg b.r { color: #ff5a3c; text-shadow: 0 0 8px rgba(255,90,60,.55); }
      .v15-seg b.w { color: #f1f1e9; text-shadow: 0 0 8px rgba(241,241,233,.4); }
      .v15-pole { flex: 1; width: 12px; background: linear-gradient(90deg, #1c1f2c, #2c3042 50%, #1c1f2c); border-inline: 1px solid #0a0b10; }
      .v15-pole::after { content: ""; display: block; width: 44px; height: 14px; margin: 0 auto; transform: translate(-16px, 0); }
      .v15-tag { position: absolute; top: 58px; right: 0; font-family: var(--mono); font-size: 10px; letter-spacing: .12em; color: rgba(241,241,233,.45); }
      .v15-panel { position: absolute; z-index: 5; left: clamp(16px, 6cqw, 104px); top: 50%; transform: translateY(-50%); width: min(424px, 38cqw); max-height: calc(100% - 48px); overflow-y: auto;
        padding: 26px 26px 24px; display: grid; gap: 16px; background: rgba(8,11,9,.62); border: 1px solid rgba(241,241,233,.2);
        -webkit-backdrop-filter: blur(14px) saturate(1.2); backdrop-filter: blur(14px) saturate(1.2); box-shadow: 0 30px 80px rgba(0,0,0,.45); }
      .v15-kick { margin: 0; display: flex; align-items: center; gap: 10px; font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #ffd36b; }
      .v15-kick::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #ffd36b; box-shadow: 0 0 10px #ffb21a; }
      .v15 .wm { font-size: 54px; color: #f1f1e9; }
      .v15-lead { margin: -4px 0 0; font-size: 15px; line-height: 1.55; color: rgba(241,241,233,.72); text-wrap: balance; }
      .v15[data-mode="signup"] .v15-lead { display: none; }
      .v15 .f { gap: 14px; }
      .v15[data-mode="signup"] .v15-kick { display: none; }
      .v15 .f-tab { border-color: rgba(241,241,233,.28); color: rgba(241,241,233,.7); }
      .v15 .f-tab[aria-selected="true"] { background: #f1f1e9; color: #080b09; border-color: #f1f1e9; }
      .v15 .f-fields { gap: 12px; }
      .v15 .f-lab { font-family: var(--mono); font-size: 10.5px; font-weight: 500; letter-spacing: .08em; color: rgba(241,241,233,.6); }
      .v15 .f-inp { background: rgba(241,241,233,.06); border-color: rgba(241,241,233,.24); color: #f1f1e9; }
      .v15 .f-inp:focus { border-color: #c6ff4a; background: rgba(241,241,233,.1); }
      .v15 .f-go { background: #c6ff4a; color: #080b09; }
      .v15 .f-hint { opacity: 1; color: rgba(241,241,233,.6); }
      .v15 .f-msg[data-kind="bad"] { background: rgba(255,90,60,.12); border-color: #ff5a3c; color: #ffb4a6; }
      .v15 .f-msg[data-kind="lock"] { background: rgba(255,178,26,.12); border-color: #ffb21a; color: #ffd38a; }
      .v15 .f-msg[data-kind="ok"] { background: rgba(198,255,74,.14); border-color: #c6ff4a; color: #e4ffb0; }
      @container scr (max-width: 760px) {
        .v15-front { bottom: 48px; left: -60px; right: -60px; }
        .v15-b { width: 192px; height: 192px; }
        .v15-b:nth-child(n+4) { display: none; }
        .v15-back { bottom: 110px; }
        .v15-back img { width: 96px; height: 96px; }
        .v15-ground { height: 52px; }
        .v15-moon { right: 18px; top: 72px; width: 44px; height: 44px; }
        .v15-pillar { left: 12px; right: 12px; top: 12px; bottom: auto; width: auto; }
        .v15-led { height: 40px; }
        .v15-seg b { font-size: 16px; }
        .v15-pole, .v15-tag { display: none; }
        .v15-panel { left: 12px; right: 12px; top: 64px; transform: none; width: auto; max-height: calc(100% - 76px); padding: 20px 18px; }
        .v15 .wm { font-size: 40px; }
      }`,
    html: (F) => {
      const seg = (items) => `<div class="v15-seg">${items}</div>`;
      const idle = `<b class="w">예시 소식</b><b>세움제약 1.2 화합물 스크리닝 통과 ▲12%</b><b class="g">다온바이오 2.1 분자 도킹 −9.8 kcal/mol</b><b>미르파마 3.3 제형 · IND 제출</b><b class="r">새봄랩 연구비 −0.4M</b><b class="w">불 켜진 사옥 6곳</b>`;
      const ok = `<b class="g">하늘님 입장</b><b class="g">▸ 사옥 지구로 갑니다</b><b class="w">우리 모둠 사옥을 찾아보세요</b>`;
      const lock = `<b class="r">출입 잠금</b><b class="r">▸ 비밀번호 5번 틀림</b><b>1분 뒤 다시</b>`;
      const front = FRONT.map(([f, t], i) => `<div class="v15-b" style="--d:${7 + (i % 3) * 2.5}s;--dl:${-i * 1.7}s">${img(night(f, t, 11 + i * 7, 0.6))}${img(night(f, t, 12 + i * 7, 0.45))}</div>`).join("");
      const back = BACK.map(([f, t], i) => img(night(f, t, 90 + i * 5, 0.35), "", 192)).join("");
      return `
      <div class="v15-sky" aria-hidden="true"><i class="v15-moon"></i></div>
      <div class="v15-back" aria-hidden="true">${back}</div>
      <div class="v15-front" aria-hidden="true">${front}</div>
      <div class="v15-ground" aria-hidden="true"></div>
      <div class="v15-pillar" aria-hidden="true">
        <div class="v15-led">
          <div class="v15-track idle">${seg(idle)}${seg(idle)}</div>
          <div class="v15-track okt">${seg(ok)}${seg(ok)}</div>
          <div class="v15-track lockt">${seg(lock)}${seg(lock)}</div>
        </div>
        <span class="v15-tag">광장 LED 기둥 · 다른 모둠 소식</span>
        <i class="v15-pole"></i>
      </div>
      <section class="v15-panel" aria-label="로그인">
        <p class="v15-kick">21:40 · 사옥 지구 야간 출입</p>
        ${F.word()}
        <p class="v15-lead">${F.COPY.lead}. 불 켜진 사옥마다 한 모둠이 실험 중이에요.</p>
        ${F.form({ peek: true })}
      </section>`;
    },
  });

  /* ── 16 공사 가림막 ── */
  add({
    no: 16, fam: "c", title: "공사 가림막", en: "Site Hoarding", swatch: "#c6ff4a",
    caption: "이름을 정하기 전 사옥 부지의 공사 가림막입니다. 건축허가표지 옆 '○모둠 사옥 · 입주 3/4' 팻말 너머로, 로그인 칸은 현장 출입 안내판이 되어 경광등이 상태를 알려 줍니다.",
    css: `
      .v16 { --fence: 30cqh; background: #f1f1e9; }
      .v16-sky { position: absolute; left: 0; right: 0; top: 0; height: calc(var(--fence) + 40px); overflow: hidden;
        background: linear-gradient(180deg, #e9ecef 0%, #f1f1e9 100%); }
      .v16-crane { position: absolute; left: 6cqw; top: 4cqh; width: 52cqw; height: calc(var(--fence) + 20px - 4cqh); }
      .v16-crane .mast { position: absolute; left: 14%; top: 0; bottom: 0; width: 26px; border-inline: 2px solid #080b09;
        background: repeating-linear-gradient(45deg, transparent 0 11px, #080b09 11px 13px), repeating-linear-gradient(-45deg, transparent 0 11px, rgba(8,11,9,.5) 11px 12px); }
      .v16-crane .jib { position: absolute; left: 0; right: 0; top: 18px; height: 20px; border-block: 2px solid #080b09;
        background: repeating-linear-gradient(60deg, transparent 0 14px, #080b09 14px 16px); }
      .v16-crane .cw { position: absolute; left: 2%; top: 38px; width: 9%; height: 26px; background: #c6ff4a; border: 2px solid #080b09; }
      .v16-crane .cab { position: absolute; left: calc(14% - 6px); top: 38px; width: 38px; height: 28px; background: #080b09; }
      .v16-crane .cable { position: absolute; left: 78%; top: 38px; width: 2px; height: 44%; background: #080b09; animation: v16-sway 6s ease-in-out infinite alternate; transform-origin: 50% 0; }
      .v16-crane .load { position: absolute; left: calc(78% - 46px); top: calc(38px + 44%); padding: 6px 10px; background: #080b09; color: #c6ff4a; font-family: var(--mono); font-size: 12px; letter-spacing: .1em;
        animation: v16-sway 6s ease-in-out infinite alternate; transform-origin: 50% -100px; white-space: nowrap; }
      @keyframes v16-sway { from { transform: rotate(-1.2deg); } to { transform: rotate(1.2deg); } }
      .v16-peek { position: absolute; left: 30cqw; right: 2cqw; top: calc(var(--fence) - 190px); display: flex; justify-content: space-around; }
      .v16-peek .hq { --hq: 288px; position: relative; }
      .v16-peek span { position: relative; display: block; }
      .v16-peek span::after { content: ""; position: absolute; inset: 20% 8% 0; border: 2px solid rgba(8,11,9,.5);
        background: repeating-linear-gradient(90deg, rgba(8,11,9,.42) 0 2px, transparent 2px 36px), repeating-linear-gradient(0deg, rgba(8,11,9,.42) 0 2px, transparent 2px 36px); }
      .v16-fence { position: absolute; left: 0; right: 0; top: var(--fence); bottom: 0; background:
          repeating-linear-gradient(90deg, rgba(8,11,9,.1) 0 2px, transparent 2px 240px), linear-gradient(#fbfbf6, #f1f1e9); border-top: 2px solid #080b09; }
      .v16-band { position: absolute; left: 0; right: 0; height: 26px; background: repeating-linear-gradient(-45deg, #080b09 0 20px, #c6ff4a 20px 40px); }
      .v16-band.top { top: 0; border-bottom: 2px solid #080b09; }
      .v16-band.bot { bottom: 0; height: 18px; border-top: 2px solid #080b09; }
      .v16-lamps { position: absolute; left: 0; right: 0; top: -18px; display: flex; justify-content: space-around; padding: 0 8cqw; pointer-events: none; z-index: 2; }
      .v16-lamps i { width: 22px; height: 22px; border-radius: 50% 50% 4px 4px; background: #ffb21a; border: 2px solid #080b09; box-shadow: 0 0 14px rgba(255,178,26,.8); animation: v16-blink 1.2s steps(1) infinite; }
      .v16-lamps i:nth-child(even) { animation-delay: -.6s; }
      @keyframes v16-blink { 50% { background: #6e4b0a; box-shadow: none; } }
      .v16[data-msg="bad"] .v16-lamps i { background: #ff4a2a; box-shadow: 0 0 14px rgba(255,74,42,.9); animation-duration: .5s; }
      .v16[data-msg="lock"] .v16-lamps i { background: #ff4a2a; box-shadow: 0 0 16px rgba(255,74,42,.9); animation: none; }
      .v16[data-msg="ok"] .v16-lamps i { background: #c6ff4a; box-shadow: 0 0 16px rgba(198,255,74,.9); animation: none; }
      .v16-left { position: absolute; left: 5cqw; top: calc(26px + 34px); bottom: 50px; width: min(520px, 38cqw); display: flex; flex-direction: column; gap: 22px; min-height: 0; }
      .v16-brand { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
      .v16 .wm { font-size: 40px; }
      .v16-bs { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; color: #5b6358; }
      .v16-permit { background: #fff; border: 2px solid #080b09; flex: none; }
      .v16-permit h3 { margin: 0; padding: 9px 12px; text-align: center; font-size: 17px; letter-spacing: .5em; background: #2a4f9a; color: #fff; border-bottom: 2px solid #080b09; }
      .v16-permit dl { margin: 0; display: grid; grid-template-columns: 108px minmax(0, 1fr); font-size: 13px; }
      .v16-permit dt, .v16-permit dd { margin: 0; padding: 6px 10px; border-bottom: 1px solid rgba(8,11,9,.2); }
      .v16-permit dt { background: #e7e8de; font-weight: 600; border-right: 1px solid rgba(8,11,9,.2); }
      .v16-permit dd b { font-family: var(--mono); font-weight: 600; }
      .v16-permit dl > :nth-last-child(-n+2) { border-bottom: 0; }
      .v16-move { display: flex; align-items: center; gap: 18px; padding: 14px 18px; background: #080b09; color: #f1f1e9; border: 2px solid #080b09; flex: none; }
      .v16-move p { margin: 0; }
      .v16-move .big { font-family: var(--poster); font-size: 36px; line-height: 1; letter-spacing: -.01em; }
      .v16-move .sm { font-size: 13px; color: rgba(241,241,233,.7); margin-top: 6px; }
      .v16-move .n { font-family: var(--mono); color: #c6ff4a; font-weight: 600; }
      .v16-slots { margin-left: auto; display: flex; gap: 6px; }
      .v16-slots span { width: 52px; height: 72px; display: grid; place-items: end center; border: 2px solid rgba(241,241,233,.4); background: #1a2118; overflow: hidden; }
      .v16-slots span.empty { border-style: dashed; place-items: center; font-family: var(--mono); color: rgba(241,241,233,.5); font-size: 18px; background: transparent; }
      .v16-slots .wk { animation-duration: 2s; }
      .v16-gate { position: absolute; z-index: 3; right: 5cqw; top: 9cqh; width: min(452px, 36cqw); max-height: calc(100% - 9cqh - 30px); display: flex; flex-direction: column;
        background: #fbfbf6; border: 3px solid #080b09; box-shadow: 10px 10px 0 rgba(8,11,9,.16); }
      .v16-gate::before, .v16-gate::after { content: ""; position: absolute; top: 100%; width: 14px; height: 30px; background: #5b6358; border: 2px solid #080b09; border-top: 0; }
      .v16-gate::before { left: 18%; } .v16-gate::after { right: 18%; }
      .v16-gh { flex: none; display: flex; align-items: center; gap: 12px; padding: 12px 18px; background: #080b09; color: #f1f1e9; }
      .v16-gh b { font-size: 20px; color: #c6ff4a; letter-spacing: -.01em; white-space: nowrap; }
      .v16-gh span { font-size: 12.5px; color: rgba(241,241,233,.72); line-height: 1.4; }
      .v16-gs { flex: none; height: 8px; background: repeating-linear-gradient(-45deg, #080b09 0 8px, #c6ff4a 8px 16px); }
      .v16-gb { padding: 18px 20px 20px; overflow-y: auto; min-height: 0; }
      .v16 .f { gap: 14px; }
      .v16 .f-tab, .v16 .f-tab + .f-tab { border: 2px solid #080b09; font-weight: 700; }
      .v16 .f-tab + .f-tab { border-left: 0; }
      .v16 .f-tab[aria-selected="true"] { background: #c6ff4a; color: #080b09; border-color: #080b09; }
      .v16 .f-fields { gap: 12px; }
      .v16 .f-lab { font-size: 12.5px; font-weight: 700; }
      .v16 .f-inp { background: #fff; border: 2px solid #080b09; min-height: 46px; }
      .v16 .f-inp:focus { box-shadow: 0 0 0 3px #c6ff4a; }
      .v16 .f-go { background: #080b09; color: #c6ff4a; min-height: 52px; font-size: 16px; justify-content: space-between; }
      .v16 .f-go::after { content: "→"; color: #f1f1e9; }
      .v16 .f-go.busy::after { content: ""; }
      .v16 .f-hint { opacity: 1; color: #5b6358; }
      .v16 .f-msg, .v16 .f-msg[data-kind] { border: 2px solid #080b09; color: #080b09; padding-left: 30px; position: relative; }
      .v16 .f-msg::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 18px; }
      .v16 .f-msg[data-kind="bad"] { background: #fff8d6; }
      .v16 .f-msg[data-kind="bad"]::before { background: repeating-linear-gradient(-45deg, #080b09 0 5px, #f5c800 5px 10px); }
      .v16 .f-msg[data-kind="lock"] { background: #ffe4dc; color: #8a1a08; }
      .v16 .f-msg[data-kind="lock"]::before { background: repeating-linear-gradient(-45deg, #c8260e 0 5px, #fff 5px 10px); }
      .v16 .f-msg[data-kind="ok"] { background: #c6ff4a; }
      .v16 .f-msg[data-kind="ok"]::before { background: #080b09; }
      .v16-slogan { position: absolute; right: 5cqw; bottom: 46px; margin: 0; text-align: right; font-family: var(--poster); font-size: clamp(30px, 3.4cqw, 52px); line-height: 1.12; color: rgba(8,11,9,.1); pointer-events: none; }
      .v16-slogan b { font-weight: 400; color: rgba(8,11,9,.82); }
      @container scr (max-height: 800px) {
        .v16-slogan { display: none; }
        .v16[data-mode="signup"] .v16-gate { top: 3cqh; max-height: calc(100% - 3cqh - 24px); }
        .v16[data-mode="signup"] .v16-gh span { display: none; }
        .v16[data-mode="signup"] .v16-gh { padding: 9px 18px; }
        .v16[data-mode="signup"] .v16-gb { padding: 14px 18px 16px; }
        .v16[data-mode="signup"] .f-inp { min-height: 40px; padding-block: 7px; }
        .v16-permit dl > .x { display: none; }
        .v16-left { gap: 14px; }
      }
      @container scr (max-width: 1100px) {
        .v16-move .big { font-size: 28px; }
        .v16-slots span { width: 40px; height: 56px; }
      }
      @container scr (max-width: 760px) {
        .v16 > * { --fence: 132px; }
        .v16-crane { left: 12px; width: 70%; top: 10px; height: 136px; }
        .v16-crane .load { font-size: 10px; }
        .v16-peek { left: 30%; top: 38px; }
        .v16-peek .hq { --hq: 96px; }
        .v16-peek span:nth-child(n+3) { display: none; }
        .v16-lamps { padding: 0 20px; }
        .v16-left { left: 12px; right: 12px; width: auto; top: auto; bottom: 30px; }
        .v16-brand, .v16-permit, .v16-slogan { display: none; }
        .v16-move { padding: 10px 12px; }
        .v16-move .big { font-size: 22px; }
        .v16-move .sm { display: none; }
        .v16-slots span { width: 34px; height: 46px; }
        .v16-slots .wk { transform: scale(.75); transform-origin: 50% 100%; }
        .v16-gate { left: 12px; right: 12px; width: auto; top: 92px; max-height: calc(100% - 92px - 112px); }
        .v16[data-mode="signup"] .v16-gate { max-height: calc(100% - 104px); }
        .v16[data-mode="signup"] .v16-left { display: none; }
        .v16-gate::before, .v16-gate::after { display: none; }
        .v16-gh { padding: 10px 14px; }
        .v16-gh span { display: none; }
        .v16-gb { padding: 14px; }
      }`,
    html: (F) => `
      <div class="v16-sky" aria-hidden="true">
        <div class="v16-peek"><span>${F.hq(3, 1)}</span><span>${F.hq(5, 2)}</span><span>${F.hq(7, 1)}</span></div>
        <div class="v16-crane"><i class="mast"></i><i class="jib"></i><i class="cw"></i><i class="cab"></i><i class="cable"></i><span class="load">간판 · 이름 정하면 겁니다</span></div>
      </div>
      <div class="v16-fence">
        <div class="v16-band top"></div>
        <div class="v16-lamps" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="v16-left">
          <div class="v16-brand">${F.word()}<span class="v16-bs">사옥 지구 조성 사업 · ${F.COPY.sub}</span></div>
          <section class="v16-permit" aria-label="건축허가표지(예시)">
            <h3>건축허가표지</h3>
            <dl>
              <dt>건축물 용도</dt><dd>연구소 · 스타트업 제약회사 사옥</dd>
              <dt>공사명</dt><dd>○모둠 사옥 신축 공사</dd>
              <dt class="x">대지 위치</dt><dd class="x">사옥 지구 3번 부지 · ${F.facade(3)}</dd>
              <dt>공사 기간</dt><dd>학급 코드를 받은 날 ~ 스타트업 이름을 정한 날</dd>
              <dt class="x">건축주</dt><dd class="x">○모둠 (모둠원 <b>3</b>/4)</dd>
              <dt>시공자</dt><dd>CRISTA ${F.COPY.sub}</dd>
            </dl>
          </section>
          <section class="v16-move" aria-label="입주 현황">
            <div><p class="big">○모둠 사옥</p><p class="sm">입주 <span class="n">3/4</span> · 이름을 정하면 가림막을 걷고 간판을 겁니다</p></div>
            <div class="v16-slots" aria-hidden="true"><span>${F.walker("ceo", "south", 1.5)}</span><span>${F.walker("cso", "south", 1.5)}</span><span>${F.walker("cto", "south", 1.5)}</span><span class="empty">?</span></div>
          </section>
        </div>
        <p class="v16-slogan" aria-hidden="true">우리 모둠 사옥,<br><b>곧 문을 엽니다</b></p>
        <div class="v16-band bot"></div>
      </div>
      <section class="v16-gate" aria-label="현장 출입 안내">
        <header class="v16-gh"><b>출입 안내</b><span>현장에 들어오기 전에 확인을 받으세요. ${F.COPY.lead}.</span></header>
        <div class="v16-gs" aria-hidden="true"></div>
        <div class="v16-gb">${F.form()}</div>
      </section>`,
  });

  /* ── 17 부지 청사진 ── */
  const LOTS = [[1, 1, 8, 5], [11, 1, 8, 5], [21, 1, 8, 5], [31, 1, 8, 5], [1, 20, 8, 5], [11, 20, 7, 5], [22, 20, 7, 5], [31, 20, 8, 5]];
  function drawPlan(g, w, h) {
    const m = 56;
    const tile = Math.max(6, Math.floor(Math.min((w - m * 2) / 40, (h - m * 2) / 26)));
    const mw = tile * 40, mh = tile * 26;
    const ox = Math.round((w - mw) / 2), oy = Math.round((h - mh) / 2) + 6;
    const L = (a) => `rgba(219,232,247,${a})`;
    g.save();
    g.lineWidth = 1;
    for (let i = 0; i <= 40; i++) {
      g.strokeStyle = L(i % 5 ? 0.08 : 0.2);
      g.beginPath(); g.moveTo(ox + i * tile + 0.5, oy); g.lineTo(ox + i * tile + 0.5, oy + mh); g.stroke();
    }
    for (let j = 0; j <= 26; j++) {
      g.strokeStyle = L(j % 5 ? 0.08 : 0.2);
      g.beginPath(); g.moveTo(ox, oy + j * tile + 0.5); g.lineTo(ox + mw, oy + j * tile + 0.5); g.stroke();
    }
    g.strokeStyle = L(0.9); g.lineWidth = 1.5;
    g.strokeRect(ox + 0.5, oy + 0.5, mw, mh);
    const R = (x, y, ww, hh) => [ox + x * tile, oy + y * tile, ww * tile, hh * tile];
    /* 순환 도로 · 입구 길 */
    g.strokeStyle = L(0.7); g.lineWidth = 1.2;
    g.setLineDash([]);
    g.strokeRect(...R(10, 6.5, 20, 13)); g.strokeRect(...R(12, 8.5, 16, 9));
    g.beginPath(); g.moveTo(ox + 19 * tile, oy + 19.5 * tile); g.lineTo(ox + 19 * tile, oy + 26 * tile); g.moveTo(ox + 21 * tile, oy + 19.5 * tile); g.lineTo(ox + 21 * tile, oy + 26 * tile); g.stroke();
    g.setLineDash([tile * 0.6, tile * 0.4]); g.strokeStyle = L(0.35);
    g.strokeRect(...R(11, 7.5, 18, 11));
    g.beginPath(); g.moveTo(ox + 20 * tile, oy + 18.5 * tile); g.lineTo(ox + 20 * tile, oy + 26 * tile); g.stroke();
    g.setLineDash([]);
    /* 광장 · LED 기둥 */
    const cx = ox + 20 * tile, cy = oy + 13 * tile;
    g.strokeStyle = L(0.85); g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, tile * 3.6, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = L(0.3); g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, tile * 2.4, 0, Math.PI * 2); g.stroke();
    for (let a = 0; a < 8; a++) { const t = (a / 8) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(t) * tile * 2.4, cy + Math.sin(t) * tile * 2.4); g.lineTo(cx + Math.cos(t) * tile * 3.6, cy + Math.sin(t) * tile * 3.6); g.stroke(); }
    g.fillStyle = L(0.95);
    g.fillRect(cx - 3, cy - 3, 6, 6);
    g.font = `500 ${Math.max(9, tile * 0.5)}px "IBM Plex Sans KR", sans-serif`;
    g.textAlign = "center"; g.textBaseline = "top";
    g.fillText("광장 · LED 기둥", cx, cy + 8);
    /* 부지 1~8 */
    LOTS.forEach(([x, y, ww, hh], i) => {
      const [rx, ry, rw, rh] = R(x, y, ww, hh);
      g.strokeStyle = L(0.9); g.lineWidth = 1.5; g.strokeRect(rx + 0.5, ry + 0.5, rw, rh);
      const ix = rx + tile, iy = ry + tile * (y < 10 ? 0.8 : 1.2), iw = rw - tile * 2, ih = rh - tile * 2;
      g.save(); g.beginPath(); g.rect(ix, iy, iw, ih); g.clip();
      g.strokeStyle = L(0.28); g.lineWidth = 1;
      for (let k = -ih; k < iw; k += 7) { g.beginPath(); g.moveTo(ix + k, iy + ih); g.lineTo(ix + k + ih, iy); g.stroke(); }
      g.restore();
      g.strokeStyle = L(0.8); g.strokeRect(ix + 0.5, iy + 0.5, iw, ih);
      const dx = rx + rw / 2, dy = y < 10 ? ry + rh : ry;
      g.fillStyle = "#10305a"; g.fillRect(dx - tile * 0.6, dy - 2, tile * 1.2, 4);
      g.fillStyle = L(0.95);
      g.font = `600 ${Math.max(10, tile * 0.6)}px "IBM Plex Mono", monospace`; g.textAlign = "left"; g.textBaseline = "top";
      g.fillText(String(i + 1).padStart(2, "0"), rx + 5, ry + 4);
      g.font = `500 ${Math.max(9, tile * 0.48)}px "IBM Plex Sans KR", sans-serif`; g.textBaseline = "bottom";
      g.fillStyle = L(0.7);
      g.fillText(F.facade(i + 1), rx + 5, ry + rh - 3);
    });
    /* 입구 */
    g.fillStyle = L(0.95); g.textAlign = "center"; g.textBaseline = "top";
    g.font = `600 ${Math.max(10, tile * 0.55)}px "IBM Plex Sans KR", sans-serif`;
    g.beginPath(); g.moveTo(cx, oy + mh - tile * 2.2); g.lineTo(cx - tile * 0.6, oy + mh - tile * 1.2); g.lineTo(cx + tile * 0.6, oy + mh - tile * 1.2); g.closePath(); g.fill();
    g.fillText("입구", cx, oy + mh + 6);
    /* 치수선 */
    g.strokeStyle = L(0.75); g.fillStyle = L(0.85); g.lineWidth = 1;
    const ty = oy - 22;
    g.beginPath(); g.moveTo(ox, ty); g.lineTo(ox + mw, ty); g.moveTo(ox, ty - 6); g.lineTo(ox, ty + 6); g.moveTo(ox + mw, ty - 6); g.lineTo(ox + mw, ty + 6); g.stroke();
    g.font = `500 11px "IBM Plex Mono", monospace`; g.textBaseline = "bottom";
    g.fillText("40 타일 · 1,280 px", ox + mw / 2, ty - 4);
    const lx = ox - 22;
    g.beginPath(); g.moveTo(lx, oy); g.lineTo(lx, oy + mh); g.moveTo(lx - 6, oy); g.lineTo(lx + 6, oy); g.moveTo(lx - 6, oy + mh); g.lineTo(lx + 6, oy + mh); g.stroke();
    g.save(); g.translate(lx - 6, oy + mh / 2); g.rotate(-Math.PI / 2); g.textBaseline = "bottom"; g.fillText("26 타일 · 832 px", 0, 0); g.restore();
    /* 방위 · 축척 막대 */
    const nx = ox + mw - 4, ny = oy - 40;
    g.textAlign = "right"; g.textBaseline = "bottom"; g.font = `600 12px "IBM Plex Mono", monospace`;
    g.fillText("N ↑", nx, ny + 12);
    const sx = ox, sy = oy + mh + 26;
    g.textAlign = "left"; g.textBaseline = "middle"; g.font = `500 10px "IBM Plex Mono", monospace`;
    for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? "transparent" : L(0.85); g.fillRect(sx + k * tile, sy - 3, tile, 6); }
    g.strokeRect(sx + 0.5, sy - 2.5, tile * 5, 6);
    g.fillStyle = L(0.85); g.fillText("0 — 5 타일 · 160 px", sx + tile * 5 + 8, sy);
    g.restore();
    return { tile, ox, oy, mw, mh };
  }
  add({
    no: 17, fam: "c", title: "부지 청사진", en: "Site Blueprint", swatch: "#10305a",
    caption: "사옥 지구 배치도(40×26 타일 · 32px) 청사진 위에서 로그인 칸이 도면 표제란이 됩니다. 아이디를 쓰면 작성자 칸이 바로 바뀌고, 입구에서 부지로 가는 길이 차례로 그려집니다.",
    css: `
      .v17 { background: #10305a; color: #e6f0fb;
        background-image: radial-gradient(rgba(219,232,247,.05) 1px, transparent 1px); background-size: 6px 6px; }
      .v17-sheet { position: absolute; inset: 22px; display: grid; grid-template-columns: minmax(0, 1fr) min(420px, 34cqw);
        border: 1.5px solid rgba(219,232,247,.85); box-shadow: 0 0 0 6px #10305a, 0 0 0 7px rgba(219,232,247,.35); }
      .v17-draw { position: relative; min-width: 0; min-height: 0; display: flex; flex-direction: column; border-right: 1.5px solid rgba(219,232,247,.85); }
      .v17-plan { position: relative; flex: 1; min-height: 0; }
      .v17-elev { flex: none; display: flex; justify-content: center; gap: 10px; padding: 12px 16px 14px; border-top: 1px solid rgba(219,232,247,.4); }
      .v17-elev figure { margin: 0; display: grid; justify-items: center; gap: 2px; font-family: var(--mono); font-size: 10px; color: rgba(230,240,251,.7); }
      .v17-elev img { width: 72px; height: 72px; }
      .v17-elev-t { position: absolute; left: 16px; bottom: 98px; font-family: var(--mono); font-size: 10px; letter-spacing: .12em; color: rgba(230,240,251,.6); }
      .v17-corner { position: absolute; left: 16px; top: 12px; font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em; color: rgba(230,240,251,.7); }
      .v17-tb { position: relative; display: flex; flex-direction: column; min-height: 0; overflow-y: auto; background: rgba(6,22,46,.38); }
      .v17-tbh { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; padding: 18px 16px 14px; border-bottom: 1.5px solid rgba(219,232,247,.85); }
      .v17 .wm { font-size: 34px; color: #f4f8fd; }
      .v17-no { display: grid; text-align: right; font-family: var(--mono); font-size: 10px; letter-spacing: .1em; color: rgba(230,240,251,.6); }
      .v17-no b { font-size: 20px; color: #fff; letter-spacing: .04em; font-weight: 600; }
      .v17-meta { margin: 0; }
      .v17-meta > div { display: grid; grid-template-columns: 96px minmax(0, 1fr); border-bottom: 1px solid rgba(219,232,247,.32); }
      .v17-meta dt, .v17 .f-lab { font-family: var(--mono); font-size: 10px; font-weight: 500; letter-spacing: .1em; color: rgba(230,240,251,.62); padding: 0 12px; display: flex; align-items: center; border-right: 1px solid rgba(219,232,247,.32); min-height: 40px; }
      .v17-meta dd { margin: 0; padding: 9px 12px; font-size: 13px; }
      .v17 .f { gap: 0; }
      .v17 .f-tabs { order: 1; display: grid; grid-template-columns: 96px 1fr 1fr; border-bottom: 1px solid rgba(219,232,247,.32); }
      .v17 .f-tabs::before { content: "구분"; font-family: var(--mono); font-size: 10px; letter-spacing: .1em; color: rgba(230,240,251,.62); padding: 0 12px; display: flex; align-items: center; border-right: 1px solid rgba(219,232,247,.32); }
      .v17 .f-tab, .v17 .f-tab + .f-tab { border: 0; border-right: 1px solid rgba(219,232,247,.2); background: transparent; color: rgba(230,240,251,.62); text-align: left; padding: 11px 12px; font-weight: 500; font-size: 13px; }
      .v17 .f-tab::before { content: "□ "; font-family: var(--mono); }
      .v17 .f-tab[aria-selected="true"] { background: rgba(198,255,74,.1); color: #fff; border-color: rgba(219,232,247,.2); }
      .v17 .f-tab[aria-selected="true"]::before { content: "■ "; color: #c6ff4a; }
      .v17 .f-fields { order: 2; gap: 0; }
      .v17 .f-fld { grid-template-columns: 96px minmax(0, 1fr); gap: 0; border-bottom: 1px solid rgba(219,232,247,.32); }
      .v17 .f-inp { border: 0; background: transparent; color: #fff; font-family: var(--mono); min-height: 44px; }
      .v17 .f-inp:focus { background: rgba(198,255,74,.08); box-shadow: inset 3px 0 0 #c6ff4a; }
      .v17 .f-inp::placeholder { font-family: var(--sans); font-size: 12.5px; }
      .v17-foot { order: 3; margin: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-bottom: 1.5px solid rgba(219,232,247,.85); }
      .v17-foot > div { padding: 8px 12px 10px; border-right: 1px solid rgba(219,232,247,.32); min-width: 0; }
      .v17-foot > div:last-child { border-right: 0; }
      .v17-foot dt { font-family: var(--mono); font-size: 9.5px; letter-spacing: .1em; color: rgba(230,240,251,.55); }
      .v17-foot dd { margin: 3px 0 0; font-family: var(--mono); font-size: 13px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .v17-who { color: #c6ff4a; }
      .v17 .f-msg { order: 4; margin: 12px 12px 0; }
      .v17 .f-msg[data-kind] { background: transparent; border: 1px dashed currentColor; }
      .v17 .f-msg[data-kind="bad"] { color: #ffab9c; }
      .v17 .f-msg[data-kind="lock"] { color: #ffd27a; }
      .v17 .f-msg[data-kind="ok"] { color: #c6ff4a; }
      .v17 .f-go { order: 5; margin: 14px 12px 0; min-height: 50px; background: transparent; border: 2px solid #c6ff4a; color: #c6ff4a; font-family: var(--mono); font-weight: 600; letter-spacing: .04em; justify-content: space-between; padding: 0 16px; }
      .v17 .f-go::after { content: "→"; }
      .v17 .f-go.busy::after { content: ""; }
      .v17 .f-go:hover:not(:disabled) { background: #c6ff4a; color: #10305a; }
      .v17 .f-hint { order: 6; margin: 12px 12px 16px; opacity: 1; color: rgba(230,240,251,.62); font-size: 12px; }
      .v17-stamp { position: absolute; right: 22px; top: 86px; z-index: 2; display: none; place-items: center; width: 108px; height: 108px; border-radius: 50%; border: 3px double #c6ff4a; color: #c6ff4a;
        font-family: var(--mono); font-weight: 600; font-size: 12px; text-align: center; line-height: 1.3; transform: rotate(-14deg); background: rgba(16,48,90,.6); }
      .v17[data-msg="ok"] .v17-stamp { display: grid; animation: v17-stamp .4s cubic-bezier(.2,1.6,.4,1) both; }
      @keyframes v17-stamp { from { transform: rotate(-14deg) scale(2); opacity: 0; } }
      @container scr (max-width: 760px) {
        .v17-sheet { inset: 10px; grid-template-columns: 1fr; grid-template-rows: 34cqh minmax(0, 1fr); box-shadow: none; }
        .v17-draw { border-right: 0; border-bottom: 1.5px solid rgba(219,232,247,.85); }
        .v17-elev, .v17-elev-t { display: none; }
        .v17 .wm { font-size: 28px; }
        .v17-meta > div:nth-child(2) { display: none; }
        .v17[data-mode="signup"] .v17-sheet { grid-template-rows: 18cqh minmax(0, 1fr); }
        .v17-stamp { top: 64px; right: 14px; width: 86px; height: 86px; font-size: 10px; }
      }`,
    html: (F) => {
      const d = new Date();
      const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      const elev = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<figure>${img(blue(n, n % 3 === 0 ? 3 : n % 2 ? 2 : 1), "", 72)}<figcaption>${String(n).padStart(2, "0")}</figcaption></figure>`).join("");
      return `
      <div class="v17-sheet">
        <div class="v17-draw">
          <div class="v17-plan"><span class="v17-corner">A-101 배치도 · 사옥 지구</span></div>
          <span class="v17-elev-t">남측 입면 E-1 · 외관 8종</span>
          <div class="v17-elev" aria-hidden="true">${elev}</div>
        </div>
        <aside class="v17-tb" aria-label="도면 표제란">
          <div class="v17-tbh">${F.word()}<span class="v17-no">도면 번호<b>A-101</b></span></div>
          <dl class="v17-meta">
            <div><dt>공사명</dt><dd>사옥 지구 조성 · 모둠 2~8</dd></div>
            <div><dt>도면명</dt><dd>배치도 · 출입 등록</dd></div>
          </dl>
          ${F.form({ go: { login: "승인 · 들어가기", signup: "승인 · 가입하고 들어가기" },
            after: `<dl class="v17-foot"><div><dt>작성자</dt><dd class="v17-who">${F.DEMO.id}</dd></div><div><dt>축척</dt><dd>1 : 32</dd></div><div><dt>일자</dt><dd>${date}</dd></div></dl>` })}
          <span class="v17-stamp" aria-hidden="true">승인<br>APPROVED<br>A-101</span>
        </aside>
      </div>`;
    },
    mount(root, ctx) {
      const plan = root.querySelector(".v17-plan");
      const cv = ctx.canvas(plan);
      let cache = null, geo = null, key = "";
      ctx.loop((t) => {
        const { g, w, h, r, c } = cv;
        if (!w || !h) return;
        const k = `${c.width}x${c.height}`;
        if (k !== key) {
          key = k;
          cache = document.createElement("canvas");
          cache.width = c.width; cache.height = c.height;
          const og = cache.getContext("2d");
          og.setTransform(r, 0, 0, r, 0, 0);
          geo = drawPlan(og, w, h);
        }
        g.clearRect(0, 0, w, h);
        g.drawImage(cache, 0, 0, w, h);
        const { tile, ox, oy, mh } = geo;
        const i = Math.floor(t / 2.6) % LOTS.length;
        const [x, y, ww, hh] = LOTS[i];
        const a = 0.55 + 0.45 * Math.sin(t * 3);
        g.save();
        g.strokeStyle = `rgba(198,255,74,${a})`; g.lineWidth = 2.5;
        g.strokeRect(ox + x * tile - 3, oy + y * tile - 3, ww * tile + 6, hh * tile + 6);
        const lx = ox + (x + ww / 2) * tile, ly = y < 10 ? oy + (y + hh) * tile : oy + y * tile;
        const ry = y < 10 ? oy + 7.5 * tile : oy + 18.5 * tile;
        g.setLineDash([6, 6]); g.lineDashOffset = -t * 24; g.lineWidth = 2; g.strokeStyle = "#c6ff4a";
        g.beginPath(); g.moveTo(ox + 20 * tile, oy + mh); g.lineTo(ox + 20 * tile, oy + 18.5 * tile);
        if (y < 10) { g.lineTo(lx < ox + 20 * tile ? ox + 11 * tile : ox + 29 * tile, oy + 18.5 * tile); g.lineTo(lx < ox + 20 * tile ? ox + 11 * tile : ox + 29 * tile, ry); g.lineTo(lx, ry); }
        else g.lineTo(lx, ry);
        g.lineTo(lx, ly); g.stroke();
        g.setLineDash([]); g.fillStyle = "#c6ff4a";
        g.beginPath(); g.arc(lx, ly, 4, 0, Math.PI * 2); g.fill();
        g.restore();
      });
      const who = root.querySelector(".v17-who");
      ctx.onField((k, v) => {
        if (k === "id") who.textContent = v.trim().toLowerCase() || "—";
        if (k === "reset") who.textContent = F.DEMO.id;
      });
    },
  });

  /* ── 18 로비 안내판 ── */
  add({
    no: 18, fam: "c", title: "로비 안내판", en: "Lobby Letter Board", swatch: "#151515",
    caption: "사옥 1층 로비의 펠트 글자판이 파이프라인 4묶음을 층별로 안내합니다(2F 발견 → 5F 임상 · 허가). 로그인 칸은 접수대의 출입 등록이고, 들어가면 엘리베이터 표시등이 올라갑니다.",
    css: `
      .v18 { background: #d8dad1; }
      .v18-wall { position: absolute; inset: 0; background:
          radial-gradient(circle at 50% 50%, rgba(0,0,0,.18) 0 2.5px, transparent 3.5px) 90px 90px / 180px 180px,
          repeating-linear-gradient(90deg, rgba(0,0,0,.06) 0 1px, transparent 1px 360px),
          repeating-linear-gradient(0deg, rgba(0,0,0,.05) 0 1px, transparent 1px 180px),
          linear-gradient(180deg, #e0e2da, #cfd2c8); }
      .v18-floor { position: absolute; left: 0; right: 0; bottom: 0; height: 13cqh; border-top: 2px solid #9fa298; background:
          radial-gradient(circle, #7d8178 0 1.2px, transparent 1.6px) 0 0 / 13px 11px,
          radial-gradient(circle, #f4f4ee 0 1.4px, transparent 1.8px) 5px 6px / 17px 15px,
          radial-gradient(circle, #a9925f 0 1px, transparent 1.4px) 9px 3px / 23px 19px, #c6c8bd; }
      .v18-board { position: absolute; left: 6cqw; top: 8cqh; width: min(700px, 50cqw); padding: 14px; z-index: 1;
        background: linear-gradient(135deg, #eceee9, #9b9e98 38%, #f2f3ef 55%, #8d9089); box-shadow: 0 24px 50px rgba(30,32,28,.32), inset 0 0 0 1px rgba(0,0,0,.25); }
      .v18-felt { padding: 22px 28px 26px; background: repeating-linear-gradient(180deg, rgba(255,255,255,.045) 0 1px, transparent 1px 11px), #141414; box-shadow: inset 0 2px 8px rgba(0,0,0,.7); }
      .v18-l { margin: 0; height: 44px; display: flex; align-items: center; gap: 18px; font-family: var(--sans); font-weight: 600; font-size: 25px; letter-spacing: .06em; color: #f2f2ec;
        text-shadow: 0 1px 0 rgba(0,0,0,.9), 0 3px 3px rgba(0,0,0,.6); white-space: nowrap; }
      .v18-l:nth-child(odd) { transform: rotate(-.25deg); } .v18-l:nth-child(3n) { transform: rotate(.3deg) translateX(2px); }
      .v18-l b { width: 52px; flex: none; font-weight: 700; }
      .v18-l i { margin-left: auto; font-style: normal; font-family: var(--mono); font-size: 17px; font-weight: 500; letter-spacing: .04em; color: #b9b9b0; }
      .v18-t { font-size: 31px; letter-spacing: .08em; }
      .v18-t .mk { width: 32px; height: 32px; color: #c6ff4a; stroke-width: 3.4; filter: drop-shadow(0 2px 2px rgba(0,0,0,.6)); }
      .v18-s { font-size: 16px; color: #b9b9b0; letter-spacing: .2em; margin-bottom: 8px; }
      .v18-l.here { color: #c6ff4a; }
      .v18-l.here i { color: #c6ff4a; animation: v18-blink 1.4s steps(1) infinite; }
      @keyframes v18-blink { 50% { opacity: .2; } }
      .v18-plaque { position: absolute; z-index: 1; left: 6cqw; top: calc(8cqh + 420px); width: min(420px, 32cqw); padding: 12px 16px; display: grid; gap: 4px;
        background: linear-gradient(135deg, #e9eae4, #b7b9b2 45%, #eeefea 60%, #a8aba3); box-shadow: 0 8px 18px rgba(30,32,28,.22), inset 0 0 0 1px rgba(0,0,0,.2); color: #2a2d28; }
      .v18-plaque b { font-size: 13px; letter-spacing: .04em; }
      .v18-plaque span { font-family: var(--mono); font-size: 11px; letter-spacing: .04em; color: #3d413a; }
      .v18-plaque::before, .v18-plaque::after { content: ""; position: absolute; top: 8px; width: 6px; height: 6px; border-radius: 50%; background: #7a7d75; box-shadow: inset 0 1px 1px rgba(0,0,0,.5); }
      .v18-plaque::before { left: 8px; } .v18-plaque::after { right: 8px; }
      .v18-elev { position: absolute; z-index: 1; right: calc(6cqw + 140px); top: 6cqh; display: flex; align-items: center; gap: 10px; padding: 8px 14px; background: #0b0c0a; border: 3px solid #8d9089;
        box-shadow: 0 8px 20px rgba(0,0,0,.25); font-family: var(--mono); color: #ff7a2a; text-shadow: 0 0 8px rgba(255,122,42,.6); }
      .v18-elev b { font-size: 26px; font-weight: 600; min-width: 2.2ch; text-align: center; }
      .v18-elev .ar { font-size: 16px; opacity: .35; }
      .v18-elev .go { display: none; font-size: 13px; letter-spacing: .06em; }
      .v18[data-msg="ok"] .v18-elev { color: #c6ff4a; text-shadow: 0 0 8px rgba(198,255,74,.6); }
      .v18[data-msg="ok"] .v18-elev .ar { opacity: 1; animation: v18-up .8s steps(2) infinite; }
      .v18[data-msg="ok"] .v18-elev .go { display: inline; }
      .v18[data-msg="ok"] .v18-elev b { display: none; }
      .v18[data-msg="lock"] .v18-elev b::after { content: " ×"; }
      @keyframes v18-up { 50% { transform: translateY(-3px); opacity: .4; } }
      .v18-desk { position: absolute; z-index: 2; right: 6cqw; bottom: 7cqh; width: min(460px, 36cqw); max-height: calc(100% - 7cqh - 24px); display: flex; flex-direction: column; }
      .v18-top { flex: 1 1 auto; min-height: 0; overflow-y: auto; background: #fbfbf6; border: 1px solid rgba(8,11,9,.3); border-bottom: 0; padding: 20px 22px 18px; display: grid; gap: 14px; box-shadow: 0 -12px 30px rgba(30,32,28,.12); }
      .v18-th { margin: 0; display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(8,11,9,.16); }
      .v18-th b { font-size: 19px; letter-spacing: -.02em; }
      .v18-th span { font-family: var(--mono); font-size: 10.5px; letter-spacing: .08em; color: #5b6358; }
      .v18-slab { flex: none; height: 18px; background: linear-gradient(#f6f6f1, #d6d8cf); border: 1px solid rgba(8,11,9,.35); margin: 0 -14px; box-shadow: 0 6px 10px rgba(0,0,0,.18); }
      .v18-front { flex: none; height: 118px; margin: 0 -2px; display: flex; align-items: center; justify-content: center; background: #080b09; color: #f1f1e9; border-bottom: 6px solid #2a2d28; }
      .v18-front .wm { font-size: 34px; }
      .v18[data-mode="signup"] .v18-front { height: 44px; }
      .v18[data-mode="signup"] .v18-front .wm { font-size: 20px; }
      .v18 .f { gap: 14px; }
      .v18 .f-fields { gap: 12px; }
      .v18 .f-inp { background: #f1f1e9; border-color: rgba(8,11,9,.26); }
      .v18 .f-inp:focus { border-color: #080b09; background: #fff; }
      .v18 .f-go { justify-content: space-between; }
      .v18 .f-go::after { content: "▲"; font-size: 12px; color: #c6ff4a; }
      .v18 .f-go.busy::after { content: ""; }
      @container scr (max-height: 820px) {
        .v18-plaque { display: none; }
        .v18[data-mode="signup"] .v18-desk { bottom: 2cqh; max-height: calc(100% - 2cqh - 12px); }
        .v18[data-mode="signup"] .v18-th { display: none; }
        .v18[data-mode="signup"] .v18-top { padding: 16px 20px 14px; gap: 10px; }
        .v18[data-mode="signup"] .f-inp { min-height: 40px; padding-block: 7px; }
        .v18-board { top: 5cqh; }
        .v18-l { height: 36px; font-size: 21px; } .v18-t { font-size: 26px; }
      }
      @container scr (max-width: 1100px) {
        .v18-l { font-size: 19px; gap: 12px; } .v18-l b { width: 40px; } .v18-l i { font-size: 13px; }
        .v18-elev { right: auto; left: 6cqw; top: auto; bottom: 16cqh; }
      }
      @container scr (max-width: 760px) {
        .v18-board { left: 12px; right: 12px; top: 12px; width: auto; padding: 8px; }
        .v18-felt { padding: 10px 14px 12px; }
        .v18-l { height: 28px; font-size: 15px; gap: 10px; } .v18-l b { width: 30px; } .v18-l i { font-size: 11px; }
        .v18-t { font-size: 18px; } .v18-t .mk { width: 20px; height: 20px; }
        .v18-s { display: none; }
        .v18[data-mode="signup"] .v18-l:not(.v18-t) { display: none; }
        .v18-elev, .v18-plaque { display: none; }
        .v18-desk { left: 12px; right: 12px; width: auto; bottom: 12px; max-height: calc(100% - 248px); }
        .v18[data-mode="signup"] .v18-desk { max-height: calc(100% - 84px); }
        .v18-top { padding: 16px; }
        .v18-front { height: 40px; } .v18-front .wm { font-size: 20px; }
        .v18-slab { margin: 0 -6px; height: 12px; }
        .v18-floor { height: 6cqh; }
      }`,
    html: (F) => `
      <div class="v18-wall" aria-hidden="true"></div>
      <div class="v18-floor" aria-hidden="true"></div>
      <div class="v18-board" aria-label="층별 안내">
        <div class="v18-felt">
          <p class="v18-l v18-t">${F.mark()}CRISTA ${F.COPY.sub}</p>
          <p class="v18-l v18-s">층별 안내 · FLOOR GUIDE</p>
          <p class="v18-l"><b>5F</b>임상 · 허가<i>4.1–4.2</i></p>
          <p class="v18-l"><b>4F</b>개발 · 규제<i>3.1–3.3</i></p>
          <p class="v18-l"><b>3F</b>최적화<i>2.1–2.2</i></p>
          <p class="v18-l"><b>2F</b>발견<i>1.1–1.2</i></p>
          <p class="v18-l here"><b>1F</b>로비 · 출입 등록<i>◀ 지금 여기</i></p>
        </div>
      </div>
      <div class="v18-plaque" aria-hidden="true"><b>입주 모둠 2~8곳 · 학생 연구원 정원 40명</b><span>방문 학생은 학급 코드로 처음 등록 · 교사 계정은 따로 발급</span></div>
      <div class="v18-elev" aria-hidden="true"><span class="ar">▲</span><b>1F</b><span class="go">사옥 지구로</span></div>
      <section class="v18-desk" aria-label="접수대 출입 등록">
        <div class="v18-top">
          <p class="v18-th"><b>출입 등록</b><span>로비 접수대 · 학생 · 교사</span></p>
          ${F.form()}
        </div>
        <div class="v18-slab" aria-hidden="true"></div>
        <div class="v18-front" aria-hidden="true">${F.word()}</div>
      </section>`,
  });
})();
