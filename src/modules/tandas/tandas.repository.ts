import { db } from '../../infrastructure/database';
import { v4 as uuidv4 } from 'uuid';

/** Possible lifecycle statuses of a tanda. */
export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';

/** Possible roles a participant can hold within a tanda. */
export type ParticipantRole = 'organizer' | 'member';

/** Represents a tanda savings group. */
export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
  createdAt: string;
}

/** Represents a user's membership in a tanda. */
export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  rotationPosition: number | null;
  consecutiveMisses: number;
  isDefaulter: boolean;
  createdAt: string;
}

/** Raw SQLite row for participants (isDefaulter stored as integer). */
interface ParticipantRow {
  id: string;
  userId: string;
  tandaId: string;
  role: string;
  rotationPosition: number | null;
  consecutiveMisses: number;
  isDefaulter: number;
  createdAt: string;
}

/**
 * Maps a raw SQLite participant row to a typed Participant entity.
 *
 * @param row - Raw row from the participants table.
 * @returns Typed Participant entity.
 */
function mapParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.userId,
    tandaId: row.tandaId,
    role: row.role as ParticipantRole,
    rotationPosition: row.rotationPosition,
    consecutiveMisses: row.consecutiveMisses,
    isDefaulter: row.isDefaulter === 1,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Tanda queries
// ---------------------------------------------------------------------------

/**
 * Inserts a new tanda row and returns the entity.
 *
 * @param name - Human-readable name.
 * @param organizerId - UUID of the user who owns the tanda.
 * @param contributionAmount - Fixed amount each participant must contribute per round.
 * @returns The created Tanda.
 */
export function createTanda(
  name: string,
  organizerId: string,
  contributionAmount: number,
): Tanda {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO tandas (id, name, organizerId, contributionAmount, status, currentRound, totalRounds, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, name, organizerId, contributionAmount, 'forming', 0, 0, createdAt);
  return {
    id,
    name,
    organizerId,
    contributionAmount,
    status: 'forming',
    currentRound: 0,
    totalRounds: 0,
    createdAt,
  };
}

/**
 * Finds a tanda by primary key.
 *
 * @param id - UUID of the tanda.
 * @returns The Tanda or undefined.
 */
export function findTandaById(id: string): Tanda | undefined {
  return db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as
    | Tanda
    | undefined;
}

/**
 * Lists tandas, optionally filtered to those a user participates in.
 *
 * @param userId - Optional UUID; if provided, only returns tandas the user joined.
 * @returns Array of Tanda entities.
 */
export function listTandas(userId?: string): Tanda[] {
  if (userId) {
    return db
      .prepare(
        'SELECT t.* FROM tandas t JOIN participants p ON p.tandaId = t.id WHERE p.userId = ?',
      )
      .all(userId) as Tanda[];
  }
  return db.prepare('SELECT * FROM tandas').all() as Tanda[];
}

/**
 * Updates a tanda's status.
 *
 * @param id - UUID of the tanda.
 * @param status - New status value.
 * @returns void
 */
export function updateTandaStatus(id: string, status: TandaStatus): void {
  db.prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
}

/**
 * Activates a tanda by setting status, currentRound, and totalRounds atomically.
 *
 * @param id - UUID of the tanda.
 * @param totalRounds - Total number of rounds (equal to participant count).
 * @returns void
 */
export function activateTanda(id: string, totalRounds: number): void {
  db.prepare(
    "UPDATE tandas SET status = 'active', currentRound = 1, totalRounds = ? WHERE id = ?",
  ).run(totalRounds, id);
}

/**
 * Increments currentRound by 1 for the given tanda.
 *
 * @param id - UUID of the tanda.
 * @returns void
 */
export function incrementTandaRound(id: string): void {
  db.prepare('UPDATE tandas SET currentRound = currentRound + 1 WHERE id = ?').run(
    id,
  );
}

// ---------------------------------------------------------------------------
// Participant queries
// ---------------------------------------------------------------------------

/**
 * Inserts a new participant row and returns the entity.
 *
 * @param userId - UUID of the user joining.
 * @param tandaId - UUID of the tanda.
 * @param role - 'organizer' or 'member'.
 * @returns The created Participant.
 */
export function createParticipant(
  userId: string,
  tandaId: string,
  role: ParticipantRole,
): Participant {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO participants (id, userId, tandaId, role, rotationPosition, consecutiveMisses, isDefaulter, createdAt) VALUES (?, ?, ?, ?, NULL, 0, 0, ?)',
  ).run(id, userId, tandaId, role, createdAt);
  return {
    id,
    userId,
    tandaId,
    role,
    rotationPosition: null,
    consecutiveMisses: 0,
    isDefaulter: false,
    createdAt,
  };
}

/**
 * Finds a participant by primary key.
 *
 * @param id - UUID of the participant.
 * @returns The Participant or undefined.
 */
export function findParticipantById(id: string): Participant | undefined {
  const row = db
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(id) as ParticipantRow | undefined;
  return row ? mapParticipant(row) : undefined;
}

/**
 * Finds a participant by their userId within a specific tanda.
 *
 * @param userId - UUID of the user.
 * @param tandaId - UUID of the tanda.
 * @returns The Participant or undefined.
 */
export function findParticipantByUserAndTanda(
  userId: string,
  tandaId: string,
): Participant | undefined {
  const row = db
    .prepare('SELECT * FROM participants WHERE userId = ? AND tandaId = ?')
    .get(userId, tandaId) as ParticipantRow | undefined;
  return row ? mapParticipant(row) : undefined;
}

/**
 * Returns all participants for a tanda, ordered by rotationPosition ascending (nulls last).
 *
 * @param tandaId - UUID of the tanda.
 * @returns Array of Participant entities.
 */
export function getParticipantsByTandaId(tandaId: string): Participant[] {
  return (
    db
      .prepare(
        'SELECT * FROM participants WHERE tandaId = ? ORDER BY rotationPosition ASC NULLS LAST',
      )
      .all(tandaId) as ParticipantRow[]
  ).map(mapParticipant);
}

/**
 * Assigns rotation positions to all participants of a tanda in a single transaction.
 *
 * @param assignments - Array of {id, position} pairs.
 * @returns void
 */
export function assignRotationPositions(
  assignments: ReadonlyArray<{ id: string; position: number }>,
): void {
  const stmt = db.prepare(
    'UPDATE participants SET rotationPosition = ? WHERE id = ?',
  );
  const transaction = db.transaction(
    (items: ReadonlyArray<{ id: string; position: number }>) => {
      for (const item of items) {
        stmt.run(item.position, item.id);
      }
    },
  );
  transaction(assignments);
}

/**
 * Updates consecutiveMisses for a participant.
 *
 * @param id - UUID of the participant.
 * @param misses - New consecutiveMisses value.
 * @returns void
 */
export function updateConsecutiveMisses(id: string, misses: number): void {
  db.prepare('UPDATE participants SET consecutiveMisses = ? WHERE id = ?').run(
    misses,
    id,
  );
}

/**
 * Flags a participant as a defaulter.
 *
 * @param id - UUID of the participant.
 * @returns void
 */
export function flagParticipantAsDefaulter(id: string): void {
  db.prepare('UPDATE participants SET isDefaulter = 1 WHERE id = ?').run(id);
}
