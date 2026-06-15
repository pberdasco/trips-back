import { Router } from 'express';
import { login, logout, me } from '../controllers/auth_controller.js';

export const authRouter = Router();

authRouter.get('/me', me);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
