import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/models/prisma.js';
import { startServer, resetDb, adminToken, json } from './helpers.js';

let server;
before(async () => { server = await startServer(); });
beforeEach(async () => {
  await resetDb();
  await prisma.testimonial.deleteMany();
});
after(() => server.close());

const submission = { quote: 'Superb model', author: 'Omar', isApproved: true };

const storedApproval = async (id) => (await prisma.testimonial.findUnique({ where: { id } })).isApproved;

test('anonymous POST /testimonials cannot self-approve', async () => {
  const { status, body } = await json(server.base, '/testimonials', { method: 'POST', body: submission });
  assert.equal(status, 201);
  assert.equal(await storedApproval(body.id), false);
});

test('POST /testimonials with an invalid token cannot self-approve', async () => {
  const { status, body } = await json(server.base, '/testimonials', { method: 'POST', body: submission, token: 'not-a-jwt' });
  assert.equal(status, 201);
  assert.equal(await storedApproval(body.id), false);
});

test('admin POST /testimonials keeps isApproved', async () => {
  const { status, body } = await json(server.base, '/testimonials', { method: 'POST', body: submission, token: await adminToken() });
  assert.equal(status, 201);
  assert.equal(await storedApproval(body.id), true);
});
