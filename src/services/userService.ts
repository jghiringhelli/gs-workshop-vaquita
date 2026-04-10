import { userRepository } from "../repositories/userRepository";
import { ConflictError, NotFoundError } from "../errors";

export const userService = {
  create(data: { email: string; name: string }) {
    const existing = userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError(`A user with email '${data.email}' already exists`);
    }
    return userRepository.create(data);
  },

  getById(id: string) {
    const user = userRepository.findById(id);
    if (!user) throw new NotFoundError("User", id);
    return user;
  },

  listAll() {
    return userRepository.findAll();
  },
};
