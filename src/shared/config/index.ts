const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) throw new Error(`Missing required env var: ${key}`);
  return value;
};

const getEnvNumber = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Env var ${key} must be an integer`);
  return parsed;
};

const getEnvFloat = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const parsed = parseFloat(raw);
  if (isNaN(parsed)) throw new Error(`Env var ${key} must be a number`);
  return parsed;
};

/**
 * Validated application configuration sourced entirely from environment variables.
 * Fails fast at startup if a required variable is absent.
 */
export const config = {
  port: getEnvNumber('PORT', 3000),
  jwtSecret: getEnv('JWT_SECRET', 'dev-secret-change-me'),
  databaseUrl: getEnv('DATABASE_URL', 'file:./dev.db'),
  /** Maximum number of participants allowed per tanda. */
  maxParticipants: getEnvNumber('MAX_PARTICIPANTS', 20),
  /** Late-contribution penalty expressed as a fraction (0.05 = 5 %). */
  latePenaltyRate: getEnvFloat('LATE_PENALTY_RATE', 0.05),
  /** Consecutive missed contributions before a participant is flagged as a defaulter. */
  defaulterThreshold: getEnvNumber('DEFAULTER_THRESHOLD', 2),
  nodeEnv: getEnv('NODE_ENV', 'development'),
} as const;
