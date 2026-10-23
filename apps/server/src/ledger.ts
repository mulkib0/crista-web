/**
 * 연구비 원장 helper(설계 §1.3 · §7.4 ③) — 기능 모듈이 과금 · 지급을 같은 규칙으로 하게.
 *
 * - 원장은 정수 센트(`web.ledger.amount_cents`), 화면은 크리스타(1 크리스타 = 20 센트 — web-contract money.ts).
 * - 멱등: `UQ(team_id, idem_key)` — 같은 일로 두 번 넣지 않는다(예: `patent:<출원 id>` · `ind:<id>` · `learn:answer:<id>`).
 * - 과금(`charge`)은 **호출자의 트랜잭션 안에서** 모둠 줄을 `FOR UPDATE` 로 잠그고 잔액을 본 뒤 넣는다(동시 과금 줄 세우기).
 *   첫 유료 행동이면 스타트업 이름을 잠근다(설계 §4.3 — jobs.ts 와 같은 규칙).
 * - 지급(`credit`)은 잠그지 않는다(잔액 검사 없음 · 멱등 키로 한 번만).
 */
import { cristaToCents } from '@crista-web/web-contract';
import type { Queryable } from './db.ts';
import { ApiError } from './http.ts';

export type LedgerKind =
  | 'initial'
  | 'paid_work'
  | 'paid_work_refund'
  | 'adjustment'
  | 'patent_fee'
  | 'ind_fee'
  | 'learn_item'
  | 'learn_revision'
  | 'learn_note'
  | 'learn_stipend'
  | 'learn_correction'
  | 'pitch_series_a'
  | 'pitch_series_b'
  | 'failure_bounty'
  // 4.2 최종 허가 수수료(F42 · 0018).
  | 'approval_fee';

export interface LedgerEntry {
  teamId: string;
  /** 센트(양수 — 과금은 helper 가 음수로 넣는다). `crista` 와 둘 중 하나. */
  cents?: number;
  crista?: number;
  kind: LedgerKind;
  /** 모둠 안 유일(1~120자). */
  idemKey: string;
  createdBy?: string | null;
  jobId?: string | null;
  /** 작업이 아닌 대상(예: 'patent' · 'ind_application' · 'learn_answer'). */
  ref?: { type: string; id: string } | null;
}

const centsOf = (entry: LedgerEntry): number => {
  const cents = entry.cents ?? (entry.crista !== undefined ? cristaToCents(entry.crista) : NaN);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error(`원장 금액이 잘못됐습니다(${entry.kind} ${cents}).`);
  return cents;
};

/** 잔액(센트) — 원장 합계. */
export async function balanceCents(db: Queryable, teamId: string): Promise<number> {
  const result = await db.query<{ n: string | null }>('select sum(amount_cents)::bigint as n from web.ledger where team_id = $1', [teamId]);
  return Number(result.rows[0]?.n ?? 0);
}

async function insert(tx: Queryable, entry: LedgerEntry, amount: number): Promise<{ inserted: boolean; ledgerId: number | null }> {
  const result = await tx.query<{ id: string }>(
    `insert into web.ledger (team_id, amount_cents, kind, idem_key, job_id, created_by, ref_type, ref_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (team_id, idem_key) do nothing returning id`,
    [entry.teamId, amount, entry.kind, entry.idemKey, entry.jobId ?? null, entry.createdBy ?? null, entry.ref?.type ?? null, entry.ref?.id ?? null],
  );
  const id = result.rows[0]?.id;
  return { inserted: id !== undefined, ledgerId: id !== undefined ? Number(id) : null };
}

/**
 * 과금 — 트랜잭션 안에서만 부른다. 모둠 줄 잠금 → 같은 멱등 키가 이미 있으면 아무것도 하지 않음(`charged: false`) →
 * 잔액 < 금액이면 402 `insufficient_funds` → 음수 줄 + 이름 잠금.
 */
export async function charge(tx: Queryable, entry: LedgerEntry): Promise<{ charged: boolean; ledgerId: number | null; balanceAfter: number }> {
  const cents = centsOf(entry);
  await tx.query('select id from web.teams where id = $1 for update', [entry.teamId]);
  const dup = await tx.query<{ id: string }>('select id from web.ledger where team_id = $1 and idem_key = $2', [entry.teamId, entry.idemKey]);
  if (dup.rows[0]) return { charged: false, ledgerId: Number(dup.rows[0].id), balanceAfter: await balanceCents(tx, entry.teamId) };
  const balance = await balanceCents(tx, entry.teamId);
  if (balance < cents) throw new ApiError(402, 'insufficient_funds', '연구비가 모자라요.');
  const { ledgerId } = await insert(tx, entry, -cents);
  if (cents > 0) await tx.query('update web.teams set name_locked_at = coalesce(name_locked_at, now()) where id = $1', [entry.teamId]);
  return { charged: true, ledgerId, balanceAfter: balance - cents };
}

/** 지급 · 환급 — 멱등 키로 한 번만. */
export async function credit(db: Queryable, entry: LedgerEntry): Promise<{ inserted: boolean; ledgerId: number | null }> {
  return insert(db, entry, centsOf(entry));
}
