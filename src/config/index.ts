import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_PATH: process.env.DATABASE_PATH || './data/tanda.db',
  JWT_SECRET: process.env.JWT_SECRET,
  
  MIN_PARTICIPANTS: parseInt(process.env.MIN_PARTICIPANTS || '3', 10),
  MAX_PARTICIPANTS: parseInt(process.env.MAX_PARTICIPANTS || '20', 10),
  LATE_PENALTY_PERCENT: parseInt(process.env.LATE_PENALTY_PERCENT || '5', 10),
  MAX_CONSECUTIVE_MISSES: parseInt(process.env.MAX_CONSECUTIVE_MISSES || '2', 10),
} as const;

if (!CONFIG.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export function getLatePenaltyMultiplier(): number {
  return 1 + (CONFIG.LATE_PENALTY_PERCENT / 100);
}
