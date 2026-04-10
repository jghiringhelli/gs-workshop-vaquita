import { Router } from 'express';
import * as usersService from '../services/users.service';

const router = Router();

router.post('/', (req, res, next) => {
  try {
    const user = usersService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/', (_req, res, next) => {
  try {
    const users = usersService.listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid user id' });
      return;
    }
    const user = usersService.getUserById(id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
