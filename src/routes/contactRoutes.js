// backend-api/src/routes/contactRoutes.js
import express from 'express';
import * as contactController from '../controllers/contactController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { submissionLimiter } from '../middleware/rateLimit.js';

import { uploadDrawings } from '../middleware/uploadMiddleware.js';

const router = express.Router();

const drawings = (req, res, next) => uploadDrawings(req, res, (err) => {
  if (err) res.status(400);
  next(err);
});

router.route('/')
  .post(submissionLimiter(), drawings, contactController.createContactSubmission) // Publicly accessible for submission, optional drawings
  .get(protect, authorizeRoles('ADMIN', 'EDITOR', 'VIEWER'), contactController.getContactSubmissions); // Admin access

router.route('/:id')
  .get(protect, authorizeRoles('ADMIN', 'EDITOR', 'VIEWER'), contactController.getContactSubmission)
  .put(protect, authorizeRoles('ADMIN', 'EDITOR'), contactController.updateContactSubmission) // e.g., mark as read
  .delete(protect, authorizeRoles('ADMIN'), contactController.deleteContactSubmission);

export default router;