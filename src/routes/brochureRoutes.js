import express from 'express';
import { createBrochureRequest, getBrochureRequests } from '../controllers/brochureController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { submissionLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// POST /api/brochure-requests - Public
router.post('/', submissionLimiter(), createBrochureRequest);

// GET /api/brochure-requests - Protected (Admin/Editor/Viewer)
router.get('/', protect, authorizeRoles('ADMIN', 'EDITOR', 'VIEWER'), getBrochureRequests);

export default router;
