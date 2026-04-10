import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { createDatabase } from './db/database';

describe('Full Tanda Simulation', () => {
  let app: ReturnType<typeof createApp>;
  let organizerToken: string;
  let organizerId: string;
  let member1Id: string;
  let member2Id: string;
  let tandaId: string;
  let organizerParticipantId: string;
  let member1ParticipantId: string;
  let member2ParticipantId: string;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-simulation';
    const db = createDatabase(':memory:');
    app = createApp(db);
  });

  it('simulates a complete 3-person tanda from registration to completion', async () => {
    // === STEP 1: Register Users ===
    const organizerRes = await request(app)
      .post('/api/users')
      .send({ email: 'organizer@example.com', name: 'Ana Garcia' })
      .expect(201);
    organizerId = organizerRes.body.user.id;
    organizerToken = organizerRes.body.token;
    expect(organizerRes.body.user.email).toBe('organizer@example.com');
    expect(organizerRes.body.token).toBeTruthy();

    const member1Res = await request(app)
      .post('/api/users')
      .send({ email: 'member1@example.com', name: "Carlos O'Brien" })
      .expect(201);
    member1Id = member1Res.body.user.id;

    const member2Res = await request(app)
      .post('/api/users')
      .send({ email: 'member2@example.com', name: 'Maria Lopez' })
      .expect(201);
    member2Id = member2Res.body.user.id;

    // Verify users listed
    const usersRes = await request(app).get('/api/users').expect(200);
    expect(usersRes.body).toHaveLength(3);

    // === STEP 2: Create Tanda ===
    const createTandaRes = await request(app)
      .post('/api/tandas')
      .send({ name: 'Tanda Enero', organizerId, contributionAmount: 1000 })
      .expect(201);
    tandaId = createTandaRes.body.id;
    expect(createTandaRes.body.status).toBe('forming');
    expect(createTandaRes.body.organizerId).toBe(organizerId);

    // === STEP 3: Members Join ===
    const join1Res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: member1Id })
      .expect(201);
    member1ParticipantId = join1Res.body.id;
    expect(join1Res.body.role).toBe('member');

    const join2Res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: member2Id })
      .expect(201);
    member2ParticipantId = join2Res.body.id;

    // Check participants (3 total: organizer + 2 members)
    const participantsRes = await request(app)
      .get(`/api/tandas/${tandaId}/participants`)
      .expect(200);
    expect(participantsRes.body).toHaveLength(3);
    const organizerParticipant = participantsRes.body.find((p: any) => p.role === 'organizer');
    expect(organizerParticipant).toBeDefined();
    organizerParticipantId = organizerParticipant.id;

    // === STEP 4: Start Tanda ===
    const startRes = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(200);
    expect(startRes.body.status).toBe('active');
    expect(startRes.body.totalRounds).toBe(3);
    expect(startRes.body.currentRound).toBe(1);

    // Verify rotation positions assigned
    const afterStartParticipants = await request(app)
      .get(`/api/tandas/${tandaId}/participants`)
      .expect(200);
    afterStartParticipants.body.forEach((p: any) => {
      expect(p.rotationPosition).toBeGreaterThan(0);
    });

    // === ROUNDS 1, 2, 3: Each round all 3 participants contribute ===
    const allParticipantIds = [organizerParticipantId, member1ParticipantId, member2ParticipantId];

    for (let round = 1; round <= 3; round++) {
      // Record contributions for all participants in this round
      for (const participantId of allParticipantIds) {
        const contribRes = await request(app)
          .post(`/api/tandas/${tandaId}/contributions`)
          .send({ participantId, amount: 1000, status: 'paid' })
          .expect(201);
        expect(contribRes.body.round).toBe(round);
        expect(contribRes.body.status).toBe('paid');
        expect(contribRes.body.amount).toBe(1000);
      }

      // Check round summary
      const roundSummaryRes = await request(app)
        .get(`/api/tandas/${tandaId}/rounds/${round}`)
        .expect(200);
      expect(roundSummaryRes.body.round).toBe(round);
      expect(roundSummaryRes.body.contributions).toHaveLength(3);
      expect(roundSummaryRes.body.totalCollected).toBe(3000);
      expect(roundSummaryRes.body.allPaid).toBe(true);
      expect(roundSummaryRes.body.recipientParticipantId).toBeTruthy();

      // Advance to next round (organizer only) — last round auto-completes
      const advanceRes = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      if (round < 3) {
        expect(advanceRes.body.currentRound).toBe(round + 1);
        expect(advanceRes.body.status).toBe('active');
      } else {
        // After last round, tanda auto-completes
        expect(advanceRes.body.status).toBe('completed');
      }
    }

    // === FINAL CHECKS ===
    const finalTanda = await request(app)
      .get(`/api/tandas/${tandaId}`)
      .expect(200);
    expect(finalTanda.body.status).toBe('completed');

    // Check contribution history for organizer participant
    const historyRes = await request(app)
      .get(`/api/tandas/${tandaId}/participants/${organizerParticipantId}/history`)
      .expect(200);
    expect(historyRes.body).toHaveLength(3);
    historyRes.body.forEach((c: any) => {
      expect(c.status).toBe('paid');
      expect(c.amount).toBe(1000);
    });

    // Verify tanda is in completed tandas list for organizer
    const tandaListRes = await request(app)
      .get(`/api/tandas?userId=${organizerId}`)
      .expect(200);
    expect(tandaListRes.body).toHaveLength(1);
    expect(tandaListRes.body[0].status).toBe('completed');
  });

  it('rejects invalid name with special characters', async () => {
    await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com', name: 'Alice@123' })
      .expect(400);
  });

  it('rejects duplicate email registration', async () => {
    await request(app)
      .post('/api/users')
      .send({ email: 'dup@example.com', name: 'Alice Smith' })
      .expect(201);
    await request(app)
      .post('/api/users')
      .send({ email: 'dup@example.com', name: 'Bob Jones' })
      .expect(409);
  });

  it('prevents starting tanda without enough participants', async () => {
    process.env.JWT_SECRET = 'test-secret-key-for-simulation';
    const userRes = await request(app)
      .post('/api/users')
      .send({ email: 'solo@example.com', name: 'Solo User' })
      .expect(201);
    const token = userRes.body.token;
    const userId = userRes.body.user.id;

    const tandaRes = await request(app)
      .post('/api/tandas')
      .send({ name: 'Solo Tanda', organizerId: userId, contributionAmount: 500 })
      .expect(201);

    await request(app)
      .post(`/api/tandas/${tandaRes.body.id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
  });

  it('prevents non-organizer from starting tanda', async () => {
    process.env.JWT_SECRET = 'test-secret-key-for-simulation';
    const org = await request(app).post('/api/users').send({ email: 'org@example.com', name: 'Organizer One' }).expect(201);
    const m1 = await request(app).post('/api/users').send({ email: 'm1@example.com', name: 'Member One' }).expect(201);
    const m2 = await request(app).post('/api/users').send({ email: 'm2@example.com', name: 'Member Two' }).expect(201);
    const m3 = await request(app).post('/api/users').send({ email: 'm3@example.com', name: 'Member Three' }).expect(201);

    const tanda = await request(app)
      .post('/api/tandas')
      .send({ name: 'Test Tanda', organizerId: org.body.user.id, contributionAmount: 500 })
      .expect(201);

    await request(app).post(`/api/tandas/${tanda.body.id}/join`).send({ userId: m1.body.user.id }).expect(201);
    await request(app).post(`/api/tandas/${tanda.body.id}/join`).send({ userId: m2.body.user.id }).expect(201);
    await request(app).post(`/api/tandas/${tanda.body.id}/join`).send({ userId: m3.body.user.id }).expect(201);

    // Use member's token, not organizer's
    await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .set('Authorization', `Bearer ${m1.body.token}`)
      .expect(403);
  });
});
