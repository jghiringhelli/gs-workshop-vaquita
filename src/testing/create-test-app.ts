import { type Express } from "express";

import { createApp, type AppDependencies } from "../app";
import { loadConfig, type AppConfig } from "../config/env";
import { connectDatabase, type DatabaseConnection } from "../db/database";
import { initializeSchema } from "../db/schema";

type TestAppOptions = Pick<Partial<AppDependencies>, "shuffleParticipants">;

interface TestAppResult {
  app: Express;
  db: DatabaseConnection;
  config: AppConfig;
}

export function createTestApp(options: TestAppOptions = {}): TestAppResult {
  const config = loadConfig({
    NODE_ENV: "test",
    PORT: "0",
    DATABASE_URL: ":memory:",
    JWT_SECRET: "test-secret-123456",
    MAX_PARTICIPANTS: "20",
    LATE_PENALTY_PERCENT: "5",
  });

  const db = connectDatabase(config.databaseUrl);
  initializeSchema(db);

  const app = createApp({
    db,
    config,
    shuffleParticipants: options.shuffleParticipants,
  });

  return {
    app,
    db,
    config,
  };
}
