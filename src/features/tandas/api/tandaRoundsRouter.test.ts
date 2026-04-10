import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApplication, type ApplicationContext } from "../../../app";

async function createUser(applicationContext: ApplicationContext, email: string, name: string): Promise<number> {
  const response = await request(applicationContext.app).post("/api/users").send({ email, name });
  return response.body.id as number;
}

async function setupActiveTanda(applicationContext: ApplicationContext): Promise<{
  organizerId: number;
  memberOneId: number;
  memberTwoId: number;
  participants: Array<{ id: number; userId: number; role: string; isDefaulter: boolean }>;
}> {
  const organizerId = await createUser(applicationContext, "organizer@example.com", "Organizer");
  const memberOneId = await createUser(applicationContext, "member1@example.com", "Member One");
  const memberTwoId = await createUser(applicationContext, "member2@example.com", "Member Two");

  await request(applicationContext.app).post("/api/tandas").send({
    name: "Tanda Activa",
    organizerId,
    contributionAmount: 1000,
  });

  await request(applicationContext.app).post("/api/tandas/1/join").send({ userId: memberOneId });
  await request(applicationContext.app).post("/api/tandas/1/join").send({ userId: memberTwoId });
  await request(applicationContext.app).post("/api/tandas/1/start").send({ userId: organizerId });

  const participantsResponse = await request(applicationContext.app).get("/api/tandas/1/participants");
  return {
    organizerId,
    memberOneId,
    memberTwoId,
    participants: participantsResponse.body as Array<{ id: number; userId: number; role: string; isDefaulter: boolean }>,
  };
}

describe("tanda rounds API", () => {
  let applicationContext: ApplicationContext;
  let currentTime: Date;

  beforeEach((): void => {
    currentTime = new Date("2026-04-10T10:00:00.000Z");
    applicationContext = createApplication({
      databasePath: ":memory:",
      now: () => currentTime,
      random: () => 0.3,
    });
  });

  afterEach((): void => {
    applicationContext.close();
  });

  it("records contributions, reports round summaries, and returns participant history", async () => {
    const { participants } = await setupActiveTanda(applicationContext);
    const organizerParticipant = participants.find((participant) => participant.role === "organizer");
    const memberParticipant = participants.find((participant) => participant.role === "member");

    const paidContributionResponse = await request(applicationContext.app).post("/api/tandas/1/contributions").send({
      participantId: organizerParticipant?.id,
      amount: 1000,
    });
    expect(paidContributionResponse.status).toBe(201);
    expect(paidContributionResponse.body).toMatchObject({
      round: 1,
      amount: 1000,
      status: "paid",
      penaltyAmount: 0,
    });

    currentTime = new Date("2026-04-18T10:00:01.000Z");
    const lateContributionResponse = await request(applicationContext.app).post("/api/tandas/1/contributions").send({
      participantId: memberParticipant?.id,
      amount: 1000,
    });
    expect(lateContributionResponse.status).toBe(201);
    expect(lateContributionResponse.body).toMatchObject({
      round: 1,
      amount: 1000,
      status: "late",
      penaltyAmount: 50,
    });

    const duplicateContributionResponse = await request(applicationContext.app).post("/api/tandas/1/contributions").send({
      participantId: organizerParticipant?.id,
      amount: 1000,
    });
    expect(duplicateContributionResponse.status).toBe(409);

    const roundSummaryResponse = await request(applicationContext.app).get("/api/tandas/1/rounds/1");
    expect(roundSummaryResponse.status).toBe(200);
    expect(roundSummaryResponse.body).toMatchObject({
      tandaId: 1,
      round: 1,
      totalCollected: 2000,
      expectedTotal: 3000,
    });
    expect(roundSummaryResponse.body.contributions).toHaveLength(3);
    expect(
      (roundSummaryResponse.body.contributions as Array<{ status: string }>).some(
        (contribution) => contribution.status === "pending",
      ),
    ).toBe(true);

    const historyResponse = await request(applicationContext.app).get(
      `/api/tandas/1/participants/${memberParticipant?.id}/history`,
    );
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.history).toHaveLength(1);
    expect(historyResponse.body.history[0]).toMatchObject({
      status: "late",
      penaltyAmount: 50,
    });
  });

  it("rejects invalid contribution, round, and history requests", async () => {
    const organizerId = await createUser(applicationContext, "organizer@example.com", "Organizer");

    await request(applicationContext.app).post("/api/tandas").send({
      name: "Tanda Formando",
      organizerId,
      contributionAmount: 1000,
    });

    const inactiveContributionResponse = await request(applicationContext.app).post("/api/tandas/1/contributions").send({
      participantId: 1,
      amount: 1000,
    });
    expect(inactiveContributionResponse.status).toBe(422);

    const missingRoundResponse = await request(applicationContext.app).get("/api/tandas/1/rounds/99");
    expect(missingRoundResponse.status).toBe(404);

    const missingHistoryResponse = await request(applicationContext.app).get("/api/tandas/1/participants/999/history");
    expect(missingHistoryResponse.status).toBe(404);
  });

  it("marks missed contributions, flags defaulters, and auto-completes a tanda", async () => {
    const { organizerId, memberOneId } = await setupActiveTanda(applicationContext);

    const nonOrganizerAdvanceResponse = await request(applicationContext.app).post("/api/tandas/1/advance").send({
      userId: memberOneId,
    });
    expect(nonOrganizerAdvanceResponse.status).toBe(403);

    const firstAdvanceResponse = await request(applicationContext.app).post("/api/tandas/1/advance").send({
      userId: organizerId,
    });
    expect(firstAdvanceResponse.status).toBe(200);
    expect(firstAdvanceResponse.body).toMatchObject({
      id: 1,
      status: "active",
      currentRound: 2,
    });

    const secondAdvanceResponse = await request(applicationContext.app).post("/api/tandas/1/advance").send({
      userId: organizerId,
    });
    expect(secondAdvanceResponse.status).toBe(200);
    expect(secondAdvanceResponse.body).toMatchObject({
      id: 1,
      status: "active",
      currentRound: 3,
    });
    expect(
      (secondAdvanceResponse.body.participants as Array<{ isDefaulter: boolean }>).some(
        (participant) => participant.isDefaulter,
      ),
    ).toBe(true);

    const thirdAdvanceResponse = await request(applicationContext.app).post("/api/tandas/1/advance").send({
      userId: organizerId,
    });
    expect(thirdAdvanceResponse.status).toBe(200);
    expect(thirdAdvanceResponse.body).toMatchObject({
      id: 1,
      status: "completed",
      currentRound: 3,
    });

    const exhaustedAdvanceResponse = await request(applicationContext.app).post("/api/tandas/1/advance").send({
      userId: organizerId,
    });
    expect(exhaustedAdvanceResponse.status).toBe(409);

    const roundTwoSummaryResponse = await request(applicationContext.app).get("/api/tandas/1/rounds/2");
    expect(roundTwoSummaryResponse.status).toBe(200);
    expect(
      (roundTwoSummaryResponse.body.contributions as Array<{ status: string }>).every(
        (contribution) => contribution.status === "missed",
      ),
    ).toBe(true);
  });

  it("rejects the wrong contribution amount", async () => {
    const { participants } = await setupActiveTanda(applicationContext);

    const contributionResponse = await request(applicationContext.app).post("/api/tandas/1/contributions").send({
      participantId: participants[0]?.id,
      amount: 999,
    });

    expect(contributionResponse.status).toBe(400);
  });
});
