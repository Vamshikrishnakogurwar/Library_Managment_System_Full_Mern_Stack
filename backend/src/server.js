import { createApp } from './app.js';
import { config } from './config/env.js';
import { testConnection } from './config/database.js';

const app = createApp();

const server = app.listen(config.port, async () => {
  console.log('====================================================');
  console.log(`🚀 LibraFlow Backend Server running on port ${config.port}`);
  console.log(`📡 Environment: ${config.env}`);
  console.log(`🔗 REST API:    http://localhost:${config.port}/api/v1`);
  console.log(`❤️  Health Check: http://localhost:${config.port}/health`);
  console.log('====================================================');

  const dbStatus = await testConnection();
  if (dbStatus.ok) {
    console.log('✅ Connected to MySQL database successfully.');
  } else {
    console.warn('⚠️  Could not connect to MySQL database at startup:', dbStatus.error);
    console.warn('   Ensure MySQL is running or configure .env database variables.');
  }
});

// Graceful Shutdown
function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down LibraFlow backend gracefully...`);
  server.close(() => {
    console.log('👋 HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
