-- Tanda API — Reference DDL (also inlined in src/db/db.ts for runtime)

CREATE TABLE IF NOT EXISTS users (
  id        TEXT PRIMARY KEY,
  email     TEXT UNIQUE NOT NULL,
  name      TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tandas (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  organizerId        TEXT NOT NULL REFERENCES users(id),
  contributionAmount REAL NOT NULL,
  status             TEXT NOT NULL DEFAULT 'forming'
                       CHECK(status IN ('forming','active','completed','cancelled')),
  currentRound       INTEGER NOT NULL DEFAULT 0,
  totalRounds        INTEGER NOT NULL DEFAULT 0,
  roundStartedAt     TEXT,
  createdAt          TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS participants (
  id                TEXT PRIMARY KEY,
  userId            TEXT NOT NULL REFERENCES users(id),
  tandaId           TEXT NOT NULL REFERENCES tandas(id),
  role              TEXT NOT NULL DEFAULT 'member'
                      CHECK(role IN ('organizer','member')),
  rotationPosition  INTEGER,
  isDefaulter       INTEGER NOT NULL DEFAULT 0,   -- 0=false, 1=true
  consecutiveMissed INTEGER NOT NULL DEFAULT 0,
  joinedAt          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(userId, tandaId)
);

CREATE TABLE IF NOT EXISTS contributions (
  id            TEXT PRIMARY KEY,
  tandaId       TEXT NOT NULL REFERENCES tandas(id),
  participantId TEXT NOT NULL REFERENCES participants(id),
  round         INTEGER NOT NULL,
  amount        REAL NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','paid','late','missed')),
  dueAt         TEXT,   -- ISO-8601: deadline for "paid" status
  paidAt        TEXT,   -- ISO-8601: when actually paid
  createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(participantId, round)
);
