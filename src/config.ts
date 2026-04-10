import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: requireEnv('JWT_SECRET'),
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? '20', 10),
  latePenaltyRate: parseFloat(process.env.LATE_PENALTY_RATE ?? '0.05'),
  roundDurationDays: parseInt(process.env.ROUND_DURATION_DAYS ?? '7', 10),
} as const;
