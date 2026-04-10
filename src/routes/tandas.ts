import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { tandaService } from '../services/tandaService';
import { contributionService } from '../services/contributionService';
import { ValidationError } from '../errors';

const router = Router();

const CreateTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.string().uuid(),
  contributionAmount: z.number().positive(),
});

const JoinSchema = z.object({ userId: z.string().uuid() });
const ActionSchema = z.object({ requesterId: z.string().uuid() });
const ContributionSchema = z.object({
  participantId: z.string().uuid(),
  amount: z.number().positive(),
  isLate: z.boolean().optional().default(false),
});

function wrap(fn: (req: Request, res: Response, next: NextFunction) => void) {
  return (req: Request, res: Response, next: NextFunction) => {
    try { fn(req, res, next); } catch (err) { next(err); }
  };
}

router.post('/', wrap((req, res) => {
  const { name, organizerId, contributionAmount } = CreateTandaSchema.parse(req.body);
  res.status(201).json(tandaService.createTanda(name, organizerId, contributionAmount));
}));

router.get('/', wrap((req, res) => {
  const userId = req.query.userId as string | undefined;
  res.json(tandaService.listTandas(userId));
}));

router.get('/:id', wrap((req, res) => {
  res.json(tandaService.getTandaById(req.params['id'] as string));
}));

router.post('/:id/join', wrap((req, res) => {
  const { userId } = JoinSchema.parse(req.body);
  res.status(201).json(tandaService.joinTanda(req.params['id'] as string, userId));
}));

router.post('/:id/start', wrap((req, res) => {
  const { requesterId } = ActionSchema.parse(req.body);
  res.json(tandaService.startTanda(req.params['id'] as string, requesterId));
}));

router.post('/:id/cancel', wrap((req, res) => {
  const { requesterId } = ActionSchema.parse(req.body);
  res.json(tandaService.cancelTanda(req.params['id'] as string, requesterId));
}));

router.get('/:id/participants', wrap((req, res) => {
  res.json(tandaService.getParticipants(req.params['id'] as string));
}));

router.post('/:id/contributions', wrap((req, res) => {
  const { participantId, amount, isLate } = ContributionSchema.parse(req.body);
  res.status(201).json(
    contributionService.recordContribution(req.params['id'] as string, participantId, amount, isLate),
  );
}));

router.get('/:id/rounds/:round', wrap((req, res) => {
  const round = parseInt(req.params['round'] as string, 10);
  if (isNaN(round)) throw new ValidationError('round must be a number');
  res.json(contributionService.getRoundSummary(req.params['id'] as string, round));
}));

router.post('/:id/advance', wrap((req, res) => {
  const { requesterId } = ActionSchema.parse(req.body);
  res.json(tandaService.advanceRound(req.params['id'] as string, requesterId));
}));

router.get('/:id/participants/:pid/history', wrap((req, res) => {
  res.json(contributionService.getParticipantHistory(req.params['id'] as string, req.params['pid'] as string));
}));

router.get('/:id/stats', wrap((req, res) => {
  res.json(tandaService.getStats(req.params['id'] as string));
}));

export default router;
