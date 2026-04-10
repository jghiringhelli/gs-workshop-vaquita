import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as userService from './user.service';
import { createUserSchema, userIdParamSchema } from './user.schemas';

const router = Router();

/**
 * POST /api/users
 * Creates a new user. Returns the user record and a signed JWT.
 * This is the only unauthenticated endpoint.
 */
router.post('/', (req, res, next) => {
  try {
    const input = createUserSchema.parse(req.body);
    const result = userService.createUser(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users
 * Returns all registered users. Requires authentication.
 */
router.get('/', authenticate, (_req, res, next) => {
  try {
    const users = userService.listUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/:id
 * Returns a single user by ID. Requires authentication.
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const user = userService.getUserById(id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
