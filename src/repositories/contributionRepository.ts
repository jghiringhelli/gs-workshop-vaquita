import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db.js';
import { Contribution } from '../domain/index.js';
import { IContributionRepository } from '../domain/repositories.js';

export class ContributionRepository implements IContributionRepository {
  /**
   * Creates a new contribution
   * @param contributionData - The contribution data without id
   * @returns The created contribution
   */
  async create(contributionData: Omit<Contribution, 'id'>): Promise<Contribution> {
    const id = uuidv4();
    await dbRun(
      'INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, contributionData.tandaId, contributionData.participantId, contributionData.round, contributionData.amount, contributionData.status]
    );
    return { id, ...contributionData };
  }

  /**
   * Finds a contribution by id
   * @param id - The contribution id
   * @returns The contribution or null
   */
  async findById(id: string): Promise<Contribution | null> {
    const row = await dbGet('SELECT id, tanda_id as tandaId, participant_id as participantId, round, amount, status FROM contributions WHERE id = ?', [id]);
    return row as Contribution | null;
  }

  /**
   * Finds contributions by tanda and round
   * @param tandaId - The tanda id
   * @param round - The round number
   * @returns Array of contributions
   */
  async findByTandaAndRound(tandaId: string, round: number): Promise<Contribution[]> {
    const rows = await dbAll('SELECT id, tanda_id as tandaId, participant_id as participantId, round, amount, status FROM contributions WHERE tanda_id = ? AND round = ? ORDER BY participant_id', [tandaId, round]);
    return rows as Contribution[];
  }

  /**
   * Finds contributions by participant id
   * @param participantId - The participant id
   * @returns Array of contributions
   */
  async findByParticipantId(participantId: string): Promise<Contribution[]> {
    const rows = await dbAll('SELECT id, tanda_id as tandaId, participant_id as participantId, round, amount, status FROM contributions WHERE participant_id = ? ORDER BY round', [participantId]);
    return rows as Contribution[];
  }

  /**
   * Updates a contribution
   * @param id - The contribution id
   * @param updates - The fields to update
   * @returns The updated contribution
   */
  async update(id: string, updates: Partial<Contribution>): Promise<Contribution> {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => {
      const dbField = field === 'tandaId' ? 'tanda_id' :
                     field === 'participantId' ? 'participant_id' : field;
      return `${dbField} = ?`;
    }).join(', ');
    await dbRun(`UPDATE contributions SET ${setClause} WHERE id = ?`, [...values, id]);
    const contribution = await this.findById(id);
    if (!contribution) throw new Error('Contribution not found after update');
    return contribution;
  }
}