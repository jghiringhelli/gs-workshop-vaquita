import request from "supertest";

import type { ApplicationContext } from "../../app";
import { createApp, createApplicationContext, disposeApplicationContext } from "../../app";
import { loadConfig } from "../../config/env";

describe("auth feature", () => {
  let context: ApplicationContext;

  beforeEach(() => {
    context = createApplicationContext(
      loadConfig({
        ...process.env,
        DATABASE_PATH: ":memory:",
        NODE_ENV: "test",
        JWT_SECRET: "test-secret",
      }),
    );
  });

  afterEach(() => {
    disposeApplicationContext(context);
  });

  it("issues a bearer token for an existing user", async () => {
    const app = createApp(context);

    await request(app).post("/api/users").send({ email: "alice@example.com", name: "Alice" });

    const response = await request(app).post("/api/auth/token").send({ email: "alice@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tokenType: "Bearer",
      expiresIn: "1h",
      user: { email: "alice@example.com", name: "Alice" },
    });
    expect(typeof response.body.accessToken).toBe("string");
  });

  it("rejects token requests for unknown users", async () => {
    const app = createApp(context);

    const response = await request(app).post("/api/auth/token").send({ email: "ghost@example.com" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects malformed token requests", async () => {
    const app = createApp(context);

    const response = await request(app).post("/api/auth/token").send({ email: "not-an-email" });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});