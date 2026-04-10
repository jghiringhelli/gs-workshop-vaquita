import { Router, type Request, type Response, type NextFunction } from 'express';
import type { TandaService } from './service';
import type { ContributionService } from './contribution.service';
import type { CreateTandaDto, JoinTandaDto, RecordContributionDto } from './types';

/**
 * Creates the /api/tandas Express router.
 * @param tandaService - TandaService instance.
 * @param contributionService - ContributionService instance.
 * @returns Configured Express Router.
 */
export function createTandaRouter(tandaService: TandaService, contributionService: ContributionService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ data: tandaService.create(req.body as CreateTandaDto) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.query['userId'] as string | undefined;
      if (!userId) {
        res.status(422).json({ errors: [{ code: 'VALIDATION', message: 'userId query parameter is required' }] });
        return;
      }
      res.json({ data: tandaService.findByUserId(userId) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ data: tandaService.findById(req.params['id'] as string) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/join', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ data: tandaService.join(req.params['id'] as string, req.body as JoinTandaDto) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/start', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { requesterId } = req.body as { requesterId: string };
      res.json({ data: tandaService.start(req.params['id'] as string, requesterId) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { requesterId } = req.body as { requesterId: string };
      res.json({ data: tandaService.cancel(req.params['id'] as string, requesterId) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/advance', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { requesterId } = req.body as { requesterId: string };
      res.json({ data: tandaService.advance(req.params['id'] as string, requesterId) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ data: tandaService.listParticipants(req.params['id'] as string) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/contributions', (req: Request, res: Response, next: NextFunction) => {
    try {
      res
        .status(201)
        .json({ data: contributionService.record(req.params['id'] as string, req.body as RecordContributionDto) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction) => {
    try {
      const round = parseInt(req.params['round'] as string, 10);
      res.json({ data: contributionService.getRoundSummary(req.params['id'] as string, round) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/participants/:pid/history', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        data: contributionService.getParticipantHistory(
          req.params['id'] as string,
          req.params['pid'] as string,
        ),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
