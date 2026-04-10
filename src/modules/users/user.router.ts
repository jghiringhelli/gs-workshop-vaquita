import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate';
import { CreateUserSchema, createUser, getUserById, listUsers } from './user.service';

export const userRouter = Router();

userRouter.post('/', validate(CreateUserSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

userRouter.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(listUsers());
  } catch (err) {
    next(err);
  }
});

userRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(getUserById(req.params['id'] as string));
  } catch (err) {
    next(err);
  }
});
