import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "./errors";
import { userRoutes } from "./routes/user.routes";
import { tandaRoutes } from "./routes/tanda.routes";
import { poolRoutes } from "./routes/pool.routes";

const app = new Hono();

// --- Mount route groups ---
app.route("/api/users", userRoutes);
app.route("/api/tandas", tandaRoutes);
app.route("/api/pools", poolRoutes);

// --- Health check ---
app.get("/health", (c) => c.json({ status: "ok" }));

// --- Global error handler ---
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.statusCode as ContentfulStatusCode);
  }
  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

// --- 404 fallback ---
app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;

