import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

const isTest = process.env.NODE_ENV === 'test';

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_PATH: isTest 
    ? (process.env.DATABASE_PATH || './data/test-tanda.db')
    : (process.env.DATABASE_PATH || './data/tanda.db'),
  JWT_SECRET: process.env.JWT_SECRET || 'test-secret',

  MIN_PARTICIPANTS: parseInt(process.env.MIN_PARTICIPANTS || '3', 10),
  MAX_PARTICIPANTS: parseInt(process.env.MAX_PARTICIPANTS || '20', 10),
  LATE_PENALTY_PERCENT: parseInt(process.env.LATE_PENALTY_PERCENT || '5', 10),
  MAX_CONSECUTIVE_MISSES: parseInt(process.env.MAX_CONSECUTIVE_MISSES || '2', 10),
} as const;

if (!CONFIG.JWT_SECRET && !isTest) {
  throw new Error('JWT_SECRET environment variable is required');
}

export function getLatePenaltyMultiplier(): number {
  return 1 + (CONFIG.LATE_PENALTY_PERCENT / 100);
}
