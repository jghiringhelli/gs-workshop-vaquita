import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { CreateUserSchema } from '../validators/user.validator';

export function createUsersRouter(userService: UserService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = CreateUserSchema.parse(req.body);
      const result = userService.createUser(dto);
      res.status(201).json(result);
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
      res.json(userService.getUser(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
