import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import { resetDb } from "../db/database";

describe("User API", () => {
  beforeEach(() => {
    resetDb();
  });

  describe("POST /api/users", () => {
    it("should create a user", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ email: "alice@example.com", name: "Alice" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: 1,
        email: "alice@example.com",
        name: "Alice",
      });
    });

    it("should return 422 for invalid email", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ email: "not-an-email", name: "Alice" });

      expect(res.status).toBe(422);
    });

    it("should return 422 for missing name", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ email: "alice@example.com" });

      expect(res.status).toBe(422);
    });

    it("should return 409 for duplicate email", async () => {
      await request(app)
        .post("/api/users")
        .send({ email: "alice@example.com", name: "Alice" });

      const res = await request(app)
        .post("/api/users")
        .send({ email: "alice@example.com", name: "Alice 2" });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/users", () => {
    it("should list all users", async () => {
      await request(app)
        .post("/api/users")
        .send({ email: "a@b.com", name: "A" });
      await request(app)
        .post("/api/users")
        .send({ email: "c@d.com", name: "C" });

      const res = await request(app).get("/api/users");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe("GET /api/users/:id", () => {
    it("should get a user by id", async () => {
      await request(app)
        .post("/api/users")
        .send({ email: "a@b.com", name: "A" });

      const res = await request(app).get("/api/users/1");

      expect(res.status).toBe(200);
      expect(res.body.email).toBe("a@b.com");
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app).get("/api/users/999");

      expect(res.status).toBe(404);
    });
  });
});
