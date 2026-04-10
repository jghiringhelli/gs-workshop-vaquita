import request from "supertest";

import type { ApplicationContext } from "../../app";
import { createApp, createApplicationContext, disposeApplicationContext } from "../../app";
import { loadConfig } from "../../config/env";

interface AuthSession {
  readonly userId: number;
  readonly token: string;
}

describe("tandas feature", () => {
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

  it("creates a tanda and auto-joins the authenticated organizer", async () => {
    const app = createApp(context);
    const organizer = await createUserSession(app, "alice@example.com", "Alice");

    const response = await request(app)
      .post("/api/tandas")
      .set("Authorization", bearer(organizer.token))
      .send({
        name: "Tanda Enero",
        contributionAmount: 1000,
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Tanda Enero",
      organizerId: organizer.userId,
      contributionAmount: 1000,
      status: "forming",
    });

    const participantsResponse = await request(app).get(`/api/tandas/${response.body.id}/participants`);
    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body[0]).toMatchObject({
      userId: organizer.userId,
      role: "organizer",
      isDefaulter: false,
    });
  });

  it("rejects unauthenticated access to protected tanda endpoints", async () => {
    const app = createApp(context);

    const createResponse = await request(app).post("/api/tandas").send({
      name: "Secure Tanda",
      contributionAmount: 1000,
    });
    const listResponse = await request(app).get("/api/tandas");
    const joinResponse = await request(app).post("/api/tandas/1/join").send({});

    expect(createResponse.status).toBe(401);
    expect(listResponse.status).toBe(401);
    expect(joinResponse.status).toBe(401);
  });

  it("lists tandas for the authenticated user", async () => {
    const app = createApp(context);
    const organizer = await createUserSession(app, "alice@example.com", "Alice");

    await request(app)
      .post("/api/tandas")
      .set("Authorization", bearer(organizer.token))
      .send({ name: "Tanda Enero", contributionAmount: 1000 });
    await request(app)
      .post("/api/tandas")
      .set("Authorization", bearer(organizer.token))
      .send({ name: "Tanda Febrero", contributionAmount: 1500 });

    const response = await request(app)
      .get("/api/tandas")
      .set("Authorization", bearer(organizer.token));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it("joins a user to a forming tanda using authenticated identity", async () => {
    const app = createApp(context);
    const organizer = await createUserSession(app, "alice@example.com", "Alice");
    const member = await createUserSession(app, "bob@example.com", "Bob");
    const tandaId = await createTanda(app, organizer, "Tanda Join");

    const response = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .set("Authorization", bearer(member.token))
      .send({});

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      userId: member.userId,
      tandaId,
      role: "member",
    });
  });

  it("starts a tanda only for the organizer", async () => {
    const app = createApp(context);
    const organizer = await createUserSession(app, "alice@example.com", "Alice");
    const outsider = await createUserSession(app, "dan@example.com", "Dan");
    const tandaId = await createFormingTanda(app, organizer);

    const forbiddenResponse = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .set("Authorization", bearer(outsider.token))
      .send({});
    expect(forbiddenResponse.status).toBe(403);

    const response = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .set("Authorization", bearer(organizer.token))
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "active", currentRound: 1, totalRounds: 3 });
  });

  it("returns 400 when trying to start with fewer than 3 participants", async () => {
    const app = createApp(context);
    const organizer = await createUserSession(app, "alice@example.com", "Alice");
    const member = await createUserSession(app, "bob@example.com", "Bob");
    const tandaId = await createTanda(app, organizer, "Too Small");

    await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .set("Authorization", bearer(member.token))
      .send({});

    const response = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .set("Authorization", bearer(organizer.token))
      .send({});

    expect(response.status).toBe(400);
  });

  it("records a current-round contribution for the authenticated participant", async () => {
    const app = createApp(context);
    const { tandaId, memberOne } = await createStartedTanda(app, "Contribution Tanda");

    const response = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set("Authorization", bearer(memberOne.token))
      .send({ amount: 1000 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      tandaId,
      round: 1,
      amount: 1000,
      penaltyAmount: 0,
      status: "paid",
    });

    const summaryResponse = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);
    expect(summaryResponse.body).toMatchObject({
      paidParticipants: 1,
      lateParticipants: 0,
      missedParticipants: 0,
      pendingParticipants: 2,
    });
  });

  it("rejects contribution amounts that do not match the tanda amount", async () => {
    const app = createApp(context);
    const { tandaId, memberOne } = await createStartedTanda(app, "Wrong Amount Tanda");

    const response = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set("Authorization", bearer(memberOne.token))
      .send({ amount: 999 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
  });

  it("marks missing contributions as missed when a round advances", async () => {
    const app = createApp(context);
    const { tandaId, organizer } = await createStartedTanda(app, "Missed Tanda");

    const response = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .set("Authorization", bearer(organizer.token))
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ currentRound: 2, status: "active" });

    const summaryResponse = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);
    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body).toMatchObject({
      paidParticipants: 0,
      lateParticipants: 0,
      missedParticipants: 3,
      pendingParticipants: 0,
    });
  });

  it("settles a missed prior-round contribution as late with penalty", async () => {
    const app = createApp(context);
    const { tandaId, organizer, memberOne } = await createStartedTanda(app, "Late Tanda");

    await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .set("Authorization", bearer(organizer.token))
      .send({});

    const response = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set("Authorization", bearer(memberOne.token))
      .send({ amount: 1000, round: 1 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      round: 1,
      amount: 1000,
      penaltyAmount: 50,
      status: "late",
    });
  });

  it("flags participants as defaulters after two consecutive misses", async () => {
    const app = createApp(context);
    const { tandaId, organizer, memberOne } = await createStartedTanda(app, "Defaulter Tanda");

    await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .set("Authorization", bearer(organizer.token))
      .send({});
    await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .set("Authorization", bearer(organizer.token))
      .send({});

    const participantsResponse = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const participant = participantsResponse.body.find(
      (candidate: { userId: number }) => candidate.userId === memberOne.userId,
    );

    expect(participant).toMatchObject({ isDefaulter: true });
  });

  it("returns contribution history including late and paid statuses", async () => {
    const app = createApp(context);
    const { tandaId, organizer, memberOne } = await createStartedTanda(app, "History Tanda");

    await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .set("Authorization", bearer(organizer.token))
      .send({});
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set("Authorization", bearer(memberOne.token))
      .send({ amount: 1000, round: 1 });
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set("Authorization", bearer(memberOne.token))
      .send({ amount: 1000 });

    const participantsResponse = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const participant = participantsResponse.body.find(
      (candidate: { userId: number }) => candidate.userId === memberOne.userId,
    ) as { id: number };

    const historyResponse = await request(app).get(
      `/api/tandas/${tandaId}/participants/${participant.id}/history`,
    );

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body).toHaveLength(2);
    expect(historyResponse.body[0]).toMatchObject({ round: 1, status: "late" });
    expect(historyResponse.body[1]).toMatchObject({ round: 2, status: "paid" });
  });

  it("cancels a tanda only for the organizer", async () => {
    const app = createApp(context);
    const organizer = await createUserSession(app, "alice@example.com", "Alice");
    const outsider = await createUserSession(app, "bob@example.com", "Bob");
    const tandaId = await createTanda(app, organizer, "Cancel Tanda");

    const forbiddenResponse = await request(app)
      .post(`/api/tandas/${tandaId}/cancel`)
      .set("Authorization", bearer(outsider.token))
      .send({});
    expect(forbiddenResponse.status).toBe(403);

    const response = await request(app)
      .post(`/api/tandas/${tandaId}/cancel`)
      .set("Authorization", bearer(organizer.token))
      .send({});
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "cancelled" });
  });

  it("returns 400 for round summaries before a tanda starts", async () => {
    const app = createApp(context);
    const organizer = await createUserSession(app, "alice@example.com", "Alice");
    const tandaId = await createTanda(app, organizer, "Summary Tanda");

    const response = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);

    expect(response.status).toBe(400);
  });

  it("records audit logs for sensitive actions", async () => {
    const app = createApp(context);
    const { tandaId, organizer, memberOne } = await createStartedTanda(app, "Audit Tanda");

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set("Authorization", bearer(memberOne.token))
      .send({ amount: 1000 });
    await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .set("Authorization", bearer(organizer.token))
      .send({});

    const auditRows = context.database.client.prepare(
      `SELECT action FROM audit_logs WHERE resource_type = 'tanda' AND resource_id = ? ORDER BY id ASC`,
    ).all(tandaId) as ReadonlyArray<{ readonly action: string }>;

    expect(auditRows.map((row) => row.action)).toEqual(expect.arrayContaining([
      "tanda.created",
      "tanda.joined",
      "tanda.started",
      "contribution.recorded",
      "tanda.advanced",
    ]));
  });
});

async function createUserSession(
  app: ReturnType<typeof createApp>,
  email: string,
  name: string,
): Promise<AuthSession> {
  const userResponse = await request(app).post("/api/users").send({ email, name });
  const tokenResponse = await request(app).post("/api/auth/token").send({ email });

  return {
    userId: userResponse.body.id as number,
    token: tokenResponse.body.accessToken as string,
  };
}

async function createTanda(
  app: ReturnType<typeof createApp>,
  organizer: AuthSession,
  name: string,
): Promise<number> {
  const response = await request(app)
    .post("/api/tandas")
    .set("Authorization", bearer(organizer.token))
    .send({ name, contributionAmount: 1000 });

  return response.body.id as number;
}

async function createFormingTanda(
  app: ReturnType<typeof createApp>,
  organizer: AuthSession,
): Promise<number> {
  const tandaId = await createTanda(app, organizer, "Forming Tanda");
  const memberOne = await createUserSession(app, `${organizer.userId}-bob@example.com`, "Bob");
  const memberTwo = await createUserSession(app, `${organizer.userId}-carol@example.com`, "Carol");

  await request(app)
    .post(`/api/tandas/${tandaId}/join`)
    .set("Authorization", bearer(memberOne.token))
    .send({});
  await request(app)
    .post(`/api/tandas/${tandaId}/join`)
    .set("Authorization", bearer(memberTwo.token))
    .send({});

  return tandaId;
}

async function createStartedTanda(
  app: ReturnType<typeof createApp>,
  name: string,
): Promise<{
  readonly tandaId: number;
  readonly organizer: AuthSession;
  readonly memberOne: AuthSession;
  readonly memberTwo: AuthSession;
}> {
  const emailPrefix = toEmailPrefix(name);
  const organizer = await createUserSession(app, `${emailPrefix}-organizer@example.com`, "Organizer");
  const memberOne = await createUserSession(app, `${emailPrefix}-member1@example.com`, "Member One");
  const memberTwo = await createUserSession(app, `${emailPrefix}-member2@example.com`, "Member Two");
  const tandaId = await createTanda(app, organizer, name);

  await request(app)
    .post(`/api/tandas/${tandaId}/join`)
    .set("Authorization", bearer(memberOne.token))
    .send({});
  await request(app)
    .post(`/api/tandas/${tandaId}/join`)
    .set("Authorization", bearer(memberTwo.token))
    .send({});
  await request(app)
    .post(`/api/tandas/${tandaId}/start`)
    .set("Authorization", bearer(organizer.token))
    .send({});

  return { tandaId, organizer, memberOne, memberTwo };
}

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function toEmailPrefix(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}