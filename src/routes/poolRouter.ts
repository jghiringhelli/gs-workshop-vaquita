import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/authenticate';
import { poolService } from '../services/poolService';

export const poolRouter = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createPoolSchema = z.object({
  name: z.string().min(1, 'name is required'),
  purpose: z.string().optional(),
  targetAmount: z.number().positive('targetAmount must be positive'),
  currency: z.string().length(3).optional(),
});

const inviteSchema = z.object({
  userId: z.number().int().positive('userId must be a positive integer'),
});

const contributionSchema = z.object({
  amountCents: z.number().int().positive('amountCents must be a positive integer'),
  note: z.string().optional(),
});

const withdrawalSchema = z.object({
  amountCents: z.number().int().positive('amountCents must be a positive integer'),
  note: z.string().optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/** POST /api/pools — create a pool (organiser auto-joins) */
poolRouter.post('/', authenticate, validate(createPoolSchema), async (req, res, next) => {
  try {
    const pool = await poolService.create(req.user!.id, req.body);
    res.status(201).json(pool);
  } catch (err) {
    next(err);
  }
});

/** GET /api/pools/:id — full detail (auth required) */
poolRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params['id'] as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid pool id', code: 'VALIDATION_ERROR' });
    const pool = await poolService.getById(id);
    res.json(pool);
  } catch (err) {
    next(err);
  }
});

/** GET /api/pools/:id/preview — no-auth public summary */
poolRouter.get('/:id/preview', async (req, res, next) => {
  try {
    const id = parseInt(req.params['id'] as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid pool id', code: 'VALIDATION_ERROR' });
    const preview = await poolService.getPreview(id);
    res.json(preview);
  } catch (err) {
    next(err);
  }
});

/** POST /api/pools/:id/invite — organiser adds a member */
poolRouter.post('/:id/invite', authenticate, validate(inviteSchema), async (req, res, next) => {
  try {
    const poolId = parseInt(req.params['id'] as string, 10);
    if (isNaN(poolId)) return res.status(400).json({ error: 'Invalid pool id', code: 'VALIDATION_ERROR' });
    const member = await poolService.invite(poolId, req.user!.id, req.body.userId);
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

/** POST /api/pools/:id/contributions — member records a contribution */
poolRouter.post(
  '/:id/contributions',
  authenticate,
  validate(contributionSchema),
  async (req, res, next) => {
    try {
      const poolId = parseInt(req.params['id'] as string, 10);
      if (isNaN(poolId)) return res.status(400).json({ error: 'Invalid pool id', code: 'VALIDATION_ERROR' });
      const contribution = await poolService.contribute(
        poolId,
        req.user!.id,
        req.body.amountCents,
        req.body.note,
      );
      res.status(201).json(contribution);
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/pools/:id/balance — live balance (auth required) */
poolRouter.get('/:id/balance', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params['id'] as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid pool id', code: 'VALIDATION_ERROR' });
    const balance = await poolService.getBalance(id);
    res.json(balance);
  } catch (err) {
    next(err);
  }
});

/** POST /api/pools/:id/withdrawals — member requests a withdrawal */
poolRouter.post(
  '/:id/withdrawals',
  authenticate,
  validate(withdrawalSchema),
  async (req, res, next) => {
    try {
      const poolId = parseInt(req.params['id'] as string, 10);
      if (isNaN(poolId)) return res.status(400).json({ error: 'Invalid pool id', code: 'VALIDATION_ERROR' });
      const withdrawal = await poolService.requestWithdrawal(
        poolId,
        req.user!.id,
        req.body.amountCents,
        req.body.note,
      );
      res.status(201).json(withdrawal);
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/pools/:id/withdrawals/:wid/approve — organiser approves a withdrawal */
poolRouter.patch('/:id/withdrawals/:wid/approve', authenticate, async (req, res, next) => {
  try {
    const poolId = parseInt(req.params['id'] as string, 10);
    const wid = parseInt(req.params['wid'] as string, 10);
    if (isNaN(poolId) || isNaN(wid)) {
      return res.status(400).json({ error: 'Invalid id', code: 'VALIDATION_ERROR' });
    }
    const withdrawal = await poolService.approveWithdrawal(poolId, wid, req.user!.id);
    res.json(withdrawal);
  } catch (err) {
    next(err);
  }
});
