import Database from "better-sqlite3";
import { config } from "../config/index.js";

const DB_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tandas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    organizer_id INTEGER NOT NULL,
    contribution_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'forming' CHECK(status IN ('forming','active','completed','cancelled')),
    current_round INTEGER NOT NULL DEFAULT 0,
    total_rounds INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (organizer_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tanda_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('organizer','member')),
    rotation_position INTEGER,
    is_defaulter INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (tanda_id) REFERENCES tandas(id),
    UNIQUE(user_id, tanda_id)
  );

  CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanda_id INTEGER NOT NULL,
    participant_id INTEGER NOT NULL,
    round INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','late','missed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tanda_id) REFERENCES tandas(id),
    FOREIGN KEY (participant_id) REFERENCES participants(id),
    UNIQUE(participant_id, round)
  );
`;

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    const isTest = process.env.NODE_ENV === "test";
    dbInstance = new Database(isTest ? ":memory:" : config.dbPath);
    dbInstance.pragma("journal_mode = WAL");
    dbInstance.pragma("foreign_keys = ON");
    dbInstance.exec(DB_SCHEMA);
  }
  return dbInstance;
}

export function resetDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
