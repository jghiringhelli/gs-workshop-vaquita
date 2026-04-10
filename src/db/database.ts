import Database from 'better-sqlite3';
import path from 'path';
import { runMigrations } from './schema';

export function createDatabase(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? process.env.DB_PATH ?? path.join(process.cwd(), 'tanda.db');
  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}
