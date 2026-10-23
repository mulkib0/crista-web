/**
 * 서류 칸 편집기 — 연구 노트 칸(설계 §6.4) · 특허 출원서 · 동물실험계획서 · IND 신청서 칸(§5.8 · §5.9 · §5.10)이 함께 쓴다.
 *
 * - 칸마다 따로 저장해서 여럿이 같은 서류의 다른 칸을 동시에 써도 덮지 않는다. 1초 동안 멈추면 저장(칸을 떠날 때도).
 * - 내가 고치는 칸을 남이 바꿔도 입력 중인 글을 덮지 않고 '새 글이 있어요' 만 알린다.
 * - 저장은 읽은 칸 판(`version`)을 싣는다(낙관적 잠금). 그 사이 누가 같은 칸을 고쳤으면 서버가 409 `stale` 로 상대 글을 주고,
 *   내 초안은 그대로 둔 채 '상대 글 아래에 붙여 저장' · '내 글로 저장' 을 고르게 한다.
 *
 * 저장 함수(`save`)만 기능이 정한다 — 409 의 지금 칸은 기본으로 `ApiFailure.note`(노트 칸 모양)에서 꺼내고,
 * 모양이 다른 서류는 `staleOf` 로 꺼내 준다(`ApiFailure.detail` 에 서버 본문이 그대로 있다).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Avatar } from '@crista-web/web-contract';
import { ApiFailure, message } from '../../api.ts';
import { AVATAR_LABEL } from './bits.tsx';

/** 서버에 있는 칸 하나 — 비어 있으면 null. */
export interface DocSectionValue {
  body: string;
  /** 칸 판 — 비어 있던 칸은 0. 저장할 때 `expectedVersion` 으로 돌려보낸다. */
  version: number;
  byName: string | null;
  avatar?: Avatar | null;
}

/** 409 `stale` 때 받은 지금 칸 — 칸이 지워졌으면 body 가 ''. */
export interface DocSectionStale {
  body: string;
  byName: string | null;
  version: number;
}

export interface DocSectionEditorProps {
  /** textarea id — 화면 안에서 하나. */
  id: string;
  label: ReactNode;
  /** 칸 아래 안내(무엇을 쓰나 · 심사 기준). */
  guide?: ReactNode;
  value: DocSectionValue | null;
  /** 저장 — 새 판을 돌려준다. 409 는 던진다(ApiFailure). */
  save: (body: string, expectedVersion: number) => Promise<{ version: number }>;
  /** 409 에서 지금 칸 꺼내기 — 기본은 `ApiFailure.note`. */
  staleOf?: (error: ApiFailure) => DocSectionStale | null;
  /** 내 이름 — 남이 바꾼 칸인지 알 때 쓴다. */
  myName: string;
  maxLength?: number;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
  /** 저장이 끝날 때마다(화면이 다시 읽기 등). */
  onSaved?: (version: number) => void;
}

const defaultStale = (e: ApiFailure): DocSectionStale | null =>
  e.note ? { body: e.note.body, byName: e.note.byName, version: e.note.version } : { body: '', byName: null, version: 0 };

export function DocSectionEditor({ id, label, guide, value, save, staleOf = defaultStale, myName, maxLength = 2000, placeholder, rows, readOnly, onSaved }: DocSectionEditorProps) {
  const [text, setText] = useState(value?.body ?? '');
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [theirs, setTheirs] = useState<DocSectionStale | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef(text);
  // 내 글이 딛고 선 칸 판 — 고치기 시작한 뒤에는 남이 바꿔도 그대로 둔다(저장할 때 서버가 비교).
  const base = useRef(value?.version ?? 0);
  const remoteBody = value?.body ?? '';
  const remoteVersion = value?.version ?? 0;

  // 남이 바꾼 글 — 내가 고치는 중이 아니면 바로 반영.
  useEffect(() => {
    if (dirty) return;
    setText(remoteBody);
    textRef.current = remoteBody;
    base.current = remoteVersion;
  }, [remoteBody, remoteVersion, dirty]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const run = async (body: string) => {
    if (timer.current) clearTimeout(timer.current);
    setState('saving');
    try {
      const res = await save(body, base.current);
      base.current = res.version;
      // 저장하는 사이 더 쓴 글이 있으면 아직 고치는 중이다.
      if (textRef.current === body) setDirty(false);
      setTheirs(null);
      setState('saved');
      setErr(null);
      onSaved?.(res.version);
    } catch (e) {
      setState('error');
      if (e instanceof ApiFailure && e.code === 'stale') {
        setTheirs(staleOf(e) ?? { body: '', byName: null, version: 0 });
        setErr(null);
      } else {
        setErr(message(e));
      }
    }
  };

  const onChange = (next: string) => {
    setText(next);
    textRef.current = next;
    setDirty(true);
    setState('idle');
    if (timer.current) clearTimeout(timer.current);
    // 충돌을 고르는 동안에는 자동 저장하지 않는다(늘 409 가 된다).
    if (!theirs) timer.current = setTimeout(() => void run(next), 1000);
  };

  /** 충돌 풀기 — 상대 글 판 위에 저장한다. */
  const resolve = (body: string) => {
    if (!theirs) return;
    base.current = theirs.version;
    setText(body);
    textRef.current = body;
    void run(body);
  };

  const conflict = !theirs && dirty && remoteVersion !== base.current && value && value.byName !== myName;
  const by = value ? `${value.byName ?? '—'}${value.avatar ? ` · ${AVATAR_LABEL[value.avatar]}` : ''} · 판 ${value.version}` : '';
  return (
    <div className="doc-c">
      <label className="lab" htmlFor={id}>
        {label}
        <em className="mini">{state === 'saving' ? '저장 중…' : theirs ? '합치기 필요' : state === 'error' ? '저장 실패' : by}</em>
      </label>
      <textarea
        id={id}
        className="txt"
        value={text}
        rows={rows}
        maxLength={maxLength}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => dirty && !theirs && void run(text)}
        placeholder={placeholder}
      />
      {guide && <p className="hint">{guide}</p>}
      {conflict && <p className="hint">다른 모둠원이 이 칸을 고쳤어요. 저장할 때 두 글을 합칠지 골라요.</p>}
      {theirs && (
        <div className="doc-stale" role="alert">
          <p className="hint bad">
            {theirs.body ? `${theirs.byName ?? '다른 모둠원'} 님이 이 칸을 먼저 고쳤어요. 내 글은 그대로 있어요.` : '다른 모둠원이 이 칸을 비웠어요. 내 글은 그대로 있어요.'}
          </p>
          {theirs.body && <blockquote className="mini">{theirs.body}</blockquote>}
          <div className="acts">
            {theirs.body && (
              <button className="btn sm" type="button" onClick={() => resolve(`${theirs.body}\n\n${text}`.trim())}>상대 글 아래에 내 글 붙여 저장</button>
            )}
            <button className="btn sm" type="button" onClick={() => resolve(text)}>내 글로 저장</button>
          </div>
        </div>
      )}
      {err && <p className="hint bad">{err}</p>}
    </div>
  );
}
