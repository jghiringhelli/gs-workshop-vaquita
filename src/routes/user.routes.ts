import { Router, Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserSchema } from '../models/user';

export function createUserRoutes(userService: UserService): Router {
  const router = Router();

  // POST /api/users - Create a new user
  router.post('/', (req: Request, res: Response) => {
    try {
      const validated = CreateUserSchema.parse(req.body);
      const user = userService.createUser(validated);
      res.status(201).json(user);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/users - List all users
  router.get('/', (req: Request, res: Response) => {
    try {
      const users = userService.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/users/:id - Get user by ID
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id : '';
      const user = userService.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
