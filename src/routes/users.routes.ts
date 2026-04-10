import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as usersService from '../services/users.service';

const router = Router();

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required'),
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name } = createUserSchema.parse(req.body);
    const user = usersService.createUser(email, name);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = usersService.getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }
    const user = usersService.getUserById(id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
