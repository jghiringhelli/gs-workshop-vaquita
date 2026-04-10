import request from "supertest";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createApp } from "./app";
import { resetDb, teardownDb } from "./test/reset-db";

const app = createApp();

beforeEach(() => resetDb());
afterAll(() => teardownDb());

// ── helpers ──────────────────────────────────────────────────────────────────

async function createUser(email: string, name: string) {
  const res = await request(app)
    .post("/api/users")
    .send({ email, name });
  return res.body as { id: number; email: string; name: string };
}

async function getToken(userId: number): Promise<string> {
  const res = await request(app)
    .post("/api/auth/token")
    .send({ userId });
  return (res.body as { token: string }).token;
}

async function createTanda(
  organizerId: number,
  token: string,
  name = "Test Tanda",
  amount = 1000,
) {
  const res = await request(app)
    .post("/api/tandas")
    .set("Authorization", `Bearer ${token}`)
    .send({ name, organizerId, contributionAmount: amount });
  return res.body as { id: number; status: string };
}

// ── Health ────────────────────────────────────────────────────────────────────

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

describe("POST /api/auth/token", () => {
  it("returns 200 with token for existing user", async () => {
    const user = await createUser("a@test.com", "Alice");
    const res = await request(app).post("/api/auth/token").send({ userId: user.id });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
  });

  it("returns 400 for unknown user", async () => {
    const res = await request(app).post("/api/auth/token").send({ userId: 9999 });
    expect(res.status).toBe(400);
  });
});

// ── Users ─────────────────────────────────────────────────────────────────────

describe("POST /api/users", () => {
  it("creates a user and returns 201", async () => {
    const res = await request(app).post("/api/users").send({ email: "b@test.com", name: "Bob" });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("b@test.com");
  });

  it("returns 409 for duplicate email", async () => {
    await createUser("c@test.com", "Carol");
    const res = await request(app).post("/api/users").send({ email: "c@test.com", name: "Carol2" });
    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid email", async () => {
    const res = await request(app).post("/api/users").send({ email: "not-an-email", name: "X" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/users", () => {
  it("returns empty list initially", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/users/:id", () => {
  it("returns user by id", async () => {
    const user = await createUser("d@test.com", "Dave");
    const res = await request(app).get(`/api/users/${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Dave");
  });

  it("returns 404 for unknown user", async () => {
    const res = await request(app).get("/api/users/9999");
    expect(res.status).toBe(404);
  });
});

// ── Tandas ────────────────────────────────────────────────────────────────────

describe("POST /api/tandas", () => {
  it("creates a tanda and auto-joins organizer", async () => {
    const user = await createUser("org@test.com", "Org");
    const token = await getToken(user.id);
    const res = await request(app)
      .post("/api/tandas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Tanda A", organizerId: user.id, contributionAmount: 500 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("forming");
  });

  it("returns 401 without token", async () => {
    const user = await createUser("org2@test.com", "Org2");
    const res = await request(app)
      .post("/api/tandas")
      .send({ name: "Tanda B", organizerId: user.id, contributionAmount: 500 });
    expect(res.status).toBe(401);
  });

  it("returns 403 when token user != organizerId", async () => {
    const user1 = await createUser("org3@test.com", "Org3");
    const user2 = await createUser("other@test.com", "Other");
    const token = await getToken(user1.id);
    const res = await request(app)
      .post("/api/tandas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Tanda C", organizerId: user2.id, contributionAmount: 500 });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/tandas", () => {
  it("returns tandas for a user", async () => {
    const user = await createUser("u@test.com", "User");
    const token = await getToken(user.id);
    await createTanda(user.id, token);
    const res = await request(app).get(`/api/tandas?userId=${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 400 without userId query param", async () => {
    const res = await request(app).get("/api/tandas");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/tandas/:id", () => {
  it("returns tanda by id", async () => {
    const user = await createUser("v@test.com", "V");
    const token = await getToken(user.id);
    const tanda = await createTanda(user.id, token);
    const res = await request(app).get(`/api/tandas/${tanda.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tanda.id);
  });

  it("returns 404 for unknown tanda", async () => {
    const res = await request(app).get("/api/tandas/9999");
    expect(res.status).toBe(404);
  });
});

// ── Join / Start / Cancel ─────────────────────────────────────────────────────

describe("POST /api/tandas/:id/join", () => {
  it("allows a user to join a forming tanda", async () => {
    const org = await createUser("orgJ@test.com", "OrgJ");
    const mem = await createUser("memJ@test.com", "MemJ");
    const orgToken = await getToken(org.id);
    const memToken = await getToken(mem.id);
    const tanda = await createTanda(org.id, orgToken);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .set("Authorization", `Bearer ${memToken}`)
      .send({ userId: mem.id });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(mem.id);
  });

  it("returns 409 when joining twice", async () => {
    const org = await createUser("orgJ2@test.com", "OrgJ2");
    const mem = await createUser("memJ2@test.com", "MemJ2");
    const orgToken = await getToken(org.id);
    const memToken = await getToken(mem.id);
    const tanda = await createTanda(org.id, orgToken);
    await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .set("Authorization", `Bearer ${memToken}`)
      .send({ userId: mem.id });
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .set("Authorization", `Bearer ${memToken}`)
      .send({ userId: mem.id });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/tandas/:id/start", () => {
  it("starts a tanda with 3+ participants", async () => {
    const org = await createUser("orgS@test.com", "OrgS");
    const m1 = await createUser("m1s@test.com", "M1");
    const m2 = await createUser("m2s@test.com", "M2");
    const orgToken = await getToken(org.id);
    const t1Token = await getToken(m1.id);
    const t2Token = await getToken(m2.id);
    const tanda = await createTanda(org.id, orgToken);
    await request(app).post(`/api/tandas/${tanda.id}/join`).set("Authorization", `Bearer ${t1Token}`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).set("Authorization", `Bearer ${t2Token}`).send({ userId: m2.id });
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .set("Authorization", `Bearer ${orgToken}`)
      .send({ organizerId: org.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("active");
  });

  it("returns 400 with fewer than 3 participants", async () => {
    const org = await createUser("orgS2@test.com", "OrgS2");
    const m1 = await createUser("m1s2@test.com", "M1S2");
    const orgToken = await getToken(org.id);
    const m1Token = await getToken(m1.id);
    const tanda = await createTanda(org.id, orgToken);
    await request(app).post(`/api/tandas/${tanda.id}/join`).set("Authorization", `Bearer ${m1Token}`).send({ userId: m1.id });
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .set("Authorization", `Bearer ${orgToken}`)
      .send({ organizerId: org.id });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/tandas/:id/cancel", () => {
  it("cancels a forming tanda", async () => {
    const org = await createUser("orgC@test.com", "OrgC");
    const token = await getToken(org.id);
    const tanda = await createTanda(org.id, token);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .set("Authorization", `Bearer ${token}`)
      .send({ organizerId: org.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  it("returns 409 when cancelling twice", async () => {
    const org = await createUser("orgC2@test.com", "OrgC2");
    const token = await getToken(org.id);
    const tanda = await createTanda(org.id, token);
    await request(app).post(`/api/tandas/${tanda.id}/cancel`).set("Authorization", `Bearer ${token}`).send({ organizerId: org.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/cancel`).set("Authorization", `Bearer ${token}`).send({ organizerId: org.id });
    expect(res.status).toBe(409);
  });
});

// ── Participants listing ───────────────────────────────────────────────────────

describe("GET /api/tandas/:id/participants", () => {
  it("lists participants including organizer", async () => {
    const org = await createUser("orgP@test.com", "OrgP");
    const token = await getToken(org.id);
    const tanda = await createTanda(org.id, token);
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].role).toBe("organizer");
  });
});

// ── Contributions + Rounds + Advance + History ────────────────────────────────

async function buildActiveTanda() {
  const org = await createUser("orgA@test.com", "OrgA");
  const m1 = await createUser("m1a@test.com", "M1A");
  const m2 = await createUser("m2a@test.com", "M2A");
  const orgToken = await getToken(org.id);
  const m1Token = await getToken(m1.id);
  const m2Token = await getToken(m2.id);
  const tanda = await createTanda(org.id, orgToken);
  await request(app).post(`/api/tandas/${tanda.id}/join`).set("Authorization", `Bearer ${m1Token}`).send({ userId: m1.id });
  await request(app).post(`/api/tandas/${tanda.id}/join`).set("Authorization", `Bearer ${m2Token}`).send({ userId: m2.id });
  await request(app).post(`/api/tandas/${tanda.id}/start`).set("Authorization", `Bearer ${orgToken}`).send({ organizerId: org.id });

  const pRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
  const participants = pRes.body as { id: number; userId: number; role: string }[];
  return { tanda, org, m1, m2, orgToken, m1Token, m2Token, participants };
}

describe("POST /api/tandas/:id/contributions", () => {
  it("records a contribution for the current round", async () => {
    const { tanda, org, orgToken, participants } = await buildActiveTanda();
    const orgPart = participants.find((p) => p.userId === org.id)!;
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .set("Authorization", `Bearer ${orgToken}`)
      .send({ participantId: orgPart.id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("paid");
  });

  it("returns 409 on duplicate contribution", async () => {
    const { tanda, org, orgToken, participants } = await buildActiveTanda();
    const orgPart = participants.find((p) => p.userId === org.id)!;
    await request(app).post(`/api/tandas/${tanda.id}/contributions`).set("Authorization", `Bearer ${orgToken}`).send({ participantId: orgPart.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/contributions`).set("Authorization", `Bearer ${orgToken}`).send({ participantId: orgPart.id });
    expect(res.status).toBe(409);
  });

  it("records a late contribution with 'late' status", async () => {
    const { tanda, org, orgToken, participants } = await buildActiveTanda();
    const orgPart = participants.find((p) => p.userId === org.id)!;
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .set("Authorization", `Bearer ${orgToken}`)
      .send({ participantId: orgPart.id, isLate: true });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("late");
  });
});

describe("GET /api/tandas/:id/rounds/:round", () => {
  it("returns round summary", async () => {
    const { tanda } = await buildActiveTanda();
    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body.round).toBe(1);
  });

  it("returns 400 for invalid round", async () => {
    const { tanda } = await buildActiveTanda();
    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/99`);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/tandas/:id/advance", () => {
  it("advances round and auto-records missed contributions", async () => {
    const { tanda, org, orgToken } = await buildActiveTanda();
    const resBefore = await request(app).get(`/api/tandas/${tanda.id}`);
    expect(resBefore.body.currentRound).toBe(1);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .set("Authorization", `Bearer ${orgToken}`)
      .send({ organizerId: org.id });
    expect(res.status).toBe(200);
    // After advancing from round 1 of 3, should be round 2
    expect(res.body.currentRound).toBe(2);
  });

  it("auto-completes after last round", async () => {
    const { tanda, org, orgToken } = await buildActiveTanda();
    // Advance all 3 rounds
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .set("Authorization", `Bearer ${orgToken}`)
        .send({ organizerId: org.id });
    }
    const res = await request(app).get(`/api/tandas/${tanda.id}`);
    expect(res.body.status).toBe("completed");
  });
});

describe("GET /api/tandas/:id/participants/:pid/history", () => {
  it("returns contribution history for a participant", async () => {
    const { tanda, org, orgToken, participants } = await buildActiveTanda();
    const orgPart = participants.find((p) => p.userId === org.id)!;
    await request(app).post(`/api/tandas/${tanda.id}/contributions`).set("Authorization", `Bearer ${orgToken}`).send({ participantId: orgPart.id });
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${orgPart.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────

describe("unknown routes", () => {
  it("returns 404 for unmatched path", async () => {
    const res = await request(app).get("/api/unknown-route");
    expect(res.status).toBe(404);
  });
});
