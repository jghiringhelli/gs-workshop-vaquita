import db from '../db';

export interface TandaRow {
  id: number;
  name: string;
  organizerId: number;
  contributionAmount: number;
  status: string;
  currentRound: number;
  totalRounds: number;
}

export interface ParticipantRow {
  id: number;
  userId: number;
  tandaId: number;
  role: string;
  rotationPosition: number | null;
}

export interface ContributionRow {
  id: number;
  tandaId: number;
  participantId: number;
  round: number;
  amount: number;
  status: string;
}

export const tandaRepo = {
  create(name: string, organizerId: number, contributionAmount: number): TandaRow {
    const stmt = db.prepare(
      'INSERT INTO tandas (name, organizerId, contributionAmount, status, currentRound, totalRounds) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(name, organizerId, contributionAmount, 'forming', 0, 0);
    return {
      id: result.lastInsertRowid as number,
      name,
      organizerId,
      contributionAmount,
      status: 'forming',
      currentRound: 0,
      totalRounds: 0,
    };
  },

  findById(id: number): TandaRow | undefined {
    return db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as TandaRow | undefined;
  },

  findByUserId(userId: number): TandaRow[] {
    return db.prepare(
      'SELECT t.* FROM tandas t JOIN participants p ON p.tandaId = t.id WHERE p.userId = ?'
    ).all(userId) as TandaRow[];
  },

  findAll(): TandaRow[] {
    return db.prepare('SELECT * FROM tandas').all() as TandaRow[];
  },

  updateStatus(id: number, status: string): void {
    db.prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
  },

  updateRound(id: number, currentRound: number): void {
    db.prepare('UPDATE tandas SET currentRound = ? WHERE id = ?').run(currentRound, id);
  },

  setTotalRounds(id: number, totalRounds: number): void {
    db.prepare('UPDATE tandas SET totalRounds = ? WHERE id = ?').run(totalRounds, id);
  },

  addParticipant(userId: number, tandaId: number, role: string): ParticipantRow {
    const stmt = db.prepare(
      'INSERT INTO participants (userId, tandaId, role) VALUES (?, ?, ?)'
    );
    const result = stmt.run(userId, tandaId, role);
    return {
      id: result.lastInsertRowid as number,
      userId,
      tandaId,
      role,
      rotationPosition: null,
    };
  },

  findParticipant(userId: number, tandaId: number): ParticipantRow | undefined {
    return db.prepare(
      'SELECT * FROM participants WHERE userId = ? AND tandaId = ?'
    ).get(userId, tandaId) as ParticipantRow | undefined;
  },

  findParticipantById(id: number): ParticipantRow | undefined {
    return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as ParticipantRow | undefined;
  },

  getParticipants(tandaId: number): ParticipantRow[] {
    return db.prepare('SELECT * FROM participants WHERE tandaId = ?').all(tandaId) as ParticipantRow[];
  },

  countParticipants(tandaId: number): number {
    const row = db.prepare('SELECT COUNT(*) as count FROM participants WHERE tandaId = ?').get(tandaId) as { count: number };
    return row.count;
  },

  setRotationPositions(participants: { id: number; position: number }[]): void {
    const stmt = db.prepare('UPDATE participants SET rotationPosition = ? WHERE id = ?');
    const transaction = db.transaction((items: { id: number; position: number }[]) => {
      for (const item of items) {
        stmt.run(item.position, item.id);
      }
    });
    transaction(participants);
  },

  addContribution(tandaId: number, participantId: number, round: number, amount: number, status: string): ContributionRow {
    const stmt = db.prepare(
      'INSERT INTO contributions (tandaId, participantId, round, amount, status) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(tandaId, participantId, round, amount, status);
    return {
      id: result.lastInsertRowid as number,
      tandaId,
      participantId,
      round,
      amount,
      status,
    };
  },

  findContribution(participantId: number, round: number): ContributionRow | undefined {
    return db.prepare(
      'SELECT * FROM contributions WHERE participantId = ? AND round = ?'
    ).get(participantId, round) as ContributionRow | undefined;
  },

  getContributionsByRound(tandaId: number, round: number): ContributionRow[] {
    return db.prepare(
      'SELECT * FROM contributions WHERE tandaId = ? AND round = ?'
    ).all(tandaId, round) as ContributionRow[];
  },

  getContributionHistory(participantId: number): ContributionRow[] {
    return db.prepare(
      'SELECT * FROM contributions WHERE participantId = ? ORDER BY round'
    ).all(participantId) as ContributionRow[];
  },

  getParticipantByRotation(tandaId: number, position: number): ParticipantRow | undefined {
    return db.prepare(
      'SELECT * FROM participants WHERE tandaId = ? AND rotationPosition = ?'
    ).get(tandaId, position) as ParticipantRow | undefined;
  },
};
