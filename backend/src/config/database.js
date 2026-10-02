import mysql from 'mysql2/promise';
import fs from 'fs';
import { config } from './env.js';

let pool = null;

export function getDbPool() {
  if (pool) return pool;

  const sslConfig = config.db.ssl
    ? {
        rejectUnauthorized: true,
        ...(config.db.sslCaPath && fs.existsSync(config.db.sslCaPath)
          ? { ca: fs.readFileSync(config.db.sslCaPath) }
          : {}),
      }
    : undefined;

  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    waitForConnections: true,
    connectionLimit: config.db.connectionLimit,
    queueLimit: 0,
    ssl: sslConfig,
    dateStrings: true, // returns dates as YYYY-MM-DD instead of JS Date objects with UTC offsets
    decimalNumbers: false, // returns DECIMAL types as strings to maintain exact financial precision
  });

  return pool;
}

export async function testConnection() {
  try {
    const p = getDbPool();
    const [rows] = await p.query('SELECT 1 as connected');
    return { ok: true, message: 'Database connection successful', rows };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Execute a callback within an atomic transaction.
 * Automatically commits on success and rolls back on error.
 */
export async function withTransaction(callback) {
  const p = getDbPool();
  const connection = await p.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
