import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/models/prisma.js';
import * as careerService from '../src/services/careerService.js';
import { startServer, resetDb, adminToken, json } from './helpers.js';

let server;
before(async () => { server = await startServer(); });
beforeEach(async () => {
  await resetDb();
  await prisma.careerSubmission.deleteMany();
});
after(() => server.close());

const fields = { fullName: 'Samir', email: 'samir@example.com', phone: '+971500000000', message: 'Model maker' };

test('PUT /careers/:id only changes isRead', async () => {
  const resumeUrl = 'https://res.cloudinary.test/raw/cv.pdf';
  const { id } = await prisma.careerSubmission.create({ data: { ...fields, resumeUrl } });
  const { status } = await json(server.base, `/careers/${id}`, {
    method: 'PUT',
    token: await adminToken(),
    body: { isRead: true, email: 'evil@x.y', resumeUrl: 'https://evil' },
  });
  assert.equal(status, 200);
  const stored = await prisma.careerSubmission.findUnique({ where: { id } });
  assert.equal(stored.isRead, true);
  assert.equal(stored.email, fields.email);
  assert.equal(stored.resumeUrl, resumeUrl);
});

test('service ignores id and isRead on create', async () => {
  const id = '00000000-0000-4000-8000-000000000000';
  const submission = await careerService.createCareerSubmission({ ...fields, id, isRead: true });
  assert.notEqual(submission.id, id);
  assert.equal(submission.isRead, false);
  assert.equal(submission.fullName, fields.fullName);
});

test('service rejects a submission without an email', async () => {
  await assert.rejects(careerService.createCareerSubmission({ ...fields, email: '' }), { status: 400 });
  assert.equal(await prisma.careerSubmission.count(), 0);
});

test('POST /careers without required fields returns 400', async () => {
  const { status } = await json(server.base, '/careers', { method: 'POST', body: {} });
  assert.equal(status, 400);
});
