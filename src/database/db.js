import { createPool } from 'mysql2/promise';
import { loadEnv } from '../config/env.js';

loadEnv();

export const pool = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export function dbErrorMsg (status, message) {
  const error = new Error(message || 'Error interno de la base de datos');
  error.status = status || 500;
  return error;
}

export async function withTransaction (run, requestId = 'no-id') {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await run(conn);
    await conn.commit();
    return result;
  } catch (error) {
    console.warn(`[req ${requestId}] transaction failed: ${error.message}`);
    try {
      await conn.rollback();
    } catch (rollbackError) {
      console.error(`[req ${requestId}] transaction rollback failed: ${rollbackError.message}`);
    }
    throw error;
  } finally {
    conn.release();
  }
}
