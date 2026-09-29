import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/models/prisma.js';
import * as projectService from '../src/services/projectService.js';
import { resetDb } from './helpers.js';

let category;
const file = (name) => ({ path: `https://img.test/${name}.webp`, filename: null });
const base = (slug) => ({ title: slug, description: 'Body copy', badge: 'Residential', slug, categoryId: category.id });

beforeEach(async () => {
  await resetDb();
  category = await prisma.category.create({ data: { slug: 'architectural', name: 'Architectural', name_ar: 'معماري' } });
});
after(() => prisma.$disconnect());

test('createProject stores the new fields and returns the nested category', async () => {
  const project = await projectService.createProject(
    { ...base('tower'), scale: '1:75', leadTimeDays: '28', clientName: 'Emaar', isPublished: 'true', sortOrder: '2' },
    [file('tower-1')],
  );
  assert.equal(project.scale, '1:75');
  assert.equal(project.leadTimeDays, 28);
  assert.equal(project.clientName, 'Emaar');
  assert.equal(project.sortOrder, 2);
  assert.equal(project.isPublished, true);
  assert.equal(project.categoryId, category.id);
  assert.deepEqual(project.category, { slug: 'architectural', name: 'Architectural', name_ar: 'معماري' });
  assert.equal(project.images.length, 1);
});

test('createProject defaults the optional facts to null', async () => {
  const project = await projectService.createProject(base('plain'), [file('plain-1')]);
  assert.equal(project.scale, null);
  assert.equal(project.leadTimeDays, null);
  assert.equal(project.clientName, null);
});

test('createProject without categoryId is a 400', async () => {
  await assert.rejects(
    projectService.createProject({ ...base('x'), categoryId: '' }, [file('x')]),
    { status: 400 },
  );
});

test('createProject with an unknown categoryId surfaces the foreign-key code', async () => {
  await assert.rejects(
    projectService.createProject({ ...base('y'), categoryId: '00000000-0000-0000-0000-000000000000' }, [file('y')]),
    { code: 'P2003' },
  );
});

test('leadTimeDays rejects non-integers and negatives with a 400', async () => {
  for (const bad of ['abc', '-3', '2.5']) {
    await assert.rejects(
      projectService.createProject({ ...base(`lt-${bad}`), leadTimeDays: bad }, [file(`lt-${bad}`)]),
      { status: 400 },
    );
  }
});

test('updateProject clears leadTimeDays with an empty string and leaves omitted fields alone', async () => {
  const created = await projectService.createProject(
    { ...base('villa'), scale: '1:100', leadTimeDays: '14', clientName: 'Nakheel' },
    [file('villa-1')],
  );
  const updated = await projectService.updateProject(
    created.id,
    { ...base('villa'), leadTimeDays: '', existingImageIds: [created.images[0].id] },
    [],
  );
  assert.equal(updated.leadTimeDays, null);
  assert.equal(updated.scale, '1:100');
  assert.equal(updated.clientName, 'Nakheel');
  assert.equal(updated.images.length, 1);
  assert.deepEqual(updated.category, { slug: 'architectural', name: 'Architectural', name_ar: 'معماري' });
});

test('updateProject on an unknown id rejects with P2025', async () => {
  await assert.rejects(
    projectService.updateProject('00000000-0000-0000-0000-000000000000', base('ghost'), []),
    { code: 'P2025' },
  );
});

test('getAllProjects filters by category slug and returns [] for an unknown slug', async () => {
  const other = await prisma.category.create({ data: { slug: 'masterplan', name: 'Masterplan' } });
  await projectService.createProject(base('a'), [file('a')]);
  await projectService.createProject({ ...base('b'), categoryId: other.id }, [file('b')]);

  const list = await projectService.getAllProjects({ category: 'masterplan' });
  assert.deepEqual(list.map((p) => p.slug), ['b']);
  assert.deepEqual(await projectService.getAllProjects({ category: 'nope' }), []);
});

test('getAllProjects orders pinned first, then sortOrder, then newest', async () => {
  await projectService.createProject({ ...base('old'), sortOrder: '5' }, [file('old')]);
  await projectService.createProject({ ...base('pinned'), isPinned: 'true', sortOrder: '9' }, [file('pinned')]);
  await projectService.createProject({ ...base('new'), sortOrder: '1' }, [file('new')]);
  const list = await projectService.getAllProjects();
  assert.deepEqual(list.map((p) => p.slug), ['pinned', 'new', 'old']);
});

test('deleteProject on an unknown id is a 404', async () => {
  await assert.rejects(projectService.deleteProject('00000000-0000-0000-0000-000000000000'), { status: 404 });
});
