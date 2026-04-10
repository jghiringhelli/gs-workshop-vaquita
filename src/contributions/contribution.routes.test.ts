import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "../app.js";
import type { Express } from "express";

let app: Express;
let db: Database.Database;

async function createUser(email: string, name: string): Promise<string> {
  const res = await request(app).post("/api/users").send({ email, name });
  return res.body.data.id as string;
}

async function setupActiveTanda(): Promise<{
  tandaId: string;
  orgId: string;
  participants: Array<{ userId: string; participantId: string }>;
}> {
  const org = await createUser("org@x.com", "Org");
  const m1 = await createUser("m1@x.com", "M1");
  const m2 = await createUser("m2@x.com", "M2");

  const tandaRes = await request(app).post("/api/tandas").send({
    name: "Active Tanda",
    organizerId: org,
    contributionAmount: 1000,
  });
  const tandaId = tandaRes.body.data.id as string;

  const join1 = await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m1 });
  const join2 = await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m2 });

  await request(app).post(`/api/tandas/${tandaId}/start`).send({ organizerId: org });

  const participantsRes = await request(app).get(`/api/tandas/${tandaId}/participants`);
  const participants = (participantsRes.body.data as Array<{ id: string; userId: string }>).map(
    (p) => ({ userId: p.userId, participantId: p.id })
  );

  return { tandaId, orgId: org, participants };
}

beforeEach(() => {
  db = new Database(":memory:");
  app = createApp(db);
});

afterEach(() => {
  db.close();
});

describe("POST /api/tandas/:id/contributions", () => {
  it("records a contribution successfully", async () => {
    const { tandaId, participants } = await setupActiveTanda();
    const pid = participants[0]!.participantId;

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("paid");
    expect(res.body.data.round).toBe(1);
  });

  it("returns 422 for inactive tanda", async () => {
    const org = await createUser("org@x.com", "Org");
    const tandaRes = await request(app).post("/api/tandas").send({
      name: "Forming Tanda",
      organizerId: org,
      contributionAmount: 500,
    });
    const tandaId = tandaRes.body.data.id as string;
    const participantsRes = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const pid = participantsRes.body.data[0].id as string;

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 500 });

    expect(res.status).toBe(422);
  });

  it("returns 409 for duplicate contribution in same round", async () => {
    const { tandaId, participants } = await setupActiveTanda();
    const pid = participants[0]!.participantId;

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 1000 });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 1000 });

    expect(res.status).toBe(409);
  });

  it("returns 400 for wrong amount", async () => {
    const { tandaId, participants } = await setupActiveTanda();
    const pid = participants[0]!.participantId;

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 500 });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/tandas/:id/rounds/:round", () => {
  it("returns round summary", async () => {
    const { tandaId, participants } = await setupActiveTanda();
    const pid = participants[0]!.participantId;

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: pid, amount: 1000 });

    const res = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body.data.round).toBe(1);
    expect(res.body.data.contributions).toHaveLength(1);
    expect(res.body.data.totalPaid).toBe(1000);
    expect(res.body.data.totalExpected).toBe(3000);
  });

  it("returns 400 for invalid round number", async () => {
    const org = await createUser("org@x.com", "Org");
    const tandaRes = await request(app).post("/api/tandas").send({
      name: "T",
      organizerId: org,
      contributionAmount: 100,
    });
    const res = await request(app).get(`/api/tandas/${tandaRes.body.data.id}/rounds/0`);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/tandas/:id/participants/:pid/history", () => {
  it("returns contribution history for a participant", async () => {
    const { tandaId, participants } = await setupActiveTanda();
    const { participantId } = participants[0]!;

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId, amount: 1000 });

    const res = await request(app).get(
      `/api/tandas/${tandaId}/participants/${participantId}/history`
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("paid");
  });

  it("returns 404 for unknown participant", async () => {
    const org = await createUser("org@x.com", "Org");
    const tandaRes = await request(app).post("/api/tandas").send({
      name: "T",
      organizerId: org,
      contributionAmount: 100,
    });
    const res = await request(app).get(
      `/api/tandas/${tandaRes.body.data.id}/participants/00000000-0000-0000-0000-000000000000/history`
    );
    expect(res.status).toBe(404);
  });
});
