import request from "supertest";

import { app } from "./app";

describe("app foundation", () => {
  it("returns health information from the layered system module", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.database.ready).toBe(true);
    expect(response.body.config.maxParticipants).toBe(20);
  });

  it("returns a structured not found error for unknown routes", async () => {
    const response = await request(app).get("/api/unknown-route");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});