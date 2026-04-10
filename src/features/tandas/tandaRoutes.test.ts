import request from "supertest";

import { createApp } from "../../app";

describe("POST /api/tandas", () => {
  it("creates a tanda and auto-joins the organizer", async () => {
    const app = createApp({ databaseFilePath: ":memory:" });

    await createUser(app, "alice@example.com", "Alice");

    const createResponse = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: 1,
      contributionAmount: 1000,
    });

    const participantsResponse = await request(app).get("/api/tandas/1/participants");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      id: 1,
      name: "Tanda Enero",
      organizerId: 1,
      contributionAmount: 1000,
      status: "forming",
      currentRound: 1,
      totalRounds: 1,
    });

    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body).toEqual([
      {
        id: 1,
        userId: 1,
        tandaId: 1,
        role: "organizer",
        rotationPosition: null,
        isDefaulter: false,
      },
    ]);
  });
});

/**
 * Create a user through the public API.
 *
 * @param app Express application under test.
 * @param email Email address to create.
 * @param name Display name to create.
 * @returns No return value.
 */
async function createUser(app: ReturnType<typeof createApp>, email: string, name: string): Promise<void> {
  await request(app).post("/api/users").send({ email, name });
}
