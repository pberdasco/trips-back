import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { closeImportPool, importTripData } from '../src/services/import_service.js';

const dataDir = process.argv.slice(2).find(arg => arg !== '--') || process.env.IMPORT_DATA_DIR || '../trip-app/public/data';

async function readJson (relativePath) {
  const content = await readFile(path.resolve(dataDir, relativePath), 'utf8');
  return JSON.parse(content);
}

async function run () {
  const itineraryIndex = await readJson('itinerary.json');
  const entries = Array.isArray(itineraryIndex) ? itineraryIndex : itineraryIndex.days;
  if (!Array.isArray(entries)) throw new Error('itinerary.json debe ser un array o tener propiedad days');

  const itinerary = [];
  for (const entry of entries) {
    itinerary.push(await readJson(entry.file || `days/${entry.date}.json`));
  }

  const payload = {
    itinerary,
    cities: await readJson('cities.json')
  };

  try {
    payload.opciones = await readJson('opciones.json');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const result = await importTripData(payload);
  console.log(`Importacion completada desde ${path.resolve(dataDir)}:`, result);
  await closeImportPool();
}

run().catch(async error => {
  console.error(error);
  await closeImportPool();
  process.exit(1);
});
