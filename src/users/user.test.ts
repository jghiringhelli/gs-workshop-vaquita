import { type Express } from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { type DatabaseConnection } from "../db/database";
import { createTestApp as buildTestApp } from "../testing/create-test-app";

let currentDb: DatabaseConnection | undefined;

function setup(): Express {
  const { app, db } = buildTestApp();

  currentDb = db;

  return app;
}

afterEach(() => {
  currentDb?.close();
  currentDb = undefined;
});

describe("User API", () => {
  it("returns health information", async () => {
    const app = setup();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      environment: "test",
    });
  });

  it("creates a user", async () => {
    const app = setup();

    const response = await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 1,
      email: "alice@example.com",
      name: "Alice",
    });
  });

  it("rejects an invalid payload", async () => {
    const app = setup();

    const response = await request(app).post("/api/users").send({
      email: "not-an-email",
      name: "",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects duplicate emails", async () => {
    const app = setup();

    await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    const response = await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alicia",
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("lists all users", async () => {
    const app = setup();

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
    expect(response.body).toEqual([
      {
        id: 1,
        email: "alice@example.com",
        name: "Alice",
      },
      {
        id: 2,
        email: "bob@example.com",
        name: "Bob",
      },
    ]);
  });

  it("gets a user by id", async () => {
    const app = setup();

    await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    const response = await request(app).get("/api/users/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      email: "alice@example.com",
      name: "Alice",
    });
  });

  it("returns 404 when a user does not exist", async () => {
    const app = setup();

    const response = await request(app).get("/api/users/999");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid JSON bodies", async () => {
    const app = setup();

    const response = await request(app)
      .post("/api/users")
      .set("Content-Type", "application/json")
      .send('{"email":"alice@example.com"');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });

  it("returns 404 for unknown routes", async () => {
    const app = setup();

    const response = await request(app).get("/api/unknown");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
