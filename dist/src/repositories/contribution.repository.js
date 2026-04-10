import prisma from '../db/index.js';
export const createContribution = async (tandaId, participantId, round, amount) => {
    return prisma.contribution.create({
        data: { tandaId, participantId, round, amount, status: 'PAID' },
    });
};
export const markContributionLate = async (contributionId) => {
    return prisma.contribution.update({
        where: { id: contributionId },
        data: { status: 'LATE' },
    });
};
export const getContributionsForRound = async (tandaId, round) => {
    return prisma.contribution.findMany({
        where: { tandaId, round },
    });
};
//# sourceMappingURL=contribution.repository.js.map