import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Participant, CreateParticipantDto } from './Participant';
import { IParticipantRepository } from './IParticipantRepository';

interface ParticipantRow {
  id: string;
  user_id: string;
  tanda_id: string;
  role: string;
  rotation_position: number | null;
  created_at: string;
}

function rowToParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role as Participant['role'],
    rotationPosition: row.rotation_position,
    createdAt: row.created_at,
  };
}

export class SqliteParticipantRepository implements IParticipantRepository {
  constructor(private readonly db: Database.Database) {}

  create(dto: CreateParticipantDto): Participant {
    const p: Participant = {
      id: uuidv4(),
      userId: dto.userId,
      tandaId: dto.tandaId,
      role: dto.role,
      rotationPosition: null,
      createdAt: new Date().toISOString(),
    };
    this.db
      .prepare(
        'INSERT INTO participants (id, user_id, tanda_id, role, rotation_position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(p.id, p.userId, p.tandaId, p.role, p.rotationPosition, p.createdAt);
    return p;
  }

  findById(id: string): Participant | null {
    const row = this.db
      .prepare('SELECT * FROM participants WHERE id = ?')
      .get(id) as ParticipantRow | undefined;
    return row ? rowToParticipant(row) : null;
  }

  findByTandaId(tandaId: string): Participant[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM participants WHERE tanda_id = ? ORDER BY rotation_position ASC, created_at ASC',
      )
      .all(tandaId) as ParticipantRow[];
    return rows.map(rowToParticipant);
  }

  findByUserIdAndTandaId(userId: string, tandaId: string): Participant | null {
    const row = this.db
      .prepare('SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?')
      .get(userId, tandaId) as ParticipantRow | undefined;
    return row ? rowToParticipant(row) : null;
  }

  assignRotationPositions(
    tandaId: string,
    assignments: Array<{ id: string; position: number }>,
  ): void {
    const stmt = this.db.prepare('UPDATE participants SET rotation_position = ? WHERE id = ?');
    const updateAll = this.db.transaction(() => {
      for (const a of assignments) {
        stmt.run(a.position, a.id);
      }
    });
    updateAll();
  }

  countByTandaId(tandaId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM participants WHERE tanda_id = ?')
      .get(tandaId) as { count: number };
    return row.count;
  }
}
