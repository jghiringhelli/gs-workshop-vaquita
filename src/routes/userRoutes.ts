import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService } from '../services/userService';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export function createUserRoutes(userService: UserService): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createUserSchema.parse(req.body);
      const user = await userService.createUser(body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  });

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await userService.listUsers();
      res.json(users);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const user = await userService.getUser(id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
