import { Router, Request, Response } from 'express';
import { ServiceFactory } from '../services';
import { CreateUserInput, createUserSchema } from '../schemas';
import { validateRequest } from './middleware';

export function createUserRoutes(services: ServiceFactory): Router {
  const router = Router();
  const userService = services.getUsers();

  // POST /api/users
  router.post('/', validateRequest(createUserSchema), (req: Request, res: Response): void => {
    const input = (req as unknown as Record<string, unknown>).validatedBody as CreateUserInput;
    const user = userService.create(input);
    res.status(201).json(user);
  });

  // GET /api/users
  router.get('/', (req: Request, res: Response): void => {
    const users = userService.list();
    res.json(users);
  });

  // GET /api/users/:id
  router.get('/:id', (req: Request, res: Response): void => {
    const user = userService.getById(String(req.params.id));
    res.json(user);
  });

  return router;
}

