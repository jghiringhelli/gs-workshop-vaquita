import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { ValidationError } from '../errors';
import { authenticate } from '../middleware/auth';
import * as tandaService from '../services/tanda.service';

const router = Router();

// ─── Create tanda ─────────────────────────────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(1).max(100),
  contributionAmount: z.number().int().positive(),
  totalRounds: z.number().int().positive(),
});

router.post(
  '/',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((i) => i.message).join(', '),
        );
      }
      const { name, contributionAmount, totalRounds } = parsed.data;
      const tanda = tandaService.createTanda(
        name,
        req.user!.userId,
        contributionAmount,
        totalRounds,
      );
      res.status(201).json(tanda);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Tanda detail ─────────────────────────────────────────────────────────────
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params['id']);
    if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid tanda id');
    res.json(tandaService.getTandaDetail(id));
  } catch (err) {
    next(err);
  }
});

// ─── Join / invite ────────────────────────────────────────────────────────────
// Authenticated user joins, or organizer specifies a userId in the body.
router.post(
  '/:id/join',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = Number(req.params['id']);
      const userId =
        req.body?.userId !== undefined
          ? Number(req.body.userId)
          : req.user!.userId;
      res.status(201).json(tandaService.joinTanda(tandaId, userId));
    } catch (err) {
      next(err);
    }
  },
);

// ─── Start tanda ──────────────────────────────────────────────────────────────
router.post(
  '/:id/start',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = Number(req.params['id']);
      res.json(tandaService.startTanda(tandaId, req.user!.userId));
    } catch (err) {
      next(err);
    }
  },
);

// ─── Record contribution ──────────────────────────────────────────────────────
router.post(
  '/:id/contributions',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = Number(req.params['id']);
      res.status(201).json(tandaService.recordContribution(tandaId, req.user!.userId));
    } catch (err) {
      next(err);
    }
  },
);

// ─── Balance ──────────────────────────────────────────────────────────────────
router.get('/:id/balance', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params['id']);
    if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid tanda id');
    res.json(tandaService.getBalance(id));
  } catch (err) {
    next(err);
  }
});

// ─── Public preview (no auth) ─────────────────────────────────────────────────
router.get('/:id/preview', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params['id']);
    if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid tanda id');
    res.json(tandaService.getPreview(id));
  } catch (err) {
    next(err);
  }
});

export default router;
