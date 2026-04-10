import { Router, type RequestHandler, type Router as ExpressRouter } from "express";

import type { TandasService } from "./tandas.service";
import {
  createTandaBodySchema,
  joinTandaBodySchema,
  listTandasQuerySchema,
  organizerActionBodySchema,
  participantHistoryParamsSchema,
  recordContributionBodySchema,
  tandaIdParamsSchema,
} from "./tandas.schemas";

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
  router.post("/:id/join", joinTandaHandler(tandasService));
  router.post("/:id/start", startTandaHandler(tandasService));
  router.post("/:id/advance", advanceTandaHandler(tandasService));
  router.post("/:id/contributions", recordContributionHandler(tandasService));
  router.get("/:id/participants", listParticipantsHandler(tandasService));
  router.get("/:id/participants/:pid/history", getParticipantHistoryHandler(tandasService));

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

function joinTandaHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const params = tandaIdParamsSchema.parse(request.params);
      const body = joinTandaBodySchema.parse(request.body);
      const participant = tandasService.joinTanda({
        tandaId: params.id,
        userId: body.userId,
      });
      response.status(201).json(participant);
    } catch (error) {
      next(error);
    }
  };
}

function startTandaHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const params = tandaIdParamsSchema.parse(request.params);
      const body = organizerActionBodySchema.parse(request.body);
      const tanda = tandasService.startTanda({
        tandaId: params.id,
        organizerId: body.organizerId,
      });
      response.status(200).json(tanda);
    } catch (error) {
      next(error);
    }
  };
}

function advanceTandaHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const params = tandaIdParamsSchema.parse(request.params);
      const body = organizerActionBodySchema.parse(request.body);
      const tanda = tandasService.advanceTanda({
        tandaId: params.id,
        organizerId: body.organizerId,
      });
      response.status(200).json(tanda);
    } catch (error) {
      next(error);
    }
  };
}

function recordContributionHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const params = tandaIdParamsSchema.parse(request.params);
      const body = recordContributionBodySchema.parse(request.body);
      const contribution = tandasService.recordContribution({
        tandaId: params.id,
        participantId: body.participantId,
        amount: body.amount,
      });
      response.status(201).json(contribution);
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

function getParticipantHistoryHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const params = participantHistoryParamsSchema.parse(request.params);
      const history = tandasService.getParticipantHistory(params.id, params.pid);
      response.status(200).json(history);
    } catch (error) {
      next(error);
    }
  };
}