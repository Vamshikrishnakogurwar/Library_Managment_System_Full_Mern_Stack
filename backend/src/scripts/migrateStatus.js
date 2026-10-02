import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../migrations');

async function checkStatus() {
  console.log(`🔍 Checking migration status on ${config.db.host}:${config.db.port}/${config.db.name}...`);
  try {
    const connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      ssl: config.db.ssl ? { rejectUnauthorized: true } : undefined,
    });

    const [rows] = await connection.query('SELECT migration_name, applied_at FROM schema_migrations ORDER BY id ASC');
    const appliedMap = new Map(rows.map((r) => [r.migration_name, r.applied_at]));

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    console.log('\n--- Migration Status Table ---');
    for (const f of files) {
      if (appliedMap.has(f)) {
        console.log(`[APPLIED]  ${f} (at ${appliedMap.get(f)})`);
      } else {
        console.log(`[PENDING]  ${f}`);
      }
    }
    console.log('-------------------------------\n');
    await connection.end();
  } catch (err) {
    console.error('Migration status check failed:', err.message);
  }
}

checkStatus();
