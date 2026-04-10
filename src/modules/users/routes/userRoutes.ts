import { Router, Request, Response, NextFunction } from 'express';
import { UserService } from '../service/UserService';
import { handleZodError } from '../../../shared/middleware/handleZodError';

/**
 * Mounts user routes onto the given router.
 * @param userService - Injected user service.
 * @returns Configured router.
 */
export function createUserRouter(userService: UserService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = userService.createUser(req.body);
      res.status(201).json(user);
    } catch (err) {
      handleZodError(err, next);
    }
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = userService.getUserById(req.params.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
