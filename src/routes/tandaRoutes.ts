import { Router, Request, Response, NextFunction } from 'express';
import { TandaService } from '../services/tandaService';
import {
  createTandaSchema,
  joinTandaSchema,
  recordContributionSchema,
} from '../validation/schemas';
import { ZodError } from 'zod';
import { ValidationError } from '../errors/customErrors';

export function createTandaRoutes(tandaService: TandaService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createTandaSchema.parse(req.body);
      const tanda = tandaService.createTanda(validated);
      res.status(201).json(tanda);
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error.errors[0].message));
      } else {
        next(error);
      }
    }
  });

  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        throw new ValidationError('userId query parameter is required');
      }
      const userIdNum = parseInt(userId as string, 10);
      if (isNaN(userIdNum)) {
        throw new ValidationError('userId must be a number');
      }
      const tandas = tandaService.listTandasByUser(userIdNum);
      res.json(tandas);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Tanda ID must be a number');
      }
      const tanda = tandaService.getTandaById(id);
      res.json(tanda);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/join', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Tanda ID must be a number');
      }
      const validated = joinTandaSchema.parse(req.body);
      const participant = tandaService.joinTanda(id, validated);
      res.status(201).json(participant);
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error.errors[0].message));
      } else {
        next(error);
      }
    }
  });

  router.post('/:id/start', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Tanda ID must be a number');
      }
      const organizerId = req.body.organizerId;
      if (!organizerId || isNaN(parseInt(organizerId, 10))) {
        throw new ValidationError('organizerId is required and must be a number');
      }
      const tanda = tandaService.startTanda(id, parseInt(organizerId, 10));
      res.json(tanda);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Tanda ID must be a number');
      }
      const organizerId = req.body.organizerId;
      if (!organizerId || isNaN(parseInt(organizerId, 10))) {
        throw new ValidationError('organizerId is required and must be a number');
      }
      const tanda = tandaService.cancelTanda(id, parseInt(organizerId, 10));
      res.json(tanda);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Tanda ID must be a number');
      }
      const participants = tandaService.getParticipants(id);
      res.json(participants);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/contributions', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Tanda ID must be a number');
      }
      const validated = recordContributionSchema.parse(req.body);
      const contribution = tandaService.recordContribution(id, validated);
      res.status(201).json(contribution);
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error.errors[0].message));
      } else {
        next(error);
      }
    }
  });

  router.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const round = parseInt(req.params.round as string, 10);
      if (isNaN(id) || isNaN(round)) {
        throw new ValidationError('Tanda ID and round must be numbers');
      }
      const summary = tandaService.getRoundSummary(id, round);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/advance', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('Tanda ID must be a number');
      }
      const organizerId = req.body.organizerId;
      if (!organizerId || isNaN(parseInt(organizerId, 10))) {
        throw new ValidationError('organizerId is required and must be a number');
      }
      const tanda = tandaService.advanceToNextRound(id, parseInt(organizerId, 10));
      res.json(tanda);
    } catch (error) {
      next(error);
    }
  });

  router.get(
    '/:id/participants/:pid/history',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = parseInt(req.params.id as string, 10);
        const pid = parseInt(req.params.pid as string, 10);
        if (isNaN(id) || isNaN(pid)) {
          throw new ValidationError('Tanda ID and participant ID must be numbers');
        }
        const history = tandaService.getParticipantHistory(id, pid);
        res.json(history);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
