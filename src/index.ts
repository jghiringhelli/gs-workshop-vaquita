import createApp from "./app";
import config from "./config";

const app = createApp();

const server = app.listen(config.server.port, () => {
  console.log(`🫰 Tanda API listening on http://localhost:${config.server.port}`);
  if (config.env === "development") {
    console.log("Development mode enabled");
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
