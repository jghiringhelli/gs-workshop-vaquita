import { Router, Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { createUserSchema } from '../validation/schemas';
import { ZodError } from 'zod';
import { ValidationError } from '../errors/customErrors';

export function createUserRoutes(userService: UserService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createUserSchema.parse(req.body);
      const user = userService.createUser(validated);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error.errors[0].message));
      } else {
        next(error);
      }
    }
  });

  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = userService.listUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new ValidationError('User ID must be a number');
      }
      const user = userService.getUserById(id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
