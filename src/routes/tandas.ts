import { Router } from "express";
import { z } from "zod";
import { ValidationError } from "../errors";
import { TandaService } from "../services/tandaService";

const positiveInt = z.number().int().positive();

const createTandaSchema = z.object({
  name: z.string().trim().min(1),
  organizerId: positiveInt,
  contributionAmount: positiveInt,
});

const joinSchema = z.object({
  userId: positiveInt,
});

const organizerActionSchema = z.object({
  userId: positiveInt,
});

const contributionSchema = z.object({
  participantId: positiveInt,
  amount: positiveInt,
  status: z.enum(["paid", "late"]).optional(),
  paidLate: z.boolean().optional(),
});

const parseId = (value: string, label: string): number => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${label} must be a positive integer.`);
  }

  return parsed;
};

const parseBody = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError("Invalid request body.", parsed.error.flatten());
  }

  return parsed.data;
};

export const createTandaRouter = (tandaService: TandaService): Router => {
  const router = Router();

  router.post("/", (req, res) => {
    const body = parseBody(createTandaSchema, req.body);
    const tanda = tandaService.createTanda(body);
    res.status(201).json(tanda);
  });

  router.get("/", (req, res) => {
    const rawUserId = req.query.userId;
    if (typeof rawUserId !== "string") {
      throw new ValidationError("Query parameter userId is required.");
    }

    const userId = parseId(rawUserId, "userId");
    res.json(tandaService.listTandasForUser(userId));
  });

  router.get("/:id", (req, res) => {
    const tandaId = parseId(req.params.id, "Tanda id");
    res.json(tandaService.getTandaById(tandaId));
  });

  router.post("/:id/join", (req, res) => {
    const tandaId = parseId(req.params.id, "Tanda id");
    const body = parseBody(joinSchema, req.body);
    res.json(tandaService.joinTanda(tandaId, body.userId));
  });

  router.post("/:id/start", (req, res) => {
    const tandaId = parseId(req.params.id, "Tanda id");
    const body = parseBody(organizerActionSchema, req.body);
    res.json(tandaService.startTanda(tandaId, body.userId));
  });

  router.post("/:id/cancel", (req, res) => {
    const tandaId = parseId(req.params.id, "Tanda id");
    const body = parseBody(organizerActionSchema, req.body);
    res.json(tandaService.cancelTanda(tandaId, body.userId));
  });

  router.get("/:id/participants", (req, res) => {
    const tandaId = parseId(req.params.id, "Tanda id");
    res.json(tandaService.listParticipants(tandaId));
  });

  router.post("/:id/contributions", (req, res) => {
    const tandaId = parseId(req.params.id, "Tanda id");
    const body = parseBody(contributionSchema, req.body);
    const isLate = body.status === "late" || body.paidLate === true;

    res.json(
      tandaService.recordContribution({
        tandaId,
        participantId: body.participantId,
        amount: body.amount,
        isLate,
      }),
    );
  });

  router.get("/:id/rounds/:round", (req, res) => {
    const tandaId = parseId(req.params.id, "Tanda id");
    const round = parseId(req.params.round, "Round");
    res.json(tandaService.getRoundSummary(tandaId, round));
  });

  router.post("/:id/advance", (req, res) => {
    const tandaId = parseId(req.params.id, "Tanda id");
    const body = parseBody(organizerActionSchema, req.body);
    res.json(tandaService.advanceTanda(tandaId, body.userId));
  });

  router.get("/:id/participants/:participantId/history", (req, res) => {
    const tandaId = parseId(req.params.id, "Tanda id");
    const participantId = parseId(req.params.participantId, "Participant id");
    res.json(tandaService.getParticipantHistory(tandaId, participantId));
  });

  return router;
};
