import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { testConnection } from './config/database.js';

import authRoutes from './routes/authRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import circulationRoutes from './routes/circulationRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

export function createApp() {
  const app = express();

  // Security & Utility Middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

  // Rate Limiter on sensitive / auth routes
  const authLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  });

  // Health Check Endpoint
  app.get('/health', async (req, res) => {
    const dbStatus = await testConnection();
    const isHealthy = dbStatus.ok;
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbStatus,
      version: '1.0.0',
    });
  });

  // Versioned API Routes (/api/v1)
  const apiV1 = express.Router();
  apiV1.use('/auth', authLimiter, authRoutes);
  apiV1.use('/catalog', catalogRoutes);
  apiV1.use('/customers', customerRoutes);
  apiV1.use('/circulation', circulationRoutes);
  apiV1.use('/billing', billingRoutes);
  apiV1.use('/system', systemRoutes);

  app.use('/api/v1', apiV1);

  // Serve production built frontend if available
  const publicDistPath = path.resolve(process.cwd(), 'public');
  const frontendDistPath = path.resolve(process.cwd(), '../frontend/dist');
  const staticDir = fs.existsSync(publicDistPath) ? publicDistPath : (fs.existsSync(frontendDistPath) ? frontendDistPath : null);

  if (staticDir) {
    app.use(express.static(staticDir));
    app.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/health')) {
        return next();
      }
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  // 404 Handler for API
  app.use('*', (req, res) => {
    res.status(404).json({ success: false, error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
