import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { resetDb } from "../db/database.js";

const app = createApp();

async function createUser(email: string, name: string): Promise<number> {
  const res = await request(app)
    .post("/api/users")
    .send({ email, name });
  return res.body.id;
}

async function createTanda(organizerId: number): Promise<number> {
  const res = await request(app)
    .post("/api/tandas")
    .send({ name: "Tanda Test", organizerId, contributionAmount: 500 });
  return res.body.id;
}

describe("Participants API", () => {
  beforeEach(() => {
    resetDb();
  });

  describe("POST /api/tandas/:id/join", () => {
    it("should join a tanda and return 201", async () => {
      const org = await createUser("org@test.com", "Org");
      const user = await createUser("user@test.com", "User");
      const tandaId = await createTanda(org);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: user });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(Number),
        user_id: user,
        tanda_id: tandaId,
        role: "member",
      });
    });

    it("should return 409 if user is already a participant", async () => {
      const org = await createUser("org@test.com", "Org");
      const tandaId = await createTanda(org);

      // Organizer is auto-joined, trying to join again
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: org });

      expect(res.status).toBe(409);
    });

    it("should return 400 if tanda is not in forming status", async () => {
      const org = await createUser("org@test.com", "Org");
      const u2 = await createUser("u2@test.com", "U2");
      const u3 = await createUser("u3@test.com", "U3");
      const u4 = await createUser("u4@test.com", "U4");
      const tandaId = await createTanda(org);

      await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: u2 });
      await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: u3 });
      await request(app).post(`/api/tandas/${tandaId}/start`).send({ userId: org });

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: u4 });

      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent tanda", async () => {
      const user = await createUser("user@test.com", "User");

      const res = await request(app)
        .post("/api/tandas/999/join")
        .send({ userId: user });

      expect(res.status).toBe(404);
    });

    it("should return 404 for non-existent user", async () => {
      const org = await createUser("org@test.com", "Org");
      const tandaId = await createTanda(org);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: 999 });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/tandas/:id/participants", () => {
    it("should list participants including organizer", async () => {
      const org = await createUser("org@test.com", "Org");
      const user = await createUser("user@test.com", "User");
      const tandaId = await createTanda(org);
      await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: user });

      const res = await request(app).get(`/api/tandas/${tandaId}/participants`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].role).toBe("organizer");
      expect(res.body[1].role).toBe("member");
    });

    it("should return 404 for non-existent tanda", async () => {
      const res = await request(app).get("/api/tandas/999/participants");

      expect(res.status).toBe(404);
    });
  });
});
