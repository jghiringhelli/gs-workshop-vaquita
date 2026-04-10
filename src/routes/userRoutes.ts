import { Router } from 'express';
import { z } from 'zod';
import { UserService } from '../services/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors.js';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1)
});

export function createUserRoutes(userService: UserService) {
  const router = Router();

  // POST /api/users
  router.post('/', async (req, res) => {
    try {
      const body = createUserSchema.parse(req.body);
      const user = await userService.createUser(body);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({ error: 'Validation failed', details: error.errors });
      } else if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // GET /api/users
  router.get('/', async (req, res) => {
    try {
      const users = await userService.listUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/users/:id
  router.get('/:id', async (req, res) => {
    try {
      const user = await userService.getUserById(req.params.id);
      res.json(user);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  return router;
}