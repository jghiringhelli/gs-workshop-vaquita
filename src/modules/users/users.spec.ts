import request from "supertest";

import { app } from "../../app";
import { db } from "../../db/database";

describe("users endpoints", () => {
  beforeEach(() => {
    db.prepare("DELETE FROM contributions").run();
    db.prepare("DELETE FROM participants").run();
    db.prepare("DELETE FROM tandas").run();
    db.prepare("DELETE FROM users").run();
  });

  describe("POST /api/users", () => {
    it("creates a user", async () => {
      const response = await request(app).post("/api/users").send({
        email: "alice@example.com",
        name: "Alice",
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(Number),
        email: "alice@example.com",
        name: "Alice",
      });
    });

    it("returns 409 when the email already exists", async () => {
      await request(app).post("/api/users").send({
        email: "alice@example.com",
        name: "Alice",
      });

      const response = await request(app).post("/api/users").send({
        email: "alice@example.com",
        name: "Alice 2",
      });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });
  });

  describe("GET /api/users", () => {
    it("lists users", async () => {
      await request(app).post("/api/users").send({
        email: "alice@example.com",
        name: "Alice",
      });
      await request(app).post("/api/users").send({
        email: "bob@example.com",
        name: "Bob",
      });

      const response = await request(app).get("/api/users");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { id: expect.any(Number), email: "alice@example.com", name: "Alice" },
        { id: expect.any(Number), email: "bob@example.com", name: "Bob" },
      ]);
    });

    it("returns 400 for unsupported query parameters", async () => {
      const response = await request(app).get("/api/users?unexpected=true");

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/users/:id", () => {
    it("returns a user by id", async () => {
      const createResponse = await request(app).post("/api/users").send({
        email: "alice@example.com",
        name: "Alice",
      });

      const response = await request(app).get(`/api/users/${createResponse.body.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: createResponse.body.id,
        email: "alice@example.com",
        name: "Alice",
      });
    });

    it("returns 400 when the id is invalid", async () => {
      const response = await request(app).get("/api/users/not-a-number");

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});