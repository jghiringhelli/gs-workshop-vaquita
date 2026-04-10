import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../app";
import {
  mockUser,
  registerPayload,
  loginPayload,
  mockToken,
} from "./__mock__/userRoutesMockData";

// --- Module mocks (hoisted before imports) ---

vi.mock("../db", () => ({
  default: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$10$mockhashforpassword123456789"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("mock.jwt.token"),
    verify: vi.fn(),
  },
}));

// Import mocked modules after vi.mock declarations
import prisma from "../db";

// Helper to make JSON requests against the Hono app
function jsonRequest(path: string, body: unknown): Promise<Response> {
  return app.request(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: new Headers({ "Content-Type": "application/json" }),
  });
}

// -------------------------------------------------------------------
// POST /api/users/register
// -------------------------------------------------------------------
describe("POST /api/users/register", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.create).mockReset();
  });

  it("happy path — creates user and returns safe user (no password)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null); // email not taken
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

    const res = await jsonRequest("/api/users/register", registerPayload);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
    });
    // Password must never appear in the response
    expect(body).not.toHaveProperty("password");
  });

  it("409 — duplicate email returns Conflict", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser); // email already exists

    const res = await jsonRequest("/api/users/register", registerPayload);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toHaveProperty("error");
  });

  it("422 — missing required fields returns validation error", async () => {
    const res = await jsonRequest("/api/users/register", { email: "bad-email" });
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body).toHaveProperty("error", "Validation failed");
    expect(body).toHaveProperty("details");
  });

  it("422 — password shorter than 8 chars is rejected", async () => {
    const res = await jsonRequest("/api/users/register", {
      ...registerPayload,
      password: "short",
    });
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body).toHaveProperty("error", "Validation failed");
  });
});

// -------------------------------------------------------------------
// POST /api/users/login
// -------------------------------------------------------------------
describe("POST /api/users/login", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
  });

  it("happy path — returns JWT token", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser); // user found

    const res = await jsonRequest("/api/users/login", loginPayload);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ token: mockToken });
  });

  it("401 — unknown email returns Unauthorized", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null); // no such user

    const res = await jsonRequest("/api/users/login", loginPayload);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toHaveProperty("error");
  });

  it("401 — wrong password returns Unauthorized", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    const bcrypt = (await import("bcryptjs")).default;
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false); // wrong password

    const res = await jsonRequest("/api/users/login", {
      ...loginPayload,
      password: "wrongpassword",
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toHaveProperty("error");
  });

  it("422 — missing password field returns validation error", async () => {
    const res = await jsonRequest("/api/users/login", { email: "alice@example.com" });
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body).toHaveProperty("error", "Validation failed");
  });
});
