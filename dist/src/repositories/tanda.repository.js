import prisma from '../db/index.js';
export const advanceTandaRound = async (tandaId) => {
    const tanda = await prisma.tanda.findUnique({ where: { id: tandaId } });
    if (!tanda)
        throw new Error('Tanda not found');
    if (tanda.currentRound >= tanda.totalRounds)
        throw new Error('Tanda already completed');
    return prisma.tanda.update({
        where: { id: tandaId },
        data: { currentRound: { increment: 1 } },
    });
};
export const getTandaById = async (tandaId) => {
    return prisma.tanda.findUnique({ where: { id: tandaId } });
};
export const getAllTandas = async () => {
    return prisma.tanda.findMany();
};
//# sourceMappingURL=tanda.repository.js.map