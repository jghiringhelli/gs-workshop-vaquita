import Database from 'better-sqlite3';
import { initializeDatabase } from './schema';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = initializeDatabase();
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
