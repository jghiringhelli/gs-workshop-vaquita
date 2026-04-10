/**
 * Application Configuration
 * All magic numbers and configurable values are defined here
 */

export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Business rules
  tanda: {
    minParticipants: 3,
    maxParticipants: parseInt(process.env.MAX_PARTICIPANTS || '20', 10),
    latePenaltyPercent: parseFloat(process.env.LATE_PENALTY_PERCENT || '0.05'),
    missedContributionThreshold: 2,
  },

  // Database configuration
  database: {
    path: process.env.DATABASE_PATH || ':memory:',
  },

  // JWT configuration (for future auth implementation)
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: '24h',
  },

  // API configuration
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    version: '1.0.0',
  },
} as const;

/**
 * Validate critical configuration at startup
 */
export function validateConfig(): void {
  if (config.nodeEnv === 'production' && config.jwt.secret === 'dev-secret-change-in-production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }

  if (config.tanda.minParticipants < 1) {
    throw new Error('minParticipants must be at least 1');
  }

  if (config.tanda.maxParticipants < config.tanda.minParticipants) {
    throw new Error('maxParticipants must be >= minParticipants');
  }
}
