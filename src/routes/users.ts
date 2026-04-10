import { Router } from 'express';
import type { UsersService } from '../services/usersService';
import { validate } from '../utils/validate';
import { CreateUserSchema } from '../validation/users';

export function createUsersRouter(usersService: UsersService): Router {
  const router = Router();

  /** GET /api/users — list all users (public) */
  router.get('/', (_req, res, next) => {
    try {
      res.json(usersService.listUsers());
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/users/:id — get a single user (public) */
  router.get('/:id', (req, res, next) => {
    try {
      res.json(usersService.getUserById(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/users — create a user (public) */
  router.post('/', (req, res, next) => {
    try {
      const data = validate(CreateUserSchema, req.body);
      res.status(201).json(usersService.createUser(data));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
