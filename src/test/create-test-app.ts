import { createApp } from "../app";
import type { AppConfig } from "../config/env";
import { createDatabase } from "../database/connection";

type DatabaseConnection = import("better-sqlite3").Database;

export interface TestApp {
  app: ReturnType<typeof createApp>;
  db: DatabaseConnection;
}

export function createTestApp(configOverrides: Partial<AppConfig> = {}): TestApp {
  const db = createDatabase(":memory:");
  const config: AppConfig = {
    nodeEnv: "test",
    port: 0,
    databaseUrl: ":memory:",
    jwtSecret: "test-secret",
    auth: {
      jwtExpiresInHours: 12,
    },
    limits: {
      maxParticipants: 20,
      contributionWindowDays: 7,
    },
    penalties: {
      lateContributionPercent: 5,
    },
    ...configOverrides,
  };

  return {
    app: createApp({ config, db, initializeSchema: true }),
    db,
  };
}
