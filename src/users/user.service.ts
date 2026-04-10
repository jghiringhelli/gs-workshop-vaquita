import { v4 as uuidv4 } from "uuid";
import { ConflictError, NotFoundError } from "../errors/index.js";
import type { IUserRepository } from "./user.repository.js";
import type { CreateUserDto, User, UserResponseDto } from "./user.types.js";

/** Handles user registration and lookup business logic. */
export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Creates a new user. Rejects duplicate emails.
   * @param dto - The user creation payload.
   * @returns The created user as a response DTO.
   */
  create(dto: CreateUserDto): UserResponseDto {
    const existing = this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError(`Email '${dto.email}' is already registered`);
    }

    const now = new Date().toISOString();
    const user: User = {
      id: uuidv4(),
      email: dto.email.toLowerCase().trim(),
      name: dto.name.trim(),
      createdAt: now,
    };

    this.userRepository.create(user);
    return this.toResponseDto(user);
  }

  /**
   * Retrieves a user by ID.
   * @param id - The user's UUID.
   * @returns The user as a response DTO.
   * @throws NotFoundError if no user with the given ID exists.
   */
  findById(id: string): UserResponseDto {
    const user = this.userRepository.findById(id);
    if (!user) throw new NotFoundError("User", id);
    return this.toResponseDto(user);
  }

  /**
   * Returns all registered users.
   * @returns Array of user response DTOs.
   */
  list(): UserResponseDto[] {
    return this.userRepository.findAll().map((u) => this.toResponseDto(u));
  }

  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
