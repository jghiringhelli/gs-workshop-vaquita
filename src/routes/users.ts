import { Router } from 'express';
import { z } from 'zod';
import * as userService from '../services/userService';
import { validate } from '../middleware/validate';

export const usersRouter = Router();

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

usersRouter.post('/', (req, res, next) => {
  try {
    const data = validate(CreateUserSchema, req.body);
    const user = userService.createUser(data);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/', (req, res, next) => {
  try {
    const users = userService.listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/:id', (req, res, next) => {
  try {
    const user = userService.getUserById(Number(req.params.id));
    res.json(user);
  } catch (err) {
    next(err);
  }
});
