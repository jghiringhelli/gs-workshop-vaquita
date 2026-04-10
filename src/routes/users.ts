import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { UserService } from '../services/UserService.js';

const createUserSchema = z.object({
  email: z.string().min(1, 'email is required'),
  name: z.string().min(1, 'name is required'),
});

const idParamsSchema = z.object({ id: z.string().min(1) });

/**
 * Build and return the users router, injecting the UserService.
 * @param userService - Service instance to delegate to
 * @returns Configured Express Router
 */
export function createUserRouter(userService: UserService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const body = createUserSchema.parse(req.body);
      const user = userService.createUser(body.email, body.name);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  });

  router.get('/', (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(userService.listUsers());
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      res.json(userService.getUserById(id));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
