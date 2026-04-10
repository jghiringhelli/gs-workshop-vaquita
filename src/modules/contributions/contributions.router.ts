import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../shared/middleware/validate';
import { RecordContributionSchema } from './contributions.schemas';
import {
  recordContribution,
  getRoundSummary,
  getParticipantHistory,
} from './contributions.service';

/** Router mounted at /api/tandas/:id — handles contribution sub-routes. */
export const contributionsRouter = Router({ mergeParams: true });

contributionsRouter.post(
  '/contributions',
  validate(RecordContributionSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const tandaId = req.params['id'] as string;
      const { participantId, amount } = req.body as {
        participantId: string;
        amount: number;
      };
      const contribution = recordContribution(tandaId, participantId, amount);
      res.status(201).json(contribution);
    } catch (err) {
      next(err);
    }
  },
);

contributionsRouter.get(
  '/rounds/:round',
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const tandaId = req.params['id'] as string;
      const round = parseInt(req.params['round'] as string, 10);
      res.json(getRoundSummary(tandaId, round));
    } catch (err) {
      next(err);
    }
  },
);

contributionsRouter.get(
  '/participants/:pid/history',
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const tandaId = req.params['id'] as string;
      const pid = req.params['pid'] as string;
      res.json(getParticipantHistory(tandaId, pid));
    } catch (err) {
      next(err);
    }
  },
);
