/**
 * Application configuration loaded from environment variables.
 * All magic numbers must be sourced from here — never hardcoded.
 */

/** @returns Parsed application configuration */
export function getConfig() {
  return {
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-prod',
    dbPath: process.env['DATABASE_PATH'] ?? ':memory:',
    maxParticipants: parseInt(process.env['MAX_PARTICIPANTS'] ?? '20', 10),
    penaltyPercent: parseFloat(process.env['PENALTY_PERCENT'] ?? '5'),
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
  } as const;
}

export type AppConfig = ReturnType<typeof getConfig>;

