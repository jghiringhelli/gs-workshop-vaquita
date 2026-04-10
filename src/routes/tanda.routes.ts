import { Router, Request, Response, NextFunction } from 'express';
import { authRequired, optionalAuth } from '../middleware/auth';
import { createTandaSchema } from '../schemas/tanda.schemas';
import { createContributionSchema } from '../schemas/contribution.schemas';
import * as tandaService from '../services/tanda.service';
import * as contributionService from '../services/contribution.service';
import { AuthenticationError } from '../errors/errors';

const router = Router();

function paramInt(val: string | string[]): number {
  return parseInt(String(val), 10);
}

// POST /api/tandas — create tanda
router.post('/', optionalAuth, (req: Request, res: Response, next: NextFunction): void => {
  try {
    const data = createTandaSchema.parse(req.body);
    const userId = req.userId ?? data.organizerId;
    if (!userId) {
      throw new AuthenticationError('User ID required via token or organizerId');
    }
    const tanda = tandaService.createTanda(userId, data.name, data.contributionAmount, data.totalRounds);
    res.status(201).json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas — list tandas
router.get('/', optionalAuth, (req: Request, res: Response, next: NextFunction): void => {
  try {
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : undefined;
    const tandas = tandaService.listTandas(userId);
    res.json(tandas);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id — get tanda details
router.get('/:id', optionalAuth, (req: Request, res: Response, next: NextFunction): void => {
  try {
    const id = paramInt(req.params.id);
    const tanda = tandaService.getTandaById(id);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/join — join tanda
router.post('/:id/join', authRequired, (req: Request, res: Response, next: NextFunction): void => {
  try {
    const tandaId = paramInt(req.params.id);
    const participant = tandaService.joinTanda(req.userId!, tandaId);
    res.status(200).json(participant);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/start — start tanda
router.post('/:id/start', authRequired, (req: Request, res: Response, next: NextFunction): void => {
  try {
    const tandaId = paramInt(req.params.id);
    const tanda = tandaService.startTanda(req.userId!, tandaId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/cancel — cancel tanda
router.post('/:id/cancel', authRequired, (req: Request, res: Response, next: NextFunction): void => {
  try {
    const tandaId = paramInt(req.params.id);
    const tanda = tandaService.cancelTanda(req.userId!, tandaId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/participants — list participants
router.get('/:id/participants', optionalAuth, (req: Request, res: Response, next: NextFunction): void => {
  try {
    const tandaId = paramInt(req.params.id);
    const participants = tandaService.getParticipants(tandaId);
    res.json(participants);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/contributions — record contribution
router.post('/:id/contributions', authRequired, (req: Request, res: Response, next: NextFunction): void => {
  try {
    const tandaId = paramInt(req.params.id);
    const data = createContributionSchema.parse(req.body);
    const contribution = contributionService.recordContribution(
      tandaId,
      req.userId!,
      data.participantId,
      data.amount,
      data.status
    );
    res.status(201).json(contribution);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/rounds/:round — round summary
router.get('/:id/rounds/:round', optionalAuth, (req: Request, res: Response, next: NextFunction): void => {
  try {
    const tandaId = paramInt(req.params.id);
    const round = paramInt(req.params.round);
    const summary = contributionService.getRoundSummary(tandaId, round);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/advance — advance round
router.post('/:id/advance', authRequired, (req: Request, res: Response, next: NextFunction): void => {
  try {
    const tandaId = paramInt(req.params.id);
    const tanda = tandaService.advanceRound(req.userId!, tandaId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/participants/:pid/history — contribution history
router.get('/:id/participants/:pid/history', optionalAuth, (req: Request, res: Response, next: NextFunction): void => {
  try {
    const tandaId = paramInt(req.params.id);
    const participantId = paramInt(req.params.pid);
    const history = contributionService.getParticipantHistory(tandaId, participantId);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
