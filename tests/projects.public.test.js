import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/models/prisma.js';
import * as projectService from '../src/services/projectService.js';
import { startServer, resetDb, adminToken, json } from './helpers.js';

let server;
let token;
let published;
let draft;
const file = (name) => ({ path: `https://img.test/${name}.webp`, filename: null });

before(async () => { server = await startServer(); });
beforeEach(async () => {
  await resetDb();
  token = await adminToken();
  const category = await prisma.category.create({ data: { slug: 'architectural', name: 'Architectural', name_ar: 'معماري' } });
  const data = (slug, isPublished) => ({
    title: slug, description: 'd', badge: 'b', slug, categoryId: category.id, isPublished,
    scale: '1:75', leadTimeDays: '28', clientName: 'Emaar',
  });
  published = await projectService.createProject(data('live', true), [file('live')]);
  draft = await projectService.createProject(data('draft', false), [file('draft')]);
});
after(() => server.close());

test('anonymous list returns only published projects in the contract shape', async () => {
  const { status, body } = await json(server.base, '/projects');
  assert.equal(status, 200);
  assert.deepEqual(body.map((p) => p.slug), ['live']);
  const p = body[0];
  for (const key of ['id', 'slug', 'title', 'title_ar', 'description', 'description_ar', 'badge', 'badge_ar',
    'categoryId', 'category', 'scale', 'leadTimeDays', 'clientName', 'images', 'isPublished', 'isPinned', 'sortOrder']) {
    assert.ok(key in p, `missing ${key}`);
  }
  assert.deepEqual(p.category, { slug: 'architectural', name: 'Architectural', name_ar: 'معماري' });
  assert.equal(p.leadTimeDays, 28);
});

test('anonymous list ignores ?isPublished=false', async () => {
  const { body } = await json(server.base, '/projects?isPublished=false');
  assert.deepEqual(body.map((p) => p.slug), ['live']);
});

test('admin list sees drafts and can filter them', async () => {
  const all = await json(server.base, '/projects', { token });
  assert.deepEqual(all.body.map((p) => p.slug).sort(), ['draft', 'live']);
  const drafts = await json(server.base, '/projects?isPublished=false', { token });
  assert.deepEqual(drafts.body.map((p) => p.slug), ['draft']);
});

test('garbage bearer token on a public read is treated as anonymous', async () => {
  const { status, body } = await json(server.base, '/projects', { token: 'not-a-jwt' });
  assert.equal(status, 200);
  assert.deepEqual(body.map((p) => p.slug), ['live']);
});

test('?category filters by slug and an unknown slug is an empty 200', async () => {
  const hit = await json(server.base, '/projects?category=architectural');
  assert.deepEqual(hit.body.map((p) => p.slug), ['live']);
  const miss = await json(server.base, '/projects?category=nope');
  assert.equal(miss.status, 200);
  assert.deepEqual(miss.body, []);
});

test('GET /projects/:id is 404 for a draft unless authenticated', async () => {
  assert.equal((await json(server.base, `/projects/${published.id}`)).status, 200);
  assert.equal((await json(server.base, `/projects/${draft.id}`)).status, 404);
  assert.equal((await json(server.base, `/projects/${draft.id}`, { token })).status, 200);
  assert.equal((await json(server.base, '/projects/00000000-0000-0000-0000-000000000000')).status, 404);
});
