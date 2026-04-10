/**
 * Persisted user record.
 */
export interface UserRecord {
  readonly id: number
  readonly email: string
  readonly name: string
  readonly createdAt: string
}

/**
 * Public user response DTO.
 */
export interface UserView {
  readonly id: number
  readonly email: string
  readonly name: string
  readonly createdAt: string
}

/**
 * User creation input DTO.
 */
export interface CreateUserInput {
  readonly email: string
  readonly name: string
}

/**
 * Generic pagination request shape.
 */
export interface PaginationInput {
  readonly page: number
  readonly pageSize: number
}

/**
 * Generic paginated response shape.
 */
export interface PaginatedResult<T> {
  readonly items: ReadonlyArray<T>
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

/**
 * Repository port for user persistence.
 */
export interface UserRepository {
  create(input: CreateUserInput & { readonly createdAt: string }): UserRecord
  findByEmail(email: string): UserRecord | null
  findById(id: number): UserRecord | null
  list(pagination: PaginationInput): PaginatedResult<UserRecord>
}

/**
 * Successful user creation response.
 */
export interface CreatedUserResult {
  readonly user: UserView
  readonly token: string
}
