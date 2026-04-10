import { prisma } from '../db/client';

/** Delete all rows in dependency-safe reverse order. Call in beforeEach. */
export async function resetDb(): Promise<void> {
  // Pool domain
  await prisma.withdrawal.deleteMany();
  await prisma.poolContribution.deleteMany();
  await prisma.poolMember.deleteMany();
  await prisma.pool.deleteMany();
  // Tanda domain
  await prisma.contribution.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.tanda.deleteMany();
  // Shared
  await prisma.user.deleteMany();
}
