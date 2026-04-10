import { Router } from 'express';
import { AppError, ValidationError } from '../errors';
import * as userService from '../services/userService';

const router = Router();

router.post('/', (req, res, next) => {
  try {
    const parsed = userService.CreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }
    const user = userService.createUser(parsed.data);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/', (_req, res, next) => {
  try {
    res.json(userService.listUsers());
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new ValidationError('Invalid user ID');
    res.json(userService.getUserById(id));
  } catch (err) {
    next(err);
  }
});

export default router;
