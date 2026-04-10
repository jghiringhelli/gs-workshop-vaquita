import { Router, Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { createUserSchema } from '../schemas';
import { ValidationError } from '../errors';

export function createUsersRouter(userService: UserService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      const user = userService.createUser(parsed.data);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  });

  router.get('/', (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(userService.listUsers());
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(userService.getUser(req.params['id'] as string));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
