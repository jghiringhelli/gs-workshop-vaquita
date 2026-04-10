import { Router } from "express";
import { z } from "zod";

import { getAuthenticatedUser, requireAuth } from "../auth/auth.middleware";
import { asyncHandler } from "../http/async-handler";
import { TandasRepository } from "../repositories/tandas.repository";
import { TandasService } from "../tandas/tandas.service";
import type { AppContext } from "../types/app-context";

const createTandaSchema = z.object({
  name: z.string().trim().min(1).max(120),
  contributionAmount: z.coerce.number().positive(),
  organizerId: z.coerce.number().int().positive().optional(),
});

const tandaIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const tandaRoundParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  round: z.coerce.number().int().positive(),
});

const tandaParticipantHistoryParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  pid: z.coerce.number().int().positive(),
});

const listTandasQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
});

export function createTandasRouter(context: AppContext): Router {
  const router = Router();
  const tandasService = new TandasService(new TandasRepository(context.db), context.config);

  router.use(requireAuth(context));

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const authUser = getAuthenticatedUser(req);
      const input = createTandaSchema.parse(req.body);
      const tanda = tandasService.createTanda(authUser, input);

      res.status(201).json(tanda);
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const authUser = getAuthenticatedUser(req);
      const query = listTandasQuerySchema.parse(req.query);
      const tandas = tandasService.listTandas(authUser, query.userId);

      res.json(tandas);
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const authUser = getAuthenticatedUser(req);
      const params = tandaIdParamsSchema.parse(req.params);
      const tanda = tandasService.getTanda(authUser, params.id);

      res.json(tanda);
    }),
  );

  router.post(
    "/:id/join",
    asyncHandler(async (req, res) => {
      const authUser = getAuthenticatedUser(req);
      const params = tandaIdParamsSchema.parse(req.params);
      const participant = tandasService.joinTanda(authUser, params.id);

      res.status(201).json(participant);
    }),
  );

  router.post(
    "/:id/start",
    asyncHandler(async (req, res) => {
      const authUser = getAuthenticatedUser(req);
      const params = tandaIdParamsSchema.parse(req.params);
      const tanda = tandasService.startTanda(authUser, params.id);

      res.json(tanda);
    }),
  );

  router.post(
    "/:id/contributions",
    asyncHandler(async (req, res) => {
      const authUser = getAuthenticatedUser(req);
      const params = tandaIdParamsSchema.parse(req.params);
      const contribution = tandasService.recordContribution(authUser, params.id);

      res.status(201).json(contribution);
    }),
  );

  router.get(
    "/:id/rounds/:round",
    asyncHandler(async (req, res) => {
      const authUser = getAuthenticatedUser(req);
      const params = tandaRoundParamsSchema.parse(req.params);
      const summary = tandasService.getRoundSummary(authUser, params.id, params.round);

      res.json(summary);
    }),
  );

  router.post(
    "/:id/cancel",
    asyncHandler(async (req, res) => {
      const authUser = getAuthenticatedUser(req);
      const params = tandaIdParamsSchema.parse(req.params);
      const tanda = tandasService.cancelTanda(authUser, params.id);

      res.json(tanda);
    }),
  );

  router.post(
    "/:id/advance",
    asyncHandler(async (req, res) => {
      const authUser = getAuthenticatedUser(req);
      const params = tandaIdParamsSchema.parse(req.params);
      const tanda = tandasService.advanceRound(authUser, params.id);

      res.json(tanda);
    }),
  );

  router.get(
    "/:id/participants",
    asyncHandler(async (req, res) => {
      const authUser = getAuthenticatedUser(req);
      const params = tandaIdParamsSchema.parse(req.params);
      const participants = tandasService.listParticipants(authUser, params.id);

      res.json(participants);
    }),
  );

  router.get(
    "/:id/participants/:pid/history",
    asyncHandler(async (req, res) => {
      const authUser = getAuthenticatedUser(req);
      const params = tandaParticipantHistoryParamsSchema.parse(req.params);
      const history = tandasService.getParticipantHistory(authUser, params.id, params.pid);

      res.json(history);
    }),
  );

  return router;
}
