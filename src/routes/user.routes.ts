import { Router, Request, Response, NextFunction } from 'express';
import { createUserSchema } from '../schemas/user.schemas';
import * as userService from '../services/user.service';

const router = Router();

router.post('/', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const data = createUserSchema.parse(req.body);
    const user = userService.createUser(data.email, data.name);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/', (_req: Request, res: Response, next: NextFunction): void => {
  try {
    const users = userService.listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const user = userService.getUserById(id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
