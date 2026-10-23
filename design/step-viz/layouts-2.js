/* 본문 레이아웃 16~30. 형식은 layouts-1.js 와 같다. */
(function () {
  "use strict";
  const add = (L) => window.LAY.push(L);

  /* ── 16 비대칭 여백 ── */
  add({
    no: 16, name: "비대칭 여백", idea: "왼쪽 넓은 여백에 단계 제목 · 질문 · 목록을 글로만 두고, 오른쪽 작업 판은 조금 내려 앉힌다. 판의 한 모서리만 각지게.",
    render: (c) => `<div class="Lw L16"><aside class="Ls">${c.P.head()}${c.P.nav()}${c.P.foot()}</aside>
      <main class="Lm">${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L16 { display: grid; grid-template-columns: minmax(260px, 30%) minmax(0, 1fr); gap: 0; padding-top: 44px; }
    .L16 .Ls { position: sticky; top: 0; align-self: start; display: grid; gap: 30px; padding-right: 44px; }
    .L16 .hd { gap: 8px; }
    .L16 .hd-n { color: var(--muted); font-size: 13px; }
    .L16 .hd-t { font-size: 34px; }
    .L16 .hd-q { font-size: 20px; line-height: 1.5; }
    .L16 .nv { gap: 12px; }
    .L16 .nv-gh { font: 500 10.5px/1.3 var(--mono); letter-spacing: 0.08em; color: var(--muted); }
    .L16 .nv-gh b { font-size: inherit; font-weight: 500; }
    .L16 .nv-s { padding: 3px 0; color: var(--muted); }
    .L16 .nv-s:hover { background: transparent; color: var(--ink); }
    .L16 .nv-s[aria-current] { color: var(--ink); }
    .L16 .nv-s[aria-current] .nv-t { box-shadow: inset 0 -0.42em 0 var(--hi); justify-self: start; }
    .L16 .Lm { margin-top: 72px; background: var(--surface); border-radius: 4px 34px 34px 34px; padding: 30px 32px 34px; gap: 22px; box-shadow: var(--sh-1); }
    .L16 .tb-i { border-radius: 999px; padding: 5px 13px; background: var(--paper); display: flex; gap: 6px; align-items: baseline; }
    .L16 .tb-i:hover { background: var(--raise); }
    .L16 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
    .L16 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L16 .cd { gap: 16px; }
    .L16 .cd-f { padding-top: 14px; border-top: 1px solid var(--line); }
    .L16 .cd-f b { border-radius: 999px; }
    .L16 .ga .cd { background: var(--paper); border-radius: 18px; padding: 16px; }
    @media (max-width: 860px) { .lay .L16 .Ls { padding-right: 0; gap: 16px; } .L16 .Lm { margin-top: 0; padding: 20px 16px; border-radius: 4px 24px 24px 24px; } .L16 .hd-t { font-size: 26px; } }`
  });

  /* ── 17 질문이 주인공 ── */
  add({
    no: 17, name: "질문이 주인공", idea: "단계 이름 대신 그 단계의 질문을 큰 명조로 맨 위에. 학생이 무엇을 풀러 왔는지부터 읽힌다.",
    render: (c) => `<div class="Lw L17"><div class="L17-top">${c.P.nav({ short: true, gh: false })}</div>
      <header class="L17-hero"><p class="L17-q">${c.P.esc(c.st.q)}</p><p class="L17-meta"><b>${c.st.code}</b>${c.P.esc(c.st.t)}<span>${c.P.esc(c.P.meta())}</span></p></header>
      <main class="Lm">${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L17 { display: grid; gap: 30px; max-width: 1180px; margin-inline: auto; padding-top: 32px; }
    .L17-top .nv { display: flex; flex-wrap: wrap; gap: 4px; }
    .L17-top .nv-g, .L17-top .nv-l, .L17-top .nv-l > li { display: contents; }
    .L17 .nv-s { display: inline-flex; gap: 6px; align-items: baseline; width: auto; padding: 4px 12px; border-radius: 999px; color: var(--muted); white-space: nowrap; }
    .L17 .nv-s:hover { color: var(--ink); background: var(--raise); }
    .L17 .nv-s[aria-current] { color: var(--ink); background: var(--surface); box-shadow: inset 0 0 0 1px var(--line-strong); }
    .L17-hero { display: grid; gap: 14px; padding-block: 12px 4px; }
    .L17-q { margin: 0; font: 700 clamp(28px, 3.6vw, 46px)/1.28 var(--serif); letter-spacing: -0.025em; max-width: 22ch; text-wrap: balance; }
    .L17-meta { margin: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-weight: 600; }
    .L17-meta b { font: 600 12px var(--mono); background: var(--hi); padding: 2px 8px; border-radius: 6px; }
    .L17-meta span { font: 500 11px var(--mono); letter-spacing: 0.04em; color: var(--muted); }
    .L17 .Lm { gap: 20px; }
    .L17 .tb { gap: 4px 6px; }
    .L17 .tb-i { display: flex; gap: 6px; align-items: baseline; padding: 5px 11px; border-radius: 10px; color: var(--muted); }
    .L17 .tb-i:hover { color: var(--ink); background: transparent; }
    .L17 .tb-i[aria-pressed="true"] { color: var(--ink); background: var(--raise); }
    .L17 .tb-i[aria-pressed="true"] .tb-n { color: var(--ink); }
    .L17 .cd { gap: 16px; }
    .L17 .cd-b { background: var(--surface); border-radius: 20px; padding: 22px; }
    .L17 .cd-f b { border-radius: 6px; }
    .L17 .ga .cd-b { padding: 16px; }`
  });

  /* ── 18 글 + 그림 나란히 ── */
  add({
    no: 18, name: "글 + 그림 나란히", idea: "시안 설명(무엇을 그렸나 · 배우는 것)과 시안 고르기를 왼쪽 글 칸에 모으고, 오른쪽은 그림만 크게.",
    render: (c) => {
      const { P } = c;
      if (c.all || !c.it) return `<div class="Lw L18"><div class="L18-top">${P.nav({ short: true, gh: false })}</div>${P.head()}${P.tabs()}${P.view()}</div>`;
      const p = P.parts(c.it, c.v);
      return `<div class="Lw L18"><div class="L18-top">${P.nav({ short: true, gh: false })}</div>${P.head()}
        <div class="L18-split Lg"><aside class="L18-text"><p class="L18-no">${p.no} · ${p.kind}</p><h2>${p.name}</h2><p class="L18-idea">${p.idea}</p>
        <div class="L18-learn"><b>배우는 것</b><p>${p.learn}</p></div>${P.tabs({ cls: "L18-tabs" })}</aside><figure class="L18-fig">${p.body}</figure></div></div>`;
    },
    css: `
    .L18 { display: grid; gap: 24px; max-width: 1360px; }
    .L18-top .nv { display: flex; flex-wrap: wrap; gap: 6px; }
    .L18-top .nv-g, .L18-top .nv-l, .L18-top .nv-l > li { display: contents; }
    .L18 .nv-s { display: inline-flex; gap: 6px; align-items: baseline; width: auto; padding: 5px 13px; border-radius: 999px; box-shadow: inset 0 0 0 1px var(--line); white-space: nowrap; }
    .L18 .nv-s[aria-current] { background: var(--ink); color: var(--paper); box-shadow: none; }
    .L18 .nv-s[aria-current] .nv-c { color: var(--hi); }
    .L18 .hd { grid-template-columns: auto minmax(0, 1fr); column-gap: 16px; }
    .L18 .hd-n { grid-row: span 3; font: 700 50px/0.88 var(--sans); letter-spacing: -0.05em; }
    .L18-split { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 32px; align-items: start; }
    .L18-text { position: sticky; top: 0; display: grid; gap: 12px; }
    .L18-no { margin: 0; font: 500 10.5px/1.4 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
    .L18-text h2 { margin: 0; font-size: 26px; line-height: 1.2; letter-spacing: -0.03em; text-wrap: balance; }
    .L18-idea { margin: 0; color: var(--muted); }
    .L18-learn { border-radius: 16px; background: var(--hi-soft); padding: 12px 14px; }
    .L18-learn b { font: 600 10.5px var(--mono); letter-spacing: 0.08em; }
    .L18-learn p { margin: 4px 0 0; }
    .L18 .L18-tabs { display: grid; gap: 1px; margin-top: 6px; }
    .L18-tabs .tb-i { display: flex; gap: 10px; align-items: baseline; padding: 6px 10px; border-radius: 10px; }
    .L18-tabs .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
    .L18-tabs .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L18-fig { margin: 0; min-width: 0; overflow-x: auto; background: var(--surface); border-radius: 30px; padding: 28px; }
    .L18 > .tb .tb-i { border-radius: 999px; display: flex; gap: 6px; }
    .L18 > .tb .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
    .L18 .ga .cd { background: var(--surface); border-radius: 20px; padding: 16px; }
    @media (max-width: 860px) { .L18-fig { padding: 16px; border-radius: 22px; } .L18 .hd-n { font-size: 36px; } }`
  });

  /* ── 19 여백 메모 ── */
  add({
    no: 19, name: "여백 메모", idea: "교과서 날개처럼 그림 오른쪽 여백에 시안 이름 · 아이디어 · 배우는 것을 작은 메모로. 가운데는 그림만.",
    render: (c) => {
      const { P } = c;
      const p = !c.all && c.it ? P.parts(c.it, c.v) : null;
      const notes = p ? `<aside class="L19-notes"><p class="L19-no">${p.no}</p><h2>${p.name}</h2><p class="L19-k">${p.kind}</p>
        <div class="L19-n"><b>그린 것</b><p>${p.idea}</p></div><div class="L19-n is-learn"><b>배우는 것</b><p>${p.learn}</p></div></aside>` : "";
      return `<div class="Lw L19${p ? "" : " is-all"}"><aside class="Ls">${P.nav()}</aside>
        <main class="Lm">${P.head()}${P.tabs()}${p ? `<figure class="L19-fig">${p.body}</figure>` : P.view()}</main>${notes}</div>`;
    },
    css: `
    .L19 { display: grid; grid-template-columns: 196px minmax(0, 1fr) 240px; gap: 36px; }
    .L19.is-all { grid-template-columns: 196px minmax(0, 1fr); }
    .L19 .Ls, .L19-notes { position: sticky; top: 0; align-self: start; }
    .L19 .nv { gap: 16px; }
    .L19 .nv-gh { font: 500 10.5px/1.3 var(--mono); letter-spacing: 0.08em; color: var(--muted); }
    .L19 .nv-gh b { font-size: inherit; font-weight: 500; }
    .L19 .nv-s { grid-template-columns: 32px minmax(0, 1fr); padding: 4px 0; color: var(--muted); }
    .L19 .nv-s:hover { background: transparent; color: var(--ink); }
    .L19 .nv-s[aria-current] { color: var(--ink); }
    .L19 .nv-s[aria-current] .nv-c { background: var(--hi); border-radius: 5px; padding: 0 4px; justify-self: start; }
    .L19 .Lm { gap: 20px; }
    .L19 .tb { gap: 2px 16px; }
    .L19 .tb-i { display: flex; gap: 5px; align-items: baseline; padding: 2px 0; color: var(--muted); }
    .L19 .tb-i:hover { background: transparent; color: var(--ink); }
    .L19 .tb-i[aria-pressed="true"] { color: var(--ink); }
    .L19 .tb-i[aria-pressed="true"] .tb-t { box-shadow: inset 0 -0.42em 0 var(--hi); }
    .L19-fig { margin: 0; min-width: 0; overflow-x: auto; background: var(--surface); border-radius: 22px; padding: 24px; }
    .L19-notes { display: grid; gap: 12px; font-size: 13px; padding-top: 4px; }
    .L19-notes h2 { margin: 0; font-size: 19px; letter-spacing: -0.02em; line-height: 1.25; }
    .L19-no { margin: 0; font: 600 11px var(--mono); }
    .L19-k { margin: -6px 0 0; font: 10.5px/1.4 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
    .L19-n b { display: block; font: 600 10px var(--mono); letter-spacing: 0.08em; color: var(--muted); margin-bottom: 2px; }
    .L19-n p { margin: 0; color: var(--muted); line-height: 1.6; }
    .L19-n.is-learn { background: var(--hi-soft); border-radius: 14px; padding: 10px 12px; }
    .L19-n.is-learn p { color: var(--ink); }
    .L19 .ga .cd { background: var(--surface); border-radius: 18px; padding: 16px; }
    .L19 .cd-f b { border-radius: 6px; }
    @media (max-width: 1180px) and (min-width: 861px) { .L19 { grid-template-columns: 196px minmax(0, 1fr); } .L19-notes { grid-column: 2; position: static; } }`
  });

  /* ── 20 박막 얼룩 ── */
  add({
    no: 20, name: "박막 얼룩", idea: "단계 머리 뒤에 박막색 얼룩 하나가 천천히 모양을 바꾼다. 나머지는 테두리 없이 반투명 판 두 장.",
    render: (c) => `<div class="Lw L20"><div class="L20-blob Lpos" aria-hidden="true"></div><aside class="Ls">${c.P.nav()}</aside>
      <main class="Lm">${c.P.head()}${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L20 { position: relative; isolation: isolate; overflow: clip; display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 44px; min-height: 100%; }
    .L20-blob { position: absolute; z-index: -1; left: max(240px, 22%); top: -60px; width: min(620px, 60%); height: 340px; background: var(--film); filter: blur(34px); opacity: 0.85;
      border-radius: 42% 58% 63% 37% / 45% 40% 60% 55%; animation: l20m 18s ease-in-out infinite alternate; }
    @keyframes l20m { 50% { border-radius: 58% 42% 38% 62% / 55% 62% 38% 45%; transform: translate(30px, 10px) rotate(6deg); } 100% { border-radius: 36% 64% 52% 48% / 40% 52% 48% 60%; transform: translate(-20px, 20px) rotate(-4deg); } }
    .L20 .Ls { position: sticky; top: 0; align-self: start; }
    .L20 .nv { gap: 16px; }
    .L20 .nv-gh { font-size: 12px; padding-left: 12px; color: var(--muted); font-weight: 600; }
    .L20 .nv-s { border-radius: 999px; padding: 6px 12px; }
    .L20 .nv-s:hover { background: var(--glass); }
    .L20 .nv-s[aria-current] { background: var(--surface); box-shadow: var(--sh-1); }
    .L20 .Lm { max-width: 1140px; gap: 24px; }
    .L20 .hd { padding-block: 18px 8px; }
    .L20 .hd-n { font-size: 13px; }
    .L20 .hd-t { font-size: 38px; }
    .L20 .tb-i { border-radius: 999px; padding: 6px 13px; display: flex; gap: 6px; align-items: baseline; background: var(--glass); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
    .L20 .tb-i:hover { background: var(--surface); }
    .L20 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
    .L20 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L20 .cd { background: var(--glass); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); border-radius: 30px; padding: 26px; gap: 16px; box-shadow: inset 0 0 0 1px var(--glass-edge), var(--sh-1); }
    .L20 .cd-f b { border-radius: 999px; }
    @media (max-width: 860px) { .L20-blob { left: 10%; width: 80%; height: 240px; } .L20 .hd-t { font-size: 28px; } }`
  });

  /* ── 21 둥근 섬 ── */
  add({
    no: 21, name: "둥근 섬", idea: "단계 · 머리와 탭 · 시안을 세 개의 둥근 섬으로. 선 대신 바탕색 차이와 12px 틈으로만 나눈다.",
    render: (c) => `<div class="Lw L21"><aside class="Ls L21-i">${c.P.nav({ sub: true, foot: true })}</aside>
      <div class="L21-i L21-hd">${c.P.head()}${c.P.tabs()}</div><main class="Lm L21-i">${c.P.view()}</main></div>`,
    css: `
    .L21 { display: grid; grid-template-columns: 264px minmax(0, 1fr); grid-template-areas: "s h" "s m"; align-content: start; gap: 12px; min-height: 100%; background: var(--raise);
      padding-block: 16px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
    .L21-i { background: var(--surface); border-radius: 26px; padding: 22px; }
    .L21 .Ls { grid-area: s; position: sticky; top: 0; align-self: start; padding: 18px 12px; }
    .L21-hd { grid-area: h; display: grid; gap: 18px; }
    .L21 .Lm { grid-area: m; }
    .L21 .nv { gap: 16px; }
    .L21 .nv-gh { padding-left: 10px; font-size: 12px; }
    .L21 .nv-s { border-radius: 14px; }
    .L21 .nv-s:hover { background: var(--paper); }
    .L21 .nv-s[aria-current] { background: var(--hi); }
    .L21 .nv-f { padding: 12px 10px 0; }
    .L21 .hd { grid-template-columns: auto minmax(0, 1fr); column-gap: 18px; }
    .L21 .hd-n { grid-row: span 3; font: 700 52px/0.84 var(--sans); letter-spacing: -0.06em; padding-top: 3px; background: var(--film); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-stroke: 1px var(--ink); }
    .L21 .tb-i { border-radius: 12px; background: var(--paper); padding: 7px 12px; }
    .L21 .tb-i:hover { background: var(--raise); }
    .L21 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
    .L21 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L21 .cd { gap: 16px; }
    .L21 .cd-f { background: var(--paper); border-radius: 16px; padding: 12px 14px; }
    .L21 .cd-f b { border-radius: 6px; }
    .L21 .ga .cd { background: var(--paper); border-radius: 20px; padding: 16px; }
    @media (max-width: 860px) { .lay .L21 .Ls { padding: 8px; } .L21 .hd-n { font-size: 40px; } .L21-i { padding: 16px; border-radius: 20px; } }`
  });

  /* ── 22 알약과 원 ── */
  add({
    no: 22, name: "알약과 원", idea: "모서리를 끝까지 둥글린다. 단계는 원 번호가 달린 알약, 단계 번호는 큰 원, 카드는 36px 둥근 판.",
    render: (c) => `<div class="Lw L22"><aside class="Ls">${c.P.nav()}</aside>
      <main class="Lm">${c.P.head()}${c.P.tabs({ num: true })}${c.P.view()}</main></div>`,
    css: `
    .L22 { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 36px; }
    .L22 .Ls { position: sticky; top: 0; align-self: start; }
    .L22 .nv { gap: 14px; }
    .L22 .nv-gh { padding-left: 8px; font-size: 12px; }
    .L22 .nv-l { gap: 6px; }
    .L22 .nv-s { grid-template-columns: 38px minmax(0, 1fr); align-items: center; column-gap: 10px; padding: 4px 14px 4px 4px; border-radius: 999px; background: var(--surface); }
    .L22 .nv-c { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: var(--raise); font-size: 11px; }
    .L22 .nv-s:hover { background: var(--raise); }
    .L22 .nv-s:hover .nv-c { background: var(--surface); }
    .L22 .nv-s.is-done .nv-c { background: var(--hi-soft); }
    .L22 .nv-s[aria-current] { background: var(--ink); color: var(--paper); }
    .L22 .nv-s[aria-current] .nv-c { background: var(--film); color: var(--ink); }
    .L22 .Lm { max-width: 1160px; gap: 22px; }
    .L22 .hd { grid-template-columns: 88px minmax(0, 1fr); column-gap: 20px; align-items: center; }
    .L22 .hd-n { grid-row: span 3; width: 88px; height: 88px; border-radius: 50%; display: grid; place-items: center; background: var(--film); font-size: 22px; box-shadow: inset 0 0 0 1.5px var(--ink); }
    .L22 .tb-i { display: flex; align-items: center; gap: 8px; border-radius: 999px; padding: 4px 14px 4px 4px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line); }
    .L22 .tb-n { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--raise); color: var(--ink); font-size: 10px; }
    .L22 .tb-all .tb-n { font-size: 8.5px; }
    .L22 .tb-i:hover { box-shadow: inset 0 0 0 1px var(--line-strong); background: var(--surface); }
    .L22 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); box-shadow: none; }
    .L22 .tb-i[aria-pressed="true"] .tb-n { background: var(--hi); color: var(--ink); }
    .L22 .cd { background: var(--surface); border-radius: 36px; padding: 28px 30px; gap: 18px; }
    .L22 .cd-no { padding: 2px 10px; border-radius: 999px; background: var(--ink); color: var(--hi); }
    .L22 .cd-f { align-items: center; }
    .L22 .cd-f b { border-radius: 999px; padding: 3px 12px; }
    .L22 .ga .cd { padding: 20px; border-radius: 28px; }
    @media (max-width: 860px) { .L22 .hd { grid-template-columns: 60px minmax(0, 1fr); } .L22 .hd-n { width: 60px; height: 60px; font-size: 16px; } .L22 .cd { padding: 20px 16px; border-radius: 26px; } .lay .L22 .Ls .nv-s { padding: 3px 12px 3px 3px; } .L22 .nv-c { width: 30px; height: 30px; } }`
  });

  /* ── 23 유리판 ── */
  add({
    no: 23, name: "유리판", idea: "바탕 전체에 옅은 박막 빛을 깔고 사이드바와 카드를 서리 낀 유리판으로. 판끼리 흰 가장자리 한 줄로만 구분.",
    render: (c) => `<div class="Lw L23"><aside class="Ls">${c.P.nav({ sub: true })}</aside>
      <main class="Lm">${c.P.head()}${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L23 { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 22px; min-height: 100%;
      background: radial-gradient(55% 45% at 8% 0%, var(--film-1), transparent 70%), radial-gradient(45% 55% at 92% 8%, var(--film-2), transparent 70%),
        radial-gradient(55% 55% at 62% 100%, var(--film-3), transparent 70%), radial-gradient(40% 40% at 0% 100%, var(--film-5), transparent 70%), var(--paper); }
    .L23 .Ls, .L23 .cd, .L23 .hd { background: var(--glass); -webkit-backdrop-filter: blur(22px) saturate(1.2); backdrop-filter: blur(22px) saturate(1.2); box-shadow: inset 0 0 0 1px var(--glass-edge), var(--sh-1); }
    .L23 .Ls { position: sticky; top: 0; align-self: start; border-radius: 24px; padding: 16px 10px; }
    .L23 .nv { gap: 14px; }
    .L23 .nv-gh { padding-left: 10px; font-size: 12px; color: var(--muted); font-weight: 600; }
    .L23 .nv-s { border-radius: 14px; }
    .L23 .nv-s:hover { background: var(--glass-edge); }
    .L23 .nv-s[aria-current] { background: var(--surface); box-shadow: inset 0 0 0 1px var(--line); }
    .L23 .Lm { max-width: 1160px; gap: 16px; }
    .L23 .hd { border-radius: 24px; padding: 20px 22px; grid-template-columns: auto minmax(0, 1fr); column-gap: 16px; }
    .L23 .hd-n { grid-row: span 3; font: 700 44px/0.86 var(--sans); letter-spacing: -0.05em; }
    .L23 .tb-i { border-radius: 999px; padding: 6px 13px; display: flex; gap: 6px; align-items: baseline; }
    .L23 .tb-i:hover { background: var(--glass); }
    .L23 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
    .L23 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L23 .cd { border-radius: 26px; padding: 24px; gap: 16px; }
    .L23 .cd-f b { border-radius: 999px; }
    .L23 .ga .cd { padding: 16px; }`
  });

  /* ── 24 그림자 한 장 ── */
  add({
    no: 24, name: "그림자 한 장", idea: "모든 것을 종이 위에 납작하게 두고, 시안 카드 한 장만 긴 그림자로 띄운다. 고른 것은 형광펜으로.",
    render: (c) => `<div class="Lw L24"><aside class="Ls">${c.P.nav({ foot: true })}</aside>
      <main class="Lm">${c.P.head()}${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L24 { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 54px; padding-top: 38px; }
    .L24 .Ls { position: sticky; top: 0; align-self: start; }
    .L24 .nv { gap: 20px; }
    .L24 .nv-gh { font: 500 10.5px/1.3 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
    .L24 .nv-gh b { font-size: inherit; font-weight: 500; }
    .L24 .nv-s { grid-template-columns: 32px minmax(0, 1fr); padding: 4px 0; color: var(--muted); }
    .L24 .nv-s:hover { background: transparent; color: var(--ink); }
    .L24 .nv-s[aria-current] { color: var(--ink); }
    .L24 .nv-s[aria-current] .nv-t { background: linear-gradient(transparent 56%, var(--hi) 56%); justify-self: start; }
    .L24 .nv-f { margin-top: 6px; }
    .L24 .Lm { max-width: 1120px; gap: 28px; }
    .L24 .hd-n { color: var(--muted); }
    .L24 .hd-t { font-size: 34px; }
    .L24 .tb { gap: 4px 18px; }
    .L24 .tb-i { display: flex; gap: 6px; align-items: baseline; padding: 2px 0; color: var(--muted); }
    .L24 .tb-i:hover { background: transparent; color: var(--ink); }
    .L24 .tb-i[aria-pressed="true"] { color: var(--ink); }
    .L24 .tb-i[aria-pressed="true"] .tb-t { background: linear-gradient(transparent 56%, var(--hi) 56%); }
    .L24 .cd { background: var(--surface); border-radius: 16px; padding: 26px 28px; gap: 18px; box-shadow: var(--sh-2); }
    .L24 .cd-f b { background: transparent; padding: 0; color: var(--muted); }
    .L24 .ga { gap: 28px; }
    .L24 .ga .cd { padding: 18px; box-shadow: var(--sh-1); }
    @media (max-width: 860px) { .lay .L24 .Ls .nv-s[aria-current] { background: linear-gradient(transparent 56%, var(--hi) 56%); } .L24 .cd { padding: 20px 16px; } }`
  });

  /* ── 25 잎 모서리 ── */
  add({
    no: 25, name: "잎 모서리", idea: "마주 보는 두 모서리만 크게 둥글린 잎 모양을 한 가지 규칙으로 모든 판 · 탭 · 배지에 쓴다.",
    render: (c) => `<div class="Lw L25"><aside class="Ls">${c.P.nav({ sub: true })}</aside>
      <main class="Lm">${c.P.head()}${c.P.tabs()}${c.P.view()}</main></div>`,
    css: `
    .L25 { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 36px; --vz-r: 10px 2px 10px 2px; --vz-r2: 18px 3px 18px 3px; }
    .L25 .Ls { position: sticky; top: 0; align-self: start; }
    .L25 .nv { gap: 14px; }
    .L25 .nv-gh { padding-left: 10px; font-size: 12px; }
    .L25 .nv-s { border-radius: 16px 3px 16px 3px; }
    .L25 .nv-s:hover { background: var(--raise); }
    .L25 .nv-s[aria-current] { background: var(--film); box-shadow: inset 0 0 0 1px var(--ink); }
    .L25 .Lm { max-width: 1160px; gap: 22px; }
    .L25 .hd-n { justify-self: start; padding: 6px 14px; border-radius: 16px 3px 16px 3px; background: var(--ink); color: var(--hi); font-size: 14px; margin-bottom: 6px; }
    .L25 .tb-i { border-radius: 12px 2px 12px 2px; padding: 6px 12px; box-shadow: inset 0 0 0 1px var(--line-strong); }
    .L25 .tb-i:hover { background: var(--surface); }
    .L25 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); box-shadow: none; }
    .L25 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L25 .cd { background: var(--surface); border-radius: 44px 6px 44px 6px; padding: 28px 32px; gap: 16px; box-shadow: inset 0 0 0 1px var(--line); }
    .L25 .cd-f b { border-radius: 8px 2px 8px 2px; }
    .L25 .ga .cd { border-radius: 32px 5px 32px 5px; padding: 20px; }
    @media (max-width: 860px) { .L25 .cd { padding: 22px 18px; border-radius: 32px 5px 32px 5px; } }`
  });

  /* ── 26 진행 막대 ── */
  add({
    no: 26, name: "진행 막대", idea: "사이드바 대신 위에 4묶음 8칸 진행 막대. 지나온 칸은 잉크, 지금 칸은 박막색. 어디쯤인지가 길이로 보인다.",
    render: (c) => {
      const { P } = c;
      const bar = P.PHASES.map((p) => `<div class="L26-ph${p.n === c.st.ph ? " is-cur" : ""}"><p>${p.n} · ${P.esc(p.t)}</p><div class="L26-segs">${P.STEPS.filter((s) => s.ph === p.n).map((s) =>
        `<button type="button" class="L26-s${s.n < c.n ? " is-done" : ""}" data-step="${s.n}" ${s.n === c.n ? 'aria-current="step"' : ""} aria-label="${s.code} ${P.esc(s.t)}"><i></i><span><span class="nv-c">${s.code}</span>${P.esc(s.short)}</span></button>`).join("")}</div></div>`).join("");
      return `<div class="Lw L26"><nav class="L26-bar" aria-label="파이프라인 단계">${bar}</nav>
        <main class="Lm">${P.head({ code: false })}${P.tabs()}${P.view()}</main></div>`;
    },
    css: `
    .L26 { display: grid; gap: 30px; }
    .L26-bar { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; max-width: 1240px; }
    .L26-ph > p { margin: 0 0 8px; font: 500 10.5px/1.3 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
    .L26-ph.is-cur > p { color: var(--ink); font-weight: 600; }
    .L26-segs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .L26-s { appearance: none; border: 0; background: none; color: var(--muted); text-align: left; display: grid; gap: 7px; padding: 0 0 4px; min-width: 0; }
    .L26-s i { height: 10px; border-radius: 999px; background: var(--raise-2); transition: background-color 0.18s; }
    .L26-s > span { display: flex; gap: 6px; align-items: baseline; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .L26-s:hover { color: var(--ink); }
    .L26-s:hover i { background: var(--line-strong); }
    .L26-s.is-done i { background: var(--ink); }
    .L26-s[aria-current] { color: var(--ink); }
    .L26-s[aria-current] i { background: var(--film); box-shadow: inset 0 0 0 1.5px var(--ink); }
    .L26 .Lm { max-width: 1180px; gap: 22px; }
    .L26 .hd-t { font-size: 32px; }
    .L26 .tb-i { border-radius: 10px; padding: 6px 12px; display: flex; gap: 6px; align-items: baseline; }
    .L26 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
    .L26 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L26 .cd { background: var(--surface); border-radius: 22px; padding: 24px; gap: 16px; }
    .L26 .cd-f b { border-radius: 999px; }
    @media (max-width: 860px) { .L26-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } .L26 .hd-t { font-size: 24px; } }`
  });

  /* ── 27 노선도 ── */
  const subway = (c) => {
    const { P } = c, S = P.STEPS, W = 1000, H = 150, y = 82;
    const xs = S.map((s, i) => 70 + i * (860 / 7)), cx = xs[c.n - 1];
    const phs = P.PHASES.map((p) => {
      const ix = S.filter((s) => s.ph === p.n).map((s) => s.n - 1), x0 = xs[ix[0]] - 34, x1 = xs[ix[ix.length - 1]] + 34;
      return `<g class="L27-ph${p.n === c.st.ph ? " is-cur" : ""}"><rect x="${x0}" y="14" width="${x1 - x0}" height="24" rx="12"/><text x="${(x0 + x1) / 2}" y="30" text-anchor="middle">${p.n} · ${P.esc(p.t)}</text></g>`;
    }).join("");
    const st = S.map((s, i) => {
      const x = xs[i], cur = s.n === c.n, done = s.n < c.n;
      return `<g class="L27-st${cur ? " is-cur" : done ? " is-done" : ""}" data-step="${s.n}" role="button" tabindex="0" aria-label="${s.code} ${P.esc(s.t)}"${cur ? ' aria-current="step"' : ""}>
        <circle cx="${x}" cy="${y}" r="26" fill="transparent"/><circle cx="${x}" cy="${y}" r="${cur ? 13 : 8}" class="L27-dot"/>
        <text x="${x}" y="${y + 36}" text-anchor="middle" class="L27-c">${s.code}</text><text x="${x}" y="${y + 53}" text-anchor="middle" class="L27-t">${P.esc(s.short)}</text></g>`;
    }).join("");
    return `<svg class="L27-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="파이프라인 8단계 노선도">${phs}
      <line x1="${xs[0]}" y1="${y}" x2="${xs[7]}" y2="${y}" class="L27-rail"/><line x1="${xs[0]}" y1="${y}" x2="${cx}" y2="${y}" class="L27-run"/>${st}</svg>`;
  };
  add({
    no: 27, name: "노선도", idea: "지하철 노선도처럼 굵은 선 하나에 역 8개. 아래는 왼쪽에 단계 머리와 시안 목록, 오른쪽에 시안 카드.",
    render: (c) => `<div class="Lw L27"><div class="L27-map">${subway(c)}</div>
      <div class="L27-body Lg"><aside class="L27-side">${c.P.head()}${c.P.tabs({ cls: "L27-tabs" })}</aside><main class="Lm">${c.P.view()}</main></div></div>`,
    css: `
    .L27 { display: grid; gap: 18px; }
    .L27-map { overflow-x: auto; margin-inline: -8px; }
    .L27-svg { display: block; width: 100%; min-width: 680px; max-width: 1180px; height: auto; margin-inline: auto; }
    .L27-ph rect { fill: transparent; }
    .L27-ph text { font: 500 11px var(--mono); letter-spacing: 0.06em; fill: var(--muted); }
    .L27-ph.is-cur rect { fill: var(--surface); }
    .L27-ph.is-cur text { fill: var(--ink); font-weight: 600; }
    .L27-rail { stroke: var(--raise-2); stroke-width: 8; stroke-linecap: round; }
    .L27-run { stroke: var(--ink); stroke-width: 8; stroke-linecap: round; }
    .L27-st { cursor: pointer; outline: none; }
    .L27-dot { fill: var(--paper); stroke: var(--ink); stroke-width: 3; }
    .L27-st.is-done .L27-dot { fill: var(--surface); }
    .L27-st.is-cur .L27-dot { fill: var(--hi); stroke-width: 3.5; }
    .L27-st:hover .L27-dot, .L27-st:focus-visible .L27-dot { stroke-width: 5; }
    .L27-c { font: 600 12px var(--mono); fill: var(--ink); }
    .L27-t { font: 600 13px var(--sans); fill: var(--muted); }
    .L27-st.is-cur .L27-t { fill: var(--ink); }
    .L27-body { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 36px; align-items: start; max-width: 1320px; width: 100%; justify-self: center; }
    .L27-side { position: sticky; top: 0; display: grid; gap: 20px; }
    .L27 .hd-n { justify-self: start; font-size: 12px; padding: 2px 8px; border-radius: 6px; background: var(--hi); }
    .L27 .hd-t { font-size: 30px; }
    .L27 .L27-tabs { display: grid; gap: 1px; }
    .L27-tabs .tb-i { display: flex; gap: 10px; align-items: baseline; padding: 6px 10px; border-radius: 10px; }
    .L27-tabs .tb-i:hover { background: var(--surface); }
    .L27-tabs .tb-i[aria-pressed="true"] { background: var(--surface); box-shadow: inset 0 0 0 1.5px var(--ink); }
    .L27 .cd { background: var(--surface); border-radius: 24px; padding: 24px; gap: 16px; }
    .L27 .cd-f b { border-radius: 999px; }
    .L27 .ga { grid-template-columns: minmax(0, 1fr); }
    @media (max-width: 860px) { .L27 .L27-tabs { display: flex; flex-wrap: wrap; gap: 4px; } }`
  });

  /* ── 28 접는 목차 ── */
  add({
    no: 28, name: "접는 목차", idea: "지금 묶음만 펼치고 나머지 세 묶음은 한 줄로 접는다. 사이드바가 짧아지고, 시안 탭은 둥근 타일 격자.",
    render: (c) => {
      const { P } = c;
      const side = P.PHASES.map((p) => {
        const items = P.STEPS.filter((s) => s.ph === p.n);
        if (p.n === c.st.ph) return `<div class="L28-g is-open"><p class="L28-gh"><b>${p.n}</b>${P.esc(p.t)}<span>${items.length}단계</span></p><ol class="nv-l">${items.map((s) => `<li>${P.stepBtn(s, { sub: true })}</li>`).join("")}</ol></div>`;
        return `<button type="button" class="L28-g" data-step="${P.firstOf(p.n)}"><b>${p.n}</b>${P.esc(p.t)}<span>${items.map((s) => s.code).join(" · ")}</span><i aria-hidden="true">›</i></button>`;
      }).join("");
      return `<div class="Lw L28"><aside class="L28-side" aria-label="파이프라인 단계">${side}${P.foot()}</aside>
        <main class="Lm">${P.head()}${P.tabs()}${P.view()}</main></div>`;
    },
    css: `
    .L28 { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 36px; }
    .L28-side { position: sticky; top: 0; align-self: start; display: grid; gap: 6px; }
    .L28-g { appearance: none; border: 0; width: 100%; color: inherit; text-align: left; display: flex; gap: 10px; align-items: baseline; padding: 13px 16px; border-radius: 18px; background: var(--surface); font-weight: 700; transition: background-color 0.18s; }
    .L28-g b { font: 600 12px var(--mono); color: var(--muted); }
    .L28-g span { margin-left: auto; font: 400 11px var(--mono); color: var(--muted); }
    .L28-g i { font-style: normal; color: var(--muted); }
    button.L28-g:hover { background: var(--raise); }
    .L28-g.is-open { display: grid; gap: 8px; padding: 14px 8px 8px; background: var(--ink); color: var(--paper); }
    .L28-gh { margin: 0; display: flex; gap: 10px; align-items: baseline; padding: 0 8px; }
    .L28-g.is-open b { color: var(--hi); }
    .L28-g.is-open .L28-gh span { color: var(--night-muted); }
    .L28 .nv-l { gap: 4px; }
    .L28 .nv-s { border-radius: 12px; padding: 10px; }
    .L28 .nv-s:hover { background: var(--night-hover); }
    .L28 .nv-sub { color: var(--night-muted); }
    .L28 .nv-s[aria-current] { background: var(--paper); color: var(--ink); }
    .L28 .nv-s[aria-current] .nv-sub { color: var(--muted); }
    .L28 .nv-f { padding: 10px 16px 0; }
    .L28 .Lm { max-width: 1160px; gap: 22px; }
    .L28 .hd { grid-template-columns: auto minmax(0, 1fr); column-gap: 16px; }
    .L28 .hd-n { grid-row: span 3; font: 700 56px/0.84 var(--sans); letter-spacing: -0.06em; padding-top: 3px; background: var(--film); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-stroke: 1px var(--ink); }
    .L28 .tb { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 6px; }
    .L28 .tb-i { border-radius: 14px; background: var(--surface); padding: 9px 11px; }
    .L28 .tb-i:hover { background: var(--raise); }
    .L28 .tb-i[aria-pressed="true"] { background: var(--film); box-shadow: inset 0 0 0 1.5px var(--ink); }
    .L28 .tb-i[aria-pressed="true"] .tb-n { color: var(--ink); }
    .L28 .cd { gap: 16px; padding-top: 6px; }
    .L28 .cd-b { background: var(--surface); border-radius: 24px; padding: 22px; }
    .L28 .cd-f b { border-radius: 999px; }
    .L28 .ga .cd-b { padding: 16px; }
    @media (max-width: 860px) { .L28 .nv-f { display: none; } .L28 .hd-n { font-size: 40px; } .L28 .tb { grid-template-columns: repeat(2, minmax(0, 1fr)); } }`
  });

  /* ── 29 명령 막대 ── */
  add({
    no: 29, name: "명령 막대", idea: "단계 목록을 접어 위의 둥근 막대 하나에 넣는다. 누르면 4묶음이 펼쳐진다. 화면에는 그림과 번호 탭만 남는다.",
    render: (c) => {
      const { P } = c;
      const now = c.all ? `${c.L.length}종 모아 보기` : `${c.n}.${P.pad(c.v + 1)} ${P.esc(c.it ? c.it.name : "")}`;
      return `<div class="Lw L29"><details class="L29-cmd"><summary><span class="nv-c">${c.st.code}</span><b>${P.esc(c.st.t)}</b><span class="L29-now">${now}</span><span class="L29-k">단계 바꾸기 ▾</span></summary>
        <div class="L29-pop">${P.nav({ sub: true })}</div></details>
        <main class="Lm">${P.head({ code: false })}${P.tabs({ num: true, numOnly: true })}${P.view()}</main></div>`;
    },
    css: `
    .L29 { display: grid; gap: 30px; justify-items: center; }
    .L29-cmd { width: 100%; max-width: 760px; position: relative; z-index: 5; }
    .L29-cmd summary { list-style: none; display: flex; align-items: baseline; gap: 12px; min-width: 0; padding: 13px 18px; border-radius: 18px; background: var(--surface); box-shadow: var(--sh-1), inset 0 0 0 1px var(--line); }
    .L29-cmd summary::-webkit-details-marker { display: none; }
    .L29-cmd summary:hover { box-shadow: var(--sh-1), inset 0 0 0 1px var(--line-strong); }
    .L29-cmd summary b { white-space: nowrap; }
    .L29-now { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); }
    .L29-k { margin-left: auto; flex: none; font: 500 10.5px var(--mono); color: var(--muted); padding: 2px 9px; border-radius: 999px; background: var(--raise); }
    .L29-cmd[open] .L29-k { background: var(--ink); color: var(--paper); }
    .L29-pop { position: absolute; left: 0; right: 0; top: calc(100% + 8px); background: var(--surface); border-radius: 20px; box-shadow: var(--sh-2), inset 0 0 0 1px var(--line); padding: 16px; }
    .L29-pop .nv { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .L29-pop .nv-gh { padding-left: 10px; font-size: 12px; }
    .L29-pop .nv-s { grid-template-columns: minmax(0, 1fr); border-radius: 12px; }
    .L29-pop .nv-sub { grid-column: 1; }
    .L29-pop .nv-s:hover { background: var(--raise); }
    .L29-pop .nv-s[aria-current] { background: var(--hi); }
    .L29 .Lm { width: 100%; max-width: 1120px; gap: 20px; }
    .L29 .hd-t { font-size: 34px; }
    .L29 .tb { justify-self: start; gap: 0; padding: 3px; border-radius: 999px; background: var(--raise); }
    .L29 .tb-i { border-radius: 999px; padding: 5px 12px; }
    .L29 .tb-i:hover { background: var(--glass-edge); }
    .L29 .tb-i[aria-pressed="true"] { background: var(--surface); box-shadow: var(--sh-1); }
    .L29 .tb-i[aria-pressed="true"] .tb-n { color: var(--ink); font-weight: 600; }
    .L29 .cd { gap: 18px; }
    .L29 .cd-b { background: var(--surface); border-radius: 24px; padding: 24px; }
    .L29 .cd-f b { border-radius: 999px; }
    .L29 .ga .cd-b { padding: 16px; }
    @media (max-width: 860px) { .L29-pop .nv { grid-template-columns: repeat(2, minmax(0, 1fr)); } .L29-now { display: none; } .L29 .tb { border-radius: 18px; } }`
  });

  /* ── 30 그림 먼저 ── */
  add({
    no: 30, name: "그림 먼저", idea: "순서를 뒤집어 그림을 맨 위에 넓게, 설명은 그 아래 세 칸 캡션으로, 단계 이동은 맨 아래 조용한 줄로.",
    render: (c) => {
      const { P } = c;
      const foot = `<footer class="L30-foot Lg">${P.head({ code: false, q: false })}${P.nav({ short: true, gh: false })}</footer>`;
      if (c.all || !c.it) return `<div class="Lw L30">${P.tabs({ num: true })}${P.view()}${foot}</div>`;
      const p = P.parts(c.it, c.v);
      return `<div class="Lw L30"><figure class="L30-fig">${p.body}</figure>
        <div class="L30-cap Lg"><div><p class="L30-no">${p.no} · ${p.kind}</p><h2>${p.name}</h2></div><p class="L30-idea">${p.idea}</p><p class="L30-learn"><b>배우는 것</b>${p.learn}</p></div>
        ${P.tabs({ num: true })}${foot}</div>`;
    },
    css: `
    .L30 { display: grid; gap: 24px; max-width: 1320px; margin-inline: auto; }
    .L30-fig { margin: 0; min-width: 0; overflow-x: auto; background: var(--surface); border-radius: 34px; padding: 32px; }
    .L30-cap { display: grid; grid-template-columns: 1fr 1.4fr 1.4fr; gap: 28px; align-items: start; padding-inline: 10px; }
    .L30-no { margin: 0; font: 500 10.5px/1.4 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
    .L30-cap h2 { margin: 4px 0 0; font-size: 22px; line-height: 1.2; letter-spacing: -0.03em; text-wrap: balance; }
    .L30-idea { margin: 0; color: var(--muted); }
    .L30-learn { margin: 0; }
    .L30-learn b { display: inline-block; margin: 0 8px 4px 0; font: 600 10.5px/1.5 var(--mono); letter-spacing: 0.08em; padding: 1px 8px; border-radius: 999px; background: var(--hi); }
    .L30 > .tb { padding-inline: 6px; }
    .L30 .tb-i { display: flex; gap: 6px; align-items: baseline; border-radius: 999px; padding: 5px 12px; box-shadow: inset 0 0 0 1px var(--line); }
    .L30 .tb-i:hover { background: var(--surface); }
    .L30 .tb-i[aria-pressed="true"] { background: var(--ink); color: var(--paper); box-shadow: none; }
    .L30 .tb-i[aria-pressed="true"] .tb-n { color: var(--hi); }
    .L30-foot { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px 28px; align-items: end; margin-top: 10px; padding: 20px 10px 0; border-top: 1px solid var(--line); }
    .L30-foot .hd-t { font-size: 20px; }
    .L30-foot .nv { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; }
    .L30-foot .nv-g, .L30-foot .nv-l, .L30-foot .nv-l > li { display: contents; }
    .L30-foot .nv-s { display: inline-flex; gap: 6px; align-items: baseline; width: auto; padding: 4px 11px; border-radius: 999px; color: var(--muted); white-space: nowrap; }
    .L30-foot .nv-s:hover { color: var(--ink); background: var(--raise); }
    .L30-foot .nv-s[aria-current] { background: var(--ink); color: var(--paper); }
    .L30-foot .nv-s[aria-current] .nv-c { color: var(--hi); }
    .L30 .ga .cd { background: var(--surface); border-radius: 22px; padding: 18px; }
    @media (max-width: 860px) { .L30-fig { padding: 16px; border-radius: 24px; } .L30-cap { gap: 12px; padding-inline: 0; } .L30-foot .nv { justify-content: flex-start; } }`
  });
})();
