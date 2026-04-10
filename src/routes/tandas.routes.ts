import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as tandasService from '../services/tandas.service';

const router = Router();

const createTandaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  organizerId: z.number().int().positive('Organizer ID must be a positive integer'),
  contributionAmount: z.number().positive('Contribution amount must be positive'),
});

const joinTandaSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
});

const startCancelSchema = z.object({
  organizerId: z.number().int().positive('Organizer ID must be a positive integer'),
});

const contributionSchema = z.object({
  participantId: z.number().int().positive('Participant ID must be a positive integer'),
  amount: z.number().positive('Amount must be positive'),
  isLate: z.boolean().optional().default(false),
});

const advanceSchema = z.object({
  organizerId: z.number().int().positive('Organizer ID must be a positive integer'),
});

// POST /api/tandas — Create a tanda
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, organizerId, contributionAmount } = createTandaSchema.parse(req.body);
    const tanda = tandasService.createTanda(name, organizerId, contributionAmount);
    res.status(201).json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas — List tandas
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
    const tandas = tandasService.getTandas(userId);
    res.json(tandas);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id — Get tanda details
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid tanda ID' });
      return;
    }
    const tanda = tandasService.getTandaById(id);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/join — Join a tanda
router.post('/:id/join', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(String(req.params.id), 10);
    const { userId } = joinTandaSchema.parse(req.body);
    const participant = tandasService.joinTanda(tandaId, userId);
    res.status(200).json(participant);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/start — Start a tanda
router.post('/:id/start', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(String(req.params.id), 10);
    const { organizerId } = startCancelSchema.parse(req.body);
    const tanda = tandasService.startTanda(tandaId, organizerId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/cancel — Cancel a tanda
router.post('/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(String(req.params.id), 10);
    const { organizerId } = startCancelSchema.parse(req.body);
    const tanda = tandasService.cancelTanda(tandaId, organizerId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/participants — List participants
router.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(String(req.params.id), 10);
    const participants = tandasService.getParticipants(tandaId);
    res.json(participants);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/contributions — Record a contribution
router.post('/:id/contributions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(String(req.params.id), 10);
    const { participantId, amount, isLate } = contributionSchema.parse(req.body);
    const contribution = tandasService.recordContribution(tandaId, participantId, amount, isLate);
    res.status(201).json(contribution);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/rounds/:round — Round summary
router.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(String(req.params.id), 10);
    const round = parseInt(String(req.params.round), 10);
    if (isNaN(round)) {
      res.status(400).json({ error: 'Invalid round number' });
      return;
    }
    const summary = tandasService.getRoundSummary(tandaId, round);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/advance — Advance to next round
router.post('/:id/advance', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(String(req.params.id), 10);
    const { organizerId } = advanceSchema.parse(req.body);
    const tanda = tandasService.advanceRound(tandaId, organizerId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/participants/:pid/history — Participant contribution history
router.get('/:id/participants/:pid/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(String(req.params.id), 10);
    const pid = parseInt(String(req.params.pid), 10);
    if (isNaN(pid)) {
      res.status(400).json({ error: 'Invalid participant ID' });
      return;
    }
    const history = tandasService.getParticipantHistory(tandaId, pid);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
