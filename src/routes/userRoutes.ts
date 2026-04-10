/**
 * User Routes
 * POST   /api/users         - Create user
 * GET    /api/users         - List users
 * GET    /api/users/:id     - Get user
 */

import { Router, Request, Response } from 'express';
import { Services } from '../services/index.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { CreateUserSchema, validateInput } from '../middlewares/validation.js';

export function createUserRoutes(services: Services): Router {
  const router = Router();

  /**
   * POST /api/users
   * Create a new user
   *
   * Example request:
   * {
   *   "email": "alice@example.com",
   *   "name": "Alice"
   * }
   *
   * Example response:
   * {
   *   "id": "123e4567-e89b-12d3-a456-426614174000",
   *   "email": "alice@example.com",
   *   "name": "Alice",
   *   "createdAt": "2024-01-15T10:30:00Z"
   * }
   */
  router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const input = validateInput(CreateUserSchema, req.body);
      const user = services.users.createUser(input);

      res.status(201).json(user);
    }),
  );

  /**
   * GET /api/users
   * List all users
   *
   * Example response:
   * [
   *   {
   *     "id": "123e4567-e89b-12d3-a456-426614174000",
   *     "email": "alice@example.com",
   *     "name": "Alice",
   *     "createdAt": "2024-01-15T10:30:00Z"
   *   }
   * ]
   */
  router.get(
    '/',
    asyncHandler(async (_req: Request, res: Response) => {
      const users = services.users.listUsers();
      res.json(users);
    }),
  );

  /**
   * GET /api/users/:id
   * Get a user by ID
   *
   * Example response:
   * {
   *   "id": "123e4567-e89b-12d3-a456-426614174000",
   *   "email": "alice@example.com",
   *   "name": "Alice",
   *   "createdAt": "2024-01-15T10:30:00Z"
   * }
   */
  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const user = services.users.getUser(req.params.id);
      res.json(user);
    }),
  );

  return router;
}
