import { Router } from "express";
import { z } from "zod";

import { validateQuery } from "../../validation/validate";
import { systemService } from "./system.service";

const healthQuerySchema = z.object({}).passthrough();

export const systemRouter = Router();

systemRouter.get("/health", validateQuery(healthQuerySchema), (_request, response) => {
  response.status(200).json(systemService.getHealth());
});