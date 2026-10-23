/* 본문 레이아웃 00~15 — 지금 화면(00)과 새 시안 01~15.
   각 레이아웃은 { no, name, idea, css, render(c), after? } 하나. c.P 의 부품(nav · head · tabs · card · view)을 골라 배치한다.
   CSS 는 .Lxx 아래로만 걸고, 폰 너비 공통 규칙은 본문 쪽이 맨 뒤에 붙인다. */
(function () {
  "use strict";
  const add = (L) => window.LAY.push(L);

  /* ── 00 지금 화면(비교용) ── */
  add({
    no: 0, name: "지금 화면 (비교용)", idea: "지금 배포된 본문 그대로. 직각 테두리 · 칸 나눔 탭 · 선으로 나눈 카드.",
    render: (c) => `<div class="Lw L00"><aside class="Ls">${c.P.nav({ head: true, sub: true, foot: true })}</aside>
      <main class="Lm">${c.P.head()}${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L00 { --vz-r: 0; --vz-r2: 0; display: grid; grid-template-columns: 272px minmax(0, 1fr); padding: 0; min-height: 100%; }
    .L00 .Ls { border-right: 1px solid var(--line-strong); padding: 18px 14px 18px max(16px, env(safe-area-inset-left, 0px)); }
    .L00 .nv { gap: 4px; position: sticky; top: 18px; }
    .L00 .nv-h { margin-bottom: 10px; }
    .L00 .nv-g { padding-bottom: 12px; margin-bottom: 8px; border-bottom: 1px solid var(--line); gap: 2px; }
    .L00 .nv-g:last-of-type { border-bottom: 0; }
    .L00 .nv-gh { font-size: 15.5px; letter-spacing: -0.02em; margin-bottom: 4px; }
    .L00 .nv-gh b { font-size: 0.9em; color: var(--ink); }
    .L00 .nv-s { grid-template-columns: 38px minmax(0, 1fr); padding: 8px 8px 8px 14px; }
    .L00 .nv-s[aria-current] { background: var(--film); }
    .L00 .nv-f { padding-top: 16px; gap: 6px; }
    .L00 .Lm { max-width: 1240px; padding: 24px max(16px, env(safe-area-inset-right, 0px)) 48px 30px; gap: 18px; }
    .L00 .hd { grid-template-columns: auto minmax(0, 1fr); gap: 4px 18px; align-items: start; }
    .L00 .hd-n { grid-row: span 3; font: 700 64px/0.82 var(--sans); letter-spacing: -0.06em; padding-top: 4px; background: var(--film); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-stroke: 1px var(--ink); }
    .L00 .tb { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 0; border: 1px solid var(--line-strong); background: var(--surface); }
    .L00 .tb-i { box-shadow: inset -1px -1px 0 var(--line); padding: 8px 10px; }
    .L00 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
    .L00 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L00 .cd { border: 1px solid var(--line-strong); background: var(--surface); gap: 0; }
    .L00 .cd-h { padding: 12px 16px; border-bottom: 1px solid var(--line); gap: 6px 14px; }
    .L00 .cd-no { padding: 1px 6px; background: var(--ink); color: var(--hi); }
    .L00 .cd-t { font-size: 17px; }
    .L00 .cd-b { padding: 18px 16px; }
    .L00 .cd-f { padding: 10px 16px; border-top: 1px dashed var(--line-strong); }
    .L00 .ga { gap: 14px; }
    .L00 .ga .cd-b { padding: 14px 12px; }
    @media (max-width: 860px) { .lay .L00 .Ls { border-right: 0; border-bottom: 1px solid var(--line-strong); padding: 8px 0; } .L00 .nv { position: static; } .L00 .Lm { padding: 0; } .L00 .hd-n { font-size: 44px; } }`
  });

  /* ── 01 떠 있는 레일 ── */
  add({
    no: 1, name: "떠 있는 레일", idea: "사이드바를 벽에서 떼어 둥근 판으로 띄우고, 탭은 알약, 카드는 그림자 한 겹으로 테두리 없이.",
    render: (c) => `<div class="Lw L01"><aside class="Ls">${c.P.nav({ sub: true, foot: true })}</aside>
      <main class="Lm">${c.P.head()}${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L01 { display: grid; grid-template-columns: 264px minmax(0, 1fr); gap: 28px; }
    .L01 .Ls { position: sticky; top: 0; align-self: start; background: var(--surface); border-radius: 22px; box-shadow: var(--sh-1); padding: 18px 10px; max-height: calc(100dvh - 210px); overflow: auto; }
    .L01 .nv { gap: 16px; }
    .L01 .nv-gh { padding: 0 10px; font-size: 12px; color: var(--muted); font-weight: 600; }
    .L01 .nv-s { border-radius: 14px; }
    .L01 .nv-s:hover { background: var(--raise); }
    .L01 .nv-s[aria-current] { background: var(--film); box-shadow: inset 0 0 0 1px var(--line); }
    .L01 .nv-f { margin: 2px 10px 0; padding-top: 12px; border-top: 1px solid var(--line); }
    .L01 .Lm { max-width: 1180px; gap: 22px; }
    .L01 .hd { grid-template-columns: auto minmax(0, 1fr); column-gap: 14px; }
    .L01 .hd-n { grid-row: span 3; align-self: start; padding: 5px 12px; border-radius: 999px; background: var(--ink); color: var(--hi); font-size: 14px; margin-top: 2px; }
    .L01 .tb-i { display: flex; gap: 8px; align-items: baseline; border-radius: 999px; background: var(--surface); padding: 7px 14px; box-shadow: inset 0 0 0 1px var(--line); }
    .L01 .tb-i:hover { background: var(--surface); box-shadow: inset 0 0 0 1px var(--line-strong); }
    .L01 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); box-shadow: none; }
    .L01 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L01 .cd { background: var(--surface); border-radius: 22px; box-shadow: var(--sh-1); padding: 22px 24px; gap: 18px; }
    .L01 .cd-no { color: var(--muted); }
    .L01 .cd-f { background: var(--hi-soft); border-radius: 14px; padding: 12px 14px; }
    .L01 .cd-f b { border-radius: 999px; }
    .L01 .ga .cd { padding: 16px 18px; }`
  });

  /* ── 02 여백만으로 ── */
  add({
    no: 2, name: "여백만으로", idea: "선 · 면 · 테두리를 모두 빼고 간격과 글자 굵기만으로 나눈다. 지금 단계는 점 하나, 고른 시안은 형광펜 한 줄.",
    render: (c) => `<div class="Lw L02"><aside class="Ls">${c.P.nav({ foot: true })}</aside>
      <main class="Lm">${c.P.head()}${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L02 { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 56px; padding-top: 40px; }
    .L02 .Ls { position: sticky; top: 40px; align-self: start; }
    .L02 .nv { gap: 22px; }
    .L02 .nv-gh { font: 500 10.5px/1.2 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
    .L02 .nv-gh b { color: inherit; font-size: inherit; font-weight: 500; }
    .L02 .nv-s { grid-template-columns: 16px 32px minmax(0, 1fr); padding: 5px 0; color: var(--muted); }
    .L02 .nv-s::before { content: ""; width: 7px; height: 7px; border-radius: 50%; align-self: center; }
    .L02 .nv-s:hover { background: transparent; color: var(--ink); }
    .L02 .nv-s[aria-current] { color: var(--ink); }
    .L02 .nv-s[aria-current]::before { background: var(--ink); box-shadow: 0 0 0 4px var(--hi); }
    .L02 .nv-f { margin-top: 6px; }
    .L02 .Lm { max-width: 1080px; gap: 30px; }
    .L02 .hd { gap: 8px; }
    .L02 .hd-n { color: var(--muted); }
    .L02 .hd-t { font-size: 36px; }
    .L02 .tb { gap: 4px 20px; }
    .L02 .tb-i { display: flex; gap: 6px; align-items: baseline; padding: 2px 0; color: var(--muted); }
    .L02 .tb-i:hover { background: transparent; color: var(--ink); }
    .L02 .tb-i[aria-pressed="true"] { color: var(--ink); }
    .L02 .tb-i[aria-pressed="true"] .tb-t { box-shadow: inset 0 -0.42em 0 var(--hi); }
    .L02 .cd { gap: 20px; }
    .L02 .cd-t { font-size: 22px; }
    .L02 .cd-no { color: var(--muted); }
    .L02 .cd-f b { background: transparent; padding: 0; color: var(--muted); }
    .L02 .ga { gap: 44px 36px; }
    @media (max-width: 860px) { .lay .L02 .Ls .nv-s::before { display: none; } .lay .L02 .Ls .nv-s[aria-current] { box-shadow: inset 0 -0.42em 0 var(--hi); } }`
  });

  /* ── 03 세로 타임라인 ── */
  add({
    no: 3, name: "세로 타임라인", idea: "단계를 줄 위의 동그란 마디로. 지난 단계는 채운 점, 지금 단계는 박막색 큰 점. 단계 번호도 원 안에.",
    render: (c) => `<div class="Lw L03"><aside class="Ls">${c.P.nav({ sub: true })}</aside>
      <main class="Lm">${c.P.head()}${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L03 { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 40px; }
    .L03 .Ls { position: sticky; top: 0; align-self: start; }
    .L03 .nv { position: relative; gap: 16px; }
    .L03 .nv::before { content: ""; position: absolute; left: 11px; top: 6px; bottom: 10px; width: 2px; border-radius: 2px; background: var(--line); }
    .L03 .nv-gh { position: relative; padding-left: 34px; font: 500 10.5px/1.4 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
    .L03 .nv-gh b { color: inherit; font-size: inherit; font-weight: 500; }
    .L03 .nv-s { position: relative; padding: 6px 10px 6px 34px; border-radius: 12px; }
    .L03 .nv-s::before { content: ""; position: absolute; left: 5px; top: 11px; width: 14px; height: 14px; border-radius: 50%; background: var(--paper); box-shadow: inset 0 0 0 2px var(--line-strong); }
    .L03 .nv-s.is-done::before { background: var(--ink); box-shadow: none; }
    .L03 .nv-s[aria-current] { background: var(--surface); }
    .L03 .nv-s[aria-current]::before { left: 1px; top: 7px; width: 22px; height: 22px; background: var(--film); box-shadow: inset 0 0 0 2px var(--ink), 0 0 0 4px var(--paper); }
    .L03 .nv-s:hover { background: var(--surface); }
    .L03 .Lm { max-width: 1160px; gap: 22px; }
    .L03 .hd { grid-template-columns: 76px minmax(0, 1fr); column-gap: 18px; }
    .L03 .hd-n { grid-row: span 3; width: 76px; height: 76px; border-radius: 50%; display: grid; place-items: center; background: var(--film); font-size: 20px; box-shadow: inset 0 0 0 1.5px var(--ink); }
    .L03 .tb { gap: 4px 16px; }
    .L03 .tb-i { display: flex; align-items: center; gap: 7px; padding: 4px 0; }
    .L03 .tb-i::before { content: ""; flex: none; width: 9px; height: 9px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px var(--line-strong); }
    .L03 .tb-i:hover { background: transparent; }
    .L03 .tb-i:hover .tb-t { text-decoration: underline; text-underline-offset: 3px; }
    .L03 .tb-i[aria-pressed="true"]::before { background: var(--ink); box-shadow: 0 0 0 3px var(--hi); }
    .L03 .tb-n { display: none; }
    .L03 .cd { background: var(--surface); border-radius: 18px; box-shadow: inset 0 0 0 1px var(--line); padding: 20px 22px; gap: 16px; }
    .L03 .cd-f { padding-top: 14px; border-top: 1px dashed var(--line-strong); }
    .L03 .cd-f b { border-radius: 999px; }
    @media (max-width: 860px) { .L03 .nv::before { display: none; } .lay .L03 .Ls .nv-s { padding: 6px 12px; border-radius: 999px; } .L03 .nv-s::before { display: none; } .L03 .nv-s[aria-current] { background: var(--film); } .L03 .hd { grid-template-columns: 56px minmax(0, 1fr); } .L03 .hd-n { width: 56px; height: 56px; font-size: 15px; } }`
  });

  /* ── 04 동그라미 레일 ── */
  add({
    no: 4, name: "동그라미 레일", idea: "사이드바를 64px 동그라미 줄로 줄이고 이름은 마우스를 올릴 때만. 본문이 넓어지고 탭은 한 덩어리 토글.",
    render: (c) => `<div class="Lw L04"><aside class="Ls">${c.P.nav({ short: true })}</aside>
      <main class="Lm">${c.P.head()}${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L04 { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 32px; }
    .L04 .Ls { position: sticky; top: 0; align-self: start; z-index: 3; }
    .L04 .nv { gap: 12px; justify-items: center; }
    .L04 .nv-gh { font: 500 9.5px/1 var(--mono); color: var(--muted); }
    .L04 .nv-gh span { display: none; }
    .L04 .nv-gh b { font-size: inherit; font-weight: 500; }
    .L04 .nv-gh b::before { content: "P"; }
    .L04 .nv-l { gap: 6px; }
    .L04 .nv-s { position: relative; width: 48px; height: 48px; padding: 0; display: grid; grid-template-columns: none; place-items: center; border-radius: 50%; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line); }
    .L04 .nv-s:hover { background: var(--raise); }
    .L04 .nv-s.is-done { background: var(--raise); }
    .L04 .nv-s[aria-current] { background: var(--hi); box-shadow: inset 0 0 0 1.5px var(--ink); }
    .L04 .nv-t { position: absolute; left: calc(100% + 10px); top: 50%; transform: translate(-4px, -50%); white-space: nowrap; padding: 5px 11px; border-radius: 999px; background: var(--ink); color: var(--paper); font-size: 12px; opacity: 0; pointer-events: none; transition: opacity 0.15s, transform 0.15s; }
    .L04 .nv-s:hover .nv-t, .L04 .nv-s:focus-visible .nv-t { opacity: 1; transform: translate(0, -50%); }
    .L04 .Lm { max-width: 1240px; gap: 22px; }
    .L04 .hd { grid-template-columns: auto minmax(0, 1fr); column-gap: 18px; align-items: baseline; }
    .L04 .hd-n { grid-row: span 3; font: 400 58px/0.9 var(--sans); letter-spacing: -0.05em; color: var(--muted); }
    .L04 .tb { justify-self: start; gap: 2px; padding: 4px; border-radius: 16px; background: var(--raise); }
    .L04 .tb-i { border-radius: 12px; padding: 6px 12px; }
    .L04 .tb-i:hover { background: var(--glass-edge); }
    .L04 .tb-i[aria-pressed="true"] { background: var(--surface); box-shadow: var(--sh-1); }
    .L04 .tb-i[aria-pressed="true"] .tb-n { color: var(--ink); }
    .L04 .cd { gap: 16px; }
    .L04 .cd-b { background: var(--surface); border-radius: 20px; padding: 22px; }
    .L04 .cd-f b { border-radius: 6px; }
    .L04 .ga .cd-b { padding: 16px; }
    @media (max-width: 860px) { .L04 .nv-t { display: none; } .L04 .hd-n { font-size: 40px; } }`
  });

  /* ── 05 알약 진행 ── */
  add({
    no: 5, name: "알약 진행", idea: "사이드바를 없애고 4묶음을 알약 캡슐 넷으로 위에 한 줄. 본문은 가운데 한 기둥, 카드는 큰 둥근 판.",
    render: (c) => `<div class="Lw L05"><div class="L05-top">${c.P.nav()}</div>
      <main class="Lm">${c.P.head({ code: false })}${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L05 { display: grid; gap: 30px; }
    .L05-top { overflow-x: auto; padding: 4px; margin: -4px; scrollbar-width: none; }
    .L05 .nv { display: flex; gap: 10px; width: max-content; margin-inline: auto; }
    .L05 .nv-g { display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 999px; background: var(--raise); }
    .L05 .nv-gh { padding: 0 8px 0 12px; font-size: 12px; }
    .L05 .nv-l { display: flex; gap: 2px; }
    .L05 .nv-s { display: flex; gap: 7px; align-items: baseline; white-space: nowrap; border-radius: 999px; padding: 7px 15px; }
    .L05 .nv-s:hover { background: var(--glass-edge); }
    .L05 .nv-s[aria-current] { background: var(--ink); color: var(--paper); }
    .L05 .nv-s[aria-current] .nv-c { color: var(--hi); }
    .L05 .Lm { width: 100%; max-width: 1080px; justify-self: center; gap: 24px; }
    .L05 .hd-t { font-size: 32px; }
    .L05 .tb-i { display: flex; gap: 8px; align-items: baseline; border-radius: 999px; padding: 6px 14px; background: var(--surface); }
    .L05 .tb-i:hover { background: var(--raise); }
    .L05 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
    .L05 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L05 .cd { background: var(--surface); border-radius: 26px; padding: 26px 28px; gap: 18px; }
    .L05 .cd-f { border-top: 1px solid var(--line); padding-top: 14px; }
    .L05 .cd-f b { border-radius: 999px; }
    @media (max-width: 860px) { .L05 .nv { margin-inline: 0; } .L05 .cd { padding: 20px 18px; } }`
  });

  /* ── 06 곡선 파이프라인 ── */
  const curve = (c) => {
    const { P } = c, S = P.STEPS, W = 1000, H = 170;
    const pts = S.map((s, i) => [70 + i * (860 / 7), 86 + 22 * Math.sin(i * 1.15 + 0.5)]);
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    const cx = pts[c.n - 1][0];
    const phs = P.PHASES.map((p) => {
      const ix = S.filter((s) => s.ph === p.n).map((s) => s.n - 1), x = (pts[ix[0]][0] + pts[ix[ix.length - 1]][0]) / 2;
      return `<text x="${x.toFixed(1)}" y="22" text-anchor="middle" class="L06-ph${p.n === c.st.ph ? " is-cur" : ""}">${p.n} · ${P.esc(p.t)}</text>`;
    }).join("");
    const nodes = S.map((s, i) => {
      const [x, y] = pts[i], cur = s.n === c.n, done = s.n < c.n;
      return `<g class="L06-n${cur ? " is-cur" : done ? " is-done" : ""}" data-step="${s.n}" role="button" tabindex="0" aria-label="${s.code} ${P.esc(s.t)}"${cur ? ' aria-current="step"' : ""}>
        <circle cx="${x}" cy="${y}" r="24" fill="transparent"/>
        ${cur ? `<circle cx="${x}" cy="${y}" r="20" class="L06-halo"/>` : ""}
        <circle cx="${x}" cy="${y}" r="${cur ? 13 : 7}" class="L06-dot"/>
        <text x="${x}" y="${y + 38}" text-anchor="middle" class="L06-c">${s.code}</text>
        <text x="${x}" y="${y + 55}" text-anchor="middle" class="L06-t">${P.esc(s.short)}</text></g>`;
    }).join("");
    return `<svg class="L06-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="파이프라인 8단계">
      <defs><linearGradient id="l06f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--film-1)"/><stop offset=".3" stop-color="var(--film-2)"/><stop offset=".55" stop-color="var(--film-3)"/><stop offset=".8" stop-color="var(--film-4)"/><stop offset="1" stop-color="var(--film-5)"/></linearGradient>
      <clipPath id="l06c"><rect x="0" y="0" width="${cx}" height="${H}"/></clipPath></defs>
      ${phs}<path d="${d}" class="L06-path"/><path d="${d}" class="L06-done" clip-path="url(#l06c)"/>${nodes}</svg>`;
  };
  add({
    no: 6, name: "곡선 파이프라인", idea: "8단계를 위에 물결 하나로 잇는다. 지나온 길은 진하게, 남은 길은 점선. 아래 본문은 테두리 없이.",
    render: (c) => `<div class="Lw L06"><div class="L06-map">${curve(c)}</div>
      <main class="Lm">${c.P.head({ code: false })}${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L06 { display: grid; gap: 18px; }
    .L06-map { overflow-x: auto; margin-inline: -8px; }
    .L06-svg { display: block; width: 100%; min-width: 680px; height: auto; max-width: 1180px; margin-inline: auto; overflow: visible; }
    .L06-path { fill: none; stroke: var(--line-strong); stroke-width: 2; stroke-dasharray: 2 7; stroke-linecap: round; }
    .L06-done { fill: none; stroke: var(--ink); stroke-width: 2.5; stroke-linecap: round; }
    .L06-ph { font: 500 11px var(--mono); letter-spacing: 0.08em; fill: var(--muted); }
    .L06-ph.is-cur { fill: var(--ink); font-weight: 600; }
    .L06-n { cursor: pointer; outline: none; }
    .L06-dot { fill: var(--paper); stroke: var(--ink); stroke-width: 1.5; transition: r 0.2s; }
    .L06-n.is-done .L06-dot { fill: var(--ink); }
    .L06-n.is-cur .L06-dot { fill: url(#l06f); stroke-width: 2; }
    .L06-halo { fill: none; stroke: var(--hi); stroke-width: 5; }
    .L06-n:hover .L06-dot, .L06-n:focus-visible .L06-dot { stroke-width: 3; }
    .L06-c { font: 600 12px var(--mono); fill: var(--ink); }
    .L06-t { font: 600 13px var(--sans); fill: var(--muted); }
    .L06-n.is-cur .L06-t { fill: var(--ink); }
    .L06 .Lm { width: 100%; max-width: 1120px; justify-self: center; gap: 22px; }
    .L06 .tb { gap: 4px; }
    .L06 .tb-i { border-radius: 10px; display: flex; gap: 6px; align-items: baseline; }
    .L06 .tb-i[aria-pressed="true"] { background: var(--surface); box-shadow: inset 0 0 0 1px var(--line-strong); }
    .L06 .cd { gap: 18px; padding: 24px 0; border-top: 1px solid var(--line); }
    .L06 .cd-b { background: var(--surface); border-radius: 22px; padding: 22px; }
    .L06 .cd-f b { border-radius: 999px; }
    .L06 .ga .cd { padding: 16px 0 0; }`
  });

  /* ── 07 묶음 탭 ── */
  add({
    no: 7, name: "묶음 탭", idea: "4묶음을 큰 토글 하나로, 고른 묶음의 2단계만 그 아래 카드로. 한 번에 보이는 선택지가 줄어든다.",
    render: (c) => {
      const { P } = c;
      const phs = P.PHASES.map((p) => {
        const codes = P.STEPS.filter((s) => s.ph === p.n).map((s) => s.code).join(" · ");
        return `<button type="button" class="L07-ph" data-step="${P.firstOf(p.n)}" aria-pressed="${p.n === c.st.ph}"><b>${p.n}</b><span>${P.esc(p.t)}</span><small>${codes}</small></button>`;
      }).join("");
      const sts = P.STEPS.filter((s) => s.ph === c.st.ph).map((s) =>
        `<button type="button" class="L07-st" data-step="${s.n}" ${s.n === c.n ? 'aria-current="step"' : ""}><span class="nv-c">${s.code}</span><b>${P.esc(s.t)}</b><small>${P.esc(s.sub)}</small></button>`).join("");
      return `<div class="Lw L07"><div class="L07-nav"><div class="L07-phs" role="group" aria-label="4묶음">${phs}</div><div class="L07-sts" role="group" aria-label="이 묶음의 단계">${sts}</div></div>
        <main class="Lm">${P.head({ code: false })}${P.tabs()}${P.view()}</main></div>`;
    },
    css: `
    .L07 { display: grid; gap: 28px; }
    .L07-nav { display: grid; gap: 12px; max-width: 1180px; }
    .L07-phs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; padding: 5px; border-radius: 20px; background: var(--raise); }
    .L07-ph { appearance: none; border: 0; background: transparent; color: inherit; border-radius: 15px; padding: 10px 14px; display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 10px; text-align: left; align-items: baseline; transition: background-color 0.18s, box-shadow 0.18s; }
    .L07-ph b { grid-row: span 2; font: 600 24px/1 var(--mono); }
    .L07-ph span { font-weight: 700; }
    .L07-ph small { font: 10.5px var(--mono); color: var(--muted); }
    .L07-ph:hover { background: var(--glass-edge); }
    .L07-ph[aria-pressed="true"] { background: var(--surface); box-shadow: var(--sh-1); }
    .L07-sts { display: flex; flex-wrap: wrap; gap: 10px; }
    .L07-st { appearance: none; border: 0; background: transparent; color: inherit; text-align: left; display: grid; gap: 2px; padding: 12px 18px; border-radius: 16px; box-shadow: inset 0 0 0 1px var(--line-strong); flex: 0 1 280px; min-width: 0; }
    .L07-st:hover { background: var(--surface); }
    .L07-st[aria-current] { background: var(--film); box-shadow: inset 0 0 0 1.5px var(--ink); }
    .L07-st small { font: 10.5px var(--mono); color: var(--muted); }
    .L07 .Lm { max-width: 1180px; gap: 20px; }
    .L07 .tb { gap: 0 2px; border-bottom: 1px solid var(--line); }
    .L07 .tb-i { position: relative; padding: 8px 12px 11px; }
    .L07 .tb-i::after { content: ""; position: absolute; left: 10px; right: 10px; bottom: -1px; height: 3px; border-radius: 3px 3px 0 0; }
    .L07 .tb-i:hover { background: transparent; }
    .L07 .tb-i:hover .tb-t { text-decoration: underline; text-underline-offset: 3px; }
    .L07 .tb-i[aria-pressed="true"]::after { background: var(--ink); }
    .L07 .tb-i[aria-pressed="true"] .tb-n { color: var(--ink); }
    .L07 .cd { gap: 16px; }
    .L07 .cd-f { padding: 14px 16px; border-radius: 14px; background: var(--surface); }
    .L07 .cd-f b { border-radius: 6px; }
    @media (max-width: 860px) { .L07-phs { grid-template-columns: repeat(2, minmax(0, 1fr)); } .L07-st { flex: 1 1 100%; } .L07 .tb { border-bottom: 0; } }`
  });

  /* ── 08 한 줄 읽기 ── */
  add({
    no: 8, name: "한 줄 읽기", idea: "가운데 880px 한 기둥. 단계는 번호만 한 줄, 시안은 점 10개(고른 점이 길어진다). 책 읽듯 위에서 아래로.",
    render: (c) => {
      const { P } = c;
      const nav = P.PHASES.map((p) => `<span class="L08-g"><i>${P.esc(p.t)}</i>${P.STEPS.filter((s) => s.ph === p.n).map((s) =>
        `<button type="button" class="L08-c" data-step="${s.n}" ${s.n === c.n ? 'aria-current="step"' : ""} aria-label="${s.code} ${P.esc(s.t)}" title="${s.code} ${P.esc(s.t)}">${s.code}</button>`).join("")}</span>`).join("");
      const cur = c.all ? `${c.L.length}종 모아 보기` : `<span>${P.pad(c.v + 1)} / ${P.pad(c.L.length)}</span> ${P.esc(c.it ? c.it.name : "")}`;
      return `<div class="Lw L08"><div class="L08-col"><nav class="L08-nav" aria-label="파이프라인 단계">${nav}</nav>${P.head({ code: false })}
        <div class="L08-tabs">${P.tabs({ numOnly: true })}<p class="L08-cur">${cur}</p></div>${P.view()}</div></div>`;
    },
    css: `
    .L08 { display: grid; justify-items: center; padding-top: 36px; }
    .L08-col { width: 100%; max-width: 880px; min-width: 0; display: grid; gap: 26px; }
    .L08-nav { display: flex; flex-wrap: wrap; gap: 6px 22px; align-items: baseline; }
    .L08-g { display: inline-flex; gap: 2px; align-items: baseline; }
    .L08-g i { font-style: normal; font-size: 12px; color: var(--muted); margin-right: 6px; }
    .L08-c { appearance: none; border: 0; background: none; color: var(--muted); padding: 2px 7px; border-radius: 7px; font: 600 12px var(--mono); }
    .L08-c:hover { color: var(--ink); background: var(--raise); }
    .L08-c[aria-current] { color: var(--ink); background: var(--hi); }
    .L08 .hd { gap: 8px; }
    .L08 .hd-t { font-size: 36px; }
    .L08-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; }
    .L08 .tb { gap: 7px; align-items: center; }
    .L08 .tb-i { width: 11px; height: 11px; padding: 0; border-radius: 999px; background: var(--line-strong); }
    .L08 .tb-i .tb-n { font-size: 0; }
    .L08 .tb-i:hover { background: var(--muted); }
    .L08 .tb-i[aria-pressed="true"] { width: 30px; background: var(--ink); }
    .L08 .tb-all { width: auto; height: auto; padding: 2px 10px; margin-left: 6px; background: transparent; box-shadow: inset 0 0 0 1px var(--line-strong); }
    .L08 .tb-all .tb-n { font-size: 10px; color: var(--ink); }
    .L08 .tb-all:hover { background: var(--raise); }
    .L08 .tb-all[aria-pressed="true"] { width: auto; background: var(--ink); }
    .L08 .tb-all[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L08-cur { margin: 0; font-size: 13.5px; font-weight: 600; }
    .L08-cur span { font: 500 11px var(--mono); color: var(--muted); margin-right: 4px; }
    .L08 .cd { gap: 18px; }
    .L08 .cd-no { display: none; }
    .L08 .cd-t { font-size: 20px; }
    .L08 .cd-f { padding: 14px 16px; border-radius: 16px; background: var(--hi-soft); }
    .L08 .cd-f b { background: transparent; padding: 0; }
    .L08 .ga { grid-template-columns: minmax(0, 1fr); gap: 36px; }`
  });

  /* ── 09 큰 번호 표지 ── */
  add({
    no: 9, name: "큰 번호 표지", idea: "왼쪽 3분의 1을 큰 단계 번호와 질문이 차지하는 표지로. 단계 목록은 그 아래 두 줄 색인.",
    render: (c) => `<div class="Lw L09"><aside class="Ls"><div class="L09-big" aria-hidden="true">${c.st.code}</div>${c.P.head({ code: false })}${c.P.nav({ short: true, gh: false })}</aside>
      <main class="Lm">${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L09 { display: grid; grid-template-columns: minmax(280px, 32%) minmax(0, 1fr); gap: 48px; }
    .L09 .Ls { position: sticky; top: 0; align-self: start; display: grid; gap: 18px; }
    .L09-big { font: 700 clamp(96px, 11vw, 160px)/0.8 var(--sans); letter-spacing: -0.07em; background: var(--film); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-stroke: 1.5px var(--ink); }
    .L09 .hd-t { font-size: 30px; }
    .L09 .hd-q { font-size: 18px; }
    .L09 .nv { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; margin-top: 8px; }
    .L09 .nv-l { gap: 0; }
    .L09 .nv-s { grid-template-columns: 30px minmax(0, 1fr); padding: 6px 0; color: var(--muted); border-top: 1px solid var(--line); }
    .L09 .nv-s:hover { background: transparent; color: var(--ink); }
    .L09 .nv-s[aria-current] { color: var(--ink); }
    .L09 .nv-s[aria-current] .nv-t { box-shadow: inset 0 -0.42em 0 var(--hi); justify-self: start; }
    .L09 .Lm { gap: 22px; padding-top: 6px; }
    .L09 .tb-i { border-radius: 10px; padding: 6px 12px; background: var(--raise); }
    .L09 .tb-i:hover { background: var(--raise-2); }
    .L09 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
    .L09 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L09 .cd { background: var(--surface); border-radius: 18px; padding: 22px; gap: 16px; }
    .L09 .cd-f b { border-radius: 6px; }
    .L09 .ga { grid-template-columns: minmax(0, 1fr); }
    @media (max-width: 860px) { .L09-big { font-size: 72px; } }`
  });

  /* ── 10 책갈피 ── */
  add({
    no: 10, name: "책갈피", idea: "본문을 한 장의 종이로, 단계는 종이 오른쪽 끝에 꽂힌 책갈피로. 지금 단계 책갈피만 종이와 같은 색.",
    render: (c) => `<div class="Lw L10"><main class="Lm L10-sheet">${c.P.head()}${c.P.tabs()}${c.P.view()}</main>
      <aside class="Ls">${c.P.nav({ short: true, gh: false })}</aside></div>`,
    css: `
    .L10 { display: grid; grid-template-columns: minmax(0, 1fr) 128px; gap: 0; }
    .L10-sheet { background: var(--surface); border-radius: 28px 0 28px 28px; box-shadow: var(--sh-1); padding: 32px 36px 40px; gap: 22px; min-height: 100%; }
    .L10 .Ls { position: sticky; top: 40px; align-self: start; }
    .L10 .nv { gap: 12px; }
    .L10 .nv-l { gap: 4px; }
    .L10 .nv-s { grid-template-columns: 30px minmax(0, 1fr); padding: 9px 12px; border-radius: 0 14px 14px 0; background: var(--raise); color: var(--muted); box-shadow: inset 8px 0 8px -8px rgba(8, 11, 9, 0.25); }
    .L10 .nv-s:hover { background: var(--raise-2); color: var(--ink); }
    .L10 .nv-s[aria-current] { background: var(--surface); color: var(--ink); box-shadow: 8px 8px 18px -12px rgba(8, 11, 9, 0.35); }
    .L10 .hd { grid-template-columns: auto minmax(0, 1fr); column-gap: 16px; }
    .L10 .hd-n { grid-row: span 3; align-self: start; padding: 6px 10px; border-radius: 10px; background: var(--hi); font-size: 15px; }
    .L10 .tb-i { border-radius: 999px; padding: 5px 12px; box-shadow: inset 0 0 0 1px var(--line); display: flex; gap: 6px; align-items: baseline; }
    .L10 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); box-shadow: none; }
    .L10 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L10 .cd { gap: 16px; }
    .L10 .cd-f { padding-top: 14px; border-top: 1px dashed var(--line-strong); }
    .L10 .cd-f b { border-radius: 999px; }
    @media (max-width: 860px) { .lay .L10 .Ls { order: -1; } .L10-sheet { border-radius: 22px; padding: 22px 18px; } .lay .L10 .Ls .nv-s { border-radius: 999px; box-shadow: none; } }`
  });

  /* ── 11 필름 띠 ── */
  add({
    no: 11, name: "필름 띠", idea: "시안 10종을 이름 · 종류가 보이는 작은 카드로 가로 띠에 늘어놓는다. 넘겨 보며 고르는 느낌.",
    render: (c) => `<div class="Lw L11"><aside class="Ls">${c.P.nav()}</aside>
      <main class="Lm">${c.P.head()}<div class="L11-strip">${c.P.tabs({ kind: true })}</div>${c.P.view()}</main></div>`,
    after: (root) => {
      const s = root.querySelector(".L11-strip"), a = s && s.querySelector('.tb-i[aria-pressed="true"]');
      if (s && a) s.scrollLeft = Math.max(0, a.offsetLeft - s.offsetLeft - 24);
    },
    css: `
    .L11 { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 36px; }
    .L11 .Ls { position: sticky; top: 0; align-self: start; }
    .L11 .nv { gap: 14px; }
    .L11 .nv-gh { font: 500 10.5px/1.3 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
    .L11 .nv-gh b { font-size: inherit; font-weight: 500; }
    .L11 .nv-s { grid-template-columns: 30px minmax(0, 1fr); padding: 6px 9px; border-radius: 10px; }
    .L11 .nv-s[aria-current] { background: var(--ink); color: var(--paper); }
    .L11 .nv-s[aria-current] .nv-c { color: var(--hi); }
    .L11 .Lm { gap: 20px; }
    .L11-strip { overflow-x: auto; padding: 4px 4px 10px; margin: -4px; scroll-snap-type: x proximity; }
    .L11 .tb { flex-wrap: nowrap; gap: 10px; width: max-content; }
    .L11 .tb-i { width: 168px; height: 96px; align-content: start; gap: 3px; border-radius: 16px; padding: 12px 13px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line); scroll-snap-align: start; }
    .L11 .tb-i:hover { background: var(--surface); box-shadow: inset 0 0 0 1px var(--line-strong); }
    .L11 .tb-k { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .L11 .tb-i[aria-pressed="true"] { background: var(--film); box-shadow: inset 0 0 0 1.5px var(--ink); }
    .L11 .tb-i[aria-pressed="true"] .tb-n { color: var(--ink); }
    .L11 .tb-all { width: 128px; background: transparent; box-shadow: inset 0 0 0 1px var(--line-strong); }
    .L11 .cd { background: var(--surface); border-radius: 22px; padding: 22px 24px; gap: 16px; }
    .L11 .cd-f b { border-radius: 999px; }`
  });

  /* ── 12 세 칸 ── */
  add({
    no: 12, name: "세 칸", idea: "메일 앱처럼 단계 · 시안 목록 · 그림 세 칸. 시안 목록에 아이디어 두 줄이 보여 고르기 전에 비교된다.",
    render: (c) => {
      const { P } = c;
      const vs = c.L.map((it, i) => `<li><button type="button" class="L12-v" data-v="${i}" aria-pressed="${!c.all && i === c.v}"><span class="tb-n">${c.n}.${P.pad(i + 1)} · ${P.esc(it.kind || "")}</span><b>${P.esc(it.name)}</b><small>${P.esc(it.idea || "")}</small></button></li>`).join("") +
        `<li><button type="button" class="L12-v L12-all" data-all="1" aria-pressed="${c.all}"><span class="tb-n">ALL</span><b>${c.L.length}종 모아 보기</b></button></li>`;
      return `<div class="Lw L12"><aside class="Ls">${P.nav()}</aside>
        <section class="L12-list" aria-label="${c.st.code} 시각화 시안">${P.head({ q: false })}<ol class="L12-vs">${vs}</ol></section>
        <main class="Lm">${c.all ? "" : `<p class="L12-q">${P.esc(c.st.q)}</p>`}${P.view()}</main></div>`;
    },
    css: `
    .L12 { display: grid; grid-template-columns: 188px 300px minmax(0, 1fr); gap: 14px; padding-block: 16px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
    .L12 .Ls, .L12-list { position: sticky; top: 0; align-self: start; max-height: calc(100dvh - 200px); overflow: auto; }
    .L12 .Ls { padding: 8px 2px; }
    .L12 .nv-gh { padding: 0 8px; font-size: 12px; color: var(--muted); font-weight: 600; }
    .L12 .nv-s { grid-template-columns: 30px minmax(0, 1fr); border-radius: 10px; padding: 6px 8px; }
    .L12 .nv-s[aria-current] { background: var(--hi); }
    .L12-list { background: var(--raise); border-radius: 22px; padding: 16px 10px 10px; display: grid; gap: 12px; align-content: start; }
    .L12 .hd { padding: 0 8px; }
    .L12 .hd-n { font: 700 30px/1 var(--sans); letter-spacing: -0.04em; }
    .L12 .hd-t { font-size: 19px; }
    .L12-vs { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
    .L12-v { appearance: none; border: 0; background: transparent; color: inherit; width: 100%; text-align: left; display: grid; gap: 2px; padding: 10px 12px; border-radius: 14px; transition: background-color 0.18s, box-shadow 0.18s; }
    .L12-v b { font-size: 13.5px; }
    .L12-v small { font-size: 12px; color: var(--muted); line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .L12-v:hover { background: var(--glass-edge); }
    .L12-v[aria-pressed="true"] { background: var(--surface); box-shadow: var(--sh-1); }
    .L12 .Lm { background: var(--surface); border-radius: 22px; padding: 24px 26px 32px; gap: 16px; }
    .L12-q { margin: 0; font: 600 15px/1.5 var(--serif); color: var(--muted); }
    .L12 .cd { gap: 16px; }
    .L12 .cd-t { font-size: 22px; }
    .L12 .cd-f { border-radius: 14px; background: var(--hi-soft); padding: 12px 14px; }
    .L12 .cd-f b { background: transparent; padding: 0; }
    .L12 .ga .cd { background: var(--paper); border-radius: 16px; padding: 14px; }
    @media (max-width: 860px) { .L12 .Lm { padding: 18px 16px 24px; } .L12-vs { display: flex; overflow-x: auto; gap: 6px; } .L12-vs li { flex: 0 0 220px; } }`
  });

  /* ── 13 아래 독 ── */
  add({
    no: 13, name: "아래 독", idea: "시안 고르기를 화면 아래에 떠 있는 둥근 독으로 내린다. 스크롤해도 따라오고, 위에는 단계 알약 한 줄.",
    render: (c) => {
      const name = c.all ? `${c.L.length}종 모아 보기` : `${c.n}.${c.P.pad(c.v + 1)} ${c.P.esc(c.it ? c.it.name : "")}`;
      return `<div class="Lw L13"><div class="L13-top">${c.P.nav({ short: true, gh: false })}</div>
        <main class="Lm">${c.P.head()}${c.P.view()}</main>
        <div class="L13-dock Lpos">${c.P.tabs({ numOnly: true, num: true })}<span class="L13-name">${name}</span></div></div>`;
    },
    css: `
    .L13 { display: grid; gap: 26px; padding-bottom: 20px; }
    .L13-top .nv { display: flex; flex-wrap: wrap; gap: 4px; }
    .L13-top .nv-g, .L13-top .nv-l { display: flex; gap: 2px; }
    .L13-top .nv-g + .nv-g::before { content: ""; width: 1px; height: 18px; background: var(--line-strong); align-self: center; margin: 0 8px; }
    .L13 .nv-s { display: flex; gap: 6px; align-items: baseline; width: auto; padding: 6px 13px; border-radius: 999px; white-space: nowrap; color: var(--muted); }
    .L13 .nv-s:hover { color: var(--ink); background: var(--raise); }
    .L13 .nv-s[aria-current] { color: var(--ink); background: var(--surface); box-shadow: var(--sh-1); }
    .L13 .Lm { width: 100%; max-width: 1120px; justify-self: center; gap: 24px; }
    .L13 .hd { grid-template-columns: auto minmax(0, 1fr); column-gap: 16px; }
    .L13 .hd-n { grid-row: span 3; font: 700 52px/0.85 var(--sans); letter-spacing: -0.05em; }
    .L13 .cd { gap: 18px; }
    .L13 .cd-no { display: none; }
    .L13 .cd-b { background: var(--surface); border-radius: 24px; padding: 24px; }
    .L13 .ga .cd-b { padding: 16px; }
    .L13-dock { position: sticky; bottom: 14px; justify-self: center; z-index: 4; display: flex; align-items: center; gap: 12px; max-width: 100%; padding: 6px 18px 6px 6px; border-radius: 999px; background: rgba(11, 13, 10, 0.88); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); color: var(--night-fg); box-shadow: var(--sh-2); }
    .L13-dock .tb { flex-wrap: nowrap; gap: 2px; }
    .L13-dock .tb-i { width: 32px; height: 32px; padding: 0; border-radius: 50%; place-items: center; }
    .L13-dock .tb-n { color: var(--night-fg); font-size: 11px; }
    .L13-dock .tb-i:hover { background: var(--night-hover); }
    .L13-dock .tb-i[aria-pressed="true"] { background: var(--hi); }
    .L13-dock .tb-i[aria-pressed="true"] .tb-n { color: var(--ink); }
    .L13-dock .tb-all { width: auto; padding: 0 12px; border-radius: 999px; }
    .L13-name { font: 600 12.5px var(--sans); white-space: nowrap; max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
    @media (max-width: 860px) { .L13-name { display: none; } .L13-dock { padding: 5px; } .L13-dock .tb-i { width: 26px; height: 26px; } .L13-dock .tb { overflow-x: auto; } .L13 .hd-n { font-size: 36px; } }`
  });

  /* ── 14 다이얼 ── */
  const arc = (cx, cy, r0, r1, a0, a1) => {
    const p = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
    return `M${p(r1, a0)} A${r1} ${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`;
  };
  const dial = (c) => {
    const { P } = c, C = 120, D = Math.PI / 180, seg = 45;
    const segs = P.STEPS.map((s, i) => {
      const a0 = (-90 + i * seg + 1.6) * D, a1 = (-90 + (i + 1) * seg - 1.6) * D, am = (a0 + a1) / 2;
      const cls = s.n === c.n ? " is-cur" : s.n < c.n ? " is-done" : "";
      return `<g class="L14-seg${cls}" data-step="${s.n}" role="button" tabindex="0" aria-label="${s.code} ${P.esc(s.t)}"${s.n === c.n ? ' aria-current="step"' : ""}>
        <path d="${arc(C, C, 64, 104, a0, a1)}"/><text x="${(C + 84 * Math.cos(am)).toFixed(1)}" y="${(C + 84 * Math.sin(am) + 4).toFixed(1)}" text-anchor="middle">${s.code}</text></g>`;
    }).join("");
    const rings = P.PHASES.map((p, k) => {
      const a0 = (-90 + k * 90 + 3) * D, a1 = (-90 + (k + 1) * 90 - 3) * D;
      return `<path class="L14-ring${p.n === c.st.ph ? " is-cur" : ""}" d="${arc(C, C, 110, 114, a0, a1)}"/>`;
    }).join("");
    return `<svg class="L14-dial" viewBox="0 0 240 240" role="group" aria-label="파이프라인 8단계 다이얼">
      <defs><linearGradient id="l14f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--film-1)"/><stop offset=".3" stop-color="var(--film-2)"/><stop offset=".55" stop-color="var(--film-3)"/><stop offset=".8" stop-color="var(--film-4)"/><stop offset="1" stop-color="var(--film-5)"/></linearGradient></defs>
      ${rings}${segs}<text x="${C}" y="${C + 6}" text-anchor="middle" class="L14-cc">${c.st.code}</text><text x="${C}" y="${C + 26}" text-anchor="middle" class="L14-cs">${P.esc(c.st.short)}</text></svg>`;
  };
  add({
    no: 14, name: "다이얼", idea: "8단계를 둥근 다이얼 한 바퀴로. 바깥 고리는 4묶음, 가운데에 지금 단계. 목록 대신 한 덩어리 그림.",
    render: (c) => {
      const { P } = c;
      const leg = P.PHASES.map((p) => `<span class="${p.n === c.st.ph ? "is-cur" : ""}"><b>${p.n}</b> ${P.esc(p.t)}</span>`).join("");
      return `<div class="Lw L14"><aside class="Ls">${dial(c)}<p class="L14-leg">${leg}</p>${P.foot()}</aside>
        <main class="Lm">${P.head({ code: false })}${P.tabs()}${P.view()}</main></div>`;
    },
    css: `
    .L14 { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 44px; }
    .L14 .Ls { position: sticky; top: 0; align-self: start; display: grid; gap: 16px; justify-items: center; }
    .L14-dial { display: block; width: 240px; max-width: 100%; height: auto; }
    .L14-seg { cursor: pointer; outline: none; }
    .L14-seg path { fill: var(--raise); transition: fill 0.15s; }
    .L14-seg:hover path, .L14-seg:focus-visible path { fill: var(--raise-2); }
    .L14-seg.is-done path { fill: var(--raise-2); }
    .L14-seg.is-cur path { fill: url(#l14f); stroke: var(--ink); stroke-width: 1.5; }
    .L14-seg text { font: 600 11px var(--mono); fill: var(--muted); pointer-events: none; }
    .L14-seg.is-cur text { fill: var(--ink); }
    .L14-ring { fill: var(--line); }
    .L14-ring.is-cur { fill: var(--ink); }
    .L14-cc { font: 700 30px var(--sans); letter-spacing: -0.04em; fill: var(--ink); }
    .L14-cs { font: 600 12px var(--sans); fill: var(--muted); }
    .L14-leg { margin: 0; display: grid; grid-template-columns: repeat(2, auto); gap: 4px 18px; font-size: 12px; color: var(--muted); }
    .L14-leg b { font-family: var(--mono); font-weight: 600; }
    .L14-leg .is-cur { color: var(--ink); font-weight: 600; }
    .L14 .nv-f { justify-items: center; text-align: center; }
    .L14 .Lm { max-width: 1140px; gap: 22px; }
    .L14 .hd-t { font-size: 32px; }
    .L14 .tb-i { border-radius: 999px; padding: 6px 14px; display: flex; gap: 7px; align-items: baseline; background: var(--surface); }
    .L14 .tb-i:hover { background: var(--raise); }
    .L14 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
    .L14 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L14 .cd { background: var(--surface); border-radius: 28px; padding: 26px; gap: 16px; }
    .L14 .cd-f b { border-radius: 999px; }
    @media (max-width: 860px) { .L14-dial { width: 200px; } .L14 .nv-f { display: none; } }`
  });

  /* ── 15 카드 더미 ── */
  add({
    no: 15, name: "카드 더미", idea: "시안을 한 장씩 넘기는 카드 더미로. 뒤에 두 장이 비쳐 10장 중 하나라는 게 보이고, ‹ › 로 넘긴다.",
    render: (c) => {
      const { P } = c, k = c.L.length || 1;
      const bar = c.all ? "" : `<div class="L15-bar"><button type="button" class="L15-ar" data-v="${(c.v + k - 1) % k}" aria-label="이전 시안">‹</button>
        <span class="L15-pos"><b>${P.pad(c.v + 1)}</b> / ${P.pad(c.L.length)}</span><button type="button" class="L15-ar" data-v="${(c.v + 1) % k}" aria-label="다음 시안">›</button></div>`;
      return `<div class="Lw L15"><aside class="Ls">${P.nav({ sub: true })}</aside>
        <main class="Lm">${P.head()}<div class="L15-ctl">${bar}${P.tabs({ numOnly: true })}</div><div class="L15-stack${c.all ? " is-all" : ""}">${P.view()}</div></main></div>`;
    },
    css: `
    .L15 { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 44px; }
    .L15 .Ls { position: sticky; top: 0; align-self: start; }
    .L15 .nv-gh { font-size: 12px; padding-left: 10px; }
    .L15 .nv-s { border-radius: 14px; }
    .L15 .nv-s:hover { background: var(--raise); }
    .L15 .nv-s[aria-current] { background: var(--surface); box-shadow: var(--sh-1); }
    .L15 .Lm { max-width: 1160px; gap: 22px; }
    .L15-ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 22px; }
    .L15-bar { display: flex; align-items: center; gap: 10px; }
    .L15-ar { appearance: none; border: 0; width: 36px; height: 36px; border-radius: 50%; background: var(--surface); color: inherit; box-shadow: inset 0 0 0 1px var(--line-strong); font-size: 20px; line-height: 1; display: grid; place-items: center; padding-bottom: 3px; }
    .L15-ar:hover { background: var(--ink); color: var(--paper); }
    .L15-pos { font: 13px var(--mono); color: var(--muted); }
    .L15-pos b { color: var(--ink); font-weight: 600; }
    .L15 .tb { gap: 6px; align-items: center; }
    .L15 .tb-i { width: 9px; height: 9px; padding: 0; border-radius: 50%; background: var(--line-strong); }
    .L15 .tb-i .tb-n { font-size: 0; }
    .L15 .tb-i:hover { background: var(--muted); }
    .L15 .tb-i[aria-pressed="true"] { background: var(--ink); box-shadow: 0 0 0 3px var(--hi); }
    .L15 .tb-all { width: auto; height: auto; padding: 2px 10px; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px var(--line-strong); margin-left: 6px; }
    .L15 .tb-all .tb-n { font-size: 10px; color: var(--ink); }
    .L15 .tb-all[aria-pressed="true"] { background: var(--ink); box-shadow: none; }
    .L15 .tb-all[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L15-stack { position: relative; padding: 0 18px 18px 0; }
    .L15-stack:not(.is-all)::before, .L15-stack:not(.is-all)::after { content: ""; position: absolute; border-radius: 24px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line); }
    .L15-stack:not(.is-all)::before { inset: 18px 0 0 18px; opacity: 0.5; }
    .L15-stack:not(.is-all)::after { inset: 9px 9px 9px 9px; opacity: 0.85; }
    .L15-stack.is-all { padding: 0; }
    .L15 .cd { position: relative; z-index: 1; background: var(--surface); border-radius: 24px; padding: 24px; gap: 16px; box-shadow: var(--sh-1); }
    .L15 .ga .cd { box-shadow: inset 0 0 0 1px var(--line); padding: 16px; }
    .L15 .cd-f b { border-radius: 999px; }
    @media (max-width: 860px) { .L15-stack { padding: 0 10px 10px 0; } .L15-stack:not(.is-all)::before { inset: 10px 0 0 10px; } .L15-stack:not(.is-all)::after { inset: 5px; } .L15 .cd { padding: 18px 16px; } }`
  });
})();
