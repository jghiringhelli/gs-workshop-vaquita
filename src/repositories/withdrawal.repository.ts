import { getDb } from '../db';

export interface WithdrawalRow {
  id: number;
  tandaId: number;
  requestedBy: number; // userId
  amountCents: number;
  reason: string;
  receiptUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  resolvedAt: string | null;
  createdAt: string;
}

export interface WithdrawalWithVotes extends WithdrawalRow {
  approveCount: number;
  rejectCount: number;
}

export interface VoteRow {
  id: number;
  withdrawalId: number;
  voterId: number;
  vote: 'approve' | 'reject';
  createdAt: string;
}

export function findById(id: number): WithdrawalRow | undefined {
  return getDb()
    .prepare('SELECT * FROM withdrawals WHERE id = ?')
    .get(id) as WithdrawalRow | undefined;
}

export function create(
  tandaId: number,
  requestedBy: number,
  amountCents: number,
  reason: string,
  receiptUrl: string | null,
): WithdrawalRow {
  const result = getDb()
    .prepare(
      `INSERT INTO withdrawals (tandaId, requestedBy, amountCents, reason, receiptUrl)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(tandaId, requestedBy, amountCents, reason, receiptUrl);
  return findById(result.lastInsertRowid as number) as WithdrawalRow;
}

export function listWithVoteCounts(tandaId: number): WithdrawalWithVotes[] {
  return getDb()
    .prepare(
      `SELECT
         w.*,
         COUNT(CASE WHEN wv.vote = 'approve' THEN 1 END) AS approveCount,
         COUNT(CASE WHEN wv.vote = 'reject'  THEN 1 END) AS rejectCount
       FROM withdrawals w
       LEFT JOIN withdrawal_votes wv ON w.id = wv.withdrawalId
       WHERE w.tandaId = ?
       GROUP BY w.id
       ORDER BY w.createdAt ASC`,
    )
    .all(tandaId) as WithdrawalWithVotes[];
}

export function findVote(withdrawalId: number, voterId: number): VoteRow | undefined {
  return getDb()
    .prepare('SELECT * FROM withdrawal_votes WHERE withdrawalId = ? AND voterId = ?')
    .get(withdrawalId, voterId) as VoteRow | undefined;
}

export function countVotes(
  withdrawalId: number,
): { approveCount: number; rejectCount: number } {
  const row = getDb()
    .prepare(
      `SELECT
         COUNT(CASE WHEN vote = 'approve' THEN 1 END) AS approveCount,
         COUNT(CASE WHEN vote = 'reject'  THEN 1 END) AS rejectCount
       FROM withdrawal_votes WHERE withdrawalId = ?`,
    )
    .get(withdrawalId) as { approveCount: number; rejectCount: number };
  return row;
}

export function addVote(
  withdrawalId: number,
  voterId: number,
  vote: 'approve' | 'reject',
): VoteRow {
  const result = getDb()
    .prepare(
      'INSERT INTO withdrawal_votes (withdrawalId, voterId, vote) VALUES (?, ?, ?)',
    )
    .run(withdrawalId, voterId, vote);
  return getDb()
    .prepare('SELECT * FROM withdrawal_votes WHERE id = ?')
    .get(result.lastInsertRowid) as VoteRow;
}

/** Set withdrawal status + resolvedAt in a single transaction. */
export function resolveWithdrawal(
  withdrawalId: number,
  status: 'approved' | 'rejected',
): void {
  getDb()
    .transaction(() => {
      getDb()
        .prepare(
          `UPDATE withdrawals
           SET status = ?, resolvedAt = datetime('now')
           WHERE id = ?`,
        )
        .run(status, withdrawalId);
    })();
}

export function sumApproved(tandaId: number): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(amountCents), 0) AS total
       FROM withdrawals WHERE tandaId = ? AND status = 'approved'`,
    )
    .get(tandaId) as { total: number };
  return row.total;
}

export function listForLedger(tandaId: number): WithdrawalRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM withdrawals WHERE tandaId = ? ORDER BY createdAt ASC",
    )
    .all(tandaId) as WithdrawalRow[];
}
