/* 시안 21–30 — 화합물 스크리닝 그림. 공통 뼈대(screening-30-variants.html)의 SV.add 로 등록한다. */
(() => {
  "use strict";
  const GL = "①②③④⑤⑥";
  const glyph = (n) => (n ? GL[n - 1] : "0");
  /* 짧은 이름 — '도네페질 (Donepezil)' → '도네페질' */
  const sname = (c, n = 9) => { const s = c.n.replace(/\s*\(.*\)\s*$/, ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
  const fill = (ctx, c, step = ctx.step) => {
    const st = ctx.at(c, step);
    return st === "out" ? `var(--f${c.f})` : st === "hit" ? "var(--f7)" : "var(--fg)";
  };
  const ring = (ctx, c, step = ctx.step) => (ctx.at(c, step) === "hit" ? ' stroke="var(--hit-ring)" stroke-width="1"' : "");
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* 21 벤 다이어그램 — 세 원 안팎에 분자를 앉혀 '모두 통과'가 가운데에 모이게 */
  SV.add({
    id: "21",
    line: "세 동그라미는 각각 '이 조건은 통과'라는 뜻이에요. 세 동그라미가 모두 겹치는 가운데에 있어야 다음 단계로 갈 수 있어요.",
    render(el, ctx) {
      const { X, step } = ctx;
      const W = Math.max(320, el.clientWidth), narrow = W < 640;
      const H = narrow ? Math.round(W * 1.15) : 520;
      const R = Math.min(W * 0.3, H * 0.3), cx = W / 2, cy = H * 0.47;
      const pr = narrow ? 2.4 : 3.1;
      const C = [
        { x: cx - 0.45 * R, y: cy - 0.28 * R, f: 2, lab: "크기·극성 통과", on: step >= 2, m: (c) => c.p.mw && c.p.tpsa },
        { x: cx + 0.45 * R, y: cy - 0.28 * R, f: 3, lab: "Ro5 통과", on: step >= 3, m: (c) => c.p.ro5 },
        { x: cx, y: cy + 0.5 * R, f: 5, lab: "QED 통과", on: step >= 5, m: (c) => c.p.qed }
      ];
      const ty = (C[0].y + C[1].y + C[2].y) / 3;
      const lz = { x0: cx - 48, x1: cx + 48, y0: ty - 20, y1: ty + 20 };
      const d2 = (x, y, i) => (x - C[i].x) ** 2 + (y - C[i].y) ** 2;
      const fits = (x, y, mem) => {
        for (let i = 0; i < 3; i++) {
          const d = Math.sqrt(d2(x, y, i));
          if (mem[i] ? d > R - pr - 3 : d < R + pr + 3) return false;
        }
        if (mem.every(Boolean) && x > lz.x0 && x < lz.x1 && y > lz.y0 && y < lz.y1) return false;
        return x > pr + 4 && x < W - pr - 4 && y > pr + 4 && y < H - pr - 4;
      };
      const rnd = ctx.rng(21), placed = [], pos = new Map();
      const order = [...X].sort((a, b) => b.score - a.score);
      for (const c of order) {
        const mem = C.map((k) => !!k.m(c));
        const inI = mem.indexOf(true);
        const bx = inI >= 0 ? [C[inI].x - R, C[inI].x + R, C[inI].y - R, C[inI].y + R] : [0, W, 0, H];
        let md = pr * 2.6, got = null, last = null;
        for (let tries = 0; tries < 900 && !got; tries++) {
          if (tries && tries % 120 === 0) md *= 0.8;
          const x = bx[0] + rnd() * (bx[1] - bx[0]), y = bx[2] + rnd() * (bx[3] - bx[2]);
          if (!fits(x, y, mem)) continue;
          last = [x, y];
          if (placed.every((p) => (p[0] - x) ** 2 + (p[1] - y) ** 2 >= md * md)) got = [x, y];
        }
        got = got || last || [inI >= 0 ? C[inI].x : 12, inI >= 0 ? C[inI].y : 12];
        placed.push(got); pos.set(c.id, got);
      }
      const cnt = C.map((k) => X.filter(k.m).length);
      const all3 = X.filter((c) => C.every((k) => k.m(c))).length;
      let out = "";
      C.forEach((k) => {
        out += `<circle cx="${k.x}" cy="${k.y}" r="${R}" fill="var(--f${k.f})" fill-opacity="${k.on ? 0.09 : 0.03}" stroke="var(--f${k.f})" stroke-width="${k.on ? 1.6 : 1}" ${k.on ? "" : 'stroke-dasharray="4 4" stroke-opacity="0.5"'}/>`;
      });
      const lab = (k, x, y, anchor) => `<g opacity="${k.on ? 1 : 0.45}"><rect x="${anchor === "end" ? x - 10 : anchor === "start" ? x : x - 5}" y="${y - 9}" width="9" height="9" fill="var(--f${k.f})"/>
        <text x="${anchor === "end" ? x - 14 : anchor === "start" ? x + 13 : x + 8}" y="${y}" font-size="${narrow ? 11 : 12.5}" font-weight="600" text-anchor="${anchor === "middle" ? "start" : anchor}">${k.lab} <tspan class="t-mono t-muted" font-weight="400">${cnt[C.indexOf(k)]}</tspan></text></g>`;
      out += lab(C[0], Math.max(narrow ? 92 : 120, C[0].x - R * 0.35), C[0].y - R - 8, "end");
      out += lab(C[1], Math.min(W - (narrow ? 92 : 120), C[1].x + R * 0.35), C[1].y - R - 8, "start");
      out += lab(C[2], C[2].x - 40, C[2].y + R + 18, "middle");
      for (const c of order) {
        const [x, y] = pos.get(c.id);
        const st = ctx.at(c);
        out += `<circle data-cid="${c.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${st === "hit" ? pr + 1.4 : pr}" fill="${fill(ctx, c)}"${ring(ctx, c)} ${st === "in" ? 'fill-opacity="0.8"' : ""}/>`;
        if (!c.p.alert) {
          const s = pr + 1.6, col = step >= 4 ? "var(--f4)" : "var(--muted)";
          out += `<path d="M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}" stroke="${col}" stroke-width="1.3" pointer-events="none"/>`;
        }
      }
      out += `<rect x="${lz.x0 + 2}" y="${lz.y0 + 2}" width="${lz.x1 - lz.x0 - 4}" height="${lz.y1 - lz.y0 - 4}" fill="var(--surface)" stroke="var(--line-strong)"/>
        <text x="${cx}" y="${ty - 2}" text-anchor="middle" font-size="12" font-weight="700">모두 통과 ${all3}</text>
        <text x="${cx}" y="${ty + 12}" text-anchor="middle" font-size="10.5" class="t-mono t-muted">${step >= 6 ? `선정 ${ctx.DROP[7]}` : "선정 전"}</text>`;
      out += `<g font-size="11" class="t-muted"><path d="M${W - (narrow ? 96 : 150)} ${H - 14}l7 7m0 -7l-7 7" stroke="var(--f4)" stroke-width="1.3"/><text x="${W - (narrow ? 84 : 138)}" y="${H - 6}" class="t-muted">구조 경고 ${X.filter((c) => !c.p.alert).length}</text></g>`;
      el.innerHTML = ctx.svg(W, H, out);
    }
  });

  /* 22 레이더 비교 — 선정 1위와 관문마다 '가장 아깝게 떨어진' 분자의 모양 비교 */
  SV.add({
    id: "22",
    line: "가운데 회색 육각형이 '허용 범위'예요. 선이 이 범위 밖으로 튀어나간 축 때문에 그 분자가 떨어졌어요. 점선은 선정 1위 분자예요.",
    render(el, ctx) {
      const { X, S, step } = ctx;
      const surv = X.filter((c) => c.rank).sort((a, b) => a.rank - b.rank);
      const cut = surv.length ? surv[Math.min(S.topN, surv.length) - 1].score : 0.5;
      const AX = [
        { k: "MW", v: (c) => c.mw, lim: S.mwMax, f: 2, t: "max", fmt: (v) => v.toFixed(0) },
        { k: "TPSA", v: (c) => c.tpsa, lim: S.tpsaMax, f: 2, t: "max", fmt: (v) => v.toFixed(0) },
        { k: "logP", v: (c) => c.logp, lim: 5, f: 3, t: "logp", fmt: (v) => v.toFixed(1) },
        { k: "Ro5", v: (c) => c.ro5, lim: S.ro5Max, f: 3, t: "cnt", fmt: (v) => v + "개" },
        { k: "QED", v: (c) => c.qed, lim: S.qedMin, f: 5, t: "min", fmt: (v) => v.toFixed(2) },
        { k: "점수", v: (c) => c.score, lim: cut, f: 6, t: "min", fmt: (v) => v.toFixed(2) }
      ];
      const rad = (a, c) => {
        const v = a.v(c);
        let r = a.t === "max" ? 0.6 * v / a.lim : a.t === "cnt" ? 0.6 * (v + 0.5) / (a.lim + 1) : a.t === "logp" ? 0.6 * (v + 2) / (a.lim + 2) : 0.6 * (1 - v) / Math.max(0.02, 1 - a.lim);
        return Math.max(0.04, Math.min(1, r));
      };
      const VW = 240, VH = 210, ox = VW / 2, oy = VH / 2 + 4, RR = 70;
      const pt = (i, r) => { const an = -Math.PI / 2 + (i * Math.PI * 2) / 6; return [ox + Math.cos(an) * RR * r, oy + Math.sin(an) * RR * r]; };
      const poly = (rs) => rs.map((r, i) => pt(i, r).map((v) => v.toFixed(1)).join(",")).join(" ");
      const top = surv[0];
      const reps = [];
      reps.push({ f: 7, c: top || null });
      for (const n of [1, 2, 3, 4, 5, 6]) {
        if (n === 1 && !ctx.DROP[1]) continue;
        const pool = X.filter((c) => c.f === n).sort((a, b) => b.score - a.score);
        reps.push({ f: n, c: pool[0] || null });
      }
      const card = ({ f, c }) => {
        const gateN = f === 7 ? 6 : f;
        const later = gateN > step;
        const title = f === 7 ? "선정 1위" : `${glyph(f)} ${ctx.FATE_SHORT[f]}${f === 6 ? "" : "에서 탈락"}`;
        if (!c) return `<div class="r22" data-f="${f}" style="opacity:${later ? 0.35 : 1}"><p class="r22-t"><i></i>${title}</p><p class="r22-e">이 관문에서 떨어진 분자가 없어요.</p></div>`;
        const rs = AX.map((a) => rad(a, c));
        let s = "";
        for (const g of [0.3, 0.6, 1]) s += `<polygon points="${poly(Array(6).fill(g))}" fill="${g === 0.6 ? "var(--raise)" : "none"}" stroke="${g === 0.6 ? "var(--line-strong)" : "var(--line)"}" ${g === 0.6 ? 'stroke-dasharray="3 3"' : ""}/>`;
        AX.forEach((a, i) => {
          const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.24);
          s += `<line x1="${ox}" y1="${oy}" x2="${x}" y2="${y}" stroke="var(--line)"/>`;
          s += `<text x="${lx}" y="${ly + 3}" text-anchor="middle" font-size="10" class="t-mono ${rs[i] > 0.6 ? "" : "t-muted"}" font-weight="${rs[i] > 0.6 ? 600 : 400}">${a.k} ${a.fmt(a.v(c))}</text>`;
        });
        if (top && f !== 7) s += `<polygon points="${poly(AX.map((a) => rad(a, top)))}" fill="none" stroke="var(--muted)" stroke-dasharray="2 3" stroke-width="1.2"/>`;
        s += `<polygon points="${poly(rs)}" fill="var(--f${f})" fill-opacity="${f === 7 ? 0.75 : 0.25}" stroke="${f === 7 ? "var(--hit-ring)" : `var(--f${f})`}" stroke-width="1.6"/>`;
        rs.forEach((r, i) => { if (r > 0.6) { const [x, y] = pt(i, r); s += `<circle cx="${x}" cy="${y}" r="4.5" fill="var(--f${AX[i].f})" stroke="var(--surface)" stroke-width="1.5"/>`; } });
        return `<div class="r22" data-f="${f}" data-cid="${c.id}" style="opacity:${later ? 0.35 : 1}"><p class="r22-t"><i></i>${title}</p>
          <p class="r22-n">${ctx.esc(sname(c, 16))} <span class="mono muted">${ctx.esc(c.id)}</span></p>
          <svg viewBox="0 0 ${VW} ${VH}" width="100%" role="img" aria-label="${ctx.esc(c.n)} 레이더">${s}</svg>
          <p class="r22-e">${later ? "아직 이 관문 전이에요." : ctx.esc(ctx.reason(c))}</p></div>`;
      };
      const W = Math.max(320, el.clientWidth), cols = W >= 900 ? 3 : W >= 520 ? 2 : 1;
      el.classList.add("scroll");
      el.innerHTML = `<style>
        .g22 { display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: 12px; padding: 14px; }
        .r22 { border: 1px solid var(--line); background: var(--bg); padding: 10px 10px 8px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .r22[data-f="7"] { border-color: var(--hit-ring); }
        .r22-t { margin: 0; font-size: 12.5px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
        .r22-t i { width: 10px; height: 10px; background: var(--c); }
        .r22[data-f="7"] .r22-t i { outline: 1.5px solid var(--hit-ring); outline-offset: -1.5px; }
        .r22-n { margin: 0; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .r22-n .mono { font-size: 10.5px; }
        .r22-e { margin: 0; font-size: 11.5px; color: var(--muted); line-height: 1.4; }
      </style><div class="g22">${reps.map(card).join("")}</div>`;
    }
  });

  /* 23 오디션 객석 — 220개 벤젠 고리가 객석에 앉고, 선정된 분자만 무대로 */
  const hexPath = (x, y, r) => { let d = ""; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; d += (i ? "L" : "M") + (x + r * Math.cos(a)).toFixed(1) + " " + (y + r * Math.sin(a)).toFixed(1); } return d + "Z"; };
  SV.add({
    id: "23",
    line: "객석에 앉은 육각형 하나하나가 분자예요. 관문에서 떨어지면 불이 꺼지고, 끝까지 남은 분자만 무대에 올라 도킹실로 가요.",
    render(el, ctx) {
      const { X, S, step } = ctx;
      const W = Math.max(320, el.clientWidth), narrow = W < 640;
      const hits = X.filter((c) => c.f === 7).sort((a, b) => a.rank - b.rank);
      const N = S.topN;
      const sCols = narrow ? Math.min(N, 5) : Math.min(N, 10), sRows = Math.ceil(N / sCols);
      const slotW = (W - 40) / sCols, HR = Math.min(slotW * 0.28, 22), slotH = HR * 2 + 34;
      const stageY = 30, stageH = sRows * slotH + 14;
      const seatCols = narrow ? 14 : Math.min(28, Math.floor((W - 40) / 34));
      const sw = (W - 40) / seatCols, r = sw * 0.4, rows = Math.ceil(X.length / seatCols);
      const seatY = stageY + stageH + 64, rowH = sw * 0.92;
      const H = seatY + rows * rowH + 26;
      const rnd = ctx.rng(23), seats = [...X].map((c) => [rnd(), c]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
      let out = `<text x="20" y="18" font-size="12" font-weight="700">무대 · 도킹실 진출</text><text x="${W - 20}" y="18" text-anchor="end" font-size="11.5" class="t-mono t-muted">${step >= 6 ? hits.length : 0} / ${N}</text>`;
      out += `<rect x="20" y="${stageY}" width="${W - 40}" height="${stageH}" fill="var(--raise)" stroke="var(--line-strong)"/>`;
      for (let i = 0; i < N; i++) {
        const x = 20 + slotW * (i % sCols) + slotW / 2, y = stageY + 10 + Math.floor(i / sCols) * slotH + HR + 2;
        const c = hits[i];
        if (step >= 6 && c) {
          out += `<g data-cid="${c.id}"><path d="${hexPath(x, y, HR)}" fill="var(--f7)" stroke="var(--hit-ring)" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="${HR * 0.55}" fill="none" stroke="var(--hit-ring)" stroke-width="1.2"/>
            <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" class="t-mono" style="fill:var(--hi-fg)">${i + 1}</text>
            <text x="${x}" y="${y + HR + 15}" text-anchor="middle" font-size="${narrow ? 10 : 11}">${ctx.esc(sname(c, narrow ? 5 : Math.max(5, Math.floor(slotW / 11))))}</text></g>`;
        } else {
          out += `<path d="${hexPath(x, y, HR)}" fill="none" stroke="var(--line-strong)" stroke-dasharray="3 3"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12" class="t-muted">${c || step < 6 ? "?" : "빈자리"}</text>`;
        }
      }
      out += `<text x="20" y="${seatY - 34}" font-size="12" font-weight="700">객석 · 라이브러리 ${X.length}종</text><text x="${W - 20}" y="${seatY - 34}" text-anchor="end" font-size="11.5" class="t-mono t-muted">불 켜진 자리 ${ctx.REM[step]}</text>`;
      seats.forEach((c, i) => {
        const col = i % seatCols, row = Math.floor(i / seatCols);
        const x = 20 + col * sw + sw / 2 + (row % 2 ? sw * 0.12 : -sw * 0.12);
        const t = (x - W / 2) / (W / 2);
        const y = seatY + row * rowH - t * t * 10;
        const st = ctx.at(c);
        if (st === "hit") {
          out += `<path data-cid="${c.id}" d="${hexPath(x, y, r)}" fill="var(--surface)" stroke="var(--hit-ring)" stroke-dasharray="2 2"/>`;
        } else if (st === "out") {
          const now = ctx.justOut(c);
          out += `<g data-cid="${c.id}"><path d="${hexPath(x, y, r)}" fill="var(--surface)" stroke="${now ? `var(--f${c.f})` : "var(--faint)"}" stroke-width="${now ? 1.6 : 1}" ${now ? "" : 'stroke-opacity="0.6"'}/><rect x="${x - r * 0.32}" y="${y - r * 0.32}" width="${r * 0.64}" height="${r * 0.64}" fill="var(--f${c.f})"/></g>`;
        } else {
          out += `<g data-cid="${c.id}"><path d="${hexPath(x, y, r)}" fill="var(--surface)" stroke="var(--fg)" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="${r * 0.5}" fill="none" stroke="var(--fg)" stroke-width="1"/></g>`;
        }
      });
      el.innerHTML = ctx.svg(W, H, out);
    }
  });

  /* 24 관문 열 재생 — 열마다 남은 분자가 옆으로 미끄러지고, 걸린 분자는 그 열 아래 더미로 */
  SV.add({
    id: "24",
    stepMs: 1500,
    line: "점들이 왼쪽에서 오른쪽 관문으로 줄지어 이동해요. 관문에 걸린 점은 그 열 아래 더미에 남아요. ▶ 를 눌러 처음부터 보세요.",
    render(el, ctx) {
      const { X, REM, DROP, GATES, PAL } = ctx;
      const step = ctx.step, from = ctx.prevStep;
      const wAvail = Math.max(320, el.clientWidth), narrow = wAvail < 640;
      const pad = narrow ? 6 : 16, colW = (wAvail - 2 * pad) / 7;
      const gap = Math.max(4.4, Math.min(10, (colW - 8) / 12)), cols = Math.max(4, Math.floor((colW - 8) / gap)), r = gap * 0.36;
      const maxDrop = Math.max(1, ...DROP.slice(1, 7));
      const topY = 56, topH = Math.ceil(X.length / cols) * gap, divY = topY + topH + 18, pileY = divY + 26;
      const H = Math.max(418, pileY + Math.ceil(maxDrop / cols) * gap + 18);
      const { cv, g, w } = ctx.canvas(el, H);
      const xk = (k) => pad + colW * (k + 0.5);
      const font = getComputedStyle(document.body).fontFamily;
      const posAt = (k) => {
        const m = new Map();
        const alive = X.filter((c) => c.f > k).sort((a, b) => b.score - a.score);
        alive.forEach((c, i) => m.set(c.id, [xk(k) - (cols * gap) / 2 + (i % cols) * gap + gap / 2, topY + Math.floor(i / cols) * gap + gap / 2]));
        for (let n = 1; n <= k; n++) {
          X.filter((c) => c.f === n).sort((a, b) => b.score - a.score)
            .forEach((c, j) => m.set(c.id, [xk(n) - (cols * gap) / 2 + (j % cols) * gap + gap / 2, pileY + Math.floor(j / cols) * gap + gap / 2]));
        }
        return m;
      };
      const P0 = posAt(from), P1 = posAt(step);
      const delay = new Map(X.map((c, i) => [c.id, (i / X.length) * 0.3]));
      let cur = P1;
      const frame = (t) => {
        g.clearRect(0, 0, w, H);
        g.fillStyle = PAL.raise; g.fillRect(xk(step) - colW / 2 + 2, 0, colW - 4, H);
        g.strokeStyle = PAL.lineStrong; g.lineWidth = 1; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(pad, divY); g.lineTo(w - pad, divY); g.stroke(); g.setLineDash([]);
        g.textAlign = "center";
        for (let k = 0; k <= 6; k++) {
          const on = k <= step;
          g.globalAlpha = on ? 1 : 0.35;
          g.fillStyle = PAL.fg; g.font = `600 ${narrow ? 10 : 12}px ${font}`;
          g.fillText(k ? `${GL[k - 1]} ${narrow ? "" : GATES[k - 1].short}` : "시작", xk(k), 18);
          g.fillStyle = PAL.muted; g.font = `500 ${narrow ? 10 : 12}px ui-monospace, monospace`;
          g.fillText(on ? String(REM[k]) : "·", xk(k), 36);
          if (k && on) g.fillText(`−${DROP[k]}`, xk(k), divY + 16);
          g.globalAlpha = 1;
        }
        g.textAlign = "left"; g.fillStyle = PAL.muted; g.font = `500 ${narrow ? 9.5 : 11}px ${font}`;
        g.fillText("탈락 더미", pad + 2, divY - 5);
        const m = new Map();
        for (const c of X) {
          const a = P0.get(c.id), b = P1.get(c.id);
          const d = delay.get(c.id), u = ease(Math.max(0, Math.min(1, (t - d) / 0.7)));
          const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
          m.set(c.id, [x, y]);
          const st = ctx.at(c);
          g.beginPath(); g.arc(x, y, st === "hit" ? r + 0.8 : r, 0, Math.PI * 2);
          g.fillStyle = st === "out" ? PAL.f[c.f] : st === "hit" ? PAL.f[7] : PAL.fg;
          g.fill();
          if (st === "hit") { g.strokeStyle = PAL.hitRing; g.lineWidth = 1; g.stroke(); }
        }
        cur = m;
      };
      let raf = 0;
      if (ctx.reduced || from === step) frame(1.2);
      else {
        const t0 = performance.now(), dur = 1100;
        const loop = (now) => { const t = (now - t0) / dur; frame(Math.min(1.2, t)); if (t < 1.2) raf = requestAnimationFrame(loop); };
        frame(0); raf = requestAnimationFrame(loop);
      }
      cv.addEventListener("pointermove", (e) => {
        const b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
        let best = null, bd = (r + 3) ** 2;
        for (const c of X) { const p = cur.get(c.id); const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd) { bd = d; best = c; } }
        if (best) ctx.tip(e, best); else ctx.hideTip();
      });
      cv.addEventListener("pointerleave", () => ctx.hideTip());
      return () => cancelAnimationFrame(raf);
    }
  });

  /* 25 LED 카운트다운 — 전광판 01 의 호박색 점 글자로 남은 수가 굴러 내려간다 */
  const DIG = {
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"], "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"], "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"], "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"], "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"], "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"]
  };
  SV.add({
    id: "25",
    stepMs: 1600,
    line: "교실 전광판처럼 남은 분자 수가 관문마다 뚝뚝 떨어져요. 아래 작은 불빛 220개가 분자 하나씩이에요.",
    render(el, ctx) {
      const { X, REM, DROP, GATES } = ctx;
      const step = ctx.step, from = ctx.prevStep;
      const AMB = "#ffb000", DIM = "#2b1f05", OFF = "#4a3300", LIME = "#c6ff4a", BG = "#050605";
      el.style.background = BG; el.style.borderColor = "#000";
      const wAvail = Math.max(320, el.clientWidth), narrow = wAvail < 640;
      const cell = Math.min(narrow ? 13 : 20, (wAvail - 48) / 17);
      const numH = cell * 7 + 24;
      const sCols = narrow ? 44 : 110, sg = Math.min(9, (wAvail - 40) / sCols), sRows = Math.ceil(X.length / sCols);
      const stripY = numH + 14, H = stripY + sRows * sg + 14;
      const g7 = (k) => (k ? `${GL[k - 1]} ${GATES[k - 1].name}` : "시작");
      el.innerHTML = `<style>
        .led25 { color: ${AMB}; font-family: var(--mono); padding: 14px 16px 16px; position: relative; background: ${BG}; }
        .led25::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 1px, transparent 1px 3px); }
        .led25 .hd { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; font-size: 11.5px; letter-spacing: 0.08em; text-transform: uppercase; color: ${AMB}; opacity: 0.85; text-shadow: 0 0 6px rgba(255,176,0,0.5); }
        .led25 canvas { margin-top: 6px; }
        .led25 ol { list-style: none; margin: 10px 0 0; padding: 10px 0 0; border-top: 1px solid #3a2a00; display: flex; flex-direction: column; gap: 3px; font-size: 13px; font-variant-numeric: tabular-nums; }
        .led25 li { text-shadow: 0 0 6px rgba(255,176,0,0.55); display: flex; gap: 10px; flex-wrap: wrap; }
        .led25 li.old { opacity: 0.5; text-shadow: none; }
        .led25 li .m { color: #fff3d0; }
        .led25 li.hit .m { color: ${LIME}; text-shadow: 0 0 8px rgba(198,255,74,0.6); }
        .led25 .cur::after { content: "█"; margin-left: 4px; animation: blink25 1s steps(1) infinite; }
        @keyframes blink25 { 50% { opacity: 0; } }
      </style><div class="led25"><div class="hd"><span>◆ CRISTA 스크리닝 전광판 · ${ctx.esc(ctx.gene)}</span><span>${ctx.esc(g7(step))}</span></div><div class="cvw"></div>
        <ol>${Array.from({ length: step + 1 }, (_, k) => {
          const last = k === step;
          const msg = k === 0 ? `라이브러리 ${X.length}종 출발` : k === 6 ? `상위 ${ctx.S.topN} 선정 · 대기 ${DROP[6]}` : `−${DROP[k]} 탈락 → ${REM[k]}종 남음`;
          return `<li class="${last ? "" : "old"} ${k === 6 ? "hit" : ""}"><span>◆ ${ctx.esc(g7(k))}</span><span class="m ${last ? "cur" : ""}">${msg}</span></li>`;
        }).join("")}</ol></div>`;
      const box = el.querySelector(".cvw");
      const { cv, g, w } = ctx.canvas(box, H);
      const order = [...X];
      const startN = REM[Math.min(from, step)] ?? REM[step];
      const draw = (n, offCount) => {
        g.fillStyle = BG; g.fillRect(0, 0, w, H);
        const s = String(n).padStart(3, " ");
        const totalW = 17 * cell, x0 = (w - totalW) / 2;
        for (let d = 0; d < 3; d++) {
          const pat = DIG[s[d]];
          for (let ry = 0; ry < 7; ry++) for (let rx = 0; rx < 5; rx++) {
            const on = pat[ry][rx] === "1";
            const x = x0 + (d * 6 + rx) * cell + cell / 2, y = 12 + ry * cell + cell / 2;
            g.beginPath(); g.arc(x, y, cell * 0.38, 0, Math.PI * 2);
            if (on) { g.shadowColor = step >= 6 && n === REM[6] ? LIME : AMB; g.shadowBlur = cell * 0.6; g.fillStyle = step >= 6 && n === REM[6] ? LIME : AMB; }
            else { g.shadowBlur = 0; g.fillStyle = DIM; }
            g.fill();
          }
        }
        g.shadowBlur = 0;
        const sx0 = (w - sCols * sg) / 2;
        let turned = 0;
        order.forEach((c, i) => {
          const x = sx0 + (i % sCols) * sg + sg / 2, y = stripY + Math.floor(i / sCols) * sg + sg / 2;
          let lit = c.f > step || (step >= 6 && c.f === 7);
          /* 굴러 내려가는 동안 방금 떨어진 분자는 차례로 꺼진다 */
          if (!lit && c.f > from && c.f <= step && !(step >= 6 && c.f === 7)) { lit = turned >= offCount; turned++; }
          g.beginPath(); g.arc(x, y, sg * 0.34, 0, Math.PI * 2);
          g.fillStyle = lit ? (step >= 6 && c.f === 7 ? LIME : AMB) : OFF;
          g.fill();
        });
      };
      let raf = 0;
      const endN = REM[step], dropN = Math.max(0, startN - endN);
      if (ctx.reduced || startN === endN || from > step) draw(endN, Infinity);
      else {
        const t0 = performance.now(), dur = 900;
        const loop = (now) => {
          const t = Math.min(1, (now - t0) / dur), u = ease(t);
          const n = Math.round(startN - (startN - endN) * u);
          draw(n, Math.round(dropN * u));
          if (t < 1) raf = requestAnimationFrame(loop);
        };
        draw(startN, 0); raf = requestAnimationFrame(loop);
      }
      cv.addEventListener("pointermove", (e) => {
        const b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
        const sx0 = (w - sCols * sg) / 2, i = Math.floor((x - sx0) / sg) + Math.floor((y - stripY) / sg) * sCols;
        if (y >= stripY && x >= sx0 && x < sx0 + sCols * sg && order[i]) ctx.tip(e, order[i]); else ctx.hideTip();
      });
      cv.addEventListener("pointerleave", () => ctx.hideTip());
      return () => cancelAnimationFrame(raf);
    }
  });

  /* 26 만화 6컷 — 관문마다 한 컷, 그림 + 말풍선 + 남은 수 */
  SV.add({
    id: "26",
    line: "여섯 컷 만화로 읽는 스크리닝이에요. 컷마다 '어떤 분자를 돌려보내는지'를 한 문장으로 말해 줘요.",
    render(el, ctx) {
      const { S, REM, DROP, step, LIBS } = ctx;
      const W = Math.max(320, el.clientWidth);
      const cols = W >= 900 ? 3 : 2;
      const T = (x, y, s, o = "") => `<text x="${x}" y="${y}" font-size="10.5" text-anchor="middle" ${o}>${s}</text>`;
      const art = {
        1: () => LIBS.map((k, i) => {
          const x = 18 + i * 62, on = S.lib[k];
          return `<g opacity="${on ? 1 : 0.5}"><path d="M${x} 40h48v46h-48z" fill="var(--raise)" stroke="var(--fg)" stroke-width="1.4"/><path d="M${x} 40l8-12h32l8 12" fill="none" stroke="var(--fg)" stroke-width="1.4"/>
            ${T(x + 24, 67, String((window.DD.meta.counts || {})[k] || ""), 'class="t-mono" font-weight="600"')}${T(x + 24, 102, k.replace("ChEMBL ", "").replace(" 후보", ""), 'class="t-muted"')}
            ${on ? "" : `<path d="M${x - 2} 36l52 54M${x + 50} 36l-52 54" stroke="var(--f1)" stroke-width="2.5"/>`}</g>`;
        }).join(""),
        2: () => {
          const sx = (v) => 16 + (v / 650) * 168;
          let s = `<path d="M16 70h168" stroke="var(--fg)" stroke-width="1.4"/>`;
          for (let v = 0; v <= 650; v += 50) s += `<path d="M${sx(v)} 70v${v % 100 ? -5 : -9}" stroke="var(--fg)"/>`;
          s += T(sx(0), 84, "0", 'class="t-mono t-muted"') + T(sx(600), 84, "600", 'class="t-mono t-muted"');
          s += `<rect x="${sx(S.mwMax)}" y="22" width="${184 - sx(S.mwMax)}" height="48" fill="var(--f2)" fill-opacity="0.16"/><path d="M${sx(S.mwMax)} 18v56" stroke="var(--f2)" stroke-width="2.5"/>`;
          s += `<circle cx="${sx(380)}" cy="50" r="10" fill="var(--fg)"/><circle cx="${Math.min(176, sx(S.mwMax) + 28)}" cy="46" r="17" fill="none" stroke="var(--fg)" stroke-width="1.4" stroke-dasharray="3 2"/>`;
          return s + T(100, 104, `MW ≤ ${S.mwMax} · TPSA ≤ ${S.tpsaMax}`, 'class="t-mono"');
        },
        3: () => ["분자량 ≤ 500", "logP ≤ 5", "수소 주개 ≤ 5", "수소 받개 ≤ 10"].map((t, i) => {
          const y = 16 + i * 20;
          return `<rect x="34" y="${y}" width="13" height="13" fill="none" stroke="var(--fg)" stroke-width="1.3"/><path d="M36 ${y + 7}l3 4 6-8" fill="none" stroke="var(--f3)" stroke-width="2"/><text x="56" y="${y + 11}" font-size="11">${t}</text>`;
        }).join("") + T(100, 104, `위반 ${S.ro5Max}개까지 OK`, 'class="t-mono"'),
        4: () => `<path d="M100 14l40 70h-80z" fill="var(--f4)" fill-opacity="0.2" stroke="var(--f4)" stroke-width="3" stroke-linejoin="round"/><path d="M100 38v24" stroke="var(--fg)" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="72" r="3.2" fill="var(--fg)"/>` + T(100, 104, S.noAlerts ? "방향족 아민 · 니트로" : "검사 끔", 'class="t-mono"'),
        5: () => {
          const full = Math.round(S.qedMin * 5);
          let s = `<g transform="rotate(-18 60 46)"><rect x="28" y="34" width="64" height="26" rx="13" fill="none" stroke="var(--fg)" stroke-width="1.4"/><path d="M60 34h19a13 13 0 0 1 0 26h-19z" fill="var(--f5)"/></g>`;
          for (let i = 0; i < 5; i++) {
            const cx = 116 + (i % 3) * 22, cy = i < 3 ? 32 : 58;
            let d = ""; for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + (j * Math.PI) / 5, rr = j % 2 ? 4 : 9; d += (j ? "L" : "M") + (cx + rr * Math.cos(a)).toFixed(1) + " " + (cy + rr * Math.sin(a)).toFixed(1); }
            s += `<path d="${d}Z" fill="${i < full ? "var(--f5)" : "none"}" stroke="var(--fg)" stroke-width="1"/>`;
          }
          return s + T(100, 104, `QED ≥ ${S.qedMin.toFixed(2)}`, 'class="t-mono"');
        },
        6: () => `<rect x="40" y="48" width="38" height="36" fill="var(--raise)" stroke="var(--fg)" stroke-width="1.3"/><rect x="80" y="30" width="40" height="54" fill="var(--f7)" stroke="var(--hit-ring)" stroke-width="1.5"/><rect x="122" y="58" width="38" height="26" fill="var(--raise)" stroke="var(--fg)" stroke-width="1.3"/>
          ${T(59, 70, "2", 'class="t-mono" font-weight="700"')}<text x="100" y="62" font-size="13" text-anchor="middle" class="t-mono" font-weight="700" style="fill:var(--hi-fg)">1</text>${T(141, 76, "3", 'class="t-mono" font-weight="700"')}
          <path d="M100 8l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="var(--f7)" stroke="var(--hit-ring)"/>` + T(100, 104, `${ctx.gene} 점수 상위 ${S.topN}`, 'class="t-mono"')
      };
      const say = {
        1: "어느 상자에서 분자를 꺼낼까?",
        2: `${S.mwMax} Da 넘게 크면 몸속 문을 못 지나가!`,
        3: `먹는 약 규칙, 어긴 건 ${S.ro5Max}개까지만 봐줄게.`,
        4: S.noAlerts ? "독이 될 수 있는 부품이 달렸으면 돌아가요." : "이번엔 경고 부품을 검사하지 않아요.",
        5: `약처럼 생긴 정도가 ${S.qedMin.toFixed(2)}점은 넘어야 해.`,
        6: `${ctx.gene}에 잘 붙을 것 같은 순서로 ${S.topN}명만 무대로!`
      };
      el.classList.add("scroll");
      el.innerHTML = `<style>
        .g26 { display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: 12px; padding: 14px; }
        .p26 { border: 1.5px solid var(--line-strong); background: var(--bg); padding: 10px 12px 10px; display: flex; flex-direction: column; gap: 8px; min-width: 0; transition: opacity .3s; }
        .p26.now { border: 2.5px solid var(--fg); }
        .p26 h3 { margin: 0; font-size: 13px; display: flex; gap: 6px; align-items: center; }
        .p26 h3 i { width: 10px; height: 10px; background: var(--c); }
        .p26 .b26 { position: relative; border: 1.3px solid var(--fg); background: var(--surface); padding: 6px 9px; font-size: 12.5px; line-height: 1.4; border-radius: 12px; }
        .p26 .b26::after { content: ""; position: absolute; left: 22px; bottom: -8px; width: 12px; height: 12px; background: var(--surface); border-right: 1.3px solid var(--fg); border-bottom: 1.3px solid var(--fg); transform: skewX(-25deg) rotate(45deg); }
        .p26 svg { width: 100%; height: auto; max-height: 150px; display: block; margin-top: 4px; }
        .p26 .n26 { font-family: var(--mono); font-size: 12px; font-variant-numeric: tabular-nums; display: flex; justify-content: space-between; border-top: 1px solid var(--line); padding-top: 6px; }
        .p26 .n26 b { font-size: 15px; }
        @media (max-width: 480px) { .p26 .b26 { font-size: 11.5px; } }
      </style><div class="g26">${[1, 2, 3, 4, 5, 6].map((n) => `<section class="p26 ${n === step ? "now" : ""}" data-f="${n}" style="opacity:${n > step ? 0.3 : 1}">
          <h3><i></i>${glyph(n)} ${ctx.GATES[n - 1].name}</h3><div class="b26">${ctx.esc(say[n])}</div>
          <svg viewBox="0 0 200 110" role="img" aria-label="${ctx.GATES[n - 1].name} 그림">${art[n]()}</svg>
          <div class="n26"><span><b>${REM[n]}</b> ${n === 6 ? "선정" : "남음"}</span><span class="muted">${n === 6 ? "대기" : "빠짐"} ${DROP[n]}</span></div></section>`).join("")}</div>`;
    }
  });

  /* 27 질문 나무 — 예/아니오 질문을 차례로, 가지 굵기 = 분자 수 */
  SV.add({
    id: "27",
    line: "분자 하나하나에게 차례로 질문해요. '예'면 아래로 내려가고, '아니오'면 옆 상자로 빠져요. 선이 굵을수록 그 길로 간 분자가 많아요.",
    render(el, ctx) {
      const { S, REM, DROP, step } = ctx;
      const W = Math.max(320, el.clientWidth), narrow = W < 640;
      const mw = narrow ? W * 0.58 : Math.min(340, W * 0.42), mx = narrow ? 8 + mw / 2 : Math.max(mw / 2 + 20, W * 0.34);
      const sx = mx + mw / 2 + (narrow ? 22 : 70), sw = Math.min(narrow ? W - sx - 6 : 220, W - sx - 10);
      const top = 64, rowH = narrow ? 74 : 80, bh = 40;
      const Q = {
        1: `고른 상자에 들어 있나? (${ctx.LIBS.filter((k) => S.lib[k]).length}개 상자)`,
        2: `분자량 ≤ ${S.mwMax} · TPSA ≤ ${S.tpsaMax}?`,
        3: `Ro5 위반 ≤ ${S.ro5Max}개?`,
        4: S.noAlerts ? "경고 부품(아민 · 니트로)이 없나?" : "경고 부품 검사 (꺼 둠)",
        5: `QED ≥ ${S.qedMin.toFixed(2)}?`,
        6: `${ctx.gene} 점수 상위 ${S.topN}개 안?`
      };
      const sw_ = (n) => (n ? 1.5 + (16 * n) / 220 : 1);
      const finalY = top + 6 * rowH;
      const H = finalY + bh + 20;
      let out = `<rect x="${mx - 60}" y="10" width="120" height="30" fill="var(--fg)"/><text x="${mx}" y="30" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--bg)">시작 ${REM[0]}종</text>`;
      out += `<line x1="${mx}" y1="40" x2="${mx}" y2="${top}" stroke="var(--fg)" stroke-width="${sw_(REM[0])}" stroke-opacity="0.7"/>`;
      for (let k = 1; k <= 6; k++) {
        const y = top + (k - 1) * rowH, on = k <= step;
        out += `<g opacity="${on ? 1 : 0.16}">`;
        out += `<rect x="${mx - mw / 2}" y="${y}" width="${mw}" height="${bh}" fill="var(--surface)" stroke="var(--fg)" stroke-width="1.4"/>`;
        out += `<text x="${mx - mw / 2 + 10}" y="${y + 25}" font-size="${narrow ? 11.5 : 13}" font-weight="600">${glyph(k)} ${ctx.esc(Q[k])}</text>`;
        /* 아니오 → 옆 상자 */
        out += `<line x1="${mx + mw / 2}" y1="${y + bh / 2}" x2="${sx}" y2="${y + bh / 2}" stroke="var(--f${k})" stroke-width="${sw_(DROP[k])}" ${DROP[k] ? "" : 'stroke-dasharray="3 3"'}/>`;
        out += narrow ? "" : `<text x="${mx + mw / 2 + 6}" y="${y + bh / 2 - 6 - sw_(DROP[k]) / 2}" font-size="10.5" class="t-muted">아니오</text>`;
        out += `<rect x="${sx}" y="${y + 4}" width="${sw}" height="${bh - 8}" fill="var(--f${k})" fill-opacity="0.16" stroke="var(--f${k})" stroke-width="1.3"/>`;
        out += `<text x="${sx + 9}" y="${y + bh / 2 + 4}" font-size="${narrow ? 11.5 : 12.5}" class="t-mono" font-weight="600">${narrow ? "아니오 " : ""}${k === 6 ? `대기 ${DROP[6]}` : `−${DROP[k]}${narrow ? "" : " 탈락"}`}</text>`;
        /* 예 → 다음 질문 */
        const ny = k === 6 ? finalY : top + k * rowH;
        out += `<line x1="${mx}" y1="${y + bh}" x2="${mx}" y2="${ny}" stroke="${k === 6 ? "var(--hit-ring)" : "var(--fg)"}" stroke-width="${sw_(REM[k])}" stroke-opacity="0.7"/>`;
        out += `<text x="${mx + sw_(REM[k]) / 2 + 6}" y="${y + bh + (ny - y - bh) / 2 + 4}" font-size="10.5" class="t-mono t-muted">예 · ${REM[k]}</text>`;
        out += `</g>`;
      }
      out += `<g opacity="${step >= 6 ? 1 : 0.16}"><rect x="${mx - mw / 2}" y="${finalY}" width="${mw}" height="${bh}" fill="var(--f7)" stroke="var(--hit-ring)" stroke-width="1.6"/>
        <text x="${mx}" y="${finalY + 25}" text-anchor="middle" font-size="13.5" font-weight="700" style="fill:var(--hi-fg)">선정 ${DROP[7]} → 도킹실</text></g>`;
      el.innerHTML = ctx.svg(W, H, out);
    }
  });

  /* 28 분자 여권 — 분자 하나를 골라 관문 도장을 찍어 본다 */
  let pick28 = null;
  SV.add({
    id: "28",
    line: "분자 하나를 골라 여권을 펼쳐 보세요. 관문을 지날 때마다 '통과' 도장이 찍히고, 걸린 곳에서는 '불가' 도장과 이유가 남아요.",
    render(el, ctx) {
      const { X, step, GATES, esc } = ctx;
      const hits = X.filter((c) => c.f === 7).sort((a, b) => a.rank - b.rank);
      const groups = [["선정", hits]];
      for (const n of [1, 2, 3, 4, 5, 6]) {
        const pool = X.filter((c) => c.f === n).sort((a, b) => b.score - a.score).slice(0, 3);
        if (pool.length) groups.push([`${glyph(n)} ${ctx.FATE_SHORT[n]}${n === 6 ? "" : " 탈락"}`, pool]);
      }
      const opts = groups.flatMap((g) => g[1]);
      const fallback = hits[0] || [...X].sort((a, b) => b.f - a.f || b.score - a.score)[0];
      if (!pick28 || !X.some((c) => c.id === pick28)) pick28 = fallback.id;
      const draw = () => {
        const c = X.find((x) => x.id === pick28);
        const inList = opts.some((o) => o.id === c.id);
        const select = `<select id="pp-sel">${inList ? "" : `<option value="${c.id}" selected>${esc(sname(c, 20))}</option>`}${groups.map(([lab, list]) => `<optgroup label="${esc(lab)}">${list.map((o) => `<option value="${o.id}" ${o.id === c.id ? "selected" : ""}>${esc(sname(o, 20))}${o.rank ? ` · ${o.rank}위` : ""}</option>`).join("")}</optgroup>`).join("")}</select>`;
        const slot = (g) => {
          const n = g.n, rot = [-9, 7, -5, 10, -7, 6][n - 1];
          let cls, txt, note;
          if (n > step) { cls = "s-wait"; txt = "심사 전"; note = "아직 이 관문까지 오지 않았어요"; }
          else if (c.f < n) { cls = "s-none"; txt = "미방문"; note = "앞 관문에서 돌아갔어요"; }
          else if (c.f === n) { cls = n === 6 ? "s-hold" : "s-fail"; txt = n === 6 ? "대기" : "불가"; note = ctx.reason(c); }
          else if (n === 6) { cls = "s-hit"; txt = "선정"; note = ctx.reason(c); }
          else { cls = "s-pass"; txt = "통과"; note = g.rule(); }
          return `<div class="pp-slot"><span class="pp-g">${glyph(n)} ${g.name}</span><div class="pp-stamp ${cls}" data-f="${n}" style="transform:rotate(${cls === "s-pass" || cls === "s-fail" || cls === "s-hit" || cls === "s-hold" ? rot : 0}deg)">${txt}</div><small>${esc(note)}</small></div>`;
        };
        const al = c.al.map((a) => (a === "aromatic_amine" ? "방향족 아민" : "니트로")).join(" · ") || "없음";
        el.innerHTML = `<style>
          .pp { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
          .pp-pick { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12.5px; }
          .pp-pick select { max-width: 100%; }
          .pp-book { display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 1fr); border: 1.5px solid var(--fg); background: var(--bg); }
          .pp-id { padding: 14px; border-right: 1px dashed var(--line-strong); display: flex; flex-direction: column; gap: 8px; min-width: 0; }
          .pp-k { margin: 0; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
          .pp-photo { border: 1px solid var(--line); background: var(--surface); height: 170px; padding: 6px; }
          .pp-photo .molbox { height: 100%; }
          .pp-id h3 { margin: 0; font-size: 18px; letter-spacing: -0.02em; line-height: 1.25; text-wrap: balance; }
          .pp-id .mono { font-size: 11px; color: var(--muted); }
          .pp-id dl { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 2px 10px; margin: 0; font-family: var(--mono); font-size: 11.5px; font-variant-numeric: tabular-nums; }
          .pp-id dt { color: var(--muted); } .pp-id dd { margin: 0; }
          .pp-visa { padding: 14px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-content: start; }
          .pp-slot { border: 1px solid var(--line); background: var(--surface); padding: 8px; display: flex; flex-direction: column; gap: 6px; align-items: center; text-align: center; min-width: 0; }
          .pp-g { font-size: 11.5px; font-weight: 600; align-self: stretch; text-align: left; }
          .pp-stamp { width: 84px; height: 84px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 17px; letter-spacing: 0.06em; }
          .pp-stamp.s-pass { border: 4px double var(--fg); color: var(--fg); }
          .pp-stamp.s-fail { border: 4px double var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); color: var(--fg); }
          .pp-stamp.s-hit { border: 3px solid var(--hit-ring); background: var(--f7); color: var(--hi-fg); }
          .pp-stamp.s-hold { border: 4px double var(--f6); color: var(--fg); }
          .pp-stamp.s-none { border: 1.5px dashed var(--line-strong); color: var(--muted); font-size: 13px; font-weight: 500; }
          .pp-stamp.s-wait { border: 1.5px dotted var(--line-strong); color: var(--muted); font-size: 13px; font-weight: 500; }
          .pp-slot small { font-size: 11px; color: var(--muted); line-height: 1.35; overflow-wrap: anywhere; }
          @media (max-width: 760px) { .pp-book { grid-template-columns: minmax(0, 1fr); } .pp-id { border-right: 0; border-bottom: 1px dashed var(--line-strong); } .pp-visa { grid-template-columns: repeat(2, minmax(0, 1fr)); } .pp-stamp { width: 70px; height: 70px; font-size: 15px; } }
        </style><div class="pp"><div class="pp-pick"><label for="pp-sel">여권 주인</label>${select}<span class="muted">선정 분자와 관문별로 아깝게 떨어진 분자를 골라 볼 수 있어요.</span></div>
        <div class="pp-book"><div class="pp-id" data-cid="${c.id}"><p class="pp-k">분자 여권 · CRISTA · ${esc(ctx.gene)}</p><div class="pp-photo">${ctx.mol(c.s, 280, 160)}</div>
          <h3>${esc(c.n)}</h3><span class="mono">${esc(c.id)} · ${esc(c.lib)}</span>
          <dl><dt>MW</dt><dd>${c.mw.toFixed(1)}</dd><dt>TPSA</dt><dd>${c.tpsa.toFixed(1)}</dd><dt>logP</dt><dd>${c.logp.toFixed(2)}</dd><dt>Ro5</dt><dd>${c.ro5}개</dd><dt>QED</dt><dd>${c.qed.toFixed(2)}</dd><dt>점수</dt><dd>${c.score.toFixed(3)}</dd><dt>경고</dt><dd style="grid-column: span 3">${esc(al)}</dd></dl></div>
          <div class="pp-visa">${GATES.map(slot).join("")}</div></div></div>`;
        el.classList.add("scroll");
        el.querySelector("#pp-sel").addEventListener("change", (e) => { pick28 = e.target.value; draw(); ctx.drawMols(); });
      };
      draw();
    }
  });

  /* 29 내 깔때기 vs 기본 — 조건을 바꾼 효과를 기본 조건과 나란히 */
  SV.add({
    id: "29",
    line: "왼쪽 조건을 바꾸면 '내 깔때기'가 기본 조건과 얼마나 달라지는지 바로 보여요. 모둠마다 다른 깔때기가 다른 후보를 고르게 돼요.",
    render(el, ctx) {
      const { X, REM, step, esc } = ctx;
      const B = { mw: 500, tpsa: 120, ro5: 0, al: true, qed: 0.5, n: 10 };
      const f0 = new Map();
      X.forEach((c) => f0.set(c.id, !(c.mw <= B.mw && c.tpsa <= B.tpsa) ? 2 : c.ro5 > B.ro5 ? 3 : B.al && c.al.length ? 4 : c.qed < B.qed ? 5 : 0));
      X.filter((c) => f0.get(c.id) === 0).sort((a, b) => b.score - a.score).forEach((c, i) => f0.set(c.id, i < B.n ? 7 : 6));
      const REM0 = [0, 1, 2, 3, 4, 5, 6].map((k) => X.filter((c) => f0.get(c.id) > k).length);
      const mine = new Set(X.filter((c) => c.f === 7).map((c) => c.id)), base = new Set(X.filter((c) => f0.get(c.id) === 7).map((c) => c.id));
      const both = X.filter((c) => mine.has(c.id) && base.has(c.id)), onlyM = X.filter((c) => mine.has(c.id) && !base.has(c.id)), onlyB = X.filter((c) => base.has(c.id) && !mine.has(c.id));
      const same = REM.every((v, i) => v === REM0[i]) && !onlyM.length && !onlyB.length;
      const rules0 = ["라이브러리 3개 모두", "MW ≤ 500 · TPSA ≤ 120", "위반 0개까지", "아민 · 니트로 빼기", "QED ≥ 0.50", "상위 10"];
      const bar = (n, k, kind) => `<div class="b29 ${kind}"><i style="width:${(n / X.length) * 100}%" ${k === 6 ? 'class="hit"' : ""}></i><span>${n}</span></div>`;
      const rows = [0, 1, 2, 3, 4, 5, 6].map((k) => {
        const d = REM[k] - REM0[k];
        const g = ctx.GATES[k - 1];
        return `<div class="r29" style="opacity:${k > step ? 0.25 : 1}" data-f="${k || ""}"><div class="l29"><b>${k ? glyph(k) + " " + g.name : "시작"}</b>${k ? `<span class="mono muted">기본 ${esc(rules0[k - 1])}<br>내 것 ${esc(g.rule())}</span>` : ""}</div>
          ${bar(REM0[k], k, "base")}${bar(REM[k], k, "mine")}<div class="d29 mono">${d > 0 ? "▲ +" + d : d < 0 ? "▼ " + d : "="}</div></div>`;
      }).join("");
      const chips = (list) => list.length ? list.sort((a, b) => b.score - a.score).map((c) => `<span class="c29" data-cid="${c.id}">${esc(sname(c, 12))}</span>`).join("") : `<span class="muted">없음</span>`;
      el.classList.add("scroll");
      el.innerHTML = `<style>
        .w29 { padding: 14px; display: flex; flex-direction: column; gap: 14px; }
        .h29, .r29 { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr) 56px; gap: 10px; align-items: center; }
        .h29 { font-size: 11.5px; color: var(--muted); font-family: var(--mono); letter-spacing: 0.06em; border-bottom: 1px solid var(--line-strong); padding-bottom: 6px; }
        .r29 { padding: 6px 0; border-bottom: 1px solid var(--line); }
        .l29 { display: flex; flex-direction: column; font-size: 12.5px; min-width: 0; }
        .l29 .mono { font-size: 10.5px; line-height: 1.4; overflow-wrap: anywhere; }
        .b29 { position: relative; height: 22px; background: var(--raise); }
        .b29 i { position: absolute; inset: 0 auto 0 0; }
        .b29.base i { background: var(--faint); }
        .b29.mine i { background: var(--fg); }
        .b29 i.hit { background: var(--f7); outline: 1.5px solid var(--hit-ring); outline-offset: -1.5px; min-width: 3px; }
        .b29 span { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); font-family: var(--mono); font-size: 11.5px; font-variant-numeric: tabular-nums; background: var(--surface); padding: 0 4px; }
        .d29 { font-size: 12px; text-align: right; font-variant-numeric: tabular-nums; }
        .n29 { margin: 0; font-size: 12.5px; color: var(--muted); }
        .s29 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .s29 > div { border: 1px solid var(--line); background: var(--bg); padding: 10px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .s29 h4 { margin: 0; font-size: 12.5px; display: flex; justify-content: space-between; }
        .s29 h4 span { font-family: var(--mono); color: var(--muted); font-weight: 500; }
        .s29 .cs { display: flex; flex-wrap: wrap; gap: 4px; font-size: 11.5px; }
        .c29 { border: 1px solid var(--line-strong); padding: 1px 6px; background: var(--surface); }
        @media (max-width: 700px) { .h29, .r29 { grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 0.8fr) 44px; gap: 6px; } .s29 { grid-template-columns: minmax(0, 1fr); } }
      </style><div class="w29"><div class="h29"><span>관문</span><span>기본 깔때기</span><span>내 깔때기</span><span style="text-align:right">차이</span></div>${rows}
        ${same ? `<p class="n29">지금은 기본 조건과 똑같아요. 왼쪽에서 TPSA나 QED를 바꿔 보세요.</p>` : ""}
        <div class="s29"><div><h4>둘 다 선정 <span>${both.length}</span></h4><div class="cs">${chips(both)}</div></div>
          <div><h4>내 깔때기에서만 <span>${onlyM.length}</span></h4><div class="cs">${chips(onlyM)}</div></div>
          <div><h4>기본에서만 <span>${onlyB.length}</span></h4><div class="cs">${chips(onlyB)}</div></div></div></div>`;
    }
  });

  /* 30 막대 깔때기 개선판 — 남은 양 + 빠진 양 조각 + 규칙 + 한 줄 이유 */
  SV.add({
    id: "30",
    line: "검은 막대는 남은 분자, 바로 옆 색 조각은 그 관문에서 빠진 분자예요. 막대 길이는 모두 같은 자로 쟀어요.",
    render(el, ctx) {
      const { REM, DROP, GATES, step, X } = ctx;
      const W = Math.max(320, el.clientWidth), narrow = W < 700;
      const labW = narrow ? 112 : 230, resW = narrow ? 0 : 230;
      const lx = 12, barW = W - labW - resW - lx - (narrow ? 50 : 64), x0 = labW + lx;
      const rowH = narrow ? 62 : 52, top = 34, H = top + 7 * rowH + 10;
      const sc = (n) => (n / X.length) * barW;
      const why = ["", "고른 상자만 꺼내요", "너무 크거나 물을 좋아하면 흡수가 안 돼요", "먹는 약의 경험칙이에요", "몸속에서 독이 될 부품을 빼요", "약처럼 생겼는지 봐요", "표적에 잘 붙을 순서대로 골라요"];
      const cw = (ch, fs) => (/[\u3131-\uD79D]/.test(ch) ? fs * 0.98 : fs * 0.62);
      const fit = (s, px, fs) => { let w = 0, i = 0; for (; i < s.length; i++) { w += cw(s[i], fs); if (w > px) break; } return i < s.length ? s.slice(0, Math.max(1, i - 1)) + "…" : s; };
      let out = "";
      for (let v = 0; v <= X.length; v += 50) {
        out += `<line x1="${x0 + sc(v)}" y1="${top - 6}" x2="${x0 + sc(v)}" y2="${H - 6}" stroke="var(--line)"/><text x="${x0 + sc(v)}" y="${top - 12}" text-anchor="middle" font-size="10.5" class="t-mono t-muted">${v}</text>`;
      }
      for (let k = 0; k <= 6; k++) {
        const y = top + k * rowH, on = k <= step, bh = narrow ? 20 : 24, by = y + 6;
        const g = GATES[k - 1];
        out += `<g opacity="${on ? 1 : 0.15}">`;
        out += `<text x="${lx}" y="${by + 10}" font-size="${narrow ? 11.5 : 13}" font-weight="600">${k ? glyph(k) + " " + (narrow ? g.short : g.name) : "시작"}</text>`;
        out += `<text x="${lx}" y="${by + 26}" font-size="10.5" class="t-mono t-muted">${ctx.esc(fit(k ? g.rule() : `라이브러리 ${X.length}종`, labW - 8, 10.5))}</text>`;
        const bw = sc(REM[k]), hit = k === 6;
        out += `<rect x="${x0}" y="${by}" width="${Math.max(2, bw)}" height="${bh}" fill="${hit ? "var(--f7)" : "var(--fg)"}" ${hit ? 'stroke="var(--hit-ring)" stroke-width="1.5"' : ""}/>`;
        const inside = bw > 40;
        out += `<text x="${inside ? x0 + 8 : x0 + bw + 6}" y="${by + bh / 2 + 4}" font-size="12.5" font-weight="700" class="t-mono" style="fill:${inside ? (hit ? "var(--hi-fg)" : "var(--bg)") : "var(--fg)"}">${REM[k]}</text>`;
        if (k && DROP[k]) {
          const dx = x0 + bw + 2 + (inside ? 0 : 30), dw = sc(DROP[k]);
          out += `<rect x="${dx}" y="${by + 3}" width="${Math.max(2, dw)}" height="${bh - 6}" fill="var(--f${k})"/>`;
          out += `<text x="${dx + Math.max(2, dw) + 5}" y="${by + bh / 2 + 4}" font-size="11.5" class="t-mono t-muted">−${DROP[k]}</text>`;
        }
        if (k) {
          if (narrow) out += `<text x="${x0}" y="${by + bh + 15}" font-size="10.5" class="t-muted">${ctx.esc(fit(why[k], barW + 10, 10.5))}</text>`;
          else out += `<text x="${W - resW - 4}" y="${by + bh / 2 + 4}" font-size="12" class="t-muted">${ctx.esc(why[k])}</text>`;
        }
        out += `</g>`;
      }
      el.innerHTML = ctx.svg(W, H, out);
    }
  });
})();
