import { Router, Request, Response, NextFunction } from 'express';
import { UserService } from '../service/UserService';
import { ZodError } from 'zod';
import { ValidationError } from '../../../shared/exceptions/AppError';

/**
 * Mounts user routes onto the given router.
 * @param userService - Injected user service.
 * @returns Configured router.
 */
export function createUserRouter(userService: UserService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = userService.createUser(req.body);
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError(err.errors[0]?.message ?? 'Invalid input'));
      } else {
        next(err);
      }
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = userService.getUserById(req.params.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
