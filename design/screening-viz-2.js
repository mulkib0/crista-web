/* 시안 11–20 — 화합물 스크리닝 그림. 공통 뼈대(screening-30-variants.html)의 SV.add 로 등록한다. */
(() => {
  "use strict";

  /* 지금 단계에서 보여 줄 운명 번호 — 0 은 '아직 남음' */
  const shown = (c, k) => (c.f <= k ? c.f : k >= 6 && c.f === 7 ? 7 : 0);
  const fill = (fi) => (fi ? `var(--f${fi})` : "var(--fg)");
  const ring = (fi) => (fi === 7 ? ' stroke="var(--hit-ring)" stroke-width="1.2"' : "");
  /* 선정 → 순위 밖 → 뒤 관문 탈락 → 앞 관문 탈락 */
  const ORD = (a, b) => b.f - a.f || (a.rank ?? 999) - (b.rank ?? 999) || b.score - a.score;
  const CIRC = "①②③④⑤⑥";
  const SANS = "'IBM Plex Sans KR', -apple-system, sans-serif";
  const MONO = "'IBM Plex Mono', monospace";
  const ticks = (a, b, s) => { const t = []; for (let v = Math.ceil(a / s) * s; v <= b + 1e-9; v += s) t.push(+v.toFixed(6)); return t; };

  /* 11 화학 공간 지도 — MW × logP 산점도, Ro5 '먹는 약 구역' */
  SV.add({
    id: "11",
    line: "분자 하나하나를 '크기(분자량)'와 '기름 친화도(logP)' 지도 위에 찍었습니다. 옅게 칠한 상자 안이 먹는 약이 많이 사는 동네예요.",
    render(el, ctx) {
      const { X, S, step } = ctx;
      const W = Math.max(320, el.clientWidth), H = Math.round(Math.min(540, Math.max(360, W * 0.58)));
      const m = { l: W < 500 ? 40 : 56, r: 14, t: 18, b: 46 };
      const x0 = 0, x1 = 700, y0 = -2.5, y1 = 7;
      const sx = (v) => m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r);
      const sy = (v) => H - m.b - ((v - y0) / (y1 - y0)) * (H - m.t - m.b);
      let o = "";
      /* 먹는 약 구역 */
      o += `<rect x="${sx(x0)}" y="${sy(5)}" width="${sx(500) - sx(x0)}" height="${sy(y0) - sy(5)}" fill="var(--hi)" opacity="0.18"/>`;
      o += `<rect x="${sx(x0)}" y="${sy(5)}" width="${sx(500) - sx(x0)}" height="${sy(y0) - sy(5)}" fill="none" stroke="var(--fg)" stroke-width="1" stroke-dasharray="5 4" opacity="0.6"/>`;
      o += `<text x="${sx(x0) + 8}" y="${sy(5) + 16}" font-size="12" font-weight="600">먹는 약 구역</text>`;
      o += `<text x="${sx(x0) + 8}" y="${sy(5) + 31}" font-size="11" class="t-mono t-muted">MW ≤ 500 · logP ≤ 5</text>`;
      /* 격자 · 눈금 */
      for (const v of ticks(x0, x1, W < 500 ? 200 : 100)) o += `<line x1="${sx(v)}" x2="${sx(v)}" y1="${m.t}" y2="${H - m.b}" stroke="var(--line)"/><text x="${sx(v)}" y="${H - m.b + 16}" font-size="11" text-anchor="middle" class="t-mono t-muted">${v}</text>`;
      for (const v of ticks(-2, y1, 1)) o += `<line x1="${m.l}" x2="${W - m.r}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--line)"/><text x="${m.l - 6}" y="${sy(v) + 4}" font-size="11" text-anchor="end" class="t-mono t-muted">${v}</text>`;
      o += `<text x="${W - m.r}" y="${H - 8}" font-size="11.5" text-anchor="end" class="t-muted">분자량 MW (Da) →</text>`;
      o += `<text x="${m.l}" y="${m.t - 5}" font-size="11.5" class="t-muted">↑ logP (기름 친화도)</text>`;
      /* 내 MW 상한 */
      if (step >= 2) {
        o += `<line x1="${sx(S.mwMax)}" x2="${sx(S.mwMax)}" y1="${m.t}" y2="${H - m.b}" stroke="var(--f2)" stroke-width="1.5"/>`;
        o += `<text x="${sx(S.mwMax) + 5}" y="${H - m.b - 8}" font-size="11" class="t-mono">내 상한 ${S.mwMax}</text>`;
      }
      /* 점 — 탈락 → 남음 → 선정 순으로 위에 쌓는다 */
      const pts = X.map((c) => ({ c, fi: shown(c, step) })).sort((a, b) => (a.fi === 7) - (b.fi === 7) || (a.fi === 0) - (b.fi === 0));
      for (const { c, fi } of pts) {
        const lp = Math.max(y0, Math.min(y1, c.logp));
        const big = fi === 7;
        o += `<circle data-cid="${c.id}" cx="${sx(c.mw).toFixed(1)}" cy="${sy(lp).toFixed(1)}" r="${big ? 6 : 3.4}" fill="${fill(fi)}" opacity="${fi === 0 ? 0.45 : big ? 1 : 0.85}" stroke="${big ? "var(--hit-ring)" : "var(--surface)"}" stroke-width="${big ? 1.5 : 1}"/>`;
      }
      el.innerHTML = ctx.svg(W, H, o);
    }
  });

  /* 12 히스토그램 가위 — 네 가지 물성 분포에 컷 선 */
  SV.add({
    id: "12",
    line: "물성마다 분자들이 어디에 몰려 있는지 막대로 쌓았습니다. 가위 선 바깥 빗금 부분이 그 관문에서 잘려 나가는 분자예요.",
    render(el, ctx) {
      const { X, S, step } = ctx;
      const W = Math.max(320, el.clientWidth), one = W < 640;
      const pw = one ? W - 24 : (W - 36) / 2, ph = 200;
      const P = [
        { k: "mw", g: 2, name: "분자량 MW", unit: "Da", lo: 50, hi: 700, bw: 25, v: (c) => c.mw, cut: S.mwMax, keep: "le", fail: (c) => !c.p.mw, step: 100 },
        { k: "tpsa", g: 2, name: "극성 TPSA", unit: "Å²", lo: 0, hi: 210, bw: 10, v: (c) => c.tpsa, cut: S.tpsaMax, keep: "le", fail: (c) => !c.p.tpsa, step: 30 },
        { k: "ro5", g: 3, name: "Ro5 위반 수", unit: "개", lo: -0.5, hi: 3.5, bw: 1, v: (c) => c.ro5, cut: S.ro5Max + 0.5, keep: "le", fail: (c) => !c.p.ro5, step: 1, disc: true },
        { k: "qed", g: 5, name: "약다움 QED", unit: "", lo: 0, hi: 1, bw: 0.05, v: (c) => c.qed, cut: S.qedMin, keep: "ge", fail: (c) => !c.p.qed, step: 0.2 }
      ];
      const panel = (p) => {
        const m = { l: 34, r: 10, t: 34, b: 30 }, w = pw, h = ph;
        const nb = Math.round((p.hi - p.lo) / p.bw);
        const bins = Array.from({ length: nb }, () => ({ prior: [], cut: [], kept: [] }));
        const live = p.g <= step;
        for (const c of X) {
          const i = Math.max(0, Math.min(nb - 1, Math.floor((p.v(c) - p.lo) / p.bw)));
          if (live && c.f < p.g) bins[i].prior.push(c);
          else if (live && c.f === p.g && p.fail(c)) bins[i].cut.push(c);
          else bins[i].kept.push(c);
        }
        const mx = Math.max(...bins.map((b) => b.prior.length + b.cut.length + b.kept.length), 1);
        const sx = (v) => m.l + ((v - p.lo) / (p.hi - p.lo)) * (w - m.l - m.r);
        const sy = (n) => h - m.b - (n / mx) * (h - m.t - m.b);
        const cutN = bins.reduce((s, b) => s + b.cut.length, 0);
        const pid = `h12-${p.k}`;
        let o = `<defs><pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--f${p.g})" opacity="0.18"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--f${p.g})" stroke-width="2.2"/></pattern></defs>`;
        o += `<text x="0" y="14" font-size="12.5" font-weight="600">${CIRC[p.g - 1]} ${p.name}</text>`;
        o += `<text x="${w}" y="14" font-size="11.5" text-anchor="end" class="t-mono ${live ? "" : "t-muted"}">${live ? `✂ 잘림 ${cutN}개` : "아직 이 관문 전"}</text>`;
        /* 잘려 나가는 쪽 바탕 */
        const cx = sx(p.cut);
        const zx = p.keep === "le" ? cx : m.l, zw = p.keep === "le" ? w - m.r - cx : cx - m.l;
        if (zw > 0) o += `<rect x="${zx}" y="${m.t}" width="${zw}" height="${h - m.t - m.b}" fill="var(--f${p.g})" opacity="${live ? 0.07 : 0.03}"/>`;
        o += `<line x1="${m.l}" x2="${w - m.r}" y1="${h - m.b}" y2="${h - m.b}" stroke="var(--line-strong)"/>`;
        const bwp = (w - m.l - m.r) / nb;
        bins.forEach((b, i) => {
          const x = m.l + i * bwp + 1, bw = Math.max(1, bwp - 2);
          let n = 0;
          const seg = (arr, f) => {
            if (!arr.length) return "";
            const y = sy(n + arr.length), hh = sy(n) - y; n += arr.length;
            return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0.5, hh - 1).toFixed(1)}" ${f}><title>${arr.length}개</title></rect>`;
          };
          o += seg(b.kept, `fill="var(--fg)" opacity="${live ? 0.72 : 0.3}"`);
          o += seg(b.cut, `fill="url(#${pid})" stroke="var(--f${p.g})" stroke-width="1"`);
          o += seg(b.prior, `fill="var(--faint)" opacity="0.35"`);
        });
        /* 가위 선 */
        o += `<line x1="${cx}" x2="${cx}" y1="${m.t - 10}" y2="${h - m.b + 4}" stroke="var(--fg)" stroke-width="1.6" stroke-dasharray="${live ? "0" : "4 3"}" opacity="${live ? 1 : 0.4}"/>`;
        o += `<text x="${cx}" y="${m.t - 13}" font-size="13" text-anchor="middle" opacity="${live ? 1 : 0.4}">✂</text>`;
        const lbl = p.disc ? `${S.ro5Max}개까지` : `${p.keep === "le" ? "≤" : "≥"} ${p.k === "qed" ? p.cut.toFixed(2) : p.cut}`;
        const left = p.keep === "le" ? cx - 12 : cx + 12;
        o += `<text x="${left}" y="${m.t - 9}" font-size="11" text-anchor="${p.keep === "le" ? "end" : "start"}" class="t-mono">${lbl}</text>`;
        for (const v of ticks(p.disc ? 0 : p.lo, p.disc ? 3 : p.hi, p.step)) o += `<text x="${sx(v)}" y="${h - m.b + 15}" font-size="10.5" text-anchor="middle" class="t-mono t-muted">${p.k === "qed" ? v.toFixed(1) : v}</text>`;
        o += `<text x="${w - m.r}" y="${h - 3}" font-size="10.5" text-anchor="end" class="t-muted">${p.unit}</text>`;
        o += `<text x="${m.l - 6}" y="${m.t + 6}" font-size="10.5" text-anchor="end" class="t-mono t-muted">${mx}</text>`;
        return `<div style="min-width:0">${ctx.svg(w, h, o)}</div>`;
      };
      el.innerHTML = `<div style="display:grid;grid-template-columns:${one ? "1fr" : "1fr 1fr"};gap:18px 24px;padding:14px 12px">${P.map(panel).join("")}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px 16px;padding:0 12px 12px;font-size:12px;color:var(--muted)">
          <span><b style="display:inline-block;width:10px;height:10px;background:var(--fg);opacity:.72"></b> 이 물성으로는 통과</span>
          <span><b style="display:inline-block;width:10px;height:10px;border:1px solid var(--muted);background:repeating-linear-gradient(45deg,var(--muted) 0 2px,transparent 2px 5px)"></b> 이 관문에서 잘림</span>
          <span><b style="display:inline-block;width:10px;height:10px;background:var(--faint);opacity:.5"></b> 앞 관문에서 이미 빠짐</span></div>`;
    }
  });

  /* 13 평행 좌표 — 분자 하나 = 선 하나 */
  SV.add({
    id: "13",
    line: "분자 하나가 왼쪽에서 오른쪽으로 이어지는 선 하나입니다. 축마다 칠한 띠(허용 구간)를 모두 지나는 선만 살아남아요.",
    render(el, ctx) {
      const { X, S, step, PAL } = ctx;
      const H = 460;
      const { cv, g, w } = ctx.canvas(el, H);
      const hitScores = X.filter((c) => c.f === 7).map((c) => c.score);
      const thr = hitScores.length ? Math.min(...hitScores) : 1;
      const A = [
        { n: "MW", u: "Da", lo: 0, hi: 700, ok: [0, S.mwMax], v: (c) => c.mw, g: 2 },
        { n: "TPSA", u: "Å²", lo: 0, hi: 210, ok: [0, S.tpsaMax], v: (c) => c.tpsa, g: 2 },
        { n: "Ro5 위반", u: "개", lo: -0.4, hi: 3.4, ok: [-0.3, S.ro5Max + 0.3], v: (c) => c.ro5, g: 3, disc: [0, 3] },
        { n: "구조 경고", u: "개", lo: -0.4, hi: 2.4, ok: [-0.3, (S.noAlerts ? 0 : 2) + 0.3], v: (c) => c.al.length, g: 4, disc: [0, 2] },
        { n: "QED", u: "", lo: 0, hi: 1, ok: [S.qedMin, 1], v: (c) => c.qed, g: 5 },
        { n: `${ctx.gene} 점수`, u: "", lo: 0, hi: 1, ok: [thr, 1], v: (c) => c.score, g: 6 }
      ];
      const m = { l: 34, r: 34, t: 54, b: 34 };
      const ax = (i) => m.l + (i * (w - m.l - m.r)) / (A.length - 1);
      const ay = (a, v) => H - m.b - ((Math.max(a.lo, Math.min(a.hi, v)) - a.lo) / (a.hi - a.lo)) * (H - m.t - m.b);
      const rnd = ctx.rng(13);
      /* 정수 축(Ro5 · 경고)은 선이 한 점에 몰리지 않게 살짝 흩뜨린다 */
      const P = X.map((c) => ({ c, fi: shown(c, step), ys: A.map((a) => ay(a, a.v(c) + (a.disc ? (rnd() - 0.5) * 0.5 : 0))) }));
      let hover = null;
      const line = (p, col, lw, alpha) => {
        g.globalAlpha = alpha; g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
        p.ys.forEach((y, i) => (i ? g.lineTo(ax(i), y) : g.moveTo(ax(i), y))); g.stroke();
      };
      function draw() {
        g.globalAlpha = 1; g.clearRect(0, 0, w, H);
        /* 허용 띠 */
        A.forEach((a, i) => {
          const on = a.g <= step, x = ax(i), y1 = ay(a, a.ok[1]), y0 = ay(a, a.ok[0]);
          g.globalAlpha = on ? 0.5 : 0.18; g.fillStyle = PAL.hi; g.fillRect(x - 7, Math.min(y0, y1), 14, Math.max(2, Math.abs(y0 - y1)));
          g.globalAlpha = 1; g.strokeStyle = PAL.lineStrong; g.lineWidth = 1; g.beginPath(); g.moveTo(x, m.t); g.lineTo(x, H - m.b); g.stroke();
        });
        for (const p of P) if (p.fi && p.fi < 6) line(p, PAL.f[p.fi], 1, 0.28);
        for (const p of P) if (p.fi === 6) line(p, PAL.f[6], 1, 0.4);
        for (const p of P) if (p.fi === 0) line(p, PAL.muted, 1, 0.3);
        for (const p of P) if (p.fi === 7) { line(p, PAL.hitRing, 4.5, 0.9); line(p, PAL.f[7], 2.5, 1); }
        if (hover) { line(hover, PAL.fg, 4, 1); line(hover, hover.fi ? PAL.f[hover.fi] : PAL.muted, 2.2, 1); }
        g.globalAlpha = 1;
        A.forEach((a, i) => {
          const x = ax(i), al = i === 0 ? "left" : i === A.length - 1 ? "right" : "center";
          g.textAlign = al; g.fillStyle = PAL.fg; g.font = `600 12px ${SANS}`;
          g.fillText(`${CIRC[a.g - 1]} ${a.n}`, x + (i === 0 ? -6 : i === A.length - 1 ? 6 : 0), 20);
          g.fillStyle = PAL.muted; g.font = `11px ${MONO}`;
          const r = a.g === 6 ? `≥ ${a.ok[0].toFixed(2)}` : a.disc ? `≤ ${Math.round(a.ok[1] - 0.3)}` : a.ok[0] > a.lo ? `≥ ${a.ok[0]}` : `≤ ${a.ok[1]}`;
          g.fillText(a.g <= step ? r : "아직", x + (i === 0 ? -6 : i === A.length - 1 ? 6 : 0), 37);
          g.textAlign = "center";
          g.fillText(String(a.disc ? a.disc[1] : a.hi), x, m.t - 4); g.fillText(String(a.disc ? a.disc[0] : a.lo), x, H - m.b + 15);
        });
      }
      draw();
      let alive = true;
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alive && draw());
      cv.addEventListener("pointermove", (e) => {
        const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
        const seg = Math.max(0, Math.min(A.length - 2, Math.floor((px - m.l) / ((w - m.l - m.r) / (A.length - 1)))));
        const t = Math.max(0, Math.min(1, (px - ax(seg)) / (ax(seg + 1) - ax(seg))));
        let best = null, bd = 8;
        for (const p of P) { const d = Math.abs(p.ys[seg] + (p.ys[seg + 1] - p.ys[seg]) * t - py); if (d < bd || (d === bd && p.fi === 7)) { bd = d; best = p; } }
        if (best !== hover) { hover = best; draw(); }
        if (best) ctx.tip(e, best.c); else ctx.hideTip();
      });
      cv.addEventListener("pointerleave", () => { hover = null; draw(); ctx.hideTip(); });
      return () => { alive = false; };
    }
  });

  /* 14 체크 매트릭스 — 행 = 분자, 열 = 기준. 처음 걸린 칸에서 멈추는 계단 */
  SV.add({
    id: "14",
    line: "한 줄이 분자 하나, 한 칸이 검사 하나입니다. 왼쪽부터 검사하다 처음 걸린 칸에 색이 칠해지고, 그 뒤 검사는 하지 않아요.",
    render(el, ctx) {
      const { X, step, PAL, DROP, FATE_SHORT } = ctx;
      const rows = [...X].sort(ORD);
      const n = rows.length, rh = 2.4, top = 40;
      const H = Math.round(top + n * rh + 14);
      const { cv, g, w } = ctx.canvas(el, H);
      const labW = w < 520 ? 92 : 132;
      const C = [
        { n: "① 상자", g: 1, ok: (c) => c.p.lib },
        { n: "② MW", g: 2, ok: (c) => c.p.mw },
        { n: "② TPSA", g: 2, ok: (c) => c.p.tpsa },
        { n: "③ Ro5", g: 3, ok: (c) => c.p.ro5 },
        { n: "④ 경고", g: 4, ok: (c) => c.p.alert },
        { n: "⑤ QED", g: 5, ok: (c) => c.p.qed },
        { n: "⑥ 순위", g: 6, ok: (c) => c.f === 7 }
      ];
      const cw = (w - labW - 8) / C.length;
      let hov = -1;
      function draw() {
        g.clearRect(0, 0, w, H);
        g.font = `600 11.5px ${SANS}`; g.textAlign = "center"; g.fillStyle = PAL.fg;
        C.forEach((col, j) => { g.globalAlpha = col.g <= step ? 1 : 0.4; g.fillText(w < 520 ? col.n.split(" ")[1] : col.n, labW + j * cw + cw / 2, 18); });
        g.font = `10.5px ${MONO}`; g.fillStyle = PAL.muted;
        C.forEach((col, j) => { g.globalAlpha = col.g <= step ? 1 : 0.4; g.fillText(col.g <= step ? "검사" : "아직", labW + j * cw + cw / 2, 32); });
        g.globalAlpha = 1;
        rows.forEach((c, i) => {
          const y = top + i * rh;
          let stopped = false;
          C.forEach((col, j) => {
            const x = labW + j * cw + 1, ww = cw - 2;
            if (col.g > step) { g.fillStyle = PAL.line; g.fillRect(x, y, ww, rh - 0.6); return; }
            if (stopped) return;
            const ok = col.ok(c);
            if (ok) { g.fillStyle = PAL.raise; g.fillRect(x, y, ww, rh - 0.6); }
            else {
              stopped = true;
              const fi = col.g === 6 ? (c.f === 7 ? 7 : 6) : c.f;
              g.fillStyle = PAL.f[fi]; g.fillRect(x, y, ww, rh - 0.6);
            }
            if (ok && col.g === 6) { g.fillStyle = PAL.f[7]; g.fillRect(x, y, ww, rh - 0.6); }
          });
        });
        /* 운명 묶음 라벨 */
        let i0 = 0;
        for (const f of [7, 6, 5, 4, 3, 2, 1]) {
          const k = DROP[f]; if (!k) continue;
          const y0 = top + i0 * rh, y1 = top + (i0 + k) * rh; i0 += k;
          g.strokeStyle = PAL.lineStrong; g.lineWidth = 1; g.beginPath(); g.moveTo(labW - 6, y0 + 1); g.lineTo(labW - 10, y0 + 1); g.lineTo(labW - 10, y1 - 1); g.lineTo(labW - 6, y1 - 1); g.stroke();
          g.fillStyle = PAL.f[f]; g.fillRect(0, (y0 + y1) / 2 - 5, 9, 9);
          if (f === 7) { g.strokeStyle = PAL.hitRing; g.strokeRect(0.5, (y0 + y1) / 2 - 4.5, 8, 8); }
          g.fillStyle = PAL.fg; g.textAlign = "left"; g.font = `600 11.5px ${SANS}`;
          g.fillText(FATE_SHORT[f], 14, (y0 + y1) / 2 + 3);
          g.fillStyle = PAL.muted; g.font = `11px ${MONO}`; g.textAlign = "right";
          if (y1 - y0 >= 22 || f === 7) g.fillText(String(k), labW - 14, (y0 + y1) / 2 + 3 + (y1 - y0 < 14 ? 0 : 0));
        }
        if (hov >= 0) { g.strokeStyle = PAL.fg; g.lineWidth = 1.5; g.strokeRect(labW, top + hov * rh - 1, w - labW - 8, rh + 2); }
      }
      draw();
      let alive = true;
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alive && draw());
      cv.addEventListener("pointermove", (e) => {
        const r = cv.getBoundingClientRect(), py = e.clientY - r.top, px = e.clientX - r.left;
        const i = Math.floor((py - top) / rh);
        const ok = px >= labW && i >= 0 && i < n;
        if ((ok ? i : -1) !== hov) { hov = ok ? i : -1; draw(); }
        if (ok) ctx.tip(e, rows[i]); else ctx.hideTip();
      });
      cv.addEventListener("pointerleave", () => { hov = -1; draw(); ctx.hideTip(); });
      return () => { alive = false; };
    }
  });

  /* 15 신호등 명단 — 분자마다 다섯 개 신호등 */
  let only15 = "all";
  SV.add({
    id: "15",
    line: "분자마다 신호등 다섯 개(②~⑥)가 있어요. 처음 빨간불처럼 색이 켜진 곳에서 멈추고, 끝까지 통과하면 마지막 불이 라임색으로 켜집니다.",
    render(el, ctx) {
      const { X, step, FATE_SHORT, DROP } = ctx;
      el.classList.add("scroll"); el.style.maxHeight = "560px";
      const draw = () => {
        const list = [...X].sort(ORD).filter((c) => only15 === "all" || (only15 === "hit" ? c.f === 7 : c.f <= 5));
        const light = (c, gn) => {
          const fi = shown(c, step);
          if (gn > step) return `<i class="l15 wait" title="아직"></i>`;
          if (c.f === 1) return `<i class="l15 off"></i>`;
          if (gn === 6 && fi === 7) return `<i class="l15 on hit" data-f="7" title="선정"></i>`;
          if (c.f > gn) return `<i class="l15 pass" title="통과">✓</i>`;
          if (c.f === gn) return `<i class="l15 on" data-f="${gn}" title="${FATE_SHORT[gn]}"></i>`;
          if (gn === 6 && fi === 7) return `<i class="l15 on hit" data-f="7" title="선정"></i>`;
          return `<i class="l15 off"></i>`;
        };
        const res = (c) => {
          const fi = shown(c, step);
          return fi ? `<span class="chip15" data-f="${fi}"><i></i>${FATE_SHORT[fi]}</span>` : `<span class="chip15 muted">남음</span>`;
        };
        el.innerHTML = `<style>
          .t15 { font-size: 12.5px; }
          .t15 .bar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; padding: 10px 12px; background: var(--surface); border-bottom: 1px solid var(--line-strong); }
          .t15 .seg15 { display: flex; border: 1px solid var(--line-strong); }
          .t15 .seg15 button { border: 0; background: transparent; padding: 4px 10px; font-size: 12px; }
          .t15 .seg15 button + button { border-left: 1px solid var(--line-strong); }
          .t15 .seg15 button[aria-pressed="true"] { background: var(--fg); color: var(--bg); }
          .t15 .hd, .t15 .r { display: grid; grid-template-columns: 38px minmax(0, 1fr) repeat(5, 22px) 92px; gap: 6px; align-items: center; padding: 4px 12px; }
          .t15 .hd { font-family: var(--mono); font-size: 10.5px; color: var(--muted); text-align: center; border-bottom: 1px solid var(--line); }
          .t15 .hd span:nth-child(2) { text-align: left; }
          .t15 .r { border-bottom: 1px solid var(--line); }
          .t15 .r:hover { background: var(--raise); }
          .t15 .r .no { font-family: var(--mono); font-size: 11px; color: var(--muted); text-align: right; }
          .t15 .r .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .t15 .r[data-hit] .nm { font-weight: 600; }
          .l15 { width: 16px; height: 16px; border-radius: 50%; display: grid; place-items: center; justify-self: center; font-style: normal; font-size: 10px; line-height: 1; color: var(--muted); }
          .l15.pass { border: 1px solid var(--line-strong); background: var(--raise); }
          .l15.off { border: 1px dashed var(--line-strong); }
          .l15.wait { border: 1px dotted var(--line); }
          .l15.on { background: var(--c); }
          .l15.hit { box-shadow: 0 0 0 1.5px var(--hit-ring); }
          .chip15 { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; white-space: nowrap; }
          .chip15 i { width: 9px; height: 9px; background: var(--c); }
          .chip15[data-f="7"] i { outline: 1.5px solid var(--hit-ring); outline-offset: -1.5px; }
          @media (max-width: 520px) { .t15 .hd, .t15 .r { grid-template-columns: 26px minmax(0, 1fr) repeat(5, 18px) 64px; gap: 4px; padding-inline: 8px; } .l15 { width: 14px; height: 14px; } }
        </style>
        <div class="t15"><div class="bar"><div class="seg15" role="group" aria-label="보기">
          ${[["hit", `선정만 ${DROP[7]}`], ["all", `전체 ${X.length}`], ["out", "탈락만"]].map(([k, t]) => `<button type="button" data-o15="${k}" aria-pressed="${only15 === k}">${t}</button>`).join("")}
          </div><span class="muted">✓ 통과 · 색 = 처음 걸린 관문 · 점선 = 검사 안 함</span></div>
          <div class="hd"><span>#</span><span>분자</span><span>②</span><span>③</span><span>④</span><span>⑤</span><span>⑥</span><span>결과</span></div>
          ${list.map((c, i) => `<div class="r" data-cid="${c.id}" ${c.f === 7 && step >= 6 ? "data-hit" : ""}><span class="no">${c.rank && c.rank <= 999 && c.f >= 6 ? c.rank : i + 1}</span><span class="nm">${ctx.esc(c.n)}</span>${[2, 3, 4, 5, 6].map((gn) => light(c, gn)).join("")}<span>${res(c)}</span></div>`).join("")}
          ${list.length ? "" : `<p class="muted" style="padding:16px 12px">해당하는 분자가 없습니다.</p>`}
        </div>`;
        el.querySelectorAll("[data-o15]").forEach((b) => b.addEventListener("click", () => { only15 = b.dataset.o15; draw(); }));
      };
      draw();
    }
  });

  /* 16 분자 카드 더미 — 방금 걸린 카드에 '탈락' 도장 */
  const CARD_CSS = `<style>
    .c16 { display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 18px; padding: 16px; align-items: start; }
    .c16 .pile { position: sticky; top: 0; display: flex; flex-direction: column; gap: 10px; }
    .c16 .stack { position: relative; height: 150px; }
    .c16 .stack b { position: absolute; inset: 0; border: 1px solid var(--line-strong); background: var(--surface); }
    .c16 .stack .top { display: grid; place-items: center; text-align: center; font-family: var(--mono); font-size: 30px; font-weight: 600; }
    .c16 .stack .top small { display: block; font-family: var(--sans); font-size: 12px; font-weight: 500; color: var(--muted); }
    .c16 .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; min-width: 0; }
    .c16 .card { position: relative; border: 1px solid var(--line-strong); background: var(--bg); padding: 8px 9px 9px; display: flex; flex-direction: column; gap: 3px; min-width: 0; overflow: hidden; }
    .c16 .card .molbox { height: 76px; }
    .c16 .card h5 { margin: 0; font-size: 12px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .c16 .card p { margin: 0; font-family: var(--mono); font-size: 10.5px; color: var(--muted); line-height: 1.35; }
    .c16 .stamp { position: absolute; right: 6px; top: 8px; transform: rotate(-12deg); border: 2px solid var(--c); color: var(--fg); background: color-mix(in srgb, var(--c) 22%, var(--bg)); font-weight: 700; font-size: 12px; padding: 0 6px; letter-spacing: 0.08em; }
    .c16 .card.hit { border-color: var(--hit-ring); box-shadow: inset 0 0 0 1px var(--hit-ring); }
    .c16 .more { display: grid; place-items: center; border: 1px dashed var(--line-strong); color: var(--muted); font-size: 12px; min-height: 120px; }
    .c16 h4 { grid-column: 1 / -1; margin: 4px 0 0; font-size: 13px; }
    @media (max-width: 560px) { .c16 { grid-template-columns: minmax(0, 1fr); } .c16 .pile { position: static; flex-direction: row; align-items: center; } .c16 .stack { width: 120px; height: 96px; flex: none; } .c16 .cards { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); } }
  </style>`;
  SV.add({
    id: "16",
    line: "관문을 지날 때마다 걸린 분자 카드에 '탈락' 도장이 찍혀 옆으로 빠집니다. 왼쪽 더미는 아직 살아남은 카드 수예요.",
    render(el, ctx) {
      const { X, step, REM, GATES, FATE_SHORT, esc } = ctx;
      el.classList.add("scroll"); el.style.maxHeight = "600px";
      const card = (c, stamp, f) => `<div class="card ${f === 7 ? "hit" : ""}" data-cid="${c.id}" data-f="${f}">${ctx.mol(c.s, 150, 76)}<h5>${esc(c.n)}</h5><p>${esc(ctx.reason(c))}</p><span class="stamp">${stamp}</span></div>`;
      const pile = (n, sub) => `<div class="stack">${[3, 2, 1].map((d) => `<b style="transform:translate(${d * 4}px,${d * 4}px);opacity:${0.9 - d * 0.2}"></b>`).join("")}<b class="top"><span>${n}<small>${sub}</small></span></b></div>`;
      let body;
      if (step === 0) {
        const sample = [...X].sort((a, b) => b.score - a.score).slice(0, 8);
        body = `<h4>출발선 — 아직 아무도 떨어지지 않았어요</h4>${sample.map((c) => `<div class="card" data-cid="${c.id}">${ctx.mol(c.s, 150, 76)}<h5>${esc(c.n)}</h5><p>${esc(c.lib)}</p></div>`).join("")}<div class="more">외 ${X.length - 8}장</div>`;
      } else if (step < 6) {
        const out = X.filter((c) => c.f === step).sort((a, b) => b.score - a.score);
        const g = GATES[step - 1];
        body = `<h4>${CIRC[step - 1]} ${g.name}에서 방금 걸린 카드 ${out.length}장</h4>` +
          (out.length ? out.slice(0, 24).map((c) => card(c, "탈락", step)).join("") + (out.length > 24 ? `<div class="more">외 ${out.length - 24}장</div>` : "")
            : `<div class="more" style="grid-column:1/-1">이 관문에서는 한 장도 걸리지 않았어요.</div>`);
      } else {
        const hits = X.filter((c) => c.f === 7).sort((a, b) => a.rank - b.rank);
        const wait = X.filter((c) => c.f === 6).sort((a, b) => a.rank - b.rank);
        body = `<h4>선정 ${hits.length}장 — 도킹실로</h4>${hits.map((c) => card(c, `${c.rank}위`, 7)).join("")}` +
          (wait.length ? `<h4>순위 밖 대기 ${wait.length}장 (위에서 6장)</h4>${wait.slice(0, 6).map((c) => card(c, "대기", 6)).join("")}${wait.length > 6 ? `<div class="more">외 ${wait.length - 6}장</div>` : ""}` : "");
      }
      el.innerHTML = `${CARD_CSS}<div class="c16"><div class="pile">${pile(step >= 6 ? REM[6] : REM[step], step >= 6 ? "장 선정" : "장 살아남음")}<span class="muted" style="font-size:12px">출발 ${X.length}장 중<br>${step ? `${CIRC[Math.min(step, 6) - 1]}까지 지남` : "아직 출발 전"}</span></div><div class="cards">${body}</div></div>`;
    }
  });

  /* 17 결승 갤러리 — 선정 분자 큰 카드 */
  SV.add({
    id: "17",
    line: "모든 관문을 통과하고 점수 순위 안에 든 결승 진출 분자들입니다. 이 분자들이 다음 단계 도킹실로 가요.",
    render(el, ctx) {
      const { X, S, step, esc } = ctx;
      el.classList.add("scroll"); el.style.maxHeight = "640px";
      const final = step >= 6;
      const alive = X.filter((c) => c.f > step).sort((a, b) => b.score - a.score);
      const top = alive.slice(0, S.topN), next = alive.slice(S.topN, S.topN + 5);
      const mx = Math.max(...X.map((c) => c.score), 0.01);
      const chip = (k, v, ok, f) => `<span class="ch17" ${ok ? "" : `style="border-color:var(--f${f});box-shadow:inset 0 0 0 1px var(--f${f})"`}><em>${k}</em> ${v}</span>`;
      const big = (c, i) => `<article class="g17 ${final ? "hit" : "tent"}" data-cid="${c.id}">
          <div class="rk"><b>${i + 1}</b><span>위</span></div>
          ${ctx.mol(c.s, 240, 140)}
          <h5>${esc(c.n)}</h5><div class="id">${esc(c.id)} · ${esc(c.lib)}</div>
          <div class="sb"><i style="width:${((c.score / mx) * 100).toFixed(1)}%"></i></div>
          <div class="sv"><span>${ctx.gene} 점수</span><b>${c.score.toFixed(3)}</b></div>
          <div class="chs">${chip("MW", c.mw.toFixed(0), c.p.mw, 2)}${chip("TPSA", c.tpsa.toFixed(0), c.p.tpsa, 2)}${chip("QED", c.qed.toFixed(2), c.p.qed, 5)}</div></article>`;
      el.innerHTML = `<style>
        .w17 { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
        .w17 h4 { margin: 0; font-size: 13px; display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
        .w17 h4 small { font-weight: 400; color: var(--muted); }
        .grid17 { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .g17 { position: relative; border: 1px solid var(--line-strong); background: var(--bg); padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .g17.hit { border: 1.5px solid var(--hit-ring); }
        .g17.tent { border-style: dashed; }
        .g17 .rk { position: absolute; left: 0; top: 0; background: var(--f7); color: var(--hi-fg); padding: 2px 8px 3px; display: flex; align-items: baseline; gap: 2px; }
        .g17.tent .rk { background: var(--raise); color: var(--fg); }
        .g17 .rk b { font-family: var(--mono); font-size: 18px; }
        .g17 .rk span { font-size: 11px; }
        .g17 .molbox { height: 130px; margin-top: 14px; }
        .g17 h5 { margin: 4px 0 0; font-size: 13.5px; line-height: 1.3; min-height: 2.6em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .g17 .id { font-family: var(--mono); font-size: 10.5px; color: var(--muted); }
        .g17 .sb { height: 6px; background: var(--raise); margin-top: 6px; }
        .g17 .sb i { display: block; height: 100%; background: var(--fg); }
        .g17.hit .sb i { background: var(--f7); box-shadow: inset 0 0 0 1px var(--hit-ring); }
        .g17 .sv { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--muted); }
        .g17 .sv b { font-family: var(--mono); color: var(--fg); }
        .g17 .chs { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
        .ch17 { font-family: var(--mono); font-size: 11px; border: 1px solid var(--line-strong); padding: 0 5px; }
        .ch17 em { font-style: normal; color: var(--muted); }
        .near17 { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; opacity: 0.55; }
        .near17 .n { border: 1px dashed var(--line-strong); padding: 6px 8px; font-size: 12px; min-width: 0; }
        .near17 .n .molbox { height: 60px; }
        .near17 .n div:last-child { font-family: var(--mono); font-size: 10.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      </style>
      <div class="w17">
        <h4>${final ? `결승 진출 ${top.length}개 — 도킹실로` : `지금 점수 1~${S.topN}위`} <small>${final ? `${ctx.gene} 표적 점수 순` : `아직 확정 아님 · ⑥ 순위 관문을 지나야 정해져요 (남은 ${alive.length}개 중)`}</small></h4>
        ${top.length ? `<div class="grid17">${top.map(big).join("")}</div>` : `<p class="muted">조건을 모두 통과한 분자가 없습니다. 왼쪽에서 조건을 느슨하게 바꿔 보세요.</p>`}
        ${next.length ? `<h4>아쉽게 순위 밖 <small>${S.topN + 1}~${S.topN + next.length}위</small></h4><div class="near17">${next.map((c, i) => `<div class="n" data-cid="${c.id}">${ctx.mol(c.s, 150, 60)}<div>${S.topN + i + 1}위 · ${esc(c.n)}</div><div>점수 ${c.score.toFixed(3)}</div></div>`).join("")}</div>` : ""}
      </div>`;
    }
  });

  /* 18 순위 사다리 — 점수 순 막대와 도킹실 컷 */
  SV.add({
    id: "18",
    line: "남은 분자를 표적 점수가 높은 순서대로 줄 세웠습니다. 굵은 선 위쪽만 도킹실로 들어가요.",
    render(el, ctx) {
      const { X, S, step } = ctx;
      const W = Math.max(320, el.clientWidth);
      const list = X.filter((c) => c.f > Math.min(step, 5)).sort((a, b) => b.score - a.score);
      const N = Math.min(S.topN, list.length);
      const big = Math.min(list.length, N + 5), bh = 17;
      const rest = list.length - big, budget = 260;
      const sh = rest ? Math.max(1.2, Math.min(6, budget / rest)) : 0;
      const m = { l: 10, r: 14, t: 34 }, nameW = W < 520 ? 132 : 210;
      const H = Math.round(m.t + big * bh + rest * sh + 60);
      const bx = m.l + nameW, bw = W - bx - m.r - 44;
      const mx = Math.max(...list.map((c) => c.score), 0.01);
      const final = step >= 6;
      let o = `<text x="${m.l}" y="16" font-size="12" font-weight="600">${ctx.gene} 점수 순위</text><text x="${W - m.r}" y="16" font-size="11.5" text-anchor="end" class="t-mono t-muted">남은 ${list.length}개 · 점수 0 → ${mx.toFixed(2)}</text>`;
      let y = m.t;
      list.forEach((c, i) => {
        const h = i < big ? bh : sh, inTop = i < N;
        const fi = inTop ? (final ? 7 : 0) : final ? 6 : 0;
        const len = (c.score / mx) * bw;
        o += `<rect data-cid="${c.id}" x="${bx}" y="${(y + (i < big ? 2 : 0)).toFixed(1)}" width="${Math.max(1, len).toFixed(1)}" height="${Math.max(0.8, h - (i < big ? 4 : 0.4)).toFixed(1)}" fill="${inTop ? "var(--f7)" : fi === 6 ? "var(--f6)" : "var(--fg)"}" opacity="${inTop ? 1 : final ? 1 : 0.35}"${inTop ? ' stroke="var(--hit-ring)" stroke-width="1"' : ""}/>`;
        if (i < big) {
          const cap = W < 520 ? 10 : 26, nm = c.n.length > cap ? c.n.slice(0, cap - 1) + "…" : c.n;
          o += `<text x="${bx - 8}" y="${y + 12.5}" font-size="11.5" text-anchor="end" ${inTop ? 'font-weight="600"' : 'class="t-muted"'}>${i + 1}. ${ctx.esc(nm)}</text>`;
          o += `<text x="${bx + len + 5}" y="${y + 12.5}" font-size="10.5" class="t-mono t-muted">${c.score.toFixed(3)}</text>`;
        }
        y += h;
        if (i === N - 1) {
          o += `<line x1="${m.l}" x2="${W - m.r}" y1="${y + 1}" y2="${y + 1}" stroke="var(--fg)" stroke-width="2.5" ${final ? "" : 'stroke-dasharray="6 4"'}/>`;
          o += `<text x="${bx}" y="${y + 15}" font-size="12" font-weight="700">✂ 도킹실 컷 · 상위 ${S.topN}${final ? "" : " (예상)"}</text>`;
          y += 20;
        }
      });
      if (rest) o += `<text x="${bx - 8}" y="${m.t + big * bh + (N <= big ? 20 : 0) + rest * sh / 2 + 4}" font-size="11" text-anchor="end" class="t-muted">${big + 1}~${list.length}위 (촘촘히)</text>`;
      if (!list.length) o += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="t-muted">남은 분자가 없습니다.</text>`;
      el.innerHTML = ctx.svg(W, H, o);
    }
  });

  /* 19 탈락 이유 도넛 */
  SV.add({
    id: "19",
    line: "220개 분자가 어디서 떨어졌는지 한 바퀴로 나눴습니다. 조각이 클수록 그 관문에서 많이 걸린 거예요. 가운데 숫자가 끝까지 살아남은 수입니다.",
    render(el, ctx) {
      const { X, step, DROP, REM, FATE_SHORT } = ctx;
      const W = Math.max(320, el.clientWidth), narrow = W < 560;
      const nSeg = (step >= 6 ? 1 : 1) + [1, 2, 3, 4, 5, 6].filter((f) => f <= step && DROP[f]).length;
      const H = narrow ? 300 + nSeg * 22 : 440;
      const cx = W / 2, cy = narrow ? 140 : H / 2, R = narrow ? Math.min(118, W * 0.32) : Math.min(150, W * 0.27), r0 = R * 0.6;
      const total = X.length;
      const segs = [];
      for (const f of [1, 2, 3, 4, 5, 6]) if (f <= step && DROP[f]) segs.push({ f, n: DROP[f], name: FATE_SHORT[f] });
      if (step >= 6) { if (DROP[7]) segs.push({ f: 7, n: DROP[7], name: "선정" }); }
      else segs.push({ f: 0, n: REM[step], name: "아직 남음" });
      const arc = (a0, a1, ro, ri) => {
        const p = (a, rr) => `${(cx + rr * Math.sin(a)).toFixed(2)} ${(cy - rr * Math.cos(a)).toFixed(2)}`;
        const lg = a1 - a0 > Math.PI ? 1 : 0;
        if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4;
        return `M${p(a0, ro)} A${ro} ${ro} 0 ${lg} 1 ${p(a1, ro)} L${p(a1, ri)} A${ri} ${ri} 0 ${lg} 0 ${p(a0, ri)}Z`;
      };
      let o = `<defs><pattern id="p19" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--raise)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--line-strong)" stroke-width="1.5"/></pattern></defs>`;
      let a = 0;
      const labs = [];
      for (const s of segs) {
        const da = (s.n / total) * Math.PI * 2, a1 = a + da, mid = a + da / 2;
        const ids = (s.f ? X.filter((c) => (s.f === 7 ? c.f === 7 : c.f === s.f)) : X.filter((c) => c.f > step)).slice(0, 1);
        o += `<path d="${arc(a, a1, s.f === 7 ? R + 8 : R, r0)}" fill="${s.f ? `var(--f${s.f})` : "url(#p19)"}" stroke="var(--surface)" stroke-width="2"${s.f === 7 ? ' style="stroke:var(--hit-ring);stroke-width:1.5"' : ""}><title>${s.name} ${s.n}개</title></path>`;
        labs.push({ s, mid, side: Math.sin(mid) >= 0 ? 1 : -1, y: cy - (R + 26) * Math.cos(mid) });
        a = a1;
      }
      /* 라벨 겹침 풀기 — 좌우 따로 위에서 아래로 밀어낸다 */
      for (const side of [1, -1]) {
        const L = labs.filter((l) => l.side === side).sort((p, q) => p.y - q.y);
        for (let i = 1; i < L.length; i++) if (L[i].y - L[i - 1].y < 32) L[i].y = L[i - 1].y + 32;
        const over = L.length ? L[L.length - 1].y - (H - 20) : 0;
        if (over > 0) L.forEach((l) => (l.y -= over));
      }
      if (narrow) labs.forEach((l, i) => {
        const y = cy + R + 34 + i * 22, s = l.s;
        o += `<rect x="16" y="${y - 10}" width="11" height="11" fill="${s.f ? `var(--f${s.f})` : "url(#p19)"}"${s.f === 7 ? ' stroke="var(--hit-ring)"' : ""}/>`;
        o += `<text x="34" y="${y}" font-size="12.5" font-weight="600">${s.f && s.f < 7 ? CIRC[s.f - 1] + " " : ""}${s.name}</text>`;
        o += `<text x="${W - 16}" y="${y}" font-size="12" text-anchor="end" class="t-mono t-muted">${s.n}개 · ${((s.n / total) * 100).toFixed(1)}%</text>`;
      });
      else for (const l of labs) {
        const ex = cx + (R + 6) * Math.sin(l.mid), ey = cy - (R + 6) * Math.cos(l.mid);
        const lx = cx + l.side * (R + (narrow ? 22 : 40));
        o += `<polyline points="${ex.toFixed(1)},${ey.toFixed(1)} ${lx.toFixed(1)},${l.y.toFixed(1)} ${(lx + l.side * 8).toFixed(1)},${l.y.toFixed(1)}" fill="none" stroke="var(--line-strong)"/>`;
        const tx = lx + l.side * 12, an = l.side > 0 ? "start" : "end";
        o += `<text x="${tx.toFixed(1)}" y="${(l.y - 2).toFixed(1)}" font-size="12.5" font-weight="600" text-anchor="${an}">${l.s.f && l.s.f < 7 ? CIRC[l.s.f - 1] + " " : ""}${l.s.name}</text>`;
        o += `<text x="${tx.toFixed(1)}" y="${(l.y + 13).toFixed(1)}" font-size="11.5" text-anchor="${an}" class="t-mono t-muted">${l.s.n}개 · ${((l.s.n / total) * 100).toFixed(1)}%</text>`;
      }
      const centerN = step >= 6 ? DROP[7] : REM[step];
      o += `<text x="${cx}" y="${cy + 10}" font-size="${narrow ? 34 : 44}" font-weight="600" text-anchor="middle" class="t-mono">${centerN}</text>`;
      o += `<text x="${cx}" y="${cy + (narrow ? 30 : 34)}" font-size="12" text-anchor="middle" class="t-muted">${step >= 6 ? "선정" : "아직 남음"} / ${total}</text>`;
      el.innerHTML = ctx.svg(W, H, o);
    }
  });

  /* 20 트리맵 — 운명별 면적, 안에 분자 타일 */
  function squarify(items, x, y, w, h) {
    const out = [], total = items.reduce((s, i) => s + i.v, 0);
    let rest = items.filter((i) => i.v > 0).map((i) => ({ ...i, a: (i.v / total) * w * h }));
    const worst = (row, side) => { const s = row.reduce((t, r) => t + r.a, 0); let mx = 0; for (const r of row) { const q = Math.max((side * side * r.a) / (s * s), (s * s) / (side * side * r.a)); if (q > mx) mx = q; } return mx; };
    while (rest.length) {
      const side = Math.min(w, h);
      let row = [rest[0]], i = 1;
      while (i < rest.length && worst(row.concat(rest[i]), side) <= worst(row, side)) { row.push(rest[i]); i++; }
      rest = rest.slice(i);
      const s = row.reduce((t, r) => t + r.a, 0);
      if (w >= h) { const cw = s / h; let yy = y; for (const r of row) { const rh = r.a / cw; out.push({ ...r, x, y: yy, w: cw, h: rh }); yy += rh; } x += cw; w -= cw; }
      else { const rh = s / w; let xx = x; for (const r of row) { const rw = r.a / rh; out.push({ ...r, x: xx, y, w: rw, h: rh }); xx += rw; } y += rh; h -= rh; }
    }
    return out;
  }
  SV.add({
    id: "20",
    line: "넓이가 곧 분자 수입니다. 칸마다 작은 네모 하나가 분자 하나예요. 어느 관문이 가장 많이 걸러 냈는지 넓이로 비교해 보세요.",
    render(el, ctx) {
      const { X, step, FATE_SHORT } = ctx;
      const W = Math.max(320, el.clientWidth), H = W < 560 ? 420 : 460;
      const groups = [];
      if (step >= 6) groups.push({ f: 7, name: "선정", list: X.filter((c) => c.f === 7) });
      else groups.push({ f: 0, name: "아직 남음", list: X.filter((c) => c.f > step).sort((a, b) => b.score - a.score) });
      for (const f of [6, 5, 4, 3, 2, 1]) if (f <= step) groups.push({ f, name: (f < 6 ? CIRC[f - 1] + " " : "") + FATE_SHORT[f], list: X.filter((c) => c.f === f) });
      const items = groups.filter((g) => g.list.length).map((g) => ({ ...g, v: g.list.length })).sort((a, b) => b.v - a.v);
      const rects = squarify(items, 0, 0, W, H);
      let o = "";
      for (const r of rects) {
        const n = r.list.length, pad = 4, lab = r.h > 46 && r.w > 60 ? 30 : 0;
        const iw = r.w - pad * 2, ih = r.h - pad * 2 - lab;
        o += `<rect x="${r.x + 1}" y="${r.y + 1}" width="${Math.max(0, r.w - 2)}" height="${Math.max(0, r.h - 2)}" fill="var(--bg)" stroke="var(--line-strong)"/>`;
        if (iw > 2 && ih > 2) {
          let s = Math.sqrt((iw * ih) / n), cols = Math.max(1, Math.floor(iw / s));
          let rows = Math.ceil(n / cols);
          while (rows * (iw / cols) > ih && cols < n) { cols++; rows = Math.ceil(n / cols); }
          s = Math.min(iw / cols, ih / rows);
          const gap = s > 6 ? 1.5 : 0.8;
          r.list.forEach((c, i) => {
            const x = r.x + pad + (i % cols) * s, y = r.y + pad + lab + Math.floor(i / cols) * s;
            o += `<rect data-cid="${c.id}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0.6, s - gap).toFixed(1)}" height="${Math.max(0.6, s - gap).toFixed(1)}" fill="${fill(r.f)}" opacity="${r.f === 0 ? 0.55 : 1}"${r.f === 7 ? ' stroke="var(--hit-ring)" stroke-width="1"' : ""}/>`;
          });
        }
        if (lab) {
          o += `<text x="${r.x + 9}" y="${r.y + 19}" font-size="12.5" font-weight="600">${r.name}</text>`;
          o += `<text x="${r.x + r.w - 9}" y="${r.y + 19}" font-size="12" text-anchor="end" class="t-mono t-muted">${n}</text>`;
        } else if (r.w > 26 && r.h > 18) {
          o += `<text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 4}" font-size="11" text-anchor="middle" class="t-mono" style="paint-order:stroke;stroke:var(--bg);stroke-width:3">${n}</text>`;
        }
      }
      el.innerHTML = ctx.svg(W, H, o);
    }
  });
})();
