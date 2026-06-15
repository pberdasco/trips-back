import { z } from 'zod';
import { pool, withTransaction } from '../database/db.js';
import { normalizeDayTodos } from '../utils/tripDataNormalize.js';

const tripCode = () => process.env.TRIP_CODE || 'europa-2026';

const daySchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1)
}).passthrough();

const importTripDataSchema = z.object({
  itinerary: z.array(daySchema).min(1),
  cities: z.record(z.unknown()).default({}),
  opciones: z.unknown().optional(),
  documents: z.record(z.unknown()).optional()
}).passthrough();

export async function importTripData (payload) {
  const data = importTripDataSchema.parse(payload);

  return withTransaction(async conn => {
    let sortOrder = 0;
    for (const day of data.itinerary) {
      const normalized = normalizeDayTodos(day);
      await upsertDay(conn, normalized.day, sortOrder++);
    }

    let citiesCount = 0;
    for (const [id, city] of Object.entries(data.cities)) {
      await upsertCity(conn, id, city);
      citiesCount++;
    }

    const documents = {
      ...(data.opciones === undefined ? {} : { opciones: data.opciones }),
      ...(data.documents || {})
    };

    let documentsCount = 0;
    for (const [docType, document] of Object.entries(documents)) {
      await upsertDocument(conn, docType, document);
      documentsCount++;
    }

    return {
      imported: true,
      days: sortOrder,
      cities: citiesCount,
      documents: documentsCount
    };
  });
}

export async function closeImportPool () {
  await pool.end();
}

async function upsertDay (conn, day, sortOrder) {
  await conn.query(
    `INSERT INTO trip_days (id, trip_code, date_label, sort_order, data_json)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       date_label = VALUES(date_label),
       sort_order = VALUES(sort_order),
       data_json = VALUES(data_json)`,
    [day.id, tripCode(), day.date, sortOrder, JSON.stringify(day)]
  );
}

async function upsertCity (conn, id, city) {
  await conn.query(
    `INSERT INTO trip_cities (id, trip_code, data_json)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)`,
    [id, tripCode(), JSON.stringify(city)]
  );
}

async function upsertDocument (conn, docType, document) {
  const id = `${tripCode()}-${docType}`;
  await conn.query(
    `INSERT INTO trip_documents (id, trip_code, doc_type, data_json)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)`,
    [id, tripCode(), docType, JSON.stringify(document)]
  );
}
