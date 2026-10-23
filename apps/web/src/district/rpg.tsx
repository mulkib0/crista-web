/**
 * 사옥 지구 RPG 창(시안 design/district-rpg-10 · 01 '메시지 창 · 얼굴 그래픽') — 쯔꾸르 기본 파란 창.
 *
 * - 대사 창: 아래에 한 글자씩(초당 약 33자), 다 나오면 ▼. Z · E · 스페이스 · 엔터 · 누르기로 넘기고, Esc · X 로 닫는다.
 * - 선택지 창: 대사가 다 나온 뒤 오른쪽 위에. ↑↓(W · S)로 고르고 결정 키로 정한다. Esc · X 는 마지막 선택지(그만두기 쪽).
 * - 얼굴 그래픽: 아틀라스 캐릭터 정지 프레임의 위 32px(머리 · 상반신)를 3배로 — 새 그림 없이.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Avatar } from '@crista-web/web-contract';

export interface AtlasFrames {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
}

const OK = new Set(['KeyZ', 'KeyE', 'Space', 'Enter', 'NumpadEnter']);
const BACK = new Set(['Escape', 'KeyX']);

let atlas: HTMLImageElement | null = null;
function atlasImage(): HTMLImageElement {
  if (!atlas) {
    atlas = new Image();
    atlas.src = `${import.meta.env.BASE_URL}assets/atlas/crista-atlas-0.png`;
  }
  return atlas;
}

/** 얼굴 그래픽 — 96×96 캔버스(작은 화면에서는 CSS 로 64px). */
export function Face({ avatar, frames }: { avatar: Avatar; frames: AtlasFrames | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const f = frames?.frames[`char/${avatar}`]?.frame;
    if (!canvas || !f) return;
    const img = atlasImage();
    const draw = () => {
      const x = canvas.getContext('2d');
      if (!x) return;
      x.imageSmoothingEnabled = false;
      x.clearRect(0, 0, 96, 96);
      x.drawImage(img, f.x, f.y, f.w, 32, (96 - f.w * 3) / 2, 6, f.w * 3, 96);
    };
    if (img.complete) draw();
    else img.addEventListener('load', draw, { once: true });
    return () => img.removeEventListener('load', draw);
  }, [avatar, frames]);
  return <canvas ref={ref} className="rpg-face" width={96} height={96} aria-hidden="true" />;
}

export interface SayOptions {
  face?: Avatar | null;
  name?: string;
  text: string;
  choices?: string[];
}

/** 대사 창 + 선택지 창. 선택지가 없으면 null, 있으면 고른 번호로 끝난다. */
export function RpgMessage({ say, frames, onDone }: { say: SayOptions; frames: AtlasFrames | null; onDone: (choice: number | null) => void }) {
  const { face, name, text, choices } = say;
  const [shown, setShown] = useState(() => (matchMedia('(prefers-reduced-motion: reduce)').matches ? text.length : 0));
  const [sel, setSel] = useState(0);
  const done = shown >= text.length;
  const box = useRef<HTMLDivElement>(null);
  const [boxH, setBoxH] = useState(112);

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setShown((n) => n + 1), 30);
    return () => clearInterval(id);
  }, [done]);

  useEffect(() => {
    if (box.current) setBoxH(box.current.offsetHeight);
  }, [done]);

  // 한 번만 끝낸다 — 키 · 누르기가 겹쳐도.
  const finished = useRef(false);
  const finish = (v: number | null) => {
    if (finished.current) return;
    finished.current = true;
    onDone(v);
  };
  const advance = () => {
    if (!done) setShown(text.length);
    else if (!choices) finish(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const n = choices?.length ?? 0;
      if (done && n > 0 && (e.code === 'ArrowDown' || e.code === 'KeyS')) setSel((s) => (s + 1) % n);
      else if (done && n > 0 && (e.code === 'ArrowUp' || e.code === 'KeyW')) setSel((s) => (s - 1 + n) % n);
      else if (OK.has(e.code)) {
        if (done && n > 0) finish(sel);
        else advance();
      } else if (BACK.has(e.code)) {
        if (!done) setShown(text.length);
        else finish(n > 0 ? n - 1 : null);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <div ref={box} className={`rpg-win rpg-msg${done ? ' done' : ''}${choices ? ' ask' : ''}`} role="dialog" aria-modal="true" aria-label={name ?? '대사'} onClick={advance}>
        {face && <Face avatar={face} frames={frames} />}
        <div className="rpg-body">
          {name && <b className="rpg-name">{name}</b>}
          <p className="rpg-text" aria-live="polite">{text.slice(0, shown)}</p>
        </div>
        <i className="rpg-more" aria-hidden="true">▼</i>
      </div>
      {done && choices && (
        <div className="rpg-win rpg-choice" role="listbox" aria-label="선택지" style={{ bottom: boxH + 22 }}>
          {choices.map((c, i) => (
            <button key={c} type="button" role="option" aria-selected={i === sel} className={i === sel ? 'on' : ''} onMouseEnter={() => setSel(i)} onClick={() => finish(i)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/** 대사 창 모양의 입력 창(등기). 입력 칸 안에서는 WASD · Z 가 글자로 들어간다 — 장면은 꺼 둔다. */
export function RpgForm({ title, note, onSubmit, onCancel, children, submitLabel, busy, error }: {
  title: string;
  note?: string;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  children: ReactNode;
  submitLabel: string;
  busy: boolean;
  error: string | null;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <form className="rpg-win rpg-msg rpg-form" role="dialog" aria-modal="true" aria-label={title} onSubmit={onSubmit} noValidate>
      <b className="rpg-name">{title}</b>
      {note && <p className="rpg-note">{note}</p>}
      <div className="rpg-fields">{children}</div>
      <p className="rpg-err" role="alert">{error ?? ''}</p>
      <div className="rpg-acts">
        <button type="button" className="rpg-btn" onClick={onCancel}>나중에</button>
        <button type="submit" className="rpg-btn pri" disabled={busy}>{submitLabel}</button>
      </div>
    </form>
  );
}

/** 지도 이름 표시 — 들어오면 왼쪽 위에 3초. */
export function MapName({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="rpg-mapname" aria-hidden="true">
      {title}
      {sub && <small>{sub}</small>}
    </div>
  );
}

/** 설립 등기 도장 — 화면 가운데 쾅(화면 흔들림은 부모가 .shake 로). */
export function RpgStamp({ name }: { name: string }) {
  return (
    <div className="rpg-stamp" role="status">
      <div>
        설립 등기<small>{name}</small>
      </div>
      <p className="rpg-win">등기했어요. 작업 화면으로 가요…</p>
    </div>
  );
}
