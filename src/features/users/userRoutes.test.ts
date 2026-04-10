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
});
