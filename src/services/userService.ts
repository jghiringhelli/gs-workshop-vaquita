import { userRepo } from '../repositories/userRepo';
import { NotFoundError, ConflictError } from '../errors';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required'),
});

export const userService = {
  create(data: unknown) {
    const { email, name } = createUserSchema.parse(data);
    const existing = userRepo.findByEmail(email);
    if (existing) throw new ConflictError('Email already exists');
    return userRepo.create(email, name);
  },

  getAll() {
    return userRepo.findAll();
  },

  getById(id: number) {
    const user = userRepo.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },
};
