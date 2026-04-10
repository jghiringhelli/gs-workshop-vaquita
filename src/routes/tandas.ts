import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { TandaRepository } from '../repositories/tandaRepository';
import { ParticipantRepository } from '../repositories/participantRepository';
import { ContributionRepository } from '../repositories/contributionRepository';
import { UserRepository } from '../repositories/userRepository';
import { TandaService } from '../services/tandaService';

const tandaRepo = new TandaRepository(db);
const participantRepo = new ParticipantRepository(db);
const contributionRepo = new ContributionRepository(db);
const userRepo = new UserRepository(db);
const tandaService = new TandaService(tandaRepo, participantRepo, contributionRepo, userRepo);

export const tandaRouter = Router();

tandaRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tanda = tandaService.createTanda(req.body);
    res.status(201).json(tanda);
  } catch (err) {
    next(err);
  }
});

tandaRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId as string | undefined;
    const tandas = tandaService.listTandas(userId);
    res.status(200).json(tandas);
  } catch (err) {
    next(err);
  }
});

tandaRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tanda = tandaService.getTanda(req.params.id as string);
    res.status(200).json(tanda);
  } catch (err) {
    next(err);
  }
});

tandaRouter.post('/:id/join', (req: Request, res: Response, next: NextFunction) => {
  try {
    const participant = tandaService.joinTanda(req.params.id as string, req.body);
    res.status(201).json(participant);
  } catch (err) {
    next(err);
  }
});

tandaRouter.post('/:id/start', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizerId } = req.body;
    const tanda = tandaService.startTanda(req.params.id as string, organizerId);
    res.status(200).json(tanda);
  } catch (err) {
    next(err);
  }
});

tandaRouter.post('/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizerId } = req.body;
    const tanda = tandaService.cancelTanda(req.params.id as string, organizerId);
    res.status(200).json(tanda);
  } catch (err) {
    next(err);
  }
});

tandaRouter.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
  try {
    const participants = tandaService.listParticipants(req.params.id as string);
    res.status(200).json(participants);
  } catch (err) {
    next(err);
  }
});

tandaRouter.post('/:id/contributions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const contribution = tandaService.recordContribution(req.params.id as string, req.body);
    res.status(201).json(contribution);
  } catch (err) {
    next(err);
  }
});

tandaRouter.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction) => {
  try {
    const round = parseInt(req.params.round as string, 10);
    const summary = tandaService.getRoundSummary(req.params.id as string, round);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
});

tandaRouter.post('/:id/advance', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizerId } = req.body;
    const tanda = tandaService.advanceRound(req.params.id as string, organizerId);
    res.status(200).json(tanda);
  } catch (err) {
    next(err);
  }
});

tandaRouter.get('/:id/participants/:pid/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = tandaService.getParticipantHistory(req.params.id as string, req.params.pid as string);
    res.status(200).json(history);
  } catch (err) {
    next(err);
  }
});
