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

const post = (path, body, ip, cfClient) => fetch(server.base + path, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    ...(ip && { 'x-forwarded-for': ip }),
    ...(cfClient && { 'cf-connecting-ip': cfClient }),
  },
  body: JSON.stringify(body),
});
const login = (password, ip, cfClient) => post('/auth/login', { email: 'user@test.local', password }, ip, cfClient);
const CLOUDFLARE_EDGE = '162.158.10.20';

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

test('CF-Connecting-IP from outside Cloudflare does not buy a fresh budget', async () => {
  assert.equal((await login('secret123', undefined, '198.51.100.7')).status, 429);
});

test('behind Cloudflare, each CF-Connecting-IP has its own budget', async () => {
  for (let i = 0; i < 10; i++) assert.equal((await login('wrong', CLOUDFLARE_EDGE, '198.51.100.20')).status, 401);
  assert.equal((await login('secret123', CLOUDFLARE_EDGE, '198.51.100.20')).status, 429);
  assert.equal((await login('secret123', CLOUDFLARE_EDGE, '198.51.100.21')).status, 200);
});

for (const path of ['/contact', '/testimonials', '/careers', '/brochure-request']) {
  test(`POST ${path} is throttled after 5 submissions`, async () => {
    for (let i = 0; i < 5; i++) assert.notEqual((await post(path, {})).status, 429);
    const res = await post(path, {});
    assert.equal(res.status, 429);
    assert.equal((await res.json()).message, 'Too many submissions, try again later');
  });
}

test('POST /brochure-request rejects a pathological email quickly', async () => {
  const started = performance.now();
  const res = await post('/brochure-request', { email: `a@${'.'.repeat(90000)} ` }, '203.0.113.40');
  const elapsed = performance.now() - started;
  assert.equal(res.status, 400);
  assert.ok(elapsed < 50, `took ${elapsed}ms`);
});
