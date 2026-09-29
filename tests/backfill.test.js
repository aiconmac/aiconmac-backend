import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import prisma from '../src/models/prisma.js';

const runBackfill = () => {
  const result = spawnSync(process.execPath, [
    'node_modules/prisma/build/index.js', 'db', 'execute',
    '--schema', 'prisma/schema.prisma',
    '--file', 'prisma/backfill-categories.sql',
  ], { env: process.env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
};

const legacy = (slug, category, extra = {}) => ({
  title: slug, description: 'd', badge: 'b', slug, category, ...extra,
});

before(async () => {
  await prisma.project.deleteMany();
  await prisma.category.deleteMany();
  await prisma.project.create({ data: legacy('tower', 'architectural', { category_ar: 'معماري', createdAt: new Date('2026-01-01') }) });
  await prisma.project.create({ data: legacy('villa', 'Architectural ', { createdAt: new Date('2026-01-02') }) });
  await prisma.project.create({ data: legacy('city', 'masterplan', { createdAt: new Date('2026-01-03') }) });
});
after(() => prisma.$disconnect());

test('backfill creates one category per normalised slug and links every project', async () => {
  runBackfill();

  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  assert.deepEqual(
    categories.map(({ slug, name, name_ar, sortOrder }) => ({ slug, name, name_ar, sortOrder })),
    [
      { slug: 'architectural', name: 'Architectural', name_ar: 'معماري', sortOrder: 0 },
      { slug: 'masterplan', name: 'Masterplan', name_ar: null, sortOrder: 1 },
    ],
  );

  const idOf = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
  const projects = await prisma.project.findMany();
  const linked = Object.fromEntries(projects.map((p) => [p.slug, p.categoryId]));
  assert.deepEqual(linked, {
    tower: idOf.architectural,
    villa: idOf.architectural,
    city: idOf.masterplan,
  });
});

test('backfill is idempotent', async () => {
  runBackfill();
  runBackfill();
  assert.equal(await prisma.category.count(), 2);
  assert.equal(await prisma.project.count({ where: { categoryId: null } }), 0);
});
