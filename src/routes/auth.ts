import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { UsersService } from '../services/usersService';
import { validate } from '../utils/validate';
import { GetTokenSchema } from '../validation/auth';
import { NotFoundError } from '../errors';

export function createAuthRouter(usersService: UsersService): Router {
  const router = Router();

  /**
   * POST /api/auth/token
   * Body: { email }
   * Returns: { token } — 24-hour JWT if the user exists.
   */
  router.post('/token', (req, res, next) => {
    try {
      const { email } = validate(GetTokenSchema, req.body);
      const user = usersService.getUserByEmail(email);
      if (!user) throw new NotFoundError('User');

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: '24h' },
      );
      res.json({ token });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
