// backend-api/src/services/authService.js
import bcrypt from 'bcrypt'; // Changed from 'bcryptjs'
import jwt from 'jsonwebtoken';
import prisma from '../models/prisma.js';
import { httpError } from '../middleware/errorHandler.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

export const registerUser = async (email, password, name, role) => {
  if (typeof password !== 'string' || password.length < 12) {
    throw httpError(400, 'Password must be at least 12 characters');
  }
  // bcrypt.hash is async and returns a promise
  const hashedPassword = await bcrypt.hash(password, 10); // <-- No change in function call
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role },
  });
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token: generateToken(user.id) };
};

export const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { // Check user existence first
    throw httpError(401, 'Invalid credentials');
  }
  // bcrypt.compare is async and returns a promise
  if (!(await bcrypt.compare(password, user.password))) { // <-- No change in function call
    throw httpError(401, 'Invalid credentials');
  }
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token: generateToken(user.id) };
};

export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });
  return user;
};

export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return users;
};

export const updateUserRole = async (userId, role) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  });
  return user;
};

export const deleteUser = async (userId) => {
  await prisma.user.delete({ where: { id: userId } });
  return { message: 'User deleted successfully' };
};