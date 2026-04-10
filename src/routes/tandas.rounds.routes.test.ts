import type { Express } from "express";
import request from "supertest";

import { createAuthenticatedUser } from "../test/create-authenticated-user";
import { createTestApp } from "../test/create-test-app";

describe("tandas round endpoints", () => {
  it("records a current-round contribution for an authenticated participant", async () => {
    const { app, db } = createTestApp();

    try {
      const { memberOne } = await createStartedTanda(app);

      const response = await request(app)
        .post("/api/tandas/1/contributions")
        .set("Authorization", `Bearer ${memberOne.token}`);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        tandaId: 1,
        participantId: expect.any(Number),
        round: 1,
        status: "paid",
        penaltyAmount: 0,
        totalAmount: 1000,
      });
    } finally {
      db.close();
    }
  });

  it("applies the late penalty when the contribution window has passed", async () => {
    const { app, db } = createTestApp();

    try {
      const { memberOne } = await createStartedTanda(app);

      db.prepare("UPDATE tandas SET current_round_started_at = ? WHERE id = 1").run(
        new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      );

      const response = await request(app)
        .post("/api/tandas/1/contributions")
        .set("Authorization", `Bearer ${memberOne.token}`);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("late");
      expect(response.body.penaltyAmount).toBe(50);
      expect(response.body.totalAmount).toBe(1050);
    } finally {
      db.close();
    }
  });

  it("rejects duplicate contributions for the same round", async () => {
    const { app, db } = createTestApp();

    try {
      const { memberOne } = await createStartedTanda(app);

      await request(app)
        .post("/api/tandas/1/contributions")
        .set("Authorization", `Bearer ${memberOne.token}`);

      const response = await request(app)
        .post("/api/tandas/1/contributions")
        .set("Authorization", `Bearer ${memberOne.token}`);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    } finally {
      db.close();
    }
  });

  it("returns a round summary with collected totals and pending count", async () => {
    const { app, db } = createTestApp();

    try {
      const { organizer, memberOne } = await createStartedTanda(app);

      await request(app)
        .post("/api/tandas/1/contributions")
        .set("Authorization", `Bearer ${memberOne.token}`);

      const response = await request(app)
        .get("/api/tandas/1/rounds/1")
        .set("Authorization", `Bearer ${organizer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.round).toBe(1);
      expect(response.body.contributions).toHaveLength(3);
      expect(response.body.recipient.rotationPosition).toBe(1);
      expect(response.body.totalCollected).toBe(1000);
      expect(response.body.expectedTotal).toBe(3000);
      expect(response.body.pendingCount).toBe(2);
    } finally {
      db.close();
    }
  });

  it("returns 404 for an unknown round summary", async () => {
    const { app, db } = createTestApp();

    try {
      const { organizer } = await createStartedTanda(app);

      const response = await request(app)
        .get("/api/tandas/1/rounds/99")
        .set("Authorization", `Bearer ${organizer.token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    } finally {
      db.close();
    }
  });

  it("advances to the next round and marks unpaid contributions as missed", async () => {
    const { app, db } = createTestApp();

    try {
      const { organizer, memberOne } = await createStartedTanda(app);

      await request(app)
        .post("/api/tandas/1/contributions")
        .set("Authorization", `Bearer ${memberOne.token}`);

      const advanceResponse = await request(app)
        .post("/api/tandas/1/advance")
        .set("Authorization", `Bearer ${organizer.token}`);

      const roundSummaryResponse = await request(app)
        .get("/api/tandas/1/rounds/1")
        .set("Authorization", `Bearer ${organizer.token}`);

      expect(advanceResponse.status).toBe(200);
      expect(advanceResponse.body.status).toBe("active");
      expect(advanceResponse.body.currentRound).toBe(2);
      expect(roundSummaryResponse.status).toBe(200);
      expect(roundSummaryResponse.body.pendingCount).toBe(0);
      expect(
        roundSummaryResponse.body.contributions.filter(
          (contribution: { status: string }) => contribution.status === "missed",
        ),
      ).toHaveLength(2);
      expect(
        roundSummaryResponse.body.contributions.filter(
          (contribution: { status: string }) => contribution.status === "paid",
        ),
      ).toHaveLength(1);
    } finally {
      db.close();
    }
  });

  it("allows only the organizer to advance rounds", async () => {
    const { app, db } = createTestApp();

    try {
      const { memberOne } = await createStartedTanda(app);

      const response = await request(app)
        .post("/api/tandas/1/advance")
        .set("Authorization", `Bearer ${memberOne.token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    } finally {
      db.close();
    }
  });

  it("returns participant contribution history inside the tanda", async () => {
    const { app, db } = createTestApp();

    try {
      const { organizer, memberOne } = await createStartedTanda(app);

      await request(app)
        .post("/api/tandas/1/contributions")
        .set("Authorization", `Bearer ${memberOne.token}`);
      await request(app)
        .post("/api/tandas/1/advance")
        .set("Authorization", `Bearer ${organizer.token}`);

      const participantsResponse = await request(app)
        .get("/api/tandas/1/participants")
        .set("Authorization", `Bearer ${organizer.token}`);

      const participant = participantsResponse.body.find(
        (entry: { userId: number }) => entry.userId === memberOne.user.id,
      ) as { id: number };

      const historyResponse = await request(app)
        .get(`/api/tandas/1/participants/${participant.id}/history`)
        .set("Authorization", `Bearer ${organizer.token}`);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body).toHaveLength(2);
      expect(historyResponse.body[0].status).toBe("paid");
      expect(historyResponse.body[1].status).toBe("pending");
    } finally {
      db.close();
    }
  });

  it("returns 404 when the participant history target is not in the tanda", async () => {
    const { app, db } = createTestApp();

    try {
      const { organizer } = await createStartedTanda(app);

      const response = await request(app)
        .get("/api/tandas/1/participants/999/history")
        .set("Authorization", `Bearer ${organizer.token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    } finally {
      db.close();
    }
  });

  it("auto-completes the tanda after the last round is advanced", async () => {
    const { app, db } = createTestApp();

    try {
      const { organizer } = await createStartedTanda(app);

      await request(app)
        .post("/api/tandas/1/advance")
        .set("Authorization", `Bearer ${organizer.token}`);
      await request(app)
        .post("/api/tandas/1/advance")
        .set("Authorization", `Bearer ${organizer.token}`);

      const response = await request(app)
        .post("/api/tandas/1/advance")
        .set("Authorization", `Bearer ${organizer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("completed");
      expect(response.body.currentRound).toBe(3);
    } finally {
      db.close();
    }
  });
});

async function createStartedTanda(app: Express): Promise<{
  organizer: Awaited<ReturnType<typeof createAuthenticatedUser>>;
  memberOne: Awaited<ReturnType<typeof createAuthenticatedUser>>;
  memberTwo: Awaited<ReturnType<typeof createAuthenticatedUser>>;
}> {
  const organizer = await createAuthenticatedUser(app, {
    email: "organizer@example.com",
    name: "Organizer",
  });
  const memberOne = await createAuthenticatedUser(app, {
    email: "member1@example.com",
    name: "Member One",
  });
  const memberTwo = await createAuthenticatedUser(app, {
    email: "member2@example.com",
    name: "Member Two",
  });

  await request(app)
    .post("/api/tandas")
    .set("Authorization", `Bearer ${organizer.token}`)
    .send({
      name: "Tanda Uno",
      contributionAmount: 1000,
    });

  await request(app)
    .post("/api/tandas/1/join")
    .set("Authorization", `Bearer ${memberOne.token}`);
  await request(app)
    .post("/api/tandas/1/join")
    .set("Authorization", `Bearer ${memberTwo.token}`);
  await request(app)
    .post("/api/tandas/1/start")
    .set("Authorization", `Bearer ${organizer.token}`);

  return {
    organizer,
    memberOne,
    memberTwo,
  };
}
