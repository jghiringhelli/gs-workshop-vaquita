import { Router } from 'express';
import { z } from 'zod';
import * as tandaService from '../services/tandaService';
import * as contributionService from '../services/contributionService';
import { validate } from '../middleware/validate';

export const tandasRouter = Router();

const CreateTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.number().int().positive(),
  contributionAmount: z.number().positive(),
});

const JoinTandaSchema = z.object({
  userId: z.number().int().positive(),
});

const StartTandaSchema = z.object({
  organizerId: z.number().int().positive(),
});

const CancelTandaSchema = z.object({
  organizerId: z.number().int().positive(),
});

const AdvanceRoundSchema = z.object({
  organizerId: z.number().int().positive(),
});

const RecordContributionSchema = z.object({
  participantId: z.number().int().positive(),
  amount: z.number().positive(),
});

tandasRouter.post('/', (req, res, next) => {
  try {
    const data = validate(CreateTandaSchema, req.body);
    const tanda = tandaService.createTanda(data);
    res.status(201).json(tanda);
  } catch (err) {
    next(err);
  }
});

tandasRouter.get('/', (req, res, next) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const tandas = tandaService.listTandas(userId);
    res.json(tandas);
  } catch (err) {
    next(err);
  }
});

tandasRouter.get('/:id', (req, res, next) => {
  try {
    const tanda = tandaService.getTanda(Number(req.params.id));
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

tandasRouter.post('/:id/join', (req, res, next) => {
  try {
    const data = validate(JoinTandaSchema, req.body);
    const participant = tandaService.joinTanda(Number(req.params.id), data.userId);
    res.status(201).json(participant);
  } catch (err) {
    next(err);
  }
});

tandasRouter.post('/:id/start', (req, res, next) => {
  try {
    const data = validate(StartTandaSchema, req.body);
    const tanda = tandaService.startTanda(Number(req.params.id), data.organizerId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

tandasRouter.post('/:id/cancel', (req, res, next) => {
  try {
    const data = validate(CancelTandaSchema, req.body);
    const tanda = tandaService.cancelTanda(Number(req.params.id), data.organizerId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

tandasRouter.get('/:id/participants', (req, res, next) => {
  try {
    const participants = tandaService.getTandaParticipants(Number(req.params.id));
    res.json(participants);
  } catch (err) {
    next(err);
  }
});

tandasRouter.post('/:id/contributions', (req, res, next) => {
  try {
    const data = validate(RecordContributionSchema, req.body);
    const contribution = contributionService.recordContribution(Number(req.params.id), data.participantId, data.amount);
    res.status(201).json(contribution);
  } catch (err) {
    next(err);
  }
});

tandasRouter.get('/:id/rounds/:round', (req, res, next) => {
  try {
    const summary = contributionService.getRoundSummary(Number(req.params.id), Number(req.params.round));
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

tandasRouter.post('/:id/advance', (req, res, next) => {
  try {
    const data = validate(AdvanceRoundSchema, req.body);
    const tanda = tandaService.advanceRound(Number(req.params.id), data.organizerId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

tandasRouter.get('/:id/participants/:pid/history', (req, res, next) => {
  try {
    const history = contributionService.getParticipantHistory(Number(req.params.id), Number(req.params.pid));
    res.json(history);
  } catch (err) {
    next(err);
  }
});
