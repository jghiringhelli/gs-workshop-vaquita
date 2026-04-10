import Database from 'better-sqlite3';

export function applySchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organizerId TEXT NOT NULL,
      contributionAmount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'forming',
      currentRound INTEGER NOT NULL DEFAULT 1,
      totalRounds INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (organizerId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      tandaId TEXT NOT NULL,
      role TEXT NOT NULL,
      rotationPosition INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (tandaId) REFERENCES tandas(id),
      UNIQUE(userId, tandaId)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      tandaId TEXT NOT NULL,
      participantId TEXT NOT NULL,
      round INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (tandaId) REFERENCES tandas(id),
      FOREIGN KEY (participantId) REFERENCES participants(id),
      UNIQUE(participantId, round)
    );
  `);
}
