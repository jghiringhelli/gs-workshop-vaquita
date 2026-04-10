import { Router } from "express";
import { z } from "zod";

import { validateBody, validateParams, validateQuery } from "../../validation/validate";
import { tandasService } from "./tandas.service";

const createTandaBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  organizerId: z.coerce.number().int().positive(),
  contributionAmount: z.coerce.number().int().positive(),
});

const joinTandaBodySchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const recordContributionBodySchema = z.object({
  participantId: z.coerce.number().int().positive(),
  paidAt: z.string().datetime().optional(),
});

const organizerActionBodySchema = z.object({
  organizerId: z.coerce.number().int().positive(),
});

const listTandasQuerySchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const tandaIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const roundParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  round: z.coerce.number().int().positive(),
});

const participantHistoryParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  pid: z.coerce.number().int().positive(),
});

export const tandasRouter = Router();

tandasRouter.post("/tandas", validateBody(createTandaBodySchema), (request, response) => {
  const tanda = tandasService.createTanda(request.body as z.infer<typeof createTandaBodySchema>);
  response.status(201).json(tanda);
});

tandasRouter.get("/tandas", validateQuery(listTandasQuerySchema), (request, response) => {
  response.status(200).json(tandasService.listTandasForUser(Number(request.query.userId)));
});

tandasRouter.get("/tandas/:id", validateParams(tandaIdParamsSchema), (request, response) => {
  response.status(200).json(tandasService.getTandaById(Number(request.params.id)));
});

tandasRouter.post(
  "/tandas/:id/join",
  validateParams(tandaIdParamsSchema),
  validateBody(joinTandaBodySchema),
  (request, response) => {
    response.status(201).json(tandasService.joinTanda(Number(request.params.id), Number(request.body.userId)));
  },
);

tandasRouter.get("/tandas/:id/participants", validateParams(tandaIdParamsSchema), (request, response) => {
  response.status(200).json(tandasService.listParticipants(Number(request.params.id)));
});

tandasRouter.post(
  "/tandas/:id/start",
  validateParams(tandaIdParamsSchema),
  validateBody(organizerActionBodySchema),
  (request, response) => {
    response.status(200).json(tandasService.startTanda(Number(request.params.id), Number(request.body.organizerId)));
  },
);

tandasRouter.post(
  "/tandas/:id/cancel",
  validateParams(tandaIdParamsSchema),
  validateBody(organizerActionBodySchema),
  (request, response) => {
    response.status(200).json(tandasService.cancelTanda(Number(request.params.id), Number(request.body.organizerId)));
  },
);

tandasRouter.post(
  "/tandas/:id/advance",
  validateParams(tandaIdParamsSchema),
  validateBody(organizerActionBodySchema),
  (request, response) => {
    response.status(200).json(tandasService.advanceTanda(Number(request.params.id), Number(request.body.organizerId)));
  },
);

tandasRouter.post(
  "/tandas/:id/contributions",
  validateParams(tandaIdParamsSchema),
  validateBody(recordContributionBodySchema),
  (request, response) => {
    response.status(201).json(
      tandasService.recordContribution(
        Number(request.params.id),
        Number(request.body.participantId),
        request.body.paidAt as string | undefined,
      ),
    );
  },
);

tandasRouter.get("/tandas/:id/rounds/:round", validateParams(roundParamsSchema), (request, response) => {
  response.status(200).json(
    tandasService.getRoundSummary(Number(request.params.id), Number(request.params.round)),
  );
});

tandasRouter.get(
  "/tandas/:id/participants/:pid/history",
  validateParams(participantHistoryParamsSchema),
  (request, response) => {
    response.status(200).json(
      tandasService.getParticipantHistory(Number(request.params.id), Number(request.params.pid)),
    );
  },
);