import { nanoid } from 'nanoid';
import { access, readdir, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { pool } from '../database/db.js';

const tripCode = () => process.env.TRIP_CODE || 'europa-2026';
const publicAssetsDir = () => path.resolve(process.env.PUBLIC_ASSETS_DIR || '../trip-app/public');
const allowedPublicRoots = ['images', 'reservas', 'recorridos'];

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

export async function listPublicAssetDirectories () {
  const baseDir = publicAssetsDir();
  const directories = [];

  for (const root of allowedPublicRoots) {
    const absoluteRoot = path.join(baseDir, root);
    if (!await directoryExists(absoluteRoot)) continue;

    directories.push(root);
    await collectSubdirectories(baseDir, root, directories);
  }

  return directories.sort((left, right) => left.localeCompare(right));
}

export async function uploadPublicAsset (file, body) {
  const directory = normalizeDirectory(body.directory);
  const allowedDirectories = new Set(await listPublicAssetDirectories());

  if (!allowedDirectories.has(directory)) {
    const error = new Error('Directorio no permitido');
    error.status = 400;
    throw error;
  }

  const filename = path.basename(file.originalname);
  if (!filename || filename === '.' || filename === '..' || filename.includes('/') || filename.includes('\\')) {
    const error = new Error('Nombre de archivo invalido');
    error.status = 400;
    throw error;
  }

  const baseDir = publicAssetsDir();
  const targetDir = path.resolve(baseDir, directory);
  const targetPath = path.resolve(targetDir, filename);

  if (!targetPath.startsWith(`${targetDir}${path.sep}`)) {
    const error = new Error('Nombre de archivo invalido');
    error.status = 400;
    throw error;
  }

  try {
    await access(targetPath, fsConstants.F_OK);
    const error = new Error('Ya existe un archivo con ese nombre en el directorio seleccionado');
    error.status = 409;
    throw error;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  await writeFile(targetPath, file.buffer);

  const publicPath = toPublicPath(directory, filename);
  return {
    path: publicPath,
    url: `/${publicPath}`,
    originalName: file.originalname,
    size: file.size
  };
}

async function collectSubdirectories (baseDir, relativeDir, directories) {
  const absoluteDir = path.join(baseDir, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const nextRelativeDir = path.posix.join(relativeDir, entry.name);
    directories.push(nextRelativeDir);
    await collectSubdirectories(baseDir, nextRelativeDir, directories);
  }
}

async function directoryExists (directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return Array.isArray(entries);
  } catch {
    return false;
  }
}

function normalizeDirectory (directory) {
  if (typeof directory !== 'string') return '';
  if (directory.includes('\\')) return '';

  const normalized = path.posix.normalize(directory.trim());
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) return '';
  if (path.isAbsolute(normalized)) return '';

  return normalized;
}

function toPublicPath (directory, filename) {
  return path.posix.join(directory, filename).replace(/^\/+/, '');
}
