import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ContributionService, recordContributionSchema } from '../services/contribution.service';

/**
 * Create contribution routes
 */
export function createContributionRoutes(contributionService: ContributionService): Router {
  const router = Router({ mergeParams: true });

  /**
   * POST /api/tandas/:id/contributions - Record a contribution
   */
  router.post('/:id/contributions', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const input = recordContributionSchema.parse(req.body);

      const contribution = contributionService.recordContribution(id, input.participantId, input.amount);

      res.status(201).json(contribution);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/tandas/:id/rounds/:round - Get round summary
   */
  router.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, round } = req.params as { id: string; round: string };

      const summary = contributionService.getRoundSummary(id, parseInt(round, 10));

      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/tandas/:id/advance - Advance to next round (organizer only)
   */
  router.post('/:id/advance', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const { organizerId } = req.body;

      if (!organizerId) {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'organizerId is required',
          },
        });
      }

      const result = contributionService.advanceRound(id, organizerId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/tandas/:id/participants/:pid/history - Get participant history
   */
  router.get('/:id/participants/:pid/history', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pid } = req.params as { id: string; pid: string };

      const history = contributionService.getParticipantHistory(pid);

      res.status(200).json(history);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
