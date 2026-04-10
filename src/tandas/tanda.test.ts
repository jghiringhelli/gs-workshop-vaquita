import { type Express } from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { type DatabaseConnection } from "../db/database";
import { createTestApp } from "../testing/create-test-app";

let currentDb: DatabaseConnection | undefined;

function keepParticipantOrder<T>(participants: T[]): T[] {
  return [...participants];
}

function setup(): Express {
  const { app, db } = createTestApp({
    shuffleParticipants: keepParticipantOrder,
  });

  currentDb = db;

  return app;
}

async function createUser(app: Express, email: string, name: string): Promise<number> {
  const response = await request(app).post("/api/users").send({ email, name });

  expect(response.status).toBe(201);

  return response.body.id as number;
}

async function createStartedTanda(app: Express): Promise<{
  tandaId: number;
  organizerId: number;
  memberOneId: number;
  memberTwoId: number;
}> {
  const organizerId = await createUser(app, "organizer@example.com", "Organizer");
  const memberOneId = await createUser(app, "member-one@example.com", "Member One");
  const memberTwoId = await createUser(app, "member-two@example.com", "Member Two");

  const createResponse = await request(app).post("/api/tandas").send({
    name: "Tanda Enero",
    organizerId,
    contributionAmount: 1000,
  });

  expect(createResponse.status).toBe(201);

  const tandaId = createResponse.body.id as number;

  await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberOneId });
  await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberTwoId });

  const startResponse = await request(app).post(`/api/tandas/${tandaId}/start`).send({
    userId: organizerId,
  });

  expect(startResponse.status).toBe(200);

  return {
    tandaId,
    organizerId,
    memberOneId,
    memberTwoId,
  };
}

afterEach(() => {
  currentDb?.close();
  currentDb = undefined;
});

describe("Tanda API", () => {
  it("creates a tanda and auto-joins the organizer", async () => {
    const app = setup();
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    const createResponse = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toEqual({
      id: 1,
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
      status: "forming",
      currentRound: 0,
      totalRounds: 1,
    });

    const participantsResponse = await request(app).get("/api/tandas/1/participants");

    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body).toEqual([
      {
        id: 1,
        userId: organizerId,
        tandaId: 1,
        role: "organizer",
        rotationPosition: null,
        isDefaulter: false,
      },
    ]);
  });

  it("lists tandas for a specific user", async () => {
    const app = setup();
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberId = await createUser(app, "bob@example.com", "Bob");

    const createResponse = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 800,
    });

    const tandaId = createResponse.body.id as number;

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberId });

    const response = await request(app).get(`/api/tandas?userId=${memberId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: tandaId,
        name: "Tanda Enero",
        organizerId,
        contributionAmount: 800,
        status: "forming",
        currentRound: 0,
        totalRounds: 2,
      },
    ]);
  });

  it("requires at least three participants to start", async () => {
    const app = setup();
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberId = await createUser(app, "bob@example.com", "Bob");

    const createResponse = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

    const tandaId = createResponse.body.id as number;

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberId });

    const response = await request(app).post(`/api/tandas/${tandaId}/start`).send({
      userId: organizerId,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("DOMAIN_RULE_VIOLATION");
  });

  it("allows only the organizer to start a tanda", async () => {
    const app = setup();
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberOneId = await createUser(app, "bob@example.com", "Bob");
    const memberTwoId = await createUser(app, "carol@example.com", "Carol");

    const createResponse = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

    const tandaId = createResponse.body.id as number;

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberOneId });
    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberTwoId });

    const response = await request(app).post(`/api/tandas/${tandaId}/start`).send({
      userId: memberOneId,
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("starts a tanda, assigns rotation positions, and creates pending contributions", async () => {
    const app = setup();
    const { tandaId, organizerId, memberOneId, memberTwoId } = await createStartedTanda(app);

    const tandaResponse = await request(app).get(`/api/tandas/${tandaId}`);
    const participantsResponse = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const roundResponse = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);

    expect(tandaResponse.status).toBe(200);
    expect(tandaResponse.body).toEqual({
      id: tandaId,
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
      status: "active",
      currentRound: 1,
      totalRounds: 3,
    });

    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body).toEqual([
      {
        id: 1,
        userId: organizerId,
        tandaId,
        role: "organizer",
        rotationPosition: 1,
        isDefaulter: false,
      },
      {
        id: 2,
        userId: memberOneId,
        tandaId,
        role: "member",
        rotationPosition: 2,
        isDefaulter: false,
      },
      {
        id: 3,
        userId: memberTwoId,
        tandaId,
        role: "member",
        rotationPosition: 3,
        isDefaulter: false,
      },
    ]);

    expect(roundResponse.status).toBe(200);
    expect(roundResponse.body).toEqual({
      tandaId,
      round: 1,
      recipientParticipantId: 1,
      contributions: [
        {
          id: 1,
          tandaId,
          participantId: 1,
          round: 1,
          amount: 1000,
          status: "pending",
          penaltyAmount: 0,
        },
        {
          id: 2,
          tandaId,
          participantId: 2,
          round: 1,
          amount: 1000,
          status: "pending",
          penaltyAmount: 0,
        },
        {
          id: 3,
          tandaId,
          participantId: 3,
          round: 1,
          amount: 1000,
          status: "pending",
          penaltyAmount: 0,
        },
      ],
    });
  });

  it("prevents duplicate joins and joining after activation", async () => {
    const app = setup();
    const organizerId = await createUser(app, "alice@example.com", "Alice");
    const memberOneId = await createUser(app, "bob@example.com", "Bob");
    const memberTwoId = await createUser(app, "carol@example.com", "Carol");
    const memberThreeId = await createUser(app, "dave@example.com", "Dave");

    const createResponse = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

    const tandaId = createResponse.body.id as number;

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberOneId });
    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberTwoId });

    const duplicateResponse = await request(app).post(`/api/tandas/${tandaId}/join`).send({
      userId: memberTwoId,
    });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.code).toBe("CONFLICT");

    await request(app).post(`/api/tandas/${tandaId}/start`).send({ userId: organizerId });

    const lateJoinResponse = await request(app).post(`/api/tandas/${tandaId}/join`).send({
      userId: memberThreeId,
    });

    expect(lateJoinResponse.status).toBe(409);
    expect(lateJoinResponse.body.error.code).toBe("DOMAIN_RULE_VIOLATION");
  });

  it("records paid and late contributions for the current round", async () => {
    const app = setup();
    const { tandaId } = await createStartedTanda(app);

    const paidResponse = await request(app).post(`/api/tandas/${tandaId}/contributions`).send({
      participantId: 1,
    });

    const lateResponse = await request(app).post(`/api/tandas/${tandaId}/contributions`).send({
      participantId: 2,
      status: "late",
    });

    const duplicateResponse = await request(app).post(`/api/tandas/${tandaId}/contributions`).send({
      participantId: 1,
    });

    expect(paidResponse.status).toBe(201);
    expect(paidResponse.body).toEqual({
      id: 1,
      tandaId,
      participantId: 1,
      round: 1,
      amount: 1000,
      status: "paid",
      penaltyAmount: 0,
    });

    expect(lateResponse.status).toBe(201);
    expect(lateResponse.body).toEqual({
      id: 2,
      tandaId,
      participantId: 2,
      round: 1,
      amount: 1000,
      status: "late",
      penaltyAmount: 50,
    });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.code).toBe("CONFLICT");
  });

  it("marks pending contributions as missed when advancing and flags defaulters after two misses", async () => {
    const app = setup();
    const { tandaId, organizerId } = await createStartedTanda(app);

    await request(app).post(`/api/tandas/${tandaId}/contributions`).send({
      participantId: 1,
    });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ userId: organizerId });
    await request(app).post(`/api/tandas/${tandaId}/contributions`).send({
      participantId: 1,
    });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ userId: organizerId });

    const historyResponse = await request(app).get(`/api/tandas/${tandaId}/participants/2/history`);
    const participantsResponse = await request(app).get(`/api/tandas/${tandaId}/participants`);

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body).toEqual({
      tandaId,
      participantId: 2,
      isDefaulter: true,
      contributions: [
        {
          id: 2,
          tandaId,
          participantId: 2,
          round: 1,
          amount: 1000,
          status: "missed",
          penaltyAmount: 0,
        },
        {
          id: 5,
          tandaId,
          participantId: 2,
          round: 2,
          amount: 1000,
          status: "missed",
          penaltyAmount: 0,
        },
        {
          id: 8,
          tandaId,
          participantId: 2,
          round: 3,
          amount: 1000,
          status: "pending",
          penaltyAmount: 0,
        },
      ],
    });

    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body[1].isDefaulter).toBe(true);
  });

  it("auto-completes after the last round advances", async () => {
    const app = setup();
    const { tandaId, organizerId } = await createStartedTanda(app);

    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ userId: organizerId });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ userId: organizerId });

    const finalAdvanceResponse = await request(app).post(`/api/tandas/${tandaId}/advance`).send({
      userId: organizerId,
    });

    expect(finalAdvanceResponse.status).toBe(200);
    expect(finalAdvanceResponse.body.status).toBe("completed");
    expect(finalAdvanceResponse.body.currentRound).toBe(3);
    expect(finalAdvanceResponse.body.totalRounds).toBe(3);
  });

  it("allows the organizer to cancel a tanda", async () => {
    const app = setup();
    const organizerId = await createUser(app, "alice@example.com", "Alice");

    const createResponse = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

    const tandaId = createResponse.body.id as number;

    const response = await request(app).post(`/api/tandas/${tandaId}/cancel`).send({
      organizerId,
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("cancelled");
  });
});
