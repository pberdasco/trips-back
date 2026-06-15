import { createHash } from 'node:crypto';

export function normalizeDayTodos (day) {
  let changed = false;
  const normalizedDay = structuredClone(day);

  for (const activity of normalizedDay.activities || []) {
    if (!Array.isArray(activity.todos)) continue;

    activity.todos = activity.todos.map((todo, index) => {
      const normalizedTodo = typeof todo === 'string'
        ? { text: todo, status: 'pending' }
        : { ...todo };

      if (typeof todo === 'string' || !normalizedTodo.id) {
        normalizedTodo.id = buildTodoId(normalizedDay, activity, normalizedTodo, index);
        changed = true;
      }

      if (!normalizedTodo.status) {
        normalizedTodo.status = 'pending';
        changed = true;
      }

      return normalizedTodo;
    });
  }

  return { day: normalizedDay, changed };
}

function buildTodoId (day, activity, todo, index) {
  const readable = slugify([
    day.id,
    activity.id,
    todo.dueDate,
    todo.text,
    index
  ].filter(Boolean).join('-'));
  const hash = createHash('sha1')
    .update(`${day.id}|${activity.id}|${todo.dueDate || ''}|${todo.text || ''}|${index}`)
    .digest('hex')
    .slice(0, 8);

  return `todo-${readable.slice(0, 72)}-${hash}`;
}

function slugify (value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}
