export interface User {
  id: number;
  email: string;
  name: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
}
