import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db.js';
import { Participant } from '../domain/index.js';
import { IParticipantRepository } from '../domain/repositories.js';

export class ParticipantRepository implements IParticipantRepository {
  /**
   * Creates a new participant
   * @param participantData - The participant data without id
   * @returns The created participant
   */
  async create(participantData: Omit<Participant, 'id'>): Promise<Participant> {
    const id = uuidv4();
    await dbRun(
      'INSERT INTO participants (id, user_id, tanda_id, role, rotation_position) VALUES (?, ?, ?, ?, ?)',
      [id, participantData.userId, participantData.tandaId, participantData.role, participantData.rotationPosition]
    );
    return { id, ...participantData };
  }

  /**
   * Finds a participant by id
   * @param id - The participant id
   * @returns The participant or null
   */
  async findById(id: string): Promise<Participant | null> {
    const row = await dbGet('SELECT id, user_id as userId, tanda_id as tandaId, role, rotation_position as rotationPosition FROM participants WHERE id = ?', [id]);
    return row as Participant | null;
  }

  /**
   * Finds participants by tanda id
   * @param tandaId - The tanda id
   * @returns Array of participants
   */
  async findByTandaId(tandaId: string): Promise<Participant[]> {
    const rows = await dbAll('SELECT id, user_id as userId, tanda_id as tandaId, role, rotation_position as rotationPosition FROM participants WHERE tanda_id = ? ORDER BY rotation_position', [tandaId]);
    return rows as Participant[];
  }

  /**
   * Finds a participant by user and tanda
   * @param userId - The user id
   * @param tandaId - The tanda id
   * @returns The participant or null
   */
  async findByUserAndTanda(userId: string, tandaId: string): Promise<Participant | null> {
    const row = await dbGet('SELECT id, user_id as userId, tanda_id as tandaId, role, rotation_position as rotationPosition FROM participants WHERE user_id = ? AND tanda_id = ?', [userId, tandaId]);
    return row as Participant | null;
  }

  /**
   * Updates a participant
   * @param id - The participant id
   * @param updates - The fields to update
   * @returns The updated participant
   */
  async update(id: string, updates: Partial<Participant>): Promise<Participant> {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => {
      const dbField = field === 'userId' ? 'user_id' :
                     field === 'tandaId' ? 'tanda_id' :
                     field === 'rotationPosition' ? 'rotation_position' : field;
      return `${dbField} = ?`;
    }).join(', ');
    await dbRun(`UPDATE participants SET ${setClause} WHERE id = ?`, [...values, id]);
    const participant = await this.findById(id);
    if (!participant) throw new Error('Participant not found after update');
    return participant;
  }
}