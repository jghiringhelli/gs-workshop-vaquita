import request from "supertest";

import { createApp } from "../../app";

describe("POST /api/users", () => {
  it("creates a user when the payload is valid", async () => {
    const app = createApp({ databaseFilePath: ":memory:" });

    const response = await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 1,
      email: "alice@example.com",
      name: "Alice",
    });
  });

  it("rejects an invalid email address", async () => {
    const app = createApp({ databaseFilePath: ":memory:" });

    const response = await request(app).post("/api/users").send({
      email: "not-an-email",
      name: "Alice",
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("validation_error");
  });
});

describe("GET /api/users", () => {
  it("lists the users in creation order", async () => {
    const app = createApp({ databaseFilePath: ":memory:" });

    await createUser(app, "alice@example.com", "Alice");
    await createUser(app, "bob@example.com", "Bob");

    const response = await request(app).get("/api/users");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 1, email: "alice@example.com", name: "Alice" },
      { id: 2, email: "bob@example.com", name: "Bob" },
    ]);
  });
});

describe("GET /api/users/:id", () => {
  it("returns a user by identifier", async () => {
    const app = createApp({ databaseFilePath: ":memory:" });

    await createUser(app, "alice@example.com", "Alice");

    const response = await request(app).get("/api/users/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      email: "alice@example.com",
      name: "Alice",
    });
  });

  it("returns 404 when the user does not exist", async () => {
    const app = createApp({ databaseFilePath: ":memory:" });

    const response = await request(app).get("/api/users/999");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("not_found");
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
