// backend-api/src/routes/projectRoutes.js
import express from 'express';
import multer from 'multer';
import * as projectController from '../controllers/projectController.js';
import { protect, authorizeRoles, optionalAuth } from '../middleware/authMiddleware.js';
import { uploadMultipleImages } from '../middleware/uploadMiddleware.js'; // For project images

const router = express.Router();

// Only multer's own limit errors are the client's fault; a Cloudinary failure stays a 500.
const images = (req, res, next) => uploadMultipleImages(req, res, (err) => {
  if (err instanceof multer.MulterError) res.status(400);
  next(err);
});

router.route('/')
  .get(optionalAuth, projectController.getProjects) // Public: published only unless authenticated
  .post(protect, authorizeRoles('ADMIN', 'EDITOR'), images, projectController.createProject);

router.route('/:id')
  .get(optionalAuth, projectController.getProject) // Public: 404 for drafts unless authenticated
  .put(protect, authorizeRoles('ADMIN', 'EDITOR'), images, projectController.updateProject)
  .delete(protect, authorizeRoles('ADMIN', 'EDITOR'), projectController.deleteProject);

export default router;