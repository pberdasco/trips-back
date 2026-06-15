import { pool, withTransaction } from '../src/database/db.js';
import { normalizeDayTodos } from '../src/utils/tripDataNormalize.js';

const tripCode = process.env.TRIP_CODE || 'europa-2026';

function parseJson (value) {
  if (typeof value === 'string') return JSON.parse(value);
  return value;
}

async function run () {
  const result = await withTransaction(async conn => {
    const [rows] = await conn.query(
      'SELECT id, data_json FROM trip_days WHERE trip_code = ? ORDER BY sort_order FOR UPDATE',
      [tripCode]
    );

    let updatedDays = 0;
    let addedTodoIds = 0;

    for (const row of rows) {
      const originalDay = parseJson(row.data_json);
      const beforeIds = countTodosWithId(originalDay);
      const beforeTodos = countTodos(originalDay);
      const normalized = normalizeDayTodos(originalDay);

      if (!normalized.changed) continue;

      const afterIds = countTodosWithId(normalized.day);
      addedTodoIds += Math.max(0, afterIds - beforeIds);
      updatedDays++;

      await conn.query(
        'INSERT INTO trip_day_backups (trip_code, day_id, previous_json, reason, changed_by) VALUES (?, ?, ?, ?, ?)',
        [tripCode, row.id, JSON.stringify(originalDay), 'normalize-todo-ids', 'script']
      );
      await conn.query(
        'UPDATE trip_days SET data_json = ? WHERE trip_code = ? AND id = ?',
        [JSON.stringify(normalized.day), tripCode, row.id]
      );

      if (beforeTodos !== countTodos(normalized.day)) {
        throw new Error(`La normalizacion cambio la cantidad de pendientes en ${row.id}`);
      }
    }

    return { updatedDays, addedTodoIds };
  });

  console.log('Normalizacion completada:', result);
  await pool.end();
}

function countTodos (day) {
  return (day.activities || []).reduce((total, activity) => total + (activity.todos?.length || 0), 0);
}

function countTodosWithId (day) {
  return (day.activities || []).reduce(
    (total, activity) => total + (activity.todos || []).filter(todo => typeof todo !== 'string' && todo.id).length,
    0
  );
}

run().catch(async error => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
