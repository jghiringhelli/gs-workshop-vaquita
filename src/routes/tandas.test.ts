import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../index";
import { db } from "../db/database";

beforeEach(() => {
  db.exec(
    "DELETE FROM contributions; DELETE FROM participants; DELETE FROM tandas; DELETE FROM users;",
  );
});

// Helper: create a user and return body
async function createUser(email: string, name: string) {
  const res = await request(app)
    .post("/api/users")
    .send({ email, name });
  return res.body as { id: string; email: string; name: string };
}

// Helper: create a tanda and return body
async function createTanda(organizerId: string, name = "Tanda Test") {
  const res = await request(app)
    .post("/api/tandas")
    .send({ name, organizerId, contributionAmount: 1000 });
  return res.body as { id: string; status: string };
}

describe("POST /api/tandas", () => {
  it("creates a tanda and returns 201", async () => {
    const user = await createUser("alice@example.com", "Alice");
    const res = await request(app)
      .post("/api/tandas")
      .send({ name: "Tanda Enero", organizerId: user.id, contributionAmount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("forming");
    expect(res.body.organizerId).toBe(user.id);
  });

  it("returns 404 when organizerId does not exist", async () => {
    const res = await request(app)
      .post("/api/tandas")
      .send({ name: "Tanda", organizerId: "nonexistent", contributionAmount: 500 });

    expect(res.status).toBe(404);
  });

  it("returns 400 when contributionAmount is missing", async () => {
    const user = await createUser("alice@example.com", "Alice");
    const res = await request(app)
      .post("/api/tandas")
      .send({ name: "Tanda", organizerId: user.id });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/tandas", () => {
  it("returns 400 when userId query param is missing", async () => {
    const res = await request(app).get("/api/tandas");
    expect(res.status).toBe(400);
  });

  it("lists tandas for a user", async () => {
    const user = await createUser("alice@example.com", "Alice");
    await createTanda(user.id);

    const res = await request(app).get(`/api/tandas?userId=${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe("GET /api/tandas/:id", () => {
  it("returns tanda by id", async () => {
    const user = await createUser("alice@example.com", "Alice");
    const tanda = await createTanda(user.id);

    const res = await request(app).get(`/api/tandas/${tanda.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tanda.id);
  });

  it("returns 404 when tanda not found", async () => {
    const res = await request(app).get("/api/tandas/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/tandas/:id/join", () => {
  it("allows a user to join a forming tanda", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const member = await createUser("bob@example.com", "Bob");
    const tanda = await createTanda(organizer.id);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .send({ userId: member.id });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("member");
  });

  it("returns 409 when user is already a participant", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const tanda = await createTanda(organizer.id);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .send({ userId: organizer.id });

    expect(res.status).toBe(409);
  });

  it("returns 400 when tanda is not forming", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const member1 = await createUser("bob@example.com", "Bob");
    const member2 = await createUser("carol@example.com", "Carol");
    const tanda = await createTanda(organizer.id);

    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ userId: organizer.id });

    const newUser = await createUser("dave@example.com", "Dave");
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .send({ userId: newUser.id });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/tandas/:id/start", () => {
  it("starts a tanda with ≥3 participants", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const member1 = await createUser("bob@example.com", "Bob");
    const member2 = await createUser("carol@example.com", "Carol");
    const tanda = await createTanda(organizer.id);

    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member2.id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ userId: organizer.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("active");
    expect(res.body.currentRound).toBe(1);
    expect(res.body.totalRounds).toBe(3);
  });

  it("returns 400 when fewer than 3 participants", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const member1 = await createUser("bob@example.com", "Bob");
    const tanda = await createTanda(organizer.id);

    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member1.id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ userId: organizer.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 3/i);
  });

  it("returns 403 when non-organizer tries to start", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const member1 = await createUser("bob@example.com", "Bob");
    const member2 = await createUser("carol@example.com", "Carol");
    const tanda = await createTanda(organizer.id);

    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member2.id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ userId: member1.id });

    expect(res.status).toBe(403);
  });
});

describe("POST /api/tandas/:id/cancel", () => {
  it("organizer can cancel a forming tanda", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const tanda = await createTanda(organizer.id);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .send({ userId: organizer.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  it("returns 403 when non-organizer tries to cancel", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const member = await createUser("bob@example.com", "Bob");
    const tanda = await createTanda(organizer.id);

    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member.id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .send({ userId: member.id });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/tandas/:id/participants", () => {
  it("lists participants in a tanda", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const member = await createUser("bob@example.com", "Bob");
    const tanda = await createTanda(organizer.id);

    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member.id });

    const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe("POST /api/tandas/:id/contributions", () => {
  async function setupActiveTanda() {
    const organizer = await createUser("alice@example.com", "Alice");
    const member1 = await createUser("bob@example.com", "Bob");
    const member2 = await createUser("carol@example.com", "Carol");
    const tanda = await createTanda(organizer.id);

    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ userId: organizer.id });

    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    return { tanda, organizer, participants: participants.body };
  }

  it("records a contribution and returns 201", async () => {
    const { tanda, participants } = await setupActiveTanda();

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participants[0].id });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("paid");
    expect(res.body.amount).toBe(1000);
  });

  it("applies 5% penalty for late contributions", async () => {
    const { tanda, participants } = await setupActiveTanda();

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participants[0].id, isLate: true });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("late");
    expect(res.body.amount).toBe(1050);
  });

  it("returns 400 when tanda is not active", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const tanda = await createTanda(organizer.id);
    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participants.body[0].id });

    expect(res.status).toBe(400);
  });

  it("returns 400 when contribution already recorded for this round", async () => {
    const { tanda, participants } = await setupActiveTanda();

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participants[0].id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participants[0].id });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/tandas/:id/rounds/:round", () => {
  it("returns round summary for a valid round", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const member1 = await createUser("bob@example.com", "Bob");
    const member2 = await createUser("carol@example.com", "Carol");
    const tanda = await createTanda(organizer.id);

    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ userId: organizer.id });

    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body.round).toBe(1);
    expect(res.body.participants).toHaveLength(3);
  });

  it("returns 404 for an out-of-bounds round", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const member1 = await createUser("bob@example.com", "Bob");
    const member2 = await createUser("carol@example.com", "Carol");
    const tanda = await createTanda(organizer.id);

    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ userId: organizer.id });

    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/99`);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/tandas/:id/advance", () => {
  async function setupActiveTanda() {
    const organizer = await createUser("alice@example.com", "Alice");
    const member1 = await createUser("bob@example.com", "Bob");
    const member2 = await createUser("carol@example.com", "Carol");
    const tanda = await createTanda(organizer.id);

    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ userId: organizer.id });

    return { tanda, organizer, member1 };
  }

  it("organizer can advance round", async () => {
    const { tanda, organizer } = await setupActiveTanda();

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ userId: organizer.id });

    expect(res.status).toBe(200);
    expect(res.body.currentRound).toBe(2);
  });

  it("returns 403 when non-organizer tries to advance", async () => {
    const { tanda, member1 } = await setupActiveTanda();

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ userId: member1.id });

    expect(res.status).toBe(403);
  });

  it("auto-completes tanda after last round", async () => {
    const { tanda, organizer } = await setupActiveTanda();

    // Advance past all 3 rounds (start is round 1, advance twice more)
    await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ userId: organizer.id });
    await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ userId: organizer.id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ userId: organizer.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
  });
});

describe("GET /api/tandas/:id/participants/:pid/history", () => {
  it("returns contribution history for a participant", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const member1 = await createUser("bob@example.com", "Bob");
    const member2 = await createUser("carol@example.com", "Carol");
    const tanda = await createTanda(organizer.id);

    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ userId: organizer.id });

    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const pid = participants.body[0].id;

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: pid });

    const res = await request(app).get(
      `/api/tandas/${tanda.id}/participants/${pid}/history`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe("paid");
  });

  it("returns 404 for unknown participant", async () => {
    const organizer = await createUser("alice@example.com", "Alice");
    const tanda = await createTanda(organizer.id);

    const res = await request(app).get(
      `/api/tandas/${tanda.id}/participants/bad-id/history`,
    );

    expect(res.status).toBe(404);
  });
});
