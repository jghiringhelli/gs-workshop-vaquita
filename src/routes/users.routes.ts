import { Router } from 'express';
import type { UsersService } from '../services/users.service';

export function createUsersRouter(usersService: UsersService): Router {
  const router = Router();

  router.get('/', (_req, res, next) => {
    try {
      res.json(usersService.listUsers());
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }
      res.json(usersService.getUserById(id));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req, res, next) => {
    try {
      res.status(201).json(usersService.createUser(req.body));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
