/**
 * Test fixtures for pool route tests.
 */
import type { Pool, PoolMember, PoolContribution, PoolWithdrawal, User } from "@prisma/client";

export const mockUser: User = {
  id: 1,
  email: "alice@example.com",
  name: "Alice",
  password: "$2b$10$mockhash",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const mockSecondUser: User = {
  id: 2,
  email: "bob@example.com",
  name: "Bob",
  password: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const mockPool: Pool = {
  id: 1,
  name: "Emergency Fund",
  purpose: "For unexpected expenses",
  targetAmount: 100000, // 1000 MXN in cents
  currency: "MXN",
  status: "open",
  organizerId: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const mockPoolMember: PoolMember = {
  id: 1,
  poolId: 1,
  userId: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const mockPoolMemberWithUser = {
  ...mockPoolMember,
  user: mockUser,
  contributions: [],
};

// Pool as returned by findById (with full includes)
export const mockPoolWithDetails = {
  ...mockPool,
  organizer: mockUser,
  members: [mockPoolMemberWithUser],
  contributions: [],
  withdrawals: [] as PoolWithdrawal[],
};

export const mockContribution: PoolContribution = {
  id: 1,
  poolId: 1,
  memberId: 1,
  amountCents: 50000,
  note: "Monthly contribution",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

// Request payloads
export const createPoolPayload = {
  name: "Emergency Fund",
  purpose: "For unexpected expenses",
  targetAmount: 100000,
  currency: "MXN",
  organizerId: 1,
};

export const invitePayload = {
  userId: 2,
  requesterId: 1, // must match pool.organizerId
};

export const contributePayload = {
  userId: 1,
  amountCents: 50000,
  note: "Monthly contribution",
};
