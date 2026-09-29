import { createServer } from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import prisma from '../src/models/prisma.js';

export const startServer = () => new Promise((resolve) => {
  const server = createServer(app);
  server.listen(0, () => {
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const close = () => new Promise((done) => server.close(() => prisma.$disconnect().then(done)));
    resolve({ base, close });
  });
});

export const resetDb = async () => {
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
};

export const adminToken = async () => {
  const user = await prisma.user.create({
    data: { email: `admin-${Date.now()}@test.local`, password: 'unused', role: 'ADMIN' },
  });
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET);
};

export const json = async (base, path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};
