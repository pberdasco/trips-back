import { nanoid } from 'nanoid';
import { z } from 'zod';
import { pool, dbErrorMsg, withTransaction } from '../database/db.js';
import { normalizeDayTodos } from '../utils/tripDataNormalize.js';

const tripCode = () => process.env.TRIP_CODE || 'europa-2026';

const todoPatchSchema = z.object({
  status: z.enum(['pending', 'done']),
  doneNote: z.string().max(1000).optional()
});

const newTodoSchema = z.object({
  text: z.string().min(1),
  dueDate: z.string().optional(),
  status: z.enum(['pending', 'done']).default('pending')
});

const editTodoSchema = z.object({
  text: z.string().min(1).optional(),
  dueDate: z.string().nullable().optional()
});

const newGlobalTodoSchema = z.object({
  text: z.string().min(1),
  dueDate: z.string().optional(),
  status: z.enum(['pending', 'done']).default('pending'),
  visibleFor: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional()
});

const newLinkSchema = z.object({
  type: z.string().min(1).default('info'),
  label: z.string().min(1),
  url: z.string().min(1)
});

const editableDaySchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  route: z.string().min(1),
  sleepsIn: z.string().min(1),
  activities: z.array(z.record(z.string(), z.unknown())).optional()
}).passthrough();

const editableCitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1)
}).passthrough();

export async function getAllDays () {
  const [rows] = await pool.query(
    'SELECT data_json FROM trip_days WHERE trip_code = ? ORDER BY sort_order',
    [tripCode()]
  );
  return rows.map(row => parseJson(row.data_json));
}

export async function getTripDay (dayId) {
  const [rows] = await pool.query(
    'SELECT data_json FROM trip_days WHERE trip_code = ? AND id = ?',
    [tripCode(), dayId]
  );
  if (rows.length === 0) throw dbErrorMsg(404, 'Dia no encontrado');
  return parseJson(rows[0].data_json);
}

export async function getAllCities () {
  const [rows] = await pool.query(
    'SELECT id, data_json FROM trip_cities WHERE trip_code = ? ORDER BY id',
    [tripCode()]
  );
  return Object.fromEntries(rows.map(row => [row.id, parseJson(row.data_json)]));
}

export async function getFullTripData () {
  const [days, cities, globalTodos, documents] = await Promise.all([
    getAllDays(),
    getAllCities(),
    getGlobalTodos(),
    getDocuments()
  ]);

  return {
    itinerary: days,
    cities,
    todos: globalTodos,
    ...documents
  };
}

export async function getGlobalTodos () {
  const [rows] = await pool.query(
    `SELECT id, text, due_date, status, scope, visible_for, notes, done_note, done_at, created_at, updated_at
     FROM trip_todos
     WHERE trip_code = ?
     ORDER BY
       CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
       due_date,
       created_at`,
    [tripCode()]
  );
  return rows.map(rowToGlobalTodo);
}

export async function createGlobalTodo (payload, changedBy) {
  const todo = newGlobalTodoSchema.parse(payload);
  const id = `todo-global-${nanoid(12)}`;

  await pool.query(
    `INSERT INTO trip_todos
      (id, trip_code, text, due_date, status, scope, visible_for, notes, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tripCode(),
      todo.text,
      todo.dueDate || null,
      todo.status,
      'global',
      todo.visibleFor ? JSON.stringify(todo.visibleFor) : null,
      todo.notes ? JSON.stringify(todo.notes) : null,
      changedBy,
      changedBy
    ]
  );

  return getGlobalTodoById(id);
}

export async function updateTodoStatus (todoId, payload, changedBy, requestId = 'no-id') {
  const { status, doneNote } = todoPatchSchema.parse(payload);

  return withTransaction(async conn => {
    const globalTodo = await updateGlobalTodoStatus(conn, todoId, status, doneNote, changedBy);
    if (globalTodo) return { todo: globalTodo, scope: 'global' };

    const found = await findDayByTodoId(conn, todoId);
    if (!found) throw dbErrorMsg(404, 'Pendiente no encontrado');

    const { dayId, day } = found;
    const todo = findTodo(day, todoId);
    todo.status = status;

    if (status === 'done') {
      const note = doneNote?.trim();
      if (note) todo.doneNote = note;
      else delete todo.doneNote;
      todo.doneAt = new Date().toISOString();
    } else {
      delete todo.doneNote;
      delete todo.doneAt;
    }

    await saveDayWithBackup(conn, dayId, day, 'update-todo-status', changedBy, found.previousJson);
    return { todo, day, scope: 'activity' };
  }, requestId);
}

export async function addTodoToActivity (dayId, activityId, payload, changedBy, requestId = 'no-id') {
  const todo = {
    id: `todo-${nanoid(12)}`,
    ...newTodoSchema.parse(payload)
  };

  return withTransaction(async conn => {
    const day = await getDayForUpdate(conn, dayId);
    const activity = findActivity(day, activityId);
    if (!activity) throw dbErrorMsg(404, 'Actividad no encontrada');

    activity.todos = Array.isArray(activity.todos) ? activity.todos : [];
    activity.todos.push(todo);

    await saveDayWithBackup(conn, dayId, day, 'add-todo', changedBy);
    return { todo, day };
  }, requestId);
}

export async function updateActivityTodo (dayId, activityId, todoId, payload, changedBy, requestId = 'no-id') {
  const patch = editTodoSchema.parse(payload);

  return withTransaction(async conn => {
    const day = await getDayForUpdate(conn, dayId);
    const activity = findActivity(day, activityId);
    if (!activity) throw dbErrorMsg(404, 'Actividad no encontrada');

    const todo = activity.todos?.find(item => item.id === todoId);
    if (!todo) throw dbErrorMsg(404, 'Pendiente no encontrado');

    if (patch.text !== undefined) todo.text = patch.text;
    if (patch.dueDate !== undefined) {
      if (patch.dueDate === null || patch.dueDate.trim() === '') delete todo.dueDate;
      else todo.dueDate = patch.dueDate;
    }

    await saveDayWithBackup(conn, dayId, day, 'update-activity-todo', changedBy);
    return { todo, day };
  }, requestId);
}

export async function addLinkToActivity (dayId, activityId, payload, changedBy, requestId = 'no-id') {
  const link = {
    id: `link-${nanoid(12)}`,
    ...newLinkSchema.parse(payload)
  };

  return withTransaction(async conn => {
    const day = await getDayForUpdate(conn, dayId);
    const activity = findActivity(day, activityId);
    if (!activity) throw dbErrorMsg(404, 'Actividad no encontrada');

    activity.links = Array.isArray(activity.links) ? activity.links : [];
    activity.links.push(link);

    await saveDayWithBackup(conn, dayId, day, 'add-link', changedBy);
    return { link, day };
  }, requestId);
}

export async function replaceTripDay (dayId, payload, changedBy, requestId = 'no-id') {
  const parsedDay = editableDaySchema.parse(payload);

  if (parsedDay.id !== dayId) {
    throw dbErrorMsg(400, 'El id del JSON no coincide con el dia editado');
  }

  validateEditableDay(parsedDay);
  const { day } = normalizeDayTodos(parsedDay);

  return withTransaction(async conn => {
    await getDayForUpdate(conn, dayId);
    await saveDayWithBackup(conn, dayId, day, 'replace-day-json', changedBy);
    return day;
  }, requestId);
}

export async function replaceTripCity (cityId, payload) {
  const parsedCity = editableCitySchema.parse(payload);

  if (parsedCity.id !== cityId) {
    throw dbErrorMsg(400, 'El id del JSON no coincide con la ciudad editada');
  }

  const [result] = await pool.query(
    'UPDATE trip_cities SET data_json = ? WHERE trip_code = ? AND id = ?',
    [JSON.stringify(parsedCity), tripCode(), cityId]
  );

  if (result.affectedRows === 0) throw dbErrorMsg(404, 'Ciudad no encontrada');

  return parsedCity;
}

async function getDocuments () {
  const [rows] = await pool.query(
    'SELECT doc_type, data_json FROM trip_documents WHERE trip_code = ?',
    [tripCode()]
  );
  return Object.fromEntries(rows.map(row => [row.doc_type, parseJson(row.data_json)]));
}

async function getGlobalTodoById (id) {
  const [rows] = await pool.query(
    `SELECT id, text, due_date, status, scope, visible_for, notes, done_note, done_at, created_at, updated_at
     FROM trip_todos
     WHERE trip_code = ? AND id = ?`,
    [tripCode(), id]
  );
  if (rows.length === 0) throw dbErrorMsg(404, 'Pendiente global no encontrado');
  return rowToGlobalTodo(rows[0]);
}

async function updateGlobalTodoStatus (conn, todoId, status, doneNote, changedBy) {
  const [rows] = await conn.query(
    `SELECT id, text, due_date, status, scope, visible_for, notes, done_note, done_at, created_at, updated_at
     FROM trip_todos
     WHERE trip_code = ? AND id = ?
     FOR UPDATE`,
    [tripCode(), todoId]
  );
  if (rows.length === 0) return null;

  const note = doneNote?.trim() || null;

  if (status === 'done') {
    await conn.query(
      'UPDATE trip_todos SET status = ?, done_note = ?, done_at = NOW(), updated_by = ? WHERE trip_code = ? AND id = ?',
      [status, note, changedBy, tripCode(), todoId]
    );
    return { ...rowToGlobalTodo(rows[0]), status, doneNote: note || undefined, doneAt: new Date().toISOString() };
  }

  await conn.query(
    'UPDATE trip_todos SET status = ?, done_note = NULL, done_at = NULL, updated_by = ? WHERE trip_code = ? AND id = ?',
    [status, changedBy, tripCode(), todoId]
  );

  const todo = { ...rowToGlobalTodo(rows[0]), status };
  delete todo.doneNote;
  delete todo.doneAt;
  return todo;
}

async function getDayForUpdate (conn, dayId) {
  const [rows] = await conn.query(
    'SELECT data_json FROM trip_days WHERE trip_code = ? AND id = ? FOR UPDATE',
    [tripCode(), dayId]
  );
  if (rows.length === 0) throw dbErrorMsg(404, 'Dia no encontrado');
  return parseJson(rows[0].data_json);
}

async function findDayByTodoId (conn, todoId) {
  const [rows] = await conn.query(
    'SELECT id, data_json FROM trip_days WHERE trip_code = ? ORDER BY sort_order FOR UPDATE',
    [tripCode()]
  );

  for (const row of rows) {
    const day = parseJson(row.data_json);
    if (findTodo(day, todoId)) {
      return { dayId: row.id, day, previousJson: row.data_json };
    }
  }
  return null;
}

async function saveDayWithBackup (conn, dayId, day, reason, changedBy, previousJson = null) {
  const before = previousJson ?? JSON.stringify(await getDayForUpdate(conn, dayId));
  await conn.query(
    'INSERT INTO trip_day_backups (trip_code, day_id, previous_json, reason, changed_by) VALUES (?, ?, ?, ?, ?)',
    [tripCode(), dayId, stringifyJson(before), reason, changedBy]
  );
  await conn.query(
    'UPDATE trip_days SET data_json = ? WHERE trip_code = ? AND id = ?',
    [JSON.stringify(day), tripCode(), dayId]
  );
}

function findActivity (day, activityId) {
  return day.activities?.find(activity => activity.id === activityId) || null;
}

function findTodo (day, todoId) {
  for (const activity of day.activities || []) {
    const todo = activity.todos?.find(item => item.id === todoId);
    if (todo) return todo;
  }
  return null;
}

function validateEditableDay (day) {
  for (const activity of day.activities || []) {
    if (!activity.id || typeof activity.id !== 'string') {
      throw dbErrorMsg(400, 'Cada actividad debe tener id');
    }
    if (!activity.title || typeof activity.title !== 'string') {
      throw dbErrorMsg(400, `La actividad ${activity.id} debe tener title`);
    }
    if (activity.todos !== undefined) {
      if (!Array.isArray(activity.todos)) {
        throw dbErrorMsg(400, `Los pendientes de ${activity.id} deben ser un array`);
      }
      for (const todo of activity.todos) {
        if (typeof todo !== 'object' || todo === null || Array.isArray(todo)) {
          throw dbErrorMsg(400, `Cada pendiente de ${activity.id} debe ser un objeto con text, status y dueDate opcional`);
        }
        if (!todo.text || typeof todo.text !== 'string') {
          throw dbErrorMsg(400, `Cada pendiente de ${activity.id} debe tener text`);
        }
      }
    }
    if (activity.links !== undefined && !Array.isArray(activity.links)) {
      throw dbErrorMsg(400, `Los links de ${activity.id} deben ser un array`);
    }
    if (activity.logistics !== undefined && (typeof activity.logistics !== 'object' || activity.logistics === null || Array.isArray(activity.logistics))) {
      throw dbErrorMsg(400, `La logistica de ${activity.id} debe ser un objeto`);
    }
  }
}

function parseJson (value) {
  if (typeof value === 'string') return JSON.parse(value);
  return value;
}

function stringifyJson (value) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function rowToGlobalTodo (row) {
  return {
    id: row.id,
    text: row.text,
    dueDate: row.due_date || undefined,
    status: row.status,
    scope: row.scope,
    visibleFor: parseOptionalJson(row.visible_for),
    notes: parseOptionalJson(row.notes),
    doneNote: row.done_note || undefined,
    doneAt: row.done_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseOptionalJson (value) {
  if (value === null || value === undefined) return undefined;
  return parseJson(value);
}
