/**
 * 항체 랩 화면의 서버 호출.
 *
 * - 읽기는 공용 `useLive(path, refetchOn)`(8b 부품)이 해요 — WS 알림 → 다시 읽기 · 150ms 묶음 · 늦은 응답 버림.
 *   **화면에 폴링 코드를 쓰지 않아요.**
 * - **자동 내려앉기는 없어요**(§3.5) — 서버 오류는 그대로 화면에 보여 줘요. 가짜 숫자를 실측처럼 보여 주지 않아요.
 *   주소에 `?mock=1` 일 때만 서버를 부르지 않고 `mock.ts` 의 연습용 고정 자료로 그려요(화면만 손볼 때 · 수업 시연용).
 * - 쓰기는 연습 모드에서 `mock.ts` 의 순수 함수로 그 자리에서 반영해요.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  ANTIBODY_API,
  type AntibodyBoardResponse,
  type AntibodyBoldness,
  type AntibodyCardStep,
  type AntibodyJobStep,
  type AntibodyMutation,
  type AntibodyProposalTopic,
  type AntibodyStepId,
  type AntibodyVoteChoice,
  type DesignView,
  type MeResponse,
  type NoteSection,
  type PreviewMetrics,
  type ServerMessage,
} from '@crista-web/web-contract';
import { api, ApiFailure } from '../api.ts';
import { useLive } from '../board/ui/index.ts';
import {
  mockAddCard,
  mockAddDesign,
  mockAddProposal,
  mockBoard,
  mockPreview,
  mockRunJob,
  mockSaveNote,
  mockSubmit,
  mockSuggest,
  mockVote,
} from './mock.ts';

/** `?mock=1` 인지 — 연습용 고정 자료를 보는 유일한 길이에요(`?mock=0` 분기는 없어요). */
function flag(): '1' | null {
  try {
    return new URLSearchParams(location.search).get('mock') === '1' ? '1' : null;
  } catch {
    return null;
  }
}

/** 항체 화면이 다시 읽어야 하는 소식(§5.6) — 저분자 화면을 쓸데없이 깨우지 않으려고 전용 타입을 써요. */
const refetchOn = (m: ServerMessage): boolean =>
  m.type === 'antibody.changed' || m.type === 'antibody.consensus' || m.type === 'antibody.news';

export interface AbBoard {
  board: AntibodyBoardResponse | null;
  error: string | null;
  /** mock 자료를 보고 있나 — 화면에 늘 알려요. */
  mock: boolean;
  /** 아직 등기하지 않은 모둠 — 화면이 사옥 지구로 돌려보내요(§1.3). */
  notRegistered: boolean;
  reload: () => void;
  /** mock 모드에서 그 자리 반영 · 서버 모드에서는 다시 읽기. */
  apply: (fn: (board: AntibodyBoardResponse) => AntibodyBoardResponse) => void;
}

export function useAbBoard(me: MeResponse): AbBoard {
  const forced = flag();
  const live = useLive<AntibodyBoardResponse>(forced === '1' ? null : ANTIBODY_API.board, refetchOn);
  const [mockState, setMockState] = useState<AntibodyBoardResponse | null>(null);

  // `?mock=1` 일 때만 연습용 고정 자료를 봐요 — 서버 오류로 **내려앉지 않아요**(§3.5).
  const fallback = forced === '1';
  const board = useMemo(() => {
    if (!fallback) return live.data;
    return mockState ?? mockBoard(me);
  }, [fallback, live.data, mockState, me]);

  const apply = useCallback(
    (fn: (board: AntibodyBoardResponse) => AntibodyBoardResponse) => {
      if (fallback) setMockState((prev) => fn(prev ?? mockBoard(me)));
      else live.reload();
    },
    [fallback, live, me],
  );

  return {
    board,
    error: fallback ? null : live.error ? live.error.message : null,
    mock: fallback,
    notRegistered: live.error instanceof ApiFailure && live.error.code === 'not_registered_team',
    reload: live.reload,
    apply,
  };
}

/** 쓰기 — mock 이면 `mock.ts` 의 순수 함수로, 아니면 실제 경로로. 부르는 쪽은 같은 함수만 써요. */
export function abActions(ab: AbBoard, myName: string) {
  const { mock, apply } = ab;
  return {
    async putProgram(antigenTarget: string, parentAntibodyChemblId: string, referencePdb: string, version: number) {
      if (!mock) await api.put(ANTIBODY_API.program, { antigenTarget, parentAntibodyChemblId, referencePdb, chainRoles: { set: '1', H: 'H' }, version });
      apply((b) => ({ ...b, program: { ...b.program, antigenTarget, referencePdb, version: version + 1 } }));
    },
    async addCard(step: AntibodyCardStep, slot: string, payload: unknown, rationale: string) {
      if (!mock) await api.post(ANTIBODY_API.cards, { step, slot, payload, rationale });
      apply((b) => mockAddCard(b, step, slot, payload, rationale, myName));
    },
    async propose(topic: AntibodyProposalTopic, value: unknown, rationale: string) {
      if (!mock) await api.post(ANTIBODY_API.proposals, { topic, value, rationale });
      apply((b) => mockAddProposal(b, topic, value, rationale, myName));
    },
    async vote(proposalId: string, choice: AntibodyVoteChoice, version: number) {
      if (!mock) await api.post(ANTIBODY_API.votes(proposalId), { choice, version });
      apply((b) => mockVote(b, proposalId, choice));
    },
    async addDesign(label: string, vh: string, vl: string | undefined, mutations: readonly AntibodyMutation[], slot: 1 | 2) {
      if (!mock) await api.post(ANTIBODY_API.designs, { label, vh, vl, mutations });
      apply((b) => mockAddDesign(b, label, vh, vl, mutations, myName, slot));
    },
    async suggest(count: number, boldness: AntibodyBoldness): Promise<DesignView[]> {
      if (!mock) return api.post<DesignView[]>(ANTIBODY_API.suggest, { count, boldness });
      return mockSuggest(count, boldness, myName);
    },
    async preview(vh: string, vl?: string): Promise<PreviewMetrics> {
      if (!mock) return api.post<PreviewMetrics>(ANTIBODY_API.preview, { vh, vl });
      return mockPreview(vh, vl);
    },
    async runJob(step: AntibodyJobStep, designId: string, params: Record<string, unknown> = {}) {
      if (!mock) await api.post(ANTIBODY_API.jobs, { requestId: crypto.randomUUID().replace(/-/g, ''), step, designId, params });
      apply((b) => mockRunJob(b, step, designId, params['shape'] === 'scfv'));
    },
    async saveNote(stepId: AntibodyStepId, section: NoteSection, body: string, version: number): Promise<{ version: number }> {
      if (!mock) return api.put<{ version: number }>(ANTIBODY_API.note(stepId, section), { body, version });
      apply((b) => mockSaveNote(b, stepId, section, body, myName).board);
      return { version: version + 1 };
    },
    async submit(designId: string) {
      if (!mock) await api.post(ANTIBODY_API.submit, { designId, requestId: crypto.randomUUID().replace(/-/g, '') });
      apply((b) => mockSubmit(b, designId));
    },
  };
}

export type AbActions = ReturnType<typeof abActions>;
