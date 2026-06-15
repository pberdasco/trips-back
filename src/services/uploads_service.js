import { nanoid } from 'nanoid';
import path from 'node:path';
import { pool } from '../database/db.js';

const tripCode = () => process.env.TRIP_CODE || 'europa-2026';

export async function registerUpload (file, body) {
  const id = `upload-${nanoid(12)}`;
  const publicBase = process.env.PUBLIC_UPLOADS_PATH || '/uploads';
  const publicPath = `${publicBase}/${file.filename}`;

  await pool.query(
    `INSERT INTO trip_uploads
      (id, trip_code, day_id, activity_id, original_name, stored_name, mime_type, size_bytes, public_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tripCode(),
      body.dayId || null,
      body.activityId || null,
      file.originalname,
      path.basename(file.filename),
      file.mimetype,
      file.size,
      publicPath
    ]
  );

  return {
    id,
    originalName: file.originalname,
    publicPath
  };
}
