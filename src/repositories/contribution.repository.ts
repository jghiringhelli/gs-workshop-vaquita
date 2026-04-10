import prisma from '../db/index.js';

export const createContribution = async (tandaId: number, participantId: number, round: number, amount: number) => {
  return prisma.contribution.create({
    data: { tandaId, participantId, round, amount, status: 'PAID' },
  });
};

export const markContributionLate = async (contributionId: number) => {
  return prisma.contribution.update({
    where: { id: contributionId },
    data: { status: 'LATE' },
  });
};

export const getContributionsForRound = async (tandaId: number, round: number) => {
  return prisma.contribution.findMany({
    where: { tandaId, round },
  });
};
