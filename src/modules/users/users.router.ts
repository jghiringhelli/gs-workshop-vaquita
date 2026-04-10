import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../shared/middleware/validate';
import { CreateUserSchema } from './users.schemas';
import {
  createUserService,
  getUserById,
  listAllUsers,
} from './users.service';

export const usersRouter = Router();

usersRouter.post(
  '/',
  validate(CreateUserSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = createUserService(req.body.email, req.body.name);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.get(
  '/',
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(listAllUsers());
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.get(
  '/:id',
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(getUserById(req.params['id'] as string));
    } catch (err) {
      next(err);
    }
  },
);
