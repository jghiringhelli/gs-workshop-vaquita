import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { config } from '../config';
import * as userRepo from '../repositories/userRepository';
import { NotFoundError, ValidationError } from '../errors/AppError';

const LoginSchema = z.object({
  userId: z.coerce.number().int().positive('userId must be a positive integer'),
});

export function createAuthRouter(db?: Database.Database): Router {
  const router = Router();

  router.post('/login', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      const user = userRepo.findUserById(parsed.data.userId, db);
      if (!user) throw new NotFoundError(`User ${parsed.data.userId} not found`);

      const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '24h' });
      res.json({ token, user });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
