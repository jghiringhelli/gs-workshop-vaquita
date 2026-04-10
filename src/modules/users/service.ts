import type { AppConfig } from "../../config/env"
import { ConflictError, NotFoundError } from "../../shared/errors/application-error"
import { signAuthToken } from "../../shared/auth/jwt"
import type {
  CreateUserInput,
  CreatedUserResult,
  PaginatedResult,
  PaginationInput,
  UserRecord,
  UserRepository,
  UserView,
} from "./types"

/**
 * Application service for user workflows.
 */
export class UserService {
  /**
   * Create a user service.
   *
   * @param userRepository - User repository port.
   * @param config - Application configuration.
   */
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly config: AppConfig,
  ) {}

  /**
   * Create a user and issue an auth token for immediate use.
   *
   * @param input - User creation input.
   * @returns Created user plus signed JWT.
   */
  public createUser(input: CreateUserInput): CreatedUserResult {
    const normalizedEmail = input.email.trim().toLowerCase()
    const normalizedName = input.name.trim()

    if (this.userRepository.findByEmail(normalizedEmail)) {
      throw new ConflictError("A user with this email already exists", {
        email: normalizedEmail,
      })
    }

    const user = this.userRepository.create({
      email: normalizedEmail,
      name: normalizedName,
      createdAt: new Date().toISOString(),
    })

    const issuedAt = Math.floor(Date.now() / 1000)
    const token = signAuthToken(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        iat: issuedAt,
        exp: issuedAt + this.config.jwtTtlSeconds,
      },
      this.config.jwtSecret,
    )

    return {
      user: mapUserView(user),
      token,
    }
  }

  /**
   * Fetch a single user by id.
   *
   * @param id - User id.
   * @returns User response DTO.
   */
  public getUser(id: number): UserView {
    const user = this.userRepository.findById(id)

    if (!user) {
      throw new NotFoundError(`User ${id} was not found`)
    }

    return mapUserView(user)
  }

  /**
   * List users with pagination metadata.
   *
   * @param pagination - Pagination request.
   * @returns Paginated users.
   */
  public listUsers(pagination: PaginationInput): PaginatedResult<UserView> {
    const result = this.userRepository.list(pagination)

    return {
      ...result,
      items: result.items.map(mapUserView),
    }
  }
}

/**
 * Convert a persisted user to its public API representation.
 *
 * @param user - Persisted user.
 * @returns Public user DTO.
 */
function mapUserView(user: UserRecord): UserView {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  }
}
