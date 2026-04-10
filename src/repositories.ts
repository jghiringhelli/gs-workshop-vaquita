import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "./db";
import {
  User,
  Tanda,
  Participant,
  Contribution,
  TandaStatus,
  ContributionStatus,
} from "./types";

/**
 * Repository layer - pure data access, no business logic
 */

// ============= USER REPOSITORY =============
export const userRepository = {
  create(email: string, name: string): User {
    const db = getDatabase();
    const id = uuidv4();
    const stmt = db.prepare(
      "INSERT INTO users (id, email, name) VALUES (?, ?, ?)"
    );
    stmt.run(id, email, name);
    return { id, email, name, createdAt: new Date().toISOString() };
  },

  getById(id: string): User | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
    };
  },

  getByEmail(email: string): User | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    const row = stmt.get(email) as any;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
    };
  },

  list(): User[] {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM users ORDER BY created_at DESC");
    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
    }));
  },
};

// ============= TANDA REPOSITORY =============
export const tandaRepository = {
  create(
    name: string,
    organizerId: string,
    contributionAmount: number,
    totalRounds: number
  ): Tanda {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT INTO tandas 
       (id, name, organizer_id, contribution_amount, total_rounds, status, current_round, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, 'forming', 1, ?, ?)`
    );
    stmt.run(id, name, organizerId, contributionAmount, totalRounds, now, now);
    return {
      id,
      name,
      organizerId,
      contributionAmount,
      status: "forming",
      currentRound: 1,
      totalRounds,
      createdAt: now,
      updatedAt: now,
    };
  },

  getById(id: string): Tanda | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM tandas WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      organizerId: row.organizer_id,
      contributionAmount: row.contribution_amount,
      status: row.status,
      currentRound: row.current_round,
      totalRounds: row.total_rounds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  listByUserId(userId: string): Tanda[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT DISTINCT t.* FROM tandas t
      INNER JOIN participants p ON t.id = p.tanda_id
      WHERE p.user_id = ?
      ORDER BY t.created_at DESC
    `);
    const rows = stmt.all(userId) as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      organizerId: row.organizer_id,
      contributionAmount: row.contribution_amount,
      status: row.status,
      currentRound: row.current_round,
      totalRounds: row.total_rounds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  updateStatus(id: string, status: TandaStatus): void {
    const db = getDatabase();
    const stmt = db.prepare(
      "UPDATE tandas SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );
    stmt.run(status, id);
  },

  advanceRound(id: string): void {
    const db = getDatabase();
    const stmt = db.prepare(
      "UPDATE tandas SET current_round = current_round + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );
    stmt.run(id);
  },

  list(): Tanda[] {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM tandas ORDER BY created_at DESC");
    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      organizerId: row.organizer_id,
      contributionAmount: row.contribution_amount,
      status: row.status,
      currentRound: row.current_round,
      totalRounds: row.total_rounds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },
};

// ============= PARTICIPANT REPOSITORY =============
export const participantRepository = {
  create(
    userId: string,
    tandaId: string,
    role: "organizer" | "member",
    rotationPosition?: number
  ): Participant {
    const db = getDatabase();
    const id = uuidv4();
    const stmt = db.prepare(
      `INSERT INTO participants (id, user_id, tanda_id, role, rotation_position) 
       VALUES (?, ?, ?, ?, ?)`
    );
    stmt.run(id, userId, tandaId, role, rotationPosition ?? null);
    return {
      id,
      userId,
      tandaId,
      role,
      rotationPosition: rotationPosition ?? null,
      isDefaulter: false,
      createdAt: new Date().toISOString(),
    };
  },

  getById(id: string): Participant | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM participants WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      tandaId: row.tanda_id,
      role: row.role,
      rotationPosition: row.rotation_position,
      isDefaulter: Boolean(row.is_defaulter),
      createdAt: row.created_at,
    };
  },

  getByUserAndTanda(userId: string, tandaId: string): Participant | null {
    const db = getDatabase();
    const stmt = db.prepare(
      "SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?"
    );
    const row = stmt.get(userId, tandaId) as any;
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      tandaId: row.tanda_id,
      role: row.role,
      rotationPosition: row.rotation_position,
      isDefaulter: Boolean(row.is_defaulter),
      createdAt: row.created_at,
    };
  },

  listByTandaId(tandaId: string): Participant[] {
    const db = getDatabase();
    const stmt = db.prepare(
      "SELECT * FROM participants WHERE tanda_id = ? ORDER BY rotation_position ASC, created_at ASC"
    );
    const rows = stmt.all(tandaId) as any[];
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      tandaId: row.tanda_id,
      role: row.role,
      rotationPosition: row.rotation_position,
      isDefaulter: Boolean(row.is_defaulter),
      createdAt: row.created_at,
    }));
  },

  updateRotationPosition(participantId: string, position: number): void {
    const db = getDatabase();
    const stmt = db.prepare(
      "UPDATE participants SET rotation_position = ? WHERE id = ?"
    );
    stmt.run(position, participantId);
  },

  setDefaulter(participantId: string, isDefaulter: boolean): void {
    const db = getDatabase();
    const stmt = db.prepare(
      "UPDATE participants SET is_defaulter = ? WHERE id = ?"
    );
    stmt.run(isDefaulter ? 1 : 0, participantId);
  },
};

// ============= CONTRIBUTION REPOSITORY =============
export const contributionRepository = {
  create(
    tandaId: string,
    participantId: string,
    round: number,
    amount: number,
    status: ContributionStatus = "pending"
  ): Contribution {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(id, tandaId, participantId, round, amount, status, now, now);
    return {
      id,
      tandaId,
      participantId,
      round,
      amount,
      status,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };
  },

  getById(id: string): Contribution | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM contributions WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      tandaId: row.tanda_id,
      participantId: row.participant_id,
      round: row.round,
      amount: row.amount,
      status: row.status,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  getByRound(tandaId: string, round: number): Contribution[] {
    const db = getDatabase();
    const stmt = db.prepare(
      "SELECT * FROM contributions WHERE tanda_id = ? AND round = ? ORDER BY created_at ASC"
    );
    const rows = stmt.all(tandaId, round) as any[];
    return rows.map((row) => ({
      id: row.id,
      tandaId: row.tanda_id,
      participantId: row.participant_id,
      round: row.round,
      amount: row.amount,
      status: row.status,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  getByParticipantAndRound(
    participantId: string,
    tandaId: string,
    round: number
  ): Contribution | null {
    const db = getDatabase();
    const stmt = db.prepare(
      "SELECT * FROM contributions WHERE participant_id = ? AND tanda_id = ? AND round = ?"
    );
    const row = stmt.get(participantId, tandaId, round) as any;
    if (!row) return null;
    return {
      id: row.id,
      tandaId: row.tanda_id,
      participantId: row.participant_id,
      round: row.round,
      amount: row.amount,
      status: row.status,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  updateStatus(
    id: string,
    status: ContributionStatus,
    paidAt?: string
  ): void {
    const db = getDatabase();
    const stmt = db.prepare(
      "UPDATE contributions SET status = ?, paid_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );
    stmt.run(status, paidAt ?? null, id);
  },

  getHistoryByParticipant(participantId: string): Contribution[] {
    const db = getDatabase();
    const stmt = db.prepare(
      "SELECT * FROM contributions WHERE participant_id = ? ORDER BY round DESC, created_at DESC"
    );
    const rows = stmt.all(participantId) as any[];
    return rows.map((row) => ({
      id: row.id,
      tandaId: row.tanda_id,
      participantId: row.participant_id,
      round: row.round,
      amount: row.amount,
      status: row.status,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },
};
