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
});

async function createUser(
  app: ReturnType<typeof createApp>,
  email: string,
  name: string,
): Promise<number> {
  const response = await request(app).post("/api/users").send({ email, name });
  return response.body.id as number;
}