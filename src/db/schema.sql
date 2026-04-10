-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tandas table
CREATE TABLE IF NOT EXISTS tandas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  organizer_id INTEGER NOT NULL,
  contribution_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'forming' CHECK(status IN ('forming', 'active', 'completed', 'cancelled')),
  current_round INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (organizer_id) REFERENCES users(id)
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tanda_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('organizer', 'member')),
  rotation_position INTEGER,
  joined_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tanda_id) REFERENCES tandas(id),
  UNIQUE(user_id, tanda_id)
);

-- Contributions table
CREATE TABLE IF NOT EXISTS contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tanda_id INTEGER NOT NULL,
  participant_id INTEGER NOT NULL,
  round INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'late', 'missed')),
  paid_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tanda_id) REFERENCES tandas(id),
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  UNIQUE(tanda_id, participant_id, round)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tandas_organizer ON tandas(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tandas_status ON tandas(status);
CREATE INDEX IF NOT EXISTS idx_participants_tanda ON participants(tanda_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_tanda ON contributions(tanda_id);
CREATE INDEX IF NOT EXISTS idx_contributions_participant ON contributions(participant_id);
CREATE INDEX IF NOT EXISTS idx_contributions_round ON contributions(tanda_id, round);
