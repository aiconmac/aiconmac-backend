import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, json } from './helpers.js';

let server;
before(async () => { server = await startServer(); });
afterEach(() => { process.env.NODE_ENV = 'test'; });
after(() => server.close());

test('unexpected 500s send a generic message and no stack in production', async () => {
  process.env.NODE_ENV = 'production';
  const { status, body } = await json(server.base, '/auth/login', { method: 'POST', body: { email: {}, password: 'x' } });
  assert.equal(status, 500);
  assert.deepEqual(body, { message: 'Internal server error' });
});

test('4xx messages still reach the caller', async () => {
  process.env.NODE_ENV = 'production';
  const { status, body } = await json(server.base, '/testimonials/00000000-0000-4000-8000-000000000000');
  assert.equal(status, 404);
  assert.deepEqual(body, { message: 'Testimonial not found' });
});
