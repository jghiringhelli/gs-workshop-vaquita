import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DB = join(process.cwd(), 'test.db');
const TEST_DB_URL = `file:${TEST_DB}`;

export async function setup(): Promise<void> {
  if (existsSync(TEST_DB)) {
    rmSync(TEST_DB);
  }
  execSync('npx prisma db push --force-reset', {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'pipe',
  });
}

export async function teardown(): Promise<void> {
  if (existsSync(TEST_DB)) {
    rmSync(TEST_DB);
  }
}
