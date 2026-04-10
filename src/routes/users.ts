import { Router, Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';

const router = Router();

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = userService.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = userService.getAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = userService.getById(Number(req.params.id));
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
