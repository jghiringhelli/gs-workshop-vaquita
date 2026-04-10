import request from 'supertest';
import app from '../app';

/** Creates a user via the API and returns the user object and JWT token. */
export async function createUserAndToken(overrides: {
  email?: string;
  name?: string;
} = {}): Promise<{ user: { id: string; email: string; name: string }; token: string }> {
  const email = overrides.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const name = overrides.name ?? 'Test User';

  const res = await request(app).post('/api/users').send({ email, name });

  if (res.status !== 201) {
    throw new Error(`createUserAndToken failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { user: res.body.user as { id: string; email: string; name: string }, token: res.body.token as string };
}

/** Creates a tanda via the API and returns the tanda object. */
export async function seedTanda(
  token: string,
  overrides: { name?: string; contributionAmount?: number } = {},
): Promise<{ id: string; name: string; contributionAmount: number; status: string; organizerId: string }> {
  const res = await request(app)
    .post('/api/tandas')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: overrides.name ?? 'Test Tanda',
      contributionAmount: overrides.contributionAmount ?? 100,
    });

  if (res.status !== 201) {
    throw new Error(`seedTanda failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return res.body.tanda as {
    id: string;
    name: string;
    contributionAmount: number;
    status: string;
    organizerId: string;
  };
}

/** Joins a user to a tanda and returns the participant object. */
export async function joinTanda(
  tandaId: string,
  token: string,
): Promise<{ id: string; userId: string; tandaId: string; role: string }> {
  const res = await request(app)
    .post(`/api/tandas/${tandaId}/join`)
    .set('Authorization', `Bearer ${token}`);

  if (res.status !== 201) {
    throw new Error(`joinTanda failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return res.body.participant as { id: string; userId: string; tandaId: string; role: string };
}

/**
 * Starts a tanda (must already have enough participants).
 * Returns the updated tanda object.
 */
export async function startTanda(
  tandaId: string,
  organizerToken: string,
): Promise<{ id: string; status: string; totalRounds: number }> {
  const res = await request(app)
    .post(`/api/tandas/${tandaId}/start`)
    .set('Authorization', `Bearer ${organizerToken}`);

  if (res.status !== 200) {
    throw new Error(`startTanda failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return res.body.tanda as { id: string; status: string; totalRounds: number };
}
