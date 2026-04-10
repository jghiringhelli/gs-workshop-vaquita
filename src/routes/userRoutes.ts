// Rutas relacionadas con la gestión de usuarios.
// Incluye creación, listado y consulta de usuarios.
import { Router, Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { createUserSchema } from '../schemas';
import { ValidationError } from '../errors';

const router = Router();

// Crear usuario
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map(e => e.message).join(', '));
    }
    const user = userService.createUser(parsed.data.email, parsed.data.name);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// Listar usuarios
router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = userService.listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// Consultar usuario por ID
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      throw new ValidationError('Invalid user ID');
    }
    const user = userService.getUserById(id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
