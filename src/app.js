import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { routers } from './routersIndex.js';
import { errorHandler } from './middleware/errorHandler.js';
import { loadEnv } from './config/env.js';

loadEnv();

const app = express();

const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean) || [];

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS bloqueado para origen: ${origin}`));
  },
  credentials: true
}));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const uploadsDir = process.env.UPLOADS_DIR || 'storage/uploads';
const publicUploadsPath = process.env.PUBLIC_UPLOADS_PATH || '/uploads';
app.use(publicUploadsPath, express.static(uploadsDir));

routers.forEach(({ path, router }) => {
  app.use(path, router);
});

app.use((req, res) => {
  res.status(404).json({ message: 'No existe el endpoint' });
});

app.use(errorHandler);

export default app;
