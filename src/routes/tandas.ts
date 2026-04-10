import { Router, Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import { verifyToken } from '../middleware/auth';
import * as tandaService from '../services/tandaService';
import * as contributionService from '../services/contributionService';
import { UnauthorizedError } from '../errors/AppError';

export function createTandasRouter(db?: Database.Database): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const tanda = tandaService.createTanda(req.body, db);
      res.status(201).json(tanda);
    } catch (err) {
      next(err);
    }
  });

  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId as string | undefined;
      const tandas = tandaService.listTandas(userId, db);
      res.json(tandas);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const tanda = tandaService.getTandaById(req.params.id as string, db);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/join', verifyToken, (req: Request, res: Response, next: NextFunction) => {
    try {
      const participant = tandaService.joinTanda(req.params.id as string, req.body, db);
      res.status(201).json(participant);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/start', verifyToken, (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const tanda = tandaService.startTanda(req.params.id as string, req.user.userId, db);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/cancel', verifyToken, (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const tanda = tandaService.cancelTanda(req.params.id as string, req.user.userId, db);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
    try {
      const participants = tandaService.listParticipants(req.params.id as string, db);
      res.json(participants);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/:id/contributions',
    verifyToken,
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const contribution = contributionService.recordContribution(req.params.id as string, req.body, db);
        res.status(201).json(contribution);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction) => {
    try {
      const round = parseInt(req.params.round as string, 10);
      if (isNaN(round)) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid round number' } });
        return;
      }
      const summary = contributionService.getRoundSummary(req.params.id as string, round, db);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/advance', verifyToken, (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const tanda = tandaService.advanceRound(req.params.id as string, req.user.userId, db);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/:id/participants/:pid/history',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const history = contributionService.getParticipantHistory(
          req.params.pid as string,
          req.params.id as string,
          db,
        );
        res.json(history);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
