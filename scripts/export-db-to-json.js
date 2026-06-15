import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../src/database/db.js';

const tripCode = process.env.TRIP_CODE || 'europa-2026';
const outputDir = process.env.EXPORT_DATA_DIR || 'exports/data';

function parseJson (value) {
  if (typeof value === 'string') return JSON.parse(value);
  return value;
}

async function run () {
  const daysDir = path.resolve(outputDir, 'days');
  await mkdir(daysDir, { recursive: true });

  const [dayRows] = await pool.query(
    'SELECT id, date_label, data_json FROM trip_days WHERE trip_code = ? ORDER BY sort_order',
    [tripCode]
  );

  const index = [];
  for (const row of dayRows) {
    const file = `days/${row.id}.json`;
    index.push({ date: row.date_label, file });
    await writeFile(path.resolve(outputDir, file), `${JSON.stringify(parseJson(row.data_json), null, 2)}\n`);
  }

  await writeFile(path.resolve(outputDir, 'itinerary.json'), `${JSON.stringify({ days: index }, null, 2)}\n`);

  const [cityRows] = await pool.query(
    'SELECT id, data_json FROM trip_cities WHERE trip_code = ? ORDER BY id',
    [tripCode]
  );
  const cities = Object.fromEntries(cityRows.map(row => [row.id, parseJson(row.data_json)]));
  await writeFile(path.resolve(outputDir, 'cities.json'), `${JSON.stringify(cities, null, 2)}\n`);

  const [documentRows] = await pool.query(
    'SELECT doc_type, data_json FROM trip_documents WHERE trip_code = ?',
    [tripCode]
  );
  for (const row of documentRows) {
    await writeFile(path.resolve(outputDir, `${row.doc_type}.json`), `${JSON.stringify(parseJson(row.data_json), null, 2)}\n`);
  }

  console.log(`Exportacion completada en ${path.resolve(outputDir)}`);
  await pool.end();
}

run().catch(async error => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
