import express, { type NextFunction, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import { runMigrations } from "./database/schema.js";
import { AppError } from "./errors/index.js";
import { SqliteUserRepository } from "./users/user.repository.sqlite.js";
import { UserService } from "./users/user.service.js";
import { createUserRouter } from "./users/user.routes.js";
import { SqliteTandaRepository } from "./tandas/tanda.repository.sqlite.js";
import { SqliteParticipantRepository } from "./participants/participant.repository.sqlite.js";
import { TandaService } from "./tandas/tanda.service.js";
import { createTandaRouter } from "./tandas/tanda.routes.js";
import { SqliteContributionRepository } from "./contributions/contribution.repository.sqlite.js";
import { ContributionService } from "./contributions/contribution.service.js";
import { createContributionRouter } from "./contributions/contribution.routes.js";

/**
 * Builds and returns the configured Express application.
 * Accepts a database instance to allow test isolation.
 * @param db - The SQLite database connection.
 * @returns Configured Express Application.
 */
export function createApp(db: Database.Database): express.Application {
  runMigrations(db);

  // Repositories
  const userRepository = new SqliteUserRepository(db);
  const tandaRepository = new SqliteTandaRepository(db);
  const participantRepository = new SqliteParticipantRepository(db);
  const contributionRepository = new SqliteContributionRepository(db);

  // Services
  const userService = new UserService(userRepository);
  const tandaService = new TandaService(tandaRepository, participantRepository, userRepository, contributionRepository);
  const contributionService = new ContributionService(
    contributionRepository,
    tandaRepository,
    participantRepository
  );

  const app = express();
  app.use(express.json());

  // Routes
  app.use("/api/users", createUserRouter(userService));
  app.use("/api/tandas", createTandaRouter(tandaService));
  app.use("/api/tandas", createContributionRouter(contributionService));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "1.0.0" });
  });

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  });

  return app;
}
