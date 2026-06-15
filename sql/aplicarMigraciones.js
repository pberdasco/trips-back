import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/database/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry-run');

async function ensureMigrationsTable () {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations () {
  const [rows] = await pool.query('SELECT id FROM schema_migrations');
  return new Set(rows.map(row => row.id));
}

async function run () {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = (await readdir(__dirname))
    .filter(file => /^\d+.*\.sql$/.test(file))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(__dirname, file), 'utf8');
    console.log(`${dryRun ? 'Pendiente' : 'Aplicando'} migracion ${file}`);
    if (!dryRun) {
      const statements = sql
        .split(';')
        .map(statement => statement.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await pool.query(statement);
      }
      await pool.query('INSERT INTO schema_migrations (id) VALUES (?)', [file]);
    }
  }

  await pool.end();
}

run().catch(async error => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
