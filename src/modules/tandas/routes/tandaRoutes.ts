import { Router, Request, Response, NextFunction } from 'express';
import { TandaService } from '../service/TandaService';
import { ContributionService } from '../service/ContributionService';
import { handleZodError } from '../../../shared/middleware/handleZodError';

/**
 * Mounts tanda and contribution routes onto the given router.
 * @param tandaService - Injected tanda service.
 * @param contributionService - Injected contribution service.
 * @returns Configured router.
 */
export function createTandaRouter(
  tandaService: TandaService,
  contributionService: ContributionService,
): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const tanda = tandaService.createTanda(req.body);
      res.status(201).json(tanda);
    } catch (err) { handleZodError(err, next); }
  });

  router.post('/:id/join', (req: Request, res: Response, next: NextFunction) => {
    try {
      const participant = tandaService.joinTanda(req.params.id, req.body);
      res.status(201).json(participant);
    } catch (err) { handleZodError(err, next); }
  });

  router.post('/:id/start', (req: Request, res: Response, next: NextFunction) => {
    try {
      const tanda = tandaService.startTanda(req.params.id, req.body);
      res.json(tanda);
    } catch (err) { handleZodError(err, next); }
  });

  router.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
    try {
      const participants = tandaService.getParticipants(req.params.id);
      res.json(participants);
    } catch (err) { next(err); }
  });

  router.post('/:id/contributions', (req: Request, res: Response, next: NextFunction) => {
    try {
      const contribution = contributionService.recordContribution(req.params.id, req.body);
      res.status(201).json(contribution);
    } catch (err) { handleZodError(err, next); }
  });

  router.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction) => {
    try {
      const round = parseInt(req.params.round, 10);
      const summary = contributionService.getRoundSummary(req.params.id, round);
      res.json(summary);
    } catch (err) { next(err); }
  });

  router.get('/:id/participants/:pid/history', (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = contributionService.getParticipantHistory(req.params.id, req.params.pid);
      res.json(history);
    } catch (err) { next(err); }
  });

  return router;
}
