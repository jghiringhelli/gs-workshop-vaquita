import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import { authService } from "../services/auth.service";
import { userService } from "../services/user.service";

export const userRoutes = new Hono();

// --- Validation schemas ---

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
});

// --- Auth endpoints ---

// POST /api/users/register — Register a new user with hashed password
userRoutes.post(
  "/register",
  validator("json", (value, c) => {
    const result = registerSchema.safeParse(value);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.issues }, 422);
    }
    return result.data;
  }),
  async (c) => {
    const data = c.req.valid("json");
    const user = await authService.register(data);
    return c.json(user, 201);
  }
);

// POST /api/users/login — Authenticate and return JWT
userRoutes.post(
  "/login",
  validator("json", (value, c) => {
    const result = loginSchema.safeParse(value);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.issues }, 422);
    }
    return result.data;
  }),
  async (c) => {
    const data = c.req.valid("json");
    const result = await authService.login(data);
    return c.json(result, 200);
  }
);

// --- User CRUD endpoints ---

// POST /api/users — Create a user (no password — simple domain model)
userRoutes.post(
  "/",
  validator("json", (value, c) => {
    const result = createUserSchema.safeParse(value);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.issues }, 422);
    }
    return result.data;
  }),
  async (c) => {
    const data = c.req.valid("json");
    const user = await userService.createUser(data);
    return c.json(user, 201);
  }
);

// GET /api/users — List users
userRoutes.get("/", async (c) => {
  const users = await userService.listUsers();
  return c.json(users, 200);
});

// GET /api/users/:id — Get user by ID
userRoutes.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) {
    return c.json({ error: "Invalid user ID" }, 400);
  }
  const user = await userService.getUserById(id);
  return c.json(user, 200);
});

