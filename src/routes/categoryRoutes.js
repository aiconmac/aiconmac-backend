// backend-api/src/routes/categoryRoutes.js
import express from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(categoryController.getCategories) // Publicly accessible
  .post(protect, authorizeRoles('ADMIN', 'EDITOR'), categoryController.createCategory);

router.route('/:id')
  .put(protect, authorizeRoles('ADMIN', 'EDITOR'), categoryController.updateCategory)
  .delete(protect, authorizeRoles('ADMIN', 'EDITOR'), categoryController.deleteCategory);

export default router;
