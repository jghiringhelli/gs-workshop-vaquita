import { Router, Request, Response, NextFunction } from 'express';
import { ParticipantService } from './participant.service';
import { validate } from '../middleware/validate';
import { joinTandaSchema } from './participant.schemas';

/**
 * Creates the Express router for participant sub-routes under /api/tandas.
 * Mounted at /api/tandas so routes are:
 *   POST  /api/tandas/:tandaId/join
 *   GET   /api/tandas/:tandaId/participants
 *
 * @param participantService - Injected service instance
 * @returns Configured Express Router
 */
export function createParticipantRouter(participantService: ParticipantService): Router {
  const router = Router();

  /** POST /api/tandas/:tandaId/join — join a forming tanda as a member */
  router.post(
    '/:tandaId/join',
    validate(joinTandaSchema),
    (req: Request<{ tandaId: string }>, res: Response, next: NextFunction): void => {
      try {
        const { userId } = req.body as { userId: string };
        const participant = participantService.joinTanda(req.params.tandaId, userId);
        res.status(201).json({ data: participant });
      } catch (err) {
        next(err);
      }
    },
  );

  /** GET /api/tandas/:tandaId/participants — list all participants in a tanda */
  router.get(
    '/:tandaId/participants',
    (req: Request<{ tandaId: string }>, res: Response, next: NextFunction): void => {
      try {
        const participants = participantService.listParticipants(req.params.tandaId);
        res.json({ data: participants, meta: { total: participants.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
