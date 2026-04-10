import { Router, type Response } from 'express';
import { z } from 'zod';
import * as tandaService from '../services/tanda.service';
import * as contributionService from '../services/contribution.service';

const router = Router();

// ── Schemas ─────────────────────────────────────────────────────────────────

const CreateTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.string().uuid(),
  contributionAmount: z.number().positive(),
});

const JoinTandaSchema = z.object({
  userId: z.string().uuid(),
});

const RequesterSchema = z.object({
  requesterId: z.string().uuid(),
});

const ContributionSchema = z.object({
  participantId: z.string().uuid(),
  amount: z.number().positive(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function validate<T>(schema: z.ZodSchema<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return null;
  }
  return result.data;
}

// ── Tanda CRUD ───────────────────────────────────────────────────────────────

router.post('/', (req, res, next) => {
  const data = validate(CreateTandaSchema, req.body, res);
  if (!data) return;
  try {
    res.status(201).json(tandaService.createTanda(data.name, data.organizerId, data.contributionAmount));
  } catch (err) {
    next(err);
  }
});

router.get('/', (req, res, next) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId query param is required' });
    return;
  }
  try {
    res.json(tandaService.listTandas(userId));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    res.json(tandaService.getTanda(req.params.id));
  } catch (err) {
    next(err);
  }
});

// ── Lifecycle ────────────────────────────────────────────────────────────────

router.post('/:id/join', (req, res, next) => {
  const data = validate(JoinTandaSchema, req.body, res);
  if (!data) return;
  try {
    res.status(201).json(tandaService.joinTanda(req.params.id, data.userId));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start', (req, res, next) => {
  const data = validate(RequesterSchema, req.body, res);
  if (!data) return;
  try {
    res.json(tandaService.startTanda(req.params.id, data.requesterId));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', (req, res, next) => {
  const data = validate(RequesterSchema, req.body, res);
  if (!data) return;
  try {
    res.json(tandaService.cancelTanda(req.params.id, data.requesterId));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/advance', (req, res, next) => {
  const data = validate(RequesterSchema, req.body, res);
  if (!data) return;
  try {
    res.json(tandaService.advanceTanda(req.params.id, data.requesterId));
  } catch (err) {
    next(err);
  }
});

// ── Participants ─────────────────────────────────────────────────────────────

router.get('/:id/participants', (req, res, next) => {
  try {
    res.json(tandaService.listParticipants(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/participants/:pid/history', (req, res, next) => {
  try {
    res.json(contributionService.getParticipantHistory(req.params.id, req.params.pid));
  } catch (err) {
    next(err);
  }
});

// ── Contributions & Rounds ───────────────────────────────────────────────────

router.post('/:id/contributions', (req, res, next) => {
  const data = validate(ContributionSchema, req.body, res);
  if (!data) return;
  try {
    res.status(201).json(contributionService.recordContribution(req.params.id, data.participantId, data.amount));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/rounds/:round', (req, res, next) => {
  const round = parseInt(req.params.round, 10);
  if (isNaN(round)) {
    res.status(400).json({ error: 'round must be a number' });
    return;
  }
  try {
    res.json(contributionService.getRoundSummary(req.params.id, round));
  } catch (err) {
    next(err);
  }
});

export default router;
