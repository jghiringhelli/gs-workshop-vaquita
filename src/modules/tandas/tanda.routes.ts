import { Router } from 'express';
import { TandaService } from './tanda.service.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  CreateTandaSchema,
  JoinTandaSchema,
  StartTandaSchema,
  CancelTandaSchema,
  RecordContributionSchema,
  AdvanceRoundSchema,
} from './tanda.schema.js';
import { ValidationError } from '../../shared/exceptions/index.js';

/**
 * Builds and returns the /api/tandas router.
 * @param service - TandaService instance
 * @returns Configured Express Router
 */
export function buildTandaRouter(service: TandaService): Router {
  const router = Router();

  /**
   * Normalizes a route param to a single string.
   * @param value - Raw param value from Express
   * @param name - Param name for error message
   * @returns Normalized param string
   */
  function requireParam(value: string | string[] | undefined, name: string): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    throw new ValidationError(`Route param '${name}' is required`);
  }

  /** POST /api/tandas — create a tanda */
  router.post('/', validate(CreateTandaSchema), (req, res, next) => {
    try {
      const tanda = service.create(req.body);
      res.status(201).json(tanda);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas?userId= — list tandas for a user */
  router.get('/', (req, res, next) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Query param userId is required');
      }
      res.json(service.findByUserId(userId));
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id — get tanda details */
  router.get('/:id', (req, res, next) => {
    try {
      res.json(service.findById(req.params['id']!));
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/join — join a tanda */
  router.post('/:id/join', validate(JoinTandaSchema), (req, res, next) => {
    try {
      const tandaId = requireParam(req.params['id'], 'id');
      const participant = service.join(tandaId, req.body);
      res.status(201).json(participant);
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/start — start a tanda (organizer only) */
  router.post('/:id/start', validate(StartTandaSchema), (req, res, next) => {
    try {
      const tandaId = requireParam(req.params['id'], 'id');
      const tanda = service.start(tandaId, req.body);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/cancel — cancel a tanda (organizer only) */
  router.post('/:id/cancel', validate(CancelTandaSchema), (req, res, next) => {
    try {
      const tandaId = requireParam(req.params['id'], 'id');
      const tanda = service.cancel(tandaId, req.body);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id/participants — list participants */
  router.get('/:id/participants', (req, res, next) => {
    try {
      res.json(service.listParticipants(req.params['id']!));
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/contributions — record a contribution */
  router.post('/:id/contributions', validate(RecordContributionSchema), (req, res, next) => {
    try {
      const tandaId = requireParam(req.params['id'], 'id');
      const contribution = service.recordContribution(tandaId, req.body);
      res.status(201).json(contribution);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id/rounds/:round — round summary */
  router.get('/:id/rounds/:round', (req, res, next) => {
    try {
      const round = parseInt(req.params['round']!, 10);
      if (isNaN(round) || round < 1) throw new ValidationError('Round must be a positive integer');
      res.json(service.getRoundSummary(req.params['id']!, round));
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/advance — advance to next round (organizer only) */
  router.post('/:id/advance', validate(AdvanceRoundSchema), (req, res, next) => {
    try {
      const tandaId = requireParam(req.params['id'], 'id');
      const tanda = service.advanceRound(tandaId, req.body);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id/participants/:pid/history — contribution history */
  router.get('/:id/participants/:pid/history', (req, res, next) => {
    try {
      res.json(service.getParticipantHistory(req.params['id']!, req.params['pid']!));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

