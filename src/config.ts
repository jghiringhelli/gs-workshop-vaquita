import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'test-secret-for-development',
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? '20', 10),
  minParticipants: 3,
  latePenaltyRate: parseFloat(process.env.LATE_PENALTY_RATE ?? '0.05'),
  defaulterThreshold: parseInt(process.env.DEFAULTER_THRESHOLD ?? '2', 10),
} as const;
