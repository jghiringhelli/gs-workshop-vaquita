import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as tandaService from './tanda.service';
import { ForbiddenError } from '../../errors';
import {
  createTandaSchema,
  tandaIdParamSchema,
  tandaRoundParamSchema,
  participantParamSchema,
  listTandasQuerySchema,
} from './tanda.schemas';

const router = Router();

// All tanda routes require authentication.
router.use(authenticate);

/**
 * POST /api/tandas
 * Creates a tanda. The authenticated user becomes the organizer and
 * is automatically added as the first participant.
 */
router.post('/', (req, res, next) => {
  try {
    const input = createTandaSchema.parse(req.body);
    const result = tandaService.createTanda(input, req.userId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tandas
 * Lists tandas for a user.
 * - If ?userId is omitted → lists current user's tandas.
 * - If ?userId differs from current user → 403 Forbidden.
 */
router.get('/', (req, res, next) => {
  try {
    const { userId } = listTandasQuerySchema.parse(req.query);
    const targetUserId = userId ?? req.userId;

    if (userId !== undefined && userId !== req.userId) {
      throw new ForbiddenError('You cannot list tandas for another user');
    }

    const tandas = tandaService.listTandas(targetUserId);
    res.json({ tandas });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tandas/:id
 * Returns tanda details including the participant list.
 */
router.get('/:id', (req, res, next) => {
  try {
    const { id } = tandaIdParamSchema.parse(req.params);
    const result = tandaService.getTanda(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tandas/:id/join
 * Joins the authenticated user to a forming tanda as a member.
 */
router.post('/:id/join', (req, res, next) => {
  try {
    const { id } = tandaIdParamSchema.parse(req.params);
    const participant = tandaService.joinTanda(id, req.userId);
    res.status(201).json({ participant });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tandas/:id/start
 * Starts a tanda (organizer only). Transitions FORMING → ACTIVE.
 * Randomises and locks rotation order.
 */
router.post('/:id/start', (req, res, next) => {
  try {
    const { id } = tandaIdParamSchema.parse(req.params);
    const tanda = tandaService.startTanda(id, req.userId);
    res.json({ tanda });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tandas/:id/cancel
 * Cancels a tanda (organizer only). Allowed from forming or active status.
 */
router.post('/:id/cancel', (req, res, next) => {
  try {
    const { id } = tandaIdParamSchema.parse(req.params);
    const tanda = tandaService.cancelTanda(id, req.userId);
    res.json({ tanda });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tandas/:id/participants
 * Lists participants for a tanda.
 */
router.get('/:id/participants', (req, res, next) => {
  try {
    const { id } = tandaIdParamSchema.parse(req.params);
    const participants = tandaService.getParticipants(id);
    res.json({ participants });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tandas/:id/contributions
 * Records the authenticated user's contribution for the current round.
 * Amount is computed server-side (with penalty if past window).
 */
router.post('/:id/contributions', (req, res, next) => {
  try {
    const { id } = tandaIdParamSchema.parse(req.params);
    const contribution = tandaService.recordContribution(id, req.userId);
    res.status(201).json({ contribution });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tandas/:id/rounds/:round
 * Returns a summary of a specific round: receiver, contribution statuses,
 * total collected, missing count, and whether the window is past.
 */
router.get('/:id/rounds/:round', (req, res, next) => {
  try {
    const { id, round } = tandaRoundParamSchema.parse(req.params);
    const summary = tandaService.getRoundSummary(id, round);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tandas/:id/advance
 * Advances the tanda to the next round (organizer only).
 * Marks any outstanding contributions as 'missed'.
 * Auto-completes the tanda after the final round.
 */
router.post('/:id/advance', (req, res, next) => {
  try {
    const { id } = tandaIdParamSchema.parse(req.params);
    const tanda = tandaService.advanceRound(id, req.userId);
    res.json({ tanda });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tandas/:id/participants/:pid/history
 * Returns contribution history for a specific participant.
 * Organizer can view anyone's history; members can only view their own.
 */
router.get('/:id/participants/:pid/history', (req, res, next) => {
  try {
    const { id, pid } = participantParamSchema.parse(req.params);
    const contributions = tandaService.getContributionHistory(id, pid, req.userId);
    res.json({ contributions });
  } catch (err) {
    next(err);
  }
});

export default router;
