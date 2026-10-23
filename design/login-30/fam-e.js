/* 로그인 시안 — E 갈래 '출입 · 절차'(25~30). 모둠 스타트업에 입사하는 의식을 화면으로 만든다. 규칙은 core.js 머리말. */
(() => {
  const { add, F } = window.LOGIN;
  const pad2 = (n) => String(n).padStart(2, "0");
  const DAYS = "일월화수목금토";

  /* 아이디 글자로 만든 장식 바코드(실제 규격 아님 — 사원증 · 시약 라벨 느낌만) */
  const bars = (str) => {
    let h = "";
    for (const ch of "*" + String(str || "").toLowerCase() + "*") {
      const c = ch.charCodeAt(0);
      for (let i = 0; i < 4; i++) {
        h += `<i style="width:${(c >> i) & 1 ? 3 : 1}px"></i><b style="width:${(c >> (i + 3)) & 1 ? 2 : 1}px"></b>`;
      }
      h += '<b style="width:2px"></b>';
    }
    return h;
  };

  /* ── 25 사원증 ── */
  add({
    no: 25, fam: "e", title: "사원증", en: "Employee Badge", swatch: "#e7e8de",
    caption: "목걸이 줄에 매달린 사원증이 곧 로그인 칸입니다. 아이디를 쓰면 사원 번호와 바코드가 바뀌고, 가입으로 넘기면 신규 발급 표시가 붙습니다.",
    css: `
      .v25 { background: #e7e8de; }
      .v25 .v25-wall { position: absolute; inset: 0;
        background: radial-gradient(ellipse 30% 40% at 30% 62%, rgba(8,11,9,.12), transparent 70%),
          linear-gradient(90deg, rgba(8,11,9,.045) 1px, transparent 1px) 0 0 / 72px 72px,
          linear-gradient(rgba(8,11,9,.045) 1px, transparent 1px) 0 0 / 72px 72px; }
      .v25 .v25-copy { position: absolute; left: 57cqw; right: 6cqw; top: 50%; transform: translateY(-50%); display: grid; gap: 28px; max-width: 560px; }
      .v25 .eyebrow { margin: 0; font-family: var(--mono); font-size: 11px; letter-spacing: .12em; color: #5b6358; }
      .v25 .v25-copy h2 { margin: 0; font-size: clamp(40px, 4.4cqw, 66px); line-height: 1.08; letter-spacing: -.045em; font-weight: 700; text-wrap: balance; }
      .v25 .v25-copy dl { margin: 0; border-top: 1px solid rgba(8,11,9,.22); }
      .v25 .v25-copy dl div { display: grid; grid-template-columns: 88px minmax(0,1fr); gap: 16px; padding: 12px 0; border-bottom: 1px solid rgba(8,11,9,.12); }
      .v25 .v25-copy dt { font-family: var(--mono); font-size: 11px; letter-spacing: .06em; color: #5b6358; padding-top: 3px; }
      .v25 .v25-copy dd { margin: 0; font-size: 15px; }
      .v25 .hang { --top: clamp(28px, 9cqh, 96px); position: absolute; z-index: 2; left: 30cqw; top: 0; width: 420px; margin-left: -210px; transform-origin: 50% 0; animation: v25-sw 7s ease-in-out infinite; }
      @keyframes v25-sw { 0%, 100% { transform: rotate(-.6deg); } 50% { transform: rotate(.6deg); } }
      .v25 .hang:hover, .v25 .hang:focus-within { animation-play-state: paused; }
      .v25 .strap { position: absolute; left: 50%; top: -20px; width: 34px; height: calc(var(--top) + 8px); margin-left: -17px; background: #c6ff4a; border-inline: 1px solid rgba(8,11,9,.22); overflow: hidden; display: flex; justify-content: center; }
      .v25 .strap span { writing-mode: vertical-rl; font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: .32em; white-space: nowrap; color: #080b09; padding-top: 10px; }
      .v25 .clip { position: absolute; z-index: 3; left: 50%; top: calc(var(--top) - 18px); width: 44px; height: 30px; margin-left: -22px; border-radius: 6px 6px 12px 12px;
        background: linear-gradient(#e3e6de, #a5aba1); border: 1px solid rgba(8,11,9,.35); box-shadow: 0 2px 3px rgba(8,11,9,.25); }
      .v25 .clip::after { content: ""; position: absolute; left: 50%; bottom: -12px; width: 14px; height: 16px; margin-left: -7px; border-radius: 50%; border: 3px solid #8d948a; }
      .v25 .badge { position: absolute; left: 0; right: 0; top: calc(var(--top) + 8px); max-height: calc(100cqh - var(--top) - 24px); overflow-y: auto; scrollbar-width: none;
        background: #fbfbf6; border-radius: 20px; border: 1px solid rgba(8,11,9,.14); padding-top: 24px;
        box-shadow: 0 30px 60px -20px rgba(8,11,9,.38), 0 2px 6px rgba(8,11,9,.12); }
      .v25 .badge::before { content: ""; position: absolute; left: 50%; top: 10px; width: 60px; height: 9px; margin-left: -30px; border-radius: 6px; background: #d9dcd2; box-shadow: inset 0 1px 2px rgba(8,11,9,.3); }
      .v25 .band { margin: 0 14px; padding: 14px 16px; border-radius: 12px; background: #080b09; color: #f1f1e9; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: background .3s, color .3s; }
      .v25 .band .wm { font-size: 24px; }
      .v25 .role { display: grid; text-align: right; line-height: 1.25; }
      .v25 .role b { font-size: 13px; }
      .v25 .role small { font-family: var(--mono); font-size: 9px; letter-spacing: .14em; opacity: .7; }
      .v25[data-msg="ok"] .band { background: #c6ff4a; color: #080b09; }
      .v25[data-msg="lock"] .band { background: #5b6358; }
      .v25 .who { display: grid; grid-template-columns: 92px minmax(0,1fr); gap: 18px; padding: 16px 22px 4px; align-items: center; }
      .v25 .photo { position: relative; width: 92px; height: 112px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(8,11,9,.16); display: grid; place-items: start center;
        background: linear-gradient(115deg,#ffd3ea 0%,#cdeaff 28%,#e4ffc0 52%,#ffe2c2 76%,#e6d4ff 100%); }
      .v25 .photo .wk { animation: none; margin-top: 12px; }
      .v25[data-msg="lock"] .photo { filter: grayscale(1) contrast(.9); }
      .v25 .new { position: absolute; left: -4px; bottom: 8px; padding: 2px 8px; background: #080b09; color: #c6ff4a; font-size: 11px; font-weight: 700; transform: rotate(-8deg); white-space: nowrap; }
      .v25 .pass { position: absolute; left: 6px; right: 6px; bottom: 6px; display: none; padding: 3px 0; text-align: center; background: #080b09; color: #c6ff4a; font-size: 11px; font-weight: 700; }
      .v25[data-msg="ok"] .pass { display: block; }
      .v25 .meta { margin: 0; display: grid; gap: 7px; min-width: 0; }
      .v25 .meta dt { font-family: var(--mono); font-size: 10px; letter-spacing: .06em; color: #5b6358; }
      .v25 .meta dd { margin: 1px 0 0; font-size: 15px; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .v25 .meta .m-id { font-family: var(--mono); font-size: 19px; letter-spacing: .02em; }
      .v25 .m-nm { display: none; }
      .v25[data-mode="signup"] .m-nm, .v25[data-msg="ok"] .m-nm { display: inline; }
      .v25[data-mode="signup"] .nm-wait, .v25[data-msg="ok"] .nm-wait { display: none; }
      .v25 .m-st span { display: none; }
      .v25[data-msg="none"] .m-st .s0, .v25[data-msg="bad"] .m-st .s1, .v25[data-msg="lock"] .m-st .s2, .v25[data-msg="ok"] .m-st .s3 { display: inline; }
      .v25 .m-st .s1 { color: #b2361b; } .v25 .m-st .s2 { color: #8a5a00; } .v25 .m-st .s3 { color: #2f6f2a; }
      .v25 .fm { padding: 14px 22px 2px; }
      .v25 .f { gap: 12px; }
      .v25 .f-tabs { background: #e7e8de; border-radius: 10px; padding: 3px; }
      .v25 .f-tab { border: 0; border-radius: 8px; padding: 8px; font-size: 13px; color: #5b6358; }
      .v25 .f-tab[aria-selected="true"] { background: #fbfbf6; color: #080b09; box-shadow: 0 1px 2px rgba(8,11,9,.2); }
      .v25 .f-fields { gap: 10px; }
      .v25[data-mode="signup"] .f-fields { grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
      .v25[data-mode="signup"] .f-fld-code { grid-column: 1 / -1; }
      .v25 .f-lab { font-size: 11.5px; color: #5b6358; }
      .v25 .f-inp { min-height: 42px; border-radius: 8px; background: #f1f1e9; border-color: rgba(8,11,9,.16); }
      .v25 .f-inp:focus { border-color: #080b09; background: #fff; }
      .v25 .f-inp-code { font-family: var(--mono); letter-spacing: .2em; text-transform: uppercase; }
      .v25 .f-msg { border-radius: 8px; }
      .v25 .f-go { min-height: 48px; border-radius: 10px; }
      .v25 .f-hint { font-size: 12px; }
      .v25 .code-strip { margin-top: 14px; padding: 12px 22px 18px; border-top: 1px dashed rgba(8,11,9,.24); display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
      .v25 .bars { display: flex; height: 34px; overflow: hidden; min-width: 0; }
      .v25 .bars i { display: block; flex: none; background: #080b09; }
      .v25 .bars b { display: block; flex: none; }
      .v25 .valid { font-family: var(--mono); font-size: 10px; letter-spacing: .04em; color: #5b6358; text-align: right; line-height: 1.45; white-space: nowrap; }
      .v25[data-mode="signup"] .who { grid-template-columns: 64px minmax(0,1fr); padding-top: 12px; }
      .v25[data-mode="signup"] .photo { width: 64px; height: 80px; }
      .v25[data-mode="signup"] .photo .wk { margin-top: 4px; }
      .v25[data-mode="signup"] .meta { gap: 3px; }
      .v25[data-mode="signup"] .meta div:nth-child(3) { display: none; }
      @container scr (max-width: 760px) {
        .v25 .v25-copy { display: none; }
        .v25 .hang { --top: 40px; left: 16px; right: 16px; width: auto; margin-left: 0; animation: none; }
        .v25 .badge { max-height: calc(100cqh - var(--top) - 24px); }
        .v25 .who, .v25 .fm, .v25 .code-strip { padding-left: 16px; padding-right: 16px; }
        .v25 .band { margin: 0 10px; }
        .v25 .band .wm { font-size: 20px; }
      }`,
    html: (F) => `<div class="v25-wall"></div>
      <section class="v25-copy">
        <p class="eyebrow">CRISTA 파이프라인 랩 · 학생 연구원</p>
        <h2>사원증을 걸면<br>오늘부터 연구원.</h2>
        <dl>
          <div><dt>사원 번호</dt><dd>아이디가 그대로 사원 번호가 돼요</dd></div>
          <div><dt>소속</dt><dd>② 사옥 지구에서 모둠 사옥에 들어가면 정해져요</dd></div>
          <div><dt>발급</dt><dd>선생님이 알려 준 학급 코드 6자로 처음 한 번</dd></div>
        </dl>
      </section>
      <div class="hang">
        <div class="strap" aria-hidden="true"><span>CRISTA · PIPELINE LAB · CRISTA · PIPELINE LAB · CRISTA · PIPELINE LAB</span></div>
        <div class="clip" aria-hidden="true"></div>
        <article class="badge" aria-label="사원증">
          <div class="band">${F.word()}<span class="role"><b>학생 연구원</b><small>STUDENT RESEARCHER</small></span></div>
          <div class="who">
            <div class="photo" aria-hidden="true">${F.walker("cso", "south", 2)}<span class="new su">신규 발급</span><span class="pass">출입 허가</span></div>
            <dl class="meta">
              <div><dt>사원 번호</dt><dd class="m-id">${F.esc(F.DEMO.id)}</dd></div>
              <div><dt>이름</dt><dd><span class="nm-wait">들어가면 보여요</span><span class="m-nm">${F.esc(F.DEMO.name)}</span></dd></div>
              <div><dt>상태</dt><dd class="m-st"><span class="s0">출입 대기</span><span class="s1">아이디 · 비밀번호 확인</span><span class="s2">출입 정지 1분</span><span class="s3">출입 허가</span></dd></div>
            </dl>
          </div>
          <div class="fm">${F.form()}</div>
          <div class="code-strip" aria-hidden="true"><span class="bars">${bars(F.DEMO.id)}</span><span class="valid">2026 · 2학기<br>학급 코드로 발급</span></div>
        </article>
      </div>`,
    mount(root, ctx) {
      const id = root.querySelector(".f-inp-id"), nm = root.querySelector(".f-inp-name");
      const mid = root.querySelector(".m-id"), mnm = root.querySelector(".m-nm"), bar = root.querySelector(".bars");
      const upd = () => {
        const v = id ? id.value.trim().toLowerCase() : "";
        mid.textContent = v || "—";
        bar.innerHTML = bars(v);
        mnm.textContent = (nm && nm.value.trim()) || "이름";
      };
      ctx.onField((k) => { if (k === "id" || k === "name" || k === "reset") upd(); });
    },
  });

  /* ── 26 학급 코드 키패드 ── */
  const KP = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const kpHTML = `<div class="kp-intro li">
      <p class="kp-big">처음 왔나요?</p>
      <span class="kp-ghost" aria-hidden="true">${"<i></i>".repeat(6)}</span>
      <p class="kp-txt">선생님이 알려 준 <b>학급 코드 6자</b>로 가입해요. 아래 글자판을 누르면 바로 가입 칸이 열려요.</p>
      <button type="button" class="kp-start" data-tab="signup">학급 코드 넣고 가입하기 →</button>
    </div>
    <div class="kp">
      <p class="kp-note">학급 코드에는 헷갈리는 <b>0 · O · 1 · I · L</b> 을 쓰지 않아요. 글자는 31가지예요.</p>
      <div class="kp-keys" role="group" aria-label="학급 코드 글자판">${[...KP].map((k) => `<button type="button" class="kp-k${/\d/.test(k) ? " d" : ""}" data-k="${k}">${k}</button>`).join("")}<button type="button" class="kp-k del" data-k="del" aria-label="한 글자 지우기">⌫</button></div>
    </div>`;
  add({
    no: 26, fam: "e", title: "학급 코드 키패드", en: "Class Code Keypad", swatch: "#080b09",
    caption: "학급 코드 6칸과 31글자 글자판이 화면의 주인공입니다. 헷갈리는 0 · O · 1 · I · L 을 치면 안내가 빨갛게 켜집니다.",
    css: `
      .v26 { background: #f1f1e9; }
      .v26 .v26-in { height: 100%; display: grid; grid-template-columns: minmax(0, 1.38fr) minmax(0, 1fr); --lx: clamp(24px, 3.9cqw, 56px); --lw: min(720px, calc(58cqw - 2 * var(--lx))); }
      .v26 .ink-side { position: relative; background: radial-gradient(ellipse 70% 50% at 30% 42%, rgba(198,255,74,.07), transparent 70%), #080b09; color: #f1f1e9; }
      .v26 .kp-head { position: absolute; left: var(--lx); top: 6cqh; display: flex; align-items: center; gap: 14px; }
      .v26 .kp-head .wm { font-size: 28px; }
      .v26 .kp-head .kp-tag { font-family: var(--mono); font-size: 11px; letter-spacing: .12em; color: #9da59a; padding-left: 14px; border-left: 1px solid rgba(241,241,233,.24); }
      .v26 .paper-side { display: grid; align-items: center; min-height: 0; overflow-y: auto; scrollbar-width: none; padding: 32px clamp(28px, 4cqw, 64px); }
      .v26 .ps-in { display: grid; gap: 14px; width: 100%; max-width: 400px; }
      .v26 .ps-eyebrow { margin: 0; font-family: var(--mono); font-size: 11px; letter-spacing: .12em; color: #5b6358; }
      .v26 .ps-lead { margin: 0 0 4px; font-size: 22px; line-height: 1.35; letter-spacing: -.025em; font-weight: 700; text-wrap: balance; }
      .v26[data-mode="signup"] .ps-lead { display: none; }
      .v26 .f-fld-code { position: absolute; z-index: 2; left: var(--lx); top: 21cqh; width: var(--lw); color: #f1f1e9; gap: 18px; }
      .v26 .f-fld-code .f-lab { font-size: clamp(30px, 4.6cqh, 44px); font-weight: 700; letter-spacing: -.03em; line-height: 1.1; }
      .v26 .f-cell-row { gap: 12px; }
      .v26 .f-cell { height: clamp(72px, 13cqh, 128px); font-size: clamp(40px, 7cqh, 64px); color: #c6ff4a; background: #0f140f; border: 1px solid rgba(241,241,233,.22); border-radius: 6px; }
      .v26 .f-cell.on { border-color: #c6ff4a; box-shadow: inset 0 -4px 0 #c6ff4a; }
      .v26 .kp-intro { position: absolute; z-index: 2; left: var(--lx); top: 21cqh; width: var(--lw); color: #f1f1e9; display: grid; gap: 16px; justify-items: start; }
      .v26 .kp-big { margin: 0; font-size: clamp(30px, 4.6cqh, 44px); font-weight: 700; letter-spacing: -.03em; line-height: 1.1; }
      .v26 .kp-ghost { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 12px; width: 100%; }
      .v26 .kp-ghost i { height: clamp(72px, 13cqh, 128px); border: 1px dashed rgba(241,241,233,.3); border-radius: 6px; }
      .v26 .kp-txt { margin: 0; color: rgba(241,241,233,.7); font-size: 15px; max-width: 46ch; }
      .v26 .kp-txt b { color: #f1f1e9; }
      .v26 .kp-start { appearance: none; border: 1px solid #c6ff4a; background: transparent; color: #c6ff4a; padding: 11px 18px; font: inherit; font-weight: 700; cursor: pointer; border-radius: 6px; }
      .v26 .kp-start:hover { background: #c6ff4a; color: #080b09; }
      .v26 .kp { position: absolute; z-index: 2; left: var(--lx); bottom: 7cqh; width: var(--lw); display: grid; gap: 12px; }
      .v26 .kp-note { margin: 0; font-size: 13px; color: rgba(241,241,233,.62); transition: color .2s; }
      .v26 .kp-note b { color: #f1f1e9; font-family: var(--mono); letter-spacing: .04em; }
      .v26 .kp-note.warn { color: #ff8a6a; }
      .v26 .kp-note.warn b { color: #ff5a3c; }
      .v26 .kp-keys { display: grid; grid-template-columns: repeat(8, minmax(0,1fr)); gap: 6px; }
      .v26 .kp-k { appearance: none; height: clamp(36px, 5.4cqh, 50px); border: 1px solid rgba(241,241,233,.16); background: #0f140f; color: #f1f1e9; font-family: var(--mono); font-size: 17px; font-weight: 600; border-radius: 6px; cursor: pointer; padding: 0; }
      .v26 .kp-k.d { color: #c6ff4a; }
      .v26 .kp-k:hover { border-color: rgba(241,241,233,.5); }
      .v26 .kp-k.del { background: #161d15; color: #9da59a; }
      .v26 .kp-k.hit { animation: v26-hit .35s ease-out; }
      @keyframes v26-hit { from { background: #c6ff4a; color: #080b09; } }
      .v26[data-mode="login"] .kp-keys { opacity: .72; }
      .v26 .f { gap: 14px; }
      .v26 .f-tabs { border-bottom: 2px solid #080b09; }
      .v26 .f-tab { flex: none; border: 0; padding: 10px 2px; margin-right: 22px; background: none; color: #5b6358; }
      .v26 .f-tab[aria-selected="true"] { background: none; color: #080b09; box-shadow: inset 0 -4px 0 #080b09; }
      .v26 .f-inp { min-height: 48px; border-radius: 6px; background: #fbfbf6; border-color: rgba(8,11,9,.24); }
      .v26 .f-inp:focus { border-color: #080b09; }
      .v26 .f-msg { border-radius: 6px; }
      .v26 .f-go { min-height: 52px; border-radius: 6px; justify-content: space-between; }
      .v26 .f-go::after { content: "→"; font-weight: 500; }
      .v26 .f-go.busy::after { content: ""; }
      @container scr (max-height: 780px) { .v26 .kp-txt { display: none; } }
      @container scr (max-width: 760px) {
        .v26 .v26-in { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
        .v26 .ink-side { padding: 22px 16px 20px; }
        .v26 .kp-head { position: static; }
        .v26 .kp-head .wm { font-size: 24px; }
        .v26 .paper-side { padding: 20px 16px 24px; align-items: start; }
        .v26 .f-fld-code { position: static; width: auto; color: inherit; gap: 8px; }
        .v26 .f-fld-code .f-lab { font-size: 12px; letter-spacing: 0; }
        .v26 .f-cell-row { gap: 6px; }
        .v26 .f-cell { height: 56px; font-size: 26px; color: #080b09; background: #fbfbf6; border-color: rgba(8,11,9,.24); }
        .v26 .f-cell.on { border-color: #080b09; box-shadow: inset 0 -3px 0 #080b09; }
        .v26 .kp-intro, .v26 .kp { display: none !important; }
        .v26 .ps-lead { font-size: 18px; }
      }`,
    html: (F) => `<div class="v26-in"><div class="ink-side"><header class="kp-head">${F.word()}<span class="kp-tag">학급 코드로 입사</span></header></div>
      <div class="paper-side"><div class="ps-in">
        <p class="ps-eyebrow"><span class="li">다시 왔다면 · 아이디로</span><span class="su">처음이라면 · 학급 코드부터</span></p>
        <h2 class="ps-lead">${F.COPY.lead}</h2>
        ${F.form({ code: "cells", after: kpHTML })}
      </div></div></div>`,
    mount(root, ctx) {
      const inp = root.querySelector(".f-inp-code"), note = root.querySelector(".kp-note");
      const mark = () => note.classList.toggle("warn", /[01OIL]/i.test(inp.value));
      ctx.onField((k) => { if (k === "code" || k === "reset") mark(); });
      if (!ctx.live) return;
      const kp = root.querySelector(".kp");
      const onKey = (e) => {
        const b = e.target.closest(".kp-k");
        if (!b) return;
        if (root.dataset.mode !== "signup") root.querySelector('.f-tab[data-tab="signup"]').click();
        let v = inp.value.toUpperCase().replace(/[\s-]/g, "");
        if (b.dataset.k === "del") v = v.slice(0, -1); else if (v.length < 6) v += b.dataset.k;
        inp.value = v;
        inp.dispatchEvent(new Event("input", { bubbles: true }));
        inp.focus({ preventScroll: true });
        b.classList.remove("hit"); void b.offsetWidth; b.classList.add("hit");
      };
      kp.addEventListener("click", onKey);
      ctx.cleanup(() => kp.removeEventListener("click", onKey));
    },
  });

  /* ── 27 신약 노선도 ── */
  const LINE = { ink: "#080b09", b: "#183080", t: "#007868", p: "#a048c8", o: "#d88828" };
  const STN = [ // x, y, 번호, 이름, 글 자리(t 위 · b 아래 · r 오른쪽 아래)
    [100, 310, "②", "사옥 지구", "b"], [200, 310, "1.1", "질환 · 표적", "t"], [300, 310, "1.2", "화합물 스크리닝", "b"], [400, 310, "2.1", "분자 도킹", "t"],
    [530, 250, "2.2", "ADMET · 리드", "r"], [620, 190, "3.1", "물질특허", "t"], [700, 190, "3.2", "전임상", "t"], [780, 190, "3.3", "제형 · IND", "b"],
    [850, 140, "4.1", "임상 시험", "r"], [960, 90, "4.2", "신약 허가", "t"],
  ];
  const stnSvg = () => STN.map(([x, y, c, n, p], i) => {
    const last = i === STN.length - 1;
    const dot = last ? `<circle cx="${x}" cy="${y}" r="11" fill="#fbfbf6" stroke="#080b09" stroke-width="3.5"/><circle cx="${x}" cy="${y}" r="5" fill="#080b09"/>`
      : `<circle cx="${x}" cy="${y}" r="8" fill="#fbfbf6" stroke="#080b09" stroke-width="3.5"/>`;
    const [tx, ty, a] = p === "t" ? [x, y - 40, "middle"] : p === "b" ? [x, y + 34, "middle"] : [x + 18, y + 24, "start"];
    return `${dot}<text class="cd" x="${tx}" y="${ty}" text-anchor="${a}">${c}</text><text class="nm" x="${tx}" y="${ty + 18}" text-anchor="${a}">${n}</text>`;
  }).join("");
  const MAP_PATH = "M0 310 H470 L590 190 H800 L900 90 H960";
  add({
    no: 27, fam: "e", title: "신약 노선도", en: "Pipeline Metro Map", swatch: "#fbfbf6",
    caption: "로그인이 출발역인 지하철 노선도입니다. 사옥 지구를 지나 1.1 질환 · 표적부터 4.2 신약 허가까지 네 호선이 이어지고, 역 안내판에서 들어갑니다.",
    css: `
      .v27 { background: #fbfbf6; --lx: clamp(24px, 4cqw, 64px); --pw: 404px; }
      .v27 .rail { position: absolute; left: 0; top: 50%; width: calc(var(--lx) + 40px); height: 12px; margin-top: -6px; background: #080b09; }
      .v27 .stn { position: absolute; z-index: 2; left: var(--lx); top: 50%; transform: translateY(-50%); width: var(--pw); max-height: calc(100% - 32px); overflow-y: auto; scrollbar-width: none;
        background: #fbfbf6; border: 3px solid #080b09; border-radius: 16px; }
      .v27 .sign { background: #080b09; color: #f1f1e9; padding: 16px 18px 0; display: grid; gap: 2px; }
      .v27 .sg-top { display: flex; align-items: center; gap: 12px; }
      .v27 .ln { width: 36px; height: 36px; border-radius: 50%; background: #c6ff4a; color: #080b09; display: grid; place-items: center; font-family: var(--mono); font-weight: 600; font-size: 17px; flex: none; }
      .v27 .nm-ko { font-size: 34px; letter-spacing: -.03em; line-height: 1.1; }
      .v27 .here { margin-left: auto; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: #c6ff4a; color: #080b09; white-space: nowrap; }
      .v27 .here span { display: none; }
      .v27[data-msg="none"] .here .h0, .v27[data-msg="bad"] .here .h0, .v27[data-msg="ok"] .here .h1, .v27[data-msg="lock"] .here .h2 { display: inline; }
      .v27[data-msg="lock"] .here, .v27[data-msg="lock"] .ln { background: #ffb21a; }
      .v27 .nm-en { padding-left: 48px; font-size: 13px; color: #9da59a; }
      .v27 .adj { margin: 14px -18px 0; padding: 9px 18px; display: flex; justify-content: space-between; background: #c6ff4a; color: #080b09; font-size: 13px; font-weight: 700; }
      .v27 .stn-body { padding: 18px 20px 20px; }
      .v27[data-mode="signup"] .nm-en, .v27[data-mode="signup"] .adj { display: none; }
      .v27[data-mode="signup"] .sign { padding-bottom: 14px; }
      .v27 .f { gap: 13px; }
      .v27 .f-tabs { gap: 6px; }
      .v27 .f-tab { border: 2px solid #080b09; border-radius: 999px; padding: 8px; font-size: 13px; }
      .v27 .f-tab + .f-tab { border-left: 2px solid #080b09; }
      .v27 .f-fields { gap: 11px; }
      .v27 .f-lab { font-size: 12px; }
      .v27 .f-inp { min-height: 46px; border: 2px solid rgba(8,11,9,.2); border-radius: 10px; background: #fff; }
      .v27 .f-inp:focus { border-color: #080b09; }
      .v27 .f-msg { border-width: 2px; border-radius: 10px; }
      .v27 .f-go { min-height: 52px; border-radius: 999px; }
      .v27 .f-go-l::after, .v27 .f-go-s::after { content: "  ▶"; font-size: 11px; }
      .v27 .map { position: absolute; z-index: 3; left: calc(var(--lx) + var(--pw)); right: clamp(24px, 3cqw, 48px); top: 0; bottom: 0; pointer-events: none; }
      .v27 .map svg { display: block; width: 100%; height: 100%; overflow: visible; }
      .v27 .map .nm { font-family: var(--sans); font-size: 15px; font-weight: 700; fill: #080b09; }
      .v27 .map .cd { font-family: var(--mono); font-size: 12px; font-weight: 500; fill: #5b6358; }
      .v27 .map .seg { fill: none; stroke-width: 12; stroke-linecap: round; stroke-linejoin: round; }
      .v27 .train { fill: none; stroke-linecap: round; stroke-dasharray: 22 978; animation: v27-t 18s linear infinite; }
      .v27 .train.o { stroke: #080b09; stroke-width: 12; }
      .v27 .train.i { stroke: #c6ff4a; stroke-width: 6; }
      .v27[data-msg="ok"] .train { animation-duration: 5s; }
      .v27[data-msg="lock"] .train { animation-play-state: paused; }
      @keyframes v27-t { to { stroke-dashoffset: -1000; } }
      .v27 .pulse { transform-box: fill-box; transform-origin: center; animation: v27-p 2.2s ease-out infinite; }
      @keyframes v27-p { from { transform: scale(1); opacity: .7; } to { transform: scale(2.8); opacity: 0; } }
      .v27 .map-title { position: absolute; z-index: 3; right: clamp(24px, 3cqw, 48px); top: 6cqh; display: grid; justify-items: end; gap: 6px; text-align: right; }
      .v27 .map-title .wm { font-size: 30px; }
      .v27 .map-title p { margin: 0; font-size: 15px; font-weight: 700; }
      .v27 .map-title small { font-family: var(--mono); font-size: 11px; letter-spacing: .08em; color: #5b6358; }
      .v27 .legend { position: absolute; z-index: 3; right: clamp(24px, 3cqw, 48px); bottom: 6cqh; margin: 0; padding: 14px 16px; list-style: none; display: grid; gap: 6px; border: 2px solid #080b09; border-radius: 12px; background: #fbfbf6; font-size: 12.5px; }
      .v27 .legend li { display: flex; align-items: center; gap: 10px; }
      .v27 .legend i { width: 26px; height: 6px; border-radius: 3px; background: var(--c); flex: none; }
      .v27 .legend b { font-family: var(--mono); font-weight: 500; font-size: 11px; color: #5b6358; min-width: 2.6em; }
      .v27 .mini { display: none; }
      @container scr (max-width: 1100px) { .v27 .legend { display: none; } }
      @container scr (max-width: 760px) {
        .v27 .map, .v27 .rail, .v27 .legend, .v27 .map-title { display: none; }
        .v27 .mini { display: grid; position: absolute; left: 16px; right: 16px; top: 18px; gap: 10px; }
        .v27 .mini-line { position: relative; display: flex; justify-content: space-between; align-items: center; height: 18px; }
        .v27 .mini-line::before { content: ""; position: absolute; left: 6px; right: 6px; top: 50%; height: 6px; margin-top: -3px; border-radius: 3px;
          background: linear-gradient(90deg, #080b09 0 10%, #183080 10% 38%, #007868 38% 52%, #a048c8 52% 80%, #d88828 80%); }
        .v27 .mini-line i { position: relative; width: 12px; height: 12px; border-radius: 50%; background: #fbfbf6; border: 3px solid #080b09; }
        .v27 .mini-line i:first-child { width: 18px; height: 18px; background: #c6ff4a; }
        .v27 .mini p { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
        .v27 .mini .mk { width: 18px; height: 18px; }
        .v27 .stn { left: 16px; right: 16px; width: auto; top: 86px; bottom: 16px; transform: none; max-height: none; }
        .v27 .nm-ko { font-size: 28px; }
        .v27 .stn-body { padding: 16px; }
      }`,
    html: (F) => `<div class="rail" aria-hidden="true"></div>
      <div class="mini" aria-hidden="true"><div class="mini-line">${"<i></i>".repeat(11)}</div><p>${F.mark()}다음 역 · ② 사옥 지구 → 1.1 질환 · 표적</p></div>
      <aside class="stn" aria-label="출발역 로그인">
        <div class="sign">
          <div class="sg-top"><span class="ln" aria-hidden="true">0</span><b class="nm-ko">로그인</b><span class="here"><span class="h0">지금 여기</span><span class="h1">출발합니다</span><span class="h2">운행 멈춤 1분</span></span></div>
          <span class="nm-en">Login · 회원가입</span>
          <div class="adj" aria-hidden="true"><span>◀ 첫 화면</span><span>사옥 지구 ▶</span></div>
        </div>
        <div class="stn-body">${F.form()}</div>
      </aside>
      <div class="map" aria-hidden="true">
        <svg viewBox="0 0 1000 620" preserveAspectRatio="xMinYMid meet">
          <path class="seg" stroke="${LINE.ink}" d="M0 310 H100"/>
          <path class="seg" stroke="${LINE.b}" d="M100 310 H350"/>
          <path class="seg" stroke="${LINE.t}" d="M350 310 H470 L590 190"/>
          <path class="seg" stroke="${LINE.p}" d="M590 190 H800"/>
          <path class="seg" stroke="${LINE.o}" d="M800 190 L900 90 H960"/>
          <path class="train o" d="${MAP_PATH}" pathLength="1000"/>
          <path class="train i" d="${MAP_PATH}" pathLength="1000"/>
          ${stnSvg()}
          <circle class="pulse" cx="0" cy="310" r="13" fill="#c6ff4a"/>
          <circle cx="0" cy="310" r="13" fill="#c6ff4a" stroke="#080b09" stroke-width="4"/>
        </svg>
      </div>
      <div class="map-title" aria-hidden="true">${F.word()}<p>신약 개발 노선도</p><small>출발 로그인 · 종점 4.2 신약 허가 · 역 11</small></div>
      <ul class="legend" aria-hidden="true">
        <li><i style="--c:${LINE.ink}"></i><b>입사</b>로그인 → ② 사옥 지구</li>
        <li><i style="--c:${LINE.b}"></i><b>1호선</b>발견</li>
        <li><i style="--c:${LINE.t}"></i><b>2호선</b>최적화</li>
        <li><i style="--c:${LINE.p}"></i><b>3호선</b>개발 · 규제</li>
        <li><i style="--c:${LINE.o}"></i><b>4호선</b>임상 · 허가</li>
      </ul>`,
  });

  /* ── 28 전광판 LED ── */
  const LED = { a: [255, 178, 26], r: [255, 90, 60], g: [141, 255, 90] };
  const TICKER = [
    ["◆ CRISTA 파이프라인 랩  ", "a"], ["3반 · 모둠 6개가 출근 준비 중   ", "a"],
    ["◆ SEUM 세움제약 1.2 화합물 스크리닝 통과 ", "a"], ["▲2.0%   ", "r"],
    ["◆ DAON 2.1 분자 도킹 시작   ", "a"], ["◆ 오늘의 표적 ACHE · 알츠하이머   ", "g"],
    ["◆ 출근하면 사옥 지구에서 우리 모둠 사옥을 찾아요   ", "a"],
  ];
  const TICKER2 = [
    ["● 출근 현황 3반 · 사옥 지구 열림 · 모둠 6개   ", "g"], ["◆ 로그인이 틀리면 이 판에 바로 떠요   ", "a"],
  ];
  add({
    no: 28, fam: "e", title: "전광판 LED", en: "LED Board", swatch: "#030403",
    caption: "③ 화면의 학급 전광판이 로그인부터 켜져 있습니다. 호박색 점 글자로 다른 모둠 소식이 흐르고, 틀리거나 잠기면 그 문구가 전광판에 바로 뜹니다.",
    css: `
      .v28 { background: #080b09; color: #f1f1e9; }
      .v28 .v28-in { height: 100%; --bh: 38cqh; --lx: clamp(20px, 3.9cqw, 56px); }
      .v28[data-mode="signup"] .v28-in { --bh: 21cqh; }
      .v28 .led-wrap { position: absolute; left: var(--lx); right: var(--lx); top: 28px; height: var(--bh); display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 10px; transition: height .4s ease; }
      .v28 .led-cap { display: flex; justify-content: space-between; gap: 12px; font-family: var(--mono); font-size: 11px; letter-spacing: .1em; color: #9da59a; }
      .v28 .live { color: #c6ff4a; }
      .v28 .live i { font-style: normal; animation: v28-blink 1.6s steps(2) infinite; }
      @keyframes v28-blink { 50% { opacity: .2; } }
      .v28 .led-frame { position: relative; min-height: 0; padding: 14px; border-radius: 6px; background: linear-gradient(#1b211a, #10150f); border: 1px solid rgba(241,241,233,.12);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 24px 48px -24px rgba(0,0,0,.9); }
      .v28 .led-screen { position: relative; width: 100%; height: 100%; background: #030403; border-radius: 2px; overflow: hidden; box-shadow: inset 0 0 0 1px #000; }
      .v28 .sc { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #6b7468, #1c221b); }
      .v28 .s1 { left: 4px; top: 4px; } .v28 .s2 { right: 4px; top: 4px; } .v28 .s3 { left: 4px; bottom: 4px; } .v28 .s4 { right: 4px; bottom: 4px; }
      .v28 .led-low { position: absolute; left: var(--lx); right: var(--lx); top: calc(28px + var(--bh) + 40px); bottom: 28px; display: grid; grid-template-columns: minmax(0,1fr) minmax(0, 440px); gap: 56px; transition: top .4s ease; }
      .v28 .led-intro { align-self: start; display: grid; gap: 12px; min-width: 0; }
      .v28 .led-intro .wm { font-size: 52px; }
      .v28 .led-intro .sub { margin: 0; font-family: var(--mono); font-size: 11px; letter-spacing: .12em; color: #9da59a; }
      .v28 .led-intro h2 { margin: 10px 0 0; font-size: clamp(22px, 2.4cqw, 34px); line-height: 1.25; letter-spacing: -.03em; font-weight: 700; text-wrap: balance; }
      .v28 .led-intro h2 em { font-style: normal; color: #ffb21a; }
      .v28 .led-intro .say { margin: 0; color: rgba(241,241,233,.66); max-width: 44ch; font-size: 14.5px; }
      .v28[data-mode="signup"] .led-intro .say { display: none; }
      .v28 .led-form { align-self: start; min-height: 0; max-height: 100%; overflow-y: auto; scrollbar-width: none; }
      .v28 .f { gap: 14px; }
      .v28 .f-tabs { border-bottom: 1px solid rgba(241,241,233,.18); }
      .v28 .f-tab { flex: none; border: 0; padding: 0 0 10px; margin-right: 22px; background: none; color: #9da59a; }
      .v28 .f-tab[aria-selected="true"] { background: none; color: #ffb21a; box-shadow: inset 0 -2px 0 #ffb21a; }
      .v28 .f-fields { gap: 12px; }
      .v28[data-mode="signup"] .f-fields { grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
      .v28[data-mode="signup"] .f-fld-code { grid-column: 1 / -1; }
      .v28 .f-lab { font-family: var(--mono); font-size: 10.5px; letter-spacing: .08em; color: #ffb21a; font-weight: 500; }
      .v28 .f-inp { min-height: 46px; background: #0f140f; border-color: rgba(241,241,233,.2); color: #f1f1e9; }
      .v28 .f-inp:focus { border-color: #ffb21a; }
      .v28 .f-inp-code { font-family: var(--mono); letter-spacing: .24em; text-transform: uppercase; }
      .v28 .f-peek { color: #9da59a; }
      .v28 .f-go { min-height: 52px; background: #c6ff4a; color: #080b09; }
      .v28 .f-msg { background: rgba(255,90,60,.1); border-color: #ff5a3c; color: #ff9a80; }
      .v28 .f-msg[data-kind="lock"] { background: rgba(255,178,26,.1); border-color: #ffb21a; color: #ffc85a; }
      .v28 .f-msg[data-kind="ok"] { background: rgba(141,255,90,.08); border-color: #8dff5a; color: #b4ff90; }
      .v28 .f-hint { color: rgba(241,241,233,.6); opacity: 1; }
      @container scr (max-width: 760px) {
        .v28 .v28-in { --bh: 150px; --lx: 16px; }
        .v28[data-mode="signup"] .v28-in { --bh: 104px; }
        .v28 .led-wrap { top: 16px; }
        .v28 .led-cap span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .v28 .led-frame { padding: 8px; }
        .v28 .led-low { top: calc(16px + var(--bh) + 24px); bottom: 16px; grid-template-columns: 1fr; gap: 18px; overflow-y: auto; scrollbar-width: none; align-content: start; }
        .v28 .led-intro .wm { font-size: 32px; }
        .v28 .led-intro h2 { font-size: 19px; margin-top: 4px; }
        .v28 .led-intro .say { display: none; }
        .v28 .led-form { max-height: none; overflow: visible; }
        .v28[data-mode="signup"] .led-intro { display: none; }
        .v28[data-mode="signup"] .f-fields { grid-template-columns: 1fr; }
      }`,
    html: (F) => `<div class="v28-in"><div class="led-wrap">
        <div class="led-cap" aria-hidden="true"><span>③ 전광판 01 · 학급 소식(예시)</span><span class="live"><i>●</i> LIVE</span></div>
        <div class="led-frame"><div class="led-screen" role="img" aria-label="학급 전광판: CRISTA 파이프라인 랩, 다른 모둠 소식이 흐릅니다"></div><i class="sc s1"></i><i class="sc s2"></i><i class="sc s3"></i><i class="sc s4"></i></div>
      </div>
      <div class="led-low">
        <section class="led-intro">
          ${F.word()}
          <p class="sub">${F.COPY.sub} · 화면 ①</p>
          <h2>출근하면 이 전광판에<br><em>우리 모둠 소식</em>이 흘러요.</h2>
          <p class="say">③ 작업 화면 위쪽의 전광판과 같은 판이에요. 다른 모둠이 단계를 통과하거나 특허를 받으면 여기에 먼저 뜹니다.</p>
        </section>
        <section class="led-form">${F.form({ peek: true })}</section>
      </div></div>`,
    mount(root, ctx) {
      const cv = ctx.canvas(root.querySelector(".led-screen"));
      const pal = [LED.a, LED.r, LED.g];
      let fontOk = !!(document.fonts && document.fonts.check("11px Galmuri11"));
      let src = null, src2 = null, key = "", need = true;
      const refont = () => { if (document.fonts.check("11px Galmuri11")) { fontOk = true; need = true; root._dirty = true; } };
      if (!fontOk && document.fonts) {
        document.fonts.load("11px Galmuri11").then(refont).catch(() => {});
        document.fonts.addEventListener("loadingdone", refont);
        ctx.cleanup(() => document.fonts.removeEventListener("loadingdone", refont));
      }
      const segsFor = () => {
        const m = root.dataset.msg;
        if (!m || m === "none") return TICKER;
        const t = root.querySelector(".f-msg-t").textContent, d = root.querySelector(".f-msg-d").textContent;
        const c = m === "ok" ? "g" : "r";
        return [[`◆ ${t}  `, c], [d ? `${d}   ` : "   ", "a"], [m === "ok" ? "◆ 사옥 지구로 갑니다   " : "◆ CRISTA 파이프라인 랩   ", "a"]];
      };
      const build = (segs) => {
        const o = document.createElement("canvas"), g = o.getContext("2d");
        const font = `11px ${fontOk ? "Galmuri11" : "monospace"}`;
        g.font = font;
        let w = 0;
        for (const [s] of segs) w += Math.ceil(g.measureText(s).width);
        o.width = Math.max(40, w); o.height = 14;
        g.font = font; g.textBaseline = "top";
        let x = 0;
        for (const [s, c] of segs) { g.fillStyle = `rgb(${LED[c]})`; g.fillText(s, x, 1); x += Math.ceil(g.measureText(s).width); }
        const d = g.getImageData(0, 0, o.width, o.height).data;
        const lit = new Uint8Array(o.width * o.height); // 0 = 꺼짐, 1~3 = 색
        for (let i = 0; i < lit.length; i++) {
          if (d[i * 4 + 3] < 120) continue;
          const r = d[i * 4], gg = d[i * 4 + 1];
          lit[i] = gg > 220 && r < 200 ? 3 : gg < 130 ? 2 : 1;
        }
        return { w: o.width, h: 14, lit };
      };
      ctx.loop((t) => {
        const { g, w, h } = cv;
        if (!w || !h) return;
        const segs = segsFor();
        const k = segs.map((s) => s[0]).join("|");
        if (need || k !== key) { src = build(segs); if (need || !src2) src2 = build(TICKER2); key = k; need = false; }
        const two = h / 31 >= 7;
        const p = two ? h / 31 : h / 16, rows = Math.floor(h / p), cols = Math.floor(w / p), ox = (w - cols * p) / 2, oy = (h - rows * p) / 2;
        const lines = two ? [[src, Math.floor((rows - 29) / 2), 14], [src2, Math.floor((rows - 29) / 2) + 15, 8]] : [[src, Math.floor((rows - 14) / 2), 14]];
        g.clearRect(0, 0, w, h);
        const groups = [[], [], [], []];
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            let v = 0;
            for (const [S, r0, speed] of lines) {
              const sr = r - r0;
              if (sr < 0 || sr >= S.h) continue;
              v = S.lit[sr * S.w + ((Math.floor(t * speed) + c) % S.w)];
              break;
            }
            groups[v].push(ox + c * p + p / 2, oy + r * p + p / 2);
          }
        }
        const dot = (arr, rad, style) => {
          g.fillStyle = style; g.beginPath();
          for (let j = 0; j < arr.length; j += 2) { g.moveTo(arr[j] + rad, arr[j + 1]); g.arc(arr[j], arr[j + 1], rad, 0, 6.2832); }
          g.fill();
        };
        dot(groups[0], p * 0.32, "rgba(255,178,26,.07)");
        for (let v = 1; v <= 3; v++) {
          if (!groups[v].length) continue;
          const c = pal[v - 1].join(",");
          dot(groups[v], p * 0.62, `rgba(${c},.2)`);
          dot(groups[v], p * 0.36, `rgb(${c})`);
        }
      });
    },
  });

  /* ── 29 연속 용지 ── */
  add({
    no: 29, fam: "e", title: "연속 용지", en: "Green-bar Printout", swatch: "#dcebd6",
    caption: "라인 프린터의 녹색 줄 연속 용지에 로그인 작업표가 찍혀 나옵니다. 칸은 점선 끝의 대괄호 안에 쓰고, 오류는 ?ERR 줄로 인쇄됩니다.",
    css: `
      .v29 { background: #d3d6cc; --ink: #202520; }
      .v29 .desk { position: absolute; inset: 0; background: radial-gradient(ellipse 55% 75% at 42% 50%, rgba(255,255,255,.4), transparent 70%); }
      .v29 .sheet { position: absolute; top: -30px; bottom: -30px; left: 9cqw; width: min(880px, 62cqw); display: grid; grid-template-columns: 40px minmax(0,1fr) 40px; grid-template-rows: 100%;
        background: #fbfbf6; box-shadow: 0 0 0 1px rgba(8,11,9,.08), 22px 0 40px -24px rgba(8,11,9,.4), -22px 0 40px -24px rgba(8,11,9,.3); }
      .v29 .trk { grid-row: 1; background: radial-gradient(circle at 50% 50%, #d3d6cc 0 6.5px, rgba(8,11,9,.28) 7px, transparent 7.8px) 0 10px / 40px 32px repeat-y, #f6f6ee; }
      .v29 .trk.l { grid-column: 1; border-right: 1px dashed rgba(8,11,9,.28); }
      .v29 .trk.r { grid-column: 3; border-left: 1px dashed rgba(8,11,9,.28); }
      .v29 .pg { grid-column: 2; grid-row: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; padding: 64px 36px 72px; display: flex; flex-direction: column; justify-content: safe center; color: var(--ink);
        background: repeating-linear-gradient(180deg, transparent 0 72px, rgba(126,184,120,.22) 72px 144px) 0 30px;
        font-family: var(--mono); font-size: 15px; line-height: 24px; text-shadow: 0 0 .6px rgba(32,37,32,.55); }
      .v29 .ph-row { display: flex; justify-content: space-between; gap: 16px; white-space: nowrap; font-size: 13px; }
      .v29 .ph-row .wm { font-size: 15px; letter-spacing: -.02em; vertical-align: -1px; }
      .v29 .ph-title { margin: 12px 0; font-family: var(--pixel-mono); font-size: 44px; font-weight: 400; line-height: 48px; letter-spacing: .04em; }
      .v29 .rule { overflow: hidden; white-space: nowrap; opacity: .7; letter-spacing: .02em; }
      .v29 .f { gap: 12px; margin: 12px 0; }
      .v29 .f-tabs { gap: 18px; margin-bottom: 6px; }
      .v29 .f-tab { flex: none; border: 0; padding: 0 6px; height: 24px; line-height: 24px; background: none; font-family: var(--mono); font-weight: 500; font-size: 14px; }
      .v29 .f-tab::before { content: "[1] "; }
      .v29 .f-tab + .f-tab::before { content: "[2] "; }
      .v29 .f-tab[aria-selected="true"] { background: var(--ink); color: #fbfbf6; border: 0; }
      .v29 .f-fields { gap: 12px; }
      .v29 .f-fld { grid-template-columns: 210px minmax(0,1fr); align-items: center; gap: 0 10px; }
      .v29 .f-lab { display: flex; gap: 6px; font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; }
      .v29 .f-lab::after { content: "............................................"; flex: 1; overflow: hidden; opacity: .5; letter-spacing: .08em; }
      .v29 .f-inp { --fill: transparent; min-height: 36px; border: 0; padding: 4px 16px; font-family: var(--mono); font-size: 15px;
        background: linear-gradient(var(--ink), var(--ink)) left top / 2px 100% no-repeat, linear-gradient(var(--ink), var(--ink)) left top / 9px 2px no-repeat,
          linear-gradient(var(--ink), var(--ink)) left bottom / 9px 2px no-repeat, linear-gradient(var(--ink), var(--ink)) right top / 2px 100% no-repeat,
          linear-gradient(var(--ink), var(--ink)) right top / 9px 2px no-repeat, linear-gradient(var(--ink), var(--ink)) right bottom / 9px 2px no-repeat,
          linear-gradient(var(--fill), var(--fill)); }
      .v29 .f-inp:focus { --fill: rgba(198,255,74,.5); }
      .v29 .f-inp::placeholder { font-size: 13px; }
      .v29 .f-inp-code { letter-spacing: .3em; text-transform: uppercase; }
      .v29 .f-msg { border: 0; background: none; padding: 0; grid-template-columns: auto minmax(0,1fr); gap: 0 12px; font-family: var(--mono); font-size: 14px; line-height: 24px; color: #b2361b; }
      .v29 .f-msg::before { content: "?ERR"; grid-row: 1 / span 2; align-self: start; height: 24px; padding: 0 6px; background: #b2361b; color: #fbfbf6; font-weight: 600; }
      .v29 .f-msg[data-kind="lock"] { color: #8a5a00; }
      .v29 .f-msg[data-kind="lock"]::before { content: "LOCK"; background: #8a5a00; }
      .v29 .f-msg[data-kind="ok"] { color: #2f6f2a; }
      .v29 .f-msg[data-kind="ok"]::before { content: " OK "; background: #2f6f2a; white-space: pre; }
      .v29 .f-msg-t { font-weight: 600; }
      .v29 .f-go { justify-self: start; min-height: 40px; padding: 0 18px; background: var(--ink); color: #fbfbf6; font-family: var(--mono); font-weight: 500; font-size: 14px; }
      .v29 .f-go kbd { font-family: inherit; font-size: 11px; border: 1px solid rgba(251,251,246,.55); padding: 0 5px; margin-right: 4px; line-height: 18px; }
      .v29 .f-hint { font-size: 13px; opacity: .8; }
      .v29 .f-hint::before { content: "* "; }
      .v29 .pg-end span { display: none; }
      .v29[data-msg="none"] .pg-end .e0, .v29[data-msg="ok"] .pg-end .e0, .v29[data-msg="bad"] .pg-end .e1, .v29[data-msg="lock"] .pg-end .e2 { display: inline; }
      .v29 .pg-end { margin: 0; }
      .v29 .perf { position: absolute; left: 9cqw; width: min(880px, 62cqw); bottom: 7cqh; height: 0; border-top: 2px dashed rgba(8,11,9,.3); }
      .v29 .perf span { position: absolute; right: 52px; top: -11px; padding: 0 8px; background: #fbfbf6; font-family: var(--mono); font-size: 11px; color: #5b6358; }
      .v29 .feed { position: absolute; right: 5cqw; bottom: 8cqh; width: clamp(180px, 20cqw, 260px); display: grid; gap: 18px; justify-items: end; text-align: right; }
      .v29 .stack { display: grid; width: 100%; }
      .v29 .stack i { height: 15px; background: #fbfbf6; border: 1px solid rgba(8,11,9,.18); transform: skewX(-28deg); margin-top: -2px; box-shadow: 0 2px 2px -1px rgba(8,11,9,.15); }
      .v29 .stack i:nth-child(even) { transform: skewX(28deg); background: #e7f0e2; }
      .v29 .feed p { margin: 0; font-family: var(--mono); font-size: 11px; line-height: 1.7; color: #5b6358; }
      @container scr (max-width: 1200px) { .v29 .feed { display: none; } .v29 .sheet, .v29 .perf { left: 50%; transform: translateX(-50%); width: min(880px, calc(100cqw - 64px)); } }
      @container scr (max-width: 760px) {
        .v29 .sheet, .v29 .perf { left: 0; transform: none; width: 100%; }
        .v29 .sheet { grid-template-columns: 22px minmax(0,1fr) 22px; }
        .v29 .trk { background: radial-gradient(circle at 50% 50%, #d3d6cc 0 4px, rgba(8,11,9,.28) 4.5px, transparent 5.2px) 0 10px / 22px 24px repeat-y, #f6f6ee; }
        .v29 .pg { padding: 48px 14px 40px; font-size: 13px; }
        .v29 .ph-row { font-size: 11px; }
        .v29 .ph-row:last-of-type span:first-child { overflow: hidden; text-overflow: ellipsis; }
        .v29 .ph-title { font-size: 33px; line-height: 36px; }
        .v29 .f-fld { grid-template-columns: 1fr; gap: 4px; }
        .v29 .f-lab::after { display: none; }
        .v29 .f-tabs { gap: 8px; }
        .v29 .f-tab { font-size: 13px; padding: 0 4px; }
        .v29 .perf span { right: 30px; }
      }`,
    html: (F) => {
      const d = new Date();
      const when = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
      return `<div class="desk"></div>
        <div class="sheet">
          <div class="trk l" aria-hidden="true"></div>
          <div class="pg">
            <div class="ph-row"><span>${F.word()} PIPELINE LAB</span><span>PAGE 0001</span></div>
            <h2 class="ph-title">CRISTA LOGIN</h2>
            <div class="ph-row"><span>JOB 화면 ① 로그인 · 회원가입</span><span>${when}</span></div>
            <div class="rule" aria-hidden="true">${"=".repeat(90)}</div>
            ${F.form({ go: { login: "<kbd>ENTER</kbd> 들어가기", signup: "<kbd>ENTER</kbd> 가입하고 들어가기" } })}
            <div class="rule" aria-hidden="true">${"-".repeat(90)}</div>
            <p class="pg-end"><span class="e0">*** END OF JOB · 오류 0 ***</span><span class="e1">*** END OF JOB · 오류 1 · 다시 써 주세요 ***</span><span class="e2">*** HOLD · 1분 뒤 다시 인쇄 ***</span></p>
          </div>
          <div class="trk r" aria-hidden="true"></div>
        </div>
        <div class="perf" aria-hidden="true"><span>✂ 절취선</span></div>
        <aside class="feed" aria-hidden="true"><div class="stack">${"<i></i>".repeat(9)}</div><p>15인치 연속 용지 · 6 LPI<br>녹색 줄 ½인치 = 3줄</p></aside>`;
    },
  });

  /* ── 30 출근 카드 ── */
  const clockSvg = (d) => {
    let ticks = "";
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      ticks += `<line x1="0" y1="${big ? -84 : -88}" x2="0" y2="-94" stroke="#202520" stroke-width="${big ? 4 : 1.5}" transform="rotate(${i * 6})"/>`;
    }
    const nums = [[12, 0, -64], [3, 66, 6], [6, 0, 74], [9, -66, 6]].map(([n, x, y]) => `<text x="${x}" y="${y}" text-anchor="middle">${n}</text>`).join("");
    const h = (d.getHours() % 12) * 30 + d.getMinutes() * 0.5, m = d.getMinutes() * 6 + d.getSeconds() * 0.1, s = d.getSeconds() * 6;
    return `<svg viewBox="-100 -100 200 200" aria-hidden="true">${ticks}${nums}
      <line class="hh" x1="0" y1="10" x2="0" y2="-46" stroke="#202520" stroke-width="7" stroke-linecap="round" transform="rotate(${h})"/>
      <line class="mh" x1="0" y1="12" x2="0" y2="-70" stroke="#202520" stroke-width="4.5" stroke-linecap="round" transform="rotate(${m})"/>
      <line class="sh" x1="0" y1="16" x2="0" y2="-78" stroke="#c42a18" stroke-width="2" stroke-linecap="round" transform="rotate(${s})"/>
      <circle r="5" fill="#c42a18"/></svg>`;
  };
  add({
    no: 30, fam: "e", title: "출근 카드", en: "Time Card", swatch: "#f3e5c0",
    caption: "타임 레코더 옆 출근 카드에 아이디와 비밀번호를 씁니다. 들어가면 오늘 줄에 빨간 출근 시각이 찍히고, 가입은 첫 줄만 있는 신규 입사 카드가 됩니다.",
    css: `
      .v30 { background: #d5d6cb; --brick: #a8321c; --brown: #2f2418; }
      .v30 .wall { position: absolute; inset: 0; background: repeating-linear-gradient(90deg, rgba(8,11,9,.04) 0 2px, transparent 2px 180px), linear-gradient(#dcddd2, #cbccc1); }
      .v30 .tc { position: absolute; z-index: 2; left: 7cqw; top: 50%; transform: translateY(-50%) rotate(-.4deg); width: min(800px, 60cqw); max-height: calc(100% - 40px); overflow-y: auto; scrollbar-width: none;
        background: #f3e5c0; color: var(--brown); border-radius: 4px; box-shadow: 0 1px 0 rgba(0,0,0,.08), 0 26px 50px -18px rgba(40,30,10,.5); }
      .v30 .tc-h { display: grid; grid-template-columns: auto 1fr auto; align-items: end; gap: 18px; padding: 22px 28px 14px; border-bottom: 2px solid var(--brick); color: var(--brick); }
      .v30 .tc-h .wm { font-size: 22px; color: var(--brown); }
      .v30 .tc-h h2 { margin: 0; text-align: center; font-family: var(--serif); font-weight: 800; font-size: 30px; line-height: 1; letter-spacing: .32em; }
      .v30 .tc-h h2 small { display: block; margin-top: 6px; font-family: var(--mono); font-size: 10px; font-weight: 500; letter-spacing: .3em; }
      .v30 .tc-no { font-family: var(--mono); font-size: 13px; white-space: nowrap; }
      .v30 .tc-body { display: grid; grid-template-columns: minmax(0,1fr) 300px; }
      .v30 .tc-form { padding: 18px 28px 22px; border-right: 1px solid rgba(168,50,28,.4); min-width: 0; }
      .v30 .tc-log { padding: 12px 18px 18px; min-width: 0; }
      .v30 table { width: 100%; border-collapse: collapse; font: 13px/1.5 var(--sans); color: var(--brown); }
      .v30 .log-note { margin: 14px 4px 0; font-size: 12.5px; line-height: 1.6; color: rgba(47,36,24,.75); }
      .v30 caption { text-align: left; font-size: 11px; font-weight: 700; color: var(--brick); padding: 4px 4px 8px; letter-spacing: .06em; }
      .v30 th, .v30 td { border-bottom: 1px solid rgba(168,50,28,.35); padding: 8px 4px; text-align: left; font-weight: 400; }
      .v30 thead th { font-size: 11px; color: var(--brick); font-weight: 700; }
      .v30 tbody th { font-weight: 700; color: var(--brick); white-space: nowrap; }
      .v30 .dt small { color: rgba(47,36,24,.6); }
      .v30 .pt { display: inline-block; font-family: var(--mono); font-weight: 600; color: #4a2f80; letter-spacing: .04em; transform: rotate(-2deg); }
      .v30 .today td, .v30 .today th { height: 58px; }
      .v30 .slot { font-size: 11px; color: rgba(168,50,28,.75); border: 1px dashed rgba(168,50,28,.55); padding: 3px 6px; white-space: nowrap; }
      .v30 .now { display: none; color: #c42a18; border: 2px solid currentColor; padding: 2px 6px; font-size: 16px; transform: rotate(-6deg); opacity: .92; }
      .v30 .today.done .slot { display: none; }
      .v30 .today.done .now { display: inline-block; animation: v30-stamp .35s cubic-bezier(.2,1.6,.4,1) both; }
      @keyframes v30-stamp { from { transform: rotate(-6deg) scale(2.2); opacity: 0; } to { transform: rotate(-6deg) scale(1); opacity: .92; } }
      .v30[data-mode="signup"] .old { display: none; }
      .v30 .f { gap: 12px; }
      .v30 .f-tabs { gap: 20px; }
      .v30 .f-tab { flex: none; display: flex; align-items: center; gap: 8px; border: 0; padding: 4px 0; background: none; color: var(--brown); font-weight: 700; }
      .v30 .f-tab::before { content: ""; width: 16px; height: 16px; border: 2px solid var(--brick); flex: none; }
      .v30 .f-tab[aria-selected="true"] { background: none; color: var(--brown); }
      .v30 .f-tab[aria-selected="true"]::before { background: var(--brick); box-shadow: inset 0 0 0 3px #f3e5c0; }
      .v30 .f-fields { gap: 10px; }
      .v30[data-mode="signup"] .f-fields { grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 10px 18px; }
      .v30[data-mode="signup"] .f-fld-code { grid-column: 1 / -1; }
      .v30 .f-lab { font-size: 11.5px; color: var(--brick); font-weight: 700; }
      .v30 .f-inp { min-height: 38px; padding: 6px 2px; border: 0; border-bottom: 1.5px solid var(--brown); font-family: var(--mono); font-size: 16px; background: transparent; }
      .v30 .f-inp:focus { background: rgba(255,255,255,.45); border-bottom-width: 2.5px; }
      .v30 .f-inp-code { letter-spacing: .3em; text-transform: uppercase; }
      .v30 .f-inp::placeholder { font-family: var(--sans); font-size: 13px; }
      .v30 .f-msg { border-radius: 3px; background: rgba(255,255,255,.45); }
      .v30 .f-go { min-height: 50px; border-radius: 3px; background: var(--brown); color: #f3e5c0; justify-content: space-between; }
      .v30 .f-go small { font-size: 11px; font-weight: 500; opacity: .72; letter-spacing: .06em; }
      .v30 .f-hint { color: var(--brown); }
      .v30 .tc-f { display: flex; justify-content: space-between; gap: 16px; padding: 10px 28px; border-top: 2px solid var(--brick); font-size: 11px; color: var(--brick); }
      .v30 .rec { position: absolute; z-index: 1; right: 7cqw; top: 50%; transform: translateY(-50%); width: 290px; padding: 20px; border-radius: 18px 18px 10px 10px; display: grid; gap: 16px; justify-items: center;
        background: linear-gradient(#ecebe3, #c7c4b8); border: 1px solid rgba(8,11,9,.25); box-shadow: inset 0 2px 0 rgba(255,255,255,.7), 0 30px 50px -20px rgba(8,11,9,.5); }
      .v30 .rec-slot { width: 100%; height: 30px; border-radius: 6px; background: #2a2b26; box-shadow: inset 0 3px 6px rgba(0,0,0,.6); display: grid; place-items: center; font-size: 10px; color: rgba(241,241,233,.5); letter-spacing: .1em; }
      .v30 .rec-face { width: 210px; height: 210px; border-radius: 50%; background: #fbfbf6; border: 9px solid #3a3b35; box-shadow: inset 0 3px 10px rgba(0,0,0,.25); padding: 6px; }
      .v30 .rec-face svg { display: block; width: 100%; height: 100%; }
      .v30 .rec-face text { font-family: var(--sans); font-size: 20px; font-weight: 700; fill: #202520; }
      .v30 .rec-lcd { width: 100%; padding: 10px 12px; border-radius: 6px; background: #1a1d18; display: flex; justify-content: space-between; gap: 8px; font-family: var(--pixel-mono); font-size: 22px; line-height: 1; color: #ff5a3c; text-shadow: 0 0 6px rgba(255,90,60,.6); white-space: nowrap; }
      .v30[data-msg="ok"] .rec-lcd { color: #8dff5a; text-shadow: 0 0 6px rgba(141,255,90,.5); }
      .v30[data-msg="lock"] .rec-lcd { color: #ffb21a; text-shadow: 0 0 6px rgba(255,178,26,.5); }
      .v30 .rec-lab { font-family: var(--mono); font-size: 10px; letter-spacing: .22em; color: #5b6358; }
      @container scr (max-width: 1180px) { .v30 .tc { width: min(800px, 64cqw); left: 4cqw; } .v30 .rec { right: 4cqw; width: 240px; } .v30 .rec-face { width: 170px; height: 170px; } }
      @container scr (max-width: 760px) {
        .v30 .rec { left: 16px; right: 16px; top: 16px; transform: none; width: auto; padding: 8px; border-radius: 10px; display: block; }
        .v30 .rec-slot, .v30 .rec-face, .v30 .rec-lab { display: none; }
        .v30 .rec-lcd { font-size: 22px; }
        .v30 .tc { left: 16px; right: 16px; width: auto; top: 84px; bottom: 16px; transform: none; max-height: none; }
        .v30 .tc-h { grid-template-columns: 1fr auto; padding: 16px; gap: 12px; }
        .v30 .tc-h h2 { grid-column: 1 / -1; grid-row: 2; text-align: left; font-size: 24px; }
        .v30 .tc-body { grid-template-columns: 1fr; }
        .v30 .tc-form { padding: 16px; border-right: 0; border-bottom: 1px solid rgba(168,50,28,.4); }
        .v30 .tc-log { padding: 8px 16px 12px; }
        .v30 .old.o1, .v30 .old.o2 { display: none; }
        .v30[data-mode="signup"] .f-fields { grid-template-columns: 1fr; }
        .v30 .tc-f { padding: 10px 16px; flex-direction: column; gap: 2px; }
      }`,
    html: (F) => {
      const now = new Date();
      const row = (n, back, inT, outT, cls) => {
        const d = new Date(now);
        d.setDate(d.getDate() - back);
        return `<tr class="${cls}"><th>${n}</th><td class="dt">${d.getMonth() + 1}/${pad2(d.getDate())} <small>${DAYS[d.getDay()]}</small></td><td>${inT}</td><td>${outT}</td></tr>`;
      };
      const lcdD = `${now.getMonth() + 1}/${pad2(now.getDate())} ${DAYS[now.getDay()]}`, lcdT = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      return `<div class="wall"></div>
        <article class="tc" aria-label="출근 카드">
          <header class="tc-h">
            ${F.word()}
            <h2><span class="li">출근 카드</span><span class="su">신규 입사 카드</span><small>TIME CARD</small></h2>
            <span class="tc-no">No. 0024</span>
          </header>
          <div class="tc-body">
            <div class="tc-form">${F.form({
              tabLabels: { login: "출근(로그인)", signup: "신규 입사(학생 가입)" },
              labels: { id: "아이디 · 사원 번호", name: "이름(별명도 돼요)" },
              go: { login: "들어가기 <small>카드 찍기</small>", signup: "가입하고 들어가기 <small>첫 카드 찍기</small>" },
            })}</div>
            <div class="tc-log">
              <table>
                <caption>수업 출근 기록(예시)</caption>
                <thead><tr><th>회</th><th>날짜</th><th>출근</th><th>퇴근</th></tr></thead>
                <tbody>
                  ${row("1회", 21, '<span class="pt">08:57</span>', '<span class="pt">09:42</span>', "old o1")}
                  ${row("2회", 14, '<span class="pt">09:03</span>', '<span class="pt">09:45</span>', "old o2")}
                  ${row("3회", 7, '<span class="pt">08:59</span>', '<span class="pt">09:44</span>', "old")}
                  ${row('<span class="li">4회</span><span class="su">1회</span>', 0, '<span class="slot">여기에 찍혀요</span><span class="pt now">--:--</span>', "", "today")}
                </tbody>
              </table>
              <p class="log-note su">첫 수업에 들어가면 이 줄에 첫 출근 시각이 찍혀요. 다음 수업부터 한 줄씩 늘어나요.</p>
            </div>
          </div>
          <footer class="tc-f"><span>본인 카드만 찍어 주세요 · 교사 카드는 따로 발급해요</span><span>비밀번호 5번 틀리면 1분 동안 잠겨요</span></footer>
        </article>
        <div class="rec" aria-hidden="true">
          <div class="rec-slot">카드를 넣으세요 ▼</div>
          <div class="rec-face">${clockSvg(now)}</div>
          <div class="rec-lcd"><b class="lcd-d">${lcdD}</b><b class="lcd-t">${lcdT}</b></div>
          <div class="rec-lab">TIME RECORDER</div>
        </div>`;
    },
    mount(root, ctx) {
      if (!ctx.live) return;
      const hh = root.querySelector(".hh"), mh = root.querySelector(".mh"), sh = root.querySelector(".sh");
      const ld = root.querySelector(".lcd-d"), lt = root.querySelector(".lcd-t");
      const today = root.querySelector(".today"), now = root.querySelector(".now");
      const hm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
      const tick = () => {
        const d = new Date();
        hh.setAttribute("transform", `rotate(${(d.getHours() % 12) * 30 + d.getMinutes() * 0.5})`);
        mh.setAttribute("transform", `rotate(${d.getMinutes() * 6 + d.getSeconds() * 0.1})`);
        sh.setAttribute("transform", `rotate(${d.getSeconds() * 6})`);
        const m = root.dataset.msg;
        if (m === "bad") { ld.textContent = "ERR"; lt.textContent = "다시"; }
        else if (m === "lock") { ld.textContent = "LOCK"; lt.textContent = (root.querySelector(".f-msg-d").textContent.split(" ")[0] || "1:00"); }
        else if (m === "ok") { ld.textContent = "출근"; lt.textContent = now.textContent; }
        else { ld.textContent = `${d.getMonth() + 1}/${pad2(d.getDate())} ${DAYS[d.getDay()]}`; lt.textContent = hm(d); }
      };
      const onState = () => {
        const ok = root.dataset.msg === "ok";
        if (ok && !today.classList.contains("done")) now.textContent = hm(new Date());
        today.classList.toggle("done", ok);
        tick();
      };
      tick();
      const iv = setInterval(tick, 1000);
      const mo = new MutationObserver(onState);
      mo.observe(root, { attributes: true, attributeFilter: ["data-msg", "data-mode"] });
      ctx.cleanup(() => { clearInterval(iv); mo.disconnect(); });
    },
  });
})();
