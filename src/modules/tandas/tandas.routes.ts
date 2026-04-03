import { Router, Response, NextFunction } from 'express';
import { requireAuth } from '../../shared/middleware/auth';
import { AuthRequest } from '../../shared/types';
import { TandasService } from './tandas.service';
import { CreateTandaSchema, RecordContributionSchema } from './tandas.schema';

/**
 * Mounts all tanda routes onto the provided Express Router.
 */
export const createTandasRouter = (service: TandasService): Router => {
  const router = Router();

  /** POST /api/tandas — create a tanda; organizer = authenticated user. */
  router.post('/', requireAuth, (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const dto = CreateTandaSchema.parse(req.body);
      const tanda = service.create(dto, req.user!.id);
      res.status(201).json(tanda);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas?userId= — list tandas (filtered by userId if provided). */
  router.get('/', (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const userId = req.query.userId as string | undefined;
      res.json(service.list(userId));
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id — get tanda details. */
  router.get('/:id', (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      res.json(service.getById(String(req.params.id)));
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/join — join a tanda. */
  router.post('/:id/join', requireAuth, (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const participant = service.join(String(req.params.id), req.user!.id);
      res.status(201).json(participant);
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/start — start a tanda (organizer only). */
  router.post('/:id/start', requireAuth, (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const tanda = service.start(String(req.params.id), req.user!.id);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/cancel — cancel a tanda (organizer only). */
  router.post('/:id/cancel', requireAuth, (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const tanda = service.cancel(String(req.params.id), req.user!.id);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id/participants — list participants. */
  router.get('/:id/participants', (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      res.json(service.listParticipants(String(req.params.id)));
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/contributions — record a contribution. */
  router.post('/:id/contributions', requireAuth, (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const dto = RecordContributionSchema.parse(req.body);
      const contribution = service.recordContribution(String(req.params.id), req.user!.id, dto);
      res.status(201).json(contribution);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id/rounds/:round — round summary. */
  router.get('/:id/rounds/:round', (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const round = parseInt(String(req.params.round), 10);
      if (isNaN(round)) {
        res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Round must be a number' });
        return;
      }
      res.json(service.getRoundSummary(String(req.params.id), round));
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/advance — advance to next round (organizer only). */
  router.post('/:id/advance', requireAuth, (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const tanda = service.advance(String(req.params.id), req.user!.id);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id/participants/:pid/history — contribution history. */
  router.get('/:id/participants/:pid/history', (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const history = service.getParticipantHistory(String(req.params.id), String(req.params.pid));
      res.json(history);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
