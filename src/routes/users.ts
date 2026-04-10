import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { ValidationError } from '../errors';
import * as userRepo from '../repositories/user.repository';
import * as userService from '../services/user.service';

const router = Router();

// ─── Spec-compatible simple user creation (POST /api/users) ──────────────────
const simpleCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = simpleCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      // Fall through to register-style if name not provided
      throw new ValidationError(
        parsed.error.issues.map((i) => i.message).join(', '),
      );
    }
    const user = userRepo.createSimple(parsed.data.email, parsed.data.name);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(userRepo.findAll());
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params['id']);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError('Invalid user id');
    }
    const user = userRepo.findById(id);
    if (!user) {
      res.status(404).json({ error: `User with id ${id} not found` });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1).max(50),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((i) => i.message).join(', '),
        );
      }
      const { email, username, password } = parsed.data;
      const user = await userService.register(email, username, password);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((i) => i.message).join(', '),
        );
      }
      const { email, password } = parsed.data;
      const result = await userService.login(email, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
