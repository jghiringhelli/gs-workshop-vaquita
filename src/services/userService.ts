import { IUserRepository } from '../domain/repositories.js';
import { User } from '../domain/index.js';

export class UserService {
  constructor(private userRepository: IUserRepository) {}

  /**
   * Creates a new user
   * @param userData - The user data
   * @returns The created user
   */
  async createUser(userData: { email: string; name: string }): Promise<User> {
    // Check if email already exists
    const existing = await this.userRepository.findByEmail(userData.email);
    if (existing) {
      throw new Error('User with this email already exists');
    }
    return this.userRepository.create(userData);
  }

  /**
   * Gets a user by id
   * @param id - The user id
   * @returns The user
   */
  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Lists all users
   * @returns Array of users
   */
  async listUsers(): Promise<User[]> {
    return this.userRepository.list();
  }
}