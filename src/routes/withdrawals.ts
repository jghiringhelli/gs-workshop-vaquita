import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { ValidationError } from '../errors';
import { authenticate } from '../middleware/auth';
import * as withdrawalService from '../services/withdrawal.service';

const router = Router();

const voteSchema = z.object({
  vote: z.enum(['approve', 'reject']),
});

router.post(
  '/:id/vote',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const withdrawalId = Number(req.params['id']);
      if (!Number.isInteger(withdrawalId) || withdrawalId <= 0) {
        throw new ValidationError('Invalid withdrawal id');
      }
      const parsed = voteSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((i) => i.message).join(', '),
        );
      }
      const result = withdrawalService.castVote(
        withdrawalId,
        req.user!.userId,
        parsed.data.vote,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
