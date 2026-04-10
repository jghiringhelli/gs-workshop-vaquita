import { Router } from "express";

import { parseWithSchema } from "../../../shared/http/validation";
import type { TandaService } from "../application/TandaService";
import {
  contributionBodySchema,
  createTandaBodySchema,
  getRequesterUserId,
  joinTandaBodySchema,
  listTandasQuerySchema,
  participantHistoryParamSchema,
  requesterBodySchema,
  roundSummaryParamSchema,
  tandaIdParamSchema,
} from "./tandaSchemas";

/**
 * Create the router responsible for tanda endpoints.
 *
 * @param tandaService The tanda service dependency.
 * @returns The configured Express router.
 */
export function createTandaRouter(tandaService: TandaService): Router {
  const router = Router();

  router.post("/", (request, response): void => {
    const body = parseWithSchema(createTandaBodySchema, request.body);
    const tanda = tandaService.createTanda(body);
    response.status(201).json(tanda);
  });

  router.get("/", (request, response): void => {
    const query = parseWithSchema(listTandasQuerySchema, request.query);
    response.json(tandaService.listTandasForUser(query.userId));
  });

  router.get("/:id", (request, response): void => {
    const params = parseWithSchema(tandaIdParamSchema, request.params);
    response.json(tandaService.getTandaById(params.id));
  });

  router.post("/:id/join", (request, response): void => {
    const params = parseWithSchema(tandaIdParamSchema, request.params);
    const body = parseWithSchema(joinTandaBodySchema, request.body);
    const participant = tandaService.joinTanda({
      tandaId: params.id,
      userId: body.userId,
    });

    response.status(201).json(participant);
  });

  router.post("/:id/start", (request, response): void => {
    const params = parseWithSchema(tandaIdParamSchema, request.params);
    const body = parseWithSchema(requesterBodySchema, request.body);
    response.json(
      tandaService.startTanda({
        tandaId: params.id,
        requesterUserId: getRequesterUserId(body),
      }),
    );
  });

  router.post("/:id/cancel", (request, response): void => {
    const params = parseWithSchema(tandaIdParamSchema, request.params);
    const body = parseWithSchema(requesterBodySchema, request.body);
    response.json(
      tandaService.cancelTanda({
        tandaId: params.id,
        requesterUserId: getRequesterUserId(body),
      }),
    );
  });

  router.get("/:id/participants", (request, response): void => {
    const params = parseWithSchema(tandaIdParamSchema, request.params);
    response.json(tandaService.listParticipants(params.id));
  });

  router.get("/:id/next-recipient", (request, response): void => {
    const params = parseWithSchema(tandaIdParamSchema, request.params);
    response.json(tandaService.getNextRecipient(params.id));
  });

  router.post("/:id/contributions", (request, response): void => {
    const params = parseWithSchema(tandaIdParamSchema, request.params);
    const body = parseWithSchema(contributionBodySchema, request.body);
    response.status(201).json(
      tandaService.recordContribution({
        tandaId: params.id,
        participantId: body.participantId,
        amount: body.amount,
      }),
    );
  });

  router.get("/:id/rounds/:round", (request, response): void => {
    const params = parseWithSchema(roundSummaryParamSchema, request.params);
    response.json(tandaService.getRoundSummary(params.id, params.round));
  });

  router.post("/:id/advance", (request, response): void => {
    const params = parseWithSchema(tandaIdParamSchema, request.params);
    const body = parseWithSchema(requesterBodySchema, request.body);
    response.json(
      tandaService.advanceRound({
        tandaId: params.id,
        requesterUserId: getRequesterUserId(body),
      }),
    );
  });

  router.get("/:id/participants/:pid/history", (request, response): void => {
    const params = parseWithSchema(participantHistoryParamSchema, request.params);
    response.json(tandaService.getParticipantHistory(params.id, params.pid));
  });

  return router;
}
