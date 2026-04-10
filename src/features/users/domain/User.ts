export interface User {
  readonly id: number;
  readonly email: string;
  readonly name: string;
  readonly createdAt: string;
}

export interface CreateUserInput {
  readonly email: string;
  readonly name: string;
}
