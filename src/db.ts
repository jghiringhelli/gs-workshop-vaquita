import { PrismaClient } from "@prisma/client";

// Singleton Prisma client
const prisma = new PrismaClient();

export default prisma;

