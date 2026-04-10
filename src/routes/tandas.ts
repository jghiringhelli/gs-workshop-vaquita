import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  TandaService,
  createTandaSchema,
  joinTandaSchema,
} from '../services/tanda.service';

/**
 * Create tanda routes
 */
export function createTandaRoutes(tandaService: TandaService): Router {
  const router = Router();

  /**
   * POST /api/tandas - Create a tanda
   */
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createTandaSchema.parse(req.body);

      const tanda = tandaService.createTanda(
        input.name,
        input.organizerId,
        input.contributionAmount,
        input.totalRounds
      );

      res.status(201).json({
        data: tanda,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/tandas - List tandas for user (query param userId)
   */
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'userId query parameter is required',
          },
        });
      }

      const tandas = tandaService.listTandasForUser(userId);

      res.status(200).json({
        data: tandas,
        meta: {
          count: tandas.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/tandas/:id - Get tanda by ID
   */
  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const tanda = tandaService.getTandaById(id);

      res.status(200).json({
        data: tanda,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/tandas/:id/join - Join a tanda
   */
  router.post('/:id/join', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const input = joinTandaSchema.parse(req.body);

      const participant = tandaService.joinTanda(id, input.userId);

      res.status(200).json({
        data: participant,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/tandas/:id/start - Start a tanda (organizer only)
   */
  router.post('/:id/start', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const { organizerId } = req.body;

      if (!organizerId || typeof organizerId !== 'string') {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'organizerId is required',
          },
        });
      }

      const tanda = tandaService.startTanda(id, organizerId);

      res.status(200).json({
        data: tanda,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/tandas/:id/participants - List participants in tanda
   */
  router.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };

      const participants = tandaService.getParticipants(id);

      res.status(200).json({
        data: participants,
        meta: {
          count: participants.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/tandas/:id/cancel - Cancel a tanda (organizer only)
   */
  router.post('/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const { organizerId } = req.body;

      if (!organizerId || typeof organizerId !== 'string') {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'organizerId is required',
          },
        });
      }

      const tanda = tandaService.cancelTanda(id, organizerId);

      res.status(200).json({
        data: tanda,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
