import request from 'supertest';
import { createApp } from '../../../app';
import { createDatabase } from '../../../shared/db/database';

const db = createDatabase(':memory:');
const app = createApp(db);

describe('GET /api/users', () => {
  it('returns an array of all users', async () => {
    await request(app).post('/api/users').send({ email: 'list1@example.com', name: 'List1' });
    await request(app).post('/api/users').send({ email: 'list2@example.com', name: 'List2' });

    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const emails = res.body.map((u: { email: string }) => u.email);
    expect(emails).toContain('list1@example.com');
    expect(emails).toContain('list2@example.com');
  });
});

describe('POST /api/users', () => {
  it('creates a user and returns 201 with id, email, name', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
    expect(typeof res.body.id).toBe('string');
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Alice' });

    expect(res.status).toBe(400);
  });

  it('returns 409 when email is already registered', async () => {
    await request(app).post('/api/users').send({ email: 'bob@example.com', name: 'Bob' });
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'bob@example.com', name: 'Bob Again' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/users/:id', () => {
  it('returns the user when found', async () => {
    const created = await request(app)
      .post('/api/users')
      .send({ email: 'carol@example.com', name: 'Carol' });

    const res = await request(app).get(`/api/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'carol@example.com', name: 'Carol' });
  });

  it('returns 404 when user does not exist', async () => {
    const res = await request(app).get('/api/users/nonexistent-id');
    expect(res.status).toBe(404);
  });
});
