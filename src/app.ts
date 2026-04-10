import express, { type Express, Router } from "express"
import { loadConfig, type AppConfig } from "./config/env"
import { initializeDatabase } from "./infrastructure/database"
import { createTandasRouter, SqliteTandaRepository, TandaService } from "./modules/tandas"
import { createUsersRouter, SqliteUserRepository, UserService } from "./modules/users"
import {
  createAuthenticationContextMiddleware,
  createNotFoundHandler,
  createRateLimitMiddleware,
  createRequestIdMiddleware,
  createSecurityHeadersMiddleware,
  errorHandler,
  sendData,
} from "./shared/http/http"

/**
 * Create the fully wired Express application.
 *
 * @param providedConfig - Optional externally provided configuration.
 * @returns Configured Express application.
 */
export function createApp(providedConfig?: AppConfig): Express {
  const config = providedConfig ?? loadConfig()
  const database = initializeDatabase(config)
  const userRepository = new SqliteUserRepository(database)
  const tandaRepository = new SqliteTandaRepository(database)
  const userService = new UserService(userRepository, config)
  const tandaService = new TandaService(tandaRepository, userRepository, config)
  const apiRouter = Router()
  const app = express()

  app.use(express.json())
  app.use(createRequestIdMiddleware(config))
  app.use(createSecurityHeadersMiddleware())
  app.use(createRateLimitMiddleware(config))
  app.use(createAuthenticationContextMiddleware(config))

  app.get("/health", (_request, response) => {
    sendData(response, 200, {
      status: "ok",
      version: config.appVersion,
      uptimeSeconds: Math.floor(process.uptime()),
    })
  })

  apiRouter.use("/users", createUsersRouter(userService))
  apiRouter.use("/tandas", createTandasRouter(tandaService))

  app.use("/api", apiRouter)
  app.use("/api/v1", apiRouter)

  app.use(createNotFoundHandler())
  app.use(errorHandler)

  return app
}
