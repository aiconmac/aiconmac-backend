import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import prisma from '../src/models/prisma.js';
import { startServer, resetDb, adminToken, json } from './helpers.js';

let server;
before(async () => { server = await startServer(); });
beforeEach(async () => {
  await resetDb();
  await prisma.user.create({
    data: { email: 'user@test.local', password: await bcrypt.hash('secret123', 10) },
  });
});
after(() => server.close());

const login = (email, password) => json(server.base, '/auth/login', { method: 'POST', body: { email, password } });

test('wrong password is answered with 401', async () => {
  const { status, body } = await login('user@test.local', 'nope');
  assert.equal(status, 401);
  assert.equal(body.message, 'Invalid credentials');
});

test('unknown email is answered with 401 and the same message', async () => {
  const { status, body } = await login('ghost@test.local', 'secret123');
  assert.equal(status, 401);
  assert.equal(body.message, 'Invalid credentials');
});

test('correct credentials log in', async () => {
  const { status, body } = await login('user@test.local', 'secret123');
  assert.equal(status, 200);
  assert.ok(body.token);
});

test('register rejects passwords shorter than 12 characters', async () => {
  const token = await adminToken();
  const register = (password) => json(server.base, '/auth/register', {
    method: 'POST', token, body: { email: `new-${password.length}@test.local`, password },
  });
  const short = await register('elevenchars');
  assert.equal(short.status, 400);
  assert.equal(short.body.message, 'Password must be at least 12 characters');
  assert.equal((await register('twelve-chars')).status, 201);
});
