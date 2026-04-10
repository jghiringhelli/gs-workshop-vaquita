import type Database from "better-sqlite3";

const migrations = [
  {
    id: "001_base_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tandas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        organizer_id INTEGER NOT NULL,
        contribution_amount INTEGER NOT NULL CHECK (contribution_amount > 0),
        status TEXT NOT NULL CHECK (status IN ('forming', 'active', 'completed', 'cancelled')),
        current_round INTEGER NOT NULL DEFAULT 0,
        total_rounds INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizer_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tanda_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('organizer', 'member')),
        rotation_position INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, tanda_id),
        UNIQUE (tanda_id, rotation_position),
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (tanda_id) REFERENCES tandas (id)
      );

      CREATE TABLE IF NOT EXISTS contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tanda_id INTEGER NOT NULL,
        participant_id INTEGER NOT NULL,
        round INTEGER NOT NULL CHECK (round > 0),
        amount INTEGER NOT NULL CHECK (amount >= 0),
        penalty_amount INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'late', 'missed')),
        recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (participant_id, round),
        FOREIGN KEY (tanda_id) REFERENCES tandas (id),
        FOREIGN KEY (participant_id) REFERENCES participants (id)
      );

      CREATE INDEX IF NOT EXISTS idx_tandas_organizer_id ON tandas (organizer_id);
      CREATE INDEX IF NOT EXISTS idx_participants_tanda_id ON participants (tanda_id);
      CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants (user_id);
      CREATE INDEX IF NOT EXISTS idx_contributions_tanda_round ON contributions (tanda_id, round);
      CREATE INDEX IF NOT EXISTS idx_contributions_participant_id ON contributions (participant_id);
    `,
  },
  {
    id: "002_participant_risk_and_audit_logs",
    sql: `
      ALTER TABLE participants ADD COLUMN is_defaulter INTEGER NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_user_id INTEGER,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id INTEGER,
        details TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (actor_user_id) REFERENCES users (id)
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_user_id);
    `,
  },
];

/**
 * Ensures the base SQLite schema exists before serving requests.
 * @param database SQLite database client.
 * @returns Nothing.
 */
export function initializeDatabaseSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const hasColumn = database.prepare(
    `SELECT 1
     FROM pragma_table_info('participants')
     WHERE name = 'is_defaulter'`,
  ).get() as { readonly 1?: number } | undefined;

  migrations.forEach((migration) => {
    if (migration.id === "002_participant_risk_and_audit_logs" && hasColumn) {
      database.prepare(
        "INSERT OR IGNORE INTO schema_migrations (id) VALUES (?)",
      ).run(migration.id);
      database.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          actor_user_id INTEGER,
          action TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id INTEGER,
          details TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (actor_user_id) REFERENCES users (id)
        );

        CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_user_id);
      `);
      return;
    }

    const alreadyApplied = database
      .prepare("SELECT id FROM schema_migrations WHERE id = ?")
      .get(migration.id) as { readonly id: string } | undefined;

    if (alreadyApplied) {
      return;
    }

    const transaction = database.transaction((migrationId: string, sql: string): void => {
      database.exec(sql);
      database.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(migrationId);
    });

    transaction(migration.id, migration.sql);
  });
}