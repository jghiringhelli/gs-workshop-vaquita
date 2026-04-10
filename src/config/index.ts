function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  databaseUrl: process.env['DATABASE_URL'] ?? './tanda.db',
  jwtSecret: requireEnv('JWT_SECRET'),
  maxParticipants: parseInt(process.env['MAX_PARTICIPANTS'] ?? '20', 10),
  penaltyPercent: parseFloat(process.env['PENALTY_PERCENT'] ?? '5'),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
} as const;
