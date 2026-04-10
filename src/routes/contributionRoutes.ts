/**
 * Contribution Routes
 * POST   /api/tandas/:id/contributions              - Record contribution
 * GET    /api/tandas/:id/rounds/:round              - Get round summary
 * GET    /api/tandas/:id/participants/:pid/history - Get participant history
 */

import { Router, Request, Response } from 'express';
import { Services } from '../services/index.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { RecordContributionSchema, validateInput } from '../middlewares/validation.js';

export function createContributionRoutes(services: Services): Router {
  const router = Router({ mergeParams: true });

  /**
   * POST /api/tandas/:id/contributions
   * Record a contribution for the current round
   * Applies late penalty if applicable (5% by default, configurable)
   *
   * Example request:
   * {
   *   "participantId": "423e4567-e89b-12d3-a456-426614174000",
   *   "amount": 1000
   * }
   *
   * Example response:
   * {
   *   "id": "523e4567-e89b-12d3-a456-426614174000",
   *   "tandaId": "223e4567-e89b-12d3-a456-426614174000",
   *   "participantId": "423e4567-e89b-12d3-a456-426614174000",
   *   "round": 1,
   *   "amount": 1050,
   *   "status": "late",
   *   "paidAt": "2024-01-15T10:30:00Z",
   *   "createdAt": "2024-01-15T10:30:00Z"
   * }
   */
  router.post(
    '/:tandaId/contributions',
    asyncHandler(async (req: Request, res: Response) => {
      const input = validateInput(RecordContributionSchema, req.body);
      const contribution = services.contributions.recordContribution(
        req.params.tandaId,
        input,
      );

      res.status(201).json(contribution);
    }),
  );

  /**
   * GET /api/tandas/:id/rounds/:round
   * Get round summary
   * Shows all contributions for a specific round
   *
   * Example response:
   * {
   *   "round": 1,
   *   "tandaId": "223e4567-e89b-12d3-a456-426614174000",
   *   "contributorCount": 4,
   *   "totalAmount": 4000,
   *   "expectedAmount": 4000,
   *   "contributions": [
   *     {
   *       "participantId": "423e4567-e89b-12d3-a456-426614174001",
   *       "status": "paid",
   *       "amount": 1000,
   *       "paidAt": "2024-01-15T10:30:00Z"
   *     }
   *   ]
   * }
   */
  router.get(
    '/:tandaId/rounds/:round',
    asyncHandler(async (req: Request, res: Response) => {
      const round = parseInt(req.params.round, 10);
      if (Number.isNaN(round)) {
        throw new Error('Round must be a valid number');
      }

      const summary = services.contributions.getRoundSummary(req.params.tandaId, round);
      res.json(summary);
    }),
  );

  /**
   * GET /api/tandas/:id/participants/:pid/history
   * Get contribution history for a participant
   *
   * Example response:
   * [
   *   {
   *     "id": "523e4567-e89b-12d3-a456-426614174000",
   *     "tandaId": "223e4567-e89b-12d3-a456-426614174000",
   *     "participantId": "423e4567-e89b-12d3-a456-426614174000",
   *     "round": 1,
   *     "amount": 1000,
   *     "status": "paid",
   *     "paidAt": "2024-01-15T10:30:00Z",
   *     "createdAt": "2024-01-15T10:30:00Z"
   *   }
   * ]
   */
  router.get(
    '/:tandaId/participants/:pid/history',
    asyncHandler(async (req: Request, res: Response) => {
      const history = services.contributions.getParticipantHistory(
        req.params.tandaId,
        req.params.pid,
      );
      res.json(history);
    }),
  );

  return router;
}
