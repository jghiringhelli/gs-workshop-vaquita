/**
 * Public user representation returned by the API.
 */
export interface User {
  readonly id: number;
  readonly email: string;
  readonly name: string;
}

/**
 * Data required to create a user.
 */
export interface CreateUserInput {
  readonly email: string;
  readonly name: string;
}
