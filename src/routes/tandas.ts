import { Router } from "express";
import { z } from "zod";
import { tandaService } from "../services/tandaService";
import { contributionService } from "../services/contributionService";

export const tandasRouter = Router();

const CreateTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.string().min(1),
  contributionAmount: z.number().positive(),
});

const JoinTandaSchema = z.object({
  userId: z.string().min(1),
});

const StartCancelSchema = z.object({
  userId: z.string().min(1),
});

const ContributionSchema = z.object({
  participantId: z.string().min(1),
  isLate: z.boolean().optional(),
});

// POST /api/tandas
tandasRouter.post("/", (req, res, next) => {
  try {
    const body = CreateTandaSchema.parse(req.body);
    const tanda = tandaService.create(body);
    res.status(201).json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas?userId=
tandasRouter.get("/", (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
      res.status(400).json({ error: "Query param 'userId' is required" });
      return;
    }
    const tandas = tandaService.listByUser(userId);
    res.json(tandas);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id
tandasRouter.get("/:id", (req, res, next) => {
  try {
    const tanda = tandaService.getById(req.params.id);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/join
tandasRouter.post("/:id/join", (req, res, next) => {
  try {
    const { userId } = JoinTandaSchema.parse(req.body);
    const participant = tandaService.join(req.params.id, userId);
    res.json(participant);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/start
tandasRouter.post("/:id/start", (req, res, next) => {
  try {
    const { userId } = StartCancelSchema.parse(req.body);
    const tanda = tandaService.start(req.params.id, userId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/cancel
tandasRouter.post("/:id/cancel", (req, res, next) => {
  try {
    const { userId } = StartCancelSchema.parse(req.body);
    const tanda = tandaService.cancel(req.params.id, userId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/participants
tandasRouter.get("/:id/participants", (req, res, next) => {
  try {
    const participants = tandaService.listParticipants(req.params.id);
    res.json(participants);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/contributions
tandasRouter.post("/:id/contributions", (req, res, next) => {
  try {
    const body = ContributionSchema.parse(req.body);
    const contribution = contributionService.record({
      tandaId: req.params.id,
      participantId: body.participantId,
      isLate: body.isLate,
    });
    res.status(201).json(contribution);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/rounds/:round
tandasRouter.get("/:id/rounds/:round", (req, res, next) => {
  try {
    const round = parseInt(req.params.round, 10);
    if (isNaN(round)) {
      res.status(400).json({ error: "Round must be a number" });
      return;
    }
    const summary = tandaService.getRoundSummary(req.params.id, round);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/advance
tandasRouter.post("/:id/advance", (req, res, next) => {
  try {
    const { userId } = StartCancelSchema.parse(req.body);
    const tanda = tandaService.advanceRound(req.params.id, userId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/participants/:pid/history
tandasRouter.get("/:id/participants/:pid/history", (req, res, next) => {
  try {
    const history = contributionService.getParticipantHistory(
      req.params.id,
      req.params.pid,
    );
    res.json(history);
  } catch (err) {
    next(err);
  }
});
