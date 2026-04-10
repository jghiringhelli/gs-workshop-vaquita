import request from "supertest";

import { createTestApp } from "../test/create-test-app";

describe("users routes", () => {
  it("creates a user", async () => {
    const { app, db } = createTestApp();

    try {
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
      expect(response.body.createdAt).toEqual(expect.any(String));
    } finally {
      db.close();
    }
  });

  it("rejects invalid user payloads", async () => {
    const { app, db } = createTestApp();

    try {
      const response = await request(app).post("/api/users").send({
        email: "not-an-email",
        name: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    } finally {
      db.close();
    }
  });

  it("rejects duplicate emails", async () => {
    const { app, db } = createTestApp();

    try {
      await request(app).post("/api/users").send({
        email: "alice@example.com",
        name: "Alice",
      });

      const response = await request(app).post("/api/users").send({
        email: "alice@example.com",
        name: "Alice Again",
      });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    } finally {
      db.close();
    }
  });

  it("lists users", async () => {
    const { app, db } = createTestApp();

    try {
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
      expect(response.body[0]).toMatchObject({
        id: 1,
        email: "alice@example.com",
        name: "Alice",
      });
      expect(response.body[1]).toMatchObject({
        id: 2,
        email: "bob@example.com",
        name: "Bob",
      });
    } finally {
      db.close();
    }
  });

  it("returns a user by id", async () => {
    const { app, db } = createTestApp();

    try {
      await request(app).post("/api/users").send({
        email: "alice@example.com",
        name: "Alice",
      });

      const response = await request(app).get("/api/users/1");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 1,
        email: "alice@example.com",
        name: "Alice",
      });
    } finally {
      db.close();
    }
  });

  it("returns 404 when a user does not exist", async () => {
    const { app, db } = createTestApp();

    try {
      const response = await request(app).get("/api/users/999");

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    } finally {
      db.close();
    }
  });

  it("rejects malformed user ids", async () => {
    const { app, db } = createTestApp();

    try {
      const response = await request(app).get("/api/users/not-a-number");

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    } finally {
      db.close();
    }
  });
});
