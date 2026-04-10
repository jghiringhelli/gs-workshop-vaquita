import express from "express";
import { createDatabaseConnection } from "./config/database";
import { getEnvironmentConfig } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { SqliteContributionRepository } from "./repositories/contribution.repository";
import { SqliteParticipantRepository } from "./repositories/participant.repository";
import { SqliteTandaRepository } from "./repositories/tanda.repository";
import { SqliteUserRepository } from "./repositories/user.repository";
import { createTandaRouter } from "./routes/tandas";
import { createUserRouter } from "./routes/users";
import { TandaService } from "./services/tanda.service";
import { UserService } from "./services/user.service";

/**
 * Builds the Express application and wires all dependencies.
 * @returns Configured express app.
 */
export function createApp(): express.Express {
  const config = getEnvironmentConfig();
  const database = createDatabaseConnection(config);

  const userRepository = new SqliteUserRepository(database);
  const tandaRepository = new SqliteTandaRepository(database);
  const participantRepository = new SqliteParticipantRepository(database);
  const contributionRepository = new SqliteContributionRepository(database);

  const userService = new UserService(userRepository);
  const tandaService = new TandaService(
    userRepository,
    tandaRepository,
    participantRepository,
    contributionRepository,
    config,
  );

  const app = express();
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      version: process.env.npm_package_version ?? "1.0.0",
    });
  });

  app.use("/api/users", createUserRouter(userService));
  app.use("/api/tandas", createTandaRouter(tandaService, config));
  app.use(errorHandler);

  return app;
}
