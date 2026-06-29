import { tripRouter } from './routers/trip_router.js';
import { authRouter } from './routers/auth_router.js';
import { uploadsRouter } from './routers/uploads_router.js';
import { adminRouter } from './routers/admin_router.js';
import { aiRouter } from './routers/ai_router.js';

export const routers = [
  { path: '/api', router: tripRouter },
  { path: '/api/auth', router: authRouter },
  { path: '/api/admin', router: adminRouter },
  { path: '/api/ai', router: aiRouter },
  { path: '/api/uploads', router: uploadsRouter }
];
