// backend-api/src/routes/clientRoutes.js
import express from 'express';
import multer from 'multer';
import * as clientController from '../controllers/clientController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { uploadLogo } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Only multer's own limit errors are the client's fault; a Cloudinary failure stays a 500.
const logo = (req, res, next) => uploadLogo(req, res, (err) => {
  if (err instanceof multer.MulterError) res.status(400);
  next(err);
});

router.route('/')
    .get(clientController.getClients) // Publicly accessible
    .post(protect, authorizeRoles('ADMIN', 'EDITOR'), logo, clientController.createClient);

router.route('/:id')
    .delete(protect, authorizeRoles('ADMIN', 'EDITOR'), clientController.deleteClient);

export default router;
