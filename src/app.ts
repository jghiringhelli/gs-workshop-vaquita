import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { createUserRouter } from "./features/users/userRoutes";
import { SqliteUserRepository } from "./features/users/sqliteUserRepository";
import { UserService } from "./features/users/userService";
import { loadAppConfig, type ConfigOverrides } from "./shared/config";
import { createDatabase } from "./shared/database";
import { AppError } from "./shared/errors";

/**
 * Create the Express application.
 *
 * @param overrides Runtime configuration overrides.
 * @returns Configured Express application.
 */
export function createApp(overrides: ConfigOverrides = {}): Express {
  const config = loadAppConfig(overrides);
  const database = createDatabase(config.databaseFilePath);
  const userRepository = new SqliteUserRepository(database);
  const userService = new UserService(userRepository);

  const app = express();
  app.use(express.json());
  app.use(createUserRouter(userService));
  app.use(handleErrors);
  return app;
}

/**
 * Express error middleware.
 *
 * @param error Thrown error.
 * @param _request Current request.
 * @param response Current response.
 * @param _next Express continuation.
 * @returns No return value.
 */
function handleErrors(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    response.status(422).json({
      error: {
        code: "validation_error",
        message: "Request validation failed",
        details: error.issues.map(issue => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  response.status(500).json({
    error: {
      code: "internal_error",
      message: "An unexpected error occurred",
    },
  });
}
