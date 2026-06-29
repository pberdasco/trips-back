import { askTripAssistant } from '../services/ai_service.js';

export async function postTripChat (req, res, next) {
  try {
    res.json(await askTripAssistant(req.body));
  } catch (error) {
    next(error);
  }
}
