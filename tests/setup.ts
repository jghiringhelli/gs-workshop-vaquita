import { beforeEach, afterAll } from 'vitest';
import { closeDatabase, clearDatabase } from '../src/db/database';

beforeEach(() => {
  clearDatabase();
});

afterAll(() => {
  closeDatabase();
});
