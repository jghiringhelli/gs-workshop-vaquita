import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { TandaService } from '../services/TandaService.js';

const idParamsSchema = z.object({ id: z.string().min(1) });

const createTandaSchema = z.object({
  name: z.string().min(1, 'name is required'),
  organizerId: z.string().min(1, 'organizerId is required'),
  contributionAmount: z.number().int().positive('contributionAmount must be a positive integer'),
});

const joinSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

const requesterSchema = z.object({
  requesterId: z.string().min(1, 'requesterId is required'),
});

const contributionSchema = z.object({
  participantId: z.string().min(1, 'participantId is required'),
  amount: z.number().int().positive('amount must be a positive integer'),
});

const roundParamsSchema = z.object({
  id: z.string().min(1),
  round: z.coerce.number().int().positive(),
});

const historyParamsSchema = z.object({
  id: z.string().min(1),
  pid: z.string().min(1),
});

/**
 * Build and return the tandas router, injecting the TandaService.
 * @param tandaService - Service instance to delegate to
 * @returns Configured Express Router
 */
export function createTandaRouter(tandaService: TandaService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const body = createTandaSchema.parse(req.body);
      const tanda = tandaService.createTanda(body);
      res.status(201).json(tanda);
    } catch (err) {
      next(err);
    }
  });

  router.get('/', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const userId =
        typeof req.query['userId'] === 'string' ? req.query['userId'] : undefined;
      res.json(tandaService.listTandas(userId));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      res.json(tandaService.getTandaById(id));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/join', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      const { userId } = joinSchema.parse(req.body);
      const participant = tandaService.joinTanda(id, userId);
      res.status(201).json(participant);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/start', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      const { requesterId } = requesterSchema.parse(req.body);
      res.json(tandaService.startTanda(id, requesterId));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/cancel', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      const { requesterId } = requesterSchema.parse(req.body);
      res.json(tandaService.cancelTanda(id, requesterId));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/advance', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      const { requesterId } = requesterSchema.parse(req.body);
      res.json(tandaService.advanceRound(id, requesterId));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/participants', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      res.json(tandaService.listParticipants(id));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/:id/contributions',
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        const { id } = idParamsSchema.parse(req.params);
        const { participantId, amount } = contributionSchema.parse(req.body);
        const contribution = tandaService.recordContribution(id, participantId, amount);
        res.status(201).json(contribution);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id, round } = roundParamsSchema.parse(req.params);
      res.json(tandaService.getRoundSummary(id, round));
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/:id/participants/:pid/history',
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        const { id, pid } = historyParamsSchema.parse(req.params);
        res.json(tandaService.getParticipantHistory(id, pid));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
