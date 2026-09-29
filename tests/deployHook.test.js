import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import prisma from '../src/models/prisma.js';
import * as projectService from '../src/services/projectService.js';
import { resetDb } from './helpers.js';

const hits = [];
let hook;
let category;
const file = (name) => ({ path: `https://img.test/${name}.webp`, filename: null });
const data = (slug, isPublished) => ({ title: slug, description: 'd', badge: 'b', slug, categoryId: category.id, isPublished });

before(() => new Promise((resolve) => {
  hook = createServer((req, res) => {
    hits.push(`${req.method} ${req.url}`);
    res.statusCode = 500;
    res.end();
  });
  hook.listen(0, resolve);
}));
beforeEach(async () => {
  hits.length = 0;
  process.env.CLOUDFLARE_DEPLOY_HOOK_URL = `http://127.0.0.1:${hook.address().port}/deploy`;
  await resetDb();
  category = await prisma.category.create({ data: { slug: 'architectural', name: 'Architectural' } });
});
after(async () => {
  hook.close();
  await prisma.$disconnect();
});

test('publish, edit-while-published, unpublish each fire once; a draft never does', async () => {
  const draft = await projectService.createProject(data('a', false), [file('a')]);
  const keep = { existingImageIds: [draft.images[0].id] };
  assert.deepEqual(hits, []);

  await projectService.updateProject(draft.id, { ...data('a', true), ...keep });
  assert.deepEqual(hits, ['POST /deploy']);

  await projectService.updateProject(draft.id, { ...data('a', true), title: 'renamed', ...keep });
  assert.equal(hits.length, 2);

  await projectService.updateProject(draft.id, { ...data('a', false), ...keep });
  assert.equal(hits.length, 3);

  await projectService.updateProject(draft.id, { ...data('a', false), title: 'still draft', ...keep });
  await projectService.deleteProject(draft.id);
  assert.equal(hits.length, 3);
});

test('creating a published project and deleting it fire the hook', async () => {
  const live = await projectService.createProject(data('b', true), [file('b')]);
  assert.equal(hits.length, 1);
  await projectService.deleteProject(live.id);
  assert.equal(hits.length, 2);
});

test('hook answering 500 does not fail the request', async () => {
  const live = await projectService.createProject(data('c', true), [file('c')]);
  assert.ok(live.id);
  assert.equal(hits.length, 1);
});

test('unset URL skips the hook', async () => {
  delete process.env.CLOUDFLARE_DEPLOY_HOOK_URL;
  await projectService.createProject(data('d', true), [file('d')]);
  assert.deepEqual(hits, []);
});

test('unreachable hook does not fail the request', async () => {
  process.env.CLOUDFLARE_DEPLOY_HOOK_URL = 'http://127.0.0.1:1/deploy';
  const live = await projectService.createProject(data('e', true), [file('e')]);
  assert.ok(live.id);
});
