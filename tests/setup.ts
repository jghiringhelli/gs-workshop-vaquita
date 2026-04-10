import { afterAll, beforeEach } from 'vitest';
import { resetDatabase, closeDatabase } from '../src/db/database';

beforeEach(() => {
  resetDatabase();
});

afterAll(() => {
  closeDatabase();
});
