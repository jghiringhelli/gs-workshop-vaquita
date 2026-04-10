import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function createPrismaClient(dbUrl?: string) {
  const url = dbUrl ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

// Singleton: reuse the same client across the process lifetime.
const prisma = createPrismaClient();

export { prisma, createPrismaClient };
