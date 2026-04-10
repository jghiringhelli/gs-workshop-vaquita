import request from "supertest";

import { createApp } from "../../app";

describe("POST /api/tandas", () => {
  it("creates a tanda and auto-joins the organizer", async () => {
    const app = createApp({ databaseFilePath: ":memory:" });

    await createUser(app, "alice@example.com", "Alice");

    const createResponse = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: 1,
      contributionAmount: 1000,
    });

    const participantsResponse = await request(app).get("/api/tandas/1/participants");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      id: 1,
      name: "Tanda Enero",
      organizerId: 1,
      contributionAmount: 1000,
      status: "forming",
      currentRound: 1,
      totalRounds: 1,
    });

    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body).toEqual([
      {
        id: 1,
        userId: 1,
        tandaId: 1,
        role: "organizer",
        rotationPosition: null,
        isDefaulter: false,
      },
    ]);
  });

  it("returns 404 when the organizer does not exist", async () => {
    const app = createApp({ databaseFilePath: ":memory:" });

    const response = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: 999,
      contributionAmount: 1000,
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("not_found");
  });
});

describe("GET /api/tandas", () => {
  it("lists tandas for a joined user", async () => {
    const app = createApp({ databaseFilePath: ":memory:" });

    await createUser(app, "alice@example.com", "Alice");
    await createUser(app, "bob@example.com", "Bob");
    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: 1,
      contributionAmount: 1000,
    });
    await request(app).post("/api/tandas/1/join").send({ userId: 2 });

    const response = await request(app).get("/api/tandas").query({ userId: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 1,
        name: "Tanda Enero",
        organizerId: 1,
        contributionAmount: 1000,
        status: "forming",
        currentRound: 1,
        totalRounds: 2,
      },
    ]);
  });
});

describe("GET /api/tandas/:id", () => {
  it("returns 404 when the tanda does not exist", async () => {
    const app = createApp({ databaseFilePath: ":memory:" });

    const response = await request(app).get("/api/tandas/999");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("not_found");
  });
});

describe("POST /api/tandas/:id/join", () => {
  it("adds a new member while the tanda is forming", async () => {
    const app = createApp({ databaseFilePath: ":memory:" });

    await createUser(app, "alice@example.com", "Alice");
    await createUser(app, "bob@example.com", "Bob");
    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: 1,
      contributionAmount: 1000,
    });

    const response = await request(app).post("/api/tandas/1/join").send({ userId: 2 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 2,
      userId: 2,
      tandaId: 1,
      role: "member",
      rotationPosition: null,
      isDefaulter: false,
    });
  });

  it("returns 422 when joining an active tanda", async () => {
    const app = await createStartedTanda();

    const response = await request(app).post("/api/tandas/1/join").send({ userId: 4 });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("unprocessable_entity");
  });
});

describe("POST /api/tandas/:id/start", () => {
  it("returns 400 when fewer than three participants joined", async () => {
    const app = createApp({ databaseFilePath: ":memory:" });

    await createUser(app, "alice@example.com", "Alice");
    await createUser(app, "bob@example.com", "Bob");
    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: 1,
      contributionAmount: 1000,
    });
    await request(app).post("/api/tandas/1/join").send({ userId: 2 });

    const response = await request(app).post("/api/tandas/1/start").send({ organizerId: 1 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("validation_error");
  });

  it("starts a tanda and assigns visible rotation positions", async () => {
    const app = await createStartedTanda();

    const detailResponse = await request(app).get("/api/tandas/1");
    const participantsResponse = await request(app).get("/api/tandas/1/participants");

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.status).toBe("active");
    expect(detailResponse.body.currentRecipientParticipantId).toBeGreaterThanOrEqual(1);
    expect(participantsResponse.body.map((participant: { rotationPosition: number }) => participant.rotationPosition).sort())
      .toEqual([1, 2, 3]);
  });
});

describe("POST /api/tandas/:id/cancel", () => {
  it("cancels a tanda when the organizer requests it", async () => {
    const app = await createStartedTanda();

    const response = await request(app).post("/api/tandas/1/cancel").send({ organizerId: 1 });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("cancelled");
  });

  it("returns 403 when a non-organizer tries to cancel", async () => {
    const app = await createStartedTanda();

    const response = await request(app).post("/api/tandas/1/cancel").send({ organizerId: 2 });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("forbidden");
  });
});

describe("POST /api/tandas/:id/contributions", () => {
  it("records a contribution for the current round", async () => {
    const app = await createStartedTanda();

    const response = await request(app).post("/api/tandas/1/contributions").send({
      participantId: 1,
      amount: 1000,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 1,
      tandaId: 1,
      participantId: 1,
      round: 1,
      amount: 1000,
      status: "paid",
      penaltyAmount: 0,
    });
  });

  it("returns 400 for the wrong contribution amount", async () => {
    const app = await createStartedTanda();

    const response = await request(app).post("/api/tandas/1/contributions").send({
      participantId: 1,
      amount: 999,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("validation_error");
  });

  it("marks a contribution as late with a 5 percent penalty", async () => {
    const app = await createStartedTanda();

    const response = await request(app).post("/api/tandas/1/contributions").send({
      participantId: 1,
      amount: 1000,
      recordedAt: "2030-01-02T01:00:00.000Z",
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("late");
    expect(response.body.penaltyAmount).toBe(50);
  });

  it("returns 409 when the participant already contributed in the round", async () => {
    const app = await createStartedTanda();

    await request(app).post("/api/tandas/1/contributions").send({
      participantId: 1,
      amount: 1000,
    });

    const response = await request(app).post("/api/tandas/1/contributions").send({
      participantId: 1,
      amount: 1000,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("conflict");
  });
});

describe("GET /api/tandas/:id/rounds/:round", () => {
  it("summarizes paid and pending contributions for a round", async () => {
    const app = await createStartedTanda();

    await request(app).post("/api/tandas/1/contributions").send({ participantId: 1, amount: 1000 });

    const response = await request(app).get("/api/tandas/1/rounds/1");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tandaId: 1,
      round: 1,
      expectedAmount: 3000,
      collectedAmount: 1000,
      penaltyAmount: 0,
    });
    expect(response.body.contributions).toHaveLength(3);
    expect(response.body.contributions.map((contribution: { status: string }) => contribution.status).sort())
      .toEqual(["paid", "pending", "pending"]);
  });
});

describe("POST /api/tandas/:id/advance", () => {
  it("returns 403 when a non-organizer advances the tanda", async () => {
    const app = await createStartedTanda();

    const response = await request(app).post("/api/tandas/1/advance").send({ organizerId: 2 });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("forbidden");
  });

  it("marks repeated misses and auto-completes after the final round", async () => {
    const app = await createStartedTanda();

    await request(app).post("/api/tandas/1/contributions").send({ participantId: 1, amount: 1000 });
    await request(app).post("/api/tandas/1/contributions").send({ participantId: 2, amount: 1000 });
    await request(app).post("/api/tandas/1/advance").send({ organizerId: 1 });

    await request(app).post("/api/tandas/1/contributions").send({ participantId: 1, amount: 1000 });
    await request(app).post("/api/tandas/1/contributions").send({ participantId: 2, amount: 1000 });
    await request(app).post("/api/tandas/1/advance").send({ organizerId: 1 });

    const participantsResponse = await request(app).get("/api/tandas/1/participants");

    await request(app).post("/api/tandas/1/advance").send({ organizerId: 1 });
    const detailResponse = await request(app).get("/api/tandas/1");
    const historyResponse = await request(app).get("/api/tandas/1/participants/3/history");

    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body.find((participant: { id: number }) => participant.id === 3)).toMatchObject({
      isDefaulter: true,
    });

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.status).toBe("completed");

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.map((contribution: { status: string }) => contribution.status))
      .toEqual(["missed", "missed", "missed"]);
  });
});

describe("GET /api/tandas/:id/participants/:pid/history", () => {
  it("returns 404 when the participant is not part of the tanda", async () => {
    const app = await createStartedTanda();

    const response = await request(app).get("/api/tandas/1/participants/999/history");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("not_found");
  });
});

/**
 * Create a user through the public API.
 *
 * @param app Express application under test.
 * @param email Email address to create.
 * @param name Display name to create.
 * @returns No return value.
 */
async function createUser(app: ReturnType<typeof createApp>, email: string, name: string): Promise<void> {
  await request(app).post("/api/users").send({ email, name });
}

/**
 * Create and start a tanda with three participants.
 *
 * @returns Started application fixture.
 */
async function createStartedTanda(): Promise<ReturnType<typeof createApp>> {
  const app = createApp({ databaseFilePath: ":memory:" });

  await createUser(app, "alice@example.com", "Alice");
  await createUser(app, "bob@example.com", "Bob");
  await createUser(app, "carol@example.com", "Carol");
  await createUser(app, "dave@example.com", "Dave");

  await request(app).post("/api/tandas").send({
    name: "Tanda Enero",
    organizerId: 1,
    contributionAmount: 1000,
  });
  await request(app).post("/api/tandas/1/join").send({ userId: 2 });
  await request(app).post("/api/tandas/1/join").send({ userId: 3 });
  await request(app).post("/api/tandas/1/start").send({ organizerId: 1 });

  return app;
}
