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

async function setupActiveTanda(): Promise<{
  organizerId: number;
  tandaId: number;
  participantIds: number[];
}> {
  const org = await createUser("org@test.com", "Org");
  const u2 = await createUser("u2@test.com", "U2");
  const u3 = await createUser("u3@test.com", "U3");

  const tandaRes = await request(app)
    .post("/api/tandas")
    .send({ name: "Tanda Test", organizerId: org, contributionAmount: 1000 });
  const tandaId = tandaRes.body.id;

  const p2 = await request(app)
    .post(`/api/tandas/${tandaId}/join`)
    .send({ userId: u2 });
  const p3 = await request(app)
    .post(`/api/tandas/${tandaId}/join`)
    .send({ userId: u3 });

  // Get organizer participant id
  const participants = await request(app).get(`/api/tandas/${tandaId}/participants`);
  const orgParticipant = participants.body.find((p: { role: string }) => p.role === "organizer");

  await request(app)
    .post(`/api/tandas/${tandaId}/start`)
    .send({ userId: org });

  return {
    organizerId: org,
    tandaId,
    participantIds: [orgParticipant.id, p2.body.id, p3.body.id],
  };
}

describe("Contributions API", () => {
  beforeEach(() => {
    resetDb();
  });

  describe("POST /api/tandas/:id/contributions", () => {
    it("should record a contribution and return 201", async () => {
      const { tandaId, participantIds } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: participantIds[0], amount: 1000 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(Number),
        tanda_id: tandaId,
        participant_id: participantIds[0],
        round: 1,
        amount: 1000,
        status: "paid",
      });
    });

    it("should apply 5% penalty for late contributions", async () => {
      const { tandaId, participantIds } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: participantIds[0], amount: 1000, isLate: true });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(1050);
      expect(res.body.status).toBe("late");
    });

    it("should return 409 for duplicate contribution in same round", async () => {
      const { tandaId, participantIds } = await setupActiveTanda();

      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: participantIds[0], amount: 1000 });

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: participantIds[0], amount: 1000 });

      expect(res.status).toBe(409);
    });

    it("should return 400 for non-active tanda", async () => {
      const org = await createUser("org@test.com", "Org");
      const tandaRes = await request(app)
        .post("/api/tandas")
        .send({ name: "Tanda", organizerId: org, contributionAmount: 500 });

      const participants = await request(app).get(`/api/tandas/${tandaRes.body.id}/participants`);

      const res = await request(app)
        .post(`/api/tandas/${tandaRes.body.id}/contributions`)
        .send({ participantId: participants.body[0].id, amount: 500 });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid body", async () => {
      const { tandaId } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/tandas/:id/rounds/:round", () => {
    it("should return round summary with contributions", async () => {
      const { tandaId, participantIds } = await setupActiveTanda();

      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: participantIds[0], amount: 1000 });

      const res = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);

      expect(res.status).toBe(200);
      expect(res.body.round).toBe(1);
      expect(res.body.tandaId).toBe(tandaId);
      expect(res.body.contributions).toHaveLength(1);
      expect(res.body.payoutRecipient).toBeTruthy();
    });

    it("should return 400 for invalid round number", async () => {
      const { tandaId } = await setupActiveTanda();

      const res = await request(app).get(`/api/tandas/${tandaId}/rounds/99`);

      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent tanda", async () => {
      const res = await request(app).get("/api/tandas/999/rounds/1");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/tandas/:id/participants/:pid/history", () => {
    it("should return contribution history", async () => {
      const { organizerId, tandaId, participantIds } = await setupActiveTanda();

      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId: participantIds[0], amount: 1000 });

      const res = await request(app).get(
        `/api/tandas/${tandaId}/participants/${participantIds[0]}/history`
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].round).toBe(1);
    });

    it("should return empty array if no contributions", async () => {
      const { tandaId, participantIds } = await setupActiveTanda();

      const res = await request(app).get(
        `/api/tandas/${tandaId}/participants/${participantIds[1]}/history`
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return 404 for non-existent participant", async () => {
      const { tandaId } = await setupActiveTanda();

      const res = await request(app).get(
        `/api/tandas/${tandaId}/participants/999/history`
      );

      expect(res.status).toBe(404);
    });

    it("should return 400 for participant not in tanda", async () => {
      const { tandaId } = await setupActiveTanda();
      const otherOrg = await createUser("other@test.com", "Other");
      const otherTandaRes = await request(app)
        .post("/api/tandas")
        .send({ name: "Other", organizerId: otherOrg, contributionAmount: 100 });

      const otherParticipants = await request(app).get(
        `/api/tandas/${otherTandaRes.body.id}/participants`
      );

      const res = await request(app).get(
        `/api/tandas/${tandaId}/participants/${otherParticipants.body[0].id}/history`
      );

      expect(res.status).toBe(400);
    });
  });
});
