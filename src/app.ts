import type Database from "better-sqlite3";
import express from "express";
import { AppConfig, getConfig } from "./config";
import { createDatabase } from "./database/database";
import { isAppError } from "./errors";
import { TandaRepository } from "./repositories/tandaRepository";
import { UserRepository } from "./repositories/userRepository";
import { createTandaRouter } from "./routes/tandas";
import { createUserRouter } from "./routes/users";
import { TandaService } from "./services/tandaService";
import { UserService } from "./services/userService";

export interface AppOptions {
  config?: Partial<AppConfig>;
  random?: () => number;
}

export interface AppInstance {
  app: express.Express;
  db: Database.Database;
  config: AppConfig;
}

export const createApp = (options: AppOptions = {}): AppInstance => {
  const config = getConfig(options.config);
  const db = createDatabase(config.databasePath);

  const userRepository = new UserRepository(db);
  const tandaRepository = new TandaRepository(db);
  const userService = new UserService(userRepository);
  const tandaService = new TandaService(userRepository, tandaRepository, config, options.random);

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/users", createUserRouter(userService));
  app.use("/api/tandas", createTandaRouter(tandaService));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (isAppError(error)) {
      return res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    console.error(error);
    return res.status(500).json({
      error: {
        code: "internal_error",
        message: "An unexpected error occurred.",
      },
    });
  });

  return { app, db, config };
};
