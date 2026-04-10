import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TandaService } from './TandaService';

const CreateTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.string().uuid(),
  contributionAmount: z.number().positive(),
});

const JoinTandaSchema = z.object({
  userId: z.string().uuid(),
});

const StartCancelSchema = z.object({
  userId: z.string().uuid(),
});

const ContributionSchema = z.object({
  participantId: z.string().uuid(),
  userId: z.string().uuid(),
});

export function tandaRoutes(tandaService: TandaService): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.query['userId'] as string | undefined;
      return res.json({ data: tandaService.listTandas(userId) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateTandaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(422)
          .json({ error: { message: parsed.error.message, code: 'VALIDATION_ERROR' } });
      }
      const tanda = tandaService.createTanda(parsed.data);
      return res.status(201).json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.json({ data: tandaService.getTandaById(req.params['id'] as string) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/join', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = JoinTandaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(422)
          .json({ error: { message: parsed.error.message, code: 'VALIDATION_ERROR' } });
      }
      const participant = tandaService.joinTanda(req.params['id'] as string, parsed.data.userId);
      return res.status(201).json({ data: participant });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/start', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = StartCancelSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(422)
          .json({ error: { message: parsed.error.message, code: 'VALIDATION_ERROR' } });
      }
      const tanda = tandaService.startTanda(req.params['id'] as string, parsed.data.userId);
      return res.json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = StartCancelSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(422)
          .json({ error: { message: parsed.error.message, code: 'VALIDATION_ERROR' } });
      }
      const tanda = tandaService.cancelTanda(req.params['id'] as string, parsed.data.userId);
      return res.json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.json({ data: tandaService.listParticipants(req.params['id'] as string) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/contributions', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ContributionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(422)
          .json({ error: { message: parsed.error.message, code: 'VALIDATION_ERROR' } });
      }
      const contribution = tandaService.recordContribution(
        req.params['id'] as string,
        parsed.data.participantId,
        parsed.data.userId,
      );
      return res.status(201).json({ data: contribution });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction) => {
    try {
      const round = parseInt(req.params['round'] as string, 10);
      if (isNaN(round)) {
        return res
          .status(422)
          .json({ error: { message: 'round must be a number', code: 'VALIDATION_ERROR' } });
      }
      return res.json({
        data: tandaService.getRoundSummary(req.params['id'] as string, round),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/advance', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = StartCancelSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(422)
          .json({ error: { message: parsed.error.message, code: 'VALIDATION_ERROR' } });
      }
      const tanda = tandaService.advanceTanda(req.params['id'] as string, parsed.data.userId);
      return res.json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/participants/:pid/history', (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.json({
        data: tandaService.getParticipantHistory(
          req.params['id'] as string,
          req.params['pid'] as string,
        ),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
