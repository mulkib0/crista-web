/* 로그인 시안 30종 — 공통 틀.
 *
 * 시안 하나 = LOGIN.add({ ... }) 한 번. fam-a.js ~ fam-e.js 가 여섯 개씩 등록한다.
 *
 *   LOGIN.add({
 *     no: 7,                       // 1~30. 갈래 A=1~6 · B=7~12 · C=13~18 · D=19~24 · E=25~30. 화면 이름은 "07"
 *     fam: 'b',                    // 'a' ~ 'e'
 *     title: '연구 노트', en: 'Lab Notebook',
 *     caption: '한 문장 설명(카드 본문).',
 *     swatch: '#f4f1e4',           // 대표 바탕색(카드의 색 칩)
 *     css: `...`,                  // 이 시안만의 CSS. 모든 선택자를 .v07 로 시작한다(.v07 .f-inp { … }).
 *                                  // 좁은 화면(휴대폰 390×844)은 @container scr (max-width: 760px) { .v07 … } 로 따로 짠다.
 *                                  // 이 규칙은 루트(.v07) 자신에는 걸리지 않는다 — 안쪽 요소(.v07 > * 등)에 준다.
 *     html: (F) => `...`,          // 화면 안 HTML. 폼은 F.form(opts) 로 넣는다(아래 '폼').
 *     mount(root, ctx) {},         // (선택) 캔버스 · 움직임을 붙인다. 정리 함수는 ctx.cleanup(fn) 으로 맡긴다.
 *   });
 *
 * 화면 루트: <div class="scr v07" data-mode="login|signup" data-msg="none|bad|lock|ok" data-busy?>  (#v07-ok 처럼 해시로 상태를 열 수 있다) — 크기가 정해진 컨테이너(container: scr / size).
 *   카드에서는 1440×900 으로 그린 뒤 줄여 보이고(입력 · 클릭 없음, ctx.live=false), 크게 보기에서는 실제 크기 또는 휴대폰 390×844 로 그린다(ctx.live=true).
 *
 * 폼 — F.form(opts) 이 만드는 칸(클래스는 모든 시안이 같다. 모양은 시안 CSS 가 정한다):
 *   form.f > .f-tabs > button.f-tab[data-tab=login|signup]      (opts.tabs === false 면 탭 없음 — [data-tab] 단추는 화면 어디에 두어도 동작한다)
 *          > .f-fields > .f-fld(.su = 가입에서만 · .li = 로그인에서만) > label.f-lab + input.f-inp (+ .f-note)
 *                        칸 이름: .f-fld-code · .f-fld-id · .f-fld-name · .f-fld-pw · .f-fld-pw2
 *          > p.f-msg[data-kind=bad|lock|ok] > b.f-msg-t + span.f-msg-d   (보일 때만 hidden 이 풀린다)
 *          > button.f-go[type=submit] > span.f-go-l(로그인 글) + span.f-go-s(가입 글)
 *          > p.f-hint.li (교사 안내) + p.f-hint.su (가입 안내)
 *   opts: { tabs, tabLabels:{login,signup}, labels:{code,id,name,pw,pw2}, ph:{...}, notes:true(칸 아래 규칙 글),
 *           go:{login,signup}(HTML 가능), hint, hintSignup, code:'cells'(학급 코드 6칸), peek:true(비밀번호 보기 단추),
 *           before:'', after:''(폼 안 앞 · 뒤에 넣을 HTML), order:['code','id','name','pw','pw2'] }
 *   동작은 core 가 맡는다: 탭 전환 · 검사(web-contract 와 같은 규칙 · 같은 문구) · 1초 뒤 결과 · 5번 틀리면 1분 잠금.
 *   미리보기 비밀번호는 crista26 — 미리 채운 값 그대로 들어가기를 누르면 성공 화면이 나온다.
 *
 * F 의 다른 도구: F.mark() 동심 호 마크 SVG · F.word() 마크+CRISTA · F.copy(문구) · F.hq(외관 1~8, 단계 1~3) 픽셀 사옥 img
 *   F.walker(role 'ceo|cso|cto|cmo', dir 'east|west|south', scale) 걷는 캐릭터 · F.street(opts) 사옥 한 줄 · F.STREET 기본 줄
 * ctx: { root, live, reduce, cleanup(fn), loop(fn(t, dt)), canvas(el) → {c, g, w, h}, ribbon(el, opts), onField(fn(name, value, root)) }
 *   loop 는 화면이 보일 때만 돈다(카드는 초당 24번). 움직임 줄이기 설정이면 t=6 에서 한 번만 그린다(크기가 바뀌면 다시).
 */
(() => {
  "use strict";
  const A = window.LOGIN_ASSETS || { hq: {}, sprite: "", facadeNames: {} };
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DESIGN_W = 1440, DESIGN_H = 900, PHONE_W = 390, PHONE_H = 844;

  const FAMILIES = [
    { key: "a", name: "박막 · 유리", en: "Thin Film & Glass", lead: "첫 화면에서 이어지는 결",
      text: "첫 화면의 박막 무지개 리본과 간섭색을 그대로 가져왔습니다. [시작하기]를 누른 뒤에도 같은 장면 안에 있는 느낌을 줍니다." },
    { key: "b", name: "실험실 기록", en: "Bench Documents", lead: "벤치 위의 서류와 도구",
      text: "연구 노트, 시약 라벨, 웰 플레이트, 배치 기록서처럼 실험실에서 실제로 쓰는 물건의 형식을 로그인 칸으로 바꿨습니다." },
    { key: "c", name: "사옥 거리", en: "HQ Street", lead: "② 사옥 지구로 이어지는 예고",
      text: "설계 §3의 픽셀 사옥 한 줄을 여섯 가지로 풀었습니다. 로그인하면 이 거리로 걸어 들어가 우리 모둠 사옥을 찾습니다." },
    { key: "d", name: "데이터 · 구조", en: "Data & Structure", lead: "신약 개발의 그림",
      text: "SMILES, 서열 정렬, 용량-반응 곡선, 질량 스펙트럼처럼 수업에서 다룰 데이터가 배경이 되고, 입력하면 함께 움직입니다." },
    { key: "e", name: "출입 · 절차", en: "Entry Rituals", lead: "회사에 들어가는 순간",
      text: "사원증, 출근 카드, 신약 노선도처럼 모둠 스타트업에 '입사한다'는 의식을 화면으로 만들었습니다." },
  ];

  /* ── 문구 · 규칙(web-contract rules.ts · server accounts.ts 와 같은 문구) ── */
  const COPY = {
    brand: "CRISTA", sub: "파이프라인 랩",
    lead: "모둠이 스타트업 제약회사가 되어 실제 계산으로 신약을 만들어요",
    teacher: "교사 계정은 따로 발급돼요. 학생은 학급 코드로 처음 가입해 주세요.",
    signupHint: "아이디와 비밀번호는 다음에 들어올 때 다시 써요. 잊지 않게 적어 두세요.",
    bad: "아이디나 비밀번호가 맞지 않아요.",
    lock: "비밀번호를 5번 틀려 1분 동안 잠겼어요.",
  };
  const DEMO = { code: "K7M3QX", id: "haneul07", name: "하늘", pw: "crista26" };
  const CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
  const rules = {
    code: (v) => (CODE_RE.test(v.trim().toUpperCase().replace(/[\s-]/g, "")) ? null : "학급 코드 6자를 확인해 주세요."),
    id: (v) => (/^[a-z0-9]{3,20}$/.test(v.trim().toLowerCase()) ? null : "아이디는 영문 소문자 · 숫자 3~20자로 써 주세요."),
    name: (v) => { const n = Array.from(v.trim().replace(/\s+/g, " ")).length; return n >= 1 && n <= 20 ? null : "이름은 1~20자로 써 주세요."; },
    pw: (v) => (Array.from(v).length >= 8 ? (new TextEncoder().encode(v).length > 72 ? "비밀번호가 너무 길어요(영문 기준 72자까지)." : null) : "비밀번호는 8자 이상이어야 해요."),
  };

  /* ── 그리기 도구 F ── */
  const MARK = `<svg class="mk" viewBox="0 0 40 40" aria-hidden="true"><path d="M31.5 7.5A15.5 15.5 0 1 0 31.5 32.5"/><path d="M27.2 12.2A10.7 10.7 0 1 0 27.2 27.8"/><path d="M22.8 16.8A6 6 0 1 0 22.8 23.2"/></svg>`;
  const svgUri = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  const HQ_URI = {};
  for (const k in A.hq) HQ_URI[k] = svgUri(A.hq[k]);
  const ROLE_ROW = { ceo: 0, cso: 1, cto: 2, cmo: 3 }, DIR_X = { east: 0, west: 4, south: 8 };
  const STREET = [[1, 2], [6, 1], [3, 3], [2, 1], [7, 2], [4, 1], [8, 3], [5, 2], [1, 1], [6, 3]];

  let uidN = 0;
  const FIELD = {
    code: { name: "classCode", lab: "학급 코드", ph: "선생님이 알려 준 6자", note: "영문 대문자 · 숫자 6자", su: true, attrs: 'autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="8"', v: DEMO.code },
    id: { name: "loginId", lab: "아이디", ph: "영문 소문자 · 숫자 3~20자", note: "영문 소문자 · 숫자 3~20자", attrs: 'autocomplete="username" autocapitalize="none" spellcheck="false"', v: DEMO.id },
    name: { name: "displayName", lab: "이름", ph: "화면에 보일 이름(별명도 돼요)", note: "1~20자 · 별명도 돼요", su: true, attrs: 'autocomplete="nickname" maxlength="20"', v: DEMO.name },
    pw: { name: "password", lab: "비밀번호", ph: "", phSu: "8자 이상", note: "8자 이상", type: "password", attrs: 'autocomplete="current-password"', v: DEMO.pw },
    pw2: { name: "confirm", lab: "비밀번호 확인", ph: "", note: "한 번 더", su: true, type: "password", attrs: 'autocomplete="new-password"', v: DEMO.pw },
  };

  function form(o = {}) {
    const u = "f" + ++uidN;
    const L = Object.assign({}, o.labels), P = Object.assign({}, o.ph);
    const order = o.order || ["code", "id", "name", "pw", "pw2"];
    const tl = Object.assign({ login: "로그인", signup: "회원가입(학생)" }, o.tabLabels);
    const go = Object.assign({ login: "들어가기", signup: "가입하고 들어가기" }, o.go);
    const tabs = o.tabs === false ? "" :
      `<div class="f-tabs" role="tablist" aria-label="로그인 또는 회원가입">
        <button type="button" class="f-tab" role="tab" data-tab="login" aria-selected="true">${tl.login}</button>
        <button type="button" class="f-tab" role="tab" data-tab="signup" aria-selected="false">${tl.signup}</button>
      </div>`;
    const fld = (k) => {
      const d = FIELD[k], id = `${u}-${k}`;
      const lab = L[k] != null ? L[k] : d.lab;
      const ph = P[k] != null ? P[k] : d.ph;
      let input = `<input id="${id}" name="${d.name}" class="f-inp f-inp-${k}" type="${d.type || "text"}" value="${esc(d.v)}" placeholder="${esc(ph)}" ${d.attrs}${d.phSu ? ` data-ph-su="${esc(P.pwSu || d.phSu)}" data-ph-li="${esc(ph)}"` : ""}>`;
      if (k === "code" && o.code === "cells") {
        input = `<span class="f-cells">${input}<span class="f-cell-row" aria-hidden="true">${"<i class=\"f-cell\"></i>".repeat(6)}</span></span>`;
      }
      if ((k === "pw") && o.peek) input = `<span class="f-peek-wrap">${input}<button type="button" class="f-peek" data-peek="${id}" aria-pressed="false">보기</button></span>`;
      return `<div class="f-fld f-fld-${k}${d.su ? " su" : ""}"><label class="f-lab" for="${id}">${lab}</label>${input}${o.notes ? `<span class="f-note">${d.note}</span>` : ""}</div>`;
    };
    return `<form class="f" novalidate data-u="${u}">${o.before || ""}${tabs}
      <div class="f-fields">${order.map(fld).join("")}</div>
      <p class="f-msg" role="alert" hidden><b class="f-msg-t"></b><span class="f-msg-d"></span></p>
      <button class="f-go" type="submit"><span class="f-go-l">${go.login}</span><span class="f-go-s">${go.signup}</span></button>
      <p class="f-hint li">${o.hint != null ? o.hint : COPY.teacher}</p>
      <p class="f-hint su">${o.hintSignup != null ? o.hintSignup : COPY.signupHint}</p>${o.after || ""}
    </form>`;
  }
  const F = {
    form, COPY, DEMO, STREET, esc,
    mark: (cls = "") => MARK.replace('class="mk"', `class="mk ${cls}"`),
    word: (cls = "") => `<span class="wm ${cls}">${MARK}<span>CRISTA</span></span>`,
    hq: (f, t, cls = "") => `<img class="hq ${cls}" src="${HQ_URI[`${f}-${t}`] || ""}" width="96" height="96" alt="" draggable="false">`,
    hqUri: (f, t) => HQ_URI[`${f}-${t}`] || "",
    facade: (f) => A.facadeNames[String(f)] || "",
    walker: (role = "ceo", dir = "east", s = 2, cls = "", style = "") =>
      `<i class="wk ${cls}" style="--row:${ROLE_ROW[role] || 0};--x0:${-(DIR_X[dir] || 0) * 32 * s}px;--s:${s};${style}" aria-hidden="true"></i>`,
    street: (o = {}) => {
      const list = o.list || STREET, size = o.size || 96;
      const walkers = (o.walkers || []).map((w, i) =>
        `<span class="st-go ${w.dir === "west" ? "w" : "e"}" style="--dur:${w.dur || 22}s;--dl:${w.delay != null ? w.delay : -i * 7}s;--by:${w.y != null ? w.y : 2}px">${F.walker(w.role, w.dir || "east", w.s || 2)}</span>`).join("");
      return `<div class="st ${o.cls || ""}" style="--hq:${size}px" aria-hidden="true"><div class="st-row">${list.map(([f, t]) => F.hq(f, t)).join("")}</div>${walkers}</div>`;
    },
  };

  /* ── 등록 ── */
  const VARIANTS = [];
  const LOGIN = window.LOGIN = { add(v) { v.code = pad(v.no); v.cls = "v" + v.code; VARIANTS.push(v); }, F, FAMILIES, VARIANTS };

  /* ── 화면 하나 만들기 ── */
  const loops = new Set();
  function createScreen(v, opt) {
    const root = document.createElement("div");
    root.className = `scr ${v.cls}`;
    root.dataset.mode = "login";
    root.dataset.msg = "none";
    if (!opt.live) { root.setAttribute("inert", ""); root.setAttribute("aria-hidden", "true"); }
    const cleanups = [];
    let html = "";
    try { html = v.html(F); } catch (e) { console.error(v.code, e); html = `<p style="padding:40px">시안 ${v.code} 그리기 실패: ${esc(e.message)}</p>`; }
    root.innerHTML = html;
    const fieldFns = [];
    const ctx = {
      root, live: !!opt.live, reduce, k: opt.k || 0.25,
      cleanup: (fn) => cleanups.push(fn),
      loop: (fn) => { const L = { fn, root, t: 0, drawn: false }; loops.add(L); cleanups.push(() => loops.delete(L)); },
      canvas: (el) => makeCanvas(el, ctx),
      ribbon: (el, o = {}) => {
        if (!window.RIBBON) return;
        if (ctx.live) cleanups.push(window.RIBBON.mount(el, Object.assign({ pointerEl: root }, o)));
        else {
          const w = el.clientWidth || DESIGN_W, h = el.clientHeight || DESIGN_H;
          const url = window.RIBBON.snapshot(o, w, h);
          if (url) { const img = new Image(); img.className = "rb-snap"; img.alt = ""; img.src = url; el.prepend(img); }
        }
      },
      onField: (fn) => fieldFns.push(fn),
    };
    root._ctx = ctx;
    root._fieldFns = fieldFns;
    root._destroy = () => { cleanups.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); clearInterval(root._lockT); };
    root._mount = () => {
      if (v.mount) { try { v.mount(root, ctx); } catch (e) { console.error(v.code, e); } }
      syncCells(root);
    };
    if (opt.live) wireForm(root);
    return root;
  }

  function makeCanvas(el, ctx) {
    const c = document.createElement("canvas");
    c.className = "cv";
    c.setAttribute("aria-hidden", "true");
    el.appendChild(c);
    const s = { c, g: c.getContext("2d"), w: 0, h: 0, r: 1 };
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      const dpr = devicePixelRatio || 1;
      const r = ctx.live ? Math.min(dpr, 2) : Math.min(1, Math.max(0.3, ctx.k * dpr * 1.25));
      c.width = Math.round(w * r); c.height = Math.round(h * r);
      s.g.setTransform(r, 0, 0, r, 0, 0);
      s.w = w; s.h = h; s.r = r;
      ctx.root._dirty = true;
      // 크기를 바꾸면 캔버스가 지워진다 — 다음 프레임을 기다리지 않고 바로 다시 그려 빈 화면이 보이지 않게 한다
      for (const L of loops) if (L.root === ctx.root && L.drawn) { try { L.fn(reduce ? 6 : L.t, 0); } catch (e) { console.error(e); } }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    ctx.cleanup(() => ro.disconnect());
    return s;
  }

  /* 화면이 보일 때만 그린다. 카드는 초당 24번, 크게 보기는 매 프레임 */
  let lastNow = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    if (document.hidden) return;
    for (const L of loops) {
      const r = L.root;
      if (!r._vis) continue;
      const ctx = r._ctx;
      if (reduce) {
        if (!L.drawn || r._dirty) { L.fn(6, 0); L.drawn = true; }
        continue;
      }
      if (!ctx.live) {
        L.acc = (L.acc || 0) + dt;
        if (L.acc < 1 / 24 && L.drawn && !r._dirty) continue;
        L.t += L.acc; L.fn(L.t, L.acc); L.acc = 0; L.drawn = true;
      } else { L.t += dt; L.fn(L.t, dt); L.drawn = true; }
    }
    for (const L of loops) L.root._dirty = false;
  }
  requestAnimationFrame(tick);
  if (document.fonts) document.fonts.ready.then(() => { for (const L of loops) L.root._dirty = true; });

  /* ── 폼 동작 ── */
  function syncCells(root) {
    root.querySelectorAll(".f-cells").forEach((w) => {
      const inp = w.querySelector("input"), cells = w.querySelectorAll(".f-cell");
      const val = inp.value.toUpperCase().replace(/[\s-]/g, "");
      cells.forEach((c, i) => { c.textContent = val[i] || ""; c.classList.toggle("on", document.activeElement === inp && i === Math.min(val.length, 5)); });
    });
  }
  function setMode(root, mode) {
    root.dataset.mode = mode;
    root.querySelectorAll("[data-tab]").forEach((b) => {
      const on = b.dataset.tab === mode;
      if (b.getAttribute("role") === "tab") b.setAttribute("aria-selected", String(on)); else b.setAttribute("aria-pressed", String(on));
    });
    root.querySelectorAll("[data-ph-su]").forEach((i) => (i.placeholder = mode === "signup" ? i.dataset.phSu : i.dataset.phLi));
    root.querySelectorAll(".f-inp-pw").forEach((i) => (i.autocomplete = mode === "signup" ? "new-password" : "current-password"));
    setMsg(root, null);
  }
  function setMsg(root, kind, title = "", detail = "") {
    root.dataset.msg = kind || "none";
    root.querySelectorAll(".f-msg").forEach((m) => {
      m.hidden = !kind;
      if (kind) m.dataset.kind = kind; else delete m.dataset.kind;
      m.querySelector(".f-msg-t").textContent = title;
      m.querySelector(".f-msg-d").textContent = detail;
    });
    root.querySelectorAll(".f-go").forEach((b) => (b.disabled = kind === "lock" || root.dataset.busy === "1"));
  }
  function lockFor(root, sec) {
    clearInterval(root._lockT);
    let left = sec;
    const show = () => setMsg(root, "lock", COPY.lock, `0:${pad(left)} 뒤 다시 해 볼 수 있어요.`);
    show();
    root._lockT = setInterval(() => {
      left -= 1;
      if (left <= 0) { clearInterval(root._lockT); root._fails = 0; setMsg(root, null); return; }
      show();
    }, 1000);
  }
  function val(root, k) { const i = root.querySelector(`.f-inp-${k}`); return i ? i.value : ""; }
  function wireForm(root) {
    root._fails = 0;
    root.addEventListener("click", (e) => {
      const t = e.target.closest("[data-tab]");
      if (t && root.contains(t)) { e.preventDefault(); if (root.dataset.msg === "lock" && t.dataset.tab === "login") return; clearInterval(root._lockT); setMode(root, t.dataset.tab); return; }
      const p = e.target.closest("[data-peek]");
      if (p) {
        const inp = root.querySelector("#" + p.dataset.peek);
        const show = inp.type === "password";
        inp.type = show ? "text" : "password";
        p.setAttribute("aria-pressed", String(show));
        p.textContent = show ? "숨기기" : "보기";
      }
    });
    root.addEventListener("input", (e) => {
      const i = e.target.closest(".f-inp");
      if (!i) return;
      if (i.classList.contains("f-inp-code")) {
        const up = i.value.toUpperCase();
        if (up !== i.value) { const p = i.selectionStart; i.value = up; i.setSelectionRange(p, p); }
      }
      syncCells(root);
      const k = (i.className.match(/f-inp-(\w+)/) || [])[1];
      root._fieldFns.forEach((fn) => fn(k, i.value, root));
      if (root.dataset.msg === "bad") setMsg(root, null);
    });
    root.addEventListener("focusin", () => syncCells(root));
    root.addEventListener("focusout", () => setTimeout(() => syncCells(root), 0));
    root.addEventListener("submit", (e) => {
      e.preventDefault();
      if (root.dataset.busy === "1" || root.dataset.msg === "lock") return;
      const mode = root.dataset.mode;
      let err = null;
      if (mode === "signup") {
        err = rules.code(val(root, "code")) || rules.id(val(root, "id")) || rules.name(val(root, "name")) || rules.pw(val(root, "pw"));
        if (!err && val(root, "pw") !== val(root, "pw2")) err = "비밀번호 확인이 맞지 않아요.";
      } else if (!val(root, "id") || !val(root, "pw")) err = "아이디와 비밀번호를 써 주세요.";
      if (err) return setMsg(root, "bad", err, mode === "signup" ? "고친 뒤 다시 눌러 주세요." : "");
      root.dataset.busy = "1";
      setMsg(root, null);
      root.querySelectorAll(".f-go").forEach((b) => b.classList.add("busy"));
      setTimeout(() => {
        delete root.dataset.busy;
        root.querySelectorAll(".f-go").forEach((b) => b.classList.remove("busy"));
        const name = val(root, "name").trim() || DEMO.name;
        if (mode === "signup") return setMsg(root, "ok", `${name}님, 가입했어요.`, "사옥 지구로 갑니다. 우리 모둠 사옥을 찾아 걸어가 보세요.");
        if (val(root, "pw") === DEMO.pw && !rules.id(val(root, "id"))) return setMsg(root, "ok", `${DEMO.name}님, 다시 왔네요.`, "사옥 지구로 갑니다.");
        root._fails += 1;
        if (root._fails >= 5) return lockFor(root, 60);
        setMsg(root, "bad", COPY.bad, `${5 - root._fails}번 더 틀리면 1분 동안 잠겨요.`);
      }, 900);
    });
  }
  /* 미리보기 도구의 상태 단추 */
  function applyState(root, st) {
    clearInterval(root._lockT);
    delete root.dataset.busy;
    root.querySelectorAll(".f-inp").forEach((i) => { const k = (i.className.match(/f-inp-(\w+)/) || [])[1]; if (FIELD[k]) i.value = FIELD[k].v; if (i.type === "text" && (k === "pw" || k === "pw2")) i.type = "password"; });
    root.querySelectorAll("[data-peek]").forEach((p) => { p.textContent = "보기"; p.setAttribute("aria-pressed", "false"); });
    setMode(root, st === "signup" ? "signup" : "login");
    root._fails = 0;
    if (st === "bad") { root._fails = 1; setMsg(root, "bad", COPY.bad, "4번 더 틀리면 1분 동안 잠겨요."); }
    if (st === "lock") { root._fails = 5; lockFor(root, 59); }
    if (st === "ok") setMsg(root, "ok", `${DEMO.name}님, 다시 왔네요.`, "사옥 지구로 갑니다.");
    syncCells(root);
    root._fieldFns.forEach((fn) => fn("reset", "", root));
  }

  /* ── 시안판 ── */
  function boot() {
    VARIANTS.sort((a, b) => a.no - b.no);
    const style = document.createElement("style");
    style.textContent = VARIANTS.map((v) => `/* ${v.code} ${v.title} */\n${v.css || ""}`).join("\n");
    document.body.appendChild(style); // 공통 규칙(.scr …)보다 뒤에 와야 같은 세기의 시안 규칙이 이긴다 — 게시본은 페이지 전체가 body 안에 들어간다
    $("count").textContent = VARIANTS.length;

    const io = new IntersectionObserver((ents) => {
      for (const e of ents) {
        const scr = e.target.querySelector(".scr");
        if (!scr) continue;
        scr._vis = e.isIntersecting;
        scr.classList.toggle("run", e.isIntersecting);
        if (e.isIntersecting && !scr._mounted) { scr._mounted = true; scr._mount(); }
      }
    }, { rootMargin: "200px 0px" });
    const ro = new ResizeObserver((ents) => {
      for (const e of ents) {
        const k = e.contentRect.width / DESIGN_W;
        e.target.style.setProperty("--k", k);
        const scr = e.target.querySelector(".scr");
        if (scr) scr._ctx.k = k;
      }
    });

    const host = $("fams");
    FAMILIES.forEach((f) => {
      const list = VARIANTS.filter((v) => v.fam === f.key);
      if (!list.length) return;
      const sec = document.createElement("section");
      sec.className = "bd-fam bd-wrap";
      sec.id = "fam-" + f.key;
      sec.setAttribute("aria-labelledby", "fam-h-" + f.key);
      sec.innerHTML = `<div class="bd-fam-head"><h2 id="fam-h-${f.key}"><small>${f.key.toUpperCase()} · ${list[0].code}–${list[list.length - 1].code} · ${f.en}</small>${f.name}<span>${f.lead}</span></h2><p>${f.text}</p></div><div class="bd-grid"></div>`;
      const grid = sec.querySelector(".bd-grid");
      for (const v of list) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "bd-card";
        card.id = "card-" + v.code;
        card.setAttribute("aria-label", `${v.code} ${v.title} 크게 보기`);
        card.innerHTML = `<div class="bd-view"></div>
          <div class="bd-card-body">
            <div class="bd-card-top"><span class="bd-num">${v.code}</span><span class="bd-sw"><i style="background:${v.swatch || "#f1f1e9"}"></i>${esc(v.en)}</span><span class="bd-open">크게 보기 ↗</span></div>
            <h3>${esc(v.title)}</h3>
            <p>${esc(v.caption || "")}</p>
          </div>`;
        const view = card.querySelector(".bd-view");
        const scr = createScreen(v, { live: false, k: 0.25 });
        scr.style.width = DESIGN_W + "px";
        scr.style.height = DESIGN_H + "px";
        view.appendChild(scr);
        card.addEventListener("click", () => open(v.code));
        grid.appendChild(card);
        ro.observe(view);
        io.observe(view);
      }
      host.appendChild(sec);
    });
    wirePreview();
    readHash();
    addEventListener("hashchange", readHash);
  }

  /* ── 크게 보기 ── */
  let cur = null, curScr = null, device = "desk", state = "login", lastFocus = null;
  try { device = localStorage.getItem("crista-login30-device") === "phone" ? "phone" : "desk"; } catch (e) {}
  const STATES = ["login", "signup", "bad", "lock", "ok"];
  function wirePreview() {
    $("pv-close").addEventListener("click", close);
    $("pv-prev").addEventListener("click", () => step(-1));
    $("pv-next").addEventListener("click", () => step(1));
    document.querySelectorAll("[data-st]").forEach((b) => b.addEventListener("click", () => setState(b.dataset.st)));
    document.querySelectorAll("[data-dev]").forEach((b) => b.addEventListener("click", () => setDevice(b.dataset.dev)));
    document.addEventListener("keydown", (e) => {
      if ($("pv").hidden) return;
      const typing = e.target.closest && e.target.closest("input, textarea, select");
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (typing) return;
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (/^[1-5]$/.test(e.key)) setState(STATES[+e.key - 1]);
      else if (e.key === "p" || e.key === "P") setDevice(device === "phone" ? "desk" : "phone");
      else if (e.key === "Tab") {
        const f = [...$("pv").querySelectorAll("button:not([disabled]), input:not([disabled]), a[href]")].filter((x) => x.offsetParent !== null);
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    new ResizeObserver(fitStage).observe($("pv-stage"));
  }
  function fitStage() {
    if (!curScr) return;
    const st = $("pv-stage"), frame = $("pv-frame");
    if (device === "phone") {
      const k = Math.min(1, (st.clientHeight - 40) / PHONE_H, (st.clientWidth - 32) / PHONE_W);
      frame.className = "pv-frame phone";
      frame.style.width = PHONE_W + "px"; frame.style.height = PHONE_H + "px";
      frame.style.transform = `scale(${k})`;
    } else {
      frame.className = "pv-frame desk";
      frame.style.width = ""; frame.style.height = ""; frame.style.transform = "";
    }
  }
  function show(code) {
    const v = VARIANTS.find((x) => x.code === code);
    if (!v) return;
    if (curScr) { curScr._destroy(); curScr.remove(); }
    cur = v;
    const frame = $("pv-frame");
    curScr = createScreen(v, { live: true });
    curScr._vis = true;
    curScr.classList.add("run");
    frame.appendChild(curScr);
    fitStage();
    curScr._mount();
    applyState(curScr, state);
    $("pv-num").textContent = v.code;
    $("pv-title").textContent = v.title;
    $("pv-en").textContent = v.en;
    $("pv-fam").textContent = FAMILIES.find((f) => f.key === v.fam).name;
    try { history.replaceState(null, "", "#v" + v.code); } catch (e) {}
  }
  function step(d) {
    const i = VARIANTS.indexOf(cur);
    show(VARIANTS[(i + d + VARIANTS.length) % VARIANTS.length].code);
  }
  function setState(st) {
    state = st;
    document.querySelectorAll("[data-st]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.st === st)));
    if (curScr) applyState(curScr, st);
  }
  function setDevice(d) {
    device = d;
    try { localStorage.setItem("crista-login30-device", d); } catch (e) {}
    document.querySelectorAll("[data-dev]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.dev === d)));
    fitStage();
  }
  function open(code, st) {
    lastFocus = document.activeElement;
    $("pv").hidden = false;
    document.body.classList.add("locked");
    setDevice(device);
    state = st || "login";
    document.querySelectorAll("[data-st]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.st === state)));
    show(code);
    $("pv-close").focus({ preventScroll: true });
  }
  function close() {
    $("pv").hidden = true;
    document.body.classList.remove("locked");
    if (curScr) { curScr._destroy(); curScr.remove(); curScr = null; }
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    const c = cur && $("card-" + cur.code);
    (c || lastFocus)?.focus?.({ preventScroll: false });
  }
  /* #v07 · #v07-signup · #v07-phone · #v07-phone-lock 처럼 연다 */
  function readHash() {
    const h = location.hash.slice(1);
    const m = /^v(\d{2})((?:-(?:phone|desk|login|signup|bad|lock|ok))*)$/.exec(h);
    if (!m) { if (/^fam-[a-e]$/.test(h)) $(h)?.scrollIntoView(); return; }
    const parts = m[2].split("-").filter(Boolean);
    if (parts.includes("phone")) device = "phone"; else if (parts.includes("desk")) device = "desk";
    const st = parts.find((p) => STATES.includes(p));
    if (curScr && cur && cur.code === m[1]) { if (st) setState(st); setDevice(device); return; }
    open(m[1], st);
  }

  LOGIN.boot = boot;
})();
