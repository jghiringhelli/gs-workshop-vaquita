import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import { UsersService } from './users.service';
import { CreateUserSchema } from './users.schema';

/**
 * Mounts user routes onto the provided Express Router.
 */
export const createUsersRouter = (service: UsersService): Router => {
  const router = Router();

  /** POST /api/users — register a new user, returns JWT. */
  router.post('/', (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const dto = CreateUserSchema.parse(req.body);
      const user = service.create(dto);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/users — list all users. */
  router.get('/', (_req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      res.json(service.listAll());
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/users/:id — get user by ID. */
  router.get('/:id', (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      res.json(service.getById(String(req.params.id)));
    } catch (err) {
      next(err);
    }
  });

  return router;
};
