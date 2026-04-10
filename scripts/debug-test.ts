import { createApp } from '../src/app';
import request from 'supertest';

const app = createApp();

console.log('Test 1: Create user');

request(app)
  .post('/api/users')
  .send({ email: 'test@example.com', name: 'Test' })
  .then((r1) => {
    console.log('  Status:', r1.status, 'Body:', r1.body);
    
    console.log('\nTest 2: List users (should have 1)');
    return request(app).get('/api/users');
  })
  .then((r2) => {
    console.log('  Status:', r2.status, 'Body:', r2.body);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
