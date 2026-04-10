import express, { type Express } from "express";

import { loadConfig, type AppConfig } from "./config/env";
import {
  createDatabaseConnection,
  initializeDatabaseSchema,
  type DatabaseConnection,
} from "./infrastructure/database";
import { errorHandler, notFoundHandler } from "./lib/http-error-handler";
import {
  DefaultTandasService,
  SqliteTandaRepository,
  createTandasRouter,
  type TandasService,
} from "./features/tandas";
import {
  DefaultUsersService,
  SqliteUserRepository,
  createUsersRouter,
  type UsersService,
} from "./features/users";

export interface ApplicationContext {
  readonly config: AppConfig;
  readonly database: DatabaseConnection;
  readonly usersService: UsersService;
  readonly tandasService: TandasService;
}

/**
 * Builds the application dependency graph and initializes infrastructure.
 * @param config Parsed runtime configuration.
 * @returns The application context used by the HTTP adapter and process lifecycle.
 */
export function createApplicationContext(config: AppConfig = loadConfig()): ApplicationContext {
  const database = createDatabaseConnection(config);
  initializeDatabaseSchema(database.client);

  const userRepository = new SqliteUserRepository(database.client);
  const tandaRepository = new SqliteTandaRepository(database.client);

  return {
    config,
    database,
    usersService: new DefaultUsersService(userRepository),
    tandasService: new DefaultTandasService(tandaRepository, userRepository, {
      maxParticipants: config.maxParticipants,
    }),
  };
}

/**
 * Creates the Express application with infrastructure and feature routers wired in.
 * @param context Application dependencies and runtime configuration.
 * @returns Configured Express application instance.
 */
export function createApp(context: ApplicationContext): Express {
  const app = express();

  app.use(express.json());
  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      version: context.config.applicationVersion,
    });
  });

  app.use("/api/users", createUsersRouter(context.usersService));
  app.use("/api/tandas", createTandasRouter(context.tandasService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Releases infrastructure resources owned by the application context.
 * @param context Application context created at startup.
 * @returns Nothing.
 */
export function disposeApplicationContext(context: ApplicationContext): void {
  context.database.close();
}