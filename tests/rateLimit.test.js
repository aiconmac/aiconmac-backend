import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import prisma from '../src/models/prisma.js';
import { startServer, resetDb } from './helpers.js';

let server;
before(async () => {
  server = await startServer();
  await resetDb();
  await prisma.user.create({ data: { email: 'user@test.local', password: await bcrypt.hash('secret123', 10) } });
});
after(() => server.close());

const post = (path, body, ip) => fetch(server.base + path, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(ip && { 'x-forwarded-for': ip }) },
  body: JSON.stringify(body),
});
const login = (password, ip) => post('/auth/login', { email: 'user@test.local', password }, ip);

test('successful logins do not use up the login budget', async () => {
  for (let i = 0; i < 12; i++) assert.equal((await login('secret123')).status, 200);
});

test('login is throttled after 10 failures, even with the right password', async () => {
  for (let i = 0; i < 10; i++) assert.equal((await login('wrong')).status, 401);
  const res = await login('secret123');
  assert.equal(res.status, 429);
  assert.equal((await res.json()).message, 'Too many login attempts, try again later');
});

test('another client IP behind the proxy keeps its own login budget', async () => {
  assert.equal((await login('secret123', '203.0.113.9')).status, 200);
});

for (const path of ['/contact', '/testimonials', '/careers']) {
  test(`POST ${path} is throttled after 5 submissions`, async () => {
    for (let i = 0; i < 5; i++) assert.notEqual((await post(path, {})).status, 429);
    const res = await post(path, {});
    assert.equal(res.status, 429);
    assert.equal((await res.json()).message, 'Too many submissions, try again later');
  });
}
