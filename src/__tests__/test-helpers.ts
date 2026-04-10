import request from 'supertest';
import app from '../app';

export async function createUser(email: string, name: string): Promise<{ id: number; token: string }> {
  const res = await request(app).post('/api/users').send({ email, name });
  return { id: res.body.id, token: res.body.token };
}

export async function createTandaWithOrganizer(
  opts?: { contributionAmount?: number; totalRounds?: number }
): Promise<{ tanda: { id: number }; organizer: { id: number; token: string } }> {
  const organizer = await createUser('org@test.com', 'Organizer');
  const res = await request(app)
    .post('/api/tandas')
    .set('Authorization', `Bearer ${organizer.token}`)
    .send({
      name: 'Test Tanda',
      contributionAmount: opts?.contributionAmount ?? 1000,
      totalRounds: opts?.totalRounds ?? 4,
    });
  return { tanda: res.body, organizer };
}

export async function setupActiveTanda(totalRounds = 3): Promise<{
  tandaId: number;
  organizer: { id: number; token: string };
  members: { id: number; token: string }[];
  participantIds: number[];
}> {
  const organizer = await createUser('org@test.com', 'Organizer');
  const tandaRes = await request(app)
    .post('/api/tandas')
    .set('Authorization', `Bearer ${organizer.token}`)
    .send({ name: 'Active Tanda', contributionAmount: 1000, totalRounds });
  const tandaId = tandaRes.body.id;

  const m1 = await createUser('m1@test.com', 'M1');
  const m2 = await createUser('m2@test.com', 'M2');

  await request(app).post(`/api/tandas/${tandaId}/join`).set('Authorization', `Bearer ${m1.token}`);
  await request(app).post(`/api/tandas/${tandaId}/join`).set('Authorization', `Bearer ${m2.token}`);

  await request(app)
    .post(`/api/tandas/${tandaId}/start`)
    .set('Authorization', `Bearer ${organizer.token}`);

  const participantsRes = await request(app)
    .get(`/api/tandas/${tandaId}/participants`)
    .set('Authorization', `Bearer ${organizer.token}`);
  const participantIds = participantsRes.body.map((p: { id: number }) => p.id);

  return { tandaId, organizer, members: [m1, m2], participantIds };
}
