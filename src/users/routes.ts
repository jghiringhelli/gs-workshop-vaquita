import { Router, type Request, type Response, type NextFunction } from 'express';
import type { UserService } from './service';

/**
 * Creates the /api/users Express router.
 * @param service - UserService instance.
 * @returns Configured Express Router.
 */
export function createUserRouter(service: UserService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = service.create(req.body as { email: string; name: string });
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  });

  router.get('/', (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ data: service.findAll() });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ data: service.findById(req.params['id'] as string) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
