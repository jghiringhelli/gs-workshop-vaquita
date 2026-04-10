export interface AppConfig {
  port: number;
  databasePath: string;
  jwtSecret: string;
  maxParticipants: number;
  latePenaltyRate: number;
}

const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseRate = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const resolveDatabasePath = (databaseUrl: string): string => {
  if (databaseUrl === ":memory:") {
    return databaseUrl;
  }

  return databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl;
};

export const getConfig = (overrides: Partial<AppConfig> = {}): AppConfig => {
  const defaultDatabaseUrl = process.env.NODE_ENV === "test" ? ":memory:" : "file:./dev.db";

  return {
    port: overrides.port ?? parseInteger(process.env.PORT, 3000),
    databasePath: overrides.databasePath ?? resolveDatabasePath(process.env.DATABASE_URL ?? defaultDatabaseUrl),
    jwtSecret: overrides.jwtSecret ?? process.env.JWT_SECRET ?? "change-me-to-a-long-random-string",
    maxParticipants: overrides.maxParticipants ?? parseInteger(process.env.MAX_PARTICIPANTS, 20),
    latePenaltyRate: overrides.latePenaltyRate ?? parseRate(process.env.LATE_PENALTY_RATE, 0.05),
  };
};
