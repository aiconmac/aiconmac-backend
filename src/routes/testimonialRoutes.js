// backend-api/src/routes/testimonialRoutes.js
import express from 'express';
import * as testimonialController from '../controllers/testimonialController.js';
import { protect, authorizeRoles, optionalAuth } from '../middleware/authMiddleware.js';
import { submissionLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

router.route('/')
  .get(testimonialController.getTestimonials) // Publicly accessible (e.g., only approved ones)
  .post(submissionLimiter(), optionalAuth, testimonialController.createTestimonial); // Publicly accessible for submission

router.route('/:id')
  .get(testimonialController.getTestimonial)
  .put(protect, authorizeRoles('ADMIN', 'EDITOR'), testimonialController.updateTestimonial)
  .delete(protect, authorizeRoles('ADMIN', 'EDITOR'), testimonialController.deleteTestimonial);

export default router;