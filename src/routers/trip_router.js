import { Router } from 'express';
import { requireWriteAccess } from '../middleware/auth.js';
import {
  addActivityLink,
  addActivityTodo,
  addGlobalTodo,
  getCities,
  getDay,
  getDays,
  getTodos,
  getTripData,
  patchActivityTodo,
  patchTodo,
  putCity,
  putDay
} from '../controllers/trip_controller.js';

export const tripRouter = Router();

tripRouter.get('/trip-data', getTripData);
tripRouter.get('/days', getDays);
tripRouter.get('/days/:dayId', getDay);
tripRouter.get('/cities', getCities);
tripRouter.get('/todos', getTodos);

tripRouter.post('/todos', requireWriteAccess, addGlobalTodo);
tripRouter.patch('/todos/:todoId', requireWriteAccess, patchTodo);
tripRouter.put('/days/:dayId', requireWriteAccess, putDay);
tripRouter.put('/cities/:cityId', requireWriteAccess, putCity);
tripRouter.post('/days/:dayId/activities/:activityId/todos', requireWriteAccess, addActivityTodo);
tripRouter.patch('/days/:dayId/activities/:activityId/todos/:todoId', requireWriteAccess, patchActivityTodo);
tripRouter.post('/days/:dayId/activities/:activityId/links', requireWriteAccess, addActivityLink);
