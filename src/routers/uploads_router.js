import { Router } from 'express';
import { requireWriteAccess } from '../middleware/auth.js';
import { getPublicAssetDirectories, uploadPublicFile, uploadReservation } from '../controllers/uploads_controller.js';
import { upload, uploadMemory } from '../middleware/uploadMiddleware.js';

export const uploadsRouter = Router();

uploadsRouter.get('/directories', requireWriteAccess, getPublicAssetDirectories);
uploadsRouter.post('/public', requireWriteAccess, uploadMemory.single('file'), uploadPublicFile);
uploadsRouter.post('/reservation', requireWriteAccess, upload.single('file'), uploadReservation);
