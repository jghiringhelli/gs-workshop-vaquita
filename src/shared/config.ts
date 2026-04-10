const DEFAULT_PORT = 3000;
const DEFAULT_DATABASE_FILE_PATH = "vaquita.db";
const DEFAULT_MIN_PARTICIPANTS = 3;
const DEFAULT_MAX_PARTICIPANTS = 20;
const DEFAULT_LATE_PENALTY_PERCENT = 5;
const DEFAULT_CONTRIBUTION_WINDOW_HOURS = 24;

/**
 * Runtime configuration for the application.
 */
export interface AppConfig {
  readonly port: number;
  readonly databaseFilePath: string;
  readonly minParticipantsToStart: number;
  readonly maxParticipantsPerTanda: number;
  readonly latePenaltyPercent: number;
  readonly contributionWindowHours: number;
}

/**
 * Optional configuration overrides used mainly by tests.
 */
export interface ConfigOverrides {
  readonly databaseFilePath?: string;
}

/**
 * Load validated application configuration.
 *
 * @param overrides Runtime overrides for local composition.
 * @returns Validated application configuration.
 */
export function loadAppConfig(overrides: ConfigOverrides = {}): AppConfig {
  return {
    port: readPositiveInteger("PORT", DEFAULT_PORT),
    databaseFilePath: overrides.databaseFilePath ?? process.env["DATABASE_FILE_PATH"] ?? DEFAULT_DATABASE_FILE_PATH,
    minParticipantsToStart: readPositiveInteger("MIN_PARTICIPANTS_TO_START", DEFAULT_MIN_PARTICIPANTS),
    maxParticipantsPerTanda: readPositiveInteger("MAX_PARTICIPANTS_PER_TANDA", DEFAULT_MAX_PARTICIPANTS),
    latePenaltyPercent: readNonNegativeInteger("LATE_PENALTY_PERCENT", DEFAULT_LATE_PENALTY_PERCENT),
    contributionWindowHours: readPositiveInteger("CONTRIBUTION_WINDOW_HOURS", DEFAULT_CONTRIBUTION_WINDOW_HOURS),
  };
}

/**
 * Read a positive integer from the environment.
 *
 * @param variableName Environment variable name.
 * @param fallback Fallback value when env var is unset.
 * @returns Parsed positive integer.
 */
function readPositiveInteger(variableName: string, fallback: number): number {
  return readInteger(variableName, fallback, value => value > 0);
}

/**
 * Read a non-negative integer from the environment.
 *
 * @param variableName Environment variable name.
 * @param fallback Fallback value when env var is unset.
 * @returns Parsed non-negative integer.
 */
function readNonNegativeInteger(variableName: string, fallback: number): number {
  return readInteger(variableName, fallback, value => value >= 0);
}

/**
 * Read and validate an integer from the environment.
 *
 * @param variableName Environment variable name.
 * @param fallback Fallback value when env var is unset.
 * @param predicate Validation predicate.
 * @returns Parsed integer.
 */
function readInteger(
  variableName: string,
  fallback: number,
  predicate: (value: number) => boolean,
): number {
  const rawValue = process.env[variableName];
  if (rawValue === undefined) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isInteger(parsedValue) || !predicate(parsedValue)) {
    throw new Error(`${variableName} must be a valid integer`);
  }

  return parsedValue;
}
