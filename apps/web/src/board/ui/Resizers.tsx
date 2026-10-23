/**
 * 본문 섬 너비 손잡이 — 사이드바 | 섬 사이, 나의 작업대 | 모둠 공유 사이를 끌어 너비를 바꾼다(두 번 누르면 처음대로, 방향키로도).
 * 값은 본문(`.bd-body`)의 CSS 변수 `--side-w` · `--mine-f` · `--team-f` 로 넣고 이 브라우저에 남긴다(저장이 막혀도 기본값으로 보인다).
 * 손잡이는 섬 사이 틈(12px)에 겹쳐 놓는다 — 모양은 `styles.css` 의 '섬 너비 손잡이'. 폰(한 줄 쌓기)에서는 숨는다.
 */
import { useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';

const KEY = 'crista.bd-split';
const GAP = 12;
const SIDE_MIN = 180;
const SIDE_MAX = 480;
const ISL_MIN = 300;
const STEP = 16;

/** side = 사이드바 너비(px), mine = 작업대 몫(0~1, 나머지는 모둠 공유). 없으면 기본(CSS) 값. */
type Split = { side?: number; mine?: number };
type Which = 'side' | 'mine';

function read(): Split {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Split | null;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

function save(s: Split) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 저장이 막힌 브라우저 — 이번 화면에서만 바뀐다 */
  }
}

function apply(el: HTMLElement, s: Split) {
  if (s.side) el.style.setProperty('--side-w', `${s.side}px`);
  else el.style.removeProperty('--side-w');
  // fr 합이 1보다 작으면 남는 폭을 다 쓰지 않으므로 100 기준으로 나눈다.
  if (s.mine) {
    el.style.setProperty('--mine-f', `${(s.mine * 100).toFixed(2)}fr`);
    el.style.setProperty('--team-f', `${((1 - s.mine) * 100).toFixed(2)}fr`);
  } else {
    el.style.removeProperty('--mine-f');
    el.style.removeProperty('--team-f');
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** 손잡이를 x(화면 좌표)로 옮겼을 때의 값. 섬이 없으면 null. */
function at(body: HTMLElement, which: Which, x: number): Split | null {
  if (which === 'side') {
    const side = body.querySelector<HTMLElement>(':scope > .isl.side');
    if (!side) return null;
    const left = side.getBoundingClientRect().left;
    return { side: Math.round(clamp(x - left - GAP / 2, SIDE_MIN, SIDE_MAX)) };
  }
  const mine = body.querySelector<HTMLElement>(':scope > .isl-mine');
  const team = body.querySelector<HTMLElement>(':scope > .isl-team');
  if (!mine || !team) return null;
  const left = mine.getBoundingClientRect().left;
  const avail = team.getBoundingClientRect().right - left - GAP;
  if (avail <= 0) return null;
  const w = avail < ISL_MIN * 2 ? avail / 2 : clamp(x - left - GAP / 2, ISL_MIN, avail - ISL_MIN);
  return { mine: Math.round((w / avail) * 1000) / 1000 };
}

/** 지금 손잡이 자리(화면 좌표). */
function edge(body: HTMLElement, which: Which): number | null {
  const el = body.querySelector<HTMLElement>(which === 'side' ? ':scope > .isl.side' : ':scope > .isl-mine');
  return el ? el.getBoundingClientRect().right + GAP / 2 : null;
}

/** 손잡이는 본문 바로 안에 있다 — 본문은 그 부모(부모 ref 는 자식 layout effect 뒤에야 붙어서 쓰지 않는다). */
const bodyOf = (grip: HTMLElement) => grip.parentElement;

function Grip({ which, label, gripRef }: { which: Which; label: string; gripRef?: RefObject<HTMLDivElement | null> }) {
  const set = (el: HTMLElement | null, next: Split | null) => {
    if (!el || !next) return;
    const s = { ...read(), ...next };
    apply(el, s);
    save(s);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = bodyOf(e.currentTarget);
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || !el) return;
    set(el, at(el, which, e.clientX));
  };
  const end = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    bodyOf(e.currentTarget)?.removeAttribute('data-rz');
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = bodyOf(e.currentTarget);
    if (!el || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const x = edge(el, which);
    if (x !== null) set(el, at(el, which, x + (e.key === 'ArrowLeft' ? -STEP : STEP)));
  };
  return (
    <div
      ref={gripRef}
      className={`bd-rz bd-rz-${which}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`${label} — 끌거나 방향키로 바꾸고, 두 번 누르면 처음대로`}
      tabIndex={0}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        bodyOf(e.currentTarget)?.setAttribute('data-rz', which);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={(e) => {
        const el = bodyOf(e.currentTarget);
        if (!el) return;
        const s = read();
        delete s[which];
        apply(el, s);
        save(s);
      }}
      onKeyDown={key}
    />
  );
}

/** `.bd-body` 바로 안에 둔다 — 저장해 둔 너비를 처음 그릴 때 넣고, 손잡이 둘을 놓는다. */
export function BodyResizers() {
  const first = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = first.current && bodyOf(first.current);
    if (el) apply(el, read());
  }, []);
  return (
    <>
      <Grip which="side" label="사이드바 너비" gripRef={first} />
      <Grip which="mine" label="나의 작업대 · 모둠 공유 너비" />
    </>
  );
}
