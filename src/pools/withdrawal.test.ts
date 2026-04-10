import supertest from "supertest";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { app } from "../app";
import { prisma } from "../db/client";

const request = supertest(app);

// ── Helpers ───────────────────────────────────────────────────────────────

let userCounter = 0;

async function createUserWithToken(): Promise<{ userId: string; token: string }> {
  const n = ++userCounter;
  await request.post("/api/users/register").send({
    email: `wd_user${n}@test.com`,
    username: `wd_user${n}`,
    password: "password123",
  });
  const res = await request.post("/api/users/login").send({
    email: `wd_user${n}@test.com`,
    password: "password123",
  });
  return { userId: res.body.user.id, token: res.body.token };
}

async function createPool(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request
    .post("/api/pools")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "WD Pool", targetAmount: 100_000, ...overrides });
  return res.body.pool as { id: string; organizerId: string };
}

async function inviteAndJoin(poolId: string, organizerToken: string, userId: string) {
  await request
    .post(`/api/pools/${poolId}/invite`)
    .set("Authorization", `Bearer ${organizerToken}`)
    .send({ userId });
}

async function requestWithdrawal(poolId: string, token: string, overrides: Record<string, unknown> = {}) {
  const res = await request
    .post(`/api/pools/${poolId}/withdrawals`)
    .set("Authorization", `Bearer ${token}`)
    .send({ amountCents: 5000, reason: "Buy supplies", receiptUrl: "https://example.com/r.pdf", ...overrides });
  return res;
}

// ── Cleanup ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.withdrawalVote.deleteMany();
  await prisma.poolWithdrawal.deleteMany();
  await prisma.poolContribution.deleteMany();
  await prisma.poolMember.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.user.deleteMany();
  userCounter = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ── POST /api/pools/:id/withdrawals ────────────────────────────────────────

describe("POST /api/pools/:id/withdrawals", () => {
  it("organizer can request a withdrawal (201)", async () => {
    const org = await createUserWithToken();
    const pool = await createPool(org.token);

    const res = await requestWithdrawal(pool.id, org.token);

    expect(res.status).toBe(201);
    expect(res.body.withdrawal).toMatchObject({
      poolId: pool.id,
      amountCents: 5000,
      reason: "Buy supplies",
      status: "PENDING",
      resolvedAt: null,
    });
    expect(res.body.withdrawal.receiptUrl).toBe("https://example.com/r.pdf");
  });

  it("returns 403 when a non-organizer requests a withdrawal", async () => {
    const org = await createUserWithToken();
    const member = await createUserWithToken();
    const pool = await createPool(org.token);
    await inviteAndJoin(pool.id, org.token, member.userId);

    const res = await requestWithdrawal(pool.id, member.token);
    expect(res.status).toBe(403);
  });

  it("returns 400 when amountCents is missing", async () => {
    const org = await createUserWithToken();
    const pool = await createPool(org.token);

    const res = await request
      .post(`/api/pools/${pool.id}/withdrawals`)
      .set("Authorization", `Bearer ${org.token}`)
      .send({ reason: "No amount" });

    expect(res.status).toBe(400);
  });
});

// ── GET /api/pools/:id/withdrawals ─────────────────────────────────────────

describe("GET /api/pools/:id/withdrawals", () => {
  it("lists withdrawals with approve/reject counts (200)", async () => {
    const org = await createUserWithToken();
    const pool = await createPool(org.token);
    await requestWithdrawal(pool.id, org.token);

    const res = await request
      .get(`/api/pools/${pool.id}/withdrawals`)
      .set("Authorization", `Bearer ${org.token}`);

    expect(res.status).toBe(200);
    expect(res.body.withdrawals).toHaveLength(1);
    expect(res.body.withdrawals[0]).toMatchObject({
      status: "PENDING",
      approveCount: 0,
      rejectCount: 0,
    });
  });

  it("returns 404 for a non-existent pool", async () => {
    const org = await createUserWithToken();
    const res = await request
      .get("/api/pools/ghost/withdrawals")
      .set("Authorization", `Bearer ${org.token}`);
    expect(res.status).toBe(404);
  });
});

// ── POST /api/withdrawals/:id/vote ─────────────────────────────────────────

describe("POST /api/withdrawals/:id/vote", () => {
  it("member can approve a withdrawal (200)", async () => {
    const org = await createUserWithToken();
    const member = await createUserWithToken();
    const pool = await createPool(org.token);
    await inviteAndJoin(pool.id, org.token, member.userId);

    const wd = (await requestWithdrawal(pool.id, org.token)).body.withdrawal;

    const res = await request
      .post(`/api/withdrawals/${wd.id}/vote`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ vote: "approve" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/vote recorded/i);
  });

  it("auto-approves when approve threshold is reached", async () => {
    // 3 members total: org + m1 + m2 → approve threshold = ceil(3/2) = 2
    const org = await createUserWithToken();
    const m1  = await createUserWithToken();
    const m2  = await createUserWithToken();
    const pool = await createPool(org.token);
    await inviteAndJoin(pool.id, org.token, m1.userId);
    await inviteAndJoin(pool.id, org.token, m2.userId);

    const wd = (await requestWithdrawal(pool.id, org.token)).body.withdrawal;

    // First approve vote
    await request
      .post(`/api/withdrawals/${wd.id}/vote`)
      .set("Authorization", `Bearer ${m1.token}`)
      .send({ vote: "approve" });

    // Second approve vote — hits threshold ceil(3/2)=2
    await request
      .post(`/api/withdrawals/${wd.id}/vote`)
      .set("Authorization", `Bearer ${m2.token}`)
      .send({ vote: "approve" });

    const withdrawals = (
      await request
        .get(`/api/pools/${pool.id}/withdrawals`)
        .set("Authorization", `Bearer ${org.token}`)
    ).body.withdrawals;

    expect(withdrawals[0].status).toBe("APPROVED");
    expect(withdrawals[0].resolvedAt).not.toBeNull();
  });

  it("auto-rejects when reject threshold is reached", async () => {
    // 4 members: org + m1 + m2 + m3 → reject threshold = floor(4/2)+1 = 3
    const org = await createUserWithToken();
    const [m1, m2, m3] = await Promise.all([
      createUserWithToken(),
      createUserWithToken(),
      createUserWithToken(),
    ]);
    const pool = await createPool(org.token);
    for (const m of [m1, m2, m3]) {
      await inviteAndJoin(pool.id, org.token, m.userId);
    }

    const wd = (await requestWithdrawal(pool.id, org.token)).body.withdrawal;

    for (const m of [m1, m2, m3]) {
      await request
        .post(`/api/withdrawals/${wd.id}/vote`)
        .set("Authorization", `Bearer ${m.token}`)
        .send({ vote: "reject" });
    }

    const withdrawals = (
      await request
        .get(`/api/pools/${pool.id}/withdrawals`)
        .set("Authorization", `Bearer ${org.token}`)
    ).body.withdrawals;

    expect(withdrawals[0].status).toBe("REJECTED");
  });

  it("returns 400 when receiptUrl is absent", async () => {
    const org = await createUserWithToken();
    const member = await createUserWithToken();
    const pool = await createPool(org.token);
    await inviteAndJoin(pool.id, org.token, member.userId);

    // Request withdrawal WITHOUT a receiptUrl
    const wd = (
      await request
        .post(`/api/pools/${pool.id}/withdrawals`)
        .set("Authorization", `Bearer ${org.token}`)
        .send({ amountCents: 1000, reason: "No receipt" })
    ).body.withdrawal;

    const res = await request
      .post(`/api/withdrawals/${wd.id}/vote`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ vote: "approve" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/receipt/i);
  });

  it("returns 403 when the organizer votes on their own withdrawal", async () => {
    const org = await createUserWithToken();
    const pool = await createPool(org.token);

    const wd = (await requestWithdrawal(pool.id, org.token)).body.withdrawal;

    const res = await request
      .post(`/api/withdrawals/${wd.id}/vote`)
      .set("Authorization", `Bearer ${org.token}`)
      .send({ vote: "approve" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/own withdrawal/i);
  });

  it("returns 409 on duplicate vote", async () => {
    const org = await createUserWithToken();
    const member = await createUserWithToken();
    const pool = await createPool(org.token);
    await inviteAndJoin(pool.id, org.token, member.userId);

    const wd = (await requestWithdrawal(pool.id, org.token)).body.withdrawal;

    // First vote: "reject" — with 2 members, reject threshold = floor(2/2)+1 = 2
    // so one reject vote keeps the withdrawal PENDING
    await request
      .post(`/api/withdrawals/${wd.id}/vote`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ vote: "reject" });

    // Second vote from the same member — should be 409 Conflict
    const res = await request
      .post(`/api/withdrawals/${wd.id}/vote`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ vote: "reject" });

    expect(res.status).toBe(409);
  });

  it("returns 400 on invalid vote value", async () => {
    const org = await createUserWithToken();
    const member = await createUserWithToken();
    const pool = await createPool(org.token);
    await inviteAndJoin(pool.id, org.token, member.userId);
    const wd = (await requestWithdrawal(pool.id, org.token)).body.withdrawal;

    const res = await request
      .post(`/api/withdrawals/${wd.id}/vote`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ vote: "maybe" });

    expect(res.status).toBe(400);
  });
});

// ── GET /api/pools/:id/ledger ──────────────────────────────────────────────

describe("GET /api/pools/:id/ledger", () => {
  it("returns contributions and withdrawals interleaved by createdAt (200)", async () => {
    const org = await createUserWithToken();
    const pool = await createPool(org.token, { targetAmount: 1_000_000 });

    // Contribution
    await request
      .post(`/api/pools/${pool.id}/contributions`)
      .set("Authorization", `Bearer ${org.token}`)
      .send({ amountCents: 3000 });

    // Withdrawal request
    await requestWithdrawal(pool.id, org.token, { amountCents: 500 });

    const res = await request
      .get(`/api/pools/${pool.id}/ledger`)
      .set("Authorization", `Bearer ${org.token}`);

    expect(res.status).toBe(200);
    expect(res.body.ledger).toHaveLength(2);

    const types = res.body.ledger.map((e: { type: string }) => e.type);
    expect(types).toContain("contribution");
    expect(types).toContain("withdrawal");
  });

  it("returns 404 for unknown pool", async () => {
    const org = await createUserWithToken();
    const res = await request
      .get("/api/pools/ghost/ledger")
      .set("Authorization", `Bearer ${org.token}`);
    expect(res.status).toBe(404);
  });
});

// ── POST /api/pools/:id/dissolve ───────────────────────────────────────────

describe("POST /api/pools/:id/dissolve", () => {
  it("organizer can dissolve a pool (200, status CLOSED)", async () => {
    const org = await createUserWithToken();
    const pool = await createPool(org.token);

    const res = await request
      .post(`/api/pools/${pool.id}/dissolve`)
      .set("Authorization", `Bearer ${org.token}`);

    expect(res.status).toBe(200);
    expect(res.body.pool.status).toBe("CLOSED");
  });

  it("returns 403 when a non-organizer tries to dissolve", async () => {
    const org = await createUserWithToken();
    const member = await createUserWithToken();
    const pool = await createPool(org.token);
    await inviteAndJoin(pool.id, org.token, member.userId);

    const res = await request
      .post(`/api/pools/${pool.id}/dissolve`)
      .set("Authorization", `Bearer ${member.token}`);

    expect(res.status).toBe(403);
  });

  it("returns 400 when the pool is already closed", async () => {
    const org = await createUserWithToken();
    const pool = await createPool(org.token);

    await request
      .post(`/api/pools/${pool.id}/dissolve`)
      .set("Authorization", `Bearer ${org.token}`);

    const res = await request
      .post(`/api/pools/${pool.id}/dissolve`)
      .set("Authorization", `Bearer ${org.token}`);

    expect(res.status).toBe(400);
  });
});

// ── Balance reflects approved withdrawals ─────────────────────────────────

describe("GET /api/pools/:id/balance — approved withdrawals deducted", () => {
  it("balance decreases after a withdrawal is approved", async () => {
    // 2 members: org + m1 → approve threshold = ceil(2/2) = 1
    const org = await createUserWithToken();
    const m1  = await createUserWithToken();
    const pool = await createPool(org.token, { targetAmount: 1_000_000 });
    await inviteAndJoin(pool.id, org.token, m1.userId);

    // Contribute 10 000 cents
    await request
      .post(`/api/pools/${pool.id}/contributions`)
      .set("Authorization", `Bearer ${org.token}`)
      .send({ amountCents: 10_000 });

    // Request + approve a 3 000 cent withdrawal
    const wd = (await requestWithdrawal(pool.id, org.token, { amountCents: 3_000 })).body.withdrawal;

    await request
      .post(`/api/withdrawals/${wd.id}/vote`)
      .set("Authorization", `Bearer ${m1.token}`)
      .send({ vote: "approve" });

    const balRes = await request
      .get(`/api/pools/${pool.id}/balance`)
      .set("Authorization", `Bearer ${org.token}`);

    expect(balRes.body.balance.totalContributions).toBe(10_000);
    expect(balRes.body.balance.approvedWithdrawals).toBe(3_000);
    expect(balRes.body.balance.balance).toBe(7_000);
  });
});
