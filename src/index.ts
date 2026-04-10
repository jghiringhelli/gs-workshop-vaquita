import Database from 'better-sqlite3';
import { config } from './config';
import { runMigrations } from './db/schema';
import { setDb } from './db/database';
import { createApp } from './app';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
setDb(db);
runMigrations(db);

const app = createApp(db);

app.listen(config.port, () => {
  console.log(`Tanda API running on port ${config.port}`);
});
