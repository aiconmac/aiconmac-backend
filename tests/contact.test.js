import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/models/prisma.js';
import * as contactService from '../src/services/contactService.js';
import { startServer, resetDb, adminToken, json } from './helpers.js';

let server;
before(async () => { server = await startServer(); });
beforeEach(async () => {
  await resetDb();
  await prisma.contactSubmission.deleteMany();
});
after(() => server.close());

const fields = { fullName: 'Layla', email: 'layla@example.com', projectType: 'masterplan', message: 'Need a 1:500 model' };

test('POST /contact still accepts JSON and returns empty attachments', async () => {
  const { status, body } = await json(server.base, '/contact', { method: 'POST', body: fields });
  assert.equal(status, 201);
  assert.equal(body.fullName, 'Layla');
  assert.deepEqual(body.attachments, []);
});

test('POST /contact accepts multipart without files and ignores unknown fields', async () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...fields, honeypot: 'x' })) form.append(key, value);
  const res = await fetch(`${server.base}/contact`, { method: 'POST', body: form });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.projectType, 'masterplan');
  assert.deepEqual(body.attachments, []);
});

test('POST /contact rejects a disallowed extension with 400', async () => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append('drawings', new Blob(['MZ'], { type: 'application/octet-stream' }), 'tool.exe');
  const res = await fetch(`${server.base}/contact`, { method: 'POST', body: form });
  assert.equal(res.status, 400);
  assert.equal(await prisma.contactSubmission.count(), 0);
});

test('service stores uploaded drawings as {url, name}', async () => {
  const submission = await contactService.createContactSubmission(fields, [
    { path: 'https://res.cloudinary.test/raw/plan.dwg', originalname: 'plan.dwg' },
    { path: 'https://res.cloudinary.test/raw/site.pdf', originalname: 'site.pdf' },
  ]);
  assert.deepEqual(submission.attachments, [
    { url: 'https://res.cloudinary.test/raw/plan.dwg', name: 'plan.dwg' },
    { url: 'https://res.cloudinary.test/raw/site.pdf', name: 'site.pdf' },
  ]);
});

test('PUT /contact/:id only changes isRead', async () => {
  const drawing = { url: 'https://res.cloudinary.test/raw/plan.dwg', name: 'plan.dwg' };
  const { id } = await contactService.createContactSubmission(fields, [{ path: drawing.url, originalname: drawing.name }]);
  const { status } = await json(server.base, `/contact/${id}`, {
    method: 'PUT',
    token: await adminToken(),
    body: { isRead: true, email: 'evil@x.y', attachments: [{ url: 'https://evil' }] },
  });
  assert.equal(status, 200);
  const stored = await prisma.contactSubmission.findUnique({ where: { id } });
  assert.equal(stored.isRead, true);
  assert.equal(stored.email, fields.email);
  assert.deepEqual(stored.attachments, [drawing]);
});

test('service requires fullName, email and message', async () => {
  await assert.rejects(contactService.createContactSubmission({ email: 'a@b.c' }), { status: 400 });
});

test('POST /contact rejects a message over 5000 characters', async () => {
  const { status, body } = await json(server.base, '/contact', { method: 'POST', body: { ...fields, message: 'x'.repeat(6000) } });
  assert.equal(status, 400);
  assert.equal(body.message, 'message must be at most 5000 characters');
  assert.equal(await prisma.contactSubmission.count(), 0);
});
