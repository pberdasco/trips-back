import { importTripData } from '../services/import_service.js';

export async function importTripDataController (req, res, next) {
  try {
    res.json(await importTripData(req.body));
  } catch (error) {
    next(error);
  }
}
