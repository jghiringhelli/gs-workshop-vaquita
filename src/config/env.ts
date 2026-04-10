import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_PATH: z.string().min(1).default("./data/vaquita.sqlite"),
  MAX_PARTICIPANTS: z.coerce.number().int().min(3).default(20),
  LATE_PENALTY_PERCENT: z.coerce.number().min(0).default(5),
  JWT_SECRET: z.string().min(1).optional(),
  JWT_EXPIRES_IN: z.string().min(1).default("1h"),
  npm_package_version: z.string().min(1).default("1.0.0"),
});

export interface AppConfig {
  readonly environment: "development" | "test" | "production";
  readonly port: number;
  readonly databasePath: string;
  readonly maxParticipants: number;
  readonly latePenaltyPercent: number;
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly applicationVersion: string;
}

/**
 * Loads and validates runtime configuration from the process environment.
 * @param environment Environment key-value pairs.
 * @returns Normalized application configuration.
 */
export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsedEnvironment = environmentSchema.parse(environment);
  const jwtSecret = resolveJwtSecret(parsedEnvironment.NODE_ENV, parsedEnvironment.JWT_SECRET);

  return Object.freeze({
    environment: parsedEnvironment.NODE_ENV,
    port: parsedEnvironment.PORT,
    databasePath: parsedEnvironment.DATABASE_PATH,
    maxParticipants: parsedEnvironment.MAX_PARTICIPANTS,
    latePenaltyPercent: parsedEnvironment.LATE_PENALTY_PERCENT,
    jwtSecret,
    jwtExpiresIn: parsedEnvironment.JWT_EXPIRES_IN,
    applicationVersion: parsedEnvironment.npm_package_version,
  });
}

function resolveJwtSecret(
  environment: AppConfig["environment"],
  jwtSecret: string | undefined,
): string {
  if (jwtSecret) {
    return jwtSecret;
  }

  if (environment === "production") {
    throw new Error("JWT_SECRET must be configured in production.");
  }

  return "local-development-jwt-secret";
}