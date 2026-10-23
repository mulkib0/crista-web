/**
 * A1 · A2 합의(설계 §6.3) — 1인 1몫 추천 카드 → 카드 비교판 → 제안 하나 + 찬반 투표(과반 정족수).
 *
 * - 근거는 공용 근거 칩(`ReasonChips`)으로 골라요 — 근거 없이 카드를 올리거나 제안할 수 없어요(§11.1).
 * - 투표 현황은 `antibody.consensus` 로 실시간이에요 — 화면은 `useAbBoard` 가 다시 읽어 주므로 따로 폴링하지 않아요.
 */
import { useState } from 'react';
import type { AntibodyCardStep, AntibodyCardView, AntibodyProposalTopic, AntibodyProposalView } from '@crista-web/web-contract';
import { By } from '../board/parts.tsx';
import { Panel, ReasonChips, type ReasonChip, type Verdict } from '../board/ui/index.ts';

export interface ConsensusPanelProps {
  step: AntibodyCardStep;
  topic: AntibodyProposalTopic;
  /** 제안에 담을 값 — 내 작업대에서 고른 것. 없으면 제안 단추가 막혀요. */
  pick: { label: string; value: unknown } | null;
  /** 내 몫 이름(표적 1종 · 담당 CDR 등). */
  slot: string;
  cards: readonly AntibodyCardView[];
  proposals: readonly AntibodyProposalView[];
  myName: string;
  /** 근거 칩 — 단계마다 다른 목록을 넘겨요. */
  reasons: readonly ReasonChip[];
  memberCount: number;
  busy?: boolean;
  onCard: (slot: string, payload: unknown, rationale: string) => void;
  onPropose: (value: unknown, rationale: string) => void;
  onVote: (proposalId: string, choice: 'yes' | 'no', version: number) => void;
}

export function ConsensusPanel({ step, topic, pick, slot, cards, proposals, myName, reasons, memberCount, busy, onCard, onPropose, onVote }: ConsensusPanelProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const mine = cards.filter((c) => c.step === step);
  const myCard = mine.find((c) => c.byName === myName);
  const open = proposals.find((p) => p.topic === topic && p.status === 'open');
  const passed = proposals.find((p) => p.topic === topic && p.status === 'passed');
  const quorum = open?.votes.quorum ?? Math.floor(memberCount / 2) + 1;

  const labels = reasons.filter((r) => picked.includes(r.id)).map((r) => r.label);
  const verdict: Verdict | null = picked.length === 0
    ? { status: 'warn', message: '왜 이것을 고르는지 근거를 하나 이상 골라요.' }
    : pick === null
      ? { status: 'warn', message: '먼저 내 작업대에서 올릴 것을 골라요.' }
      : { status: 'ok', message: `근거 ${labels.length}개로 올려요 — 모둠원이 그대로 읽어요.` };

  return (
    <>
      <Panel title="모둠원 추천 카드" sub={`${mine.length}/${memberCount}명`}>
        {mine.length === 0 ? (
          <p className="empty">아직 올라온 카드가 없어요 — 각자 분담한 몫을 조회해 카드로 올려요.</p>
        ) : (
          <div className="cards">
            {mine.map((c) => (
              <div key={c.id} className={`card${c.byName === myName ? ' on' : ''}`}>
                <div className="card-h">
                  <By name={c.byName ?? null} avatar={null} />
                  <span className="chip">{c.slot}</span>
                  {c.byName === myName && <span className="badge">내 카드</span>}
                </div>
                <p className="mini" style={{ margin: 0 }}>{c.rationale}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="내 몫 올리기" sub={slot}>
        <p className="mini muted" style={{ margin: '0 0 8px' }}>
          {myCard ? '이미 올렸어요 — 다시 올리면 내 카드만 바뀌어요.' : '한 사람이 한 장이에요. 근거를 함께 올려요.'}
        </p>
        <ReasonChips
          legend={`${step} 추천 근거`}
          chips={[...reasons]}
          value={picked}
          onChange={(next) => setPicked(Array.isArray(next) ? next : next ? [next] : [])}
          multiple
          verdict={verdict}
          confirm={{
            label: pick ? `「${pick.label}」 카드 올리기` : '올릴 것을 먼저 골라요',
            busy,
            disabled: pick === null,
            onClick: () => {
              if (!pick) return;
              onCard(slot, pick.value, labels.join(' · '));
              setPicked([]);
            },
          }}
        />
      </Panel>

      <Panel title="모둠 합의" sub={passed ? '통과' : open ? '투표 중' : '제안 없음'}>
        {passed && !open && (
          <p className="ok-msg">✓ 합의가 끝났어요 — {passed.byName ?? '모둠원'} 님의 제안이 통과했어요. ({passed.rationale})</p>
        )}
        {open ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="card-h">
              <By name={open.byName ?? null} avatar={null} />
              <span className="chip">제안</span>
              <span className="mono mini">찬성 {open.votes.yes} · 반대 {open.votes.no} · 정족수 {quorum}</span>
            </div>
            <p className="mini" style={{ margin: 0 }}>{open.rationale}</p>
            <span className="progress" aria-label={`찬성 ${open.votes.yes} / 정족수 ${quorum}`}>
              <i style={{ width: `${Math.min(100, (open.votes.yes / Math.max(1, quorum)) * 100)}%` }} />
            </span>
            <div className="acts">
              <button type="button" className="btn pri" aria-pressed={open.votes.myChoice === 'yes'} disabled={busy} onClick={() => onVote(open.id, 'yes', open.version)}>
                찬성{open.votes.myChoice === 'yes' ? ' ✓' : ''}
              </button>
              <button type="button" className="btn" aria-pressed={open.votes.myChoice === 'no'} disabled={busy} onClick={() => onVote(open.id, 'no', open.version)}>
                반대{open.votes.myChoice === 'no' ? ' ✓' : ''}
              </button>
              <span className="note">과반이 찬성하면 그 자리에서 확정돼요.</span>
            </div>
          </div>
        ) : (
          <div className="acts">
            <button
              type="button"
              className="btn film"
              disabled={busy || pick === null || mine.length === 0}
              onClick={() => pick && onPropose(pick.value, `${pick.label} — 카드 ${mine.length}장을 견주어 골랐어요`)}
            >
              {pick ? `「${pick.label}」 로 제안하기` : '제안할 것을 먼저 골라요'}
            </button>
            <span className="note">카드가 올라온 뒤에 제안해요 — 한 번에 열린 제안은 하나예요.</span>
          </div>
        )}
      </Panel>
    </>
  );
}
