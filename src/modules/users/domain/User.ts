/** User domain entity. */
export interface User {
  /** UUID string */
  id: string;
  email: string;
  name: string;
}

/** Input for creating a new user. */
export interface CreateUserInput {
  email: string;
  name: string;
}
