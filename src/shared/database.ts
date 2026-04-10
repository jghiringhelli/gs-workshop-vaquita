import Database from "better-sqlite3";

/**
 * Create a SQLite connection and initialize the schema.
 *
 * @param databaseFilePath SQLite file path or `:memory:`.
 * @returns Initialized SQLite database connection.
 */
export function createDatabase(databaseFilePath: string): Database.Database {
  const database = new Database(databaseFilePath);
  database.pragma("foreign_keys = ON");
  initializeSchema(database);
  return database;
}

/**
 * Initialize all database tables required by the API.
 *
 * @param database Open SQLite database connection.
 * @returns No return value.
 */
export function initializeSchema(database: Database.Database): void {
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
      status TEXT NOT NULL,
      current_round INTEGER NOT NULL,
      total_rounds INTEGER NOT NULL,
      started_at TEXT,
      cancelled_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tanda_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      rotation_position INTEGER,
      is_defaulter INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL,
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
      status TEXT NOT NULL,
      penalty_amount INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE (participant_id, round),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    );
  `);
}
