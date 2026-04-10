import { getDb } from '../db';

export interface TandaRow {
  id: number;
  name: string;
  organizerId: number;
  contributionAmount: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  currentRound: number;
  totalRounds: number;
  createdAt: string;
}

export interface ParticipantRow {
  id: number;
  userId: number;
  tandaId: number;
  role: 'organizer' | 'member';
  rotationPosition: number | null;
  createdAt: string;
}

export interface ContributionRow {
  id: number;
  tandaId: number;
  participantId: number;
  round: number;
  amount: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
  createdAt: string;
}

export function findById(id: number): TandaRow | undefined {
  return getDb()
    .prepare('SELECT * FROM tandas WHERE id = ?')
    .get(id) as TandaRow | undefined;
}

export function create(
  name: string,
  organizerId: number,
  contributionAmount: number,
  totalRounds: number,
): TandaRow {
  const result = getDb()
    .prepare(
      'INSERT INTO tandas (name, organizerId, contributionAmount, totalRounds) VALUES (?, ?, ?, ?)',
    )
    .run(name, organizerId, contributionAmount, totalRounds);
  return findById(result.lastInsertRowid as number) as TandaRow;
}

export function updateStatus(id: number, status: TandaRow['status']): void {
  getDb().prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
}

export function findParticipants(tandaId: number): ParticipantRow[] {
  return getDb()
    .prepare('SELECT * FROM participants WHERE tandaId = ?')
    .all(tandaId) as ParticipantRow[];
}

export function findParticipant(
  tandaId: number,
  userId: number,
): ParticipantRow | undefined {
  return getDb()
    .prepare('SELECT * FROM participants WHERE tandaId = ? AND userId = ?')
    .get(tandaId, userId) as ParticipantRow | undefined;
}

export function countParticipants(tandaId: number): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) as count FROM participants WHERE tandaId = ?')
    .get(tandaId) as { count: number };
  return row.count;
}

export function addParticipant(
  tandaId: number,
  userId: number,
  role: ParticipantRow['role'],
): ParticipantRow {
  const result = getDb()
    .prepare('INSERT INTO participants (tandaId, userId, role) VALUES (?, ?, ?)')
    .run(tandaId, userId, role);
  return getDb()
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(result.lastInsertRowid) as ParticipantRow;
}

export function setRotationPositions(
  tandaId: number,
  assignments: Array<{ participantId: number; position: number }>,
): void {
  const stmt = getDb().prepare(
    'UPDATE participants SET rotationPosition = ? WHERE id = ?',
  );
  const run = getDb().transaction(() => {
    for (const { participantId, position } of assignments) {
      stmt.run(position, participantId);
    }
  });
  run();
}

export function findContribution(
  tandaId: number,
  participantId: number,
  round: number,
): ContributionRow | undefined {
  return getDb()
    .prepare(
      'SELECT * FROM contributions WHERE tandaId = ? AND participantId = ? AND round = ?',
    )
    .get(tandaId, participantId, round) as ContributionRow | undefined;
}

export function createContribution(
  tandaId: number,
  participantId: number,
  round: number,
  amount: number,
): ContributionRow {
  const result = getDb()
    .prepare(
      "INSERT INTO contributions (tandaId, participantId, round, amount, status) VALUES (?, ?, ?, ?, 'paid')",
    )
    .run(tandaId, participantId, round, amount);
  return getDb()
    .prepare('SELECT * FROM contributions WHERE id = ?')
    .get(result.lastInsertRowid) as ContributionRow;
}

export function sumPaidContributions(tandaId: number): number {
  const row = getDb()
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM contributions WHERE tandaId = ? AND status = 'paid'",
    )
    .get(tandaId) as { total: number };
  return row.total;
}

export function countPaidForRound(tandaId: number, round: number): number {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) as count FROM contributions WHERE tandaId = ? AND round = ? AND status = 'paid'",
    )
    .get(tandaId, round) as { count: number };
  return row.count;
}

export function listContributions(tandaId: number): ContributionRow[] {
  return getDb()
    .prepare('SELECT * FROM contributions WHERE tandaId = ? ORDER BY createdAt ASC')
    .all(tandaId) as ContributionRow[];
}

export function findAll(organizerId?: number): TandaRow[] {
  if (organizerId !== undefined) {
    return getDb()
      .prepare('SELECT * FROM tandas WHERE organizerId = ? ORDER BY createdAt DESC')
      .all(organizerId) as TandaRow[];
  }
  return getDb()
    .prepare('SELECT * FROM tandas ORDER BY createdAt DESC')
    .all() as TandaRow[];
}
