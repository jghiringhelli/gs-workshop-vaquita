import { Router, Request, Response, NextFunction } from 'express';
import { tandaService } from '../services/tandaService';

const router = Router();

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tanda = tandaService.create(req.body);
    res.status(201).json(tanda);
  } catch (err) {
    next(err);
  }
});

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const tandas = tandaService.getAll(userId);
    res.json(tandas);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tanda = tandaService.getById(Number(req.params.id));
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join', (req: Request, res: Response, next: NextFunction) => {
  try {
    const participant = tandaService.join(Number(req.params.id), req.body);
    res.status(201).json(participant);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tanda = tandaService.start(Number(req.params.id), req.body.userId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tanda = tandaService.cancel(Number(req.params.id), req.body.userId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/participants', (req: Request, res: Response, next: NextFunction) => {
  try {
    const participants = tandaService.getParticipants(Number(req.params.id));
    res.json(participants);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/contributions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const contribution = tandaService.recordContribution(Number(req.params.id), req.body);
    res.status(201).json(contribution);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/rounds/:round', (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = tandaService.getRoundSummary(
      Number(req.params.id),
      Number(req.params.round)
    );
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/advance', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tanda = tandaService.advance(Number(req.params.id), req.body.userId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/participants/:pid/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = tandaService.getContributionHistory(
      Number(req.params.id),
      Number(req.params.pid)
    );
    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
