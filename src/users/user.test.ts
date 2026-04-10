import supertest from "supertest";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { app } from "../app";
import { prisma } from "../db/client";

const request = supertest(app);

// Clean the user table before every test for isolation.
beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ── POST /api/users/register ───────────────────────────────────────────────

describe("POST /api/users/register", () => {
  const validPayload = {
    email: "alice@example.com",
    username: "alice",
    password: "supersecret1",
  };

  it("creates a user and returns 201 with safe user fields", async () => {
    const res = await request.post("/api/users/register").send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: "alice@example.com",
      username: "alice",
    });
    // id should be present
    expect(res.body.user.id).toBeDefined();
    // password hash must NOT be in the response
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("returns 409 when the email is already registered", async () => {
    await request.post("/api/users/register").send(validPayload);
    const res = await request.post("/api/users/register").send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email/i);
  });

  it("returns 409 when the username is already taken", async () => {
    await request.post("/api/users/register").send(validPayload);
    const res = await request.post("/api/users/register").send({
      ...validPayload,
      email: "other@example.com", // different email, same username
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/username/i);
  });

  it("returns 400 when the email is invalid", async () => {
    const res = await request
      .post("/api/users/register")
      .send({ ...validPayload, email: "not-an-email" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when the password is too short", async () => {
    const res = await request
      .post("/api/users/register")
      .send({ ...validPayload, password: "short" });

    expect(res.status).toBe(400);
  });
});

// ── POST /api/users/login ──────────────────────────────────────────────────

describe("POST /api/users/login", () => {
  const credentials = {
    email: "bob@example.com",
    username: "bob",
    password: "correcthorsebatterystaple",
  };

  // Register a user to log in with before each login test.
  beforeEach(async () => {
    await request.post("/api/users/register").send(credentials);
  });

  it("returns 200 with a JWT token and safe user on valid credentials", async () => {
    const res = await request
      .post("/api/users/login")
      .send({ email: credentials.email, password: credentials.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toMatchObject({
      email: credentials.email,
      username: credentials.username,
    });
    // Hash must not leak
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("returns 401 on wrong password", async () => {
    const res = await request
      .post("/api/users/login")
      .send({ email: credentials.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns 401 for an email that does not exist", async () => {
    const res = await request
      .post("/api/users/login")
      .send({ email: "nobody@example.com", password: credentials.password });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns 400 when the email field is missing", async () => {
    const res = await request
      .post("/api/users/login")
      .send({ password: credentials.password });

    expect(res.status).toBe(400);
  });
});
