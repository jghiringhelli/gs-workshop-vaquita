import { Router, Request, Response, NextFunction } from 'express';
import { TandaService } from '../service/TandaService';
import { ContributionService } from '../service/ContributionService';
import { AdvanceService } from '../service/AdvanceService';
import { handleZodError } from '../../../shared/middleware/handleZodError';

/**
 * Mounts tanda, contribution and advance routes onto the given router.
 * @param tandaService - Injected tanda service.
 * @param contributionService - Injected contribution service.
 * @param advanceService - Injected advance service.
 * @returns Configured router.
 */
export function createTandaRouter(
  tandaService: TandaService,
  contributionService: ContributionService,
  advanceService: AdvanceService,
): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const tanda = tandaService.createTanda(req.body);
      res.status(201).json(tanda);
    } catch (err) { handleZodError(err, next); }
  });

  router.get('/:id', (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const tanda = tandaService.getTandaById(req.params.id);
      res.json(tanda);
    } catch (err) { next(err); }
  });

  router.post('/:id/join', (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const participant = tandaService.joinTanda(req.params.id, req.body);
      res.status(201).json(participant);
    } catch (err) { handleZodError(err, next); }
  });

  router.post('/:id/start', (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const tanda = tandaService.startTanda(req.params.id, req.body);
      res.json(tanda);
    } catch (err) { handleZodError(err, next); }
  });

  router.post('/:id/advance', (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const tanda = advanceService.advanceRound(req.params.id, req.body);
      res.json(tanda);
    } catch (err) { handleZodError(err, next); }
  });

  router.get('/:id/participants', (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const participants = tandaService.getParticipants(req.params.id);
      res.json(participants);
    } catch (err) { next(err); }
  });

  router.post('/:id/contributions', (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const contribution = contributionService.recordContribution(req.params.id, req.body);
      res.status(201).json(contribution);
    } catch (err) { handleZodError(err, next); }
  });

  router.get('/:id/rounds/:round', (req: Request<{ id: string; round: string }>, res: Response, next: NextFunction) => {
    try {
      const round = parseInt(req.params.round, 10);
      const summary = contributionService.getRoundSummary(req.params.id, round);
      res.json(summary);
    } catch (err) { next(err); }
  });

  router.get('/:id/participants/:pid/history', (req: Request<{ id: string; pid: string }>, res: Response, next: NextFunction) => {
    try {
      const history = contributionService.getParticipantHistory(req.params.id, req.params.pid);
      res.json(history);
    } catch (err) { next(err); }
  });

  return router;
}
