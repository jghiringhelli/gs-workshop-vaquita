import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db.js';
import { Tanda } from '../domain/index.js';
import { ITandaRepository } from '../domain/repositories.js';

export class TandaRepository implements ITandaRepository {
  /**
   * Creates a new tanda
   * @param tandaData - The tanda data without id
   * @returns The created tanda
   */
  async create(tandaData: Omit<Tanda, 'id'>): Promise<Tanda> {
    const id = uuidv4();
    await dbRun(
      'INSERT INTO tandas (id, name, organizer_id, contribution_amount, status, current_round, total_rounds) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, tandaData.name, tandaData.organizerId, tandaData.contributionAmount, tandaData.status, tandaData.currentRound, tandaData.totalRounds]
    );
    return { id, ...tandaData };
  }

  /**
   * Finds a tanda by id
   * @param id - The tanda id
   * @returns The tanda or null
   */
  async findById(id: string): Promise<Tanda | null> {
    const row = await dbGet('SELECT id, name, organizer_id as organizerId, contribution_amount as contributionAmount, status, current_round as currentRound, total_rounds as totalRounds FROM tandas WHERE id = ?', [id]);
    return row as Tanda | null;
  }

  /**
   * Finds tandas by user id (where user is organizer or participant)
   * @param userId - The user id
   * @returns Array of tandas
   */
  async findByUserId(userId: string): Promise<Tanda[]> {
    const rows = await dbAll(`
      SELECT DISTINCT t.id, t.name, t.organizer_id as organizerId, t.contribution_amount as contributionAmount, t.status, t.current_round as currentRound, t.total_rounds as totalRounds
      FROM tandas t
      LEFT JOIN participants p ON t.id = p.tanda_id
      WHERE t.organizer_id = ? OR p.user_id = ?
      ORDER BY t.created_at DESC
    `, [userId, userId]);
    return rows as Tanda[];
  }

  /**
   * Updates a tanda
   * @param id - The tanda id
   * @param updates - The fields to update
   * @returns The updated tanda
   */
  async update(id: string, updates: Partial<Tanda>): Promise<Tanda> {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => {
      const dbField = field === 'organizerId' ? 'organizer_id' :
                     field === 'contributionAmount' ? 'contribution_amount' :
                     field === 'currentRound' ? 'current_round' :
                     field === 'totalRounds' ? 'total_rounds' : field;
      return `${dbField} = ?`;
    }).join(', ');
    await dbRun(`UPDATE tandas SET ${setClause} WHERE id = ?`, [...values, id]);
    const tanda = await this.findById(id);
    if (!tanda) throw new Error('Tanda not found after update');
    return tanda;
  }

  /**
   * Lists all tandas
   * @returns Array of tandas
   */
  async list(): Promise<Tanda[]> {
    const rows = await dbAll('SELECT id, name, organizer_id as organizerId, contribution_amount as contributionAmount, status, current_round as currentRound, total_rounds as totalRounds FROM tandas ORDER BY created_at DESC', []);
    return rows as Tanda[];
  }
}