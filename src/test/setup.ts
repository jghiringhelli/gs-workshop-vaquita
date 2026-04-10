/**
 * Vitest global setup — runs before every test file in its worker process.
 * Sets required environment variables before any module is imported.
 */
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-chars-long';
process.env['DATABASE_PATH'] = ':memory:';
process.env['PORT'] = '3001';
process.env['MAX_PARTICIPANTS'] = '20';
process.env['MIN_PARTICIPANTS_TO_START'] = '3';
process.env['PENALTY_PERCENT'] = '0.05';
process.env['ROUND_WINDOW_HOURS'] = '72';
