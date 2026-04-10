import express, { type NextFunction, type Request, type Response } from "express";
import { userRouter } from "./users/user.router";
import { AppError } from "./errors/AppError";

const app = express();

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────
app.use("/api/users", userRouter);

// ── Global error handler ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export { app };
