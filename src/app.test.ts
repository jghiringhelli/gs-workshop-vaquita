import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

describe('GET /health', () => {
  const app = createApp();

  it('responds 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('includes uptime and environment in the response', async () => {
    const res = await request(app).get('/health');
    expect(typeof res.body.data.uptime).toBe('number');
    expect(res.body.data.environment).toBe('test');
  });
});

describe('Unknown route', () => {
  const app = createApp();

  it('responds 404 for an unknown path', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
