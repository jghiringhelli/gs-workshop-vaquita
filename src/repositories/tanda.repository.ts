/**
 * Tanda repository — all database interactions for tandas, participants, contributions.
 */
import type { Tanda, Participant, Contribution, User } from "@prisma/client";
import prisma from "../db";
import type { Prisma } from "@prisma/client";

// Payload types for queries that use `include`
type TandaWithDetails = Tanda & {
  participants: (Participant & { user: User })[];
  organizer: User;
};

type ParticipantWithUser = Participant & { user: User };

type ContributionWithParticipant = Contribution & {
  participant: Participant & { user: User };
};

export const tandaRepository = {
  async create(data: Prisma.TandaCreateInput): Promise<Tanda> {
    return prisma.tanda.create({ data });
  },

  async findById(id: number): Promise<TandaWithDetails | null> {
    return prisma.tanda.findUnique({
      where: { id },
      include: { participants: { include: { user: true } }, organizer: true },
    });
  },

  async findByUserId(userId: number): Promise<Tanda[]> {
    return prisma.tanda.findMany({
      where: { participants: { some: { userId } } },
    });
  },

  async update(id: number, data: Prisma.TandaUpdateInput): Promise<Tanda> {
    return prisma.tanda.update({ where: { id }, data });
  },

  async addParticipant(data: { userId: number; tandaId: number; role: string }): Promise<Participant> {
    return prisma.participant.create({ data });
  },

  async getParticipants(tandaId: number): Promise<ParticipantWithUser[]> {
    return prisma.participant.findMany({
      where: { tandaId },
      include: { user: true },
    });
  },

  async getParticipantCount(tandaId: number): Promise<number> {
    return prisma.participant.count({ where: { tandaId } });
  },

  async findParticipant(userId: number, tandaId: number): Promise<Participant | null> {
    return prisma.participant.findUnique({
      where: { userId_tandaId: { userId, tandaId } },
    });
  },

  async updateParticipant(id: number, data: Prisma.ParticipantUpdateInput): Promise<Participant> {
    return prisma.participant.update({ where: { id }, data });
  },

  async createContribution(data: {
    round: number;
    amount: number;
    status: string;
    participantId: number;
    tandaId: number;
  }): Promise<Contribution> {
    return prisma.contribution.create({ data });
  },

  async getContributionsByRound(tandaId: number, round: number): Promise<ContributionWithParticipant[]> {
    return prisma.contribution.findMany({
      where: { tandaId, round },
      include: { participant: { include: { user: true } } },
    });
  },

  async getContributionHistory(participantId: number): Promise<Contribution[]> {
    return prisma.contribution.findMany({
      where: { participantId },
      orderBy: { round: "asc" },
    });
  },
};

