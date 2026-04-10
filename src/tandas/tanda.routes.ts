import { Router } from "express";

import {
  createTandaSchema,
  joinTandaSchema,
  listTandasQuerySchema,
  organizerActionSchema,
  participantHistoryParamsSchema,
  recordContributionSchema,
  roundParamsSchema,
  tandaIdParamsSchema,
} from "./tanda.schemas";
import { TandaService } from "./tanda.service";

interface TandaRouterDependencies {
  tandaService: TandaService;
}

export function createTandaRouter({ tandaService }: TandaRouterDependencies): Router {
  const router = Router();

  router.post("/", (request, response) => {
    const input = createTandaSchema.parse(request.body);
    const tanda = tandaService.createTanda(input);

    response.status(201).json(tanda);
  });

  router.get("/", (request, response) => {
    const query = listTandasQuerySchema.parse(request.query);
    const tandas = tandaService.listTandas(query.userId);

    response.json(tandas);
  });

  router.get("/:id", (request, response) => {
    const { id } = tandaIdParamsSchema.parse(request.params);
    const tanda = tandaService.getTandaById(id);

    response.json(tanda);
  });

  router.get("/:id/participants", (request, response) => {
    const { id } = tandaIdParamsSchema.parse(request.params);
    const participants = tandaService.listParticipants(id);

    response.json(participants);
  });

  router.post("/:id/join", (request, response) => {
    const { id } = tandaIdParamsSchema.parse(request.params);
    const { userId } = joinTandaSchema.parse(request.body);
    const participant = tandaService.joinTanda(id, userId);

    response.status(201).json(participant);
  });

  router.post("/:id/start", (request, response) => {
    const { id } = tandaIdParamsSchema.parse(request.params);
    const { actorUserId } = organizerActionSchema.parse(request.body);
    const tanda = tandaService.startTanda(id, actorUserId);

    response.json(tanda);
  });

  router.post("/:id/cancel", (request, response) => {
    const { id } = tandaIdParamsSchema.parse(request.params);
    const { actorUserId } = organizerActionSchema.parse(request.body);
    const tanda = tandaService.cancelTanda(id, actorUserId);

    response.json(tanda);
  });

  router.post("/:id/contributions", (request, response) => {
    const { id } = tandaIdParamsSchema.parse(request.params);
    const input = recordContributionSchema.parse(request.body);
    const contribution = tandaService.recordContribution(id, input);

    response.status(201).json(contribution);
  });

  router.get("/:id/rounds/:round", (request, response) => {
    const { id, round } = roundParamsSchema.parse(request.params);
    const summary = tandaService.getRoundSummary(id, round);

    response.json(summary);
  });

  router.post("/:id/advance", (request, response) => {
    const { id } = tandaIdParamsSchema.parse(request.params);
    const { actorUserId } = organizerActionSchema.parse(request.body);
    const tanda = tandaService.advanceRound(id, actorUserId);

    response.json(tanda);
  });

  router.get("/:id/participants/:pid/history", (request, response) => {
    const { id, pid } = participantHistoryParamsSchema.parse(request.params);
    const history = tandaService.getParticipantHistory(id, pid);

    response.json(history);
  });

  return router;
}
