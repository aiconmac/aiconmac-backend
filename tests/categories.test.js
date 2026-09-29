import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/models/prisma.js';
import { startServer, resetDb, adminToken, json } from './helpers.js';

let server;
let token;
before(async () => { server = await startServer(); });
beforeEach(async () => {
  await resetDb();
  token = await adminToken();
});
after(() => server.close());

const seed = () => prisma.category.createMany({
  data: [
    { slug: 'masterplan', name: 'Masterplan', name_ar: 'مخطط رئيسي', sortOrder: 2 },
    { slug: 'architectural', name: 'Architectural', name_ar: 'معماري', sortOrder: 1 },
  ],
});

test('GET /categories is public and ordered by sortOrder', async () => {
  await seed();
  const { status, body } = await json(server.base, '/categories');
  assert.equal(status, 200);
  assert.deepEqual(body.map(({ slug, name, name_ar, sortOrder }) => ({ slug, name, name_ar, sortOrder })), [
    { slug: 'architectural', name: 'Architectural', name_ar: 'معماري', sortOrder: 1 },
    { slug: 'masterplan', name: 'Masterplan', name_ar: 'مخطط رئيسي', sortOrder: 2 },
  ]);
  assert.deepEqual(Object.keys(body[0]).sort(), ['id', 'name', 'name_ar', 'slug', 'sortOrder']);
});

test('writes require a token', async () => {
  const { status } = await json(server.base, '/categories', { method: 'POST', body: { slug: 'x', name: 'X' } });
  assert.equal(status, 401);
});

test('POST creates a category and trims text', async () => {
  const { status, body } = await json(server.base, '/categories', {
    method: 'POST', token, body: { slug: 'industrial', name: ' Industrial ', name_ar: '', sortOrder: '3' },
  });
  assert.equal(status, 201);
  assert.equal(body.name, 'Industrial');
  assert.equal(body.name_ar, null);
  assert.equal(body.sortOrder, 3);
});

test('POST rejects a bad slug with 400 and a duplicate slug with 409', async () => {
  await seed();
  const bad = await json(server.base, '/categories', { method: 'POST', token, body: { slug: 'Master Plan', name: 'Master Plan' } });
  assert.equal(bad.status, 400);
  const dup = await json(server.base, '/categories', { method: 'POST', token, body: { slug: 'masterplan', name: 'Again' } });
  assert.equal(dup.status, 409);
});

test('PUT updates name_ar and sortOrder; unknown id is 404', async () => {
  await seed();
  const { id } = await prisma.category.findUnique({ where: { slug: 'masterplan' } });
  const { status, body } = await json(server.base, `/categories/${id}`, {
    method: 'PUT', token, body: { slug: 'masterplan', name: 'Masterplan', name_ar: 'المخطط', sortOrder: 0 },
  });
  assert.equal(status, 200);
  assert.equal(body.name_ar, 'المخطط');
  assert.equal(body.sortOrder, 0);

  const missing = await json(server.base, '/categories/00000000-0000-0000-0000-000000000000', {
    method: 'PUT', token, body: { slug: 'ghost', name: 'Ghost' },
  });
  assert.equal(missing.status, 404);
});

test('PUT with only name and slug keeps sortOrder and name_ar', async () => {
  await seed();
  const { id } = await prisma.category.findUnique({ where: { slug: 'masterplan' } });
  const { status } = await json(server.base, `/categories/${id}`, {
    method: 'PUT', token, body: { slug: 'masterplan', name: 'Master Plan' },
  });
  assert.equal(status, 200);
  const row = await prisma.category.findUnique({ where: { id } });
  assert.equal(row.name, 'Master Plan');
  assert.equal(row.sortOrder, 2);
  assert.equal(row.name_ar, 'مخطط رئيسي');
});

test('PUT rejects a bad sortOrder with 400', async () => {
  await seed();
  const { id } = await prisma.category.findUnique({ where: { slug: 'masterplan' } });
  const { status, body } = await json(server.base, `/categories/${id}`, {
    method: 'PUT', token, body: { slug: 'masterplan', name: 'Masterplan', sortOrder: '-1' },
  });
  assert.equal(status, 400);
  assert.match(JSON.stringify(body), /sortOrder/);
  const row = await prisma.category.findUnique({ where: { id } });
  assert.equal(row.sortOrder, 2);
  assert.equal(row.name, 'Masterplan');
});

test('DELETE removes an unused category and refuses one still in use', async () => {
  await seed();
  const unused = await prisma.category.findUnique({ where: { slug: 'masterplan' } });
  const used = await prisma.category.findUnique({ where: { slug: 'architectural' } });
  await prisma.project.create({
    data: { title: 'T', description: 'd', badge: 'b', slug: 't', categoryId: used.id },
  });

  const gone = await json(server.base, `/categories/${unused.id}`, { method: 'DELETE', token });
  assert.equal(gone.status, 200);
  assert.equal(await prisma.category.count({ where: { id: unused.id } }), 0);

  const refused = await json(server.base, `/categories/${used.id}`, { method: 'DELETE', token });
  assert.equal(refused.status, 409);
  assert.equal(await prisma.category.count({ where: { id: used.id } }), 1);
});
