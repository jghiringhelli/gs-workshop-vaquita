import Database from 'better-sqlite3';

export interface Contribution {
  id: number;
  tandaId: number;
  participantId: number;
  round: number;
  amount: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
  paidAt: string | null;
}

export function createContributionRepository(db: Database.Database) {
  return {
    findById(id: number): Contribution | undefined {
      return db.prepare('SELECT * FROM contributions WHERE id = ?').get(id) as Contribution | undefined;
    },
    findByTandaAndRound(tandaId: number, round: number): Contribution[] {
      return db
        .prepare('SELECT * FROM contributions WHERE tandaId = ? AND round = ?')
        .all(tandaId, round) as Contribution[];
    },
    findByParticipant(participantId: number): Contribution[] {
      return db
        .prepare('SELECT * FROM contributions WHERE participantId = ? ORDER BY round ASC')
        .all(participantId) as Contribution[];
    },
    findByParticipantAndRound(participantId: number, round: number): Contribution | undefined {
      return db
        .prepare('SELECT * FROM contributions WHERE participantId = ? AND round = ?')
        .get(participantId, round) as Contribution | undefined;
    },
    create(data: {
      tandaId: number;
      participantId: number;
      round: number;
      amount: number;
      status: string;
      paidAt?: string | null;
    }): Contribution {
      return db
        .prepare(
          `INSERT INTO contributions (tandaId, participantId, round, amount, status, paidAt)
           VALUES (?, ?, ?, ?, ?, ?) RETURNING *`
        )
        .get(
          data.tandaId,
          data.participantId,
          data.round,
          data.amount,
          data.status,
          data.paidAt ?? null
        ) as Contribution;
    },
    updateStatus(id: number, status: string, paidAt?: string): Contribution | undefined {
      return db
        .prepare('UPDATE contributions SET status = ?, paidAt = ? WHERE id = ? RETURNING *')
        .get(status, paidAt ?? null, id) as Contribution | undefined;
    },
  };
}

export type ContributionRepository = ReturnType<typeof createContributionRepository>;
