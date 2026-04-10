import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import type { TandasService } from '../services/tandasService';
import { validate } from '../utils/validate';
import { CreateTandaSchema } from '../validation/tandas';
import { BadRequestError } from '../errors';

export function createTandasRouter(tandasService: TandasService): Router {
  const router = Router();

  // All tanda routes require a valid JWT
  router.use(requireAuth);

  /** POST /api/tandas — create a tanda; caller becomes organizer */
  router.post('/', (req, res, next) => {
    try {
      const data = validate(CreateTandaSchema, req.body);
      res.status(201).json(tandasService.createTanda(req.user!.userId, data));
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas[?userId=] — list tandas (filter by participant) */
  router.get('/', (req, res, next) => {
    try {
      const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
      res.json(tandasService.listTandas(userId));
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id */
  router.get('/:id', (req, res, next) => {
    try {
      res.json(tandasService.getTanda(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/join — join as member */
  router.post('/:id/join', (req, res, next) => {
    try {
      res.status(201).json(tandasService.joinTanda(req.params.id, req.user!.userId));
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/start — organizer: FORMING → ACTIVE */
  router.post('/:id/start', (req, res, next) => {
    try {
      res.json(tandasService.startTanda(req.params.id, req.user!.userId));
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/cancel — organizer: any → CANCELLED */
  router.post('/:id/cancel', (req, res, next) => {
    try {
      res.json(tandasService.cancelTanda(req.params.id, req.user!.userId));
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id/participants */
  router.get('/:id/participants', (req, res, next) => {
    try {
      res.json(tandasService.getParticipants(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/contributions — record contribution for current round */
  router.post('/:id/contributions', (req, res, next) => {
    try {
      res.status(201).json(tandasService.recordContribution(req.params.id, req.user!.userId));
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id/rounds/:round — round summary */
  router.get('/:id/rounds/:round', (req, res, next) => {
    try {
      const round = parseInt(req.params.round, 10);
      if (isNaN(round) || round < 1) throw new BadRequestError('Round must be a positive integer');
      res.json(tandasService.getRoundSummary(req.params.id, round));
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/advance — organizer: increment round */
  router.post('/:id/advance', (req, res, next) => {
    try {
      res.json(tandasService.advanceRound(req.params.id, req.user!.userId));
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id/participants/:pid/history */
  router.get('/:id/participants/:pid/history', (req, res, next) => {
    try {
      res.json(tandasService.getParticipantHistory(req.params.id, req.params.pid));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
