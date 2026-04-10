import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
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
    const stmt = db.prepare(`
      INSERT INTO participants (id, user_id, tanda_id, role, rotation_position)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, participantData.userId, participantData.tandaId, participantData.role, participantData.rotationPosition);
    return { id, ...participantData };
  }

  /**
   * Finds a participant by id
   * @param id - The participant id
   * @returns The participant or null
   */
  async findById(id: string): Promise<Participant | null> {
    const stmt = db.prepare('SELECT id, user_id as userId, tanda_id as tandaId, role, rotation_position as rotationPosition FROM participants WHERE id = ?');
    const row = stmt.get(id) as Participant | undefined;
    return row || null;
  }

  /**
   * Finds participants by tanda id
   * @param tandaId - The tanda id
   * @returns Array of participants
   */
  async findByTandaId(tandaId: string): Promise<Participant[]> {
    const stmt = db.prepare('SELECT id, user_id as userId, tanda_id as tandaId, role, rotation_position as rotationPosition FROM participants WHERE tanda_id = ? ORDER BY rotation_position');
    return stmt.all(tandaId) as Participant[];
  }

  /**
   * Finds a participant by user and tanda
   * @param userId - The user id
   * @param tandaId - The tanda id
   * @returns The participant or null
   */
  async findByUserAndTanda(userId: string, tandaId: string): Promise<Participant | null> {
    const stmt = db.prepare('SELECT id, user_id as userId, tanda_id as tandaId, role, rotation_position as rotationPosition FROM participants WHERE user_id = ? AND tanda_id = ?');
    const row = stmt.get(userId, tandaId) as Participant | undefined;
    return row || null;
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
    const stmt = db.prepare(`UPDATE participants SET ${setClause} WHERE id = ?`);
    stmt.run(...values, id);
    const participant = await this.findById(id);
    if (!participant) throw new Error('Participant not found after update');
    return participant;
  }
}