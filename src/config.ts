import path from 'path';

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? (process.env.NODE_ENV === 'test' ? 'test-secret' : (() => { throw new Error('JWT_SECRET env var is required'); })()),
  dbPath: process.env.NODE_ENV === 'test'
    ? ':memory:'
    : (process.env.DATABASE_URL?.replace('file:', '') ?? path.join(process.cwd(), 'dev.db')),
  tanda: {
    maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? '20', 10),
    minParticipants: 3,
    latePenaltyPct: parseFloat(process.env.LATE_PENALTY_PCT ?? '0.05'),
    maxConsecutiveMissed: 2,
  },
} as const;
