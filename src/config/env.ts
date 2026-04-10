/**
 * Application configuration loaded from environment variables.
 * All magic numbers (limits, fees) are named constants — never hardcoded.
 */

export interface AppConfig {
  port: number;
  jwtSecret: string;
  maxParticipants: number;
  latePenaltyPercent: number;
}

let _config: AppConfig | null = null;

/**
 * Returns the singleton app config, initialising from env on first call.
 * @returns {AppConfig} validated configuration object
 */
export function getConfig(): AppConfig {
  if (_config) return _config;

  _config = {
    port: parseInt(process.env.PORT ?? "3000", 10),
    jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? "20", 10),
    latePenaltyPercent: parseFloat(process.env.LATE_PENALTY_PERCENT ?? "5"),
  };

  return _config;
}

/** Reset config singleton — for testing only. */
export function resetConfig(): void {
  _config = null;
}
