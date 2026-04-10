/**
 * Tanda Routes
 * POST   /api/tandas                   - Create tanda
 * GET    /api/tandas                   - List tandas
 * GET    /api/tandas/:id               - Get tanda
 * POST   /api/tandas/:id/join          - Join tanda
 * POST   /api/tandas/:id/start         - Start tanda
 * POST   /api/tandas/:id/cancel        - Cancel tanda
 * GET    /api/tandas/:id/participants  - List participants
 * POST   /api/tandas/:id/advance       - Advance to next round
 */

import { Router, Request, Response } from 'express';
import { Services } from '../services/index.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { CreateTandaSchema, JoinTandaSchema, validateInput } from '../middlewares/validation.js';
import { ValidationError } from '../errors/index.js';

export function createTandaRoutes(services: Services): Router {
  const router = Router();

  /**
   * POST /api/tandas
   * Create a new tanda
   *
   * Example request:
   * {
   *   "name": "Tanda Enero",
   *   "organizerId": "123e4567-e89b-12d3-a456-426614174000",
   *   "contributionAmount": 1000
   * }
   *
   * Example response:
   * {
   *   "id": "223e4567-e89b-12d3-a456-426614174000",
   *   "name": "Tanda Enero",
   *   "organizerId": "123e4567-e89b-12d3-a456-426614174000",
   *   "contributionAmount": 1000,
   *   "status": "forming",
   *   "currentRound": 0,
   *   "totalRounds": 1,
   *   "createdAt": "2024-01-15T10:30:00Z",
   *   "updatedAt": "2024-01-15T10:30:00Z"
   * }
   */
  router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const input = validateInput(CreateTandaSchema, req.body);
      const tanda = services.tandas.createTanda(input);

      res.status(201).json(tanda);
    }),
  );

  /**
   * GET /api/tandas?userId=xxx
   * List tandas (all or for a specific user)
   *
   * Query params:
   * - userId: (optional) Filter tandas for a specific user
   *
   * Example response:
   * [
   *   {
   *     "id": "223e4567-e89b-12d3-a456-426614174000",
   *     "name": "Tanda Enero",
   *     "organizerId": "123e4567-e89b-12d3-a456-426614174000",
   *     "contributionAmount": 1000,
   *     "status": "active",
   *     "currentRound": 1,
   *     "totalRounds": 5,
   *     "createdAt": "2024-01-15T10:30:00Z",
   *     "updatedAt": "2024-01-15T10:30:00Z"
   *   }
   * ]
   */
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.query.userId as string | undefined;

      if (userId) {
        const tandas = services.tandas.listTandasForUser(userId);
        res.json(tandas);
      } else {
        const tandas = services.tandas.listAllTandas();
        res.json(tandas);
      }
    }),
  );

  /**
   * GET /api/tandas/:id
   * Get tanda details
   *
   * Example response:
   * {
   *   "id": "223e4567-e89b-12d3-a456-426614174000",
   *   "name": "Tanda Enero",
   *   "organizerId": "123e4567-e89b-12d3-a456-426614174000",
   *   "contributionAmount": 1000,
   *   "status": "active",
   *   "currentRound": 1,
   *   "totalRounds": 5,
   *   "createdAt": "2024-01-15T10:30:00Z",
   *   "updatedAt": "2024-01-15T10:30:00Z"
   * }
   */
  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const tanda = services.tandas.getTanda(req.params.id);
      res.json(tanda);
    }),
  );

  /**
   * POST /api/tandas/:id/join
   * Join a tanda
   *
   * Example request:
   * {
   *   "userId": "323e4567-e89b-12d3-a456-426614174000"
   * }
   *
   * Example response:
   * {
   *   "id": "423e4567-e89b-12d3-a456-426614174000",
   *   "userId": "323e4567-e89b-12d3-a456-426614174000",
   *   "tandaId": "223e4567-e89b-12d3-a456-426614174000",
   *   "role": "member",
   *   "rotationPosition": 2,
   *   "createdAt": "2024-01-15T10:30:00Z"
   * }
   */
  router.post(
    '/:id/join',
    asyncHandler(async (req: Request, res: Response) => {
      const input = validateInput(JoinTandaSchema, req.body);
      const participant = services.tandas.joinTanda({
        userId: input.userId,
        tandaId: req.params.id,
      });

      res.status(201).json(participant);
    }),
  );

  /**
   * POST /api/tandas/:id/start
   * Start a tanda (organizer only)
   * Transitions from FORMING to ACTIVE
   * Randomizes rotation order
   *
   * Example response:
   * {
   *   "id": "223e4567-e89b-12d3-a456-426614174000",
   *   "name": "Tanda Enero",
   *   "organizerId": "123e4567-e89b-12d3-a456-426614174000",
   *   "contributionAmount": 1000,
   *   "status": "active",
   *   "currentRound": 1,
   *   "totalRounds": 5,
   *   "createdAt": "2024-01-15T10:30:00Z",
   *   "updatedAt": "2024-01-15T10:35:00Z"
   * }
   */
  router.post(
    '/:id/start',
    asyncHandler(async (req: Request, res: Response) => {
      const organizerId = req.headers['x-user-id'] as string;
      if (!organizerId) {
        throw new ValidationError('x-user-id header is required');
      }

      const tanda = services.tandas.startTanda(req.params.id, organizerId);
      res.json(tanda);
    }),
  );

  /**
   * POST /api/tandas/:id/cancel
   * Cancel a tanda (organizer only)
   *
   * Example response:
   * {
   *   "id": "223e4567-e89b-12d3-a456-426614174000",
   *   "name": "Tanda Enero",
   *   "organizerId": "123e4567-e89b-12d3-a456-426614174000",
   *   "contributionAmount": 1000,
   *   "status": "cancelled",
   *   "currentRound": 0,
   *   "totalRounds": 1,
   *   "createdAt": "2024-01-15T10:30:00Z",
   *   "updatedAt": "2024-01-15T10:35:00Z"
   * }
   */
  router.post(
    '/:id/cancel',
    asyncHandler(async (req: Request, res: Response) => {
      const organizerId = req.headers['x-user-id'] as string;
      if (!organizerId) {
        throw new ValidationError('x-user-id header is required');
      }

      const tanda = services.tandas.cancelTanda(req.params.id, organizerId);
      res.json(tanda);
    }),
  );

  /**
   * GET /api/tandas/:id/participants
   * List participants in a tanda
   *
   * Example response:
   * [
   *   {
   *     "id": "423e4567-e89b-12d3-a456-426614174000",
   *     "userId": "123e4567-e89b-12d3-a456-426614174000",
   *     "tandaId": "223e4567-e89b-12d3-a456-426614174000",
   *     "role": "organizer",
   *     "rotationPosition": 1,
   *     "createdAt": "2024-01-15T10:30:00Z"
   *   }
   * ]
   */
  router.get(
    '/:id/participants',
    asyncHandler(async (req: Request, res: Response) => {
      const participants = services.participants.getParticipants(req.params.id);
      res.json(participants);
    }),
  );

  /**
   * POST /api/tandas/:id/advance
   * Advance to next round (organizer only)
   * Auto-completes tanda if this is the last round
   *
   * Example response:
   * {
   *   "tanda":  {
   *     "id": "223e4567-e89b-12d3-a456-426614174000",
   *     "name": "Tanda Enero",
   *     "organizerId": "123e4567-e89b-12d3-a456-426614174000",
   *     "contributionAmount": 1000,
   *     "status": "active",
   *     "currentRound": 2,
   *     "totalRounds": 5,
   *     "createdAt": "2024-01-15T10:30:00Z",
   *     "updatedAt": "2024-01-15T10:40:00Z"
   *   },
   *   "message": "Advanced to round 2"
   * }
   */
  router.post(
    '/:id/advance',
    asyncHandler(async (req: Request, res: Response) => {
      const organizerId = req.headers['x-user-id'] as string;
      if (!organizerId) {
        throw new ValidationError('x-user-id header is required');
      }

      const result = services.contributions.advanceRound(req.params.id, organizerId);
      res.json(result);
    }),
  );

  return router;
}
