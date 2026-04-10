import { config } from "./config/index.js";
import { getDatabase, closeDatabase } from "./database/connection.js";
import { createApp } from "./app.js";

const db = getDatabase();
const app = createApp(db);

const server = app.listen(config.PORT, () => {
  console.log(`🫰 Tanda API running on http://localhost:${config.PORT}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down gracefully");
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
});
