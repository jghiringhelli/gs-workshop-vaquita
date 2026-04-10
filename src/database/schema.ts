type DatabaseConnection = import("better-sqlite3").Database;

const schemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS tandas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organizer_id INTEGER NOT NULL,
      contribution_amount REAL NOT NULL CHECK (contribution_amount > 0),
      status TEXT NOT NULL DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'completed', 'cancelled')),
      current_round INTEGER NOT NULL DEFAULT 0 CHECK (current_round >= 0),
      total_rounds INTEGER NOT NULL DEFAULT 0 CHECK (total_rounds >= 0),
      current_round_started_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tanda_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('organizer', 'member')),
      rotation_position INTEGER,
      consecutive_missed_contributions INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_missed_contributions >= 0),
      is_defaulter INTEGER NOT NULL DEFAULT 0 CHECK (is_defaulter IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      UNIQUE (user_id, tanda_id),
      UNIQUE (tanda_id, rotation_position)
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanda_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      round INTEGER NOT NULL CHECK (round > 0),
      base_amount REAL NOT NULL CHECK (base_amount >= 0),
      penalty_amount REAL NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
      total_amount REAL NOT NULL CHECK (total_amount >= 0),
      status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'late', 'missed')),
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id),
      UNIQUE (tanda_id, participant_id, round)
    );
  `,
  "CREATE INDEX IF NOT EXISTS idx_participants_tanda_id ON participants (tanda_id);",
  "CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants (user_id);",
  "CREATE INDEX IF NOT EXISTS idx_tandas_organizer_id ON tandas (organizer_id);",
  "CREATE INDEX IF NOT EXISTS idx_contributions_tanda_round ON contributions (tanda_id, round);",
  "CREATE INDEX IF NOT EXISTS idx_contributions_participant_id ON contributions (participant_id);",
];

export function initializeDatabase(db: DatabaseConnection): void {
  const initialize = db.transaction(() => {
    for (const statement of schemaStatements) {
      db.exec(statement);
    }
  });

  initialize();
}
