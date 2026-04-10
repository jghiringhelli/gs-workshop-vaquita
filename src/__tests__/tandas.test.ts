import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import { resetDb } from "../db/database";

async function createUser(email: string, name: string) {
  const res = await request(app).post("/api/users").send({ email, name });
  return res.body;
}

async function createTanda(
  name: string,
  organizerId: number,
  contributionAmount: number,
) {
  const res = await request(app)
    .post("/api/tandas")
    .send({ name, organizerId, contributionAmount });
  return res.body;
}

async function joinTanda(tandaId: number, userId: number) {
  const res = await request(app)
    .post(`/api/tandas/${tandaId}/join`)
    .send({ userId });
  return res.body;
}

async function setupActiveTanda() {
  const alice = await createUser("alice@test.com", "Alice");
  const bob = await createUser("bob@test.com", "Bob");
  const charlie = await createUser("charlie@test.com", "Charlie");
  const tanda = await createTanda("Test Tanda", alice.id, 1000);
  await joinTanda(tanda.id, bob.id);
  await joinTanda(tanda.id, charlie.id);
  const startRes = await request(app)
    .post(`/api/tandas/${tanda.id}/start`)
    .send({ organizerId: alice.id });
  return { alice, bob, charlie, tanda: startRes.body };
}

describe("Tanda API", () => {
  beforeEach(() => {
    resetDb();
  });

  describe("POST /api/tandas", () => {
    it("should create a tanda", async () => {
      await createUser("alice@test.com", "Alice");

      const res = await request(app)
        .post("/api/tandas")
        .send({
          name: "Tanda Enero",
          organizerId: 1,
          contributionAmount: 1000,
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: "Tanda Enero",
        organizerId: 1,
        contributionAmount: 1000,
        status: "forming",
      });
    });

    it("should return 404 for non-existent organizer", async () => {
      const res = await request(app)
        .post("/api/tandas")
        .send({ name: "Tanda", organizerId: 999, contributionAmount: 1000 });

      expect(res.status).toBe(404);
    });

    it("should return 422 for missing fields", async () => {
      const res = await request(app)
        .post("/api/tandas")
        .send({ name: "Tanda" });

      expect(res.status).toBe(422);
    });
  });

  describe("GET /api/tandas", () => {
    it("should list tandas for a user", async () => {
      const alice = await createUser("alice@test.com", "Alice");
      await createTanda("Tanda 1", alice.id, 500);

      const res = await request(app).get(`/api/tandas?userId=${alice.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("should return 422 for missing userId", async () => {
      const res = await request(app).get("/api/tandas");

      expect(res.status).toBe(422);
    });
  });

  describe("GET /api/tandas/:id", () => {
    it("should get tanda details", async () => {
      const alice = await createUser("alice@test.com", "Alice");
      const tanda = await createTanda("Tanda 1", alice.id, 500);

      const res = await request(app).get(`/api/tandas/${tanda.id}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Tanda 1");
    });

    it("should return 404 for non-existent tanda", async () => {
      const res = await request(app).get("/api/tandas/999");

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/tandas/:id/join", () => {
    it("should join a tanda", async () => {
      const alice = await createUser("alice@test.com", "Alice");
      const bob = await createUser("bob@test.com", "Bob");
      const tanda = await createTanda("Tanda 1", alice.id, 500);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .send({ userId: bob.id });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe("member");
    });

    it("should return 409 for duplicate join", async () => {
      const alice = await createUser("alice@test.com", "Alice");
      const bob = await createUser("bob@test.com", "Bob");
      const tanda = await createTanda("Tanda 1", alice.id, 500);
      await joinTanda(tanda.id, bob.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .send({ userId: bob.id });

      expect(res.status).toBe(409);
    });

    it("should return 400 for joining a non-forming tanda", async () => {
      const { tanda } = await setupActiveTanda();
      const newUser = await createUser("new@test.com", "New");

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .send({ userId: newUser.id });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/tandas/:id/start", () => {
    it("should start a tanda with enough participants", async () => {
      const alice = await createUser("alice@test.com", "Alice");
      const bob = await createUser("bob@test.com", "Bob");
      const charlie = await createUser("charlie@test.com", "Charlie");
      const tanda = await createTanda("Tanda 1", alice.id, 1000);
      await joinTanda(tanda.id, bob.id);
      await joinTanda(tanda.id, charlie.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .send({ organizerId: alice.id });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("active");
      expect(res.body.currentRound).toBe(1);
      expect(res.body.totalRounds).toBe(3);
    });

    it("should return 400 with less than 3 participants", async () => {
      const alice = await createUser("alice@test.com", "Alice");
      const bob = await createUser("bob@test.com", "Bob");
      const tanda = await createTanda("Tanda 1", alice.id, 1000);
      await joinTanda(tanda.id, bob.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .send({ organizerId: alice.id });

      expect(res.status).toBe(400);
    });

    it("should return 403 for non-organizer", async () => {
      const alice = await createUser("alice@test.com", "Alice");
      const bob = await createUser("bob@test.com", "Bob");
      const charlie = await createUser("charlie@test.com", "Charlie");
      const tanda = await createTanda("Tanda 1", alice.id, 1000);
      await joinTanda(tanda.id, bob.id);
      await joinTanda(tanda.id, charlie.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .send({ organizerId: bob.id });

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/tandas/:id/cancel", () => {
    it("should cancel a tanda", async () => {
      const alice = await createUser("alice@test.com", "Alice");
      const tanda = await createTanda("Tanda 1", alice.id, 1000);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .send({ organizerId: alice.id });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("cancelled");
    });

    it("should return 403 for non-organizer cancel", async () => {
      const alice = await createUser("alice@test.com", "Alice");
      const bob = await createUser("bob@test.com", "Bob");
      const tanda = await createTanda("Tanda 1", alice.id, 1000);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .send({ organizerId: bob.id });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/tandas/:id/participants", () => {
    it("should list participants", async () => {
      const alice = await createUser("alice@test.com", "Alice");
      const bob = await createUser("bob@test.com", "Bob");
      const tanda = await createTanda("Tanda 1", alice.id, 500);
      await joinTanda(tanda.id, bob.id);

      const res = await request(app).get(
        `/api/tandas/${tanda.id}/participants`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it("should return 404 for non-existent tanda", async () => {
      const res = await request(app).get("/api/tandas/999/participants");

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/tandas/:id/contributions", () => {
    it("should record a contribution", async () => {
      const { tanda } = await setupActiveTanda();
      const participants = (
        await request(app).get(`/api/tandas/${tanda.id}/participants`)
      ).body;

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({
          participantId: participants[0].id,
          amount: 1000,
          status: "paid",
        });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(1000);
      expect(res.body.status).toBe("paid");
    });

    it("should apply late penalty", async () => {
      const { tanda } = await setupActiveTanda();
      const participants = (
        await request(app).get(`/api/tandas/${tanda.id}/participants`)
      ).body;

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({
          participantId: participants[0].id,
          amount: 1000,
          status: "late",
        });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(1050);
      expect(res.body.status).toBe("late");
    });

    it("should return 409 for duplicate contribution in same round", async () => {
      const { tanda } = await setupActiveTanda();
      const participants = (
        await request(app).get(`/api/tandas/${tanda.id}/participants`)
      ).body;

      await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({
          participantId: participants[0].id,
          amount: 1000,
          status: "paid",
        });

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({
          participantId: participants[0].id,
          amount: 1000,
          status: "paid",
        });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/tandas/:id/rounds/:round", () => {
    it("should get round summary", async () => {
      const { tanda } = await setupActiveTanda();

      const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);

      expect(res.status).toBe(200);
      expect(res.body.round).toBe(1);
      expect(res.body).toHaveProperty("contributions");
      expect(res.body).toHaveProperty("recipient");
    });

    it("should return 400 for invalid round", async () => {
      const { tanda } = await setupActiveTanda();

      const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/99`);

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/tandas/:id/advance", () => {
    it("should advance to the next round", async () => {
      const { alice, tanda } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .send({ organizerId: alice.id });

      expect(res.status).toBe(200);
      expect(res.body.currentRound).toBe(2);
    });

    it("should auto-complete after last round", async () => {
      const { alice, tanda } = await setupActiveTanda();

      // Advance through all rounds
      for (let i = 0; i < tanda.totalRounds; i++) {
        await request(app)
          .post(`/api/tandas/${tanda.id}/advance`)
          .send({ organizerId: alice.id });
      }

      const finalRes = await request(app).get(`/api/tandas/${tanda.id}`);
      expect(finalRes.body.status).toBe("completed");
    });

    it("should return 403 for non-organizer", async () => {
      const { bob, tanda } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .send({ organizerId: bob.id });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/tandas/:id/participants/:pid/history", () => {
    it("should get participant contribution history", async () => {
      const { tanda } = await setupActiveTanda();
      const participants = (
        await request(app).get(`/api/tandas/${tanda.id}/participants`)
      ).body;

      await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({
          participantId: participants[0].id,
          amount: 1000,
          status: "paid",
        });

      const res = await request(app).get(
        `/api/tandas/${tanda.id}/participants/${participants[0].id}/history`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("should return 404 for non-existent participant", async () => {
      const { tanda } = await setupActiveTanda();

      const res = await request(app).get(
        `/api/tandas/${tanda.id}/participants/999/history`,
      );

      expect(res.status).toBe(404);
    });
  });
});
