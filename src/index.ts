import express from "express";
import { usersRouter } from "./routes/users";
import { tandasRouter } from "./routes/tandas";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

app.use(express.json());

app.use("/api/users", usersRouter);
app.use("/api/tandas", tandasRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handler must be last
app.use(errorHandler);

const PORT = parseInt(process.env.PORT ?? "3000", 10);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Tanda API running on http://localhost:${PORT}`);
  });
}

