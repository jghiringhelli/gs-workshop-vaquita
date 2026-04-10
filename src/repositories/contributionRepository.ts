import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface Contribution {
  id: string;
  tanda_id: string;
  participant_id: string;
  round: number;
  amount: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
}

export const contributionRepository = {
  create(tandaId: string, participantId: string, round: number, amount: number, status: Contribution['status']): Contribution {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, tandaId, participantId, round, amount, status);
    return this.findById(id)!;
  },

  findById(id: string): Contribution | undefined {
    return db.prepare('SELECT * FROM contributions WHERE id = ?').get(id) as Contribution | undefined;
  },

  findByParticipantAndRound(participantId: string, round: number): Contribution | undefined {
    return db.prepare('SELECT * FROM contributions WHERE participant_id = ? AND round = ?').get(participantId, round) as Contribution | undefined;
  },

  findByTandaAndRound(tandaId: string, round: number): Contribution[] {
    return db.prepare('SELECT * FROM contributions WHERE tanda_id = ? AND round = ?').all(tandaId, round) as Contribution[];
  },

  findByParticipant(participantId: string): Contribution[] {
    return db.prepare('SELECT * FROM contributions WHERE participant_id = ? ORDER BY round ASC').all(participantId) as Contribution[];
  },

  findByTanda(tandaId: string): Contribution[] {
    return db.prepare('SELECT * FROM contributions WHERE tanda_id = ?').all(tandaId) as Contribution[];
  },

  updateStatus(id: string, status: Contribution['status']): void {
    db.prepare('UPDATE contributions SET status = ? WHERE id = ?').run(status, id);
  },
};
