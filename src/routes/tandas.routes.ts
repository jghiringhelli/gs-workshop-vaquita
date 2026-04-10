import { Router } from 'express';
import type { TandasService } from '../services/tandas.service';
import type { ContributionsService } from '../services/contributions.service';

export function createTandasRouter(
  tandasService: TandasService,
  contributionsService: ContributionsService,
): Router {
  const router = Router();

  router.get('/', (req, res, next) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      res.json(tandasService.listTandas(userId));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req, res, next) => {
    try {
      res.json(tandasService.getTandaById(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req, res, next) => {
    try {
      res.status(201).json(tandasService.createTanda(req.body));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/join', (req, res, next) => {
    try {
      res.status(201).json(tandasService.joinTanda(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/start', (req, res, next) => {
    try {
      res.json(tandasService.startTanda(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/cancel', (req, res, next) => {
    try {
      res.json(tandasService.cancelTanda(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/participants', (req, res, next) => {
    try {
      res.json(tandasService.listParticipants(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/contributions', (req, res, next) => {
    try {
      res.status(201).json(contributionsService.recordContribution(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/rounds/:round', (req, res, next) => {
    try {
      res.json(contributionsService.getRoundSummary(Number(req.params.id), Number(req.params.round)));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/advance', (req, res, next) => {
    try {
      res.json(tandasService.advanceRound(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/participants/:pid/history', (req, res, next) => {
    try {
      res.json(contributionsService.getParticipantHistory(Number(req.params.id), Number(req.params.pid)));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
