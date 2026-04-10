import { Router, Request, Response, NextFunction } from 'express';
import { TandaService } from '../services/TandaService';
import { ContributionService } from '../services/ContributionService';
import {
  createTandaSchema,
  joinTandaSchema,
  organizerActionSchema,
  recordContributionSchema,
} from '../schemas';
import { ValidationError } from '../errors';

// Express v5 types allow string | string[] for params; helper ensures string
const s = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

export function createTandasRouter(
  tandaService: TandaService,
  contributionService: ContributionService,
): Router {
  const router = Router();

  // POST /api/tandas
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createTandaSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      const tanda = tandaService.createTanda(parsed.data);
      res.status(201).json(tanda);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/tandas?userId=
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) throw new ValidationError('userId query parameter is required');
      res.json(tandaService.listTandas(userId));
    } catch (err) {
      next(err);
    }
  });

  // GET /api/tandas/:id
  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(tandaService.getTanda(s(req.params.id)));
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tandas/:id/join
  router.post('/:id/join', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = joinTandaSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      const participant = tandaService.joinTanda(s(req.params.id), parsed.data.userId);
      res.status(201).json(participant);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tandas/:id/start
  router.post('/:id/start', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = organizerActionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      res.json(tandaService.startTanda(s(req.params.id), parsed.data.organizerId));
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tandas/:id/cancel
  router.post('/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = organizerActionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      res.json(tandaService.cancelTanda(s(req.params.id), parsed.data.organizerId));
    } catch (err) {
      next(err);
    }
  });

  // GET /api/tandas/:id/participants
  router.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(tandaService.listParticipants(s(req.params.id)));
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tandas/:id/contributions
  router.post('/:id/contributions', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = recordContributionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      const contribution = contributionService.recordContribution(s(req.params.id), parsed.data);
      res.status(201).json(contribution);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/tandas/:id/rounds/:round
  router.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction) => {
    try {
      const round = parseInt(s(req.params.round), 10);
      if (isNaN(round)) throw new ValidationError('Round must be a valid number');
      res.json(contributionService.getRoundSummary(s(req.params.id), round));
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tandas/:id/advance
  router.post('/:id/advance', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = organizerActionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      res.json(tandaService.advanceRound(s(req.params.id), parsed.data.organizerId));
    } catch (err) {
      next(err);
    }
  });

  // GET /api/tandas/:id/participants/:pid/history
  router.get(
    '/:id/participants/:pid/history',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(
          contributionService.getParticipantHistory(s(req.params.id), s(req.params.pid)),
        );
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

