import { prisma } from '../db/client';

/** Delete all rows in dependency-safe reverse order. Call in beforeEach. */
export async function resetDb(): Promise<void> {
  await prisma.contribution.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.tanda.deleteMany();
  await prisma.user.deleteMany();
}
