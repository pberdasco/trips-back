import { Router } from 'express';
import { requireWriteAccess } from '../middleware/auth.js';
import { importTripDataController } from '../controllers/admin_controller.js';

export const adminRouter = Router();

adminRouter.post('/import-trip-data', requireWriteAccess, importTripDataController);
