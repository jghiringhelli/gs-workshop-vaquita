export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? '20', 10),
  latePenaltyPct: parseFloat(process.env.LATE_PENALTY_PCT ?? '0.05'),
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
};
