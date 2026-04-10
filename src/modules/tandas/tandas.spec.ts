import request from "supertest";
import { afterEach, vi } from "vitest";

import { app } from "../../app";
import { db } from "../../db/database";

describe("tandas endpoints", () => {
  beforeEach(() => {
    db.prepare("DELETE FROM contributions").run();
    db.prepare("DELETE FROM participants").run();
    db.prepare("DELETE FROM tandas").run();
    db.prepare("DELETE FROM users").run();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/tandas", () => {
    it("creates a tanda in forming state and auto-joins the organizer", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });

      const response = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(Number),
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
        status: "forming",
        currentRound: 0,
        totalRounds: 0,
      });

      const participant = db
        .prepare(
          "SELECT user_id, role, rotation_position FROM participants WHERE tanda_id = ?",
        )
        .get(response.body.id) as
        | { user_id: number; role: string; rotation_position: number }
        | undefined;

      expect(participant).toEqual({
        user_id: organizerResponse.body.id,
        role: "organizer",
        rotation_position: 1,
      });
    });

    it("returns 404 when the organizer does not exist", async () => {
      const response = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: 999,
        contributionAmount: 1000,
      });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/tandas", () => {
    it("lists tandas for a user", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });

      await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const response = await request(app).get(`/api/tandas?userId=${organizerResponse.body.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: expect.any(Number),
          name: "Tanda Enero",
          organizerId: organizerResponse.body.id,
          contributionAmount: 1000,
          status: "forming",
          currentRound: 0,
          totalRounds: 0,
        },
      ]);
    });

    it("returns 400 when userId is missing", async () => {
      const response = await request(app).get("/api/tandas");

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/tandas/:id", () => {
    it("returns tanda details", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });

      const createResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const response = await request(app).get(`/api/tandas/${createResponse.body.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: createResponse.body.id,
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
        status: "forming",
        currentRound: 0,
        totalRounds: 0,
      });
    });

    it("returns 404 when the tanda does not exist", async () => {
      const response = await request(app).get("/api/tandas/999");

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /api/tandas/:id/join", () => {
    it("adds a participant with the next forming rotation position", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberResponse = await request(app).post("/api/users").send({
        email: "member@example.com",
        name: "Member",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberResponse.body.id });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(Number),
        userId: memberResponse.body.id,
        tandaId: tandaResponse.body.id,
        role: "member",
        rotationPosition: 2,
        isDefaulter: false,
      });
    });

    it("returns 409 when the user already joined the tanda", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberResponse = await request(app).post("/api/users").send({
        email: "member@example.com",
        name: "Member",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberResponse.body.id });

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberResponse.body.id });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });

    it("returns 409 when the tanda is no longer forming", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberResponse = await request(app).post("/api/users").send({
        email: "member@example.com",
        name: "Member",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      db.prepare("UPDATE tandas SET status = 'active' WHERE id = ?").run(tandaResponse.body.id);

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberResponse.body.id });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });

    it("returns 409 when the tanda already reached the configured maximum", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const additionalUserIds: number[] = [];
      for (let index = 0; index < 20; index += 1) {
        const createUserResponse = await request(app).post("/api/users").send({
          email: `member${index}@example.com`,
          name: `Member ${index}`,
        });
        additionalUserIds.push(createUserResponse.body.id);
      }

      for (const userId of additionalUserIds.slice(0, 19)) {
        await request(app).post(`/api/tandas/${tandaResponse.body.id}/join`).send({ userId });
      }

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: additionalUserIds[19] });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });
  });

  describe("GET /api/tandas/:id/participants", () => {
    it("lists participants ordered by forming rotation position", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const firstMemberResponse = await request(app).post("/api/users").send({
        email: "member1@example.com",
        name: "Member 1",
      });
      const secondMemberResponse = await request(app).post("/api/users").send({
        email: "member2@example.com",
        name: "Member 2",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: firstMemberResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: secondMemberResponse.body.id });

      const response = await request(app).get(`/api/tandas/${tandaResponse.body.id}/participants`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: expect.any(Number),
          userId: organizerResponse.body.id,
          tandaId: tandaResponse.body.id,
          role: "organizer",
          rotationPosition: 1,
          isDefaulter: false,
        },
        {
          id: expect.any(Number),
          userId: firstMemberResponse.body.id,
          tandaId: tandaResponse.body.id,
          role: "member",
          rotationPosition: 2,
          isDefaulter: false,
        },
        {
          id: expect.any(Number),
          userId: secondMemberResponse.body.id,
          tandaId: tandaResponse.body.id,
          role: "member",
          rotationPosition: 3,
          isDefaulter: false,
        },
      ]);
    });

    it("returns 404 when the tanda does not exist", async () => {
      const response = await request(app).get("/api/tandas/999/participants");

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /api/tandas/:id/start", () => {
    it("starts a tanda, randomizes rotation and locks it into active round 1", async () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0);

      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberOneResponse = await request(app).post("/api/users").send({
        email: "member1@example.com",
        name: "Member 1",
      });
      const memberTwoResponse = await request(app).post("/api/users").send({
        email: "member2@example.com",
        name: "Member 2",
      });

      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberOneResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberTwoResponse.body.id });

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/start`)
        .send({ organizerId: organizerResponse.body.id });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: tandaResponse.body.id,
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
        status: "active",
        currentRound: 1,
        totalRounds: 3,
      });

      const participants = db
        .prepare(
          `
            SELECT user_id, rotation_position
            FROM participants
            WHERE tanda_id = ?
            ORDER BY rotation_position ASC
          `,
        )
        .all(tandaResponse.body.id) as Array<{ user_id: number; rotation_position: number }>;

      expect(participants).toEqual([
        { user_id: memberOneResponse.body.id, rotation_position: 1 },
        { user_id: memberTwoResponse.body.id, rotation_position: 2 },
        { user_id: organizerResponse.body.id, rotation_position: 3 },
      ]);
    });

    it("returns 409 when trying to start with fewer than 3 participants", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/start`)
        .send({ organizerId: organizerResponse.body.id });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });

    it("returns 403 when a non-organizer tries to start the tanda", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberOneResponse = await request(app).post("/api/users").send({
        email: "member1@example.com",
        name: "Member 1",
      });
      const memberTwoResponse = await request(app).post("/api/users").send({
        email: "member2@example.com",
        name: "Member 2",
      });
      const outsiderResponse = await request(app).post("/api/users").send({
        email: "outsider@example.com",
        name: "Outsider",
      });

      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberOneResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberTwoResponse.body.id });

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/start`)
        .send({ organizerId: outsiderResponse.body.id });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("POST /api/tandas/:id/cancel", () => {
    it("cancels a tanda from forming status", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/cancel`)
        .send({ organizerId: organizerResponse.body.id });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("cancelled");
      expect(response.body.currentRound).toBe(0);
    });

    it("returns 403 when a non-organizer tries to cancel the tanda", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const outsiderResponse = await request(app).post("/api/users").send({
        email: "outsider@example.com",
        name: "Outsider",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/cancel`)
        .send({ organizerId: outsiderResponse.body.id });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("POST /api/tandas/:id/advance", () => {
    it("advances rounds and auto-completes after the last round", async () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0);

      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberOneResponse = await request(app).post("/api/users").send({
        email: "member1@example.com",
        name: "Member 1",
      });
      const memberTwoResponse = await request(app).post("/api/users").send({
        email: "member2@example.com",
        name: "Member 2",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberOneResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberTwoResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/start`)
        .send({ organizerId: organizerResponse.body.id });

      const advanceToRoundTwo = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/advance`)
        .send({ organizerId: organizerResponse.body.id });
      const advanceToRoundThree = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/advance`)
        .send({ organizerId: organizerResponse.body.id });
      const completeResponse = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/advance`)
        .send({ organizerId: organizerResponse.body.id });

      expect(advanceToRoundTwo.status).toBe(200);
      expect(advanceToRoundTwo.body.currentRound).toBe(2);
      expect(advanceToRoundTwo.body.status).toBe("active");

      expect(advanceToRoundThree.status).toBe(200);
      expect(advanceToRoundThree.body.currentRound).toBe(3);
      expect(advanceToRoundThree.body.status).toBe("active");

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.currentRound).toBe(3);
      expect(completeResponse.body.totalRounds).toBe(3);
      expect(completeResponse.body.status).toBe("completed");
    });

    it("returns 403 when a non-organizer tries to advance the tanda", async () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0);

      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberOneResponse = await request(app).post("/api/users").send({
        email: "member1@example.com",
        name: "Member 1",
      });
      const memberTwoResponse = await request(app).post("/api/users").send({
        email: "member2@example.com",
        name: "Member 2",
      });
      const outsiderResponse = await request(app).post("/api/users").send({
        email: "outsider@example.com",
        name: "Outsider",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberOneResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberTwoResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/start`)
        .send({ organizerId: organizerResponse.body.id });

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/advance`)
        .send({ organizerId: outsiderResponse.body.id });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("POST /api/tandas/:id/contributions", () => {
    it("records an on-time contribution for the current round", async () => {
      vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0);

      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberOneResponse = await request(app).post("/api/users").send({
        email: "member1@example.com",
        name: "Member 1",
      });
      const memberTwoResponse = await request(app).post("/api/users").send({
        email: "member2@example.com",
        name: "Member 2",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const joinOne = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberOneResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberTwoResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/start`)
        .send({ organizerId: organizerResponse.body.id });

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/contributions`)
        .send({ participantId: joinOne.body.id, paidAt: "2026-04-10T12:00:00.000Z" });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(Number),
        tandaId: tandaResponse.body.id,
        participantId: joinOne.body.id,
        round: 1,
        amount: 1000,
        penaltyAmount: 0,
        status: "paid",
        paidAt: "2026-04-10T12:00:00.000Z",
      });
    });

    it("records a late contribution with the configured penalty", async () => {
      vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0);

      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberOneResponse = await request(app).post("/api/users").send({
        email: "member1@example.com",
        name: "Member 1",
      });
      const memberTwoResponse = await request(app).post("/api/users").send({
        email: "member2@example.com",
        name: "Member 2",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const joinOne = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberOneResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberTwoResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/start`)
        .send({ organizerId: organizerResponse.body.id });

      db.prepare("UPDATE tandas SET round_started_at = ? WHERE id = ?").run(
        "2026-04-01T00:00:00.000Z",
        tandaResponse.body.id,
      );

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/contributions`)
        .send({ participantId: joinOne.body.id, paidAt: "2026-04-10T12:00:00.000Z" });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("late");
      expect(response.body.penaltyAmount).toBe(50);
    });

    it("returns 409 when recording a duplicate contribution in the same round", async () => {
      vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0);

      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberOneResponse = await request(app).post("/api/users").send({
        email: "member1@example.com",
        name: "Member 1",
      });
      const memberTwoResponse = await request(app).post("/api/users").send({
        email: "member2@example.com",
        name: "Member 2",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const joinOne = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberOneResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberTwoResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/start`)
        .send({ organizerId: organizerResponse.body.id });

      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/contributions`)
        .send({ participantId: joinOne.body.id, paidAt: "2026-04-10T12:00:00.000Z" });

      const response = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/contributions`)
        .send({ participantId: joinOne.body.id, paidAt: "2026-04-10T12:30:00.000Z" });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });
  });

  describe("GET /api/tandas/:id/rounds/:round", () => {
    it("returns a round summary with receiver, contributions and totals", async () => {
      vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0);

      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberOneResponse = await request(app).post("/api/users").send({
        email: "member1@example.com",
        name: "Member 1",
      });
      const memberTwoResponse = await request(app).post("/api/users").send({
        email: "member2@example.com",
        name: "Member 2",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const joinOne = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberOneResponse.body.id });
      const joinTwo = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberTwoResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/start`)
        .send({ organizerId: organizerResponse.body.id });

      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/contributions`)
        .send({ participantId: joinOne.body.id, paidAt: "2026-04-10T12:00:00.000Z" });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/contributions`)
        .send({ participantId: joinTwo.body.id, paidAt: "2026-04-10T13:00:00.000Z" });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/advance`)
        .send({ organizerId: organizerResponse.body.id });

      const response = await request(app).get(`/api/tandas/${tandaResponse.body.id}/rounds/1`);

      expect(response.status).toBe(200);
      expect(response.body.round).toBe(1);
      expect(response.body.receiver.userId).toBe(memberOneResponse.body.id);
      expect(response.body.contributions).toEqual([
        {
          id: expect.any(Number),
          tandaId: tandaResponse.body.id,
          participantId: joinOne.body.id,
          round: 1,
          amount: 1000,
          penaltyAmount: 0,
          status: "paid",
          paidAt: "2026-04-10T12:00:00.000Z",
        },
        {
          id: expect.any(Number),
          tandaId: tandaResponse.body.id,
          participantId: joinTwo.body.id,
          round: 1,
          amount: 1000,
          penaltyAmount: 0,
          status: "paid",
          paidAt: "2026-04-10T13:00:00.000Z",
        },
        {
          id: expect.any(Number),
          tandaId: tandaResponse.body.id,
          participantId: expect.any(Number),
          round: 1,
          amount: 1000,
          penaltyAmount: 0,
          status: "missed",
          paidAt: null,
        },
      ]);
      expect(response.body.totals).toEqual({
        expected: 3000,
        collected: 3000,
        penalties: 0,
        missingCount: 1,
      });
    });

    it("returns 404 when the requested round is outside the tanda history", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const response = await request(app).get(`/api/tandas/${tandaResponse.body.id}/rounds/1`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/tandas/:id/participants/:pid/history", () => {
    it("returns ordered contribution history and keeps defaulter state after two consecutive misses", async () => {
      vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0);

      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberOneResponse = await request(app).post("/api/users").send({
        email: "member1@example.com",
        name: "Member 1",
      });
      const memberTwoResponse = await request(app).post("/api/users").send({
        email: "member2@example.com",
        name: "Member 2",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const joinOne = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberOneResponse.body.id });
      const joinTwo = await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/join`)
        .send({ userId: memberTwoResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/start`)
        .send({ organizerId: organizerResponse.body.id });

      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/contributions`)
        .send({ participantId: joinTwo.body.id, paidAt: "2026-04-10T13:00:00.000Z" });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/contributions`)
        .send({ participantId: joinOne.body.id, paidAt: "2026-04-10T12:00:00.000Z" });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/advance`)
        .send({ organizerId: organizerResponse.body.id });
      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/advance`)
        .send({ organizerId: organizerResponse.body.id });

      const historyResponse = await request(app).get(
        `/api/tandas/${tandaResponse.body.id}/participants/${joinOne.body.id}/history`,
      );

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body).toEqual([
        {
          id: expect.any(Number),
          tandaId: tandaResponse.body.id,
          participantId: joinOne.body.id,
          round: 1,
          amount: 1000,
          penaltyAmount: 0,
          status: "paid",
          paidAt: "2026-04-10T12:00:00.000Z",
        },
        {
          id: expect.any(Number),
          tandaId: tandaResponse.body.id,
          participantId: joinOne.body.id,
          round: 2,
          amount: 1000,
          penaltyAmount: 0,
          status: "missed",
          paidAt: null,
        },
      ]);

      const participantRows = await request(app).get(`/api/tandas/${tandaResponse.body.id}/participants`);
      const participant = participantRows.body.find(
        (item: { id: number }) => item.id === joinOne.body.id,
      ) as { isDefaulter: boolean };

      expect(participant.isDefaulter).toBe(false);

      await request(app)
        .post(`/api/tandas/${tandaResponse.body.id}/advance`)
        .send({ organizerId: organizerResponse.body.id });

      const updatedParticipants = await request(app).get(`/api/tandas/${tandaResponse.body.id}/participants`);
      const updatedParticipant = updatedParticipants.body.find(
        (item: { id: number }) => item.id === joinOne.body.id,
      ) as { isDefaulter: boolean };

      expect(updatedParticipant.isDefaulter).toBe(true);
    });

    it("returns 404 when the participant does not belong to the tanda", async () => {
      const organizerResponse = await request(app).post("/api/users").send({
        email: "organizer@example.com",
        name: "Organizer",
      });
      const outsiderResponse = await request(app).post("/api/users").send({
        email: "outsider@example.com",
        name: "Outsider",
      });
      const tandaResponse = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        organizerId: organizerResponse.body.id,
        contributionAmount: 1000,
      });

      const response = await request(app).get(
        `/api/tandas/${tandaResponse.body.id}/participants/${outsiderResponse.body.id}/history`,
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });
});