import Database from 'better-sqlite3';
import { config } from '../config';
import { CREATE_USERS, CREATE_TANDAS, CREATE_PARTICIPANTS, CREATE_CONTRIBUTIONS } from './schema';

const dbPath = config.nodeEnv === 'test' ? ':memory:' : config.databaseUrl.replace('file:', '');

const db: Database.Database = new Database(dbPath);
db.exec(CREATE_USERS);
db.exec(CREATE_TANDAS);
db.exec(CREATE_PARTICIPANTS);
db.exec(CREATE_CONTRIBUTIONS);

export { db };
export type { Database };
