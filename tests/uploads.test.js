import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import prisma from '../src/models/prisma.js';
import cloudinary from '../src/config/cloudinary.js';
import { startServer, resetDb } from './helpers.js';

// Stand in for Cloudinary so multer's own limits decide the outcome, not missing credentials.
cloudinary.uploader.upload_stream = (options, cb) => new Writable({
  write(chunk, encoding, next) { next(); },
  final(done) {
    cb(null, { secure_url: `https://res.cloudinary.test/${options.public_id}`, public_id: options.public_id, resource_type: options.resource_type });
    done();
  },
});
cloudinary.uploader.destroy = (publicId, options, cb) => cb();

let server;
before(async () => { server = await startServer(); });
beforeEach(async () => {
  await resetDb();
  await prisma.contactSubmission.deleteMany();
  await prisma.careerSubmission.deleteMany();
});
after(() => server.close());

const MB = 1024 * 1024;
const fields = { fullName: 'Layla', email: 'layla@example.com', message: 'Need a 1:500 model' };

const post = (path, fileField, files) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  for (const { name, size, type = 'application/pdf' } of files) {
    form.append(fileField, new Blob([new Uint8Array(size)], { type }), name);
  }
  return fetch(server.base + path, { method: 'POST', body: form });
};

test('POST /contact stores a drawing within the limits', async () => {
  const res = await post('/contact', 'drawings', [{ name: 'plan.pdf', size: 1024 }]);
  assert.equal(res.status, 201);
  assert.equal((await res.json()).attachments.length, 1);
});

test('POST /contact rejects a drawing over 10MB', async () => {
  const res = await post('/contact', 'drawings', [{ name: 'plan.pdf', size: 10 * MB + 1 }]);
  assert.equal(res.status, 400);
  assert.equal(await prisma.contactSubmission.count(), 0);
});

test('POST /contact rejects more than 5 drawings', async () => {
  const res = await post('/contact', 'drawings', Array.from({ length: 6 }, (_, i) => ({ name: `plan${i}.pdf`, size: 1024 })));
  assert.equal(res.status, 400);
  assert.equal(await prisma.contactSubmission.count(), 0);
});

test('POST /careers rejects a resume that is not a PDF', async () => {
  const res = await post('/careers', 'resume', [{ name: 'cv.html', size: 64, type: 'text/html' }]);
  assert.notEqual(res.status, 201);
  assert.match((await res.json()).message, /Only PDF/);
  assert.equal(await prisma.careerSubmission.count(), 0);
});
