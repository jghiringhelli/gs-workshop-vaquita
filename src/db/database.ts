import Database from 'better-sqlite3';
import { config } from '../config.js';

let db: Database.Database | null = null;

/**
 * Returns a singleton better-sqlite3 Database instance.
 * Call `closeDatabase()` in tests to reset between suites.
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/** Close and clear the singleton — used in tests. */
export function closeDatabase(): void {
  db?.close();
  db = null;
}
