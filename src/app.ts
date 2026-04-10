import express, { type Express } from "express";

import { loadConfig, type AppConfig } from "./config/env";
import { createDatabase } from "./database/connection";
import { initializeDatabase } from "./database/schema";
import { errorHandler } from "./http/error-handler";
import { notFoundHandler } from "./http/not-found-handler";
import { createAuthRouter } from "./routes/auth.routes";
import { createTandasRouter } from "./routes/tandas.routes";
import { createUsersRouter } from "./routes/users.routes";
import type { AppContext } from "./types/app-context";

type DatabaseConnection = import("better-sqlite3").Database;

export interface CreateAppOptions {
  config?: AppConfig;
  db?: DatabaseConnection;
  initializeSchema?: boolean;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const config = options.config ?? loadConfig();
  const db = options.db ?? createDatabase(config.databaseUrl);

  if (options.initializeSchema ?? true) {
    initializeDatabase(db);
  }

  const context: AppContext = {
    config,
    db,
  };

  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.use("/api/users", createUsersRouter(context));
  app.use("/api/auth", createAuthRouter(context));
  app.use("/api/tandas", createTandasRouter(context));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
