import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { resetDb } from "../db/database.js";

const app = createApp();

async function createUser(email: string, name: string): Promise<number> {
  const res = await request(app)
    .post("/api/users")
    .send({ email, name });
  return res.body.id;
}

async function createTanda(
  organizerId: number,
  name = "Tanda Test",
  contributionAmount = 1000
): Promise<number> {
  const res = await request(app)
    .post("/api/tandas")
    .send({ name, organizerId, contributionAmount });
  return res.body.id;
}

async function joinTanda(tandaId: number, userId: number): Promise<number> {
  const res = await request(app)
    .post(`/api/tandas/${tandaId}/join`)
    .send({ userId });
  return res.body.id;
}

async function setupActiveTanda(): Promise<{
  organizerId: number;
  tandaId: number;
  userIds: number[];
}> {
  const org = await createUser("org@test.com", "Organizer");
  const u2 = await createUser("u2@test.com", "User2");
  const u3 = await createUser("u3@test.com", "User3");
  const tandaId = await createTanda(org);
  await joinTanda(tandaId, u2);
  await joinTanda(tandaId, u3);
  await request(app)
    .post(`/api/tandas/${tandaId}/start`)
    .send({ userId: org });
  return { organizerId: org, tandaId, userIds: [org, u2, u3] };
}

describe("Tandas API", () => {
  beforeEach(() => {
    resetDb();
  });

  describe("POST /api/tandas", () => {
    it("should create a tanda and return 201", async () => {
      const userId = await createUser("org@test.com", "Org");

      const res = await request(app)
        .post("/api/tandas")
        .send({ name: "Tanda Enero", organizerId: userId, contributionAmount: 1000 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(Number),
        name: "Tanda Enero",
        organizer_id: userId,
        contribution_amount: 1000,
        status: "forming",
        current_round: 0,
        total_rounds: 0,
      });
    });

    it("should return 404 for non-existent organizer", async () => {
      const res = await request(app)
        .post("/api/tandas")
        .send({ name: "Tanda", organizerId: 999, contributionAmount: 1000 });

      expect(res.status).toBe(404);
    });

    it("should return 400 for missing fields", async () => {
      const res = await request(app)
        .post("/api/tandas")
        .send({ name: "Tanda" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/tandas", () => {
    it("should return all tandas", async () => {
      const userId = await createUser("org@test.com", "Org");
      await createTanda(userId);

      const res = await request(app).get("/api/tandas");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("should filter tandas by userId", async () => {
      const u1 = await createUser("u1@test.com", "U1");
      const u2 = await createUser("u2@test.com", "U2");
      await createTanda(u1, "Tanda 1");
      await createTanda(u2, "Tanda 2");

      const res = await request(app).get(`/api/tandas?userId=${u1}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Tanda 1");
    });
  });

  describe("GET /api/tandas/:id", () => {
    it("should return tanda by ID", async () => {
      const userId = await createUser("org@test.com", "Org");
      const tandaId = await createTanda(userId);

      const res = await request(app).get(`/api/tandas/${tandaId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(tandaId);
    });

    it("should return 404 for non-existent tanda", async () => {
      const res = await request(app).get("/api/tandas/999");

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/tandas/:id/start", () => {
    it("should start a tanda with 3+ participants", async () => {
      const { organizerId, tandaId } = await setupActiveTanda();

      const res = await request(app).get(`/api/tandas/${tandaId}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("active");
      expect(res.body.current_round).toBe(1);
      expect(res.body.total_rounds).toBe(3);
    });

    it("should return 400 with less than 3 participants", async () => {
      const org = await createUser("org@test.com", "Org");
      const u2 = await createUser("u2@test.com", "U2");
      const tandaId = await createTanda(org);
      await joinTanda(tandaId, u2);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .send({ userId: org });

      expect(res.status).toBe(400);
    });

    it("should return 403 if non-organizer tries to start", async () => {
      const org = await createUser("org@test.com", "Org");
      const u2 = await createUser("u2@test.com", "U2");
      const u3 = await createUser("u3@test.com", "U3");
      const tandaId = await createTanda(org);
      await joinTanda(tandaId, u2);
      await joinTanda(tandaId, u3);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .send({ userId: u2 });

      expect(res.status).toBe(403);
    });

    it("should return 400 if tanda is not in forming status", async () => {
      const { organizerId, tandaId } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .send({ userId: organizerId });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/tandas/:id/cancel", () => {
    it("should cancel a forming tanda", async () => {
      const org = await createUser("org@test.com", "Org");
      const tandaId = await createTanda(org);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/cancel`)
        .send({ userId: org });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("cancelled");
    });

    it("should cancel an active tanda", async () => {
      const { organizerId, tandaId } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/cancel`)
        .send({ userId: organizerId });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("cancelled");
    });

    it("should return 403 if non-organizer tries to cancel", async () => {
      const org = await createUser("org@test.com", "Org");
      const u2 = await createUser("u2@test.com", "U2");
      const tandaId = await createTanda(org);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/cancel`)
        .send({ userId: u2 });

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/tandas/:id/advance", () => {
    it("should advance to next round", async () => {
      const { organizerId, tandaId } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .send({ userId: organizerId });

      expect(res.status).toBe(200);
      expect(res.body.current_round).toBe(2);
    });

    it("should auto-complete after last round", async () => {
      const { organizerId, tandaId } = await setupActiveTanda();

      // Advance through all 3 rounds
      await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .send({ userId: organizerId });
      await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .send({ userId: organizerId });
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .send({ userId: organizerId });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("completed");
    });

    it("should return 403 if non-organizer tries to advance", async () => {
      const { tandaId, userIds } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .send({ userId: userIds[1] });

      expect(res.status).toBe(403);
    });

    it("should return 400 if tanda is not active", async () => {
      const org = await createUser("org@test.com", "Org");
      const tandaId = await createTanda(org);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .send({ userId: org });

      expect(res.status).toBe(400);
    });
  });
});
