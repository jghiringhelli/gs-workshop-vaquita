/**
 * Raw database row — snake_case columns as returned by better-sqlite3.
 * Internal to the repository layer; never exported outside it.
 */
export interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

/**
 * Domain entity — the canonical in-memory representation of a User.
 * camelCase. No framework dependencies. No HTTP concepts.
 *
 * When a field must be added (e.g. password_hash), add it here first,
 * then update the mapper to decide whether it flows to the response DTO.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/**
 * Input DTO — validated data arriving from the API boundary.
 * Represents the minimum required to create a User.
 */
export interface CreateUserDTO {
  email: string;
  name: string;
}

/**
 * Response DTO — the shape returned to API consumers.
 * Explicitly chosen fields: adding a private field to User does NOT
 * automatically expose it here. Update toUserResponseDTO() to include it.
 */
export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}
