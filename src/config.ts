export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  get jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET env var is required');
    return secret;
  },
  databasePath: process.env.DATABASE_PATH ?? ':memory:',
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? '20', 10),
  minParticipants: 3,
  latePenaltyPercent: parseFloat(process.env.LATE_PENALTY_PERCENT ?? '5'),
  consecutiveMissedThreshold: parseInt(process.env.CONSECUTIVE_MISSED_THRESHOLD ?? '2', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
