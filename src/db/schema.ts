export const CREATE_USERS = `CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
)`;

export const CREATE_TANDAS = `CREATE TABLE IF NOT EXISTS tandas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organizerId TEXT NOT NULL,
  contributionAmount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'forming',
  currentRound INTEGER NOT NULL DEFAULT 1,
  totalRounds INTEGER NOT NULL DEFAULT 0
)`;

export const CREATE_PARTICIPANTS = `CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  tandaId TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  rotationPosition INTEGER,
  isDefaulter INTEGER NOT NULL DEFAULT 0
)`;

export const CREATE_CONTRIBUTIONS = `CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  tandaId TEXT NOT NULL,
  participantId TEXT NOT NULL,
  round INTEGER NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
)`;
