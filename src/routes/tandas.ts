import { Router, Request, Response } from 'express';

/** Stub — implement tanda handlers here. */
const router = Router();

router.post('/', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/:id', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/:id/join', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/:id/start', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/:id/cancel', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/:id/advance', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/:id/participants', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/:id/contributions', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/:id/rounds/:round', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/:id/participants/:pid/history', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

export { router as tandaRouter };
