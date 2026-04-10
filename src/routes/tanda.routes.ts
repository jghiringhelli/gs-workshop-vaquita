import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import { tandaService } from "../services/tanda.service";

export const tandaRoutes = new Hono();

// --- Validation schemas ---

const createTandaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  organizerId: z.number().int().positive("organizerId is required"),
  contributionAmount: z.number().int().positive("contributionAmount must be a positive integer"),
});

const joinSchema = z.object({
  userId: z.number().int().positive("userId is required"),
});

// requesterId identifies the caller for organizer-only actions (replaces JWT until middleware added)
const organizerActionSchema = z.object({
  requesterId: z.number().int().positive("requesterId is required"),
});

const contributionSchema = z.object({
  participantId: z.number().int().positive("participantId is required"),
});

// --- Route handlers ---

// POST /api/tandas — Create a tanda (creator = organizer, auto-joins)
tandaRoutes.post(
  "/",
  validator("json", (value, c) => {
    const result = createTandaSchema.safeParse(value);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.issues }, 422);
    }
    return result.data;
  }),
  async (c) => {
    const data = c.req.valid("json");
    const tanda = await tandaService.createTanda(data);
    return c.json(tanda, 201);
  }
);

// GET /api/tandas — List tandas for a user (?userId=)
tandaRoutes.get("/", async (c) => {
  const userIdParam = c.req.query("userId");
  if (!userIdParam) return c.json({ error: "userId query param is required" }, 400);

  const userId = parseInt(userIdParam, 10);
  if (isNaN(userId)) return c.json({ error: "Invalid userId" }, 400);

  const tandas = await tandaService.listTandas(userId);
  return c.json(tandas, 200);
});

// GET /api/tandas/:id — Get tanda details
tandaRoutes.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid tanda ID" }, 400);

  const tanda = await tandaService.getTanda(id);
  return c.json(tanda, 200);
});

// POST /api/tandas/:id/join — Join a tanda
tandaRoutes.post(
  "/:id/join",
  validator("json", (value, c) => {
    const result = joinSchema.safeParse(value);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.issues }, 422);
    }
    return result.data;
  }),
  async (c) => {
    const tandaId = parseInt(c.req.param("id"), 10);
    if (isNaN(tandaId)) return c.json({ error: "Invalid tanda ID" }, 400);

    const { userId } = c.req.valid("json");
    const participant = await tandaService.joinTanda(tandaId, userId);
    return c.json(participant, 201);
  }
);

// POST /api/tandas/:id/start — Start (organizer only — FORMING → ACTIVE)
tandaRoutes.post(
  "/:id/start",
  validator("json", (value, c) => {
    const result = organizerActionSchema.safeParse(value);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.issues }, 422);
    }
    return result.data;
  }),
  async (c) => {
    const tandaId = parseInt(c.req.param("id"), 10);
    if (isNaN(tandaId)) return c.json({ error: "Invalid tanda ID" }, 400);

    const { requesterId } = c.req.valid("json");
    const tanda = await tandaService.startTanda(tandaId, requesterId);
    return c.json(tanda, 200);
  }
);

// POST /api/tandas/:id/cancel — Cancel (organizer only)
tandaRoutes.post(
  "/:id/cancel",
  validator("json", (value, c) => {
    const result = organizerActionSchema.safeParse(value);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.issues }, 422);
    }
    return result.data;
  }),
  async (c) => {
    const tandaId = parseInt(c.req.param("id"), 10);
    if (isNaN(tandaId)) return c.json({ error: "Invalid tanda ID" }, 400);

    const { requesterId } = c.req.valid("json");
    const tanda = await tandaService.cancelTanda(tandaId, requesterId);
    return c.json(tanda, 200);
  }
);

// GET /api/tandas/:id/participants — List participants
tandaRoutes.get("/:id/participants", async (c) => {
  const tandaId = parseInt(c.req.param("id"), 10);
  if (isNaN(tandaId)) return c.json({ error: "Invalid tanda ID" }, 400);

  const participants = await tandaService.listParticipants(tandaId);
  return c.json(participants, 200);
});

// POST /api/tandas/:id/contributions — Record a contribution for the current round
tandaRoutes.post(
  "/:id/contributions",
  validator("json", (value, c) => {
    const result = contributionSchema.safeParse(value);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.issues }, 422);
    }
    return result.data;
  }),
  async (c) => {
    const tandaId = parseInt(c.req.param("id"), 10);
    if (isNaN(tandaId)) return c.json({ error: "Invalid tanda ID" }, 400);

    const data = c.req.valid("json");
    const contribution = await tandaService.recordContribution(tandaId, data);
    return c.json(contribution, 201);
  }
);

// GET /api/tandas/:id/rounds/:round — Round summary
tandaRoutes.get("/:id/rounds/:round", async (c) => {
  const tandaId = parseInt(c.req.param("id"), 10);
  const round = parseInt(c.req.param("round"), 10);
  if (isNaN(tandaId) || isNaN(round)) return c.json({ error: "Invalid ID or round" }, 400);

  const summary = await tandaService.getRoundSummary(tandaId, round);
  return c.json(summary, 200);
});

// POST /api/tandas/:id/advance — Advance to next round (organizer only)
tandaRoutes.post(
  "/:id/advance",
  validator("json", (value, c) => {
    const result = organizerActionSchema.safeParse(value);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.issues }, 422);
    }
    return result.data;
  }),
  async (c) => {
    const tandaId = parseInt(c.req.param("id"), 10);
    if (isNaN(tandaId)) return c.json({ error: "Invalid tanda ID" }, 400);

    const { requesterId } = c.req.valid("json");
    const tanda = await tandaService.advanceRound(tandaId, requesterId);
    return c.json(tanda, 200);
  }
);

// GET /api/tandas/:id/participants/:pid/history — Contribution history for a participant
tandaRoutes.get("/:id/participants/:pid/history", async (c) => {
  const tandaId = parseInt(c.req.param("id"), 10);
  const participantId = parseInt(c.req.param("pid"), 10);
  if (isNaN(tandaId) || isNaN(participantId)) return c.json({ error: "Invalid ID" }, 400);

  const history = await tandaService.getParticipantHistory(tandaId, participantId);
  return c.json(history, 200);
});


