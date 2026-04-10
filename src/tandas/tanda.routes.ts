import { Router, Request, Response, NextFunction } from 'express';
import { TandaService } from './tanda.service';
import { validate } from '../middleware/validate';
import { createTandaSchema, listTandasQuerySchema, startTandaSchema, cancelTandaSchema } from './tanda.schemas';

/**
 * Creates the Express router for /api/tandas (CRUD only).
 * Thin layer: validates input, delegates to service, serialises response.
 * No SQL or business logic here.
 *
 * @param tandaService - Injected service instance
 * @returns Configured Express Router
 */
export function createTandaRouter(tandaService: TandaService): Router {
  const router = Router();

  /** POST /api/tandas — create a tanda (organizer auto-joins as first participant) */
  router.post('/', validate(createTandaSchema), (req: Request, res: Response, next: NextFunction): void => {
    try {
      const tanda = tandaService.createTanda(req.body as { name: string; organizerId: string; contributionAmount: number });
      res.status(201).json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas?userId= — list tandas for a user (userId required) */
  router.get('/', validate(listTandasQuerySchema, 'query'), (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { userId } = req.query as { userId: string };
      const tandas = tandaService.listTandasForUser(userId);
      res.json({ data: tandas, meta: { total: tandas.length } });
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/tandas/:id — get a single tanda by ID */
  router.get('/:id', (req: Request<{ id: string }>, res: Response, next: NextFunction): void => {
    try {
      const tanda = tandaService.getTandaById(req.params.id);
      res.json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/start — organizer starts the tanda (assigns rotation) */
  router.post('/:id/start', validate(startTandaSchema), (req: Request<{ id: string }>, res: Response, next: NextFunction): void => {
    try {
      const { requesterId } = req.body as { requesterId: string };
      const tanda = tandaService.startTanda(req.params.id, requesterId);
      res.json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/tandas/:id/cancel — organizer cancels the tanda */
  router.post('/:id/cancel', validate(cancelTandaSchema), (req: Request<{ id: string }>, res: Response, next: NextFunction): void => {
    try {
      const { requesterId } = req.body as { requesterId: string };
      const tanda = tandaService.cancelTanda(req.params.id, requesterId);
      res.json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
