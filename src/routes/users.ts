import { Router } from 'express';
import { z } from 'zod';
import * as userService from '../services/user.service';

const router = Router();

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

router.post('/', (req, res, next) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  try {
    const user = userService.createUser(result.data.email, result.data.name);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/', (_req, res) => {
  res.json(userService.listUsers());
});

router.get('/:id', (req, res, next) => {
  try {
    res.json(userService.getUser(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;
