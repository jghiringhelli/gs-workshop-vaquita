import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "../app.js";
import type { Express } from "express";

let app: Express;
let db: Database.Database;

/** Helper: create a user and return their id */
async function createUser(email: string, name: string): Promise<string> {
  const res = await request(app).post("/api/users").send({ email, name });
  return res.body.data.id as string;
}

/** Helper: create a tanda and return its id */
async function createTanda(organizerId: string): Promise<string> {
  const res = await request(app).post("/api/tandas").send({
    name: "Test Tanda",
    organizerId,
    contributionAmount: 1000,
  });
  return res.body.data.id as string;
}

beforeEach(() => {
  db = new Database(":memory:");
  app = createApp(db);
});

afterEach(() => {
  db.close();
});

describe("POST /api/tandas", () => {
  it("creates a tanda with organizer auto-joined", async () => {
    const userId = await createUser("org@x.com", "Organizer");
    const res = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: userId,
      contributionAmount: 1000,
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: "Tanda Enero",
      organizerId: userId,
      status: "forming",
      contributionAmount: 1000,
    });
  });

  it("returns 404 when organizer does not exist", async () => {
    const res = await request(app).post("/api/tandas").send({
      name: "Tanda",
      organizerId: "00000000-0000-0000-0000-000000000000",
      contributionAmount: 500,
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app).post("/api/tandas").send({ name: "X" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/tandas", () => {
  it("returns tandas for a user", async () => {
    const userId = await createUser("org@x.com", "Org");
    await createTanda(userId);

    const res = await request(app).get(`/api/tandas?userId=${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("returns 400 without userId", async () => {
    const res = await request(app).get("/api/tandas");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/tandas/:id", () => {
  it("returns tanda by ID", async () => {
    const userId = await createUser("org@x.com", "Org");
    const tandaId = await createTanda(userId);

    const res = await request(app).get(`/api/tandas/${tandaId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(tandaId);
  });

  it("returns 404 for unknown tanda", async () => {
    const res = await request(app).get("/api/tandas/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/tandas/:id/join", () => {
  it("joins a member to a forming tanda", async () => {
    const org = await createUser("org@x.com", "Org");
    const member = await createUser("member@x.com", "Member");
    const tandaId = await createTanda(org);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: member });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("member");
  });

  it("returns 409 when user is already a participant", async () => {
    const org = await createUser("org@x.com", "Org");
    const tandaId = await createTanda(org);

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: org });
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: org });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/tandas/:id/start", () => {
  it("starts a tanda with 3 participants", async () => {
    const org = await createUser("org@x.com", "Org");
    const m1 = await createUser("m1@x.com", "M1");
    const m2 = await createUser("m2@x.com", "M2");
    const tandaId = await createTanda(org);

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m1 });
    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m2 });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ organizerId: org });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("active");
    expect(res.body.data.totalRounds).toBe(3);
  });

  it("returns 422 with fewer than 3 participants", async () => {
    const org = await createUser("org@x.com", "Org");
    const m1 = await createUser("m1@x.com", "M1");
    const tandaId = await createTanda(org);

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m1 });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ organizerId: org });

    expect(res.status).toBe(422);
  });

  it("returns 403 when non-organizer tries to start", async () => {
    const org = await createUser("org@x.com", "Org");
    const m1 = await createUser("m1@x.com", "M1");
    const m2 = await createUser("m2@x.com", "M2");
    const tandaId = await createTanda(org);

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m1 });
    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m2 });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ organizerId: m1 });

    expect(res.status).toBe(403);
  });
});

describe("POST /api/tandas/:id/cancel", () => {
  it("cancels a forming tanda", async () => {
    const org = await createUser("org@x.com", "Org");
    const tandaId = await createTanda(org);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/cancel`)
      .send({ organizerId: org });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");
  });

  it("returns 403 when non-organizer cancels", async () => {
    const org = await createUser("org@x.com", "Org");
    const m = await createUser("m@x.com", "M");
    const tandaId = await createTanda(org);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/cancel`)
      .send({ organizerId: m });

    expect(res.status).toBe(403);
  });
});

describe("POST /api/tandas/:id/advance", () => {
  it("advances round and auto-completes after last round", async () => {
    const org = await createUser("org@x.com", "Org");
    const m1 = await createUser("m1@x.com", "M1");
    const m2 = await createUser("m2@x.com", "M2");
    const tandaId = await createTanda(org);

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m1 });
    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m2 });
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ organizerId: org });

    // Advance rounds until completed (3 rounds total)
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId: org });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ organizerId: org });
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ organizerId: org });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("completed");
  });
});

describe("GET /api/tandas/:id/participants", () => {
  it("returns participants for a tanda", async () => {
    const org = await createUser("org@x.com", "Org");
    const tandaId = await createTanda(org);

    const res = await request(app).get(`/api/tandas/${tandaId}/participants`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].role).toBe("organizer");
  });
});
