import express, { type Express } from "express";

import { type AppConfig } from "./config/env";
import { type DatabaseConnection } from "./db/database";
import { errorHandler, notFoundHandler } from "./http/error-handler";
import { TandaRepository } from "./repositories/tanda.repository";
import { UserRepository } from "./repositories/user.repository";
import { createTandaRouter } from "./tandas/tanda.routes";
import { TandaService, type ShuffleParticipants } from "./tandas/tanda.service";
import { createUserRouter } from "./users/user.routes";
import { UserService } from "./users/user.service";

export interface AppDependencies {
  db: DatabaseConnection;
  config: AppConfig;
  shuffleParticipants?: ShuffleParticipants;
}

export function createApp({ db, config, shuffleParticipants }: AppDependencies): Express {
  const app = express();
  const userRepository = new UserRepository(db);
  const userService = new UserService(userRepository);
  const tandaRepository = new TandaRepository(db);
  const tandaService = new TandaService({
    tandaRepository,
    maxParticipants: config.maxParticipants,
    latePenaltyPercent: config.latePenaltyPercent,
    shuffleParticipants,
  });

  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", environment: config.nodeEnv });
  });

  app.use("/api/users", createUserRouter({ userService }));
  app.use("/api/tandas", createTandaRouter({ tandaService }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
