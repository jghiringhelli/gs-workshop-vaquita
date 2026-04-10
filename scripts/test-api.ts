import { createApp } from '../src/app';
import request from 'supertest';

const app = createApp();

console.log('Testing user creation...');

request(app)
  .post('/api/users')
  .send({
    email: 'alice@example.com',
    name: 'Alice',
  })
  .then((response) => {
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(response.body, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
