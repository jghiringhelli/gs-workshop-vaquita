import Database from 'better-sqlite3';
import { CONFIG } from '../config';
import fs from 'fs';
import path from 'path';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(CONFIG.DATABASE_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(CONFIG.DATABASE_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    initializeSchema();
  }

  return db;
}

function initializeSchema(): void {
  if (!db) return;

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  db.exec(schema);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function clearDatabase(): void {
  const database = getDatabase();

  database.pragma('foreign_keys = OFF');
  database.exec('DELETE FROM contributions');
  database.exec('DELETE FROM participants');
  database.exec('DELETE FROM tandas');
  database.exec('DELETE FROM users');
  database.pragma('foreign_keys = ON');
}

export function resetDatabase(): void {
  closeDatabase();

  if (fs.existsSync(CONFIG.DATABASE_PATH)) {
    fs.unlinkSync(CONFIG.DATABASE_PATH);
  }

  const walPath = CONFIG.DATABASE_PATH + '-wal';
  const shmPath = CONFIG.DATABASE_PATH + '-shm';

  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  getDatabase();
}
