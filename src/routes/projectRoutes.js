// backend-api/src/routes/projectRoutes.js
import express from 'express';
import * as projectController from '../controllers/projectController.js';
import { protect, authorizeRoles, optionalAuth } from '../middleware/authMiddleware.js';
import { uploadMultipleImages } from '../middleware/uploadMiddleware.js'; // For project images

const router = express.Router();

router.route('/')
  .get(optionalAuth, projectController.getProjects) // Public: published only unless authenticated
  .post(protect, authorizeRoles('ADMIN', 'EDITOR'), uploadMultipleImages, projectController.createProject);

router.route('/:id')
  .get(optionalAuth, projectController.getProject) // Public: 404 for drafts unless authenticated
  .put(protect, authorizeRoles('ADMIN', 'EDITOR'), uploadMultipleImages, projectController.updateProject)
  .delete(protect, authorizeRoles('ADMIN', 'EDITOR'), projectController.deleteProject);

export default router;