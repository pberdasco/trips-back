import {
  addLinkToActivity,
  addTodoToActivity,
  createGlobalTodo,
  getAllCities,
  getAllDays,
  getFullTripData,
  getGlobalTodos,
  getTripDay,
  replaceTripDay,
  updateActivityTodo,
  updateTodoStatus
} from '../services/trip_service.js';

export async function getTripData (_req, res, next) {
  try {
    res.json(await getFullTripData());
  } catch (error) {
    next(error);
  }
}

export async function getDays (_req, res, next) {
  try {
    res.json(await getAllDays());
  } catch (error) {
    next(error);
  }
}

export async function getDay (req, res, next) {
  try {
    res.json(await getTripDay(req.params.dayId));
  } catch (error) {
    next(error);
  }
}

export async function getCities (_req, res, next) {
  try {
    res.json(await getAllCities());
  } catch (error) {
    next(error);
  }
}

export async function getTodos (_req, res, next) {
  try {
    res.json(await getGlobalTodos());
  } catch (error) {
    next(error);
  }
}

export async function addGlobalTodo (req, res, next) {
  try {
    const changedBy = req.user?.username || 'api';
    res.status(201).json(await createGlobalTodo(req.body, changedBy));
  } catch (error) {
    next(error);
  }
}

export async function patchTodo (req, res, next) {
  try {
    const changedBy = req.user?.username || 'api';
    res.json(await updateTodoStatus(req.params.todoId, req.body, changedBy, req.id));
  } catch (error) {
    next(error);
  }
}

export async function addActivityTodo (req, res, next) {
  try {
    const changedBy = req.user?.username || 'api';
    res.status(201).json(await addTodoToActivity(req.params.dayId, req.params.activityId, req.body, changedBy, req.id));
  } catch (error) {
    next(error);
  }
}

export async function patchActivityTodo (req, res, next) {
  try {
    const changedBy = req.user?.username || 'api';
    res.json(await updateActivityTodo(
      req.params.dayId,
      req.params.activityId,
      req.params.todoId,
      req.body,
      changedBy,
      req.id
    ));
  } catch (error) {
    next(error);
  }
}

export async function addActivityLink (req, res, next) {
  try {
    const changedBy = req.user?.username || 'api';
    res.status(201).json(await addLinkToActivity(req.params.dayId, req.params.activityId, req.body, changedBy, req.id));
  } catch (error) {
    next(error);
  }
}

export async function putDay (req, res, next) {
  try {
    const changedBy = req.user?.username || 'api';
    res.json(await replaceTripDay(req.params.dayId, req.body, changedBy, req.id));
  } catch (error) {
    next(error);
  }
}
