import { Router } from "express";

import { getConfig } from "../config/env";
import { HealthRepository } from "../repositories/health-repository";
import { HealthService } from "../services/health-service";

const router = Router();

const config = getConfig();
const healthRepository = new HealthRepository();
const healthService = new HealthService(healthRepository, config);

router.get("/health", (_req, res) => {
  const payload = healthService.getHealth();
  res.status(200).json(payload);
});

export { router as apiRoutes };
