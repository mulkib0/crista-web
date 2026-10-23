/**
 * 개인 탭 상태(설계 §6.4 — 지금 보고 있는 걸음 · 도구 탭은 브라우저 로컬). 단계를 오가도 남고, 새로 고침해도 이 탭(sessionStorage)에서 남는다.
 * 서버 · 다른 모둠원에게는 가지 않는다. 저장소가 막혀 있어도(사생활 보호 창) 메모리로 동작한다.
 */
import { useCallback, useState } from 'react';

const memory = new Map<string, string>();
const KEY = (key: string) => `crista.tab.${key}`;

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return sessionStorage.getItem(KEY(key));
  } catch {
    return null;
  }
}

/**
 * @param key   화면 안에서 하나 — 예: `step:1.2` · `step:2.1:read`.
 * @param ids   고를 수 있는 탭 id — 저장된 값이 여기 없으면 `initial`.
 */
export function useLocalTab<T extends string>(key: string, ids: readonly T[], initial: T): [T, (next: T) => void] {
  const [tab, setTab] = useState<T>(() => {
    const saved = read(key);
    return saved && (ids as readonly string[]).includes(saved) ? (saved as T) : initial;
  });
  const set = useCallback(
    (next: T) => {
      memory.set(key, next);
      try {
        sessionStorage.setItem(KEY(key), next);
      } catch {
        // 저장소가 막혀 있으면 메모리만.
      }
      setTab(next);
    },
    [key],
  );
  return [tab, set];
}

const bench = new Map<string, unknown>();

/**
 * 개인 작업대 값(설계 §6.4 — 왼쪽 열 입력 · 무료 미리보기 결과 · 아직 내지 않은 초안). 단계를 오가도 남지만(메모리) 서버 ·
 * 브라우저 저장소에는 두지 않는다. 기능 화면이 공용 `Bench` 를 고치지 않고 자기 값을 들 때 쓴다 — 키는 `s12:cutoff` 처럼 단계 접두.
 */
export function useBenchState<T>(key: string, initial: T | (() => T)): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() =>
    bench.has(key) ? (bench.get(key) as T) : typeof initial === 'function' ? (initial as () => T)() : initial,
  );
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        bench.set(key, v);
        return v;
      });
    },
    [key],
  );
  return [value, set];
}

/** 작업 화면을 떠날 때(로그아웃 · 다른 계정) 개인 작업대를 비운다. */
export function clearBench(): void {
  bench.clear();
}
