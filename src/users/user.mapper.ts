import { User, UserResponseDTO } from './user.types';

/**
 * Maps a domain User entity to the API response DTO.
 *
 * This is the explicit firewall between internal domain state and the public
 * API surface. Adding a field to User (e.g. passwordHash) does NOT expose it
 * to consumers until it is explicitly added here.
 *
 * @param user - Internal domain entity
 * @returns Public response DTO safe to serialize to JSON
 */
export function toUserResponseDTO(user: User): UserResponseDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}
