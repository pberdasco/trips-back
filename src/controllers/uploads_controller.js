import { listPublicAssetDirectories, registerUpload, uploadPublicAsset } from '../services/uploads_service.js';

export async function uploadReservation (req, res, next) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Falta archivo' });
      return;
    }
    res.status(201).json(await registerUpload(req.file, req.body));
  } catch (error) {
    next(error);
  }
}

export async function getPublicAssetDirectories (_req, res, next) {
  try {
    res.json({ directories: await listPublicAssetDirectories() });
  } catch (error) {
    next(error);
  }
}

export async function uploadPublicFile (req, res, next) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Falta archivo' });
      return;
    }

    res.status(201).json(await uploadPublicAsset(req.file, req.body));
  } catch (error) {
    next(error);
  }
}
