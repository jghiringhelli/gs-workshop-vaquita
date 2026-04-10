import { Hono } from "hono";

export const userRoutes = new Hono();

// POST /api/users — Create a user
userRoutes.post("/", async (c) => {
  return c.json({ message: "TODO: create user" }, 501);
});

// GET /api/users — List users
userRoutes.get("/", async (c) => {
  return c.json({ message: "TODO: list users" }, 501);
});

// GET /api/users/:id — Get user by ID
userRoutes.get("/:id", async (c) => {
  return c.json({ message: "TODO: get user" }, 501);
});

