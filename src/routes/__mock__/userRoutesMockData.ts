/**
 * Test fixtures for user route tests (register & login).
 */
import type { User } from "@prisma/client";

// A fully-formed User row as Prisma would return it (password is the bcrypt hash)
export const mockUser: User = {
  id: 1,
  email: "alice@example.com",
  name: "Alice",
  password: "$2b$10$mockhashforpassword123456789",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

// The same user without the password field (what the API should return)
export const mockSafeUser = {
  id: mockUser.id,
  email: mockUser.email,
  name: mockUser.name,
  createdAt: mockUser.createdAt.toISOString(),
  updatedAt: mockUser.updatedAt.toISOString(),
};

// Valid request bodies
export const registerPayload = {
  email: "alice@example.com",
  username: "Alice",
  password: "password123",
};

export const loginPayload = {
  email: "alice@example.com",
  password: "password123",
};

// A predictable JWT token returned by the mocked jsonwebtoken
export const mockToken = "mock.jwt.token";
