import express, { Router, type Express } from "express";

import { loadAppConfig, type AppConfig } from "./config/appConfig";
import { createTandaRouter, SqliteTandaRepository, TandaService } from "./features/tandas";
import { createUserRouter, SqliteUserRepository, UserService } from "./features/users";
import { DatabaseConnection } from "./infrastructure/database/DatabaseConnection";
import { errorHandler, notFoundHandler } from "./shared/http/errorHandler";
import { securityHeadersMiddleware } from "./shared/http/securityHeaders";

export interface ApplicationContext {
  readonly app: Express;
  readonly close: () => void;
}

export interface ApplicationOptions {
  readonly config?: AppConfig;
  readonly databasePath?: string;
  readonly now?: () => Date;
  readonly random?: () => number;
}

/**
 * Build the Express application and its concrete runtime dependencies.
 *
 * @param options Optional runtime overrides used by tests and local bootstrapping.
 * @returns The configured application plus a cleanup function.
 */
export function createApplication(options: ApplicationOptions = {}): ApplicationContext {
  const loadedConfig = options.config ?? loadAppConfig();
  const config: AppConfig = {
    ...loadedConfig,
    databasePath: options.databasePath ?? loadedConfig.databasePath,
  };

  const databaseConnection = new DatabaseConnection(config.databasePath);
  const userRepository = new SqliteUserRepository(databaseConnection.database);
  const tandaRepository = new SqliteTandaRepository(databaseConnection.database);
  const userService = new UserService({ userRepository });
  const tandaService = new TandaService({
    tandaRepository,
    userRepository,
    config,
    now: options.now,
    random: options.random,
  });

  const application = express();
  application.use(express.json());
  application.use(securityHeadersMiddleware);

  const apiRouter = Router();
  apiRouter.use("/users", createUserRouter(userService));
  apiRouter.use("/tandas", createTandaRouter(tandaService));

  application.get("/health", (_request, response): void => {
    response.json({
      status: "ok",
      version: process.env["npm_package_version"] ?? "1.0.0",
      environment: config.environment,
    });
  });

  application.use("/api", apiRouter);
  application.use("/api/v1", apiRouter);
  application.use(notFoundHandler);
  application.use(errorHandler);

  return {
    app: application,
    close: (): void => {
      databaseConnection.close();
    },
  };
}
