import { Router } from 'express';
import * as tandasService from '../services/tandas.service';
import { ValidationError } from '../errors';

const router = Router();

// POST /api/tandas
router.post('/', (req, res, next) => {
  try {
    const tanda = tandasService.createTanda(req.body);
    res.status(201).json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas?userId=
router.get('/', (req, res, next) => {
  try {
    const userId = parseInt(String(req.query.userId), 10);
    if (isNaN(userId)) {
      next(new ValidationError('userId query param is required and must be a number'));
      return;
    }
    const tandas = tandasService.listTandasForUser(userId);
    res.json(tandas);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id
router.get('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      next(new ValidationError('Invalid tanda id'));
      return;
    }
    const tanda = tandasService.getTandaById(id);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/join
router.post('/:id/join', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      next(new ValidationError('Invalid tanda id'));
      return;
    }
    const participant = tandasService.joinTanda(id, req.body);
    res.status(201).json(participant);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/start
router.post('/:id/start', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      next(new ValidationError('Invalid tanda id'));
      return;
    }
    const tanda = tandasService.startTanda(id, req.body);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/cancel
router.post('/:id/cancel', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      next(new ValidationError('Invalid tanda id'));
      return;
    }
    const tanda = tandasService.cancelTanda(id, req.body);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/participants
router.get('/:id/participants', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      next(new ValidationError('Invalid tanda id'));
      return;
    }
    const participants = tandasService.listParticipants(id);
    res.json(participants);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/contributions
router.post('/:id/contributions', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      next(new ValidationError('Invalid tanda id'));
      return;
    }
    const contribution = tandasService.recordContribution(id, req.body);
    res.status(201).json(contribution);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/rounds/:round
router.get('/:id/rounds/:round', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const round = parseInt(req.params.round, 10);
    if (isNaN(id) || isNaN(round)) {
      next(new ValidationError('Invalid tanda id or round'));
      return;
    }
    const summary = tandasService.getRoundSummary(id, round);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/advance
router.post('/:id/advance', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      next(new ValidationError('Invalid tanda id'));
      return;
    }
    const tanda = tandasService.advanceRound(id, req.body);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/participants/:pid/history
router.get('/:id/participants/:pid/history', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const pid = parseInt(req.params.pid, 10);
    if (isNaN(id) || isNaN(pid)) {
      next(new ValidationError('Invalid tanda id or participant id'));
      return;
    }
    const history = tandasService.getParticipantHistory(id, pid);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
