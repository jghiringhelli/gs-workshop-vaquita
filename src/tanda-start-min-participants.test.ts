import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "./index";
import { db } from "./db/database";

function clearDatabase(): void {
  db.exec(`
    DELETE FROM contributions;
    DELETE FROM participants;
    DELETE FROM tandas;
    DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);
}

async function createUser(email: string, name: string): Promise<number> {
  const response = await request(app)
    .post("/api/users")
    .send({ email, name });

  expect(response.status).toBe(201);
  return response.body.id as number;
}

async function createTanda(organizerId: number): Promise<number> {
  const response = await request(app)
    .post("/api/tandas")
    .send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

  expect(response.status).toBe(201);
  return response.body.id as number;
}

describe("POST /api/tandas/:id/start minimum participants rule", () => {
  beforeEach(() => {
    clearDatabase();
  });

  it("returns 400 when only organizer is in the tanda", async () => {
    const organizerId = await createUser("one@example.com", "One");
    const tandaId = await createTanda(organizerId);

    const response = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ organizerId });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain("At least 3 participants are required");
  });

  it("returns 400 when tanda has 2 participants", async () => {
    const organizerId = await createUser("two-org@example.com", "Two Org");
    const secondUserId = await createUser("two-member@example.com", "Two Member");
    const tandaId = await createTanda(organizerId);

    const joinResponse = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: secondUserId });

    expect(joinResponse.status).toBe(201);

    const response = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ organizerId });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain("At least 3 participants are required");
  });

  it("starts successfully when tanda has exactly 3 participants", async () => {
    const organizerId = await createUser("three-org@example.com", "Three Org");
    const secondUserId = await createUser("three-member-a@example.com", "Three Member A");
    const thirdUserId = await createUser("three-member-b@example.com", "Three Member B");
    const tandaId = await createTanda(organizerId);

    const joinA = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: secondUserId });

    const joinB = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: thirdUserId });

    expect(joinA.status).toBe(201);
    expect(joinB.status).toBe(201);

    const response = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ organizerId });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("active");
    expect(response.body.currentRound).toBe(1);
    expect(response.body.totalRounds).toBe(3);
  });
});
