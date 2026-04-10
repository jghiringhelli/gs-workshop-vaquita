import { serve } from "@hono/node-server";
import { config } from "./config";
import app from "./app";
import prisma from "./db";

// Tanda API — Entry point
// Build your API here. Good luck! 🫰

const port = config.port;

// eslint-disable-next-line no-console
console.log(`Tanda API starting on http://localhost:${port}`);

serve({ fetch: app.fetch, port });

// Graceful shutdown — ensure Prisma disconnects cleanly
async function shutdown(): Promise<void> {
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
