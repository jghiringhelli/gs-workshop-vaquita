import { Router, Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { validate } from '../middleware/validate';
import { createUserSchema } from './user.schemas';

/**
 * Creates the Express router for /api/users.
 * Thin layer: validates input, delegates to service, serialises response.
 * No SQL or business logic here.
 *
 * @param userService - Injected service instance
 * @returns Configured Express Router
 */
export function createUserRouter(userService: UserService): Router {
  const router = Router();

  /** POST /api/users — create a new user */
  router.post('/', validate(createUserSchema), (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = userService.createUser(req.body as { email: string; name: string });
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/users — list all users */
  router.get('/', (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const users = userService.listUsers();
      res.json({ data: users, meta: { total: users.length } });
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/users/:id — get a single user by ID */
  router.get('/:id', (req: Request<{ id: string }>, res: Response, next: NextFunction): void => {
    try {
      const user = userService.getUserById(req.params.id);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
