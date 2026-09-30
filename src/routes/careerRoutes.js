// backend-api/src/routes/careerRoutes.js
import express from 'express';
import * as careerController from '../controllers/careerController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { submissionLimiter } from '../middleware/rateLimit.js';
import { uploadResume } from '../middleware/uploadMiddleware.js'; // For resume upload

const router = express.Router();

router.route('/')
  .post(submissionLimiter(), uploadResume, careerController.createCareerSubmission) // Publicly accessible for submission with resume
  .get(protect, authorizeRoles('ADMIN', 'EDITOR', 'VIEWER'), careerController.getCareerSubmissions); // Admin access

router.route('/:id')
  .get(protect, authorizeRoles('ADMIN', 'EDITOR', 'VIEWER'), careerController.getCareerSubmission)
  .put(protect, authorizeRoles('ADMIN', 'EDITOR'), careerController.updateCareerSubmission) // e.g., mark as read
  .delete(protect, authorizeRoles('ADMIN'), careerController.deleteCareerSubmission);

export default router;