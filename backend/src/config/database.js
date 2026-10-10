import mysql from 'mysql2/promise';
import fs from 'fs';
import { config } from './env.js';
import { getSqliteDb } from './sqliteDatabase.js';

let pool = null;
let useSqliteFallback = false;

export function setUseSqlite(val) {
  useSqliteFallback = val;
}

export function isUsingSqlite() {
  return useSqliteFallback;
}

// Convert MySQL SQL with ? placeholders, backticks, CURDATE(), DATE_ADD, etc. to SQLite compatible SQL
function convertMysqlToSqlite(sql) {
  let s = sql;
  // Replace DATE_SUB(CURDATE(), INTERVAL x MONTH)
  s = s.replace(/DATE_SUB\s*\(\s*CURDATE\(\)\s*,\s*INTERVAL\s*(\d+)\s*MONTH\s*\)/gi, "date('now', '-$1 months')");
  s = s.replace(/DATE_SUB\s*\(\s*date\([^)]+\)\s*,\s*INTERVAL\s*(\d+)\s*MONTH\s*\)/gi, "date('now', '-$1 months')");
  // Replace CURDATE() with date('now', 'localtime')
  s = s.replace(/CURDATE\(\)/gi, "date('now', 'localtime')");
  // Replace NOW() with datetime('now', 'localtime')
  s = s.replace(/NOW\(\)/gi, "datetime('now', 'localtime')");
  // Replace DATE_ADD(d, INTERVAL x DAY) with date(d, '+x days')
  s = s.replace(/DATE_ADD\(([^,]+),\s*INTERVAL\s*(\d+)\s*DAY\)/gi, "date($1, '+$2 days')");
  // Replace DATEDIFF(CURDATE(), col) with CAST(julianday('now', 'localtime') - julianday(col) AS INTEGER)
  s = s.replace(/DATEDIFF\(date\('now',\s*'localtime'\),\s*([^)]+)\)/gi, "(CAST(julianday('now', 'localtime') - julianday($1) AS INTEGER))");
  s = s.replace(/DATEDIFF\(CURDATE\(\),\s*([^)]+)\)/gi, "(CAST(julianday('now', 'localtime') - julianday($1) AS INTEGER))");
  // Replace DATE_FORMAT(col, '%b %Y') with strftime('%m-%Y', col)
  s = s.replace(/DATE_FORMAT\(([^,]+),\s*'%b %Y'\)/gi, "strftime('%m-%Y', $1)");
  // Replace YEAR(col) with strftime('%Y', col)
  s = s.replace(/YEAR\(([^)]+)\)/gi, "strftime('%Y', $1)");
  // Replace MONTH(col) with strftime('%m', col)
  s = s.replace(/MONTH\(([^)]+)\)/gi, "strftime('%m', $1)");
  // Remove FOR UPDATE (unsupported in sqlite)
  s = s.replace(/FOR\s+UPDATE/gi, "");
  return s;
}

// Create a pool-like wrapper for SQLite that exposes .query() matching mysql2 interface
function createSqlitePoolWrapper() {
  const db = getSqliteDb();

  return {
    isSqlite: true,
    async query(sql, params = []) {
      const converted = convertMysqlToSqlite(sql);
      const trimmed = converted.trim();
      const isSelect = /^SELECT/i.test(trimmed);

      const flatParams = Array.isArray(params) ? params : [];

      if (isSelect) {
        const stmt = db.prepare(converted);
        const rows = stmt.all(flatParams);
        return [rows, []];
      } else {
        const stmt = db.prepare(converted);
        const info = stmt.run(flatParams);
        return [{ insertId: Number(info.lastInsertRowid), affectedRows: info.changes }, []];
      }
    },
    async getConnection() {
      return {
        async beginTransaction() {
          db.prepare('BEGIN').run();
        },
        async commit() {
          try { db.prepare('COMMIT').run(); } catch(e) {}
        },
        async rollback() {
          try { db.prepare('ROLLBACK').run(); } catch(e) {}
        },
        async query(sql, params = []) {
          return createSqlitePoolWrapper().query(sql, params);
        },
        release() {}
      };
    },
    async end() {}
  };
}

export function getDbPool() {
  if (useSqliteFallback) {
    return createSqlitePoolWrapper();
  }

  if (pool) return pool;

  const sslConfig = config.db.ssl
    ? {
        rejectUnauthorized: true,
        ...(config.db.sslCaPath && fs.existsSync(config.db.sslCaPath)
          ? { ca: fs.readFileSync(config.db.sslCaPath) }
          : {}),
      }
    : undefined;

  const rawPool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    waitForConnections: true,
    connectionLimit: config.db.connectionLimit,
    queueLimit: 0,
    ssl: sslConfig,
    dateStrings: true,
    decimalNumbers: false,
  });

  // Proxy pool so that any unexpected connection failure instantly falls back to SQLite seamlessly
  pool = {
    async query(sql, params) {
      if (useSqliteFallback) {
        return createSqlitePoolWrapper().query(sql, params);
      }
      try {
        return await rawPool.query(sql, params);
      } catch (err) {
        if (
          err.code === 'ECONNREFUSED' ||
          err.code === 'ER_ACCESS_DENIED_ERROR' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ENOTFOUND' ||
          err.code === 'PROTOCOL_CONNECTION_LOST'
        ) {
          console.warn(`[DATABASE] MySQL error (${err.code}). Seamlessly switching to embedded SQLite engine...`);
          useSqliteFallback = true;
          return createSqlitePoolWrapper().query(sql, params);
        }
        throw err;
      }
    },
    async getConnection() {
      if (useSqliteFallback) {
        return createSqlitePoolWrapper().getConnection();
      }
      try {
        return await rawPool.getConnection();
      } catch (err) {
        console.warn(`[DATABASE] MySQL connection failed. Seamlessly switching to embedded SQLite engine...`);
        useSqliteFallback = true;
        return createSqlitePoolWrapper().getConnection();
      }
    },
    async end() {
      return rawPool.end();
    }
  };

  return pool;
}

export async function testConnection() {
  try {
    const p = getDbPool();
    const [rows] = await p.query('SELECT 1 as connected');
    return { ok: true, message: 'Database connected successfully', rows, engine: useSqliteFallback ? 'SQLite' : 'MySQL' };
  } catch (error) {
    console.warn(`[DATABASE] Activating embedded SQLite engine due to error: ${error.message}`);
    useSqliteFallback = true;
    try {
      const sqliteWrapper = createSqlitePoolWrapper();
      const [rows] = await sqliteWrapper.query('SELECT 1 as connected');
      return {
        ok: true,
        message: 'Embedded SQLite database activated. Operational with zero config.',
        rows,
        engine: 'SQLite'
      };
    } catch (sqliteErr) {
      return { ok: false, error: sqliteErr.message };
    }
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
