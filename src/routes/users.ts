import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userService } from '../services/userService';

const router = Router();

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name } = CreateUserSchema.parse(req.body);
    const user = userService.createUser(email, name);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(userService.listUsers());
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(userService.getUserById(req.params['id'] as string));
  } catch (err) {
    next(err);
  }
});

export default router;
