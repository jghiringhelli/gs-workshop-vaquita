import { z } from 'zod';
import { UserRepository } from '../repositories/userRepository';
import { NotFoundError, ConflictError, ValidationError } from '../errors';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export class UserService {
  constructor(private userRepo: UserRepository) {}

  createUser(data: unknown) {
    const result = CreateUserSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(result.error.errors.map(e => e.message).join(', '));
    }
    const { email, name } = result.data;
    const existing = this.userRepo.findByEmail(email);
    if (existing) throw new ConflictError('Email already in use');
    return this.userRepo.create({ email, name });
  }

  listUsers() {
    return this.userRepo.findAll();
  }

  getUserById(id: string) {
    const user = this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }
}
