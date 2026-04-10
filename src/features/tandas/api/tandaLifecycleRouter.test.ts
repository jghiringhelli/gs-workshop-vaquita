import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApplication, type ApplicationContext } from "../../../app";
import type { AppConfig } from "../../../config/appConfig";

async function createUser(applicationContext: ApplicationContext, email: string, name: string): Promise<number> {
  const response = await request(applicationContext.app).post("/api/users").send({ email, name });
  return response.body.id as number;
}

async function seedUsers(applicationContext: ApplicationContext, count: number): Promise<readonly number[]> {
  const userIds: number[] = [];

  for (let index = 1; index <= count; index += 1) {
    const userId = await createUser(applicationContext, `user${index}@example.com`, `User ${index}`);
    userIds.push(userId);
  }

  return userIds;
}

describe("tanda lifecycle API", () => {
  let applicationContext: ApplicationContext;

  beforeEach((): void => {
    applicationContext = createApplication({
      databasePath: ":memory:",
      now: () => new Date("2026-04-10T10:00:00.000Z"),
      random: () => 0.1,
    });
  });

  afterEach((): void => {
    applicationContext.close();
  });

  it("creates, joins, lists, starts, and fetches a tanda", async () => {
    const [organizerId, memberOneId, memberTwoId] = await seedUsers(applicationContext, 3);

    const createResponse = await request(applicationContext.app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      id: 1,
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
      status: "forming",
      currentRound: 0,
      totalRounds: 1,
    });
    expect(createResponse.body.participants).toHaveLength(1);

    const organizerListResponse = await request(applicationContext.app).get("/api/tandas").query({ userId: organizerId });
    expect(organizerListResponse.status).toBe(200);
    expect(organizerListResponse.body).toHaveLength(1);
    expect(organizerListResponse.body[0]).toMatchObject({
      id: 1,
      participantCount: 1,
    });

    const firstJoinResponse = await request(applicationContext.app).post("/api/tandas/1/join").send({
      userId: memberOneId,
    });
    expect(firstJoinResponse.status).toBe(201);
    expect(firstJoinResponse.body).toMatchObject({
      tandaId: 1,
      userId: memberOneId,
      role: "member",
    });

    const secondJoinResponse = await request(applicationContext.app).post("/api/tandas/1/join").send({
      userId: memberTwoId,
    });
    expect(secondJoinResponse.status).toBe(201);

    const memberListResponse = await request(applicationContext.app).get("/api/tandas").query({ userId: memberOneId });
    expect(memberListResponse.status).toBe(200);
    expect(memberListResponse.body).toHaveLength(1);
    expect(memberListResponse.body[0]).toMatchObject({
      id: 1,
      participantCount: 3,
    });

    const participantsResponse = await request(applicationContext.app).get("/api/tandas/1/participants");
    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body).toHaveLength(3);

    const previewBeforeStartResponse = await request(applicationContext.app).get("/api/tandas/1/next-recipient");
    expect(previewBeforeStartResponse.status).toBe(200);
    expect(previewBeforeStartResponse.body).toMatchObject({
      tandaId: 1,
      status: "forming",
      round: null,
      recipient: null,
    });

    const startResponse = await request(applicationContext.app).post("/api/tandas/1/start").send({
      userId: organizerId,
    });
    expect(startResponse.status).toBe(200);
    expect(startResponse.body).toMatchObject({
      id: 1,
      status: "active",
      currentRound: 1,
      totalRounds: 3,
    });
    expect(startResponse.body.participants).toHaveLength(3);

    const rotationPositions = (startResponse.body.participants as Array<{ rotationPosition: number }>).map(
      (participant) => participant.rotationPosition,
    );
    expect(new Set(rotationPositions).size).toBe(3);

    const nextRecipientResponse = await request(applicationContext.app).get("/api/tandas/1/next-recipient");
    expect(nextRecipientResponse.status).toBe(200);
    expect(nextRecipientResponse.body).toMatchObject({
      tandaId: 1,
      status: "active",
      round: 1,
    });
    expect(nextRecipientResponse.body.recipient).toMatchObject({
      tandaId: 1,
      rotationPosition: 1,
    });

    const detailResponse = await request(applicationContext.app).get("/api/tandas/1");
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body).toMatchObject({
      id: 1,
      status: "active",
      participantCount: 3,
    });
  });

  it("rejects invalid list, detail, and participant lookups", async () => {
    const missingQueryResponse = await request(applicationContext.app).get("/api/tandas");
    expect(missingQueryResponse.status).toBe(422);

    const missingDetailResponse = await request(applicationContext.app).get("/api/tandas/999");
    expect(missingDetailResponse.status).toBe(404);

    const missingParticipantsResponse = await request(applicationContext.app).get("/api/tandas/999/participants");
    expect(missingParticipantsResponse.status).toBe(404);

    const missingRecipientPreviewResponse = await request(applicationContext.app).get("/api/tandas/999/next-recipient");
    expect(missingRecipientPreviewResponse.status).toBe(404);
  });

  it("rejects invalid lifecycle transitions and organizer violations", async () => {
    const [organizerId, memberOneId, memberTwoId, outsiderId] = await seedUsers(applicationContext, 4);

    await request(applicationContext.app).post("/api/tandas").send({
      name: "Tanda Primavera",
      organizerId,
      contributionAmount: 500,
    });

    await request(applicationContext.app).post("/api/tandas/1/join").send({
      userId: memberOneId,
    });

    const nonOrganizerStartResponse = await request(applicationContext.app).post("/api/tandas/1/start").send({
      userId: memberOneId,
    });
    expect(nonOrganizerStartResponse.status).toBe(403);

    const notEnoughParticipantsResponse = await request(applicationContext.app).post("/api/tandas/1/start").send({
      userId: organizerId,
    });
    expect(notEnoughParticipantsResponse.status).toBe(400);

    await request(applicationContext.app).post("/api/tandas/1/join").send({
      userId: memberTwoId,
    });

    const startResponse = await request(applicationContext.app).post("/api/tandas/1/start").send({
      userId: organizerId,
    });
    expect(startResponse.status).toBe(200);

    const joinAfterStartResponse = await request(applicationContext.app).post("/api/tandas/1/join").send({
      userId: outsiderId,
    });
    expect(joinAfterStartResponse.status).toBe(409);

    const nonOrganizerCancelResponse = await request(applicationContext.app).post("/api/tandas/1/cancel").send({
      userId: memberOneId,
    });
    expect(nonOrganizerCancelResponse.status).toBe(403);

    const cancelResponse = await request(applicationContext.app).post("/api/tandas/1/cancel").send({
      userId: organizerId,
    });
    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body).toMatchObject({
      id: 1,
      status: "cancelled",
    });
  });

  it("enforces duplicate joins and the configured max participant limit", async () => {
    applicationContext.close();

    const limitedConfig: AppConfig = {
      environment: "test",
      port: 3000,
      databasePath: ":memory:",
      maxParticipants: 3,
      minParticipantsToStart: 3,
      latePenaltyBasisPoints: 500,
      contributionWindowDays: 7,
    };

    applicationContext = createApplication({
      config: limitedConfig,
      now: () => new Date("2026-04-10T10:00:00.000Z"),
      random: () => 0.1,
    });

    const [organizerId, memberOneId, memberTwoId, extraMemberId] = await seedUsers(applicationContext, 4);

    await request(applicationContext.app).post("/api/tandas").send({
      name: "Tanda Limite",
      organizerId,
      contributionAmount: 700,
    });

    const firstJoinResponse = await request(applicationContext.app).post("/api/tandas/1/join").send({
      userId: memberOneId,
    });
    expect(firstJoinResponse.status).toBe(201);

    const duplicateJoinResponse = await request(applicationContext.app).post("/api/tandas/1/join").send({
      userId: memberOneId,
    });
    expect(duplicateJoinResponse.status).toBe(409);

    const secondJoinResponse = await request(applicationContext.app).post("/api/tandas/1/join").send({
      userId: memberTwoId,
    });
    expect(secondJoinResponse.status).toBe(201);

    const limitExceededResponse = await request(applicationContext.app).post("/api/tandas/1/join").send({
      userId: extraMemberId,
    });
    expect(limitExceededResponse.status).toBe(400);
  });
});
