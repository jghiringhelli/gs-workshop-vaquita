import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import { poolService } from "../services/pool.service";

export const poolRoutes = new Hono();

// --- Validation schemas ---

const createPoolSchema = z.object({
  name: z.string().min(1, "Name is required"),
  purpose: z.string().optional(),
  targetAmount: z.number().int().positive("Target amount must be a positive integer (cents)"),
  currency: z.string().default("MXN"),
  // organizerId comes from the request until JWT middleware is in place
  organizerId: z.number().int().positive("organizerId is required"),
});

const inviteSchema = z.object({
  userId: z.number().int().positive("userId is required"),
  // requesterId identifies the caller; will be replaced by JWT claim in production
  requesterId: z.number().int().positive("requesterId is required"),
});

const contributeSchema = z.object({
  userId: z.number().int().positive("userId is required"),
  amountCents: z.number().int().positive("amountCents must be a positive integer"),
  note: z.string().optional(),
});

// --- Route handlers ---

// POST /api/pools — Create a new savings pool
poolRoutes.post(
  "/",
  validator("json", (value, c) => {
    const result = createPoolSchema.safeParse(value);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.issues }, 422);
    }
    return result.data;
  }),
  async (c) => {
    const data = c.req.valid("json");
    const pool = await poolService.createPool(data);
    return c.json(pool, 201);
  }
);

// GET /api/pools/:id — Pool detail with members and total contributions
poolRoutes.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid pool ID" }, 400);

  const pool = await poolService.getPool(id);
  return c.json(pool, 200);
});

// POST /api/pools/:id/invite — Organiser adds a member
poolRoutes.post(
  "/:id/invite",
  validator("json", (value, c) => {
    const result = inviteSchema.safeParse(value);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.issues }, 422);
    }
    return result.data;
  }),
  async (c) => {
    const poolId = parseInt(c.req.param("id"), 10);
    if (isNaN(poolId)) return c.json({ error: "Invalid pool ID" }, 400);

    const data = c.req.valid("json");
    const member = await poolService.inviteMember(poolId, data);
    return c.json(member, 201);
  }
);

// POST /api/pools/:id/contributions — Member contributes to the pool
poolRoutes.post(
  "/:id/contributions",
  validator("json", (value, c) => {
    const result = contributeSchema.safeParse(value);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.issues }, 422);
    }
    return result.data;
  }),
  async (c) => {
    const poolId = parseInt(c.req.param("id"), 10);
    if (isNaN(poolId)) return c.json({ error: "Invalid pool ID" }, 400);

    const data = c.req.valid("json");
    const contribution = await poolService.contribute(poolId, data);
    return c.json(contribution, 201);
  }
);

// GET /api/pools/:id/balance — Live balance (contributions minus approved withdrawals)
poolRoutes.get("/:id/balance", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid pool ID" }, 400);

  const balance = await poolService.getBalance(id);
  return c.json(balance, 200);
});

// GET /api/pools/:id/preview — No-auth public summary
poolRoutes.get("/:id/preview", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid pool ID" }, 400);

  const preview = await poolService.getPreview(id);
  return c.json(preview, 200);
});
