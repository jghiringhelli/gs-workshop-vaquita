import Database from "better-sqlite3";
import { EnvironmentConfig } from "./env";

/**
 * Creates a SQLite connection and ensures required schema is present.
 * @param config Validated environment configuration.
 * @returns Initialized SQLite database instance.
 */
export function createDatabaseConnection(config: EnvironmentConfig): Database.Database {
  const database = new Database(config.DATABASE_FILE);
  database.pragma("foreign_keys = ON");
  initializeSchema(database);
  return database;
}

/**
 * Initializes the database schema for the Tanda domain.
 * @param database Open SQLite database.
 * @returns Nothing.
 */
function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organizer_id INTEGER NOT NULL,
      contribution_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'completed', 'cancelled')),
      current_round INTEGER NOT NULL DEFAULT 0,
      total_rounds INTEGER NOT NULL DEFAULT 0,
      round_started_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tanda_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('organizer', 'member')),
      rotation_position INTEGER,
      missed_streak INTEGER NOT NULL DEFAULT 0,
      is_defaulter INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE (user_id, tanda_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanda_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      round INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'late', 'missed')),
      penalty_amount INTEGER NOT NULL DEFAULT 0,
      idempotency_key TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (tanda_id, participant_id, round, status),
      UNIQUE (idempotency_key),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    );
  `);
}
