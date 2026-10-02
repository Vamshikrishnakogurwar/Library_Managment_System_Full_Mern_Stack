import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory or repository root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || 'libraflow_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    ssl: process.env.DB_SSL === 'true' || process.env.DB_SSL === '1',
    sslCaPath: process.env.DB_SSL_CA_PATH || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_libraflow_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_libraflow',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
  },
  ai: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  defaults: {
    timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
    currency: process.env.DEFAULT_CURRENCY || 'INR',
  }
};
