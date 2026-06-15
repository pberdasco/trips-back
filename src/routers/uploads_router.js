import { Router } from 'express';
import { requireWriteAccess } from '../middleware/auth.js';
import { uploadReservation } from '../controllers/uploads_controller.js';
import { upload } from '../middleware/uploadMiddleware.js';

export const uploadsRouter = Router();

uploadsRouter.post('/reservation', requireWriteAccess, upload.single('file'), uploadReservation);
