// backend-api/src/services/careerService.js
import prisma from '../models/prisma.js';
import cloudinary from '../config/cloudinary.js';
import { httpError } from '../middleware/errorHandler.js';

export const getAllCareerSubmissions = async (filter = {}) => {
  const { isRead } = filter;
  const where = {};
  if (isRead !== undefined) where.isRead = isRead;

  const submissions = await prisma.careerSubmission.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return submissions;
};

export const getCareerSubmissionById = async (id) => {
  const submission = await prisma.careerSubmission.findUnique({ where: { id } });
  return submission;
};

export const createCareerSubmission = async (data, resumeFile) => {
  const { fullName, email, phone, message } = data;
  if (!fullName?.trim() || !email?.trim()) {
    throw httpError(400, 'fullName and email are required');
  }
  const tooLong = Object.entries({ fullName: 200, email: 254, phone: 200, message: 5000 })
    .find(([field, max]) => data[field]?.length > max);
  if (tooLong) throw httpError(400, `${tooLong[0]} must be at most ${tooLong[1]} characters`);
  let resumeUrl = null;
  let publicId = null;

  if (resumeFile) {
    // Multer-Cloudinary already uploads the file, we just need its path and filename
    resumeUrl = resumeFile.path;
    publicId = resumeFile.filename; // This is the Cloudinary public_id
  }

  const submission = await prisma.careerSubmission.create({
    data: {
      fullName, email, phone, message,
      resumeUrl,
      publicId,
    },
  });
  // TODO: Add notification logic here (e.g., send email to HR)
  return submission;
};

export const updateCareerSubmission = async (id, { isRead }) => {
  const submission = await prisma.careerSubmission.update({ where: { id }, data: { isRead } });
  return submission;
};

export const deleteCareerSubmission = async (id) => {
  const submission = await prisma.careerSubmission.findUnique({ where: { id } });

  if (submission && submission.publicId) {
    await cloudinary.uploader.destroy(submission.publicId); // Delete resume from Cloudinary
  }

  await prisma.careerSubmission.delete({ where: { id } });
  return { message: 'Career submission deleted successfully' };
};