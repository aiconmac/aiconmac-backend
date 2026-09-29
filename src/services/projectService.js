// backend-api/src/services/projectService.js
import prisma from '../models/prisma.js';
import cloudinary from '../config/cloudinary.js';
import { httpError } from '../middleware/errorHandler.js';
import { triggerDeploy } from './deployHookService.js';

const projectInclude = {
  images: { orderBy: { order: 'asc' } },
  category: { select: { slug: true, name: true, name_ar: true } },
};

const flag = (value) => value === 'true' || value === true;

const optionalText = (value) => (value === '' ? null : value);

const optionalDays = (value) => {
  if (value === undefined) return undefined;
  if (value === '' || value === null) return null;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 0) throw httpError(400, 'leadTimeDays must be a non-negative integer');
  return days;
};

const newImages = (title, imageFiles) => imageFiles.map((file, index) => ({
  url: file.path,
  publicId: file.filename,
  altText: `${title} Image ${index + 1}`,
  order: index,
}));

export const getAllProjects = async (filter = {}) => {
  const { category, isPublished } = filter;

  const where = {};
  if (category) where.category = { slug: category };
  if (isPublished !== undefined) where.isPublished = isPublished;

  return prisma.project.findMany({
    where,
    include: projectInclude,
    orderBy: [
      { isPinned: 'desc' },
      { sortOrder: 'asc' },
      { createdAt: 'desc' },
    ],
  });
};

export const getProjectById = async (id) => {
  return prisma.project.findUnique({ where: { id }, include: projectInclude });
};

export const createProject = async (projectData, imageFiles = []) => {
  const {
    title, title_ar, title_ru,
    description, description_ar, description_ru,
    badge, badge_ar, badge_ru,
    slug, categoryId, scale, leadTimeDays, clientName,
    isPublished, isPinned, sortOrder,
  } = projectData;

  if (!categoryId) throw httpError(400, 'categoryId is required');

  const project = await prisma.project.create({
    data: {
      title,
      title_ar: optionalText(title_ar),
      title_ru: optionalText(title_ru),
      description,
      description_ar: optionalText(description_ar),
      description_ru: optionalText(description_ru),
      badge,
      badge_ar: optionalText(badge_ar),
      badge_ru: optionalText(badge_ru),
      slug,
      categoryId,
      scale: optionalText(scale) ?? null,
      leadTimeDays: optionalDays(leadTimeDays) ?? null,
      clientName: optionalText(clientName) ?? null,
      isPublished: flag(isPublished),
      isPinned: flag(isPinned),
      sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
      images: { create: newImages(title, imageFiles) },
    },
    include: projectInclude,
  });
  if (project.isPublished) await triggerDeploy();
  return project;
};

export const updateProject = async (id, projectData, imageFiles = []) => {
  const {
    title, title_ar, title_ru,
    description, description_ar, description_ru,
    badge, badge_ar, badge_ru,
    slug, categoryId, scale, leadTimeDays, clientName,
    isPublished, isPinned, sortOrder, existingImageIds = [],
  } = projectData;

  const before = await prisma.project.findUniqueOrThrow({ where: { id }, select: { isPublished: true } });
  const imagesToDelete =await prisma.image.findMany({
    where: { projectId: id, id: { notIn: existingImageIds } },
  });
  for (const img of imagesToDelete) {
    if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      title,
      title_ar: optionalText(title_ar),
      title_ru: optionalText(title_ru),
      description,
      description_ar: optionalText(description_ar),
      description_ru: optionalText(description_ru),
      badge,
      badge_ar: optionalText(badge_ar),
      badge_ru: optionalText(badge_ru),
      slug,
      ...(categoryId !== undefined && { categoryId }),
      ...(scale !== undefined && { scale: optionalText(scale) }),
      ...(leadTimeDays !== undefined && { leadTimeDays: optionalDays(leadTimeDays) }),
      ...(clientName !== undefined && { clientName: optionalText(clientName) }),
      isPublished: flag(isPublished),
      ...(isPinned !== undefined && { isPinned: flag(isPinned) }),
      ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder, 10) }),
      images: {
        deleteMany: { projectId: id, id: { notIn: existingImageIds } },
        create: newImages(title, imageFiles),
      },
    },
    include: projectInclude,
  });
  if (before.isPublished || project.isPublished) await triggerDeploy();
  return project;
};

export const deleteProject = async (id) => {
  const project = await prisma.project.findUnique({ where: { id }, include: { images: true } });
  if (!project) throw httpError(404, 'Project not found');

  for (const img of project.images) {
    if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
  }

  await prisma.project.delete({ where: { id } });
  if (project.isPublished) await triggerDeploy();
  return { message: 'Project deleted successfully' };
};
