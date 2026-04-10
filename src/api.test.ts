import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { closeDatabase, getDatabase, initializeDatabase } from "./db";
import { generateToken } from "./middleware";
import type { Express } from "express";

let app: Express;
let userId: string;
let tandaId: string;
let participantId: string;
let token: string;

describe("Tanda API", () => {
  beforeAll(() => {
    app = createApp();
    
    // Clear database for fresh tests
    try {
      const db = getDatabase();
      db.exec(`
        DELETE FROM contributions;
        DELETE FROM participants;
        DELETE FROM tandas;
        DELETE FROM users;
      `);
    } catch (error) {
      // Database might not be initialized yet, that's OK
      console.log("Could not clear database:", error);
    }
  });

  afterAll(() => {
    closeDatabase();
  });

  // ============= USER TESTS =============
  describe("POST /api/users", () => {
    it("should create a new user", async () => {
      const response = await request(app)
        .post("/api/users")
        .send({
          email: "alice@example.com",
          name: "Alice",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("token");
      expect(response.body.email).toBe("alice@example.com");
      expect(response.body.name).toBe("Alice");
      userId = response.body.id;
      token = response.body.token;
    });

    it("should reject duplicate email", async () => {
      const response = await request(app)
        .post("/api/users")
        .send({
          email: "alice@example.com",
          name: "Alice Smith",
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("code", "CONFLICT");
    });

    it("should reject invalid email", async () => {
      const response = await request(app)
        .post("/api/users")
        .send({
          email: "not-an-email",
          name: "Bob",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("should reject missing name", async () => {
      const response = await request(app)
        .post("/api/users")
        .send({
          email: "bob@example.com",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
    });
  });

  describe("GET /api/users", () => {
    it("should list all users", async () => {
      const response = await request(app).get("/api/users");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/users/:id", () => {
    it("should get user by ID", async () => {
      const response = await request(app).get(`/api/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe("alice@example.com");
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(app).get("/api/users/nonexistent-id");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("code", "NOT_FOUND");
    });
  });

  // ============= TANDA TESTS =============
  describe("POST /api/tandas", () => {
    it("should create a new tanda", async () => {
      const response = await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Tanda Enero",
          organizerId: userId,
          contributionAmount: 1000,
          totalRounds: 3,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("Tanda Enero");
      expect(response.body.status).toBe("forming");
      expect(response.body.currentRound).toBe(1);
      expect(response.body.totalRounds).toBe(3);
      tandaId = response.body.id;
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .post("/api/tandas")
        .send({
          name: "Tanda Febrero",
          organizerId: userId,
          contributionAmount: 1000,
        });

      expect(response.status).toBe(401);
    });

    it("should reject invalid organizer ID", async () => {
      const response = await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Tanda Marzo",
          organizerId: "invalid-uuid",
          contributionAmount: 1000,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("should reject negative contribution amount", async () => {
      const response = await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Tanda Abril",
          organizerId: userId,
          contributionAmount: -100,
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/tandas", () => {
    it("should list all tandas", async () => {
      const response = await request(app).get("/api/tandas");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should filter tandas by userId", async () => {
      const response = await request(app).get(`/api/tandas?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].organizerId).toBe(userId);
    });
  });

  describe("GET /api/tandas/:id", () => {
    it("should get tanda by ID", async () => {
      const response = await request(app).get(`/api/tandas/${tandaId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(tandaId);
      expect(response.body.name).toBe("Tanda Enero");
    });

    it("should return 404 for non-existent tanda", async () => {
      const response = await request(app).get("/api/tandas/nonexistent-id");

      expect(response.status).toBe(404);
    });
  });

  // ============= PARTICIPANT TESTS =============
  describe("POST /api/tandas/:id/join", () => {
    let secondUserId: string;
    let secondToken: string;

    beforeAll(async () => {
      // Create second user
      const response = await request(app)
        .post("/api/users")
        .send({
          email: "bob@example.com",
          name: "Bob",
        });
      secondUserId = response.body.id;
      secondToken = response.body.token;
    });

    it("should join a tanda", async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .set("Authorization", `Bearer ${secondToken}`)
        .send({
          userId: secondUserId,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.userId).toBe(secondUserId);
      expect(response.body.withoutAuth).toBeUndefined();
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({
          userId: secondUserId,
        });

      expect(response.status).toBe(401);
    });

    it("should reject duplicate joining", async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .set("Authorization", `Bearer ${secondToken}`)
        .send({
          userId: secondUserId,
        });

      expect(response.status).toBe(409);
    });

    it("should reject non-existent user", async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          userId: "invalid-uuid",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
    });
  });

  describe("GET /api/tandas/:id/participants", () => {
    it("should list participants in tanda", async () => {
      const response = await request(app).get(`/api/tandas/${tandaId}/participants`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should return 404 for non-existent tanda", async () => {
      const response = await request(app).get("/api/tandas/nonexistent-id/participants");

      expect(response.status).toBe(404);
    });
  });

  // ============= TANDA OPERATIONS =============
  describe("POST /api/tandas/:id/start", () => {
    let startTestTandaId: string;
    let startTestUserId: string;
    let startTestToken: string;
    let startTestUser2Id: string;
    let startTestUser2Token: string;

    beforeAll(async () => {
      // Create first user for organizing
      const userRes = await request(app)
        .post("/api/users")
        .send({
          email: "organizer-start@example.com",
          name: "StartOrganizer",
        });
      startTestUserId = userRes.body.id;
      startTestToken = userRes.body.token;

      // Create second user
      const user2Res = await request(app)
        .post("/api/users")
        .send({
          email: "member-start@example.com",
          name: "StartMember",
        });
      startTestUser2Id = user2Res.body.id;
      startTestUser2Token = user2Res.body.token;

      // Create new tanda
      const tandaRes = await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${startTestToken}`)
        .send({
          name: "Start Test Tanda",
          organizerId: startTestUserId,
          contributionAmount: 500,
        });
      startTestTandaId = tandaRes.body.id;

      // Add second member
      await request(app)
        .post(`/api/tandas/${startTestTandaId}/join`)
        .set("Authorization", `Bearer ${startTestUser2Token}`)
        .send({ userId: startTestUser2Id });

      // Add third member
      const user3Res = await request(app)
        .post("/api/users")
        .send({
          email: "member2-start@example.com",
          name: "StartMember2",
        });
      await request(app)
        .post(`/api/tandas/${startTestTandaId}/join`)
        .set("Authorization", `Bearer ${user3Res.body.token}`)
        .send({ userId: user3Res.body.id });
    });

    it("should start a tanda", async () => {
      const response = await request(app)
        .post(`/api/tandas/${startTestTandaId}/start`)
        .set("Authorization", `Bearer ${startTestToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("active");
    });

    it("should reject without auth", async () => {
      // Create another test tanda
      const tandaRes = await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${startTestToken}`)
        .send({
          name: "No Auth Test",
          organizerId: startTestUserId,
          contributionAmount: 500,
        });

      const response = await request(app).post(`/api/tandas/${tandaRes.body.id}/start`);

      expect(response.status).toBe(401);
    });

    it("should reject if not organizer", async () => {
      // Create another test tanda
      const tandaRes = await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${startTestToken}`)
        .send({
          name: "Not Organizer Test",
          organizerId: startTestUserId,
          contributionAmount: 500,
        });

      // Try to start as non-organizer
      const response = await request(app)
        .post(`/api/tandas/${tandaRes.body.id}/start`)
        .set("Authorization", `Bearer ${startTestUser2Token}`);

      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/tandas/:id/cancel", () => {
    let cancelTestTandaId: string;
    let cancelTestUserId: string;
    let cancelTestToken: string;
    let cancelTestOtherUserId: string;
    let cancelTestOtherToken: string;

    beforeAll(async () => {
      // Create first user for organizing
      const userRes = await request(app)
        .post("/api/users")
        .send({
          email: "organizer-cancel@example.com",
          name: "CancelOrganizer",
        });
      cancelTestUserId = userRes.body.id;
      cancelTestToken = userRes.body.token;

      // Create another user
      const otherRes = await request(app)
        .post("/api/users")
        .send({
          email: "other-cancel@example.com",
          name: "CancelOther",
        });
      cancelTestOtherUserId = otherRes.body.id;
      cancelTestOtherToken = otherRes.body.token;

      // Create new tanda for cancellation
      const tandaRes = await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${cancelTestToken}`)
        .send({
          name: "Cancelable Tanda",
          organizerId: cancelTestUserId,
          contributionAmount: 1000,
        });
      cancelTestTandaId = tandaRes.body.id;
    });

    it("should cancel a tanda", async () => {
      const response = await request(app)
        .post(`/api/tandas/${cancelTestTandaId}/cancel`)
        .set("Authorization", `Bearer ${cancelTestToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("cancelled");
    });

    it("should reject without auth", async () => {
      // Create another tanda
      const tandaRes = await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${cancelTestToken}`)
        .send({
          name: "No Auth Cancel Test",
          organizerId: cancelTestUserId,
          contributionAmount: 1000,
        });

      const response = await request(app).post(`/api/tandas/${tandaRes.body.id}/cancel`);

      expect(response.status).toBe(401);
    });

    it("should reject if not organizer", async () => {
      // Create another tanda
      const tandaRes = await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${cancelTestToken}`)
        .send({
          name: "Not Organizer Cancel Test",
          organizerId: cancelTestUserId,
          contributionAmount: 1000,
        });

      // Try to cancel as non-organizer
      const response = await request(app)
        .post(`/api/tandas/${tandaRes.body.id}/cancel`)
        .set("Authorization", `Bearer ${cancelTestOtherToken}`);

      expect(response.status).toBe(403);
    });
  });

  // ============= HEALTH CHECK =============
  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "ok");
    });
  });

  // ============= 404 =============
  describe("404 Not Found", () => {
    it("should return 404 for undefined routes", async () => {
      const response = await request(app).get("/api/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("code", "NOT_FOUND");
    });
  });
});
