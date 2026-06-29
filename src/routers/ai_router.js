import { Router } from 'express';
import { postTripChat } from '../controllers/ai_controller.js';
import { requireWriteAccess } from '../middleware/auth.js';

export const aiRouter = Router();

aiRouter.post('/trip-chat', requireWriteAccess, postTripChat);
