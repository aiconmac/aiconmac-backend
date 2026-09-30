// backend-api/src/services/contactService.js
import prisma from '../models/prisma.js';
import { httpError } from '../middleware/errorHandler.js';

export const getAllContactSubmissions = async (filter = {}) => {
  const { isRead } = filter;
  const where = {};
  if (isRead !== undefined) where.isRead = isRead;

  const submissions = await prisma.contactSubmission.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return submissions;
};

export const getContactSubmissionById = async (id) => {
  const submission = await prisma.contactSubmission.findUnique({ where: { id } });
  return submission;
};

export const createContactSubmission = async (data, files = []) => {
  const { fullName, email, phone, projectType, message } = data;
  if (!fullName?.trim() || !email?.trim() || !message?.trim()) {
    throw httpError(400, 'fullName, email and message are required');
  }
  const submission = await prisma.contactSubmission.create({
    data: {
      fullName, email, phone, projectType, message,
      attachments: files.map((file) => ({ url: file.path, name: file.originalname })),
    },
  });
  // TODO: Add notification logic here (e.g., send email to admin)
  return submission;
};

export const updateContactSubmission = async (id, { isRead }) => {
  const submission = await prisma.contactSubmission.update({ where: { id }, data: { isRead } });
  return submission;
};

export const deleteContactSubmission = async (id) => {
  await prisma.contactSubmission.delete({ where: { id } });
  return { message: 'Contact submission deleted successfully' };
};