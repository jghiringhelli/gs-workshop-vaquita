import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserService } from '../services/userService';

const loginSchema = z.object({
  email: z.string().email(),
});

export function createAuthRoutes(userService: UserService): Router {
  const router = Router();

  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = loginSchema.parse(req.body);
      const user = await userService.getUserByEmail(body.email);
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: '24h' }
      );
      res.json({ token, user });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
