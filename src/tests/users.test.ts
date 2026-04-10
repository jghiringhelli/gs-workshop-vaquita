import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { resetDb } from "../db/database.js";

const app = createApp();

describe("Users API", () => {
  beforeEach(() => {
    resetDb();
  });

  describe("POST /api/users", () => {
    it("should create a user and return 201", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ email: "alice@example.com", name: "Alice" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(Number),
        email: "alice@example.com",
        name: "Alice",
      });
    });

    it("should return 409 for duplicate email", async () => {
      await request(app)
        .post("/api/users")
        .send({ email: "alice@example.com", name: "Alice" });

      const res = await request(app)
        .post("/api/users")
        .send({ email: "alice@example.com", name: "Alice 2" });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 for invalid email", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ email: "not-an-email", name: "Alice" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 for missing name", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ email: "alice@example.com" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/users", () => {
    it("should return an empty array when no users exist", async () => {
      const res = await request(app).get("/api/users");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return all users", async () => {
      await request(app)
        .post("/api/users")
        .send({ email: "a@test.com", name: "A" });
      await request(app)
        .post("/api/users")
        .send({ email: "b@test.com", name: "B" });

      const res = await request(app).get("/api/users");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe("GET /api/users/:id", () => {
    it("should return a user by ID", async () => {
      const created = await request(app)
        .post("/api/users")
        .send({ email: "alice@example.com", name: "Alice" });

      const res = await request(app).get(`/api/users/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe("alice@example.com");
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app).get("/api/users/999");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 for invalid ID", async () => {
      const res = await request(app).get("/api/users/abc");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });
});
