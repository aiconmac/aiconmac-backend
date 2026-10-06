import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import multer from 'multer';
import { uploadMultipleImages } from '../src/middleware/uploadMiddleware.js';

const textFields = ['title', 'description', 'badge', 'categoryId', 'scale', 'slug', 'isPublished', 'isPinned', 'sortOrder',
  'leadTimeDays', 'title_ar', 'title_ru', 'description_ar', 'description_ru', 'badge_ar', 'badge_ru', 'clientName'];

let server;
let base;
before(async () => {
  const app = express();
  app.post('/projects', (req, res) => uploadMultipleImages(req, res, (err) => {
    if (err) return res.status(err instanceof multer.MulterError ? 400 : 500).json({ code: err.code, message: err.message });
    res.json({ existingImageIds: req.body.existingImageIds, title: req.body.title });
  }));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const send = (imageCount) => {
  const form = new FormData();
  for (const name of textFields) form.append(name, 'x');
  for (let i = 0; i < imageCount; i++) form.append('existingImageIds[]', `img${i}`);
  return fetch(`${base}/projects`, { method: 'POST', body: form });
};

test('project form with 10 existing images (27 fields) is not rejected for field count', async () => {
  const res = await send(10);
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.existingImageIds.length, 10);
});

test('project form still rejects an absurd field count', async () => {
  const res = await send(100);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, 'LIMIT_FIELD_COUNT');
});
