import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService, createUserSchema } from '../services/user.service';
import { CreateUserResponse, ListUsersResponse } from '../types';

/**
 * Create user routes
 * @param userService - Injected user service
 * @returns Express router
 */
export function createUserRoutes(userService: UserService): Router {
  const router = Router();

  /**
   * POST /api/users - Create a user
   */
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate input
      const input = createUserSchema.parse(req.body);

      // Call service
      const user = userService.createUser(input.email, input.name);

      // Return response
      const response: CreateUserResponse = {
        data: user,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/users - List all users
   */
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = userService.listUsers();

      const response: ListUsersResponse = {
        data: users,
        meta: {
          count: users.length,
        },
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/users/:id - Get user by ID
   */
  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const user = userService.getUserById(id);

      res.status(200).json({
        data: user,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
