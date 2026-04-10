import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate';
import {
  CreateTandaSchema,
  JoinTandaSchema,
  OrganizerSchema,
  createTanda,
  getTanda,
  listTandas,
  joinTanda,
  startTanda,
  cancelTanda,
} from './tanda.service';
import { RecordContributionSchema, recordContribution, advanceTanda, getRoundSummary, getParticipantHistory } from '../contributions/contribution.service';
import { listParticipants } from '../participants/participant.service';

export const tandaRouter = Router();

tandaRouter.post('/', validate(CreateTandaSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(createTanda(req.body));
  } catch (err) {
    next(err);
  }
});

tandaRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId as string | undefined;
    res.json(listTandas(userId));
  } catch (err) {
    next(err);
  }
});

tandaRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(getTanda(req.params['id'] as string));
  } catch (err) {
    next(err);
  }
});

tandaRouter.post('/:id/join', validate(JoinTandaSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(joinTanda(req.params['id'] as string, req.body.userId));
  } catch (err) {
    next(err);
  }
});

tandaRouter.post('/:id/start', validate(OrganizerSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(startTanda(req.params['id'] as string, req.body.organizerId));
  } catch (err) {
    next(err);
  }
});

tandaRouter.post('/:id/cancel', validate(OrganizerSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(cancelTanda(req.params['id'] as string, req.body.organizerId));
  } catch (err) {
    next(err);
  }
});

tandaRouter.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(listParticipants(req.params['id'] as string));
  } catch (err) {
    next(err);
  }
});

tandaRouter.post('/:id/contributions', validate(RecordContributionSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(recordContribution(req.params['id'] as string, req.body.participantId, req.body.amount));
  } catch (err) {
    next(err);
  }
});

tandaRouter.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction) => {
  try {
    const round = parseInt(req.params['round'] as string, 10);
    res.json(getRoundSummary(req.params['id'] as string, round));
  } catch (err) {
    next(err);
  }
});

tandaRouter.post('/:id/advance', validate(OrganizerSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(advanceTanda(req.params['id'] as string, req.body.organizerId));
  } catch (err) {
    next(err);
  }
});

tandaRouter.get('/:id/participants/:pid/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(getParticipantHistory(req.params['id'] as string, req.params['pid'] as string));
  } catch (err) {
    next(err);
  }
});
