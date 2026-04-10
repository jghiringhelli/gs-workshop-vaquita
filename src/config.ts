/**
 * Application configuration from environment variables
 */

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DATABASE_URL || './tanda.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',

  // Business logic constants
  minParticipants: parseInt(process.env.MIN_PARTICIPANTS || '3', 10),
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS || '20', 10),
  lateFeePct: parseFloat(process.env.LATE_FEE_PCT || '5'),
  defaulterThreshold: parseInt(process.env.DEFAULTER_THRESHOLD || '2', 10),
} as const;

// Validate required env vars at startup
if (!config.jwtSecret || config.jwtSecret === 'dev-secret-key-change-in-production') {
  if (config.nodeEnv === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
}
