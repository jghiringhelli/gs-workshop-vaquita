/**
 * Test fixtures for tanda route tests.
 */
import type { Tanda, Participant, Contribution, User } from "@prisma/client";

export const mockOrganizer: User = {
  id: 1,
  email: "alice@example.com",
  name: "Alice",
  password: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const mockMember1: User = {
  id: 2,
  email: "bob@example.com",
  name: "Bob",
  password: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const mockMember2: User = {
  id: 3,
  email: "carol@example.com",
  name: "Carol",
  password: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

// Tanda in forming status (not enough participants to start)
export const mockTandaForming: Tanda = {
  id: 1,
  name: "Tanda Enero",
  contributionAmount: 1000,
  status: "forming",
  currentRound: 0,
  totalRounds: 0,
  organizerId: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

// Tanda in active status with 3 rounds
export const mockTandaActive: Tanda = {
  ...mockTandaForming,
  status: "active",
  currentRound: 1,
  totalRounds: 3,
};

export const mockParticipantOrganizer: Participant = {
  id: 1,
  userId: 1,
  tandaId: 1,
  role: "organizer",
  rotationPosition: null,
  isDefaulter: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const mockParticipantMember1: Participant = {
  id: 2,
  userId: 2,
  tandaId: 1,
  role: "member",
  rotationPosition: null,
  isDefaulter: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const mockParticipantMember2: Participant = {
  id: 3,
  userId: 3,
  tandaId: 1,
  role: "member",
  rotationPosition: null,
  isDefaulter: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const mockParticipantsWithUsers = [
  { ...mockParticipantOrganizer, user: mockOrganizer },
  { ...mockParticipantMember1, user: mockMember1 },
  { ...mockParticipantMember2, user: mockMember2 },
];

// Tanda returned by findById (with includes)
export const mockTandaWithDetails = {
  ...mockTandaForming,
  organizer: mockOrganizer,
  participants: mockParticipantsWithUsers,
};

export const mockTandaActiveWithDetails = {
  ...mockTandaActive,
  organizer: mockOrganizer,
  participants: mockParticipantsWithUsers,
};

export const mockContribution: Contribution = {
  id: 1,
  tandaId: 1,
  participantId: 1,
  round: 1,
  amount: 1000,
  status: "paid",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

// Request payloads
export const createTandaPayload = {
  name: "Tanda Enero",
  organizerId: 1,
  contributionAmount: 1000,
};

export const joinPayload = { userId: 2 };
export const organizerPayload = { requesterId: 1 };
export const nonOrganizerPayload = { requesterId: 99 };
export const contributionPayload = { participantId: 1 };
