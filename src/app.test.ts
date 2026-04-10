import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app";

const openDatabases: Array<{ close: () => void }> = [];

const buildClient = () => {
  const instance = createApp({
    config: {
      databasePath: ":memory:",
      jwtSecret: "test-secret",
    },
    random: () => 0.25,
  });

  openDatabases.push(instance.db);
  return request(instance.app);
};

const createUser = async (client: request.SuperTest<request.Test>, email: string, name: string) => {
  const response = await client.post("/api/users").send({ email, name });
  return response.body as { id: number; email: string; name: string };
};

afterEach(() => {
  while (openDatabases.length > 0) {
    openDatabases.pop()?.close();
  }
});

describe("users API", () => {
  it("creates, lists and fetches users", async () => {
    const client = buildClient();

    const created = await client.post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      id: 1,
      email: "alice@example.com",
      name: "Alice",
    });

    const list = await client.get("/api/users");
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);

    const detail = await client.get("/api/users/1");
    expect(detail.status).toBe(200);
    expect(detail.body.email).toBe("alice@example.com");
  });

  it("rejects duplicate users and unknown ids", async () => {
    const client = buildClient();

    await client.post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    const duplicate = await client.post("/api/users").send({
      email: "alice@example.com",
      name: "Alice 2",
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("conflict");

    const missing = await client.get("/api/users/999");
    expect(missing.status).toBe(404);
  });
});

describe("tandas API", () => {
  it("creates tandas, auto-joins the organizer and lists them for a user", async () => {
    const client = buildClient();
    const organizer = await createUser(client, "organizer@example.com", "Organizer");

    const created = await client.post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: organizer.id,
      contributionAmount: 1000,
    });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      id: 1,
      name: "Tanda Enero",
      organizerId: organizer.id,
      contributionAmount: 1000,
      status: "forming",
      currentRound: 0,
      totalRounds: 1,
    });

    const listed = await client.get(`/api/tandas?userId=${organizer.id}`);
    expect(listed.status).toBe(200);
    expect(listed.body[0]).toMatchObject({
      id: 1,
      participantsCount: 1,
    });

    const participants = await client.get("/api/tandas/1/participants");
    expect(participants.status).toBe(200);
    expect(participants.body[0]).toMatchObject({
      userId: organizer.id,
      role: "organizer",
      isDefaulter: false,
    });

    const detail = await client.get("/api/tandas/1");
    expect(detail.status).toBe(200);
    expect(detail.body.status).toBe("forming");
  });

  it("requires userId when listing tandas", async () => {
    const client = buildClient();

    const response = await client.get("/api/tandas");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("validation_error");
  });

  it("joins members and rejects duplicates", async () => {
    const client = buildClient();
    const organizer = await createUser(client, "organizer@example.com", "Organizer");
    const bob = await createUser(client, "bob@example.com", "Bob");

    await client.post("/api/tandas").send({
      name: "Tanda Primavera",
      organizerId: organizer.id,
      contributionAmount: 900,
    });

    const joined = await client.post("/api/tandas/1/join").send({ userId: bob.id });
    expect(joined.status).toBe(200);
    expect(joined.body).toMatchObject({
      userId: bob.id,
      role: "member",
    });

    const duplicate = await client.post("/api/tandas/1/join").send({ userId: bob.id });
    expect(duplicate.status).toBe(409);
  });

  it("starts a tanda only with 3 participants and only by the organizer", async () => {
    const client = buildClient();
    const organizer = await createUser(client, "organizer@example.com", "Organizer");
    const bob = await createUser(client, "bob@example.com", "Bob");
    const carol = await createUser(client, "carol@example.com", "Carol");

    await client.post("/api/tandas").send({
      name: "Tanda Abril",
      organizerId: organizer.id,
      contributionAmount: 1000,
    });
    await client.post("/api/tandas/1/join").send({ userId: bob.id });

    const tooSmall = await client.post("/api/tandas/1/start").send({ userId: organizer.id });
    expect(tooSmall.status).toBe(409);

    await client.post("/api/tandas/1/join").send({ userId: carol.id });

    const forbidden = await client.post("/api/tandas/1/start").send({ userId: bob.id });
    expect(forbidden.status).toBe(403);

    const started = await client.post("/api/tandas/1/start").send({ userId: organizer.id });
    expect(started.status).toBe(200);
    expect(started.body).toMatchObject({
      status: "active",
      currentRound: 1,
      totalRounds: 3,
    });

    const participants = await client.get("/api/tandas/1/participants");
    expect(
      participants.body.every((participant: { rotationPosition: number | null }) => participant.rotationPosition),
    ).toBe(true);
  });

  it("records contributions, exposes round summaries and participant history", async () => {
    const client = buildClient();
    const organizer = await createUser(client, "organizer@example.com", "Organizer");
    const bob = await createUser(client, "bob@example.com", "Bob");
    const carol = await createUser(client, "carol@example.com", "Carol");

    await client.post("/api/tandas").send({
      name: "Tanda Mayo",
      organizerId: organizer.id,
      contributionAmount: 1000,
    });
    await client.post("/api/tandas/1/join").send({ userId: bob.id });
    await client.post("/api/tandas/1/join").send({ userId: carol.id });
    await client.post("/api/tandas/1/start").send({ userId: organizer.id });

    const participants = await client.get("/api/tandas/1/participants");
    const bobParticipant = participants.body.find((participant: { userId: number }) => participant.userId === bob.id);
    const carolParticipant = participants.body.find((participant: { userId: number }) => participant.userId === carol.id);

    const paid = await client.post("/api/tandas/1/contributions").send({
      participantId: bobParticipant.id,
      amount: 1000,
    });

    expect(paid.status).toBe(200);
    expect(paid.body.status).toBe("paid");

    const underpaidLate = await client.post("/api/tandas/1/contributions").send({
      participantId: carolParticipant.id,
      amount: 1000,
      status: "late",
    });

    expect(underpaidLate.status).toBe(400);

    const late = await client.post("/api/tandas/1/contributions").send({
      participantId: carolParticipant.id,
      amount: 1050,
      status: "late",
    });

    expect(late.status).toBe(200);
    expect(late.body).toMatchObject({
      status: "late",
      penaltyAmount: 50,
    });

    const round = await client.get("/api/tandas/1/rounds/1");
    expect(round.status).toBe(200);
    expect(round.body.contributions).toHaveLength(3);
    expect(round.body.totalCollected).toBe(2050);

    const history = await client.get(`/api/tandas/1/participants/${carolParticipant.id}/history`);
    expect(history.status).toBe(200);
    expect(history.body.participant.userId).toBe(carol.id);
    expect(history.body.contributions[0].status).toBe("late");
  });

  it("advances rounds, marks missed contributions, flags defaulters and completes on the last round", async () => {
    const client = buildClient();
    const organizer = await createUser(client, "organizer@example.com", "Organizer");
    const bob = await createUser(client, "bob@example.com", "Bob");
    const carol = await createUser(client, "carol@example.com", "Carol");

    await client.post("/api/tandas").send({
      name: "Tanda Junio",
      organizerId: organizer.id,
      contributionAmount: 1000,
    });
    await client.post("/api/tandas/1/join").send({ userId: bob.id });
    await client.post("/api/tandas/1/join").send({ userId: carol.id });
    await client.post("/api/tandas/1/start").send({ userId: organizer.id });

    const participants = await client.get("/api/tandas/1/participants");
    const bobParticipant = participants.body.find((participant: { userId: number }) => participant.userId === bob.id);

    const forbidden = await client.post("/api/tandas/1/advance").send({ userId: bob.id });
    expect(forbidden.status).toBe(403);

    const round2 = await client.post("/api/tandas/1/advance").send({ userId: organizer.id });
    expect(round2.status).toBe(200);
    expect(round2.body.currentRound).toBe(2);

    await client.post("/api/tandas/1/advance").send({ userId: organizer.id });

    const bobHistory = await client.get(`/api/tandas/1/participants/${bobParticipant.id}/history`);
    expect(bobHistory.status).toBe(200);
    expect(bobHistory.body.participant.isDefaulter).toBe(true);
    expect(bobHistory.body.contributions.map((entry: { status: string }) => entry.status)).toEqual([
      "missed",
      "missed",
      "pending",
    ]);

    const completed = await client.post("/api/tandas/1/advance").send({ userId: organizer.id });
    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe("completed");
  });

  it("cancels a tanda and rejects contributions after cancellation", async () => {
    const client = buildClient();
    const organizer = await createUser(client, "organizer@example.com", "Organizer");
    const bob = await createUser(client, "bob@example.com", "Bob");

    await client.post("/api/tandas").send({
      name: "Tanda Julio",
      organizerId: organizer.id,
      contributionAmount: 1000,
    });

    const cancelled = await client.post("/api/tandas/1/cancel").send({ userId: organizer.id });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("cancelled");

    const deniedJoin = await client.post("/api/tandas/1/join").send({ userId: bob.id });
    expect(deniedJoin.status).toBe(409);

    const deniedContribution = await client.post("/api/tandas/1/contributions").send({
      participantId: 1,
      amount: 1000,
    });
    expect(deniedContribution.status).toBe(409);
  });
});
