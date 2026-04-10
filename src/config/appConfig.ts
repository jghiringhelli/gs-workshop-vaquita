const DEFAULT_PORT = 3000;
const DEFAULT_DATABASE_URL = "file:./dev.db";
const DEFAULT_MAX_PARTICIPANTS = 20;
const DEFAULT_MIN_PARTICIPANTS_TO_START = 3;
const DEFAULT_LATE_PENALTY_BASIS_POINTS = 500;
const DEFAULT_CONTRIBUTION_WINDOW_DAYS = 7;

export interface AppConfig {
  readonly environment: string;
  readonly port: number;
  readonly databasePath: string;
  readonly maxParticipants: number;
  readonly minParticipantsToStart: number;
  readonly latePenaltyBasisPoints: number;
  readonly contributionWindowDays: number;
  readonly jwtSecret?: string;
}

function parsePositiveInteger(value: string | undefined, fallback: number, variableName: string): number {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${variableName} must be a positive integer`);
  }

  return parsedValue;
}

/**
 * Convert a DATABASE_URL value into the SQLite path used by better-sqlite3.
 *
 * @param databaseUrl The raw DATABASE_URL value.
 * @returns The SQLite database path.
 */
export function parseDatabasePath(databaseUrl: string): string {
  if (databaseUrl === ":memory:" || databaseUrl.startsWith("file::memory:")) {
    return ":memory:";
  }

  if (databaseUrl.startsWith("file:")) {
    const filePath = databaseUrl.slice("file:".length);
    if (!filePath) {
      throw new Error("DATABASE_URL must include a file path");
    }

    return filePath;
  }

  return databaseUrl;
}

/**
 * Load and validate application configuration from the process environment.
 *
 * @param environmentVariables The environment variables to read.
 * @returns The validated application configuration.
 */
export function loadAppConfig(environmentVariables: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseUrl = environmentVariables["DATABASE_URL"] ?? DEFAULT_DATABASE_URL;
  const jwtSecret = environmentVariables["JWT_SECRET"];

  if (jwtSecret && jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long when provided");
  }

  return {
    environment: environmentVariables["NODE_ENV"] ?? "development",
    port: parsePositiveInteger(environmentVariables["PORT"], DEFAULT_PORT, "PORT"),
    databasePath: parseDatabasePath(databaseUrl),
    maxParticipants: parsePositiveInteger(
      environmentVariables["MAX_PARTICIPANTS"],
      DEFAULT_MAX_PARTICIPANTS,
      "MAX_PARTICIPANTS",
    ),
    minParticipantsToStart: parsePositiveInteger(
      environmentVariables["MIN_PARTICIPANTS_TO_START"],
      DEFAULT_MIN_PARTICIPANTS_TO_START,
      "MIN_PARTICIPANTS_TO_START",
    ),
    latePenaltyBasisPoints: parsePositiveInteger(
      environmentVariables["LATE_PENALTY_BASIS_POINTS"],
      DEFAULT_LATE_PENALTY_BASIS_POINTS,
      "LATE_PENALTY_BASIS_POINTS",
    ),
    contributionWindowDays: parsePositiveInteger(
      environmentVariables["CONTRIBUTION_WINDOW_DAYS"],
      DEFAULT_CONTRIBUTION_WINDOW_DAYS,
      "CONTRIBUTION_WINDOW_DAYS",
    ),
    jwtSecret,
  };
}
