// backend-api/src/services/categoryService.js
import prisma from '../models/prisma.js';
import { httpError } from '../middleware/errorHandler.js';

const normalize = ({ slug, name, name_ar, sortOrder }) => {
  if (!/^[a-z0-9-]+$/.test(slug ?? '')) throw httpError(400, 'slug must be lowercase letters, digits and hyphens');
  if (!name?.trim()) throw httpError(400, 'name is required');
  return {
    slug,
    name: name.trim(),
    name_ar: name_ar?.trim() || null,
    sortOrder: Number(sortOrder) || 0,
  };
};

export const getAllCategories = async () => {
  return prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
};

export const createCategory = async (data) => {
  return prisma.category.create({ data: normalize(data) });
};

const normalizePatch = ({ slug, name, name_ar, sortOrder }) => {
  const data = {};
  if (slug !== undefined) {
    if (!/^[a-z0-9-]+$/.test(slug ?? '')) throw httpError(400, 'slug must be lowercase letters, digits and hyphens');
    data.slug = slug;
  }
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) throw httpError(400, 'name is required');
    data.name = name.trim();
  }
  if (name_ar !== undefined) data.name_ar = name_ar?.trim() || null;
  if (sortOrder !== undefined) {
    if (!/^\d+$/.test(String(sortOrder).trim())) throw httpError(400, 'sortOrder must be a non-negative integer');
    data.sortOrder = Number(sortOrder);
  }
  return data;
};

export const updateCategory = async (id, data) => {
  return prisma.category.update({ where: { id }, data: normalizePatch(data) });
};

export const deleteCategory = async (id) => {
  await prisma.category.delete({ where: { id } });
  return { message: 'Category deleted successfully' };
};
