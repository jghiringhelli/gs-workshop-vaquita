import request from "supertest";

import { createAuthenticatedUser } from "../test/create-authenticated-user";
import { createTestApp } from "../test/create-test-app";

describe("tandas routes", () => {
  it("creates a tanda for the authenticated organizer", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });

      const response = await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({
          name: "Tanda Enero",
          contributionAmount: 1000,
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: 1,
        name: "Tanda Enero",
        organizerId: organizer.user.id,
        contributionAmount: 1000,
        status: "forming",
        currentRound: 0,
        totalRounds: 1,
      });
    } finally {
      db.close();
    }
  });

  it("requires authentication to create a tanda", async () => {
    const { app, db } = createTestApp();

    try {
      const response = await request(app).post("/api/tandas").send({
        name: "Tanda Enero",
        contributionAmount: 1000,
      });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    } finally {
      db.close();
    }
  });

  it("lists tandas for the authenticated user", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });
      const otherUser = await createAuthenticatedUser(app, {
        email: "member@example.com",
        name: "Member",
      });

      await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({
          name: "Tanda Uno",
          contributionAmount: 800,
        });

      await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${otherUser.token}`)
        .send({
          name: "Tanda Dos",
          contributionAmount: 900,
        });

      const response = await request(app)
        .get("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe("Tanda Uno");
    } finally {
      db.close();
    }
  });

  it("forbids listing tandas for a different userId", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });
      const otherUser = await createAuthenticatedUser(app, {
        email: "member@example.com",
        name: "Member",
      });

      const response = await request(app)
        .get(`/api/tandas?userId=${otherUser.user.id}`)
        .set("Authorization", `Bearer ${organizer.token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    } finally {
      db.close();
    }
  });

  it("returns tanda detail to participants", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });

      await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({
          name: "Tanda Uno",
          contributionAmount: 1000,
        });

      const response = await request(app)
        .get("/api/tandas/1")
        .set("Authorization", `Bearer ${organizer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Tanda Uno");
    } finally {
      db.close();
    }
  });

  it("forbids tanda detail to outsiders", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });
      const outsider = await createAuthenticatedUser(app, {
        email: "outsider@example.com",
        name: "Outsider",
      });

      await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({
          name: "Tanda Uno",
          contributionAmount: 1000,
        });

      const response = await request(app)
        .get("/api/tandas/1")
        .set("Authorization", `Bearer ${outsider.token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    } finally {
      db.close();
    }
  });

  it("lets an authenticated user join a forming tanda", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });
      const member = await createAuthenticatedUser(app, {
        email: "member@example.com",
        name: "Member",
      });

      await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({
          name: "Tanda Uno",
          contributionAmount: 1000,
        });

      const response = await request(app)
        .post("/api/tandas/1/join")
        .set("Authorization", `Bearer ${member.token}`);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        userId: member.user.id,
        tandaId: 1,
        role: "member",
      });
    } finally {
      db.close();
    }
  });

  it("rejects duplicate joins", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });
      const member = await createAuthenticatedUser(app, {
        email: "member@example.com",
        name: "Member",
      });

      await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({
          name: "Tanda Uno",
          contributionAmount: 1000,
        });

      await request(app)
        .post("/api/tandas/1/join")
        .set("Authorization", `Bearer ${member.token}`);

      const response = await request(app)
        .post("/api/tandas/1/join")
        .set("Authorization", `Bearer ${member.token}`);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    } finally {
      db.close();
    }
  });

  it("starts a tanda when the organizer has at least three participants", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });
      const memberOne = await createAuthenticatedUser(app, {
        email: "member1@example.com",
        name: "Member One",
      });
      const memberTwo = await createAuthenticatedUser(app, {
        email: "member2@example.com",
        name: "Member Two",
      });

      await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({
          name: "Tanda Uno",
          contributionAmount: 1000,
        });

      await request(app)
        .post("/api/tandas/1/join")
        .set("Authorization", `Bearer ${memberOne.token}`);
      await request(app)
        .post("/api/tandas/1/join")
        .set("Authorization", `Bearer ${memberTwo.token}`);

      const response = await request(app)
        .post("/api/tandas/1/start")
        .set("Authorization", `Bearer ${organizer.token}`);

      const participantsResponse = await request(app)
        .get("/api/tandas/1/participants")
        .set("Authorization", `Bearer ${organizer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("active");
      expect(response.body.currentRound).toBe(1);
      expect(response.body.totalRounds).toBe(3);
      expect(participantsResponse.status).toBe(200);
      expect(participantsResponse.body).toHaveLength(3);
      expect(
        new Set(
          participantsResponse.body.map(
            (participant: { rotationPosition: number }) => participant.rotationPosition,
          ),
        ).size,
      ).toBe(3);
    } finally {
      db.close();
    }
  });

  it("rejects starting a tanda with fewer than three participants", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });

      await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({
          name: "Tanda Uno",
          contributionAmount: 1000,
        });

      const response = await request(app)
        .post("/api/tandas/1/start")
        .set("Authorization", `Bearer ${organizer.token}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("BAD_REQUEST");
    } finally {
      db.close();
    }
  });

  it("lets the organizer cancel a tanda", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });

      await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({
          name: "Tanda Uno",
          contributionAmount: 1000,
        });

      const response = await request(app)
        .post("/api/tandas/1/cancel")
        .set("Authorization", `Bearer ${organizer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("cancelled");
    } finally {
      db.close();
    }
  });

  it("forbids cancellation by non-organizers", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });
      const member = await createAuthenticatedUser(app, {
        email: "member@example.com",
        name: "Member",
      });

      await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({
          name: "Tanda Uno",
          contributionAmount: 1000,
        });

      await request(app)
        .post("/api/tandas/1/join")
        .set("Authorization", `Bearer ${member.token}`);

      const response = await request(app)
        .post("/api/tandas/1/cancel")
        .set("Authorization", `Bearer ${member.token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    } finally {
      db.close();
    }
  });

  it("lists participants for authenticated members", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });
      const member = await createAuthenticatedUser(app, {
        email: "member@example.com",
        name: "Member",
      });

      await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({
          name: "Tanda Uno",
          contributionAmount: 1000,
        });

      await request(app)
        .post("/api/tandas/1/join")
        .set("Authorization", `Bearer ${member.token}`);

      const response = await request(app)
        .get("/api/tandas/1/participants")
        .set("Authorization", `Bearer ${member.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    } finally {
      db.close();
    }
  });

  it("forbids participant listing to outsiders", async () => {
    const { app, db } = createTestApp();

    try {
      const organizer = await createAuthenticatedUser(app, {
        email: "organizer@example.com",
        name: "Organizer",
      });
      const outsider = await createAuthenticatedUser(app, {
        email: "outsider@example.com",
        name: "Outsider",
      });

      await request(app)
        .post("/api/tandas")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({
          name: "Tanda Uno",
          contributionAmount: 1000,
        });

      const response = await request(app)
        .get("/api/tandas/1/participants")
        .set("Authorization", `Bearer ${outsider.token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    } finally {
      db.close();
    }
  });
});
