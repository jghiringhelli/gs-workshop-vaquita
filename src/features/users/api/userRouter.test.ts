import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApplication, type ApplicationContext } from "../../../app";

describe("user API", () => {
  let applicationContext: ApplicationContext;

  beforeEach((): void => {
    applicationContext = createApplication({
      databasePath: ":memory:",
      now: () => new Date("2026-04-10T10:00:00.000Z"),
      random: () => 0.25,
    });
  });

  afterEach((): void => {
    applicationContext.close();
  });

  it("creates, lists, and fetches users", async () => {
    const healthResponse = await request(applicationContext.app).get("/health");
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body).toMatchObject({
      status: "ok",
      environment: "test",
    });

    const firstCreateResponse = await request(applicationContext.app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });
    expect(firstCreateResponse.status).toBe(201);
    expect(firstCreateResponse.body).toMatchObject({
      id: 1,
      email: "alice@example.com",
      name: "Alice",
    });

    const secondCreateResponse = await request(applicationContext.app).post("/api/users").send({
      email: "bob@example.com",
      name: "Bob",
    });
    expect(secondCreateResponse.status).toBe(201);

    const listResponse = await request(applicationContext.app).get("/api/users");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(2);
    expect(listResponse.body[0]).toMatchObject({
      id: 1,
      email: "alice@example.com",
      name: "Alice",
    });

    const getResponse = await request(applicationContext.app).get("/api/users/2");
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      id: 2,
      email: "bob@example.com",
      name: "Bob",
    });
  });

  it("rejects duplicate user emails", async () => {
    await request(applicationContext.app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    const duplicateResponse = await request(applicationContext.app).post("/api/users").send({
      email: "alice@example.com",
      name: "Another Alice",
    });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.code).toBe("conflict");
  });

  it("rejects invalid user payloads and unknown ids", async () => {
    const invalidPayloadResponse = await request(applicationContext.app).post("/api/users").send({
      email: "not-an-email",
      name: "",
    });

    expect(invalidPayloadResponse.status).toBe(422);
    expect(invalidPayloadResponse.body.error.code).toBe("unprocessable_entity");

    const missingUserResponse = await request(applicationContext.app).get("/api/users/999");
    expect(missingUserResponse.status).toBe(404);
    expect(missingUserResponse.body.error.code).toBe("not_found");
  });
});
