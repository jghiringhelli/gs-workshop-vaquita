import { Router } from 'express';
import { ValidationError } from '../errors';
import * as tandaService from '../services/tandaService';

const router = Router();

router.post('/', (req, res, next) => {
  try {
    const parsed = tandaService.CreateTandaSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);
    res.status(201).json(tandaService.createTanda(parsed.data));
  } catch (err) {
    next(err);
  }
});

router.get('/', (req, res, next) => {
  try {
    const userId = parseInt(String(req.query.userId), 10);
    if (isNaN(userId)) throw new ValidationError('userId query param is required');
    res.json(tandaService.listTandas(userId));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    res.json(tandaService.getTanda(parseInt(req.params.id, 10)));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join', (req, res, next) => {
  try {
    const parsed = tandaService.JoinTandaSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);
    res.status(201).json(tandaService.joinTanda(parseInt(req.params.id, 10), parsed.data));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start', (req, res, next) => {
  try {
    const userId = parseInt(String(req.body.userId), 10);
    if (isNaN(userId)) throw new ValidationError('userId is required');
    res.json(tandaService.startTanda(parseInt(req.params.id, 10), userId));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', (req, res, next) => {
  try {
    const userId = parseInt(String(req.body.userId), 10);
    if (isNaN(userId)) throw new ValidationError('userId is required');
    res.json(tandaService.cancelTanda(parseInt(req.params.id, 10), userId));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/participants', (req, res, next) => {
  try {
    res.json(tandaService.listParticipants(parseInt(req.params.id, 10)));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/contributions', (req, res, next) => {
  try {
    const parsed = tandaService.RecordContributionSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);
    res.status(201).json(tandaService.recordContribution(parseInt(req.params.id, 10), parsed.data));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/rounds/:round', (req, res, next) => {
  try {
    const round = parseInt(req.params.round, 10);
    if (isNaN(round)) throw new ValidationError('Invalid round number');
    res.json(tandaService.getRoundSummary(parseInt(req.params.id, 10), round));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/advance', (req, res, next) => {
  try {
    const userId = parseInt(String(req.body.userId), 10);
    if (isNaN(userId)) throw new ValidationError('userId is required');
    res.json(tandaService.advanceRound(parseInt(req.params.id, 10), userId));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/participants/:pid/history', (req, res, next) => {
  try {
    res.json(
      tandaService.getParticipantHistory(
        parseInt(req.params.id, 10),
        parseInt(req.params.pid, 10)
      )
    );
  } catch (err) {
    next(err);
  }
});

export default router;
