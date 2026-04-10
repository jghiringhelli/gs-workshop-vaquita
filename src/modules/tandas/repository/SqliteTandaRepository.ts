import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Tanda, Participant, CreateTandaInput } from '../domain/Tanda';
import { ITandaRepository } from '../ports/ITandaRepository';

type ParticipantRow = Omit<Participant, 'isDefaulter'> & { isDefaulter: number };

const toParticipant = (r: ParticipantRow): Participant => ({ ...r, isDefaulter: r.isDefaulter === 1 });

/** SQLite adapter for the tanda repository port. */
export class SqliteTandaRepository implements ITandaRepository {
  constructor(private readonly db: Database.Database) {}

  createTanda(input: CreateTandaInput): Tanda {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO tandas (id, name, organizer_id, contribution_amount, status, current_round, total_rounds)
      VALUES (?, ?, ?, ?, 'forming', 0, 0)
    `).run(id, input.name, input.organizerId, input.contributionAmount);
    return this.findTandaById(id)!;
  }

  findTandaById(id: string): Tanda | undefined {
    const row = this.db.prepare(`
      SELECT id, name, organizer_id as organizerId, contribution_amount as contributionAmount,
             status, current_round as currentRound, total_rounds as totalRounds
      FROM tandas WHERE id = ?
    `).get(id) as Tanda | undefined;
    return row;
  }

  updateTanda(id: string, updates: Partial<Pick<Tanda, 'status' | 'currentRound' | 'totalRounds'>>): void {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.currentRound !== undefined) { fields.push('current_round = ?'); values.push(updates.currentRound); }
    if (updates.totalRounds !== undefined) { fields.push('total_rounds = ?'); values.push(updates.totalRounds); }
    if (fields.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE tandas SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  createParticipant(data: Omit<Participant, 'id'>): Participant {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO participants (id, user_id, tanda_id, role, rotation_position, is_defaulter)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(id, data.userId, data.tandaId, data.role, data.rotationPosition ?? null);
    return { id, ...data, isDefaulter: false };
  }

  findParticipantsByTandaId(tandaId: string): Participant[] {
    return (this.db.prepare(`
      SELECT id, user_id as userId, tanda_id as tandaId, role,
             rotation_position as rotationPosition, is_defaulter as isDefaulter
      FROM participants WHERE tanda_id = ?
      ORDER BY rotation_position ASC NULLS LAST, rowid ASC
    `).all(tandaId) as ParticipantRow[]).map(toParticipant);
  }

  findParticipant(userId: string, tandaId: string): Participant | undefined {
    const row = this.db.prepare(`
      SELECT id, user_id as userId, tanda_id as tandaId, role,
             rotation_position as rotationPosition, is_defaulter as isDefaulter
      FROM participants WHERE user_id = ? AND tanda_id = ?
    `).get(userId, tandaId) as ParticipantRow | undefined;
    return row ? toParticipant(row) : undefined;
  }

  markDefaulter(participantId: string): void {
    this.db.prepare('UPDATE participants SET is_defaulter = 1 WHERE id = ?').run(participantId);
  }

  setRotationPositions(tandaId: string, positions: Map<string, number>): void {
    const stmt = this.db.prepare('UPDATE participants SET rotation_position = ? WHERE id = ?');
    const update = this.db.transaction(() => {
      for (const [participantId, position] of positions) {
        stmt.run(position, participantId);
      }
    });
    update();
  }
}
