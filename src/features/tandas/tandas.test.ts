import request from "supertest";

import type { ApplicationContext } from "../../app";
import { createApp, createApplicationContext, disposeApplicationContext } from "../../app";
import { loadConfig } from "../../config/env";

describe("tandas feature", () => {
  let context: ApplicationContext;

  beforeEach(() => {
    context = createApplicationContext(
      loadConfig({
        ...process.env,
        DATABASE_PATH: ":memory:",
        NODE_ENV: "test",
      }),
    );
  });

  afterEach(() => {
    disposeApplicationContext(context);
  });

  it("creates a tanda and auto-joins the organizer", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    const response = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 1,
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
      status: "forming",
      currentRound: 0,
      totalRounds: 0,
    });

    const participantsResponse = await request(app).get("/api/tandas/1/participants");
    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body).toHaveLength(1);
    expect(participantsResponse.body[0]).toMatchObject({
      userId: organizerId,
      tandaId: 1,
      role: "organizer",
      rotationPosition: null,
    });
  });

  it("rejects invalid tanda payloads", async () => {
    const app = createApp(context);

    const response = await request(app).post("/api/tandas").send({
      name: "",
      organizerId: 0,
      contributionAmount: -1,
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when creating a tanda with a missing organizer", async () => {
    const app = createApp(context);

    const response = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: 999,
      contributionAmount: 1000,
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("lists tandas for a user", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });
    await request(app).post("/api/tandas").send({
      name: "Tanda Febrero",
      organizerId,
      contributionAmount: 1500,
    });

    const response = await request(app).get(`/api/tandas?userId=${organizerId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({ name: "Tanda Enero" });
    expect(response.body[1]).toMatchObject({ name: "Tanda Febrero" });
  });

  it("rejects invalid list query params", async () => {
    const app = createApp(context);

    const response = await request(app).get("/api/tandas?unexpected=true");

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when listing tandas for a missing user", async () => {
    const app = createApp(context);

    const response = await request(app).get("/api/tandas?userId=999");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns tanda details by id", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    const createResponse = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

    const response = await request(app).get(`/api/tandas/${createResponse.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      name: "Tanda Enero",
      organizerId,
    });
  });

  it("returns 404 when the tanda does not exist", async () => {
    const app = createApp(context);

    const response = await request(app).get("/api/tandas/999");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("lists tanda participants", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

    const response = await request(app).get("/api/tandas/1/participants");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ role: "organizer", userId: organizerId });
  });

  it("returns 404 when listing participants for a missing tanda", async () => {
    const app = createApp(context);

    const response = await request(app).get("/api/tandas/999/participants");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("joins a user to a forming tanda", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberId = await createUser(app, "bob@example.com", "Bob");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

    const response = await request(app).post("/api/tandas/1/join").send({ userId: memberId });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      userId: memberId,
      tandaId: 1,
      role: "member",
      rotationPosition: null,
    });

    const participantsResponse = await request(app).get("/api/tandas/1/participants");
    expect(participantsResponse.body).toHaveLength(2);
  });

  it("rejects invalid join payloads", async () => {
    const app = createApp(context);

    const response = await request(app).post("/api/tandas/1/join").send({ userId: 0, extra: true });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when joining a missing tanda", async () => {
    const app = createApp(context);
    const memberId = await createUser(app, "bob@example.com", "Bob");

    const response = await request(app).post("/api/tandas/999/join").send({ userId: memberId });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when joining with a missing user", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

    const response = await request(app).post("/api/tandas/1/join").send({ userId: 999 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects duplicate participants", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberId = await createUser(app, "bob@example.com", "Bob");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });
    await request(app).post("/api/tandas/1/join").send({ userId: memberId });

    const response = await request(app).post("/api/tandas/1/join").send({ userId: memberId });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("rejects join when the tanda is not forming", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberId = await createUser(app, "bob@example.com", "Bob");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });
    context.database.client.prepare("UPDATE tandas SET status = 'active' WHERE id = 1").run();

    const response = await request(app).post("/api/tandas/1/join").send({ userId: memberId });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("rejects join when the max participant limit is reached", async () => {
    disposeApplicationContext(context);
    context = createApplicationContext(
      loadConfig({
        ...process.env,
        DATABASE_PATH: ":memory:",
        NODE_ENV: "test",
        MAX_PARTICIPANTS: "3",
      }),
    );

    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberOneId = await createUser(app, "bob@example.com", "Bob");
    const memberTwoId = await createUser(app, "carol@example.com", "Carol");
    const memberThreeId = await createUser(app, "dave@example.com", "Dave");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });
    await request(app).post("/api/tandas/1/join").send({ userId: memberOneId });
    await request(app).post("/api/tandas/1/join").send({ userId: memberTwoId });

    const response = await request(app).post("/api/tandas/1/join").send({ userId: memberThreeId });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("starts a tanda and locks randomized rotation", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberOneId = await createUser(app, "bob@example.com", "Bob");
    const memberTwoId = await createUser(app, "carol@example.com", "Carol");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });
    await request(app).post("/api/tandas/1/join").send({ userId: memberOneId });
    await request(app).post("/api/tandas/1/join").send({ userId: memberTwoId });

    const response = await request(app).post("/api/tandas/1/start").send({ organizerId });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 1,
      status: "active",
      currentRound: 1,
      totalRounds: 3,
    });

    const participantsResponse = await request(app).get("/api/tandas/1/participants");
    expect(participantsResponse.status).toBe(200);
    const assignedPositions = participantsResponse.body
      .map((participant: { rotationPosition: number | null }) => participant.rotationPosition)
      .sort((left: number, right: number) => left - right);

    expect(assignedPositions).toEqual([1, 2, 3]);
  });

  it("rejects invalid start payloads", async () => {
    const app = createApp(context);

    const response = await request(app).post("/api/tandas/1/start").send({ organizerId: 0, extra: true });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when starting with fewer than 3 participants", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberId = await createUser(app, "bob@example.com", "Bob");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });
    await request(app).post("/api/tandas/1/join").send({ userId: memberId });

    const response = await request(app).post("/api/tandas/1/start").send({ organizerId });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 403 when a non-organizer starts a tanda", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberOneId = await createUser(app, "bob@example.com", "Bob");
    const memberTwoId = await createUser(app, "carol@example.com", "Carol");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });
    await request(app).post("/api/tandas/1/join").send({ userId: memberOneId });
    await request(app).post("/api/tandas/1/join").send({ userId: memberTwoId });

    const response = await request(app).post("/api/tandas/1/start").send({ organizerId: memberOneId });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 409 when starting a tanda that is not forming", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberOneId = await createUser(app, "bob@example.com", "Bob");
    const memberTwoId = await createUser(app, "carol@example.com", "Carol");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });
    await request(app).post("/api/tandas/1/join").send({ userId: memberOneId });
    await request(app).post("/api/tandas/1/join").send({ userId: memberTwoId });
    await request(app).post("/api/tandas/1/start").send({ organizerId });

    const response = await request(app).post("/api/tandas/1/start").send({ organizerId });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("advances an active tanda to the next round", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    const tandaId = await createStartedTanda(app, organizerId, "Tanda Advance");

    const response = await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: tandaId,
      status: "active",
      currentRound: 2,
      totalRounds: 3,
    });
  });

  it("completes a tanda after the last round advances", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    const tandaId = await createStartedTanda(app, organizerId, "Tanda Complete");
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId });

    const response = await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: tandaId,
      status: "completed",
      currentRound: 3,
      totalRounds: 3,
    });
  });

  it("rejects invalid advance payloads", async () => {
    const app = createApp(context);

    const response = await request(app).post("/api/tandas/1/advance").send({ organizerId: 0, extra: true });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 when a non-organizer advances a tanda", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const outsiderId = await createUser(app, "dan@example.com", "Dan");

    const tandaId = await createStartedTanda(app, organizerId, "Tanda Forbidden Advance");

    const response = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ organizerId: outsiderId });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 409 when advancing a tanda that is not active", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberOneId = await createUser(app, "bob@example.com", "Bob");
    const memberTwoId = await createUser(app, "carol@example.com", "Carol");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });
    await request(app).post("/api/tandas/1/join").send({ userId: memberOneId });
    await request(app).post("/api/tandas/1/join").send({ userId: memberTwoId });

    const response = await request(app).post("/api/tandas/1/advance").send({ organizerId });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("returns 409 when advancing a completed tanda", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    const tandaId = await createStartedTanda(app, organizerId, "Tanda Completed Advance");
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId });

    const response = await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("records a contribution for the current round", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    const tandaId = await createStartedTanda(app, organizerId, "Tanda Contribution");

    const participantsResponse = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const memberParticipant = participantsResponse.body.find(
      (participant: { role: string }) => participant.role === "member",
    ) as { id: number };

    const response = await request(app).post(`/api/tandas/${tandaId}/contributions`).send({
      participantId: memberParticipant.id,
      amount: 1000,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      tandaId,
      participantId: memberParticipant.id,
      round: 1,
      amount: 1000,
      penaltyAmount: 0,
      status: "paid",
    });
  });

  it("rejects invalid contribution payloads", async () => {
    const app = createApp(context);

    const response = await request(app)
      .post("/api/tandas/1/contributions")
      .send({ participantId: 0, amount: -1, extra: true });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects contributions when the tanda is not active", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

    const participantsResponse = await request(app).get("/api/tandas/1/participants");
    const organizerParticipant = participantsResponse.body[0] as { id: number };

    const response = await request(app).post("/api/tandas/1/contributions").send({
      participantId: organizerParticipant.id,
      amount: 1000,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("rejects contributions for a participant outside the tanda", async () => {
    const app = createApp(context);
    const organizerOneId = await createUser(app, "alice@example.com", "Alice");
    const organizerTwoId = await createUser(app, "eve@example.com", "Eve");

    await createStartedTanda(app, organizerOneId, "Tanda One");
    const secondTandaId = await createStartedTanda(app, organizerTwoId, "Tanda Two");

    const secondParticipantsResponse = await request(app).get(
      `/api/tandas/${secondTandaId}/participants`,
    );
    const outsiderParticipant = secondParticipantsResponse.body.find(
      (participant: { role: string }) => participant.role === "member",
    ) as { id: number };

    const response = await request(app).post("/api/tandas/1/contributions").send({
      participantId: outsiderParticipant.id,
      amount: 1000,
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects contributions with the wrong amount", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    const tandaId = await createStartedTanda(app, organizerId, "Tanda Wrong Amount");

    const participantsResponse = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const memberParticipant = participantsResponse.body.find(
      (participant: { role: string }) => participant.role === "member",
    ) as { id: number };

    const response = await request(app).post(`/api/tandas/${tandaId}/contributions`).send({
      participantId: memberParticipant.id,
      amount: 999,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
  });

  it("rejects duplicate contributions in the same round", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    const tandaId = await createStartedTanda(app, organizerId, "Tanda Duplicate Contribution");

    const participantsResponse = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const memberParticipant = participantsResponse.body.find(
      (participant: { role: string }) => participant.role === "member",
    ) as { id: number };

    await request(app).post(`/api/tandas/${tandaId}/contributions`).send({
      participantId: memberParticipant.id,
      amount: 1000,
    });

    const response = await request(app).post(`/api/tandas/${tandaId}/contributions`).send({
      participantId: memberParticipant.id,
      amount: 1000,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("returns participant contribution history", async () => {
    const app = createApp(context);
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    const tandaId = await createStartedTanda(app, organizerId, "Tanda History");

    const participantsResponse = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const memberParticipant = participantsResponse.body.find(
      (participant: { role: string }) => participant.role === "member",
    ) as { id: number };

    await request(app).post(`/api/tandas/${tandaId}/contributions`).send({
      participantId: memberParticipant.id,
      amount: 1000,
    });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId });
    await request(app).post(`/api/tandas/${tandaId}/contributions`).send({
      participantId: memberParticipant.id,
      amount: 1000,
    });

    const response = await request(app).get(
      `/api/tandas/${tandaId}/participants/${memberParticipant.id}/history`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({ round: 1, status: "paid" });
    expect(response.body[1]).toMatchObject({ round: 2, status: "paid" });
  });

  it("returns 404 for participant history outside the tanda", async () => {
    const app = createApp(context);
    const organizerOneId = await createUser(app, "alice@example.com", "Alice");
    const organizerTwoId = await createUser(app, "eve@example.com", "Eve");

    await createStartedTanda(app, organizerOneId, "Tanda One");
    const secondTandaId = await createStartedTanda(app, organizerTwoId, "Tanda Two");

    const secondParticipantsResponse = await request(app).get(
      `/api/tandas/${secondTandaId}/participants`,
    );
    const outsiderParticipant = secondParticipantsResponse.body.find(
      (participant: { role: string }) => participant.role === "member",
    ) as { id: number };

    const response = await request(app).get(`/api/tandas/1/participants/${outsiderParticipant.id}/history`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects invalid participant history params", async () => {
    const app = createApp(context);

    const response = await request(app).get("/api/tandas/1/participants/not-a-number/history");

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});

async function createUser(
  app: ReturnType<typeof createApp>,
  email: string,
  name: string,
): Promise<number> {
  const response = await request(app).post("/api/users").send({ email, name });
  return response.body.id as number;
}

async function createStartedTanda(
  app: ReturnType<typeof createApp>,
  organizerId: number,
  tandaName: string,
): Promise<number> {
  const memberOneId = await createUser(app, `${organizerId}-bob@example.com`, "Bob");
  const memberTwoId = await createUser(app, `${organizerId}-carol@example.com`, "Carol");

  const createResponse = await request(app).post("/api/tandas").send({
    name: tandaName,
    organizerId,
    contributionAmount: 1000,
  });
  const tandaId = createResponse.body.id as number;

  await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberOneId });
  await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberTwoId });
  await request(app).post(`/api/tandas/${tandaId}/start`).send({ organizerId });

  return tandaId;
}