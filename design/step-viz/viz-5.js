/* 3.1 선언 · 물질특허 — 시각화 시안 10종 */
(function () {
  "use strict";
  const CV = window.CV, { EX, esc, f1, f2, R } = CV;
  const T = EX.t, L = EX.lead, P = EX.program, TID = EX.tid;
  const M = (v) => `$${v.toFixed(3)}M`;

  /* ── 이 파일 전용 도우미 ── */
  const tx = (x, y, s, a = "") => `<text x="${x}" y="${y}" ${a}>${esc(s)}</text>`;
  const cmp = (id) => CV.CMP.get(id) || null;
  const REF = { n: `${T.ref}`, s: T.refSmiles, kcal: T.refKcal };
  /* 연구비: 1.2 · 2.1 · 2.2 를 거쳐 특허 직전 · 직후 */
  const before = R.startCash - R.cost.htvs - R.cost.docking - R.cost.admet;
  const after = before - R.cost.patent;
  /* 전광판 규칙(pipeline-board DELTA, % [최소, 최대, 기본]) */
  const DELTA = { patent: [0, 5, 2], indPass: [0, 5, 2], indHold: [-8, 0, -4], phase1Pass: [0, 8, 4], phase1Fail: [-12, -2, -6],
    phase2Pass: [3, 15, 8], phase2Fail: [-18, -5, -12], phase3Pass: [5, 18, 10], phase3Fail: [-20, -8, -15] };
  const apprPct = Math.min(20, 12 * R.approvalMult.oral);
  /* 다른 모둠(전광판 RIVALS) — 원장 줄은 설명용 예시 */
  const RIV = [
    { tk: "SEU", name: "세움제약", col: "--seum", code: "SEU-204", tid: "egfr-1m17", cid: "CRX-EGFR-04", no: "KR-37-4807", day: 7 },
    { tk: "MIR", name: "미르파마", col: "--mirp", code: "MIR-210", tid: "dpp4-1x70", cid: "CRX-DPP4-01", no: "KR-37-4815", day: 9 },
    { tk: "DAO", name: "다온테라퓨틱스", col: "--daon", code: "DAO-217", tid: "cox2-3ln1", cid: "CRX-COX2-03", no: "KR-37-4833", day: 15 }
  ];
  /* 두 SMILES 의 다른 구간(앞 · 뒤 공통 부분을 뺀 가운데) */
  function diff(a, b) {
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    let j = 0; while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
    return { i, endB: b.length - j };
  }
  const CODE_RE = /^[A-Z]{2,4}-\d{3}$/;

  CV.css("s5", `
    .s5-doc { border: 1px solid var(--line-strong); background: var(--paper); display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(200px, 1fr); position: relative; }
    .s5-doc-l { position: relative; padding: 16px 18px; display: grid; gap: 10px; align-content: start; border-right: 1px solid var(--line); min-width: 0; }
    .s5-doc-r { padding: 16px; display: grid; gap: 10px; align-content: start; min-width: 0; }
    .s5-doc h3 { margin: 0; font-family: var(--serif); font-size: 19px; letter-spacing: -0.01em; }
    .s5-dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 7px 14px; margin: 0; }
    .s5-dl dt { font-size: 12px; color: var(--muted); white-space: nowrap; }
    .s5-dl dd { margin: 0; font-size: 13px; min-width: 0; overflow-wrap: anywhere; }
    .s5-dl dd.m { font-family: var(--mono); font-size: 12px; }
    .s5-ev { display: inline-grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; background: var(--hi); color: var(--ink); font-family: var(--mono); font-size: 11px; font-weight: 600; margin-right: 6px; vertical-align: 1px; }
    .s5-stamp { position: absolute; right: 12px; top: 8px; width: 80px; opacity: 0.9; transform: rotate(-12deg); pointer-events: none; }
    .s5-leg { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 12.5px; }
    .s5-leg b { font-weight: 600; }
    @media (max-width: 620px) { .s5-doc { grid-template-columns: minmax(0, 1fr); } .s5-doc-l { border-right: 0; border-bottom: 1px solid var(--line); } }
    .s5-in { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .s5-in input { font-family: var(--mono); font-size: 15px; padding: 6px 10px; border: 1px solid var(--line-strong); background: var(--paper); border-radius: 0; width: 150px; text-transform: none; }
    .s5-res { font-size: 13px; }
    .s5-tbl-w { overflow-x: auto; border: 1px solid var(--line-strong); }
    .s5-tbl { border-collapse: collapse; width: 100%; min-width: 760px; font-size: 12.5px; background: var(--paper); }
    .s5-tbl th, .s5-tbl td { border-bottom: 1px solid var(--line); padding: 7px 9px; text-align: left; vertical-align: middle; }
    .s5-tbl th { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.06em; color: var(--muted); font-weight: 500; background: var(--surface); }
    .s5-tbl td.m { font-family: var(--mono); font-size: 12px; white-space: nowrap; }
    .s5-tbl tr.me td { background: var(--film-3); font-weight: 600; }
    .s5-tbl tr.rej td { background: var(--bad-bg); border-top: 1px dashed var(--bad); }
    .s5-tbl .thumb { width: 104px; }
    .s5-tbl .thumb .molbox { border: 0; background: transparent; }
    .s5-dot { display: inline-block; width: 10px; height: 10px; margin-right: 6px; vertical-align: 0; }
    .s5-rcpt { max-width: 340px; margin-inline: auto; width: 100%; background: var(--paper); border: 1px solid var(--line-strong); padding: 16px 18px 20px; font-family: var(--mono); font-size: 12.5px; display: grid; gap: 4px;
      -webkit-mask-image: linear-gradient(-45deg, transparent 6px, #000 6px), linear-gradient(45deg, transparent 6px, #000 6px); -webkit-mask-size: 12px 100%; -webkit-mask-position: bottom left; }
    .s5-rcpt .ln { display: flex; justify-content: space-between; gap: 12px; }
    .s5-rcpt .ln span:last-child { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .s5-rcpt hr { border: 0; border-top: 1px dashed var(--line-strong); margin: 6px 0; width: 100%; }
    .s5-rcpt .big { font-size: 15px; font-weight: 600; }
    .s5-rcpt .c { text-align: center; }
    .s5-led-w { background: var(--night); color: var(--night-fg); padding: 14px 16px; display: grid; gap: 10px; overflow: hidden; }
    .s5-led { font-family: var(--mono); font-weight: 600; letter-spacing: 0.05em; font-size: 18px; white-space: nowrap; color: var(--led); text-shadow: 0 0 8px rgba(255, 178, 26, 0.55);
      -webkit-mask-image: radial-gradient(circle, #000 0.95px, transparent 1.3px); -webkit-mask-size: 3px 3px; mask-image: radial-gradient(circle, #000 0.95px, transparent 1.3px); mask-size: 3px 3px; overflow: hidden; }
    .s5-led.g { color: var(--led-g); }
    .s5-led.dim { color: var(--night-muted); text-shadow: none; }
    .s5-led-sub { font-size: 12px; color: var(--night-muted); }
    .s5-led-px { display: flex; gap: 18px; flex-wrap: wrap; align-items: baseline; font-family: var(--mono); }
    .s5-led-px b { font-size: 22px; color: var(--night-fg); font-variant-numeric: tabular-nums; }
    .s5-led-px .up { color: var(--led-g); }
    .s5-ba { overflow-x: auto; border: 1px solid var(--line-strong); }
    .s5-ba table { border-collapse: collapse; width: 100%; min-width: 600px; font-size: 12.5px; background: var(--paper); }
    .s5-ba th, .s5-ba td { padding: 7px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
    .s5-ba thead th { font-size: 13px; }
    .s5-ba tbody th { font-weight: 600; color: var(--muted); font-size: 12px; white-space: nowrap; }
    .s5-ba td.on, .s5-ba th.on { background: var(--film); }
    .s5-ba .lock { width: 34px; height: 34px; display: block; margin-bottom: 4px; }
    .s5-cap { font-size: 13.5px; min-height: 2.6em; margin: 0; }
    .s5-flow .nd { transition: opacity 0.25s; }
    .s5-flow.playing .nd { opacity: 0.28; }
    .s5-flow.playing .nd.on { opacity: 1; }
  `);

  /* 자물쇠(열림 · 잠김) 아이콘 */
  const lock = (closed, col) => `<svg class="lock" viewBox="0 0 34 34" aria-hidden="true">
    <path d="${closed ? "M10 15 V10 a7 7 0 0 1 14 0 V15" : "M10 15 V10 a7 7 0 0 1 14 0 V8"}" fill="none" stroke="var(${col})" stroke-width="2.6" ${closed ? "" : 'transform="translate(7 -3) rotate(18 17 10)"'}/>
    <rect x="6" y="15" width="22" height="16" fill="var(${col})"/><rect x="15.5" y="20" width="3" height="6" fill="var(--paper)"/></svg>`;

  window.VIZ[5] = [
    /* ── 01 출원서 + 도장 ── */
    {
      name: "출원서 해부",
      kind: "서류 실물 · 근거 번호",
      idea: "실제 물질특허 출원서 한 장에 근거 다섯 가지(구조 · 표적 · 결합 · 출원인 · 출원일)를 번호로 짚어 줍니다.",
      learn: "특허는 '이 분자 모양이 우리 것'이라는 주장이고, 그 주장은 구조 · 쓰임 · 결합 숫자 · 누가 · 언제로 받쳐진다.",
      render: () => {
        const stamp = `<svg class="s5-stamp" viewBox="0 0 100 100" role="img" aria-label="출원 도장 ${esc(P.patentNo)}">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--me)" stroke-width="3.5"/><circle cx="50" cy="50" r="37" fill="none" stroke="var(--me)" stroke-width="1.2"/>
          <text x="50" y="49" text-anchor="middle" font-size="22" font-weight="700" fill="var(--me)" style="fill:var(--me)">출원</text>
          <text x="50" y="66" text-anchor="middle" font-size="9.5" class="t-m" fill="var(--me)" style="fill:var(--me);font-family:var(--mono)">${esc(P.patentNo)}</text></svg>`;
        return `<div class="s5-doc">
          <div class="s5-doc-l">${stamp}<span class="vz-lab">물질특허 출원서 · 시청 · 특허청 창구</span><h3>${esc(P.plabel)}</h3>
            <dl class="s5-dl">
              <dt>출원번호</dt><dd class="m">${esc(P.patentNo)}</dd>
              <dt>프로그램</dt><dd class="m">${esc(P.code)} · 선언됨</dd>
              <dt><span class="s5-ev">1</span>구조</dt><dd class="m">${esc(L.c.s)}</dd>
              <dt><span class="s5-ev">2</span>표적 · 기전</dt><dd>${esc(T.gene)}(${esc(T.label)}) · ${esc(T.disease)}<br>${esc(P.mech)}</dd>
              <dt><span class="s5-ev">3</span>결합 근거</dt><dd class="m">ΔG ${f2(L.kcal)} kcal/mol · AutoDock Vina · PDB ${esc(T.pdb)}<br><span style="color:var(--muted)">기준 ${esc(T.ref)} ${f2(T.refKcal)} · 결합력 p ${f2(L.p)}</span></dd>
              <dt><span class="s5-ev">4</span>출원인</dt><dd>${esc(P.company)} (${esc(P.ticker)})</dd>
              <dt><span class="s5-ev">5</span>출원일</dt><dd class="m">D+${P.day} · 출원료 ${M(R.cost.patent)}</dd>
            </dl></div>
          <div class="s5-doc-r"><span class="vz-lab">① 구조식 — 지키려는 바로 그 모양</span>${CV.mol(L.c.s, 260, 160)}
            <ul class="s5-leg">
              <li><span class="s5-ev">1</span><b>구조</b> — 무엇을 지키나</li>
              <li><span class="s5-ev">2</span><b>표적 · 기전</b> — 어디에 쓰나</li>
              <li><span class="s5-ev">3</span><b>결합 근거</b> — 정말 붙는다는 숫자</li>
              <li><span class="s5-ev">4</span><b>출원인</b> — 누구 것인가</li>
              <li><span class="s5-ev">5</span><b>출원일</b> — 누가 먼저인가</li></ul></div></div>
          <p class="vz-note">ΔG(결합 자유 에너지)는 음수가 클수록 단단히 붙습니다. 이 분자는 기준 약 ${esc(T.ref)}(${f2(T.refKcal)})와 거의 같은 ${f2(L.kcal)} kcal/mol 입니다.</p>`;
      }
    },

    /* ── 02 코드명 해부도 + 직접 입력 ── */
    {
      name: "코드명 해부도",
      kind: "해부도 · 입력 검사",
      idea: "CRX-101 을 세 조각으로 갈라 각 부분의 뜻을 달고, 직접 코드명을 써 보면 어느 조각이 틀렸는지 알려 줍니다.",
      learn: "코드명은 '회사 이름표 + 이음표 + 번호 3자리'라는 약속이고, 선언하면 다시 못 바꾸니 처음에 형식을 지켜야 한다.",
      render: () => {
        const [tk, num] = P.code.split("-");
        const W = 720, H = 250, y = 112;
        const xs = [150, 268, 306];
        const body = `
          <rect x="0" y="0" width="${W}" height="${H}" fill="var(--paper)"/>
          ${tx(xs[0], y, tk, `class="t-m" font-size="64" font-weight="600" text-anchor="start"`)}
          ${tx(xs[1], y, "-", `class="t-m" font-size="64" font-weight="600" text-anchor="start"`)}
          ${tx(xs[2], y, num, `class="t-m" font-size="64" font-weight="600" text-anchor="start"`)}
          <path d="M150 128 V140 H262 V128" fill="none" stroke="var(--me)" stroke-width="2"/>
          <path d="M206 140 V160" fill="none" stroke="var(--me)" stroke-width="2"/>
          ${tx(206, 180, "회사 이름표(티커)", `text-anchor="middle" font-size="14" font-weight="600" style="fill:var(--me)"`)}
          ${tx(206, 198, "영문 대문자 2~4자", `text-anchor="middle" font-size="12.5" class="t-mu"`)}
          ${tx(206, 215, `${P.company} = ${P.ticker}`, `text-anchor="middle" font-size="12.5" class="t-mu"`)}
          <path d="M287 52 V26" fill="none" stroke="var(--muted)" stroke-width="1.5"/>
          ${tx(287, 18, "이음표 '-' 하나", `text-anchor="middle" font-size="12.5" class="t-mu"`)}
          <path d="M306 128 V140 H421 V128" fill="none" stroke="var(--seum)" stroke-width="2"/>
          <path d="M364 140 V160" fill="none" stroke="var(--seum)" stroke-width="2"/>
          ${tx(364, 180, "프로그램 번호", `text-anchor="middle" font-size="14" font-weight="600" style="fill:var(--seum)"`)}
          ${tx(364, 198, "숫자 정확히 3자리", `text-anchor="middle" font-size="12.5" class="t-mu"`)}
          ${tx(364, 215, "모둠이 정함(예: 101)", `text-anchor="middle" font-size="12.5" class="t-mu"`)}
          <rect x="560" y="40" width="144" height="116" fill="var(--surface)" stroke="var(--line-strong)"/>
          ${tx(574, 62, "다른 모둠 코드명", `font-size="12" class="t-mu"`)}
          ${RIV.map((r, i) => tx(574, 88 + i * 24, r.code, `class="t-m" font-size="14" font-weight="600" style="fill:var(${r.col})"`)).join("")}
          ${tx(20, 240, "형식: 영문 대문자 2~4 + '-' + 숫자 3  ·  선언한 뒤에는 바꿀 수 없음", `font-size="12.5" class="t-mu"`)}`;
        return `${CV.svg(W, H, body, `코드명 ${P.code} 해부도`)}
          <div class="vz-row" style="align-items:flex-start;gap:14px">
            <div class="s5-in"><label class="vz-lab" for="s5-v2-code">직접 써 보기</label><input id="s5-v2-code" value="${esc(P.code)}" maxlength="10" autocomplete="off" spellcheck="false"></div>
            <div class="vz-row" role="group" aria-label="예시 넣기">${["CRX-101", "crx-101", "CRISTA-1", "C-101", "CRX-1010", "SEU-204"].map((c) => `<button type="button" class="vz-btn" data-ex="${esc(c)}">${esc(c)}</button>`).join("")}</div></div>
          <p class="s5-res" id="s5-v2-res" aria-live="polite"><span class="vz-sig good">쓸 수 있음</span> 이름표 ${esc(tk)} · 이음표 · 번호 ${esc(num)}</p>
          <p class="vz-note">기전 한 줄도 같은 원리로 짭니다: <b>${esc(T.gene)}</b>(무엇을) · <b>선택적 · 가역</b>(어떻게 — 다른 단백질은 덜 건드리고, 붙었다 떨어질 수 있게) · <b>억제제</b>(무엇을 하나 — 효소를 막는다).</p>`;
      },
      mount: (el) => {
        const inp = el.querySelector("#s5-v2-code"), out = el.querySelector("#s5-v2-res");
        if (!inp || !out) return;
        const check = () => {
          const v = inp.value;
          if (CODE_RE.test(v)) { const [a, b] = v.split("-"); out.innerHTML = `<span class="vz-sig good">쓸 수 있음</span> 이름표 ${esc(a)} · 이음표 · 번호 ${esc(b)}`; return; }
          const why = [];
          const m = /^([^-]*)(-?)(.*)$/.exec(v);
          if (!/^[A-Z]{2,4}$/.test(m[1])) why.push(/[a-z]/.test(m[1]) ? "이름표에 소문자가 있음" : m[1].length < 2 ? "이름표가 2자보다 짧음" : m[1].length > 4 ? "이름표가 4자보다 김" : "이름표는 영문 대문자만");
          if (!m[2]) why.push("이음표 '-'가 없음");
          if (!/^\d{3}$/.test(m[3])) why.push(m[3].length !== 3 ? `번호가 ${m[3].length}자리(3자리여야 함)` : "번호는 숫자만");
          out.innerHTML = `<span class="vz-sig bad">형식 틀림</span> ${esc(why.join(" · ") || "형식을 확인하세요")}`;
        };
        inp.addEventListener("input", check);
        const btns = el.querySelectorAll("[data-ex]");
        btns.forEach((b) => b.addEventListener("click", () => { inp.value = b.dataset.ex; check(); }));
        check();
      }
    },

    /* ── 03 선언 → 출원 → 공개 흐름도(공개 범위 두 줄) ── */
    {
      name: "공개 흐름도",
      kind: "흐름도 · 공개 범위 두 줄 · 단계 재생",
      idea: "위 줄은 우리 모둠 안, 아래 줄은 학급 전체가 보는 곳입니다. 선언과 출원이 무엇을 언제 바깥으로 내보내는지 한 칸씩 재생합니다.",
      learn: "선언하면 코드명이, 출원하면 분자 구조까지 학급에 공개된다 — 그래서 특허는 '먼저 내는 쪽'이 이기는 경쟁이다.",
      render: () => {
        const W = 760, H = 300, w = 128, h = 60;
        const lane = (y, label, fill) => `<rect x="0" y="${y}" width="${W}" height="118" fill="${fill}"/>${tx(10, y + 18, label, `font-size="12" class="t-mu" font-weight="600"`)}`;
        const node = (k, x, y, t, s, accent) => `<g class="nd" data-k="${k}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--paper)" stroke="${accent ? "var(--ink)" : "var(--line-strong)"}" stroke-width="${accent ? 1.6 : 1}"/>
          ${tx(x + 10, y + 24, t, `font-size="13.5" font-weight="600"`)}${tx(x + 10, y + 44, s, `font-size="11.5" class="t-m t-mu"`)}</g>`;
        const ar = (d) => `<path d="${d}" fill="none" stroke="var(--ink)" stroke-width="1.4" marker-end="url(#s5-ar)"/>`;
        const y0 = 44, y1 = 196;
        const body = `<defs><marker id="s5-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--ink)"/></marker></defs>
          ${lane(10, "우리 모둠 안", "var(--surface)")}${lane(162, "학급 전체에 공개", "var(--raise)")}
          ${ar(`M${10 + w} ${y0 + 30} H${160}`)}${ar(`M${160 + w / 2} ${y0 + h} V${y1 - 2}`)}${ar(`M${160 + w} ${y0 + 30} H${310}`)}
          ${ar(`M${310 + w / 2} ${y0 + h} L${460 + 20} ${y1 - 2}`)}${ar(`M${460 + w} ${y1 + 30} H${610}`)}${ar(`M${310 + w} ${y0 + 30} H${610}`)}
          ${node(1, 10, y0, "리드 확정", "2.2 ADMET 결과", false)}
          ${node(2, 160, y0, "프로그램 선언", "코드명 · 기전 · 무료", true)}
          ${node(3, 160, y1, "공개 서랍에 코드명", `${P.code} 보임`, false)}
          ${node(4, 310, y0, "물질특허 출원", `${M(R.cost.patent)} · D+${P.day}`, true)}
          ${node(5, 460, y1, "특허 원장 등록", "구조까지 공개", false)}
          ${node(6, 610, y1, "전광판 LED", `주가 +${DELTA.patent[2]}% (기본)`, false)}
          ${node(7, 610, y0, "3.2 IND 열림", "특허 분자로만", false)}`;
        return `<div class="s5-flow" id="s5-v3-flow">${CV.svg(W, H, body, "선언에서 공개까지 흐름도")}</div>
          <div class="vz-row"><button type="button" class="vz-btn" id="s5-v3-prev">← 이전</button><button type="button" class="vz-btn" id="s5-v3-play">처음부터 재생</button><button type="button" class="vz-btn" id="s5-v3-next">다음 →</button></div>
          <p class="s5-cap" id="s5-v3-cap" aria-live="polite">굵은 테두리 두 칸(선언 · 출원)이 우리가 누르는 버튼입니다. 화살표가 아래 줄로 내려가는 순간 정보가 학급 전체에 공개됩니다.</p>`;
      },
      mount: (el) => {
        const flow = el.querySelector("#s5-v3-flow"), cap = el.querySelector("#s5-v3-cap");
        if (!flow || !cap) return;
        const S = [
          [[1], `2.2에서 리드(${L.name})를 골랐습니다. 아직 아무도 모릅니다.`],
          [[2], `코드명 ${P.code}와 기전 '${P.mech}'을 붙여 선언합니다. 무료지만 코드명은 이제 못 바꿉니다.`],
          [[2, 3], "선언하는 순간 다른 모둠의 공개 서랍에 우리 코드명이 뜹니다. 분자 구조는 아직 비밀입니다."],
          [[4], `특허청 창구에 출원합니다. 출원료 ${M(R.cost.patent)} · 게임 날짜 D+${P.day}.`],
          [[4, 5], `특허 원장(${P.patentNo})에 구조가 올라 학급 모두가 봅니다. 같은 분자는 먼저 낸 모둠만 가질 수 있어요.`],
          [[5, 6], `전광판에 '${P.company} 물질특허 등록'이 흐르고 주가가 ${DELTA.patent[0]}~${DELTA.patent[1]}%(기본 ${DELTA.patent[2]}%) 오릅니다.`],
          [[7], "특허를 가진 분자만 다음 단계 3.2 제형 · IND로 갈 수 있습니다."]
        ];
        let i = -1, timer = null;
        const show = (k) => {
          i = Math.max(0, Math.min(S.length - 1, k));
          flow.classList.add("playing");
          flow.querySelectorAll(".nd").forEach((g) => g.classList.toggle("on", S[i][0].includes(+g.dataset.k)));
          cap.textContent = `${i + 1}/${S.length} · ${S[i][1]}`;
        };
        const stop = () => { if (timer) clearInterval(timer); timer = null; };
        el.querySelector("#s5-v3-prev").addEventListener("click", () => { stop(); show(i < 0 ? 0 : i - 1); });
        el.querySelector("#s5-v3-next").addEventListener("click", () => { stop(); show(i + 1); });
        el.querySelector("#s5-v3-play").addEventListener("click", () => {
          stop(); show(0);
          if (CV.reduced()) return;
          timer = setInterval(() => { if (i >= S.length - 1) return stop(); show(i + 1); }, 2200);
        });
        return stop;
      }
    },

    /* ── 04 학급 특허 원장 ── */
    {
      name: "학급 특허 원장",
      kind: "원장 표 · 선착순",
      idea: "학급 모두가 보는 특허 원장을 출원 순서대로 늘어놓고, 늦게 같은 분자를 낸 경우 어떻게 거절되는지 한 줄로 보여 줍니다.",
      learn: "특허 원장은 공개 경쟁판이다 — 같은 분자는 먼저 낸 모둠 것이 되므로, 리드를 정했으면 빨리 출원해야 한다.",
      render: () => {
        const rows = RIV.filter((r) => r.day < P.day).map((r) => ({ ...r, me: false }))
          .concat([{ tk: P.ticker, name: P.company, col: "--me", code: P.code, tid: TID, no: P.patentNo, day: P.day, me: true }])
          .concat(RIV.filter((r) => r.day > P.day).map((r) => ({ ...r, me: false })));
        const tr = (r, i) => {
          const c = r.me ? L.c : cmp(r.cid), t = CV.TARGETS[r.tid];
          return `<tr class="${r.me ? "me" : ""}"><td class="m">${i + 1}</td><td class="m">${esc(r.no)}</td>
            <td><span class="s5-dot" style="background:var(${r.col})"></span>${esc(r.name)}${r.me ? " <b>(우리)</b>" : ""}</td><td class="m"><b>${esc(r.code)}</b></td>
            <td>${esc(t.gene)} · ${esc(t.disease)}</td><td class="thumb">${c ? CV.mol(c.s, 150, 90) : ""}</td><td>${esc(c ? c.n : "")}</td><td class="m">D+${r.day}</td>
            <td><span class="vz-sig good">등록</span></td></tr>`;
        };
        const rej = `<tr class="rej"><td class="m">—</td><td class="m">거절</td><td><span class="s5-dot" style="background:var(--daon)"></span>다온테라퓨틱스</td><td class="m">DAO-218</td>
          <td>${esc(T.gene)} · ${esc(T.disease)}</td><td class="thumb">${CV.mol(L.c.s, 150, 90)}</td><td>${esc(L.name)}</td><td class="m">D+20</td>
          <td><span class="vz-sig bad">거절 · 이미 있음</span></td></tr>`;
        return `<div class="s5-tbl-w"><table class="s5-tbl"><caption class="sr">학급 특허 원장</caption>
          <thead><tr><th>순서</th><th>출원번호</th><th>출원인</th><th>코드명</th><th>표적 · 질환</th><th>구조</th><th>물질</th><th>출원일</th><th>상태</th></tr></thead>
          <tbody>${rows.map(tr).join("")}${rej}</tbody></table></div>
          <p class="vz-note">빨간 줄은 '만약' 장면입니다. 다른 모둠이 D+20 에 우리와 같은 분자를 내면, D+${P.day} 에 먼저 낸 ${esc(P.code)} 때문에 거절됩니다. 다른 모둠 줄의 번호 · 날짜는 설명용 예시이고, 물질 이름은 수업 데이터의 실제 후보입니다.</p>`;
      }
    },

    /* ── 05 특허 20년 타임라인 + 슬라이더 ── */
    {
      name: "20년 시계",
      kind: "타임라인 막대 · 슬라이더",
      idea: "특허 20년 막대 위에 '개발에 쓰는 해'를 슬라이더로 늘려 보면 실제로 독점 판매할 수 있는 해가 얼마나 줄어드는지 보입니다.",
      learn: "특허 시계는 출원하는 날부터 돈다 — 임상 · 심사에 오래 걸릴수록 약을 혼자 팔 수 있는 기간이 짧아진다.",
      render: () => `${CV.svg(760, 270, '<g id="s5-v5-g">' + s5TimeBody(12) + "</g>", "특허 20년 타임라인")}
        <div class="vz-row"><label class="vz-lab" for="s5-v5-dev" style="flex:none">출원에서 허가까지</label><input type="range" class="vz-rng" id="s5-v5-dev" min="6" max="16" step="1" value="12" style="flex:1 1 200px"><b class="mono" id="s5-v5-val">12년</b></div>
        <p class="vz-note">출처: 특허 기간은 출원일부터 20년(미국 FDA 'Patents and Exclusivity' FAQ). 핵심 특허 출원에서 허가까지 평균 약 12년(Journal of Economic Perspectives, 미국 신약 2000~2023 분석). 허가 뒤 실제 독점 기간 중앙값 약 12.5년(Wang · Liu · Kesselheim, JAMA Intern Med 2015). 연장은 미국 규칙을 단순화해 '최대 5년 · 허가 뒤 합계 14년 상한'만 반영했습니다.</p>`,
      mount: (el) => {
        const r = el.querySelector("#s5-v5-dev"), g = el.querySelector("#s5-v5-g"), v = el.querySelector("#s5-v5-val");
        if (!r || !g) return;
        r.addEventListener("input", () => { g.innerHTML = s5TimeBody(+r.value); v.textContent = r.value + "년"; });
      }
    },

    /* ── 06 구조 지문(바코드) ── */
    {
      name: "구조 지문",
      kind: "SMILES 바코드 · 차이 강조",
      idea: "SMILES(분자를 한 줄 글자로 적은 것)를 글자마다 막대로 바꿔 지문처럼 늘어놓고, 기준 약 도네페질과 다른 글자만 형광으로 칠합니다.",
      learn: "이미 알려진 약(도네페질)은 특허를 못 받는다 — 원자 하나라도 다른 '새 분자'여야 우리 것이 될 수 있다.",
      render: () => {
        const list = [
          { n: `${T.ref} — 이미 팔리는 약(기준)`, s: REF.s, ref: true },
          { n: `${P.code} 리드 · ${L.name}`, s: L.c.s, me: true },
          ...EX.dock.filter((d) => !d.ref && d.id !== L.id && d.c.t === TID).map((d) => ({ n: d.name, s: d.c.s }))
        ];
        const W = 760, x0 = 16, bw = 13.4, rowH = 74;
        const colOf = (ch) => /[Nn]/.test(ch) ? "var(--me)" : /O/.test(ch) ? "var(--mirp)" : /[FlI]|C(?=l)/.test(ch) ? "var(--seum)" : /[Cc]/.test(ch) ? "var(--ink)" : "var(--line-strong)";
        const atom = (s, k) => /[A-Za-z]/.test(s[k]);
        const rows = list.map((r, ri) => {
          const y = 18 + ri * rowH, d = r.ref ? null : diff(REF.s, r.s);
          const bars = [...r.s].map((ch, k) => {
            const x = x0 + k * bw, hit = d && k >= d.i && k < d.endB, tall = atom(r.s, k);
            const isCl = ch === "C" && r.s[k + 1] === "l";
            return `${hit ? `<rect x="${x - 1}" y="${y + 14}" width="${bw}" height="44" fill="var(--hi)"/>` : ""}
              <rect x="${x + 1.5}" y="${y + (tall ? 18 : 30)}" width="${bw - 4.5}" height="${tall ? 24 : 12}" fill="${isCl ? "var(--seum)" : colOf(ch)}"/>
              <text x="${x + bw / 2 - 0.5}" y="${y + 55}" text-anchor="middle" font-size="11" class="t-m">${esc(ch)}</text>`;
          }).join("");
          const n = d ? Math.max(d.endB - d.i, 1) : 0;
          const tag = r.ref ? "기준 · 특허 불가(이미 알려짐)" : r.me ? `다른 글자 ${n}자 → 새 분자` : `다른 글자 ${n}자`;
          return `${tx(x0, y + 8, r.n, `font-size="12.5" font-weight="${r.me ? 700 : 500}"`)}${tx(W - 10, y + 8, tag, `font-size="11.5" text-anchor="end" class="${r.me ? "" : "t-mu"}" ${r.me ? 'style="fill:var(--me)" font-weight="600"' : ""}`)}${bars}`;
        }).join("");
        const H = 18 + list.length * rowH + 6;
        return `${CV.svg(W, H, rows, "SMILES 지문 비교")}
          <div class="vz-row"><span class="vz-chip" style="border-color:var(--ink)">C · c 탄소</span><span class="vz-chip" style="color:var(--me);border-color:var(--me)">N · n 질소</span><span class="vz-chip" style="color:var(--mirp);border-color:var(--mirp)">O 산소</span><span class="vz-chip" style="color:var(--seum);border-color:var(--seum)">F · Cl 할로젠</span><span class="vz-chip">짧은 막대 = 고리 번호 · 괄호</span><span class="vz-chip" style="background:var(--hi)">형광 = 도네페질과 다른 곳</span></div>
          <div class="vz-cols"><div style="max-width:360px"><span class="vz-lab">${esc(T.ref)}(기준)</span>${CV.mol(REF.s, 260, 150)}</div><div style="max-width:360px"><span class="vz-lab">${esc(P.code)} 리드 — 벤젠 고리의 C 하나가 N 으로</span>${CV.mol(L.c.s, 260, 150)}</div></div>`;
      }
    },

    /* ── 07 특허 영역 지도(울타리) ── */
    {
      name: "특허 울타리",
      kind: "공간 은유 지도 · 토글",
      idea: "우리 분자를 가운데 두고 구조가 비슷한 이웃을 거리로 배치한 뒤, 특허가 감싸는 울타리를 '게임 규칙'과 '실제 특허' 두 가지로 바꿔 봅니다.",
      learn: "특허는 분자 주변에 치는 울타리다 — 울타리 안은 우리만 만들 수 있고, 이미 알려진 분자(도네페질)는 울타리에 넣을 수 없다.",
      render: () => {
        const W = 760, H = 400, cx = 380, cy = 200;
        const pol = (r, a) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)];
        const named = (id) => cmp(id);
        const pts = [
          { k: "ref", n: `${T.ref}(기준 · 이미 알려짐)`, r: 78, a: 160, kind: "ref", la: "middle", dy: -36 },
          { k: "f", n: named("CRX-ACHE-01").n, r: 140, a: 128, kind: "own", la: "end", dy: -10 },
          { k: "cl", n: named("CRX-ACHE-05").n, r: 140, a: 200, kind: "own", la: "end", dy: 22 },
          { k: "et", n: named("CRX-ACHE-02").n, r: 140, a: 238, kind: "own", la: "start", dy: 22 },
          { k: "p2", n: "피리딘-2-일메틸(가상)", r: 140, a: 20, kind: "ghost", la: "end", dy: -8 },
          { k: "p4", n: "피리딘-4-일메틸(가상)", r: 140, a: -28, kind: "ghost", la: "end", dy: 20 },
          { k: "ga", n: "갈란타민", r: 186, a: 110, kind: "far", la: "middle", dy: -12 },
          { k: "ri", n: "리바스티그민", r: 186, a: 300, kind: "far", la: "middle", dy: 22 },
          { k: "ta", n: "타크린", r: 186, a: 355, kind: "far", la: "start", dy: 4 }
        ];
        const [rx, ry] = pol(78, 160);
        const ring = (r, label) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--line-strong)" stroke-dasharray="3 4"/>${tx(cx + 4, cy - r - 4, label, `font-size="11" class="t-mu"`)}`;
        const dots = pts.map((p) => {
          const [x, y] = pol(p.r, p.a);
          const shape = p.kind === "ref" ? `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" fill="var(--paper)" stroke="var(--bad)" stroke-width="2"/><path d="M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x + 5} ${y - 5} L${x - 5} ${y + 5}" stroke="var(--bad)" stroke-width="1.6"/>`
            : p.kind === "ghost" ? `<circle cx="${x}" cy="${y}" r="6.5" fill="var(--paper)" stroke="var(--me)" stroke-width="1.6" stroke-dasharray="2 2"/>`
            : p.kind === "far" ? `<circle cx="${x}" cy="${y}" r="6" fill="var(--muted)"/>`
            : `<circle cx="${x}" cy="${y}" r="6.5" fill="var(--ink)"/>`;
          const lx = p.la === "end" ? x - 10 : p.la === "start" ? x + 10 : x;
          return `${shape}${tx(lx, y + p.dy, p.n, `font-size="12" text-anchor="${p.la}" ${p.kind === "far" ? 'class="t-mu"' : ""}`)}`;
        }).join("");
        const big = 160;
        const realFence = `<g class="s5-f" data-f="real"><path d="M${cx - big} ${cy} a${big} ${big} 0 1 0 ${2 * big} 0 a${big} ${big} 0 1 0 ${-2 * big} 0 Z M${rx - 26} ${ry} a26 26 0 1 0 52 0 a26 26 0 1 0 -52 0 Z" fill="var(--good-bg)" fill-rule="evenodd" stroke="var(--good)" stroke-width="2.2" stroke-dasharray="9 4"/>
          ${tx(cx + 104, cy + 150, "울타리: 계열 전체 청구", `font-size="12.5" font-weight="600" style="fill:var(--good)"`)}
          ${tx(rx, ry + 46, "구멍 = 이미 알려진 분자", `font-size="11.5" style="fill:var(--bad)" text-anchor="middle"`)}</g>`;
        const gameFence = `<g class="s5-f" data-f="game" style="display:none"><circle cx="${cx}" cy="${cy}" r="30" fill="var(--good-bg)" stroke="var(--good)" stroke-width="2.2" stroke-dasharray="9 4"/>
          ${tx(cx, cy + 50, "울타리: 이 분자 하나", `font-size="12.5" font-weight="600" text-anchor="middle" style="fill:var(--good)"`)}</g>`;
        const body = `<rect x="0" y="0" width="${W}" height="${H}" fill="var(--paper)"/>
          ${realFence}${gameFence}
          ${ring(78, "1곳 바뀜")}${ring(140, "2곳 바뀜")}${ring(186, "골격이 다름")}
          <circle cx="${cx}" cy="${cy}" r="11" fill="var(--hi)" stroke="var(--ink)" stroke-width="2"/>
          ${tx(cx, cy - 38, P.code, `class="t-m" font-size="14" font-weight="700" text-anchor="middle"`)}
          ${dots}
          ${tx(14, 22, "가운데에서 멀수록 구조가 많이 다름(바뀐 원자 자리 수)", `font-size="12" class="t-mu"`)}`;
        return `<div class="vz-row" role="group" aria-label="울타리 종류"><button type="button" class="vz-btn" data-f="real" aria-pressed="true">실제 특허 — 계열 청구</button><button type="button" class="vz-btn" data-f="game" aria-pressed="false">게임 규칙 — 분자 하나</button></div>
          ${CV.svg(W, H, body, "특허 영역 지도")}
          <p class="vz-note" id="s5-v7-cap">실제 물질특허는 마쿠시 청구항(한 자리에 들어갈 수 있는 여러 원자를 한꺼번에 청구)으로 이웃 분자까지 울타리 안에 넣습니다. 단, 이미 공개된 도네페질은 새롭지 않아 뺍니다(신규성). 빈 점선 원은 아직 만들지 않은 가상의 이웃입니다.</p>`;
      },
      mount: (el) => {
        const cap = el.querySelector("#s5-v7-cap");
        const T1 = cap ? cap.textContent : "";
        const T2 = `이 게임에서는 정규 SMILES 하나 = 특허 하나입니다. 울타리가 ${P.code} 하나만 감싸므로 바로 옆 이웃(검은 점)은 다른 모둠이 먼저 출원할 수도 있어요.`;
        el.querySelectorAll("button[data-f]").forEach((b) => b.addEventListener("click", () => {
          const f = b.dataset.f;
          el.querySelectorAll("button[data-f]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          el.querySelectorAll("g.s5-f").forEach((g) => { g.style.display = g.dataset.f === f ? "" : "none"; });
          if (cap) cap.textContent = f === "real" ? T1 : T2;
        }));
      }
    },

    /* ── 08 비용 · 날짜 영수증 ── */
    {
      name: "출원 영수증",
      kind: "영수증 실물",
      idea: "특허청 창구에서 받는 영수증처럼 선언 · 출원 비용, 날짜, 남은 연구비, 주가 변화를 한 장에 적습니다.",
      learn: "선언은 공짜지만 특허는 돈($0.050M)이 든다 — 대신 분자를 지키고 주가도 조금 오른다.",
      render: () => {
        const ln = (a, b, cls = "") => `<div class="ln ${cls}"><span>${esc(a)}</span><span>${esc(b)}</span></div>`;
        return `<div class="s5-rcpt" role="img" aria-label="특허 출원 영수증">
          <div class="c big">시청 · 특허청 창구</div><div class="c" style="color:var(--muted)">영수증 · ${esc(P.patentNo)}</div><hr>
          ${ln("날짜", `D+${P.day}`)}${ln("출원인", `${P.company} (${P.ticker})`)}${ln("프로그램", P.code)}<hr>
          ${ln("프로그램 선언", "무료")}${ln("물질특허 출원료", M(R.cost.patent))}<hr>
          ${ln("출원 전 연구비", M(before))}${ln("낸 돈", "−" + M(R.cost.patent))}${ln("남은 연구비", M(after), "big")}<hr>
          ${ln("전광판 주가", `+${DELTA.patent[2].toFixed(1)}% (기본)`)}${ln("변동 범위", `${DELTA.patent[0]}~${DELTA.patent[1]}%`)}<hr>
          <div class="c" style="color:var(--muted)">이 분자의 구조는 학급 원장에 공개됩니다</div></div>
          <p class="vz-note">지금까지 쓴 돈: 스크리닝 ${M(R.cost.htvs)} + 도킹 ${M(R.cost.docking)} + ADMET ${M(R.cost.admet)} + 특허 ${M(R.cost.patent)} = ${M(R.startCash - after)}. 다음 IND 는 ${M(R.cost.ind)}, 임상 1상은 ${M(R.cost.phase1)} 입니다.</p>`;
      }
    },

    /* ── 09 전광판 헤드라인 미리보기 + 주가 반응 크기 ── */
    {
      name: "전광판 반응",
      kind: "LED 미리보기 · 발산 막대",
      idea: "출원하면 학급 전광판에 뜨는 LED 헤드라인과 주가 변화를 재생하고, 다른 소식(임상 통과 · 실패 · 허가)에 비해 그 크기가 어느 정도인지 막대로 비교합니다.",
      learn: "특허는 경쟁자 모두에게 알리는 소식이고 주가를 조금(+2%) 올린다 — 큰 상승은 임상 통과와 허가에서 온다.",
      render: () => {
        const ev = [
          ["물질특허 등록", "patent"], ["IND 승인", "indPass"], ["1상 통과", "phase1Pass"], ["2상 통과", "phase2Pass"], ["3상 통과", "phase3Pass"],
          ["IND 보류", "indHold"], ["1상 실패", "phase1Fail"], ["2상 실패", "phase2Fail"], ["3상 실패", "phase3Fail"]
        ];
        const W = 760, rowH = 26, top = 30, H = top + (ev.length + 1) * rowH + 30;
        const x = CV.scale([-26, 22], [236, 720]);
        const rows = ev.map(([lab, k], i) => {
          const [lo, hi, d] = DELTA[k], y = top + i * rowH, me = k === "patent";
          return `${me ? `<rect x="0" y="${y - 3}" width="${W}" height="${rowH}" fill="var(--hi)" opacity="0.55"/>` : ""}
            ${tx(220, y + 14, lab, `font-size="12.5" text-anchor="end" ${me ? 'font-weight="700"' : ""}`)}
            <rect x="${Math.min(x(0), x(d))}" y="${y + 3}" width="${Math.max(1.5, Math.abs(x(d) - x(0)))}" height="14" fill="${d >= 0 ? "var(--good)" : "var(--bad)"}"/>
            <path d="M${x(lo)} ${y + 10} H${x(hi)}" stroke="var(--ink)" stroke-width="1"/><path d="M${x(lo)} ${y + 5} V${y + 15} M${x(hi)} ${y + 5} V${y + 15}" stroke="var(--ink)" stroke-width="1"/>
            ${tx(d >= 0 ? x(hi) + 6 : x(lo) - 6, y + 14, `${d > 0 ? "+" : ""}${d}%`, `class="t-m" font-size="11.5" text-anchor="${d >= 0 ? "start" : "end"}"`)}`;
        }).join("");
        const ya = top + ev.length * rowH;
        const appr = `${tx(220, ya + 14, "최종 허가(경구)", `font-size="12.5" text-anchor="end"`)}<rect x="${x(0)}" y="${ya + 3}" width="${x(apprPct) - x(0)}" height="14" fill="var(--good)"/>${tx(x(apprPct) + 6, ya + 14, `+${f1(apprPct)}%`, `class="t-m" font-size="11.5"`)}`;
        const axis = [-20, -10, 0, 10, 20].map((v) => `<path d="M${x(v)} ${top - 8} V${H - 26}" stroke="${v === 0 ? "var(--ink)" : "var(--line)"}"/>${tx(x(v), H - 10, (v > 0 ? "+" : "") + v + "%", `class="t-m t-mu" font-size="11" text-anchor="middle"`)}`).join("");
        const body = `${axis}${tx(230, 16, "막대 = 기본값 · 가는 선 = 게임에서 흔들리는 범위", `font-size="11.5" class="t-mu"`)}${rows}${appr}`;
        return `<div class="s5-led-w">
            <div class="s5-led" id="s5-v9-led">◆ ${esc(P.ticker)} ${esc(P.company)} 물질특허 등록  ▲ ${DELTA.patent[2].toFixed(1)}%</div>
            <div class="s5-led-sub" id="s5-v9-sub">${esc(P.code)} · ${esc(T.disease)} 후보 물질이 특허 원장에 올랐습니다</div>
            <div class="s5-led-px"><span>${esc(P.ticker)} 주가</span><b id="s5-v9-px">$10.20</b><span class="up" id="s5-v9-chg">▲ +2.0%</span><span style="color:var(--night-muted);font-size:11px">시작 $10.00(예시)</span></div>
            <div class="s5-led dim" style="font-size:14px">◆ SEU 세움제약 물질특허 등록 ▲ 2.0%   ◆ MIR 미르파마 물질특허 등록 ▲ 2.0%</div></div>
          <div class="vz-row"><button type="button" class="vz-btn" id="s5-v9-play">출원 버튼 눌러 보기</button><span class="vz-note">다른 모둠의 전광판에도 똑같이 뜹니다.</span></div>
          ${CV.svg(W, H, body, "전광판 소식별 주가 변화")}`;
      },
      mount: (el) => {
        const led = el.querySelector("#s5-v9-led"), px = el.querySelector("#s5-v9-px"), chg = el.querySelector("#s5-v9-chg"), btn = el.querySelector("#s5-v9-play");
        if (!led || !btn) return;
        const full = led.textContent;
        let t1 = null, t2 = null;
        const stop = () => { clearInterval(t1); clearInterval(t2); t1 = t2 = null; };
        btn.addEventListener("click", () => {
          stop();
          if (CV.reduced()) { led.textContent = full; px.textContent = "$10.20"; chg.textContent = "▲ +2.0%"; return; }
          let k = 0; led.textContent = ""; px.textContent = "$10.00"; chg.textContent = "· 0.0%";
          t1 = setInterval(() => {
            k++; led.textContent = full.slice(0, k);
            if (k >= full.length) {
              clearInterval(t1); let p = 0;
              t2 = setInterval(() => { p++; const v = 10 + 0.02 * p; px.textContent = "$" + v.toFixed(2); chg.textContent = `▲ +${(p * 0.2).toFixed(1)}%`; if (p >= 10) clearInterval(t2); }, 70);
            }
          }, 45);
        });
        return stop;
      }
    },

    /* ── 10 선언 전 · 후 · 출원 후 비교 ── */
    {
      name: "전 · 후 비교",
      kind: "세 장면 비교표 · 단계 버튼",
      idea: "선언 전 · 선언 후 · 출원 후 세 장면에서 코드명, 분자 보호, 학급에 보이는 것, 연구비, 다음 단계가 어떻게 바뀌는지 나란히 봅니다.",
      learn: "선언은 '이름을 붙이고 못 바꾸게 묶는 것', 출원은 '돈을 내고 분자를 지키는 대신 학급에 공개하는 것'이다.",
      render: () => {
        const cols = [
          { k: "pre", h: "선언 전", lk: false, c: "--bad" },
          { k: "dec", h: "선언 후", lk: false, c: "--warn" },
          { k: "pat", h: "출원 후", lk: true, c: "--good" }
        ];
        const rows = [
          ["코드명", ["입력 중 — 바꿀 수 있음", `${P.code} — 고정`, `${P.code} — 고정`]],
          ["기전", ["입력 중", P.mech, P.mech]],
          ["분자 보호", ["없음 — 누가 먼저 내면 뺏김", "없음 — 이름만 붙음", `있음 — ${P.patentNo}`]],
          ["학급에 보이는 것", ["'선언 전'", "코드명만", "코드명 + 구조 + 표적 + 출원일"]],
          ["전광판", ["—", "—", `물질특허 등록 ▲ ${DELTA.patent[2]}%`]],
          ["연구비", [M(before), `${M(before)} (선언 무료)`, M(after)]],
          ["3.2 제형 · IND", ["잠김", "잠김", "열림"]]
        ];
        const sig = (ri, ci) => ri === 2 ? `<span class="vz-sig ${ci === 2 ? "good" : "bad"}">${ci === 2 ? "보호" : "무방비"}</span> ` : ri === 6 ? `<span class="vz-sig ${ci === 2 ? "good" : "warn"}">${ci === 2 ? "열림" : "잠김"}</span> ` : "";
        return `<div class="vz-row" role="group" aria-label="장면 고르기">${cols.map((c, i) => `<button type="button" class="vz-btn" data-c="${i}" aria-pressed="${i === 2}">${c.h}</button>`).join("")}</div>
          <div class="s5-ba"><table><thead><tr><th></th>${cols.map((c, i) => `<th class="${i === 2 ? "on" : ""}" data-col="${i}">${lock(c.lk, c.c)}${c.h}</th>`).join("")}</tr></thead>
          <tbody>${rows.map(([h, v], ri) => `<tr><th>${esc(h)}</th>${v.map((x, ci) => `<td class="${ci === 2 ? "on" : ""}" data-col="${ci}">${sig(ri, ci)}${ri === 2 || ri === 6 ? esc(x.replace(/^(있음|없음|잠김|열림)( — )?/, "")) : esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
          <p class="s5-cap" id="s5-v10-cap" aria-live="polite">출원 후: 돈 ${M(R.cost.patent)}을 내고 분자를 지켰습니다. 대신 구조가 학급 모두에게 공개됐어요.</p>`;
      },
      mount: (el) => {
        const cap = el.querySelector("#s5-v10-cap");
        const CAP = [
          "선언 전: 리드는 골랐지만 이름도 보호도 없습니다. 다른 모둠이 같은 분자를 먼저 내면 끝입니다.",
          `선언 후: ${P.code}라는 이름이 붙고 다른 모둠 서랍에 코드명이 뜹니다. 하지만 분자는 아직 지켜지지 않아요.`,
          `출원 후: 돈 ${M(R.cost.patent)}을 내고 분자를 지켰습니다. 대신 구조가 학급 모두에게 공개됐어요.`
        ];
        el.querySelectorAll("button[data-c]").forEach((b) => b.addEventListener("click", () => {
          const c = +b.dataset.c;
          el.querySelectorAll("button[data-c]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          el.querySelectorAll("[data-col]").forEach((td) => td.classList.toggle("on", +td.dataset.col === c));
          if (cap) cap.textContent = CAP[c];
        }));
      }
    }
  ];

  /* 05 타임라인 몸통(슬라이더가 다시 그린다) */
  function s5TimeBody(dev) {
    const x = CV.scale([0, 25], [30, 740]);
    const left = 20 - dev, ext = Math.max(0, Math.min(5, 14 - left)), total = left + ext;
    const y = 70, h = 38;
    const tk = Array.from({ length: 6 }, (_, i) => i * 5).map((v) => `<path d="M${x(v)} ${y + h} V${y + h + 6}" stroke="var(--ink)"/>${tx(x(v), y + h + 20, v + "년", `class="t-m" font-size="11.5" text-anchor="middle"`)}`).join("");
    const short = left < 7;
    return `<defs><pattern id="s5-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="var(--raise)"/><path d="M0 0 V7" stroke="var(--line-strong)" stroke-width="2.4"/></pattern>
      <pattern id="s5-hatch2" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="var(--good-bg)"/><path d="M0 0 V7" stroke="var(--good)" stroke-width="1.4"/></pattern></defs>
      ${tx(x(0), 26, "특허 출원(시계 시작)", `font-size="12.5" font-weight="600"`)}
      ${tx(x(20), 26, "20년 만료", `font-size="12.5" font-weight="600" text-anchor="middle"`)}
      <path d="M${x(0)} 32 V${y + h + 4} M${x(20)} 32 V${y + h + 4}" stroke="var(--ink)" stroke-dasharray="3 3"/>
      <rect x="${x(0)}" y="${y}" width="${x(dev) - x(0)}" height="${h}" fill="url(#s5-hatch)" stroke="var(--line-strong)"/>
      ${tx((x(0) + x(dev)) / 2, y + 24, `개발 · 임상 · 심사 ${dev}년`, `font-size="12.5" text-anchor="middle" font-weight="600"`)}
      <rect x="${x(dev)}" y="${y}" width="${x(20) - x(dev)}" height="${h}" fill="var(--good)"/>
      ${tx((x(dev) + x(20)) / 2, y + 24, short ? `${left}년` : `혼자 판매 ${left}년`, `font-size="12.5" text-anchor="middle" font-weight="600" style="fill:var(--paper)"`)}
      ${ext > 0 ? `<rect x="${x(20)}" y="${y}" width="${x(20 + ext) - x(20)}" height="${h}" fill="url(#s5-hatch2)" stroke="var(--good)"/>${tx((x(20) + x(20 + ext)) / 2, y + 24, `연장 ${ext}년`, `font-size="12" text-anchor="middle" style="fill:var(--good)" font-weight="600"`)}` : ""}
      <path d="M${x(dev)} ${y - 6} V${y + h + 4}" stroke="var(--ink)" stroke-width="2"/>${tx(x(dev), y - 10, "허가 · 판매 시작", `font-size="12" text-anchor="middle"`)}
      ${tk}
      <rect x="${x(0)}" y="164" width="${x(25) - x(0)}" height="40" fill="var(--surface)" stroke="var(--line)"/>
      ${tx(x(0) + 12, 182, `허가 뒤 혼자 파는 기간: 연장 없이 ${left}년 · 연장 포함 최대 ${total}년`, `font-size="13" font-weight="600"`)}
      ${tx(x(0) + 12, 198, `특허 20년 중 ${Math.round((dev / 20) * 100)}%를 개발에 썼습니다. 그 뒤엔 복제약(제네릭)이 나옵니다.`, `font-size="12" class="t-mu"`)}
      ${tx(x(0), 236, `우리 게임: D+${P.day} 출원 → D+${EX.approval.day} 허가 · ${EX.approval.day - P.day}게임 일이 특허 시계 위에서 흘러감`, `font-size="12" class="t-m"`)}
      ${tx(x(0), 256, "막대 길이는 실제 비율, 숫자는 대략값", `font-size="11" class="t-mu"`)}`;
  }
})();
