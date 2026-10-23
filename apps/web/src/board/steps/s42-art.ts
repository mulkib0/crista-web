/**
 * 4.2 그림 · 내보내기(F42) — 포장(8.06) SVG · 허가증(8.01) · 영수증(8.08) 이미지(PNG) 저장용 SVG 문자열.
 * 화면 밖에서도 같은 색이 나오게 CSS 변수 대신 값(밝은 테마 토큰과 같은 값)을 쓴다. 바깥 라이브러리 없음.
 * 학생 글(브랜드 이름)은 규칙상 한글 · 영문 · 숫자뿐이지만 그래도 늘 `esc` 를 거친다.
 */
import {
  APPROVAL_COPY,
  formatCrista,
  PACK_SHAPE_FORM,
  packFits,
  type CertificateView,
  type IndForm,
  type PackColor,
  type PackLayout,
  type PackShape,
  type ReceiptView,
} from '@crista-web/web-contract';

/** 밝은 테마 토큰(styles.css :root)과 같은 값. */
export const C = {
  ink: '#080b09',
  paper: '#fbfbf6',
  bg: '#f1f1e9',
  raise: '#e7e8de',
  muted: '#5b6358',
  line: 'rgba(8,11,9,0.32)',
  good: '#2f6f2a',
  goodBg: '#e3ece0',
  bad: '#b2361b',
  badBg: '#f6e1da',
  hi: '#c6ff4a',
} as const;

export const PACK_FILL: Record<PackColor, string> = {
  ivory: '#f4ecd6',
  sage: '#cfe0c8',
  sand: '#ead2b0',
  sky: '#cfe3f5',
  blush: '#f7d6d6',
  lilac: '#e2d6f5',
};
/** 영수증 몫 띠 — 박막 색(색 외에도 글로 % 를 쓴다). */
export const GROUP_FILL = { discover: '#cdeaff', develop: '#ffd3ea', clinical: '#e6d4ff', approval: '#c6ff4a' } as const;

export const FORM_SHORT: Record<IndForm, string> = APPROVAL_COPY.formShort;
const U = APPROVAL_COPY.ui;

export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const FONT = `font-family="IBM Plex Sans KR, Noto Sans KR, sans-serif"`;
const SERIF = `font-family="Noto Serif KR, AppleMyungjo, serif"`;
const MONO = `font-family="IBM Plex Mono, SFMono-Regular, Consolas, monospace"`;
/** 글자 한 줄 — 속성에 글꼴이 있으면 기본 글꼴을 붙이지 않는다(같은 속성 두 번이면 SVG 가 깨진다). */
const T = (x: number, y: number, s: string, a = ''): string => `<text x="${x}" y="${y}" ${a.includes('font-family') ? '' : FONT} ${a}>${esc(s)}</text>`;

export interface PackArt {
  brand: string;
  codeName: string | null;
  doseMg: number | null;
  form: IndForm | null;
  company: string;
  shape: PackShape;
  color: PackColor;
  layout: PackLayout;
  /** 허가 날(허가 뒤 최종 렌더). */
  approvedDay?: number | null;
}

/** 상자(앞 · 위 · 옆) — 0,0 ~ 400,320. */
function boxArt(p: PackArt): string {
  const col = PACK_FILL[p.color];
  const brand = p.brand.trim() || p.codeName || U.brandSection;
  const n = Array.from(brand).length;
  let s = '';
  s += `<path d="M20 70 l40 -30 h300 l-40 30 z" fill="${col}" stroke="${C.ink}" stroke-width="1.5"/>`;
  s += `<path d="M320 70 l40 -30 v220 l-40 30 z" fill="${col}" stroke="${C.ink}" stroke-width="1.5"/><path d="M320 70 l40 -30 v220 l-40 30 z" fill="${C.ink}" fill-opacity="0.12"/>`;
  s += `<rect x="20" y="70" width="300" height="220" fill="${col}" stroke="${C.ink}" stroke-width="1.5"/>`;
  const info = `${p.codeName ?? '—'} · ${p.doseMg ?? '—'} mg`;
  const formLine = `${p.form ? APPROVAL_COPY.pack.shape[p.shape] + ' · ' + FORM_SHORT[p.form] : APPROVAL_COPY.pack.shape[p.shape]}${p.approvedDay != null ? ` · ${U.approvedOn} D+${p.approvedDay}` : ''}`;
  if (p.layout === 'top') {
    const fs = Math.max(16, Math.min(34, Math.floor(260 / Math.max(1, n))));
    s += `<rect x="20" y="70" width="300" height="70" fill="${C.ink}"/>`;
    s += `<text x="36" y="${105 + fs / 3}" font-size="${fs}" font-weight="700" fill="${C.paper}" ${SERIF}>${esc(brand)}</text>`;
    s += T(36, 170, info, `font-size="13" fill="${C.ink}" ${MONO}`);
    s += T(36, 236, p.company, `font-size="13" font-weight="600" fill="${C.ink}"`);
    s += T(36, 256, formLine, `font-size="11.5" fill="${C.muted}"`);
  } else if (p.layout === 'center') {
    const fs = Math.max(16, Math.min(38, Math.floor(270 / Math.max(1, n))));
    s += `<rect x="20" y="70" width="300" height="8" fill="${C.ink}"/>`;
    s += `<text x="170" y="${175}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${C.ink}" ${SERIF}>${esc(brand)}</text>`;
    s += `<line x1="70" x2="270" y1="192" y2="192" stroke="${C.ink}" stroke-opacity="0.4"/>`;
    s += `<text x="170" y="212" text-anchor="middle" font-size="13" fill="${C.ink}" ${MONO}>${esc(info)}</text>`;
    s += `<text x="170" y="258" text-anchor="middle" font-size="12" font-weight="600" fill="${C.ink}" ${FONT}>${esc(p.company)}</text>`;
    s += `<text x="170" y="276" text-anchor="middle" font-size="11" fill="${C.muted}" ${FONT}>${esc(formLine)}</text>`;
  } else {
    const fs = Math.max(16, Math.min(32, Math.floor(200 / Math.max(1, n))));
    s += `<rect x="20" y="70" width="64" height="220" fill="${C.ink}"/>`;
    s += `<text x="52" y="180" text-anchor="middle" font-size="14" fill="${C.paper}" ${MONO} transform="rotate(-90 52 180)">${esc(p.codeName ?? '')}</text>`;
    s += `<text x="100" y="${130 + fs / 3}" font-size="${fs}" font-weight="700" fill="${C.ink}" ${SERIF}>${esc(brand)}</text>`;
    s += T(100, 176, info, `font-size="13" fill="${C.ink}" ${MONO}`);
    s += T(100, 252, p.company, `font-size="12.5" font-weight="600" fill="${C.ink}"`);
    s += T(100, 272, formLine, `font-size="11" fill="${C.muted}"`);
  }
  // 바코드
  s += `<rect x="250" y="222" width="56" height="40" fill="${C.paper}" stroke="${C.ink}"/>`;
  for (let i = 0; i < 14; i++) s += `<rect x="${254 + i * 3.5}" y="226" width="${i % 3 ? 1.2 : 2.2}" height="26" fill="${C.ink}"/>`;
  return s;
}

/** 안의 약 + 제형 맞음 줄 — 0,0 ~ 400,300. */
function insideArt(p: PackArt): string {
  const col = PACK_FILL[p.color];
  const brand = p.brand.trim() || p.codeName || '';
  let s = '';
  if (p.shape === 'tablet' || p.shape === 'capsule') {
    s += `<rect x="10" y="20" width="380" height="200" rx="10" fill="${C.raise}" stroke="${C.line}"/>`;
    for (let i = 0; i < 10; i++) {
      const x = 50 + (i % 5) * 75;
      const y = 70 + Math.floor(i / 5) * 80;
      s += `<circle cx="${x}" cy="${y}" r="28" fill="${C.paper}" stroke="${C.line}"/>`;
      s +=
        p.shape === 'tablet'
          ? `<circle cx="${x}" cy="${y}" r="19" fill="${col}" stroke="${C.ink}" stroke-width="1.2"/><line x1="${x - 12}" x2="${x + 12}" y1="${y}" y2="${y}" stroke="${C.ink}" stroke-opacity="0.4"/>`
          : `<rect x="${x - 22}" y="${y - 9}" width="44" height="18" rx="9" fill="${col}" stroke="${C.ink}" stroke-width="1.2"/><path d="M${x} ${y - 9} h13 a9 9 0 0 1 0 18 h-13 z" fill="${C.ink}" fill-opacity="0.75"/>`;
    }
    s += T(22, 212, brand, `font-size="12" fill="${C.muted}" ${MONO}`);
  } else if (p.shape === 'vial') {
    for (let i = 0; i < 3; i++) {
      const x = 30 + i * 125;
      s += `<rect x="${x + 18}" y="20" width="44" height="22" fill="${C.muted}"/><rect x="${x + 24}" y="42" width="32" height="14" fill="${C.raise}" stroke="${C.line}"/>`;
      s += `<rect x="${x}" y="56" width="80" height="164" rx="8" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/><rect x="${x + 4}" y="160" width="72" height="56" rx="5" fill="#cdeaff"/>`;
      s += `<rect x="${x}" y="92" width="80" height="46" fill="${col}" stroke="${C.ink}"/>`;
      s += `<text x="${x + 40}" y="112" text-anchor="middle" font-size="12" font-weight="700" fill="${C.ink}" ${FONT}>${esc(Array.from(brand).slice(0, 6).join(''))}</text>`;
      s += `<text x="${x + 40}" y="129" text-anchor="middle" font-size="11" fill="${C.ink}" ${MONO}>${p.doseMg ?? '—'} mg</text>`;
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const x = 12 + (i % 2) * 192;
      const y = 14 + Math.floor(i / 2) * 106;
      s += `<rect x="${x}" y="${y}" width="180" height="96" fill="${C.paper}" stroke="${C.line}" stroke-dasharray="3 3"/>`;
      s += `<rect x="${x + 26}" y="${y + 12}" width="128" height="72" rx="14" fill="${col}" stroke="${C.ink}" stroke-width="1.2"/>`;
      s += `<text x="${x + 90}" y="${y + 46}" text-anchor="middle" font-size="13" font-weight="700" fill="${C.ink}" ${FONT}>${esc(Array.from(brand).slice(0, 8).join(''))}</text>`;
      s += `<text x="${x + 90}" y="${y + 64}" text-anchor="middle" font-size="11" fill="${C.ink}" ${MONO}>${p.doseMg ?? '—'} mg</text>`;
    }
  }
  const ok = packFits(p.shape, p.form);
  const shapeLabel = APPROVAL_COPY.pack.shape[p.shape];
  const msg = !p.form
    ? APPROVAL_COPY.pack.noForm
    : ok
      ? APPROVAL_COPY.pack.fits(FORM_SHORT[p.form])
      : APPROVAL_COPY.pack.misfit(shapeLabel, FORM_SHORT[PACK_SHAPE_FORM[p.shape]], FORM_SHORT[p.form]);
  s += `<rect x="10" y="240" width="380" height="40" rx="8" fill="${!p.form ? C.raise : ok ? C.goodBg : C.badBg}"/>`;
  s += T(22, 265, msg, `font-size="12.5" font-weight="700" fill="${!p.form ? C.muted : ok ? C.good : C.bad}"`);
  return s;
}

export const packLabel = (p: PackArt): string =>
  U.packAria(p.brand || p.codeName || '', APPROVAL_COPY.pack.shape[p.shape], APPROVAL_COPY.pack.color[p.color], APPROVAL_COPY.pack.layout[p.layout]);

/** 화면용 — 상자 · 안 두 장(폰에서는 아래로 쌓인다). */
export function packBoxSvg(p: PackArt): string {
  return `<svg viewBox="0 0 380 310" role="img" aria-label="${esc(packLabel(p))}" xmlns="http://www.w3.org/2000/svg">${boxArt(p)}</svg>`;
}
export function packInsideSvg(p: PackArt): string {
  const ok = packFits(p.shape, p.form);
  return `<svg viewBox="0 0 400 290" role="img" aria-label="${esc(U.insideAria(APPROVAL_COPY.pack.shape[p.shape], !p.form ? 'none' : ok ? 'ok' : 'bad'))}" xmlns="http://www.w3.org/2000/svg">${insideArt(p)}</svg>`;
}
/** 내보내기용 — 한 장(880 × 340). */
export function packExportSvg(p: PackArt): { svg: string; w: number; h: number } {
  const w = 880;
  const h = 340;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${C.paper}"/><g transform="translate(20 10)">${boxArt(p)}</g><g transform="translate(450 20)">${insideArt(p)}</g></svg>`;
  return { svg, w, h };
}

/** 허가 도장(8.01). */
export function stampSvg(day: number | null, size = 112): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="54" fill="none" stroke="${C.bad}" stroke-width="4"/><circle cx="60" cy="60" r="45" fill="none" stroke="${C.bad}" stroke-width="1.5"/><text x="60" y="68" text-anchor="middle" font-size="30" font-weight="700" fill="${C.bad}" ${SERIF}>${esc(APPROVAL_COPY.result.stampWord)}</text><text x="60" y="36" text-anchor="middle" font-size="11" fill="${C.bad}" ${MONO}>${esc(APPROVAL_COPY.result.stampTop)}</text><text x="60" y="90" text-anchor="middle" font-size="11" fill="${C.bad}" ${MONO}>${day != null ? `D+${day}` : ''}</text></svg>`;
}

/** 허가증 이미지(8.01). 줄마다 붙던 증거 단계 꼬리표는 2026-10-24 사용자 지시(출처 배지 삭제)로 뺐다. */
export function certExportSvg(cert: CertificateView): { svg: string; w: number; h: number } {
  const w = 820;
  const rowH = 30;
  const top = 190;
  const h = top + cert.rows.length * rowH + 70;
  let s = `<rect width="${w}" height="${h}" fill="${C.paper}"/><rect x="12" y="12" width="${w - 24}" height="${h - 24}" fill="none" stroke="${C.ink}" stroke-width="2"/><rect x="20" y="20" width="${w - 40}" height="${h - 40}" fill="none" stroke="${C.line}"/>`;
  s += T(40, 52, APPROVAL_COPY.result.certTop, `font-size="11" fill="${C.muted}" ${MONO} letter-spacing="1"`);
  s += `<text x="${w - 40}" y="52" text-anchor="end" font-size="11" fill="${C.muted}" ${MONO}>No. ${esc(cert.certificateNo)}</text>`;
  s += T(40, 88, APPROVAL_COPY.result.certKind, `font-size="15" font-weight="700" fill="${C.ink}" ${SERIF}`);
  s += `<text x="40" y="132" font-size="38" font-weight="700" fill="${C.ink}" ${SERIF}>${esc(cert.brand)}</text>`;
  s += T(40, 160, `${cert.codeName ?? ''} · ${FORM_SHORT[cert.form]} · ${cert.doseMg} mg`, `font-size="13" fill="${C.muted}"`);
  s += `<g transform="translate(${w - 170} 58) rotate(-11 56 56)">${stampSvg(cert.approvedGameDay).replace('<svg ', '<svg x="0" y="0" ')}</g>`;
  cert.rows.forEach((r, i) => {
    const y = top + i * rowH;
    s += `<line x1="40" x2="${w - 40}" y1="${y}" y2="${y}" stroke="${C.line}"/>`;
    s += T(40, y + 20, r.label, `font-size="12" fill="${C.muted}"`);
    const v = Array.from(r.value);
    s += `<text x="170" y="${y + 20}" font-size="13" fill="${C.ink}" ${r.mono ? MONO : FONT}>${esc(v.length > 62 ? v.slice(0, 61).join('') + '…' : r.value)}</text>`;
  });
  const fy = top + cert.rows.length * rowH;
  s += `<line x1="40" x2="${w - 40}" y1="${fy}" y2="${fy}" stroke="${C.ink}"/>`;
  s += T(40, fy + 30, `${cert.company} (${cert.ticker}) · ${U.approvedOn} D+${cert.approvedGameDay}`, `font-size="13" font-weight="600" fill="${C.ink}"`);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`, w, h };
}

const dayText = (from: number | null, to: number | null): string => (from === null ? '' : to !== null && to !== from ? `D+${from}~${to}` : `D+${from}`);

/** 영수증 이미지(8.08). */
export function receiptExportSvg(r: ReceiptView, meta: { company: string; ticker: string; brand: string | null; codeName: string | null }): { svg: string; w: number; h: number } {
  const w = 520;
  const lh = 22;
  const lines = r.spent.length + r.income.length;
  const h = 170 + lines * lh + 230;
  const R = (y: number, a: string, b: string, c: string, color: string = C.ink, bold = false) =>
    `<text x="28" y="${y}" font-size="12.5" fill="${color}" ${MONO} ${bold ? 'font-weight="700"' : ''}>${esc(a)}</text><text x="340" y="${y}" font-size="11.5" fill="${C.muted}" ${MONO}>${esc(b)}</text><text x="${w - 28}" y="${y}" text-anchor="end" font-size="12.5" fill="${color}" ${MONO} ${bold ? 'font-weight="700"' : ''}>${esc(c)}</text>`;
  let s = `<rect width="${w}" height="${h}" fill="${C.paper}"/>`;
  s += `<text x="${w / 2}" y="40" text-anchor="middle" font-size="15" font-weight="700" fill="${C.ink}" ${MONO} letter-spacing="2">${esc(APPROVAL_COPY.result.receiptHead)}</text>`;
  s += `<text x="${w / 2}" y="62" text-anchor="middle" font-size="11.5" fill="${C.muted}" ${FONT}>${esc(`${meta.company} (${meta.ticker})${meta.codeName ? ` · ${meta.codeName}` : ''}${meta.brand ? ` 「${meta.brand}」` : ''}`)}</text>`;
  let y = 96;
  s += R(y, APPROVAL_COPY.receipt.spentTitle, '', '', C.muted);
  for (const l of r.spent) {
    y += lh;
    const label = `${l.failed ? '✕ ' : ''}${l.label}${l.count > 1 ? ` ×${l.count}` : ''}`;
    s += R(y, Array.from(label).length > 30 ? Array.from(label).slice(0, 29).join('') + '…' : label, dayText(l.dayFrom, l.dayTo), `−${formatCrista(l.crista, { unit: false })}`, l.failed ? C.bad : C.ink);
  }
  y += lh;
  s += `<line x1="28" x2="${w - 28}" y1="${y - 14}" y2="${y - 14}" stroke="${C.line}" stroke-dasharray="4 3"/>`;
  s += R(y, APPROVAL_COPY.receipt.incomeTitle, '', '', C.muted);
  for (const l of r.income) {
    y += lh;
    s += R(y, `${l.label}${l.count > 1 ? ` ×${l.count}` : ''}`, dayText(l.dayFrom, l.dayTo), `+${formatCrista(l.crista, { unit: false })}`);
  }
  y += lh + 6;
  s += `<line x1="28" x2="${w - 28}" y1="${y - 16}" y2="${y - 16}" stroke="${C.ink}" stroke-dasharray="4 3"/>`;
  s += R(y, APPROVAL_COPY.receipt.total, '', formatCrista(r.totals.spentCrista), C.ink, true);
  y += lh;
  s += R(y, APPROVAL_COPY.receipt.initial, '', formatCrista(r.totals.initialCrista));
  y += lh;
  s += R(y, APPROVAL_COPY.receipt.income, '', formatCrista(r.totals.incomeCrista));
  y += lh;
  s += R(y, APPROVAL_COPY.receipt.balance, '', formatCrista(r.totals.balanceCrista), C.ink, true);
  y += lh;
  s += R(y, APPROVAL_COPY.receipt.days, '', r.daysTaken !== null ? U.daysUnit(r.daysTaken) : '—');
  y += lh;
  s += R(y, APPROVAL_COPY.receipt.molecules, '', `${r.molecules.start ?? '—'} → ${r.molecules.end ?? '?'}`);
  y += 18;
  const sum = r.shares.reduce((a, g) => a + g.crista, 0) || 1;
  let x = 28;
  const bw = w - 56;
  for (const g of r.shares) {
    const gw = (g.crista / sum) * bw;
    if (gw > 0) s += `<rect x="${x}" y="${y}" width="${gw}" height="16" fill="${GROUP_FILL[g.group]}"/>`;
    x += gw;
  }
  s += `<rect x="28" y="${y}" width="${bw}" height="16" fill="none" stroke="${C.ink}"/>`;
  y += 34;
  s += `<text x="28" y="${y}" font-size="11" fill="${C.ink}" ${FONT}>${esc(r.shares.map((g) => `${APPROVAL_COPY.receipt.group[g.group]} ${Math.round((g.crista / sum) * 100)}%`).join(' · '))}</text>`;
  y += 26;
  s += `<text x="${w / 2}" y="${y}" text-anchor="middle" font-size="11.5" fill="${C.muted}" ${MONO}>${esc(U.receiptEnd(!!(meta.brand && r.molecules.end), r.lastGameDay ?? 0, meta.brand))}</text>`;
  const H = Math.max(h, y + 30);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}">${s.replace(`height="${h}" fill="${C.paper}"`, `height="${H}" fill="${C.paper}"`)}</svg>`, w, h: H };
}

/** SVG 문자열 → PNG 내려받기(캔버스 2배). foreignObject 를 쓰지 않아 캔버스가 막히지 않는다. */
export async function downloadPng(art: { svg: string; w: number; h: number }, filename: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([art.svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(U.pngFail));
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = art.w * scale;
    canvas.height = art.h * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(U.pngFail);
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error(U.pngFail);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 한 덩어리만 인쇄 — 대상에 표시를 달고 인쇄 뒤 뗀다(s42.css @media print). */
export function printOnly(el: HTMLElement | null): void {
  if (!el) return;
  el.classList.add('s42-print-on');
  document.body.classList.add('s42-printing');
  const off = () => {
    el.classList.remove('s42-print-on');
    document.body.classList.remove('s42-printing');
    removeEventListener('afterprint', off);
  };
  addEventListener('afterprint', off);
  window.print();
}
