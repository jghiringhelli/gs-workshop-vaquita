export const config = {
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  get JWT_SECRET(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    return secret;
  },
  MAX_PARTICIPANTS: parseInt(process.env.MAX_PARTICIPANTS ?? '20', 10),
  MIN_PARTICIPANTS_TO_START: 3,
  LATE_PENALTY_PCT: parseFloat(process.env.LATE_PENALTY_PCT ?? '0.05'),
  MAX_CONSECUTIVE_MISSED: parseInt(process.env.MAX_CONSECUTIVE_MISSED ?? '2', 10),
};
