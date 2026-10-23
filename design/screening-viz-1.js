/* 시안 01–10 — 화합물 스크리닝 그림. 공통 뼈대(screening-30-variants.html)의 SV.add 로 등록한다. */
(() => {
  "use strict";

  /* ── 이 파일의 공통 도우미 ── */
  const NUM = "①②③④⑤⑥";
  const gLabel = (ctx, k, narrow) => (k ? NUM[k - 1] + " " + (narrow ? ctx.GATES[k - 1].short : ctx.GATES[k - 1].name) : "시작");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeIn = (t) => t * t;
  const FONT = "'IBM Plex Sans KR', -apple-system, sans-serif", MONO = "'IBM Plex Mono', monospace";
  /* 단계 s 에서 분자 하나를 칠할 색 번호: 0 = 아직 남음(fg) */
  const shown = (c, s) => (c.f === 1 ? 1 : c.f <= s ? c.f : s >= 6 && c.f === 7 ? 7 : 0);
  const fillVar = (f) => (f ? `var(--f${f})` : "var(--fg)");
  const hitAttr = (f) => (f === 7 ? ' stroke="var(--hit-ring)" stroke-width="1"' : "");
  /* 바닥에서 위로 쌓는 더미 — n 개, cols 열, 가운데 cx, 바닥 y */
  function pileXY(i, n, cols, cx, baseY, gap) {
    const row = Math.floor(i / cols), m = Math.min(cols, n - row * cols);
    return { x: cx - (m * gap) / 2 + (i % cols) * gap + gap / 2, y: baseY - row * gap - gap / 2 };
  }
  /* 캔버스 위 가장 가까운 분자를 툴팁으로 */
  function hoverCanvas(cv, ctx, getPts, max = 9) {
    const mv = (e) => {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bd = max * max;
      for (const p of getPts()) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p.c; } }
      if (best) ctx.tip(e, best); else ctx.hideTip();
    };
    cv.addEventListener("pointermove", mv);
    cv.addEventListener("pointerleave", () => ctx.hideTip());
  }
  /* prevStep → step 으로 앞으로 갈 때만 움직인다. frame(t) 를 0→1 로 부르고 정리 함수를 돌려준다 */
  function run(ctx, dur, frame) {
    let raf = 0, alive = true;
    const forward = ctx.step > ctx.prevStep && !ctx.reduced;
    if (!forward) {
      frame(1);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alive && frame(1));
      return () => { alive = false; };
    }
    const t0 = performance.now();
    const tick = (now) => {
      if (!alive) return;
      const t = clamp((now - t0) / dur, 0, 1);
      frame(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    frame(0);
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }
  function dot(g, x, y, r, fill, ring) {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
    if (ring) { g.lineWidth = 1; g.strokeStyle = ring; g.stroke(); }
  }
  const shortName = (c, n = 16) => { const s = c.n.replace(/\s*\(.*\)\s*$/, ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

  /* 01 체 거르기 — 체 다섯 겹. 걸린 알갱이는 그 체 위에 남고, 끝까지 내려온 알갱이만 비커에. */
  SV.add({
    id: "01",
    stepMs: 1500,
    line: "알갱이 하나가 분자 하나예요. 위에서 쏟아진 알갱이가 체를 지날 때마다 걸러지고, 맨 아래 비커까지 내려온 라임색 알갱이만 도킹실로 갑니다.",
    render(el, ctx) {
      const { X, REM, DROP, PAL } = ctx;
      const W = el.clientWidth || 800, narrow = W < 640, H = 560;
      const { cv, g } = ctx.canvas(el, H);
      const labW = narrow ? 86 : 156, x0 = labW + 6, x1 = W - 12, cxm = (x0 + x1) / 2;
      const gap = narrow ? 6 : 7.5, r = gap * 0.4;
      const cols = Math.max(8, Math.floor((x1 - x0 - 16) / gap));
      const hopY = 14, hopH = 70, beakH = 78, beakY = H - beakH - 14;
      const sTop = hopY + hopH + 64, sGap = (beakY - 34 - sTop) / 4;
      const sieveY = (k) => sTop + (k - 2) * sGap;
      const beakW = Math.min(260, x1 - x0), beakCols = Math.floor((beakW - 14) / gap);
      /* 단계 s 에서 각 알갱이 자리 */
      function layout(s) {
        const groups = new Map(), put = (k, c) => { if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); };
        for (const c of X) {
          if (c.f === 1) put("hop", c);
          else if (c.f <= s) put("s" + c.f, c);
          else if (s >= 6) put("beak", c);
          else if (s <= 1) put("hop", c);
          else put("s" + (s + 1), c);
        }
        const pos = new Map();
        for (const [k, list] of groups) {
          list.forEach((c, i) => {
            let p;
            if (k === "hop") p = pileXY(i, list.length, cols, cxm, hopY + hopH - 4, gap);
            else if (k === "beak") p = pileXY(i, list.length, beakCols, cxm, beakY + beakH - 5, gap);
            else p = pileXY(i, list.length, cols, cxm, sieveY(+k.slice(1)) - 2, gap);
            pos.set(c.id, p);
          });
        }
        return pos;
      }
      const A = layout(ctx.prevStep), B = layout(ctx.step);
      const rng = ctx.rng(11), delay = new Map(X.map((c) => [c.id, rng() * 0.35]));
      let cur = [];
      function scene() {
        g.clearRect(0, 0, W, H);
        g.textBaseline = "middle";
        /* 상자(호퍼) */
        g.strokeStyle = PAL.lineStrong; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x0, hopY); g.lineTo(x0, hopY + hopH); g.lineTo(cxm - 26, hopY + hopH + 22); g.lineTo(cxm + 26, hopY + hopH + 22); g.lineTo(x1, hopY + hopH); g.lineTo(x1, hopY); g.stroke();
        g.fillStyle = PAL.fg; g.font = `600 12px ${FONT}`; g.fillText(narrow ? "① 상자" : "① 라이브러리", 0, hopY + 14);
        g.fillStyle = PAL.muted; g.font = `11px ${MONO}`; g.fillText(`${REM[1]}개 출발`, 0, hopY + 31);
        /* 체 ②~⑥ — 뒤로 갈수록 구멍이 촘촘 */
        for (let k = 2; k <= 6; k++) {
          const y = sieveY(k), on = k <= ctx.step;
          g.globalAlpha = on ? 1 : 0.28;
          const hole = 8 - k, seg = 6;
          g.fillStyle = PAL.f[k];
          for (let x = x0; x < x1; x += seg + hole) g.fillRect(x, y, Math.min(seg, x1 - x), 3);
          g.fillRect(x0 - 2, y - 6, 2, 12); g.fillRect(x1, y - 6, 2, 12);
          g.fillStyle = PAL.fg; g.font = `600 12px ${FONT}`; g.fillText(gLabel(ctx, k, narrow), 0, y - 10);
          g.fillStyle = PAL.muted; g.font = `11px ${MONO}`; g.fillText(narrow ? `${REM[k]} · −${DROP[k]}` : `${REM[k]}개 통과 · −${DROP[k]}`, 0, y + 7);
          g.globalAlpha = 1;
        }
        /* 비커 */
        const bx = cxm - beakW / 2, done = ctx.step >= 6;
        g.globalAlpha = done ? 1 : 0.35;
        g.strokeStyle = PAL.fg; g.lineWidth = 2;
        g.beginPath(); g.moveTo(bx - 6, beakY); g.lineTo(bx, beakY + 4); g.lineTo(bx, beakY + beakH); g.lineTo(bx + beakW, beakY + beakH); g.lineTo(bx + beakW, beakY + 4); g.lineTo(bx + beakW + 6, beakY); g.stroke();
        g.fillStyle = PAL.fg; g.font = `600 12px ${FONT}`; g.fillText("도킹실 비커", 0, beakY + 24);
        g.fillStyle = PAL.muted; g.font = `11px ${MONO}`; g.fillText(`선정 ${DROP[7]}개`, 0, beakY + 41);
        g.globalAlpha = 1;
      }
      const stop = run(ctx, 1200, (t) => {
        scene();
        cur = [];
        for (const c of X) {
          const a = A.get(c.id), b = B.get(c.id);
          const lt = clamp((t - delay.get(c.id)) / 0.65, 0, 1);
          const x = lerp(a.x, b.x, easeIO(lt)), y = lerp(a.y, b.y, b.y > a.y ? easeIn(lt) : easeIO(lt));
          const f = shown(c, lt > 0.6 ? ctx.step : ctx.prevStep);
          dot(g, x, y, f === 7 ? r + 0.8 : r, f ? PAL.f[f] : PAL.fg, f === 7 ? PAL.hitRing : null);
          cur.push({ x, y, c });
        }
      });
      hoverCanvas(cv, ctx, () => cur, gap);
      return stop;
    }
  });

  /* 02 점 깔때기 — 관문마다 한 줄. 가운데는 남은 분자, 오른쪽은 그 관문에서 흘러나간 분자. */
  SV.add({
    id: "02",
    line: "관문을 하나 지날 때마다 가운데 점 무더기가 줄어들고, 걸린 점은 오른쪽으로 흘러나갑니다. 점 하나가 분자 하나예요.",
    render(el, ctx) {
      const { X, REM, DROP, GATES, step } = ctx;
      const W = Math.max(320, el.clientWidth), narrow = W < 640;
      const labW = narrow ? 92 : 150, dropW = narrow ? 70 : 170;
      const midW = W - labW - dropW - 24;
      const rowsPer = 3, gap = Math.max(4.2, Math.min(8, midW / Math.ceil(220 / rowsPer)));
      const r = Math.max(1.5, gap * 0.38), bandH = rowsPer * gap + 22;
      const H = 7 * bandH + 16;
      const cx = labW + midW / 2;
      const order = [...X].sort((a, b) => b.f - a.f || b.score - a.score);
      let out = "";
      for (let k = 0; k <= 6; k++) {
        const y0 = 10 + k * bandH, on = k <= step;
        const g = GATES[k - 1];
        const alive = order.filter((c) => c.f > k);
        const cols = Math.ceil(alive.length / rowsPer) || 1;
        const bw = cols * gap;
        out += `<g opacity="${on ? 1 : 0.14}">`;
        /* 깔때기 벽 — 이 줄의 폭 */
        out += `<rect x="${cx - bw / 2 - 6}" y="${y0 - 3}" width="${bw + 12}" height="${rowsPer * gap + 6}" fill="none" stroke="var(--line-strong)" />`;
        out += `<text x="0" y="${y0 + 8}" font-size="12" font-weight="600">${k ? "①②③④⑤⑥"[k - 1] + " " + (narrow ? g.short : g.name) : "시작"}</text>`;
        out += `<text x="0" y="${y0 + 24}" font-size="12" class="t-mono t-muted">${REM[k]}개 남음</text>`;
        alive.forEach((c, i) => {
          const col = Math.floor(i / rowsPer), row = i % rowsPer;
          const x = cx - bw / 2 + col * gap + gap / 2, y = y0 + row * gap + gap / 2;
          const hit = k === 6 && c.f === 7;
          out += `<circle data-cid="${c.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${hit ? "var(--f7)" : "var(--fg)"}" ${hit ? 'stroke="var(--hit-ring)" stroke-width="1"' : ""}/>`;
        });
        /* 흘러나간 분자 */
        if (k > 0 && DROP[k]) {
          const dx = W - dropW + 6, drops = X.filter((c) => c.f === k);
          const dcols = Math.max(1, Math.floor((dropW - 50) / gap));
          drops.slice(0, dcols * rowsPer).forEach((c, i) => {
            const x = dx + (i % dcols) * gap + gap / 2, y = y0 + Math.floor(i / dcols) * gap + gap / 2;
            out += `<circle data-cid="${c.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="var(--f${k})" />`;
          });
          out += `<path d="M${cx + bw / 2 + 8} ${y0 + rowsPer * gap / 2} L${dx - 6} ${y0 + rowsPer * gap / 2}" stroke="var(--f${k})" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>`;
          out += `<text x="${W - 4}" y="${y0 + rowsPer * gap + 14}" text-anchor="end" font-size="11.5" class="t-mono t-muted">−${DROP[k]}${DROP[k] > dcols * rowsPer ? " (일부만)" : ""}</text>`;
        }
        out += `</g>`;
      }
      el.innerHTML = ctx.svg(W, H, out);
    }
  });

  /* 03 과녁 — 바깥 고리에서 떨어질수록 일찍 탈락, 한가운데가 선정. 고리 넓이 ∝ 분자 수. */
  SV.add({
    id: "03",
    line: "과녁 바깥 고리일수록 일찍 떨어진 분자예요. 관문을 하나씩 더 통과할수록 안쪽으로 들어오고, 한가운데 라임색 점이 도킹실로 가는 후보입니다.",
    render(el, ctx) {
      const { X, DROP, step } = ctx;
      const W = el.clientWidth || 800, narrow = W < 640;
      const rings = [7, 6, 5, 4, 3, 2].concat(DROP[1] ? [1] : []); // 안 → 밖
      const S = narrow ? W - 16 : Math.min(500, W * 0.58);
      const R = S / 2 - 6, cx = narrow ? W / 2 : S / 2 + 8, cy = S / 2 + 8;
      const wts = rings.map((f) => DROP[f] + 3), sumW = wts.reduce((a, b) => a + b, 0), A = (R * R) / sumW;
      let acc = 0;
      const rad = rings.map((f, i) => { const ri = Math.sqrt(acc * A); acc += wts[i]; return { f, ri, ro: Math.sqrt(acc * A) }; });
      const rd = clamp(Math.sqrt(Math.PI * A) * 0.36, 1.8, 4.6);
      const GA = Math.PI * (3 - Math.sqrt(5));
      let out = "";
      /* 고리 바탕(바깥부터) */
      for (const q of [...rad].reverse()) {
        const on = q.f === 7 ? step >= 6 : q.f <= step;
        const ann = (ro, ri) => `M${cx - ro} ${cy}a${ro} ${ro} 0 1 0 ${2 * ro} 0a${ro} ${ro} 0 1 0 ${-2 * ro} 0Z` + (ri > 0 ? `M${cx - ri} ${cy}a${ri} ${ri} 0 1 0 ${2 * ri} 0a${ri} ${ri} 0 1 0 ${-2 * ri} 0Z` : "");
        out += `<path d="${ann(q.ro, q.ri)}" fill-rule="evenodd" fill="var(--f${q.f})" fill-opacity="${on ? (q.f === 7 ? 0.28 : 0.1) : 0.03}" stroke="var(--line-strong)" stroke-width="1"/>`;
      }
      /* 점 — 고리 안에 해바라기 나선으로 고르게 */
      for (const q of rad) {
        const list = X.filter((c) => c.f === q.f).sort((a, b) => b.score - a.score);
        const on = q.f === 7 ? step >= 6 : q.f <= step;
        list.forEach((c, i) => {
          const rr = Math.sqrt(q.ri * q.ri + ((i + 0.5) / list.length) * (q.ro * q.ro - q.ri * q.ri));
          const th = i * GA + q.f * 1.3;
          const x = cx + rr * Math.cos(th), y = cy + rr * Math.sin(th);
          out += on
            ? `<circle data-cid="${c.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${q.f === 7 ? rd + 1.2 : rd}" fill="var(--f${q.f})"${hitAttr(q.f)}/>`
            : `<circle data-cid="${c.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rd}" fill="var(--fg)" fill-opacity="0.55"/>`;
        });
      }
      /* 이름표 */
      const hits = X.filter((c) => c.f === 7).sort((a, b) => a.rank - b.rank);
      const entries = [...rad].reverse().filter((q) => q.f !== 7);
      let H = S + 16;
      if (!narrow) {
        const lx = S + 46, rowH = 40, y0 = Math.max(24, cy - R * 0.8);
        entries.forEach((q, i) => {
          const on = q.f <= step, ly = y0 + i * rowH, th = -Math.PI / 4.2, rm = (q.ri + q.ro) / 2;
          const px = cx + rm * Math.cos(th), py = cy + rm * Math.sin(th);
          out += `<g opacity="${on ? 1 : 0.35}"><path d="M${px.toFixed(1)} ${py.toFixed(1)} L${(lx - 26).toFixed(1)} ${ly - 4} L${lx - 8} ${ly - 4}" fill="none" stroke="var(--line-strong)"/>
            <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.5" fill="var(--fg)"/>
            <rect x="${lx}" y="${ly - 10}" width="10" height="10" fill="var(--f${q.f})"/>
            <text x="${lx + 16}" y="${ly}" font-size="13" font-weight="600">${gLabel(ctx, q.f)}</text>
            <text x="${lx + 16}" y="${ly + 16}" font-size="11.5" class="t-mono t-muted">${q.f === 6 ? "순위 밖 대기" : "탈락"} ${DROP[q.f]}개</text></g>`;
        });
        const hy = y0 + entries.length * rowH + 10;
        out += `<g opacity="${step >= 6 ? 1 : 0.35}"><rect x="${lx}" y="${hy - 10}" width="10" height="10" fill="var(--f7)" stroke="var(--hit-ring)"/>
          <text x="${lx + 16}" y="${hy}" font-size="13" font-weight="600">◎ 한가운데 · 선정 ${DROP[7]}개</text>
          ${hits.slice(0, 6).map((c, i) => `<text data-cid="${c.id}" x="${lx + 16}" y="${hy + 19 + i * 17}" font-size="12">${i + 1}. ${ctx.esc(shortName(c, 22))}</text>`).join("")}
          ${hits.length > 6 ? `<text x="${lx + 16}" y="${hy + 19 + 6 * 17}" font-size="11.5" class="t-muted">외 ${hits.length - 6}개</text>` : ""}</g>`;
        H = Math.max(H, hy + 19 + 7 * 17);
      } else {
        let y = S + 30;
        entries.concat(rad.filter((q) => q.f === 7)).forEach((q) => {
          const on = q.f === 7 ? step >= 6 : q.f <= step;
          out += `<g opacity="${on ? 1 : 0.35}"><rect x="8" y="${y - 10}" width="10" height="10" fill="var(--f${q.f})"${hitAttr(q.f)}/>
            <text x="26" y="${y}" font-size="12.5" font-weight="600">${q.f === 7 ? "◎ 한가운데 · 선정" : gLabel(ctx, q.f, true)}</text>
            <text x="${W - 8}" y="${y}" text-anchor="end" font-size="12" class="t-mono t-muted">${DROP[q.f]}개</text></g>`;
          y += 22;
        });
        H = y;
      }
      el.innerHTML = ctx.svg(W, H, out);
    }
  });

  /* 04 컨베이어 검문소 — 벨트 위를 흐르다 검문 문에서 걸리면 아래 상자로. */
  SV.add({
    id: "04",
    stepMs: 1700,
    line: "분자들이 벨트를 타고 오른쪽으로 갑니다. 검문 문에서 걸린 분자는 문 아래 상자로 떨어지고, 문을 모두 통과한 라임색 분자만 도킹실에 들어가요.",
    render(el, ctx) {
      const { X, REM, DROP, PAL } = ctx;
      const W = el.clientWidth || 800, narrow = W < 640;
      const gap = narrow ? 5 : 7.5, r = gap * 0.4;
      const hopW = narrow ? 34 : 70, dockW = narrow ? 62 : 120;
      const bx0 = hopW + 14, bx1 = W - dockW - 18, seg = (bx1 - bx0) / 5;
      const doorX = (k) => bx0 + seg * (k - 1);
      const qCols = Math.max(3, Math.floor((seg - 10) / gap));
      const binCols = Math.max(3, Math.floor((seg - 10) / gap));
      const dockCols = Math.max(3, Math.floor((dockW - 12) / gap));
      const qRows = Math.ceil(220 / qCols);
      const beltY = 58 + qRows * gap + 8;
      const maxBin = Math.max(...[2, 3, 4, 5, 6].map((k) => DROP[k]), 1);
      const binH = Math.max(70, Math.ceil(maxBin / binCols) * gap + 12);
      const binY = beltY + 34, H = binY + binH + 44;
      const { cv, g } = ctx.canvas(el, H);
      const dockX = W - dockW - 6, dockTop = beltY - 70, dockBot = binY + binH;
      function layout(s) {
        const groups = new Map(), put = (k, c) => { if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); };
        for (const c of X) {
          if (c.f === 1) put("hop", c);
          else if (c.f <= s) put("b" + c.f, c);
          else if (s >= 6) put("dock", c);
          else if (s <= 1) put("hop", c);
          else put("q" + (s + 1), c);
        }
        const pos = new Map();
        for (const [k, list] of groups) list.forEach((c, i) => {
          let p;
          if (k === "hop") { const hc = Math.max(2, Math.floor((hopW - 8) / gap)); p = pileXY(i, list.length, hc, 6 + hopW / 2, beltY + 4, gap); }
          else if (k === "dock") p = pileXY(i, list.length, dockCols, dockX + dockW / 2, dockBot - 4, gap);
          else if (k[0] === "b") { const kk = +k.slice(1); p = pileXY(i, list.length, binCols, doorX(kk) - seg / 2, binY + binH - 4, gap); }
          else { const kk = +k.slice(1); p = pileXY(i, list.length, qCols, doorX(kk) - seg / 2, beltY - 1, gap); }
          pos.set(c.id, p);
        });
        return pos;
      }
      const A = layout(ctx.prevStep), B = layout(ctx.step);
      const rng = ctx.rng(5), delay = new Map(X.map((c) => { const a = A.get(c.id); return [c.id, (1 - a.x / W) * 0.25 + rng() * 0.1]; }));
      let cur = [];
      function scene(t) {
        g.clearRect(0, 0, W, H);
        g.textBaseline = "middle"; g.textAlign = "center";
        /* 벨트 */
        g.fillStyle = PAL.raise; g.fillRect(bx0 - 6, beltY, bx1 - bx0 + 16, 12);
        g.strokeStyle = PAL.lineStrong; g.lineWidth = 1; g.strokeRect(bx0 - 6, beltY, bx1 - bx0 + 16, 12);
        const off = (t * 60) % 14;
        g.strokeStyle = PAL.line;
        for (let x = bx0 - 6 + off; x < bx1 + 10; x += 14) { g.beginPath(); g.moveTo(x, beltY + 1); g.lineTo(x - 4, beltY + 11); g.stroke(); }
        for (let x = bx0; x < bx1 + 10; x += 28) dot(g, x, beltY + 17, 3, PAL.lineStrong);
        /* 출발 상자 */
        g.strokeStyle = PAL.lineStrong; g.strokeRect(6, beltY - 52, hopW, 56);
        g.fillStyle = PAL.fg; g.font = `600 11.5px ${FONT}`; g.fillText("①", 6 + hopW / 2, beltY - 62);
        /* 문 · 상자 */
        for (let k = 2; k <= 6; k++) {
          const x = doorX(k), on = k <= ctx.step;
          g.globalAlpha = on ? 1 : 0.3;
          g.fillStyle = PAL.f[k];
          g.fillRect(x - 3, beltY - 46, 6, 46); g.fillRect(x - 11, beltY - 50, 22, 5);
          g.fillStyle = PAL.fg; g.font = `600 ${narrow ? 11.5 : 12}px ${FONT}`;
          g.fillText(narrow ? NUM[k - 1] : gLabel(ctx, k), x, 16);
          g.fillStyle = PAL.muted; g.font = `11px ${MONO}`; g.fillText(narrow ? `${REM[k]}` : `${REM[k]}개 통과`, x, 32);
          /* 상자 */
          const lx = x - seg + 5, w = seg - 10;
          g.strokeStyle = PAL.lineStrong; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(lx, binY); g.lineTo(lx, binY + binH); g.lineTo(lx + w, binY + binH); g.lineTo(lx + w, binY); g.stroke();
          g.fillStyle = PAL.f[k]; g.fillRect(lx, binY - 3, w, 3);
          g.fillStyle = PAL.fg; g.font = `${narrow ? 11 : 12}px ${MONO}`; g.fillText(`−${DROP[k]}`, x - seg / 2, binY + binH + 15);
          if (!narrow) { g.fillStyle = PAL.muted; g.font = `11px ${FONT}`; g.fillText(k === 6 ? "순위 밖 대기" : "탈락", x - seg / 2, binY + binH + 31); }
          g.globalAlpha = 1;
        }
        /* 도킹실 */
        g.globalAlpha = ctx.step >= 6 ? 1 : 0.35;
        g.strokeStyle = PAL.fg; g.lineWidth = 2; g.strokeRect(dockX, dockTop, dockW, dockBot - dockTop);
        g.fillStyle = PAL.fg; g.font = `600 12px ${FONT}`; g.fillText("도킹실", dockX + dockW / 2, dockTop - 24);
        g.fillStyle = PAL.muted; g.font = `11px ${MONO}`; g.fillText(`선정 ${DROP[7]}`, dockX + dockW / 2, dockTop - 9);
        g.globalAlpha = 1;
        g.textAlign = "start";
      }
      const stop = run(ctx, 1500, (t) => {
        scene(t);
        cur = [];
        for (const c of X) {
          const a = A.get(c.id), b = B.get(c.id);
          const lt = clamp((t - delay.get(c.id)) / 0.65, 0, 1);
          let x, y;
          if (b.y > beltY + 4 && a.y <= beltY + 4) { /* 벨트를 따라가다 떨어짐 */
            const p = clamp(lt / 0.6, 0, 1), q = clamp((lt - 0.6) / 0.4, 0, 1);
            x = lerp(a.x, b.x, easeIO(p)); y = q > 0 ? lerp(beltY - gap / 2, b.y, easeIn(q)) : lerp(a.y, beltY - gap / 2, easeIO(p));
          } else { x = lerp(a.x, b.x, easeIO(lt)); y = lerp(a.y, b.y, easeIO(lt)); }
          const f = shown(c, lt > 0.7 ? ctx.step : ctx.prevStep);
          dot(g, x, y, f === 7 ? r + 0.7 : r, f ? PAL.f[f] : PAL.fg, f === 7 ? PAL.hitRing : null);
          cur.push({ x, y, c });
        }
      });
      hoverCanvas(cv, ctx, () => cur, gap);
      return stop;
    }
  });

  /* 05 384-웰 플레이트 — 실제 HTS 플레이트. 웰 하나에 분자 하나. */
  SV.add({
    id: "05",
    line: "실제 고속 스크리닝(HTS)에서 쓰는 384-웰 플레이트예요. 칸(웰) 하나에 분자 하나를 넣고, 웰 색이 그 분자가 어느 관문에서 멈췄는지 알려 줍니다.",
    render(el, ctx) {
      const { X, step, DROP } = ctx;
      const W = el.clientWidth || 800, narrow = W < 640;
      const p = Math.min(30, (W - 52) / 24.6), pad = p * 0.7, lab = narrow ? 14 : 18;
      const px = lab + 6, py = lab + 6, pw = 24 * p + 2 * pad, ph = 16 * p + 2 * pad;
      const ox = px + Math.max(0, (W - px - pw - 8) / 2);
      const wsz = p * 0.76, ROWS = "ABCDEFGHIJKLMNOP";
      let out = "";
      const ch = p * 1.1;
      out += `<path d="M${ox + ch} ${py} H${ox + pw - 6} Q${ox + pw} ${py} ${ox + pw} ${py + 6} V${py + ph - 6} Q${ox + pw} ${py + ph} ${ox + pw - 6} ${py + ph} H${ox + 6} Q${ox} ${py + ph} ${ox} ${py + ph - 6} V${py + ch} Z" fill="var(--raise)" stroke="var(--line-strong)" stroke-width="1.5"/>`;
      for (let j = 0; j < 24; j++) if (!narrow || j % 2 === 0 || j === 23) out += `<text x="${ox + pad + j * p + p / 2}" y="${py - 6}" text-anchor="middle" font-size="${narrow ? 8.5 : 10}" class="t-mono t-muted">${j + 1}</text>`;
      for (let i = 0; i < 16; i++) out += `<text x="${ox - 6}" y="${py + pad + i * p + p / 2 + 3.5}" text-anchor="end" font-size="${narrow ? 8.5 : 10}" class="t-mono t-muted">${ROWS[i]}</text>`;
      /* 가장자리 웰은 비우고(증발 오차) 안쪽 B2~O23 에 줄 순서로 채운다 */
      const slot = new Map();
      X.forEach((c, i) => slot.set(`${1 + Math.floor(i / 22)},${1 + (i % 22)}`, c));
      for (let i = 0; i < 16; i++) for (let j = 0; j < 24; j++) {
        const x = ox + pad + j * p + (p - wsz) / 2, y = py + pad + i * p + (p - wsz) / 2;
        const c = slot.get(`${i},${j}`);
        if (!c) {
          const edge = i === 0 || i === 15 || j === 0 || j === 23;
          out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${wsz.toFixed(1)}" height="${wsz.toFixed(1)}" rx="1.5" fill="none" stroke="var(--line)" ${edge ? 'stroke-dasharray="2 2"' : ""}/>`;
          continue;
        }
        const f = shown(c, step), just = ctx.justOut(c) && step >= 2;
        out += `<rect data-cid="${c.id}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${wsz.toFixed(1)}" height="${wsz.toFixed(1)}" rx="1.5" fill="${fillVar(f)}" ${f === 0 ? 'fill-opacity="0.78"' : ""} ${f === 7 ? 'stroke="var(--hit-ring)" stroke-width="1.5"' : just ? 'stroke="var(--fg)" stroke-width="1.6"' : ""}/>`;
      }
      /* 바코드 라벨 */
      const by = py + ph + 16, rng = ctx.rng(384);
      let bars = "", bxp = ox;
      for (let i = 0; i < 46; i++) { const w = 1 + Math.floor(rng() * 3); if (i % 2 === 0) bars += `<rect x="${bxp}" y="${by}" width="${w}" height="26" fill="var(--fg)"/>`; bxp += w + 0.6; }
      out += bars;
      out += `<text x="${bxp + 12}" y="${by + 11}" font-size="12" font-weight="600" class="t-mono">CRISTA-HTS-0001</text>
        <text x="${bxp + 12}" y="${by + 26}" font-size="11" class="t-muted">${narrow ? `384 웰 · ${X.length}개 · 10 µM` : `384 웰 · ${X.length}개 화합물 · 각 10 µM · ${ctx.gene} 표적`}</text>`;
      if (!narrow) out += `<text x="${ox + pw}" y="${by + 11}" text-anchor="end" font-size="11" class="t-muted">점선 웰: 가장자리는 증발 오차 때문에 비워 둡니다</text>
        <text x="${ox + pw}" y="${by + 26}" text-anchor="end" font-size="11" class="t-mono t-muted">선정 ${DROP[7]} · 굵은 테두리 = 이번 관문에서 걸림</text>`;
      else out += `<text x="${ox}" y="${by + 46}" font-size="11" class="t-muted">점선 웰: 가장자리는 증발 오차로 비워 둠</text>`;
      el.innerHTML = ctx.svg(W, by + (narrow ? 56 : 40), out);
    }
  });

  /* 06 격자 6장 — 같은 220칸을 관문마다 한 장씩. 같은 분자는 같은 칸. */
  SV.add({
    id: "06",
    line: "220칸짜리 같은 판을 관문마다 한 장씩 찍었어요. 같은 분자는 언제나 같은 칸이라, 장을 넘길수록 검은 칸이 꺼져 가는 모습을 보면 됩니다.",
    render(el, ctx) {
      const { X, REM, DROP, step } = ctx;
      const order = [...X].sort((a, b) => b.f - a.f || b.score - a.score);
      const C = 20, cell = 10;
      const panels = [1, 2, 3, 4, 5, 6].map((k) => {
        const on = k <= step;
        let cells = "";
        order.forEach((c, i) => {
          const x = (i % C) * cell, y = Math.floor(i / C) * cell;
          let fill, op = 1, extra = "";
          if (c.f > k) { if (k === 6 && c.f === 7) { fill = "var(--f7)"; extra = ' stroke="var(--hit-ring)" stroke-width="0.8"'; } else fill = "var(--fg)"; }
          else if (c.f === k) fill = `var(--f${k})`;
          else { fill = `var(--f${c.f})`; op = 0.16; }
          cells += `<rect data-cid="${c.id}" x="${x + 0.6}" y="${y + 0.6}" width="${cell - 1.2}" height="${cell - 1.2}" fill="${fill}" fill-opacity="${op}"${extra}/>`;
        });
        return `<figure style="margin:0;opacity:${on ? 1 : 0.22};display:flex;flex-direction:column;gap:6px;min-width:0">
          <svg viewBox="0 0 ${C * cell} ${Math.ceil(220 / C) * cell}" width="100%" role="img" aria-label="${ctx.GATES[k - 1].name} 뒤">${cells}</svg>
          <figcaption style="display:flex;flex-direction:column;gap:1px;font-size:12px;line-height:1.35">
            <span style="display:flex;align-items:center;gap:6px;font-weight:600"><i data-f="${k}" style="width:10px;height:10px;background:var(--c);display:inline-block;flex:none"></i>${gLabel(ctx, k)} 뒤</span>
            <span class="mono" style="color:var(--muted);font-size:11.5px">${k === 6 ? `선정 ${REM[6]}개` : `${REM[k]}개 남음`} · −${DROP[k]}</span></figcaption></figure>`;
      });
      el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(${(el.clientWidth || 800) >= 640 ? 3 : 2},minmax(0,1fr));gap:22px 18px;padding:18px">${panels.join("")}</div>`;
    }
  });

  /* 07 생키 흐름 — 본류가 관문마다 가늘어지고 탈락 갈래가 휘어 나간다. */
  SV.add({
    id: "07",
    line: "강물 폭이 분자 수예요. 관문을 지날 때마다 한 갈래가 아래로 빠져나가고, 끝까지 남은 가는 라임색 물줄기가 도킹실로 흘러갑니다.",
    render(el, ctx) {
      const { REM, DROP, step } = ctx;
      const W = el.clientWidth || 800, vert = W < 640;
      const gates = [1, 2, 3, 4, 5, 6].filter((k) => k > 1 || DROP[1]);
      const maxDrop = Math.max(...gates.map((k) => DROP[k]), 1);
      let L, v0, s, H, endLen;
      if (!vert) { v0 = 58; s = 0.78; L = W; endLen = 180; H = v0 + 220 * s + 46 + maxDrop * s + 40; }
      else { v0 = 96; s = (W - v0 - 70) / (220 + maxDrop + 30); L = 7 * 84 + 70; endLen = 70; H = L; }
      const pad = vert ? 30 : 16;
      const uk = (k) => pad + (k * (L - pad - endLen)) / 6;
      const P = (u, v) => (vert ? [v, u] : [u, v]);
      const pt = (u, v) => P(u, v).map((n) => n.toFixed(1)).join(" ");
      const vb = v0 + 220 * s + (vert ? 30 : 46);
      let out = "";
      /* 탈락 갈래 */
      for (const k of gates) {
        if (!DROP[k]) continue;
        const on = k <= step, ua = uk(k), ub = ua + (uk(1) - uk(0)) * 0.62, um = (ua + ub) / 2;
        const a1 = v0 + REM[k] * s, a2 = v0 + REM[k - 1] * s, b1 = vb, b2 = vb + DROP[k] * s;
        const d = `M${pt(ua, a1)} C${pt(um, a1)} ${pt(um, b1)} ${pt(ub, b1)} L${pt(ub, b2)} C${pt(um, b2)} ${pt(um, a2)} ${pt(ua, a2)} Z`;
        out += `<g opacity="${on ? 1 : 0.14}"><path d="${d}" fill="var(--f${k})" fill-opacity="0.85"><title>${ctx.GATES[k - 1].name}: ${DROP[k]}개</title></path>`;
        const [tx, ty] = vert ? P(ub + 4, b2 + 6) : P(ub + 6, (b1 + b2) / 2);
        out += `<text x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}" font-size="12" class="t-mono">−${DROP[k]}</text>`;
        const [tx2, ty2] = vert ? P(ub + 4, b2 + 6) : P(ub + 6, (b1 + b2) / 2);
        out += `<text x="${tx2.toFixed(1)}" y="${(ty2 + 19).toFixed(1)}" font-size="11" class="t-muted">${k === 6 ? "순위 밖" : ctx.GATES[k - 1].short}</text></g>`;
      }
      /* 본류 */
      for (let k = 0; k < 6; k++) {
        const on = k <= step, [x, y] = P(uk(k), v0), [x2, y2] = P(uk(k + 1), v0 + REM[k] * s);
        out += `<rect x="${Math.min(x, x2)}" y="${Math.min(y, y2)}" width="${Math.abs(x2 - x)}" height="${Math.abs(y2 - y)}" fill="var(--fg)" fill-opacity="${on ? 0.82 : 0.12}"/>`;
      }
      { const [x, y] = P(uk(6), v0), [x2, y2] = P(uk(6) + endLen - 10, v0 + Math.max(REM[6] * s, 2));
        out += `<rect x="${Math.min(x, x2)}" y="${Math.min(y, y2)}" width="${Math.abs(x2 - x)}" height="${Math.abs(y2 - y)}" fill="var(--f7)" stroke="var(--hit-ring)" opacity="${step >= 6 ? 1 : 0.2}"/>`;
        const [tx, ty] = vert ? P(uk(6) + endLen - 10, v0 + REM[6] * s + 8) : P(uk(6) + 4, v0 + REM[6] * s + 18);
        out += `<text x="${tx}" y="${ty}" font-size="12.5" font-weight="600" opacity="${step >= 6 ? 1 : 0.3}">${vert ? "" : "→ "}도킹실 ${REM[6]}개</text>`; }
      /* 관문 표시 */
      for (let k = 0; k <= 6; k++) {
        const on = k <= step;
        const [lx1, ly1] = P(uk(k), v0 - 8), [lx2, ly2] = P(uk(k), v0 + REM[k === 0 ? 0 : k - 1] * s + 4);
        if (k > 0) out += `<line x1="${lx1}" y1="${ly1}" x2="${lx2}" y2="${ly2}" stroke="var(--f${k})" stroke-width="2" opacity="${on ? 1 : 0.25}"/>`;
        const lbl = k ? (vert ? NUM[k - 1] + " " + ctx.GATES[k - 1].short : gLabel(ctx, k)) : "시작";
        if (vert) {
          out += `<g opacity="${on ? 1 : 0.35}"><text x="${v0 - 8}" y="${uk(k) + 4}" text-anchor="end" font-size="11.5" font-weight="600">${lbl}</text>
            <text x="${v0 - 8}" y="${uk(k) + 19}" text-anchor="end" font-size="11" class="t-mono t-muted">${REM[k]}</text></g>`;
        } else {
          out += `<g opacity="${on ? 1 : 0.35}"><text x="${uk(k) + (k ? 0 : 0)}" y="${v0 - 30}" text-anchor="${k ? "middle" : "start"}" font-size="12" font-weight="600">${lbl}</text>
            <text x="${uk(k)}" y="${v0 - 14}" text-anchor="${k ? "middle" : "start"}" font-size="11.5" class="t-mono t-muted">${REM[k]}개</text></g>`;
        }
      }
      el.innerHTML = ctx.svg(W, Math.ceil(H), out);
    }
  });

  /* 08 폭포 막대 — 220 에서 관문마다 잘려 나가는 조각. */
  SV.add({
    id: "08",
    line: "막대 하나가 관문 하나예요. 검은 부분은 통과해서 남은 분자, 위에 얹힌 색 조각은 그 관문에서 잘려 나간 분자 수입니다.",
    render(el, ctx) {
      const { REM, DROP, step } = ctx;
      const W = el.clientWidth || 800, narrow = W < 640, H = 420;
      const ml = 40, mr = 10, mt = 30, mb = narrow ? 46 : 52, pw = W - ml - mr, ph = H - mt - mb;
      const n = 8, band = pw / n, bw = band * 0.62;
      const y = (v) => mt + ph * (1 - v / 220);
      let out = "";
      for (const t of [0, 50, 100, 150, 200]) out += `<line x1="${ml}" x2="${W - mr}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${ml - 6}" y="${y(t) + 4}" text-anchor="end" font-size="10.5" class="t-mono t-muted">${t}</text>`;
      out += `<text x="${ml - 6}" y="${mt - 14}" text-anchor="end" font-size="10.5" class="t-muted">분자 수</text>`;
      const cols = [{ k: 0, lbl: "시작" }].concat([1, 2, 3, 4, 5, 6].map((k) => ({ k, lbl: narrow ? NUM[k - 1] : NUM[k - 1] + " " + ctx.GATES[k - 1].short }))).concat([{ k: 7, lbl: "선정" }]);
      cols.forEach((col, i) => {
        const x = ml + i * band + (band - bw) / 2, cxm = x + bw / 2, k = col.k;
        const on = k === 7 ? step >= 6 : k <= step;
        let g = "";
        if (k === 0) {
          g += `<rect x="${x}" y="${y(220)}" width="${bw}" height="${y(0) - y(220)}" fill="var(--fg)" fill-opacity="0.82"><title>시작 ${REM[0]}개</title></rect>`;
          g += `<text x="${cxm}" y="${y(220) - 7}" text-anchor="middle" font-size="12" class="t-mono">${REM[0]}</text>`;
        } else if (k === 7) {
          g += `<rect x="${x}" y="${y(REM[6])}" width="${bw}" height="${Math.max(1.5, y(0) - y(REM[6]))}" fill="var(--f7)" stroke="var(--hit-ring)"><title>선정 ${REM[6]}개</title></rect>`;
          g += `<text x="${cxm}" y="${y(REM[6]) - 7}" text-anchor="middle" font-size="12" font-weight="600" class="t-mono">${REM[6]}</text>`;
        } else {
          g += `<rect x="${x}" y="${y(REM[k])}" width="${bw}" height="${y(0) - y(REM[k])}" fill="var(--fg)" fill-opacity="0.82"><title>통과 ${REM[k]}개</title></rect>`;
          if (DROP[k]) g += `<rect x="${x}" y="${y(REM[k - 1])}" width="${bw}" height="${Math.max(1.5, y(REM[k]) - y(REM[k - 1]) - 1.5)}" fill="var(--f${k})"><title>${ctx.GATES[k - 1].name}에서 ${DROP[k]}개</title></rect>`;
          g += `<text x="${cxm}" y="${y(REM[k - 1]) - 7}" text-anchor="middle" font-size="12" class="t-mono">−${DROP[k]}</text>`;
        }
        if (i < n - 1) { const lv = k === 0 ? 220 : k === 7 ? 0 : REM[k]; out += `<line x1="${x + bw}" x2="${x + band + 0}" y1="${y(lv)}" y2="${y(lv)}" stroke="var(--line-strong)" stroke-dasharray="3 3" opacity="${on ? 1 : 0.3}"/>`; }
        out += `<g opacity="${on ? 1 : 0.18}">${g}</g>`;
        out += `<text x="${cxm}" y="${H - mb + 18}" text-anchor="middle" font-size="${narrow ? 12 : 11.5}" font-weight="600" opacity="${on ? 1 : 0.4}">${col.lbl}</text>`;
        out += `<text x="${cxm}" y="${H - mb + 34}" text-anchor="middle" font-size="10.5" class="t-mono t-muted" opacity="${on ? 1 : 0.4}">${k === 0 ? "" : k === 7 ? "도킹실" : REM[k] + " 남음"}</text>`;
      });
      out += `<line x1="${ml}" x2="${W - mr}" y1="${y(0)}" y2="${y(0)}" stroke="var(--fg)"/>`;
      el.innerHTML = ctx.svg(W, H, out);
    }
  });

  /* 09 생존 계단 — 남은 분자 수를 계단으로. 로그 축으로 바꾸면 마지막 낙차가 보인다. */
  let logAxis = false;
  SV.add({
    id: "09",
    line: "계단 한 칸이 관문 하나예요. 계단이 뚝 떨어지는 곳이 많이 걸러진 관문입니다. '로그 축'을 누르면 마지막 몇 개 사이의 차이도 크게 보여요.",
    render(el, ctx) {
      const draw = () => {
        const { REM, DROP, step } = ctx;
        const W = el.clientWidth || 800, narrow = W < 640, H = 420;
        const ml = 46, mr = narrow ? 34 : 90, mt = 46, mb = 52, pw = W - ml - mr, ph = H - mt - mb;
        const X = (k) => ml + (k * pw) / 6.5;
        const lmax = Math.log10(220);
        const y = (v) => mt + ph * (1 - (logAxis ? Math.log10(Math.max(v, 1)) / lmax : v / 220));
        const ticks = logAxis ? [1, 3, 10, 30, 100, 220] : [0, 50, 100, 150, 200];
        let out = "";
        for (const t of ticks) out += `<line x1="${ml}" x2="${ml + pw}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${ml - 6}" y="${y(t) + 4}" text-anchor="end" font-size="10.5" class="t-mono t-muted">${t}</text>`;
        out += `<text x="${ml - 6}" y="${mt - 18}" text-anchor="end" font-size="10.5" class="t-muted">남은 분자</text>`;
        let d = `M${X(0)} ${y(REM[0])}`;
        for (let k = 1; k <= 6; k++) d += ` H${X(k)} V${y(REM[k])}`;
        const full = d + ` H${X(6.5)}`;
        out += `<path d="${full} V${y(logAxis ? 1 : 0)} H${X(0)} Z" fill="var(--fg)" fill-opacity="0.06"/>`;
        out += `<path d="${full}" fill="none" stroke="var(--fg)" stroke-width="2" opacity="0.22"/>`;
        let ds = `M${X(0)} ${y(REM[0])}`;
        for (let k = 1; k <= step; k++) ds += ` H${X(k)} V${y(REM[k])}`;
        ds += step >= 6 ? ` H${X(6.5)}` : ` H${X(step) + (X(1) - X(0)) * 0.5}`;
        out += `<path d="${ds}" fill="none" stroke="var(--fg)" stroke-width="2"/>`;
        for (let k = 1; k <= 6; k++) {
          const on = k <= step;
          out += `<g opacity="${on ? 1 : 0.3}">`;
          if (DROP[k]) out += `<line x1="${X(k)}" x2="${X(k)}" y1="${y(REM[k - 1])}" y2="${y(REM[k])}" stroke="var(--f${k})" stroke-width="5"><title>${ctx.GATES[k - 1].name}: −${DROP[k]}</title></line>`;
          if (DROP[k]) out += `<text x="${X(k) + 7}" y="${(y(REM[k - 1]) + y(REM[k])) / 2 + 4}" font-size="11.5" class="t-mono">−${DROP[k]}</text>`;
          out += `</g>`;
        }
        for (let k = 0; k <= 6; k++) {
          out += `<text x="${X(k)}" y="${H - mb + 18}" text-anchor="middle" font-size="11.5" font-weight="600" opacity="${k <= step ? 1 : 0.4}">${k ? (narrow ? NUM[k - 1] : NUM[k - 1] + " " + ctx.GATES[k - 1].short) : "시작"}</text>`;
          out += `<line x1="${X(k)}" x2="${X(k)}" y1="${y(logAxis ? 1 : 0)}" y2="${y(logAxis ? 1 : 0) + 4}" stroke="var(--fg)"/>`;
        }
        out += `<line x1="${ml}" x2="${ml + pw}" y1="${y(logAxis ? 1 : 0)}" y2="${y(logAxis ? 1 : 0)}" stroke="var(--fg)"/>`;
        /* 지금 점 */
        const ex = step >= 6 ? X(6.5) : X(step), ey = y(REM[step]);
        out += `<circle cx="${ex}" cy="${ey}" r="6" fill="${step >= 6 ? "var(--f7)" : "var(--fg)"}" stroke="${step >= 6 ? "var(--hit-ring)" : "var(--surface)"}" stroke-width="1.5"/>`;
        out += `<text x="${narrow ? ex - 8 : ex + 10}" y="${ey - 10}" text-anchor="${narrow ? "end" : "start"}" font-size="12.5" font-weight="600">${step >= 6 ? `선정 ${REM[6]}개` : `지금 ${REM[step]}개`}</text>`;
        el.innerHTML = `<div style="position:absolute;top:10px;right:10px;display:flex;border:1px solid var(--line-strong);background:var(--surface);z-index:1">
            <button type="button" data-ax="lin" aria-pressed="${!logAxis}" style="border:0;padding:4px 10px;font-size:12px;background:${logAxis ? "transparent" : "var(--fg)"};color:${logAxis ? "var(--fg)" : "var(--bg)"}">보통 축</button>
            <button type="button" data-ax="log" aria-pressed="${logAxis}" style="border:0;border-left:1px solid var(--line-strong);padding:4px 10px;font-size:12px;background:${logAxis ? "var(--fg)" : "transparent"};color:${logAxis ? "var(--bg)" : "var(--fg)"}">로그 축</button></div>` + ctx.svg(W, H, out);
        el.querySelectorAll("[data-ax]").forEach((b) => b.addEventListener("click", () => { logAxis = b.dataset.ax === "log"; draw(); }));
      };
      draw();
    }
  });

  /* 10 MW×TPSA 창문 — 허용 사각형의 모서리를 끌어 조건을 바꾼다. */
  let W10 = null;
  SV.add({
    id: "10",
    line: "점 하나가 분자 하나, 사각형 창문이 ② 크기 · 극성 조건이에요. 창문 오른쪽 위 모서리를 끌어 보세요. 창문 밖으로 나간 점은 파랗게 탈락합니다.",
    render(el, ctx) {
      const W = el.clientWidth || 800, narrow = W < 640, H = narrow ? 380 : 460;
      const ml = 48, mr = 18, mt = 22, mb = 44, pw = W - ml - mr, ph = H - mt - mb;
      const xd = [50, 700], yd = [0, 220];
      const xs = (v) => ml + ((v - xd[0]) / (xd[1] - xd[0])) * pw, ys = (v) => mt + ph * (1 - (v - yd[0]) / (yd[1] - yd[0]));
      const xi = (px) => xd[0] + ((px - ml) / pw) * (xd[1] - xd[0]), yi = (py) => yd[0] + (1 - (py - mt) / ph) * (yd[1] - yd[0]);
      let out = "";
      for (let t = 100; t <= 700; t += 100) out += `<line x1="${xs(t)}" x2="${xs(t)}" y1="${mt}" y2="${mt + ph}" stroke="var(--line)"/><text x="${xs(t)}" y="${mt + ph + 16}" text-anchor="middle" font-size="10.5" class="t-mono t-muted">${t}</text>`;
      for (let t = 0; t <= 200; t += 40) out += `<line x1="${ml}" x2="${ml + pw}" y1="${ys(t)}" y2="${ys(t)}" stroke="var(--line)"/><text x="${ml - 6}" y="${ys(t) + 4}" text-anchor="end" font-size="10.5" class="t-mono t-muted">${t}</text>`;
      out += `<text x="${ml + pw}" y="${H - 6}" text-anchor="end" font-size="11" class="t-muted">분자량 MW (Da) →</text>`;
      out += `<text x="${ml - 40}" y="${mt - 8}" font-size="11" class="t-muted">↑ TPSA (Å²)</text>`;
      out += `<line x1="${ml}" x2="${ml + pw}" y1="${ys(90)}" y2="${ys(90)}" stroke="var(--fg)" stroke-dasharray="5 4" opacity="0.55"/>
        <text x="${ml + pw - 4}" y="${ys(90) - 6}" text-anchor="end" font-size="11" class="t-muted">뇌 투과선 TPSA 90</text>`;
      out += `<rect id="w10r" x="${xs(xd[0])}" y="0" width="0" height="0" fill="var(--f2)" fill-opacity="0.08" stroke="var(--f2)" stroke-width="1.5"/>`;
      const pts = [...ctx.X].sort((a, b) => (a.f === 7) - (b.f === 7));
      out += pts.map((c) => `<circle data-cid="${c.id}" cx="${xs(c.mw).toFixed(1)}" cy="${ys(Math.min(c.tpsa, 219)).toFixed(1)}" r="${narrow ? 3 : 3.6}" fill-opacity="0.88"/>`).join("");
      out += `<text id="w10c" x="${ml + 8}" y="0" font-size="12" font-weight="600"></text>`;
      out += `<text id="w10l" x="0" y="0" text-anchor="end" font-size="12" font-weight="600" class="t-mono"></text>`;
      out += `<g id="w10h" tabindex="0" role="slider" aria-label="창문 모서리: 분자량과 TPSA 최대" style="cursor:move;outline:none"><circle r="16" fill="transparent"/><rect x="-8" y="-8" width="16" height="16" fill="var(--surface)" stroke="var(--fg)" stroke-width="2"/><path d="M-3 0H3M0 -3V3" stroke="var(--fg)" stroke-width="1.5"/></g>`;
      el.innerHTML = ctx.svg(W, H, out, 'style="touch-action:none"');
      const svg = el.querySelector("svg");
      W10 = { svg, xs, ys, xd };
      this.update(ctx);
      const h = svg.querySelector("#w10h");
      const toVal = (e) => {
        const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
        const q = p.matrixTransform(svg.getScreenCTM().inverse());
        return { mwMax: clamp(Math.round(xi(q.x) / 10) * 10, 250, 650), tpsaMax: clamp(Math.round(yi(q.y) / 5) * 5, 40, 180) };
      };
      let drag = false;
      h.addEventListener("pointerdown", (e) => { drag = true; h.setPointerCapture(e.pointerId); ctx.hideTip(); e.preventDefault(); });
      h.addEventListener("pointermove", (e) => {
        if (!drag) return;
        const v = toVal(e);
        if (v.mwMax !== ctx.S.mwMax || v.tpsaMax !== ctx.S.tpsaMax) ctx.set(v, true);
      });
      const end = () => { drag = false; };
      h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end);
      h.addEventListener("keydown", (e) => {
        const d = { ArrowRight: [10, 0], ArrowLeft: [-10, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[e.key];
        if (!d) return;
        e.preventDefault();
        ctx.set({ mwMax: clamp(ctx.S.mwMax + d[0], 250, 650), tpsaMax: clamp(ctx.S.tpsaMax + d[1], 40, 180) }, true);
      });
    },
    update(ctx) {
      if (!W10 || !W10.svg.isConnected) return;
      const { svg, xs, ys, xd } = W10, S = ctx.S, step = ctx.step;
      const hx = xs(S.mwMax), hy = ys(S.tpsaMax);
      const r = svg.querySelector("#w10r");
      r.setAttribute("x", xs(xd[0])); r.setAttribute("y", hy); r.setAttribute("width", hx - xs(xd[0])); r.setAttribute("height", ys(0) - hy);
      svg.querySelector("#w10h").setAttribute("transform", `translate(${hx} ${hy})`);
      const inside = ctx.X.filter((c) => c.p.mw && c.p.tpsa).length;
      const c1 = svg.querySelector("#w10c"); c1.setAttribute("y", hy + 18); c1.textContent = `창문 안 ${inside}개`;
      const l = svg.querySelector("#w10l"); l.setAttribute("x", hx - 14); l.setAttribute("y", hy - 12); l.textContent = `MW ≤ ${S.mwMax} · TPSA ≤ ${S.tpsaMax}`;
      const m = new Map(ctx.X.map((c) => [c.id, c]));
      svg.querySelectorAll("circle[data-cid]").forEach((el) => {
        const c = m.get(el.getAttribute("data-cid")), f = shown(c, step);
        el.setAttribute("fill", fillVar(f));
        if (f === 7) { el.setAttribute("stroke", "var(--hit-ring)"); el.setAttribute("stroke-width", "1.2"); }
        else el.removeAttribute("stroke");
        el.setAttribute("fill-opacity", f === 0 ? "0.55" : "0.9");
      });
    }
  });
})();
