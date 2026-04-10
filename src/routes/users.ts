import { Router, Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import * as userService from '../services/userService';

export function createUsersRouter(db?: Database.Database): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = userService.createUser(req.body, db);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  });

  router.get('/', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = userService.listUsers(db);
      res.json(users);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = userService.getUserById(req.params.id as string, db);
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
