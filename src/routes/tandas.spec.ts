import request from "supertest";
import { createTestApp } from "../tests/test-app";

async function createUser(app: Parameters<typeof request>[0], email: string, name: string): Promise<number> {
  const response = await request(app).post("/api/users").send({ email, name });
  return Number(response.body.id);
}

describe("Tandas API", () => {
  it("creates a tanda and allows users to join", async () => {
    const { app } = createTestApp();
    const organizerId = await createUser(app, "org@example.com", "Organizer");
    const memberId = await createUser(app, "member@example.com", "Member");

    const createTandaResponse = await request(app).post("/api/tandas").send({
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
    });

    expect(createTandaResponse.status).toBe(201);
    expect(createTandaResponse.body).toMatchObject({
      id: 1,
      name: "Tanda Enero",
      organizerId,
      contributionAmount: 1000,
      status: "forming",
    });

    const joinResponse = await request(app).post("/api/tandas/1/join").send({ userId: memberId });
    expect(joinResponse.status).toBe(201);

    const listParticipantsResponse = await request(app).get("/api/tandas/1/participants");
    expect(listParticipantsResponse.status).toBe(200);
    expect(listParticipantsResponse.body).toHaveLength(2);

    const listTandasResponse = await request(app).get(`/api/tandas?userId=${organizerId}`);
    expect(listTandasResponse.status).toBe(200);
    expect(listTandasResponse.body).toHaveLength(1);
  });

  it("returns 401 when starting without JWT", async () => {
    const { app } = createTestApp();
    const organizerId = await createUser(app, "org2@example.com", "Organizer2");

    await request(app).post("/api/tandas").send({
      name: "Tanda Febrero",
      organizerId,
      contributionAmount: 500,
    });

    const startResponse = await request(app).post("/api/tandas/1/start");
    expect(startResponse.status).toBe(401);
    expect(startResponse.body.error.code).toBe("UNAUTHORIZED");
  });

  it("starts with 3 members and advances rounds", async () => {
    const { app, createToken } = createTestApp();
    const organizerId = await createUser(app, "org3@example.com", "Organizer3");
    const memberAId = await createUser(app, "membera@example.com", "MemberA");
    const memberBId = await createUser(app, "memberb@example.com", "MemberB");

    await request(app).post("/api/tandas").send({
      name: "Tanda Marzo",
      organizerId,
      contributionAmount: 700,
    });

    await request(app).post("/api/tandas/1/join").send({ userId: memberAId });
    await request(app).post("/api/tandas/1/join").send({ userId: memberBId });

    const token = createToken(organizerId);
    const startResponse = await request(app)
      .post("/api/tandas/1/start")
      .set("Authorization", `Bearer ${token}`);

    expect(startResponse.status).toBe(200);
    expect(startResponse.body.status).toBe("active");
    expect(startResponse.body.currentRound).toBe(1);

    const advanceResponse = await request(app)
      .post("/api/tandas/1/advance")
      .set("Authorization", `Bearer ${token}`);

    expect(advanceResponse.status).toBe(200);
    expect(["active", "completed"]).toContain(advanceResponse.body.status);
  });
});
