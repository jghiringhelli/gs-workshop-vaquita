import { Router } from "express";
import type { AppConfig } from "../config/env";
import { HealthRepository } from "../repositories/health-repository";
import { HealthService } from "../services/health-service";

/**
 * Creates and returns the main API router.
 * All repositories and services are instantiated here at runtime.
 * @param config - resolved application configuration
 * @returns configured Express Router
 */
export function createApiRoutes(config: AppConfig): Router {
  const router = Router();

  const healthRepository = new HealthRepository();
  const healthService = new HealthService(healthRepository, config);

  router.get("/health", (_req, res) => {
    res.status(200).json(healthService.getHealth());
  });

  return router;
}
