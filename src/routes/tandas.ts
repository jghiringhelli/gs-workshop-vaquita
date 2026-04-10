import { Router } from "express";
import { z } from "zod";
import { createAuthMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../middleware/validation";
import { TandaService } from "../services/tanda.service";
import { EnvironmentConfig } from "../config/env";

const CreateTandaSchema = z.object({
  name: z.string().min(1).max(120),
  organizerId: z.coerce.number().int().positive(),
  contributionAmount: z.coerce.number().int().positive(),
});

const JoinTandaSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const ListTandasQuerySchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const TandaParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const TandaRoundParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  round: z.coerce.number().int().positive(),
});

const ParticipantHistoryParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  pid: z.coerce.number().int().positive(),
});

const ContributionBodySchema = z.object({
  idempotencyKey: z.string().min(1).max(120).optional(),
});

/**
 * Creates tanda routes.
 * @param tandaService Tanda service.
 * @param config Environment configuration.
 * @returns Router with tanda endpoints.
 */
export function createTandaRouter(tandaService: TandaService, config: EnvironmentConfig): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config);

  router.post("/", validateBody(CreateTandaSchema), (request, response) => {
    const tanda = tandaService.createTanda(request.body);
    response.status(201).json(tanda);
  });

  router.get("/", validateQuery(ListTandasQuerySchema), (request, response) => {
    const list = tandaService.listByUser(Number(request.query.userId));
    response.status(200).json(list);
  });

  router.get("/:id", validateParams(TandaParamsSchema), (request, response) => {
    response.status(200).json(tandaService.getById(Number(request.params.id)));
  });

  router.post("/:id/join", validateParams(TandaParamsSchema), validateBody(JoinTandaSchema), (request, response) => {
    const participant = tandaService.join(Number(request.params.id), Number(request.body.userId));
    response.status(201).json(participant);
  });

  router.post("/:id/start", validateParams(TandaParamsSchema), authMiddleware, (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const tanda = tandaService.start(Number(request.params.id), authRequest.authenticatedUserId as number);
    response.status(200).json(tanda);
  });

  router.post("/:id/cancel", validateParams(TandaParamsSchema), authMiddleware, (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const tanda = tandaService.cancel(Number(request.params.id), authRequest.authenticatedUserId as number);
    response.status(200).json(tanda);
  });

  router.get("/:id/participants", validateParams(TandaParamsSchema), (request, response) => {
    response.status(200).json(tandaService.listParticipants(Number(request.params.id)));
  });

  router.post(
    "/:id/contributions",
    validateParams(TandaParamsSchema),
    validateBody(ContributionBodySchema),
    authMiddleware,
    (request, response) => {
      const authRequest = request as AuthenticatedRequest;
      const contribution = tandaService.recordContribution({
        tandaId: Number(request.params.id),
        userId: authRequest.authenticatedUserId as number,
        idempotencyKey: request.body.idempotencyKey,
      });
      response.status(201).json(contribution);
    },
  );

  router.get("/:id/rounds/:round", validateParams(TandaRoundParamsSchema), (request, response) => {
    const summary = tandaService.getRoundSummary(Number(request.params.id), Number(request.params.round));
    response.status(200).json(summary);
  });

  router.post("/:id/advance", validateParams(TandaParamsSchema), authMiddleware, (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const tanda = tandaService.advance(Number(request.params.id), authRequest.authenticatedUserId as number);
    response.status(200).json(tanda);
  });

  router.get(
    "/:id/participants/:pid/history",
    validateParams(ParticipantHistoryParamsSchema),
    (request, response) => {
      const history = tandaService.getParticipantHistory(
        Number(request.params.id),
        Number(request.params.pid),
      );
      response.status(200).json(history);
    },
  );

  return router;
}
