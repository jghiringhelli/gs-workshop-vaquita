import request from "supertest";
import { createTestApp } from "../tests/test-app";

describe("Users API", () => {
  it("creates and fetches a user", async () => {
    const { app } = createTestApp();

    const createResponse = await request(app).post("/api/users").send({
      email: "alice@example.com",
      name: "Alice",
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      id: 1,
      email: "alice@example.com",
      name: "Alice",
    });

    const getResponse = await request(app).get("/api/users/1");
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.email).toBe("alice@example.com");

    const listResponse = await request(app).get("/api/users");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
  });

  it("returns 422 for invalid create payload", async () => {
    const { app } = createTestApp();

    const response = await request(app).post("/api/users").send({
      email: "invalid",
      name: "",
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
