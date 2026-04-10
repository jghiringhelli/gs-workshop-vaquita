import Database from 'better-sqlite3';
import { applySchema } from './schema';

export function createDatabase(filename: string = './tanda.db'): Database.Database {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  applySchema(db);
  return db;
}
