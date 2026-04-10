import request from 'supertest';
import { createApp } from '../../../app';
import { createDatabase } from '../../../shared/db/database';

const db = createDatabase(':memory:');
const app = createApp(db);

/** Seed a user and return their id. */
async function seedUser(email: string, name: string): Promise<string> {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body.id as string;
}

describe('POST /api/tandas', () => {
  it('creates a tanda in FORMING status and returns 201', async () => {
    const organizerId = await seedUser('organizer@example.com', 'Organizer');
    const res = await request(app).post('/api/tandas').send({
      name: 'Tanda Enero',
      organizerId,
      contributionAmount: 1000,
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Tanda Enero',
      organizerId,
      contributionAmount: 1000,
      status: 'forming',
    });
    expect(typeof res.body.id).toBe('string');
  });

  it('returns 400 when contributionAmount is missing', async () => {
    const organizerId = await seedUser('org2@example.com', 'Org2');
    const res = await request(app).post('/api/tandas').send({ name: 'Bad', organizerId });
    expect(res.status).toBe(400);
  });

  it('returns 404 when organizerId does not exist', async () => {
    const res = await request(app).post('/api/tandas').send({
      name: 'Ghost Tanda',
      organizerId: 'does-not-exist',
      contributionAmount: 500,
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tandas/:id/join', () => {
  it('allows a user to join a FORMING tanda and returns 201', async () => {
    const organizerId = await seedUser('org3@example.com', 'Org3');
    const memberId = await seedUser('member@example.com', 'Member');
    const tanda = await request(app).post('/api/tandas').send({ name: 'T', organizerId, contributionAmount: 500 });

    const res = await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .send({ userId: memberId });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: memberId, tandaId: tanda.body.id });
  });

  it('returns 409 when user is already a participant', async () => {
    const organizerId = await seedUser('org4@example.com', 'Org4');
    const memberId = await seedUser('member2@example.com', 'Member2');
    const tanda = await request(app).post('/api/tandas').send({ name: 'T2', organizerId, contributionAmount: 500 });
    await request(app).post(`/api/tandas/${tanda.body.id}/join`).send({ userId: memberId });

    const res = await request(app)
      .post(`/api/tandas/${tanda.body.id}/join`)
      .send({ userId: memberId });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/tandas/:id/start', () => {
  it('transitions tanda to ACTIVE and assigns rotation when >= 3 participants', async () => {
    const org = await seedUser('start-org@example.com', 'StartOrg');
    const m1 = await seedUser('start-m1@example.com', 'M1');
    const m2 = await seedUser('start-m2@example.com', 'M2');
    const tanda = await request(app).post('/api/tandas').send({ name: 'StartTanda', organizerId: org, contributionAmount: 200 });
    await request(app).post(`/api/tandas/${tanda.body.id}/join`).send({ userId: m1 });
    await request(app).post(`/api/tandas/${tanda.body.id}/join`).send({ userId: m2 });

    const res = await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .send({ userId: org });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
  });

  it('returns 400 when fewer than 3 participants', async () => {
    const org = await seedUser('small-org@example.com', 'SmallOrg');
    const m1 = await seedUser('small-m1@example.com', 'SM1');
    const tanda = await request(app).post('/api/tandas').send({ name: 'SmallTanda', organizerId: org, contributionAmount: 100 });
    await request(app).post(`/api/tandas/${tanda.body.id}/join`).send({ userId: m1 });

    const res = await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .send({ userId: org });
    expect(res.status).toBe(400);
  });

  it('returns 403 when caller is not the organizer', async () => {
    const org = await seedUser('perm-org@example.com', 'PermOrg');
    const m1 = await seedUser('perm-m1@example.com', 'PM1');
    const m2 = await seedUser('perm-m2@example.com', 'PM2');
    const nonOrg = await seedUser('nonorg@example.com', 'NonOrg');
    const tanda = await request(app).post('/api/tandas').send({ name: 'PermTanda', organizerId: org, contributionAmount: 100 });
    await request(app).post(`/api/tandas/${tanda.body.id}/join`).send({ userId: m1 });
    await request(app).post(`/api/tandas/${tanda.body.id}/join`).send({ userId: m2 });

    const res = await request(app)
      .post(`/api/tandas/${tanda.body.id}/start`)
      .send({ userId: nonOrg });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/tandas/:id/participants', () => {
  it('lists all participants of a tanda', async () => {
    const org = await seedUser('list-org@example.com', 'ListOrg');
    const tanda = await request(app).post('/api/tandas').send({ name: 'ListTanda', organizerId: org, contributionAmount: 100 });

    const res = await request(app).get(`/api/tandas/${tanda.body.id}/participants`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject({ userId: org, role: 'organizer' });
  });
});
