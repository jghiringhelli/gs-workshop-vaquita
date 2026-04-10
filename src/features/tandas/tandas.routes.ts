import { Router, type RequestHandler, type Router as ExpressRouter } from "express";

import type { TandasService } from "./tandas.service";
import { createTandaBodySchema, listTandasQuerySchema, tandaIdParamsSchema } from "./tandas.schemas";

/**
 * Creates the tanda router.
 * @param tandasService Service dependency for tanda use cases.
 * @returns Express router ready for endpoint implementation.
 */
export function createTandasRouter(tandasService: TandasService): ExpressRouter {
  const router = Router();

  router.post("/", createTandaHandler(tandasService));
  router.get("/", listTandasHandler(tandasService));
  router.get("/:id", getTandaByIdHandler(tandasService));
  router.get("/:id/participants", listParticipantsHandler(tandasService));

  return router;
}

function createTandaHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const input = createTandaBodySchema.parse(request.body);
      const tanda = tandasService.createTanda(input);
      response.status(201).json(tanda);
    } catch (error) {
      next(error);
    }
  };
}

function listTandasHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const query = listTandasQuerySchema.parse(request.query);
      const tandas = tandasService.listTandasForUser(query.userId);
      response.status(200).json(tandas);
    } catch (error) {
      next(error);
    }
  };
}

function getTandaByIdHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const params = tandaIdParamsSchema.parse(request.params);
      const tanda = tandasService.getTandaById(params.id);
      response.status(200).json(tanda);
    } catch (error) {
      next(error);
    }
  };
}

function listParticipantsHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const params = tandaIdParamsSchema.parse(request.params);
      const participants = tandasService.listParticipants(params.id);
      response.status(200).json(participants);
    } catch (error) {
      next(error);
    }
  };
}