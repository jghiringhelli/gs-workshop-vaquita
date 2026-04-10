import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate';
import { userService } from '../services/userService';

export const userRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1, 'username is required'),
  password: z.string().min(8, 'password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'password is required'),
});

userRouter.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, username, password } = req.body as z.infer<typeof registerSchema>;
    const user = await userService.register(email, username, password);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

userRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const result = await userService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

userRouter.get('/', async (_req, res, next) => {
  try {
    const users = await userService.getAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

userRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user id', code: 'VALIDATION_ERROR' });
    }
    const user = await userService.getById(id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});
