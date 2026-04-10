import request from "supertest";

import { createApp } from "./app";
import { resetDatabaseForTests } from "./test/reset-db";

describe("Users API", () => {
  beforeEach(() => {
    resetDatabaseForTests();
  });

  it("creates a user with POST /api/users", async () => {
    const app = createApp();

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

  it("returns 400 when creating user with invalid email", async () => {
    const app = createApp();

    const response = await request(app).post("/api/users").send({
      email: "not-an-email",
      name: "Alice",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lists users with GET /api/users", async () => {
    const app = createApp();

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
    expect(response.body).toHaveLength(2);
  });

  it("gets a user by id with GET /api/users/:id", async () => {
    const app = createApp();

    const created = await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    const response = await request(app).get(`/api/users/${created.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe("alice@example.com");
  });

  it("returns 404 for missing user", async () => {
    const app = createApp();

    const response = await request(app).get("/api/users/999");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});

async function issueToken(
  app: ReturnType<typeof createApp>,
  userId: number
): Promise<string> {
  const response = await request(app).post("/api/auth/token").send({ userId });
  return response.body.token as string;
}

function authHeader(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}

describe("Tandas API", () => {
  beforeEach(() => {
    resetDatabaseForTests();
  });

  it("returns 401 when protected endpoint has no token", async () => {
    const app = createApp();

    const response = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: 1,
      contributionAmount: 1000,
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("creates tanda and auto-joins organizer with POST /api/tandas", async () => {
    const app = createApp();

    const user = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, user.body.id);

    const response = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Enero",
        organizerId: user.body.id,
        contributionAmount: 1000,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: "Tanda Enero",
        organizerId: user.body.id,
        status: "forming",
        currentRound: 1,
        totalRounds: 1,
      })
    );
  });

  it("returns 403 when organizerId differs from authenticated user", async () => {
    const app = createApp();

    const user = await request(app).post("/api/users").send({
      email: "auth-user@example.com",
      name: "Auth User",
    });
    const token = await issueToken(app, user.body.id);

    const response = await request(app)
      .post("/api/tandas")
      .set(authHeader(token))
      .send({
        name: "Tanda Enero",
        organizerId: 999,
        contributionAmount: 1000,
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("lists tandas by user with GET /api/tandas?userId=", async () => {
    const app = createApp();

    const user = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, user.body.id);

    await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Enero",
        organizerId: user.body.id,
        contributionAmount: 1000,
      });

    const response = await request(app).get(`/api/tandas?userId=${user.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe("Tanda Enero");
  });

  it("gets tanda details with GET /api/tandas/:id", async () => {
    const app = createApp();

    const user = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, user.body.id);

    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Enero",
        organizerId: user.body.id,
        contributionAmount: 1000,
      });

    const response = await request(app).get(`/api/tandas/${tanda.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(tanda.body.id);
  });

  it("returns 400 when userId query is missing", async () => {
    const app = createApp();

    const response = await request(app).get("/api/tandas");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("joins a tanda with POST /api/tandas/:id/join", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);
    const member = await request(app).post("/api/users").send({
      email: "member@example.com",
      name: "Member",
    });
    const memberToken = await issueToken(app, member.body.id);
    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Join",
        organizerId: organizer.body.id,
        contributionAmount: 500,
      });

    const response = await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberToken))
      .send({ userId: member.body.id });

    expect(response.status).toBe(201);
    expect(response.body.role).toBe("member");
  });

  it("returns 409 when joining same tanda twice", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);
    const member = await request(app).post("/api/users").send({
      email: "member@example.com",
      name: "Member",
    });
    const memberToken = await issueToken(app, member.body.id);
    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Join",
        organizerId: organizer.body.id,
        contributionAmount: 500,
      });

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberToken))
      .send({ userId: member.body.id });

    const response = await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberToken))
      .send({ userId: member.body.id });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("lists participants with GET /api/tandas/:id/participants", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);
    const member = await request(app).post("/api/users").send({
      email: "member@example.com",
      name: "Member",
    });
    const memberToken = await issueToken(app, member.body.id);
    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Members",
        organizerId: organizer.body.id,
        contributionAmount: 900,
      });

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberToken))
      .send({ userId: member.body.id });

    const response = await request(app).get(
      `/api/tandas/${tanda.body.id}/participants`
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it("returns 404 when listing participants for missing tanda", async () => {
    const app = createApp();

    const response = await request(app).get("/api/tandas/999/participants");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("starts tanda with organizer and randomizes rotation", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);
    const memberA = await request(app).post("/api/users").send({
      email: "membera@example.com",
      name: "Member A",
    });
    const memberAToken = await issueToken(app, memberA.body.id);
    const memberB = await request(app).post("/api/users").send({
      email: "memberb@example.com",
      name: "Member B",
    });
    const memberBToken = await issueToken(app, memberB.body.id);

    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Start",
        organizerId: organizer.body.id,
        contributionAmount: 1000,
      });

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberAToken))
      .send({ userId: memberA.body.id });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberBToken))
      .send({ userId: memberB.body.id });

    const response = await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .set(authHeader(organizerToken))
      .send({ organizerId: organizer.body.id });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("active");
    expect(response.body.totalRounds).toBe(3);

    const participants = await request(app).get(
      `/api/tandas/${tanda.body.id}/participants`
    );

    for (const participant of participants.body) {
      expect(participant.rotationPosition).toBeGreaterThanOrEqual(1);
      expect(participant.rotationPosition).toBeLessThanOrEqual(3);
    }
  });

  it("returns 400 when starting tanda with less than 3 participants", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);

    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Start",
        organizerId: organizer.body.id,
        contributionAmount: 1000,
      });

    const response = await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .set(authHeader(organizerToken))
      .send({ organizerId: organizer.body.id });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("cancels tanda with organizer", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);

    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Cancel",
        organizerId: organizer.body.id,
        contributionAmount: 1000,
      });

    const response = await request(app)
      .post(`/api/tandas/${tanda.body.id}/cancel`)
      .set(authHeader(organizerToken))
      .send({ organizerId: organizer.body.id });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("cancelled");
  });

  it("returns 403 when non-organizer tries to cancel", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);
    const member = await request(app).post("/api/users").send({
      email: "member@example.com",
      name: "Member",
    });
    const memberToken = await issueToken(app, member.body.id);

    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Cancel",
        organizerId: organizer.body.id,
        contributionAmount: 1000,
      });

    const response = await request(app)
      .post(`/api/tandas/${tanda.body.id}/cancel`)
      .set(authHeader(memberToken))
      .send({ organizerId: member.body.id });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("records contribution for current round", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);
    const memberA = await request(app).post("/api/users").send({
      email: "membera@example.com",
      name: "Member A",
    });
    const memberAToken = await issueToken(app, memberA.body.id);
    const memberB = await request(app).post("/api/users").send({
      email: "memberb@example.com",
      name: "Member B",
    });
    const memberBToken = await issueToken(app, memberB.body.id);

    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Contributions",
        organizerId: organizer.body.id,
        contributionAmount: 1000,
      });

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberAToken))
      .send({ userId: memberA.body.id });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberBToken))
      .send({ userId: memberB.body.id });

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .set(authHeader(organizerToken))
      .send({ organizerId: organizer.body.id });

    const participants = await request(app).get(
      `/api/tandas/${tanda.body.id}/participants`
    );

    const organizerParticipant = participants.body.find(
      (participant: { userId: number }) => participant.userId === organizer.body.id
    );

    const response = await request(app)
      .post(`/api/tandas/${tanda.body.id}/contributions`)
      .set(authHeader(organizerToken))
      .send({ participantId: organizerParticipant.id, isLate: true });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("late");
    expect(response.body.penaltyAmount).toBe(50);
  });

  it("returns 409 for duplicate contribution in same round", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);
    const memberA = await request(app).post("/api/users").send({
      email: "membera@example.com",
      name: "Member A",
    });
    const memberAToken = await issueToken(app, memberA.body.id);
    const memberB = await request(app).post("/api/users").send({
      email: "memberb@example.com",
      name: "Member B",
    });
    const memberBToken = await issueToken(app, memberB.body.id);

    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Contributions",
        organizerId: organizer.body.id,
        contributionAmount: 1000,
      });

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberAToken))
      .send({ userId: memberA.body.id });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberBToken))
      .send({ userId: memberB.body.id });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .set(authHeader(organizerToken))
      .send({ organizerId: organizer.body.id });

    const participants = await request(app).get(
      `/api/tandas/${tanda.body.id}/participants`
    );
    const organizerParticipant = participants.body.find(
      (participant: { userId: number }) => participant.userId === organizer.body.id
    );
    const participantId = organizerParticipant.id;

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/contributions`)
      .set(authHeader(organizerToken))
      .send({ participantId });

    const response = await request(app)
      .post(`/api/tandas/${tanda.body.id}/contributions`)
      .set(authHeader(organizerToken))
      .send({ participantId });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("returns round summary", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);
    const memberA = await request(app).post("/api/users").send({
      email: "membera@example.com",
      name: "Member A",
    });
    const memberAToken = await issueToken(app, memberA.body.id);
    const memberB = await request(app).post("/api/users").send({
      email: "memberb@example.com",
      name: "Member B",
    });
    const memberBToken = await issueToken(app, memberB.body.id);

    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Summary",
        organizerId: organizer.body.id,
        contributionAmount: 700,
      });

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberAToken))
      .send({ userId: memberA.body.id });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberBToken))
      .send({ userId: memberB.body.id });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .set(authHeader(organizerToken))
      .send({ organizerId: organizer.body.id });

    const participants = await request(app).get(
      `/api/tandas/${tanda.body.id}/participants`
    );

    const organizerParticipant = participants.body.find(
      (participant: { userId: number }) => participant.userId === organizer.body.id
    );

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/contributions`)
      .set(authHeader(organizerToken))
      .send({ participantId: organizerParticipant.id });

    const response = await request(app).get(`/api/tandas/${tanda.body.id}/rounds/1`);

    expect(response.status).toBe(200);
    expect(response.body.round).toBe(1);
    expect(response.body.expectedPotAmount).toBe(2100);
    expect(response.body.contributions).toHaveLength(1);
  });

  it("advances round and auto-completes after last round", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);
    const memberA = await request(app).post("/api/users").send({
      email: "membera@example.com",
      name: "Member A",
    });
    const memberAToken = await issueToken(app, memberA.body.id);
    const memberB = await request(app).post("/api/users").send({
      email: "memberb@example.com",
      name: "Member B",
    });
    const memberBToken = await issueToken(app, memberB.body.id);

    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Advance",
        organizerId: organizer.body.id,
        contributionAmount: 1000,
      });

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberAToken))
      .send({ userId: memberA.body.id });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberBToken))
      .send({ userId: memberB.body.id });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .set(authHeader(organizerToken))
      .send({ organizerId: organizer.body.id });

    const advance1 = await request(app)
      .post(`/api/tandas/${tanda.body.id}/advance`)
      .set(authHeader(organizerToken))
      .send({ organizerId: organizer.body.id });
    expect(advance1.status).toBe(200);
    expect(advance1.body.currentRound).toBe(2);

    const advance2 = await request(app)
      .post(`/api/tandas/${tanda.body.id}/advance`)
      .set(authHeader(organizerToken))
      .send({ organizerId: organizer.body.id });
    expect(advance2.status).toBe(200);
    expect(advance2.body.currentRound).toBe(3);

    const advance3 = await request(app)
      .post(`/api/tandas/${tanda.body.id}/advance`)
      .set(authHeader(organizerToken))
      .send({ organizerId: organizer.body.id });
    expect(advance3.status).toBe(200);
    expect(advance3.body.status).toBe("completed");
  });

  it("returns 403 when non-organizer tries to advance", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);
    const memberA = await request(app).post("/api/users").send({
      email: "membera@example.com",
      name: "Member A",
    });
    const memberAToken = await issueToken(app, memberA.body.id);
    const memberB = await request(app).post("/api/users").send({
      email: "memberb@example.com",
      name: "Member B",
    });
    const memberBToken = await issueToken(app, memberB.body.id);

    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda Advance",
        organizerId: organizer.body.id,
        contributionAmount: 1000,
      });

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberAToken))
      .send({ userId: memberA.body.id });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberBToken))
      .send({ userId: memberB.body.id });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .set(authHeader(organizerToken))
      .send({ organizerId: organizer.body.id });

    const response = await request(app)
      .post(`/api/tandas/${tanda.body.id}/advance`)
      .set(authHeader(memberAToken))
      .send({ organizerId: memberA.body.id });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("returns participant contribution history", async () => {
    const app = createApp();

    const organizer = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });
    const organizerToken = await issueToken(app, organizer.body.id);
    const memberA = await request(app).post("/api/users").send({
      email: "membera@example.com",
      name: "Member A",
    });
    const memberAToken = await issueToken(app, memberA.body.id);
    const memberB = await request(app).post("/api/users").send({
      email: "memberb@example.com",
      name: "Member B",
    });
    const memberBToken = await issueToken(app, memberB.body.id);

    const tanda = await request(app)
      .post("/api/tandas")
      .set(authHeader(organizerToken))
      .send({
        name: "Tanda History",
        organizerId: organizer.body.id,
        contributionAmount: 1000,
      });

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberAToken))
      .send({ userId: memberA.body.id });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .set(authHeader(memberBToken))
      .send({ userId: memberB.body.id });
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .set(authHeader(organizerToken))
      .send({ organizerId: organizer.body.id });

    const participants = await request(app).get(
      `/api/tandas/${tanda.body.id}/participants`
    );
    const organizerParticipant = participants.body.find(
      (participant: { userId: number }) => participant.userId === organizer.body.id
    );
    const targetParticipantId = organizerParticipant.id;

    await request(app)
      .post(`/api/tandas/${tanda.body.id}/contributions`)
      .set(authHeader(organizerToken))
      .send({ participantId: targetParticipantId });

    const historyResponse = await request(app).get(
      `/api/tandas/${tanda.body.id}/participants/${targetParticipantId}/history`
    );

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body).toHaveLength(1);
    expect(historyResponse.body[0].status).toBe("paid");
  });
});
