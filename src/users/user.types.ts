/** A registered user of the system */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly createdAt: string;
}

/** Input to create a new user */
export interface CreateUserDto {
  readonly email: string;
  readonly name: string;
}

/** Shape returned to API consumers */
export interface UserResponseDto {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly createdAt: string;
}
