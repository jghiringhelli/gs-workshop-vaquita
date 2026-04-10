import { Router, Request, Response, NextFunction } from 'express';
import { TandaService } from '../service/TandaService';
import { ZodError } from 'zod';
import { ValidationError } from '../../../shared/exceptions/AppError';

/**
 * Mounts tanda routes onto the given router.
 * @param tandaService - Injected tanda service.
 * @returns Configured router.
 */
export function createTandaRouter(tandaService: TandaService): Router {
  const router = Router();

  const handleZod = (err: unknown, next: NextFunction) => {
    if (err instanceof ZodError) next(new ValidationError(err.errors[0]?.message ?? 'Invalid input'));
    else next(err);
  };

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const tanda = tandaService.createTanda(req.body);
      res.status(201).json(tanda);
    } catch (err) { handleZod(err, next); }
  });

  router.post('/:id/join', (req: Request, res: Response, next: NextFunction) => {
    try {
      const participant = tandaService.joinTanda(req.params.id, req.body);
      res.status(201).json(participant);
    } catch (err) { handleZod(err, next); }
  });

  router.post('/:id/start', (req: Request, res: Response, next: NextFunction) => {
    try {
      const tanda = tandaService.startTanda(req.params.id, req.body);
      res.json(tanda);
    } catch (err) { handleZod(err, next); }
  });

  router.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
    try {
      const participants = tandaService.getParticipants(req.params.id);
      res.json(participants);
    } catch (err) { next(err); }
  });

  return router;
}
