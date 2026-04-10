import request from "supertest";

import { createApp, createApplicationContext, disposeApplicationContext } from "../../app";
import { loadConfig } from "../../config/env";
import type { ApplicationContext } from "../../app";

describe("users feature", () => {
  let context: ApplicationContext;

  beforeEach(() => {
    context = createApplicationContext(
      loadConfig({
        ...process.env,
        DATABASE_PATH: ":memory:",
        NODE_ENV: "test",
      }),
    );
  });

  afterEach(() => {
    disposeApplicationContext(context);
  });

  it("creates a user", async () => {
    const app = createApp(context);

    const response = await request(app).post("/api/users").send({
      email: "Alice@Example.com",
      name: "Alice",
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 1,
      email: "alice@example.com",
      name: "Alice",
    });
    expect(typeof response.body.createdAt).toBe("string");
  });

  it("rejects invalid user payloads", async () => {
    const app = createApp(context);

    const response = await request(app).post("/api/users").send({
      email: "invalid-email",
      name: "",
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects duplicate user emails", async () => {
    const app = createApp(context);

    await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    const response = await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice 2",
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("lists users", async () => {
    const app = createApp(context);

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
    expect(response.body[0]).toMatchObject({ email: "alice@example.com", name: "Alice" });
    expect(response.body[1]).toMatchObject({ email: "bob@example.com", name: "Bob" });
  });

  it("rejects unexpected query params when listing users", async () => {
    const app = createApp(context);

    const response = await request(app).get("/api/users?unexpected=true");

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns a user by id", async () => {
    const app = createApp(context);

    const createResponse = await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    const response = await request(app).get(`/api/users/${createResponse.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      email: "alice@example.com",
      name: "Alice",
    });
  });

  it("rejects invalid user ids", async () => {
    const app = createApp(context);

    const response = await request(app).get("/api/users/not-a-number");

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when the user does not exist", async () => {
    const app = createApp(context);

    const response = await request(app).get("/api/users/999");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});