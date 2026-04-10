import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { poolService } from "./pool.service";
import { withdrawalService } from "./withdrawal.service";

const router = Router();

// ── Schemas ───────────────────────────────────────────────────────────────

const createPoolSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().optional(),
  targetAmount: z.number().int().positive(),
  currency: z.string().length(3).optional(),
});

const inviteSchema = z.object({
  userId: z.string().min(1),
});

const contributeSchema = z.object({
  amountCents: z.number().int().positive(),
  note: z.string().optional(),
});

const withdrawalSchema = z.object({
  amountCents: z.number().int().positive(),
  reason: z.string().min(1),
  receiptUrl: z.string().url().optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────

/** POST /api/pools — create a pool (auth required, creator becomes organizer + member) */
router.post("/", authenticate, async (req, res, next) => {
  try {
    const parsed = createPoolSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
      return;
    }
    const pool = await poolService.createPool(req.user!.sub, parsed.data);
    res.status(201).json({ pool });
  } catch (err) {
    next(err);
  }
});

/** GET /api/pools/:id — pool detail with members + total contributions (auth required) */
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const pool = await poolService.getPoolDetail(req.params.id);
    res.json({ pool });
  } catch (err) {
    next(err);
  }
});

/** POST /api/pools/:id/invite — organizer adds a member (auth required, organizer only) */
router.post("/:id/invite", authenticate, async (req, res, next) => {
  try {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
      return;
    }
    await poolService.inviteMember(req.params.id, req.user!.sub, parsed.data.userId);
    res.status(200).json({ message: "Member added successfully" });
  } catch (err) {
    next(err);
  }
});

/** POST /api/pools/:id/contributions — member records a contribution (auth required) */
router.post("/:id/contributions", authenticate, async (req, res, next) => {
  try {
    const parsed = contributeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
      return;
    }
    const contribution = await poolService.contribute(req.params.id, req.user!.sub, parsed.data);
    res.status(201).json({ contribution });
  } catch (err) {
    next(err);
  }
});

/** GET /api/pools/:id/balance — live balance (auth required) */
router.get("/:id/balance", authenticate, async (req, res, next) => {
  try {
    const balance = await poolService.getBalance(req.params.id);
    res.json({ balance });
  } catch (err) {
    next(err);
  }
});

/** GET /api/pools/:id/preview — public summary, no auth required */
router.get("/:id/preview", async (req, res, next) => {
  try {
    const preview = await poolService.getPreview(req.params.id);
    res.json({ pool: preview });
  } catch (err) {
    next(err);
  }
});

/** POST /api/pools/:id/withdrawals — organizer requests a withdrawal */
router.post("/:id/withdrawals", authenticate, async (req, res, next) => {
  try {
    const parsed = withdrawalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
      return;
    }
    const withdrawal = await withdrawalService.requestWithdrawal(req.params.id, req.user!.sub, parsed.data);
    res.status(201).json({ withdrawal });
  } catch (err) {
    next(err);
  }
});

/** GET /api/pools/:id/withdrawals — list withdrawals with vote counts */
router.get("/:id/withdrawals", authenticate, async (req, res, next) => {
  try {
    const withdrawals = await withdrawalService.listWithdrawals(req.params.id);
    res.json({ withdrawals });
  } catch (err) {
    next(err);
  }
});

/** GET /api/pools/:id/ledger — contributions and withdrawals interleaved by createdAt */
router.get("/:id/ledger", authenticate, async (req, res, next) => {
  try {
    const ledger = await withdrawalService.getLedger(req.params.id);
    res.json({ ledger });
  } catch (err) {
    next(err);
  }
});

/** POST /api/pools/:id/dissolve — organizer dissolves the pool */
router.post("/:id/dissolve", authenticate, async (req, res, next) => {
  try {
    const pool = await withdrawalService.dissolve(req.params.id, req.user!.sub);
    res.json({ pool });
  } catch (err) {
    next(err);
  }
});

export { router as poolRouter };
