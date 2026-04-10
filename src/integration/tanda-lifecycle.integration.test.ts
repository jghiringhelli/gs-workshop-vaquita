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
        JWT_SECRET: "test-secret",
      }),
    );
  });

  afterEach(() => {
    disposeApplicationContext(context);
  });

  it("supports a full authenticated lifecycle including late settlement", async () => {
    const app = createApp(context);
    const organizer = await createUserSession(app, "organizer@example.com", "Organizer");
    const memberOne = await createUserSession(app, "member1@example.com", "Member One");
    const memberTwo = await createUserSession(app, "member2@example.com", "Member Two");

    const createResponse = await request(app)
      .post("/api/tandas")
      .set("Authorization", bearer(organizer.token))
      .send({ name: "Integration Tanda", contributionAmount: 1000 });
    const tandaId = createResponse.body.id as number;

    await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .set("Authorization", bearer(memberOne.token))
      .send({});
    await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .set("Authorization", bearer(memberTwo.token))
      .send({});

    const startResponse = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .set("Authorization", bearer(organizer.token))
      .send({});
    expect(startResponse.status).toBe(200);

    const roundOnePaid = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set("Authorization", bearer(memberOne.token))
      .send({ amount: 1000 });
    expect(roundOnePaid.status).toBe(201);

    const advanceRoundOne = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .set("Authorization", bearer(organizer.token))
      .send({});
    expect(advanceRoundOne.body.currentRound).toBe(2);

    const settleLateRoundOne = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set("Authorization", bearer(memberTwo.token))
      .send({ amount: 1000, round: 1 });
    expect(settleLateRoundOne.body.status).toBe("late");

    const roundTwoPaid = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set("Authorization", bearer(memberTwo.token))
      .send({ amount: 1000 });
    expect(roundTwoPaid.status).toBe(201);

    await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .set("Authorization", bearer(organizer.token))
      .send({});
    const completeResponse = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .set("Authorization", bearer(organizer.token))
      .send({});

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body).toMatchObject({ status: "completed", currentRound: 3 });

    const finalSummary = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);
    expect(finalSummary.body).toMatchObject({ lateParticipants: 1, missedParticipants: 1 });
  });

  it("blocks protected actions with missing or invalid authentication", async () => {
    const app = createApp(context);
    const organizer = await createUserSession(app, "cancel-organizer@example.com", "Organizer");

    const createResponse = await request(app)
      .post("/api/tandas")
      .set("Authorization", bearer(organizer.token))
      .send({ name: "Secure Tanda", contributionAmount: 1000 });
    const tandaId = createResponse.body.id as number;

    const unauthenticatedJoin = await request(app).post(`/api/tandas/${tandaId}/join`).send({});
    const invalidTokenAdvance = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .set("Authorization", "Bearer not-a-real-token")
      .send({});

    expect(unauthenticatedJoin.status).toBe(401);
    expect(invalidTokenAdvance.status).toBe(401);
  });
});

async function createUserSession(
  app: ReturnType<typeof createApp>,
  email: string,
  name: string,
): Promise<{ readonly token: string }> {
  await request(app).post("/api/users").send({ email, name });
  const tokenResponse = await request(app).post("/api/auth/token").send({ email });

  return { token: tokenResponse.body.accessToken as string };
}

function bearer(token: string): string {
  return `Bearer ${token}`;
}