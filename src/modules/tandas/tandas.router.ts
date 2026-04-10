import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../shared/middleware/validate';
import {
  CreateTandaSchema,
  JoinTandaSchema,
  OrganizerActionSchema,
} from './tandas.schemas';
import {
  createTandaService,
  getTandaWithParticipants,
  listTandasService,
  joinTanda,
  startTanda,
  cancelTanda,
  listParticipants,
  advanceRound,
} from './tandas.service';
import { contributionsRouter } from '../contributions/contributions.router';

export const tandasRouter = Router();

tandasRouter.post(
  '/',
  validate(CreateTandaSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { name, contributionAmount, organizerId } = req.body as {
        name: string;
        contributionAmount: number;
        organizerId: string;
      };
      const tanda = createTandaService(name, contributionAmount, organizerId);
      res.status(201).json(tanda);
    } catch (err) {
      next(err);
    }
  },
);

tandasRouter.get(
  '/',
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const userId = req.query['userId'] as string | undefined;
      res.json(listTandasService(userId));
    } catch (err) {
      next(err);
    }
  },
);

tandasRouter.get(
  '/:id',
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(getTandaWithParticipants(req.params['id'] as string));
    } catch (err) {
      next(err);
    }
  },
);

tandasRouter.post(
  '/:id/join',
  validate(JoinTandaSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const participant = joinTanda(
        req.params['id'] as string,
        (req.body as { userId: string }).userId,
      );
      res.json(participant);
    } catch (err) {
      next(err);
    }
  },
);

tandasRouter.post(
  '/:id/start',
  validate(OrganizerActionSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const tanda = startTanda(
        req.params['id'] as string,
        (req.body as { organizerId: string }).organizerId,
      );
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  },
);

tandasRouter.post(
  '/:id/cancel',
  validate(OrganizerActionSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const tanda = cancelTanda(
        req.params['id'] as string,
        (req.body as { organizerId: string }).organizerId,
      );
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  },
);

tandasRouter.get(
  '/:id/participants',
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(listParticipants(req.params['id'] as string));
    } catch (err) {
      next(err);
    }
  },
);

tandasRouter.post(
  '/:id/advance',
  validate(OrganizerActionSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const tanda = advanceRound(
        req.params['id'] as string,
        (req.body as { organizerId: string }).organizerId,
      );
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  },
);

// Mount contributions sub-router — handles /contributions, /rounds/:round, /participants/:pid/history
tandasRouter.use('/:id', contributionsRouter);
