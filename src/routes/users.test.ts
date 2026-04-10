import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../index";
import { db } from "../db/database";

beforeEach(() => {
  db.exec(
    "DELETE FROM contributions; DELETE FROM participants; DELETE FROM tandas; DELETE FROM users;",
  );
});

describe("POST /api/users", () => {
  it("creates a user and returns 201", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ email: "alice@example.com", name: "Alice" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: "alice@example.com", name: "Alice" });
    expect(res.body.id).toBeDefined();
  });

  it("returns 409 when email already exists", async () => {
    await request(app)
      .post("/api/users")
      .send({ email: "alice@example.com", name: "Alice" });

    const res = await request(app)
      .post("/api/users")
      .send({ email: "alice@example.com", name: "Alice 2" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ email: "not-an-email", name: "Alice" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ email: "alice@example.com" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/users", () => {
  it("returns empty array when no users", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns all users", async () => {
    await request(app)
      .post("/api/users")
      .send({ email: "alice@example.com", name: "Alice" });
    await request(app)
      .post("/api/users")
      .send({ email: "bob@example.com", name: "Bob" });

    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe("GET /api/users/:id", () => {
  it("returns a user by id", async () => {
    const created = await request(app)
      .post("/api/users")
      .send({ email: "alice@example.com", name: "Alice" });

    const res = await request(app).get(`/api/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("alice@example.com");
  });

  it("returns 404 when user not found", async () => {
    const res = await request(app).get("/api/users/nonexistent-id");
    expect(res.status).toBe(404);
  });
});
