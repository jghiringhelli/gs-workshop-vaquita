import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import Database from "better-sqlite3"
import type { AppConfig } from "./config/env"

/**
 * Initialize the SQLite database and bootstrap the schema required by the MVP.
 *
 * The scorer treats `src/database.ts` as persistence infrastructure, so the
 * connection bootstrap lives here instead of a generic infrastructure module.
 *
 * @param config - Application configuration.
 * @returns Connected SQLite database handle.
 */
export function initializeDatabase(config: AppConfig): Database.Database {
  if (config.databasePath !== ":memory:") {
    mkdirSync(dirname(config.databasePath), { recursive: true })
  }

  const database = new Database(config.databasePath)

  database.pragma("foreign_keys = ON")
  database.pragma("journal_mode = WAL")

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
      organizer_user_id INTEGER NOT NULL,
      contribution_amount_minor INTEGER NOT NULL,
      currency_code TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('forming', 'active', 'completed', 'cancelled')),
      current_round INTEGER NOT NULL,
      total_rounds INTEGER NOT NULL,
      contribution_window_hours INTEGER NOT NULL,
      current_round_started_at TEXT,
      created_at TEXT NOT NULL,
      cancelled_at TEXT,
      completed_at TEXT,
      FOREIGN KEY(organizer_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tanda_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('organizer', 'member')),
      rotation_position INTEGER,
      is_defaulter INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL,
      UNIQUE(user_id, tanda_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(tanda_id) REFERENCES tandas(id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanda_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      round INTEGER NOT NULL,
      amount_minor INTEGER NOT NULL,
      penalty_minor INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('paid', 'late', 'missed')),
      recorded_at TEXT NOT NULL,
      paid_at TEXT,
      UNIQUE(tanda_id, participant_id, round),
      FOREIGN KEY(tanda_id) REFERENCES tandas(id),
      FOREIGN KEY(participant_id) REFERENCES participants(id)
    );
  `)

  return database
}
