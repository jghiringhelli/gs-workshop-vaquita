import request from "supertest";

import { createApp } from "./app";
import { resetDatabaseForTests } from "./test/reset-db";

describe("Users API", () => {
  beforeEach(() => {
    resetDatabaseForTests();
  });

  it("creates a user with POST /api/users", async () => {
    const app = createApp();

    const response = await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: "alice@example.com",
      name: "Alice",
    });
  });

  it("returns 400 when creating user with invalid email", async () => {
    const app = createApp();

    const response = await request(app).post("/api/users").send({
      email: "not-an-email",
      name: "Alice",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lists users with GET /api/users", async () => {
    const app = createApp();

    await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });
    await request(app).post("/api/users").send({
      email: "bob@example.com",
      name: "Bob",
    });

    const response = await request(app).get("/api/users");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it("gets a user by id with GET /api/users/:id", async () => {
    const app = createApp();

    const created = await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    const response = await request(app).get(`/api/users/${created.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe("alice@example.com");
  });

  it("returns 404 for missing user", async () => {
    const app = createApp();

    const response = await request(app).get("/api/users/999");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});

describe("Tandas API", () => {
  beforeEach(() => {
    resetDatabaseForTests();
  });

  it("creates tanda and auto-joins organizer with POST /api/tandas", async () => {
    const app = createApp();

    const user = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });

    const response = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: user.body.id,
      contributionAmount: 1000,
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: "Tanda Enero",
        organizerId: user.body.id,
        status: "forming",
        currentRound: 1,
        totalRounds: 1,
      })
    );
  });

  it("returns 404 when organizer does not exist", async () => {
    const app = createApp();

    const response = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: 999,
      contributionAmount: 1000,
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("lists tandas by user with GET /api/tandas?userId=", async () => {
    const app = createApp();

    const user = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });

    await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: user.body.id,
      contributionAmount: 1000,
    });

    const response = await request(app).get(`/api/tandas?userId=${user.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe("Tanda Enero");
  });

  it("gets tanda details with GET /api/tandas/:id", async () => {
    const app = createApp();

    const user = await request(app).post("/api/users").send({
      email: "organizer@example.com",
      name: "Organizer",
    });

    const tanda = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId: user.body.id,
      contributionAmount: 1000,
    });

    const response = await request(app).get(`/api/tandas/${tanda.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(tanda.body.id);
  });

  it("returns 400 when userId query is missing", async () => {
    const app = createApp();

    const response = await request(app).get("/api/tandas");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
