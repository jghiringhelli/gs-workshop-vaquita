import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { TandaService } from '../services/TandaService';
import { ContributionService } from '../services/ContributionService';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import {
  CreateTandaSchema,
  JoinTandaSchema,
  RecordContributionSchema,
} from '../validators/tanda.validator';
import { ValidationError } from '../errors/AppError';

export function createTandasRouter(
  tandaService: TandaService,
  contributionService: ContributionService,
): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = CreateTandaSchema.parse(req.body);
      res.status(201).json(tandaService.createTanda(dto));
    } catch (err) {
      next(err);
    }
  });

  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) throw new ValidationError('userId query parameter is required');
      res.json(tandaService.listTandas(userId));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(tandaService.getTanda(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/join', (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = JoinTandaSchema.parse(req.body);
      res.status(201).json(tandaService.joinTanda(req.params.id, dto));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/start', requireAuth, (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      res.json(tandaService.startTanda(req.params.id, req.userId!));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/cancel', requireAuth, (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      res.json(tandaService.cancelTanda(req.params.id, req.userId!));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(tandaService.listParticipants(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/contributions', (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = RecordContributionSchema.parse(req.body);
      res.status(201).json(contributionService.recordContribution(req.params.id, dto));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction) => {
    try {
      const round = Number(req.params.round);
      if (!Number.isInteger(round) || round < 1) throw new ValidationError('round must be a positive integer');
      res.json(tandaService.getRoundSummary(req.params.id, round));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/advance', requireAuth, (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      res.json(tandaService.advanceRound(req.params.id, req.userId!));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/participants/:pid/history', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(contributionService.getParticipantHistory(req.params.id, req.params.pid));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
