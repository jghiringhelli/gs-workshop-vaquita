import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { UserRepository } from '../repositories/userRepository';
import { UserService } from '../services/userService';

const userRepo = new UserRepository(db);
const userService = new UserService(userRepo);

export const userRouter = Router();

userRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = userService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

userRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = userService.listUsers();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
});

userRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = userService.getUserById(req.params.id as string);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});
