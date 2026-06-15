# Trip App Back

Backend minimo para Trip App Europa 2026.

## Stack

- Node.js + Express
- MySQL con `mysql2/promise`
- Datos del viaje como documentos JSON por dia/ciudad
- Uploads en filesystem, metadata en MySQL

## Comandos

```bash
pnpm install
pnpm run migrate
pnpm run import:json
pnpm run normalize:todos
pnpm run dev
```

## Variables

Copiar `.env.example` a `.env` y completar credenciales MySQL.

En runtime productivo el backend no necesita acceso al directorio del frontend. MySQL es la fuente de verdad.

`IMPORT_DATA_DIR` solo se usa para el script local `pnpm run import:json`. Tambien se puede pasar el path por argumento:

```bash
pnpm run import:json -- ../trip-app/public/data
```

El import agrega automaticamente `id` estable a pendientes que no lo tengan. Si la DB ya estaba importada, ejecutar:

```bash
pnpm run normalize:todos
```

## Endpoints

Publicos:

```text
GET /api/health
GET /api/trip-data
GET /api/days
GET /api/days/:dayId
GET /api/cities
GET /api/todos
```

Privados:

```text
POST /api/admin/import-trip-data
POST /api/todos
PATCH /api/todos/:todoId
POST /api/days/:dayId/activities/:activityId/todos
PATCH /api/days/:dayId/activities/:activityId/todos/:todoId
POST /api/days/:dayId/activities/:activityId/links
POST /api/uploads/reservation
```

Para escritura se puede usar cookie via `/api/auth/login` o header:

```text
x-trip-admin-key: <TRIP_ADMIN_KEY>
```

## Modelo

- `trip_days`: un JSON completo por dia.
- `trip_cities`: un JSON completo por ciudad.
- `trip_documents`: documentos chicos como `opciones`.
- `trip_todos`: pendientes globales no vinculados a un dia.
- `trip_day_backups`: copia del JSON anterior antes de mutar un dia.
- `trip_uploads`: metadata de archivos subidos.

## Notas

- El frontend deberia poder consumir `/api/trip-data` sin cambiar el shape principal.
- Antes de habilitar edicion real de pendientes conviene agregar `id` estable a todos los `todos` existentes.
- La importacion portable puede hacerse por HTTP enviando `{ itinerary, cities, opciones }` a `/api/admin/import-trip-data`.
