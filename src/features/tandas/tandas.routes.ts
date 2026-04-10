import { Router, type RequestHandler, type Router as ExpressRouter } from "express";

import { getAuthenticatedUser } from "../auth";
import type { TandasService } from "./tandas.service";
import {
  createTandaBodySchema,
  joinTandaBodySchema,
  listTandasQuerySchema,
  organizerActionBodySchema,
  participantHistoryParamsSchema,
  roundSummaryParamsSchema,
  recordContributionBodySchema,
  tandaIdParamsSchema,
} from "./tandas.schemas";

/**
 * Creates the tanda router.
 * @param tandasService Service dependency for tanda use cases.
 * @returns Express router ready for endpoint implementation.
 */
export function createTandasRouter(
  tandasService: TandasService,
  requireAuthenticatedUser: RequestHandler,
): ExpressRouter {
  const router = Router();

  router.post("/", requireAuthenticatedUser, createTandaHandler(tandasService));
  router.get("/", requireAuthenticatedUser, listTandasHandler(tandasService));
  router.get("/:id", getTandaByIdHandler(tandasService));
  router.post("/:id/join", requireAuthenticatedUser, joinTandaHandler(tandasService));
  router.post("/:id/start", requireAuthenticatedUser, startTandaHandler(tandasService));
  router.post("/:id/advance", requireAuthenticatedUser, advanceTandaHandler(tandasService));
  router.post("/:id/cancel", requireAuthenticatedUser, cancelTandaHandler(tandasService));
  router.post("/:id/contributions", requireAuthenticatedUser, recordContributionHandler(tandasService));
  router.get("/:id/rounds/:round", getRoundSummaryHandler(tandasService));
  router.get("/:id/participants", listParticipantsHandler(tandasService));
  router.get("/:id/participants/:pid/history", getParticipantHistoryHandler(tandasService));

  return router;
}

function createTandaHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const authenticatedUser = getAuthenticatedUser(request);
      const input = createTandaBodySchema.parse(request.body);
      const tanda = tandasService.createTanda({
        ...input,
        organizerId: authenticatedUser.id,
      });
      response.status(201).json(tanda);
    } catch (error) {
      next(error);
    }
  };
}

function listTandasHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const authenticatedUser = getAuthenticatedUser(request);
      listTandasQuerySchema.parse(request.query);
      const tandas = tandasService.listTandasForUser(authenticatedUser.id);
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
      const authenticatedUser = getAuthenticatedUser(request);
      const params = tandaIdParamsSchema.parse(request.params);
      joinTandaBodySchema.parse(request.body);
      const participant = tandasService.joinTanda({
        tandaId: params.id,
        userId: authenticatedUser.id,
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
      const authenticatedUser = getAuthenticatedUser(request);
      const params = tandaIdParamsSchema.parse(request.params);
      organizerActionBodySchema.parse(request.body);
      const tanda = tandasService.startTanda({
        tandaId: params.id,
        organizerId: authenticatedUser.id,
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
      const authenticatedUser = getAuthenticatedUser(request);
      const params = tandaIdParamsSchema.parse(request.params);
      organizerActionBodySchema.parse(request.body);
      const tanda = tandasService.advanceTanda({
        tandaId: params.id,
        organizerId: authenticatedUser.id,
      });
      response.status(200).json(tanda);
    } catch (error) {
      next(error);
    }
  };
}

function cancelTandaHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const authenticatedUser = getAuthenticatedUser(request);
      const params = tandaIdParamsSchema.parse(request.params);
      organizerActionBodySchema.parse(request.body);
      const tanda = tandasService.cancelTanda({
        tandaId: params.id,
        organizerId: authenticatedUser.id,
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
      const authenticatedUser = getAuthenticatedUser(request);
      const params = tandaIdParamsSchema.parse(request.params);
      const body = recordContributionBodySchema.parse(request.body);
      const contribution = tandasService.recordContribution({
        tandaId: params.id,
        userId: authenticatedUser.id,
        amount: body.amount,
        round: body.round,
      });
      response.status(201).json(contribution);
    } catch (error) {
      next(error);
    }
  };
}

function getRoundSummaryHandler(tandasService: TandasService): RequestHandler {
  return (request, response, next): void => {
    try {
      const params = roundSummaryParamsSchema.parse(request.params);
      const summary = tandasService.getRoundSummary(params.id, params.round);
      response.status(200).json(summary);
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