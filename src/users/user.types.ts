export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
}

export interface UserRow {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  };
}
