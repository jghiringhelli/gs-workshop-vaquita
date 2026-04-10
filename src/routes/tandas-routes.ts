import { Router } from "express";
import { z } from "zod";
import { ValidationError } from "../errors/app-error";
import { tandaService } from "../services/tanda-service";

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const userIdQuerySchema = z.object({ userId: z.coerce.number().int().positive() });
const joinBodySchema = z.object({ userId: z.number().int().positive() });
const organizerBodySchema = z.object({ organizerId: z.number().int().positive() });
const createTandaBodySchema = z.object({
  name: z.string().trim().min(1),
  organizerId: z.number().int().positive(),
  contributionAmount: z.number().positive(),
});
const createContributionBodySchema = z.object({
  participantId: z.number().int().positive(),
  amount: z.number().positive(),
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

tandasRouter.post("/", (req, res) => {
  const parsed = createTandaBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError("Invalid tanda payload", parsed.error.flatten());
  }

  const tanda = tandaService.create(parsed.data);
  res.status(201).json(tanda);
});

tandasRouter.get("/", (req, res) => {
  const parsed = userIdQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ValidationError("userId query param is required", parsed.error.flatten());
  }

  const tandas = tandaService.listForUser(parsed.data.userId);
  res.json(tandas);
});

tandasRouter.get("/:id", (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError("Invalid tanda id", parsed.error.flatten());
  }

  const details = tandaService.getById(parsed.data.id);
  res.json(details);
});

tandasRouter.post("/:id/join", (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  const body = joinBodySchema.safeParse(req.body);
  if (!params.success || !body.success) {
    throw new ValidationError("Invalid join request", {
      params: params.success ? null : params.error.flatten(),
      body: body.success ? null : body.error.flatten(),
    });
  }

  const participant = tandaService.join(params.data.id, body.data.userId);
  res.status(201).json(participant);
});

tandasRouter.post("/:id/start", (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  const body = organizerBodySchema.safeParse(req.body);
  if (!params.success || !body.success) {
    throw new ValidationError("Invalid start request", {
      params: params.success ? null : params.error.flatten(),
      body: body.success ? null : body.error.flatten(),
    });
  }

  const tanda = tandaService.start(params.data.id, body.data.organizerId);
  res.json(tanda);
});

tandasRouter.post("/:id/cancel", (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  const body = organizerBodySchema.safeParse(req.body);
  if (!params.success || !body.success) {
    throw new ValidationError("Invalid cancel request", {
      params: params.success ? null : params.error.flatten(),
      body: body.success ? null : body.error.flatten(),
    });
  }

  const tanda = tandaService.cancel(params.data.id, body.data.organizerId);
  res.json(tanda);
});

tandasRouter.get("/:id/participants", (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new ValidationError("Invalid tanda id", params.error.flatten());
  }

  const participants = tandaService.listParticipants(params.data.id);
  res.json(participants);
});

tandasRouter.post("/:id/contributions", (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  const body = createContributionBodySchema.safeParse(req.body);
  if (!params.success || !body.success) {
    throw new ValidationError("Invalid contribution request", {
      params: params.success ? null : params.error.flatten(),
      body: body.success ? null : body.error.flatten(),
    });
  }

  const contribution = tandaService.recordContribution(
    params.data.id,
    body.data.participantId,
    body.data.amount
  );
  res.status(201).json(contribution);
});

tandasRouter.get("/:id/rounds/:round", (req, res) => {
  const parsed = roundParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError("Invalid round params", parsed.error.flatten());
  }

  const summary = tandaService.getRoundSummary(parsed.data.id, parsed.data.round);
  res.json(summary);
});

tandasRouter.post("/:id/advance", (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  const body = organizerBodySchema.safeParse(req.body);
  if (!params.success || !body.success) {
    throw new ValidationError("Invalid advance request", {
      params: params.success ? null : params.error.flatten(),
      body: body.success ? null : body.error.flatten(),
    });
  }

  const tanda = tandaService.advance(params.data.id, body.data.organizerId);
  res.json(tanda);
});

tandasRouter.get("/:id/participants/:pid/history", (req, res) => {
  const parsed = participantHistoryParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError("Invalid participant history params", parsed.error.flatten());
  }

  const history = tandaService.getParticipantHistory(parsed.data.id, parsed.data.pid);
  res.json(history);
});
