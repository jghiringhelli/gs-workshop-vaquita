import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TandaService } from '../services/tandaService';
import { ContributionService } from '../services/contributionService';
import { requireAuth } from '../middleware/auth';

const createTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.number().int().positive(),
  contributionAmount: z.number().positive(),
});

const joinTandaSchema = z.object({
  userId: z.number().int().positive(),
});

const contributionSchema = z.object({
  participantId: z.number().int().positive(),
  amount: z.number().positive(),
});

export function createTandaRoutes(
  tandaService: TandaService,
  contributionService: ContributionService
): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createTandaSchema.parse(req.body);
      const tanda = await tandaService.createTanda(body);
      res.status(201).json(tanda);
    } catch (err) {
      next(err);
    }
  });

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
      const tandas = await tandaService.listTandas(userId);
      res.json(tandas);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const tanda = await tandaService.getTanda(id);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/join', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = parseInt(req.params.id as string, 10);
      const body = joinTandaSchema.parse(req.body);
      const participant = await tandaService.joinTanda(tandaId, body.userId);
      res.status(201).json(participant);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/start', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = parseInt(req.params.id as string, 10);
      const requesterId = req.user!.userId;
      const tanda = await tandaService.startTanda(tandaId, requesterId);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/cancel', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = parseInt(req.params.id as string, 10);
      const requesterId = req.user!.userId;
      const tanda = await tandaService.cancelTanda(tandaId, requesterId);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/participants', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = parseInt(req.params.id as string, 10);
      const participants = await tandaService.listParticipants(tandaId);
      res.json(participants);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/contributions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = parseInt(req.params.id as string, 10);
      const body = contributionSchema.parse(req.body);
      const contribution = await contributionService.recordContribution({
        tandaId,
        participantId: body.participantId,
        amount: body.amount,
      });
      res.status(201).json(contribution);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/rounds/:round', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = parseInt(req.params.id as string, 10);
      const round = parseInt(req.params.round as string, 10);
      const summary = await contributionService.getRoundSummary(tandaId, round);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/advance', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = parseInt(req.params.id as string, 10);
      const requesterId = req.user!.userId;
      const tanda = await tandaService.advanceRound(tandaId, requesterId);
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/participants/:pid/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = parseInt(req.params.id as string, 10);
      const participantId = parseInt(req.params.pid as string, 10);
      const history = await contributionService.getParticipantHistory(tandaId, participantId);
      res.json(history);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
