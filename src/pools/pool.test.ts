import supertest from "supertest";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { app } from "../app";
import { prisma } from "../db/client";

const request = supertest(app);

// ── Test helpers ─────────────────────────────────────────────────────────

let userCounter = 0;

async function createUserWithToken(): Promise<{ userId: string; token: string }> {
  const n = ++userCounter;
  await request.post("/api/users/register").send({
    email: `pool_user${n}@test.com`,
    username: `pool_user${n}`,
    password: "password123",
  });
  const res = await request.post("/api/users/login").send({
    email: `pool_user${n}@test.com`,
    password: "password123",
  });
  return { userId: res.body.user.id, token: res.body.token };
}

async function createPool(
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; [key: string]: unknown }> {
  const res = await request
    .post("/api/pools")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Test Pool", targetAmount: 10000, ...overrides });
  return res.body.pool;
}

// ── Cleanup ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.poolContribution.deleteMany();
  await prisma.poolMember.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.user.deleteMany();
  userCounter = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ── POST /api/pools ────────────────────────────────────────────────────────

describe("POST /api/pools", () => {
  it("creates a pool and auto-adds organizer as member (201)", async () => {
    const { token, userId } = await createUserWithToken();
    const res = await request
      .post("/api/pools")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Fondo Enero", purpose: "Vacaciones", targetAmount: 50000, currency: "MXN" });

    expect(res.status).toBe(201);
    expect(res.body.pool).toMatchObject({
      name: "Fondo Enero",
      purpose: "Vacaciones",
      targetAmount: 50000,
      currency: "MXN",
      status: "OPEN",
      organizerId: userId,
    });

    // Organizer must be auto-enrolled as member
    const detail = await request
      .get(`/api/pools/${res.body.pool.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(detail.body.pool.members).toHaveLength(1);
    expect(detail.body.pool.members[0].userId).toBe(userId);
  });

  it("returns 401 without a token", async () => {
    const res = await request
      .post("/api/pools")
      .send({ name: "No Auth", targetAmount: 1000 });
    expect(res.status).toBe(401);
  });

  it("returns 400 when targetAmount is missing", async () => {
    const { token } = await createUserWithToken();
    const res = await request
      .post("/api/pools")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Missing target" });
    expect(res.status).toBe(400);
  });
});

// ── GET /api/pools/:id ─────────────────────────────────────────────────────

describe("GET /api/pools/:id", () => {
  it("returns pool detail with members and totalContributions (200)", async () => {
    const { token } = await createUserWithToken();
    const pool = await createPool(token);

    const res = await request
      .get(`/api/pools/${pool.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.pool.id).toBe(pool.id);
    expect(res.body.pool.members).toBeDefined();
    expect(res.body.pool.totalContributions).toBe(0);
  });

  it("returns 401 without token", async () => {
    const { token } = await createUserWithToken();
    const pool = await createPool(token);
    const res = await request.get(`/api/pools/${pool.id}`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for a non-existent pool", async () => {
    const { token } = await createUserWithToken();
    const res = await request
      .get("/api/pools/nonexistent-id")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ── POST /api/pools/:id/invite ─────────────────────────────────────────────

describe("POST /api/pools/:id/invite", () => {
  it("organizer can invite another user (200)", async () => {
    const organizer = await createUserWithToken();
    const newMember = await createUserWithToken();
    const pool = await createPool(organizer.token);

    const res = await request
      .post(`/api/pools/${pool.id}/invite`)
      .set("Authorization", `Bearer ${organizer.token}`)
      .send({ userId: newMember.userId });

    expect(res.status).toBe(200);

    // Confirm pool now has 2 members
    const detail = await request
      .get(`/api/pools/${pool.id}`)
      .set("Authorization", `Bearer ${organizer.token}`);
    expect(detail.body.pool.members).toHaveLength(2);
  });

  it("returns 403 when a non-organizer tries to invite", async () => {
    const organizer = await createUserWithToken();
    const member = await createUserWithToken();
    const outsider = await createUserWithToken();
    const pool = await createPool(organizer.token);

    // Add member first so they have a valid token but aren't the organizer
    await request
      .post(`/api/pools/${pool.id}/invite`)
      .set("Authorization", `Bearer ${organizer.token}`)
      .send({ userId: member.userId });

    const res = await request
      .post(`/api/pools/${pool.id}/invite`)
      .set("Authorization", `Bearer ${member.token}`)   // not the organizer
      .send({ userId: outsider.userId });

    expect(res.status).toBe(403);
  });

  it("returns 409 when user is already a member", async () => {
    const organizer = await createUserWithToken();
    const newMember = await createUserWithToken();
    const pool = await createPool(organizer.token);

    await request
      .post(`/api/pools/${pool.id}/invite`)
      .set("Authorization", `Bearer ${organizer.token}`)
      .send({ userId: newMember.userId });

    // Second invite for same user
    const res = await request
      .post(`/api/pools/${pool.id}/invite`)
      .set("Authorization", `Bearer ${organizer.token}`)
      .send({ userId: newMember.userId });

    expect(res.status).toBe(409);
  });
});

// ── POST /api/pools/:id/contributions ─────────────────────────────────────

describe("POST /api/pools/:id/contributions", () => {
  it("member can contribute and gets 201 back", async () => {
    const organizer = await createUserWithToken();
    const pool = await createPool(organizer.token, { targetAmount: 100000 });

    const res = await request
      .post(`/api/pools/${pool.id}/contributions`)
      .set("Authorization", `Bearer ${organizer.token}`)
      .send({ amountCents: 5000, note: "first payment" });

    expect(res.status).toBe(201);
    expect(res.body.contribution.amountCents).toBe(5000);
  });

  it("auto-funds pool when totalContributions >= targetAmount", async () => {
    const organizer = await createUserWithToken();
    const pool = await createPool(organizer.token, { targetAmount: 1000 });

    // Contribute exactly the target
    await request
      .post(`/api/pools/${pool.id}/contributions`)
      .set("Authorization", `Bearer ${organizer.token}`)
      .send({ amountCents: 1000 });

    const detail = await request
      .get(`/api/pools/${pool.id}`)
      .set("Authorization", `Bearer ${organizer.token}`);

    expect(detail.body.pool.status).toBe("FUNDED");
  });

  it("rejects contributions to a funded pool (400)", async () => {
    const organizer = await createUserWithToken();
    const pool = await createPool(organizer.token, { targetAmount: 500 });

    // Fund the pool
    await request
      .post(`/api/pools/${pool.id}/contributions`)
      .set("Authorization", `Bearer ${organizer.token}`)
      .send({ amountCents: 500 });

    // Attempt a second contribution
    const res = await request
      .post(`/api/pools/${pool.id}/contributions`)
      .set("Authorization", `Bearer ${organizer.token}`)
      .send({ amountCents: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not accepting/i);
  });

  it("returns 403 for a non-member", async () => {
    const organizer = await createUserWithToken();
    const outsider = await createUserWithToken();
    const pool = await createPool(organizer.token, { targetAmount: 10000 });

    const res = await request
      .post(`/api/pools/${pool.id}/contributions`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ amountCents: 100 });

    expect(res.status).toBe(403);
  });
});

// ── GET /api/pools/:id/balance ─────────────────────────────────────────────

describe("GET /api/pools/:id/balance", () => {
  it("returns correct balance after contributions (200)", async () => {
    const organizer = await createUserWithToken();
    const pool = await createPool(organizer.token, { targetAmount: 100000 });

    await request
      .post(`/api/pools/${pool.id}/contributions`)
      .set("Authorization", `Bearer ${organizer.token}`)
      .send({ amountCents: 3000 });
    await request
      .post(`/api/pools/${pool.id}/contributions`)
      .set("Authorization", `Bearer ${organizer.token}`)
      .send({ amountCents: 2000 });

    const res = await request
      .get(`/api/pools/${pool.id}/balance`)
      .set("Authorization", `Bearer ${organizer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.balance.totalContributions).toBe(5000);
    expect(res.body.balance.balance).toBe(5000);
    expect(res.body.balance.approvedWithdrawals).toBe(0);
  });

  it("returns 401 without token", async () => {
    const { token } = await createUserWithToken();
    const pool = await createPool(token);
    const res = await request.get(`/api/pools/${pool.id}/balance`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown pool", async () => {
    const { token } = await createUserWithToken();
    const res = await request
      .get("/api/pools/ghost/balance")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ── GET /api/pools/:id/preview ─────────────────────────────────────────────

describe("GET /api/pools/:id/preview", () => {
  it("returns public summary without auth (200)", async () => {
    const organizer = await createUserWithToken();
    const pool = await createPool(organizer.token, { targetAmount: 20000, purpose: "Trip" });

    // Contribute to affect percentFunded
    await request
      .post(`/api/pools/${pool.id}/contributions`)
      .set("Authorization", `Bearer ${organizer.token}`)
      .send({ amountCents: 5000 });

    // No Authorization header
    const res = await request.get(`/api/pools/${pool.id}/preview`);

    expect(res.status).toBe(200);
    expect(res.body.pool).toMatchObject({
      id: pool.id,
      targetAmount: 20000,
      totalContributions: 5000,
      percentFunded: 25,
      memberCount: 1,
    });
    // Must not expose member-level details (no members array)
    expect(res.body.pool.members).toBeUndefined();
  });

  it("returns 404 for non-existent pool", async () => {
    const res = await request.get("/api/pools/ghost-pool/preview");
    expect(res.status).toBe(404);
  });
});
