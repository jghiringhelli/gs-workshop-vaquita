import { afterEach, afterAll } from 'vitest';
import { closeDatabase } from '../src/db/database';
import { CONFIG } from '../src/config';
import fs from 'fs';

afterEach(() => {
  closeDatabase();

  try {
    const dbPath = CONFIG.DATABASE_PATH;
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }
});

afterAll(() => {
  closeDatabase();
});
