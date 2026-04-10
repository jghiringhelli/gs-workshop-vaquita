import request from "supertest";

import type { ApplicationContext } from "../app";
import { createApp, createApplicationContext, disposeApplicationContext } from "../app";
import { loadConfig } from "../config/env";

describe("tanda lifecycle integration", () => {
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

  it("supports a full tanda lifecycle across users, joins, rounds, contributions, and completion", async () => {
    const app = createApp(context);

    const organizerId = await createUser(app, "organizer@example.com", "Organizer");
    const memberOneId = await createUser(app, "member1@example.com", "Member One");
    const memberTwoId = await createUser(app, "member2@example.com", "Member Two");

    const createTandaResponse = await request(app).post("/api/tandas").send({
      name: "Integration Tanda",
      organizerId,
      contributionAmount: 1000,
    });
    const tandaId = createTandaResponse.body.id as number;

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberOneId });
    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberTwoId });

    const startResponse = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ organizerId });

    expect(startResponse.status).toBe(200);
    expect(startResponse.body).toMatchObject({
      id: tandaId,
      status: "active",
      currentRound: 1,
      totalRounds: 3,
    });

    const participantsResponse = await request(app).get(`/api/tandas/${tandaId}/participants`);
    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body).toHaveLength(3);

    const memberParticipant = participantsResponse.body.find(
      (participant: { role: string }) => participant.role === "member",
    ) as { id: number };

    const contributionResponse = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: memberParticipant.id, amount: 1000 });

    expect(contributionResponse.status).toBe(201);
    expect(contributionResponse.body).toMatchObject({
      tandaId,
      participantId: memberParticipant.id,
      round: 1,
      status: "paid",
    });

    const roundOneSummaryResponse = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);
    expect(roundOneSummaryResponse.status).toBe(200);
    expect(roundOneSummaryResponse.body).toMatchObject({
      tandaId,
      round: 1,
      paidParticipants: 1,
      pendingParticipants: 2,
      totalCollected: 1000,
    });

    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId });
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: memberParticipant.id, amount: 1000 });

    const historyResponse = await request(app).get(
      `/api/tandas/${tandaId}/participants/${memberParticipant.id}/history`,
    );

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body).toHaveLength(2);
    expect(historyResponse.body[0]).toMatchObject({ round: 1, status: "paid" });
    expect(historyResponse.body[1]).toMatchObject({ round: 2, status: "paid" });

    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId });
    const completionResponse = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ organizerId });

    expect(completionResponse.status).toBe(200);
    expect(completionResponse.body).toMatchObject({
      id: tandaId,
      status: "completed",
      currentRound: 3,
      totalRounds: 3,
    });
  });

  it("blocks lifecycle actions after a tanda is cancelled", async () => {
    const app = createApp(context);

    const organizerId = await createUser(app, "cancel-organizer@example.com", "Organizer");
    const memberId = await createUser(app, "cancel-member@example.com", "Member");

    const createTandaResponse = await request(app).post("/api/tandas").send({
      name: "Cancelled Tanda",
      organizerId,
      contributionAmount: 1000,
    });
    const tandaId = createTandaResponse.body.id as number;

    const participantsResponse = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const organizerParticipantId = (participantsResponse.body[0] as { id: number }).id;

    const cancelResponse = await request(app)
      .post(`/api/tandas/${tandaId}/cancel`)
      .send({ organizerId });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body).toMatchObject({ id: tandaId, status: "cancelled" });

    const joinResponse = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: memberId });
    expect(joinResponse.status).toBe(409);

    const startResponse = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ organizerId });
    expect(startResponse.status).toBe(409);

    const advanceResponse = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ organizerId });
    expect(advanceResponse.status).toBe(409);

    const contributionResponse = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: organizerParticipantId, amount: 1000 });
    expect(contributionResponse.status).toBe(409);
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