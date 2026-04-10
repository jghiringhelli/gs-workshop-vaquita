import request from "supertest";

import { createTestApp } from "../test/create-test-app";

describe("auth routes", () => {
  it("issues a token for an existing user", async () => {
    const { app, db } = createTestApp();

    try {
      await request(app).post("/api/users").send({
        email: "alice@example.com",
        name: "Alice",
      });

      const response = await request(app).post("/api/auth/token").send({
        userId: 1,
      });

      expect(response.status).toBe(200);
      expect(response.body.token).toEqual(expect.any(String));
      expect(response.body.token.split(".")).toHaveLength(3);
    } finally {
      db.close();
    }
  });

  it("rejects malformed token requests", async () => {
    const { app, db } = createTestApp();

    try {
      const response = await request(app).post("/api/auth/token").send({
        userId: "abc",
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    } finally {
      db.close();
    }
  });

  it("returns 404 when requesting a token for an unknown user", async () => {
    const { app, db } = createTestApp();

    try {
      const response = await request(app).post("/api/auth/token").send({
        userId: 999,
      });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    } finally {
      db.close();
    }
  });
});
