import { Router, Request, Response, NextFunction } from 'express';
import { ContributionService } from './contribution.service';
import { validate } from '../middleware/validate';
import { recordContributionSchema, roundParamsSchema } from './contribution.schemas';

/**
 * Creates the Express router for contribution endpoints.
 * Mounted at /api/tandas — routes use /:tandaId/contributions and /:id/rounds/:round.
 *
 * @param contributionService - Injected service instance
 * @returns Configured Express Router
 */
export function createContributionRouter(contributionService: ContributionService): Router {
  const router = Router();

  /** POST /api/tandas/:tandaId/contributions — record a contribution for the current round */
  router.post(
    '/:tandaId/contributions',
    validate(recordContributionSchema),
    (req: Request<{ tandaId: string }>, res: Response, next: NextFunction): void => {
      try {
        const { userId, amount } = req.body as { userId: string; amount: number };
        const contribution = contributionService.recordContribution(
          req.params.tandaId,
          userId,
          amount,
        );
        res.status(201).json({ data: contribution });
      } catch (err) {
        next(err);
      }
    },
  );

  /** GET /api/tandas/:id/rounds/:round — round summary (paid, pending, total collected) */
  router.get(
    '/:id/rounds/:round',
    validate(roundParamsSchema, 'params'),
    (req: Request<{ id: string; round: string }>, res: Response, next: NextFunction): void => {
      try {
        const tandaId = req.params.id;
        // roundParamsSchema coerces :round to a number; params are still typed as string
        const round = Number(req.params.round);
        const summary = contributionService.getRoundSummary(tandaId, round);
        res.json({ data: summary });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
