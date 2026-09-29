// backend-api/src/controllers/categoryController.js
import * as categoryService from '../services/categoryService.js';

export const getCategories = async (req, res, next) => {
  try {
    res.status(200).json(await categoryService.getAllCategories());
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    res.status(201).json(await categoryService.createCategory(req.body));
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    res.status(200).json(await categoryService.updateCategory(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    res.status(200).json(await categoryService.deleteCategory(req.params.id));
  } catch (error) {
    next(error);
  }
};
