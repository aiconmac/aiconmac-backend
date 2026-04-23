import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || 'Admin';

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running this script.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
const user = await prisma.user.upsert({
  where: { email },
  update: { password: hash, name, role: 'ADMIN' },
  create: { email, password: hash, name, role: 'ADMIN' },
});

console.log(`Admin user ready: ${user.email} (id: ${user.id}) — password updated.`);
await prisma.$disconnect();
