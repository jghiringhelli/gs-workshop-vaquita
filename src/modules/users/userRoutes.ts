import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService } from './UserService';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export function userRoutes(userService: UserService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({ error: { message: parsed.error.message, code: 'VALIDATION_ERROR' } });
      }
      const user = userService.createUser(parsed.data);
      return res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  });

  router.get('/', (_req: Request, res: Response, next: NextFunction) => {
    try {
      return res.json({ data: userService.listUsers() });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.json({ data: userService.getUserById(req.params['id'] as string) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
