import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/authenticate';
import { poolService } from '../services/poolService';

export const withdrawalRouter = Router();

const voteSchema = z.object({
  vote: z.enum(['approve', 'reject'], { message: 'vote must be "approve" or "reject"' }),
});

/** POST /api/withdrawals/:id/vote — cast a vote on a withdrawal */
withdrawalRouter.post('/:id/vote', authenticate, validate(voteSchema), async (req, res, next) => {
  try {
    const withdrawalId = parseInt(req.params['id'] as string, 10);
    if (isNaN(withdrawalId)) {
      return res.status(400).json({ error: 'Invalid withdrawal id', code: 'VALIDATION_ERROR' });
    }
    const result = await poolService.vote(withdrawalId, req.user!.id, req.body.vote);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
