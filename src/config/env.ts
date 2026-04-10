import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optionalEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Environment variable ${key} must be an integer`);
  return parsed;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: optionalEnvInt("PORT", 3000),
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
  maxParticipants: optionalEnvInt("MAX_PARTICIPANTS", 20),
  latePenaltyPercent: optionalEnvInt("LATE_PENALTY_PERCENT", 5),
} as const;
