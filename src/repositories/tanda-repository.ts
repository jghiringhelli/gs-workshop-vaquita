import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { Tanda, Participant } from '../types';
import { ITandaRepository } from './tanda-repository.interface';

/**
 * SQLite implementation of TandaRepository
 */
export class TandaRepository implements ITandaRepository {
  constructor(private db: Database.Database) {}

  create(
    name: string,
    organizerId: string,
    contributionAmount: number,
    totalRounds: number
  ): Tanda {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO tandas (id, name, organizer_id, contribution_amount, status, total_rounds, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'forming', ?, ?, ?)
    `);

    stmt.run(id, name, organizerId, contributionAmount, totalRounds, now, now);

    // Add organizer as first participant
    this.addParticipant(organizerId, id, 'organizer');

    return {
      id,
      name,
      organizerId,
      contributionAmount,
      status: 'forming',
      currentRound: 1,
      totalRounds,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  getById(id: string): Tanda | null {
    const stmt = this.db.prepare(`
      SELECT id, name, organizer_id, contribution_amount, status, current_round, total_rounds, created_at, updated_at
      FROM tandas
      WHERE id = ?
    `);

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
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  listForUser(userId: string): Tanda[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT t.id, t.name, t.organizer_id, t.contribution_amount, 
             t.status, t.current_round, t.total_rounds, t.created_at, t.updated_at
      FROM tandas t
      LEFT JOIN participants p ON t.id = p.tanda_id
      WHERE t.organizer_id = ? OR p.user_id = ?
      ORDER BY t.created_at DESC
    `);

    const rows = stmt.all(userId, userId) as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      organizerId: row.organizer_id,
      contributionAmount: row.contribution_amount,
      status: row.status,
      currentRound: row.current_round,
      totalRounds: row.total_rounds,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  updateStatus(id: string, status: string, currentRound?: number): void {
    const now = new Date().toISOString();
    if (currentRound !== undefined) {
      const stmt = this.db.prepare(`
        UPDATE tandas SET status = ?, current_round = ?, updated_at = ? WHERE id = ?
      `);
      stmt.run(status, currentRound, now, id);
    } else {
      const stmt = this.db.prepare(`
        UPDATE tandas SET status = ?, updated_at = ? WHERE id = ?
      `);
      stmt.run(status, now, id);
    }
  }

  addParticipant(
    userId: string,
    tandaId: string,
    role: 'organizer' | 'member'
  ): Participant {
    const id = uuidv4();
    const now = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO participants (id, user_id, tanda_id, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, userId, tandaId, role, now.toISOString());

    return {
      id,
      userId,
      tandaId,
      role,
      rotationPosition: null,
      hasReceivedPayout: false,
      missedConsecutive: 0,
      createdAt: now,
    };
  }

  getParticipants(tandaId: string): Participant[] {
    const stmt = this.db.prepare(`
      SELECT id, user_id, tanda_id, role, rotation_position, has_received_payout, missed_consecutive, created_at
      FROM participants
      WHERE tanda_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(tandaId) as any[];
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      tandaId: row.tanda_id,
      role: row.role,
      rotationPosition: row.rotation_position,
      hasReceivedPayout: row.has_received_payout === 1,
      missedConsecutive: row.missed_consecutive,
      createdAt: new Date(row.created_at),
    }));
  }

  getParticipant(userId: string, tandaId: string): Participant | null {
    const stmt = this.db.prepare(`
      SELECT id, user_id, tanda_id, role, rotation_position, has_received_payout, missed_consecutive, created_at
      FROM participants
      WHERE user_id = ? AND tanda_id = ?
    `);

    const row = stmt.get(userId, tandaId) as any;
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      tandaId: row.tanda_id,
      role: row.role,
      rotationPosition: row.rotation_position,
      hasReceivedPayout: row.has_received_payout === 1,
      missedConsecutive: row.missed_consecutive,
      createdAt: new Date(row.created_at),
    };
  }

  randomizeRotation(tandaId: string): void {
    const participants = this.getParticipants(tandaId);
    
    // Fisher-Yates shuffle
    const shuffled = [...participants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Update rotation positions
    const updateStmt = this.db.prepare(`
      UPDATE participants SET rotation_position = ? WHERE id = ?
    `);

    shuffled.forEach((p, idx) => {
      updateStmt.run(idx, p.id);
    });
  }

  countParticipants(tandaId: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM participants WHERE tanda_id = ?
    `);
    const row = stmt.get(tandaId) as any;
    return row.count;
  }
}
