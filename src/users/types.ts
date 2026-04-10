/** User domain entity. */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly createdAt: string;
}

/** DTO for creating a user. */
export interface CreateUserDto {
  readonly email: string;
  readonly name: string;
}

/** DTO for user API responses. */
export interface UserResponse {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly createdAt: string;
}
