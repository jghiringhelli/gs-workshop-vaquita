import { createApp } from "./app";

/**
 * Start the HTTP server when the file is executed directly.
 *
 * @returns No return value.
 */
function startServer(): void {
  const app = createApp();
  const port = Number(process.env["PORT"] ?? 3000);
  app.listen(port);
}

if (process.env["NODE_ENV"] !== "test") {
  startServer();
}
