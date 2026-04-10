import request from "supertest";

import { createApp } from "./app";

describe("GET /api/health", () => {
  it("returns service health payload", async () => {
    const app = createApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.service).toBe("tanda-api");
    expect(response.body.config).toEqual(
      expect.objectContaining({
        maxParticipants: expect.any(Number),
        latePenaltyPercent: expect.any(Number),
      })
    );
  });
});
