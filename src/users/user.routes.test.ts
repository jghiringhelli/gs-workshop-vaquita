import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createApp } from "../app.js";
import request from "supertest";
import type { Express } from "express";

let app: Express;
let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  app = createApp(db);
});

afterEach(() => {
  db.close();
});

describe("POST /api/users", () => {
  it("creates a user and returns 201", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ email: "alice@example.com", name: "Alice" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      email: "alice@example.com",
      name: "Alice",
    });
    expect(res.body.data.id).toBeDefined();
  });

  it("returns 409 for duplicate email", async () => {
    await request(app)
      .post("/api/users")
      .send({ email: "alice@example.com", name: "Alice" });

    const res = await request(app)
      .post("/api/users")
      .send({ email: "alice@example.com", name: "Alice 2" });

    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid email", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ email: "not-an-email", name: "Alice" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ email: "bob@example.com" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/users", () => {
  it("returns empty array when no users", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns all users", async () => {
    await request(app).post("/api/users").send({ email: "a@x.com", name: "A" });
    await request(app).post("/api/users").send({ email: "b@x.com", name: "B" });

    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe("GET /api/users/:id", () => {
  it("returns user by ID", async () => {
    const created = await request(app)
      .post("/api/users")
      .send({ email: "alice@example.com", name: "Alice" });

    const res = await request(app).get(`/api/users/${created.body.data.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("alice@example.com");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await request(app).get(
      "/api/users/00000000-0000-0000-0000-000000000000"
    );
    expect(res.status).toBe(404);
  });
});
