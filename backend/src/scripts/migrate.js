import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../migrations');

async function runMigrations() {
  console.log('🔄 Checking database connection and preparing migration run...');
  console.log(`📡 Target Host: ${config.db.host}:${config.db.port} | Database: ${config.db.name}`);

  // First connect without specifying database to create database if it does not exist
  const rootConn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl ? { rejectUnauthorized: true } : undefined,
  });

  try {
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Ensured database '${config.db.name}' exists.`);
  } finally {
    await rootConn.end();
  }

  // Connect to the specific database
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    ssl: config.db.ssl ? { rejectUnauthorized: true } : undefined,
    multipleStatements: true,
  });

  try {
    // 1. Ensure migrations table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Fetch applied migrations
    const [appliedRows] = await connection.query('SELECT migration_name FROM schema_migrations ORDER BY id ASC');
    const applied = new Set(appliedRows.map((r) => r.migration_name));

    // 3. Read migration files in ascending order
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⏩ Migration already applied: ${file}`);
        continue;
      }

      console.log(`⏳ Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Execute migration in transaction
      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.query('INSERT INTO schema_migrations (migration_name) VALUES (?)', [file]);
        await connection.commit();
        console.log(`✅ Applied migration successfully: ${file}`);
        count++;
      } catch (err) {
        await connection.rollback();
        console.error(`❌ Migration failed on ${file}:`, err.message);
        throw err;
      }
    }

    if (count === 0) {
      console.log('✨ All migrations are up to date.');
    } else {
      console.log(`🎉 Finished applying ${count} migration(s).`);
    }
  } finally {
    await connection.end();
  }
}

runMigrations().catch((err) => {
  console.error('Fatal Migration Error:', err.message);
  process.exit(1);
});
