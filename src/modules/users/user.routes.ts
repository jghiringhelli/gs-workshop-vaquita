import { Router } from 'express';
import { UserService } from './user.service.js';
import { validate } from '../../shared/middleware/validate.js';
import { CreateUserSchema } from './user.schema.js';

/**
 * Builds and returns the /api/users router.
 * @param service - UserService instance
 * @returns Configured Express Router
 */
export function buildUserRouter(service: UserService): Router {
  const router = Router();

  /** POST /api/users — create a user */
  router.post('/', validate(CreateUserSchema), (req, res, next) => {
    try {
      const user = service.create(req.body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/users — list all users */
  router.get('/', (_req, res, next) => {
    try {
      res.json(service.findAll());
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/users/:id — get user by id */
  router.get('/:id', (req, res, next) => {
    try {
      res.json(service.findById(req.params['id']!));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

