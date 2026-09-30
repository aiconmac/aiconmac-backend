// backend-api/src/routes/authRoutes.js
import express from 'express';
import * as authController from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { loginLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// router.post('/register', authController.register); // Public for initial setup, then protect it
router.post('/register', protect, authorizeRoles('ADMIN'), authController.register);
router.post('/login', loginLimiter, authController.login);
router.get('/me', protect, authController.getMe);

// User Management Routes (Admin only)
router.get('/users', protect, authorizeRoles('ADMIN'), authController.getUsers);
router.put('/users/:id/role', protect, authorizeRoles('ADMIN'), authController.updateUserRole);
router.delete('/users/:id', protect, authorizeRoles('ADMIN'), authController.deleteUser);

export default router;