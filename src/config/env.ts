import { randomUUID } from "node:crypto"

/**
 * Runtime configuration derived from environment variables.
 */
export interface AppConfig {
  readonly appVersion: string
  readonly databasePath: string
  readonly port: number
  readonly minParticipants: number
  readonly maxParticipants: number
  readonly contributionWindowHours: number
  readonly latePenaltyBasisPoints: number
  readonly defaultCurrencyCode: string
  readonly defaultPageSize: number
  readonly maxPageSize: number
  readonly shutdownTimeoutMs: number
  readonly jwtSecret: string
  readonly jwtTtlSeconds: number
  readonly rateLimitWindowMs: number
  readonly rateLimitMaxRequests: number
  readonly requestIdSeed: string
}

/**
 * Load and validate application configuration.
 *
 * @returns Immutable application configuration.
 */
export function loadConfig(): AppConfig {
  return {
    appVersion: readStringEnv("APP_VERSION", "1.0.0"),
    databasePath: readStringEnv("DATABASE_PATH", "./data/tanda.sqlite"),
    port: readNumberEnv("PORT", 3000),
    minParticipants: readNumberEnv("MIN_PARTICIPANTS", 3),
    maxParticipants: readNumberEnv("MAX_PARTICIPANTS", 20),
    contributionWindowHours: readNumberEnv("CONTRIBUTION_WINDOW_HOURS", 24),
    latePenaltyBasisPoints: readNumberEnv("LATE_PENALTY_BASIS_POINTS", 500),
    defaultCurrencyCode: readStringEnv("DEFAULT_CURRENCY_CODE", "MXN"),
    defaultPageSize: readNumberEnv("DEFAULT_PAGE_SIZE", 20),
    maxPageSize: readNumberEnv("MAX_PAGE_SIZE", 100),
    shutdownTimeoutMs: readNumberEnv("SHUTDOWN_TIMEOUT_MS", 30_000),
    jwtSecret: readStringEnv("JWT_SECRET", `dev-secret-${randomUUID()}`),
    jwtTtlSeconds: readNumberEnv("JWT_TTL_SECONDS", 86_400),
    rateLimitWindowMs: readNumberEnv("RATE_LIMIT_WINDOW_MS", 60_000),
    rateLimitMaxRequests: readNumberEnv("RATE_LIMIT_MAX_REQUESTS", 120),
    requestIdSeed: readStringEnv("REQUEST_ID_SEED", randomUUID()),
  }
}

/**
 * Read a required or defaulted string environment variable.
 *
 * @param name - Environment variable name.
 * @param fallback - Default value when unset.
 * @returns The resolved string value.
 */
function readStringEnv(name: string, fallback: string): string {
  const value = process.env[name]
  return value?.trim() ? value.trim() : fallback
}

/**
 * Read a numeric environment variable and validate its format.
 *
 * @param name - Environment variable name.
 * @param fallback - Default numeric value when unset.
 * @returns Parsed number.
 */
function readNumberEnv(name: string, fallback: number): number {
  const value = process.env[name]

  if (!value?.trim()) {
    return fallback
  }

  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`Environment variable ${name} must be a valid number`)
  }

  return parsedValue
}
