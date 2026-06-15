import multer from 'multer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { loadEnv } from '../config/env.js';

loadEnv();

const uploadsDir = process.env.UPLOADS_DIR || 'storage/uploads';
mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadsDir),
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${nanoid(10)}${ext}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
});
