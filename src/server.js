import app from './app.js';
import { config } from './config/env.config.js';
import { testDbConnection, sequelize } from './config/db.config.js';
import './models/User.model.js'; // Registers User model with Sequelize
import './models/Category.model.js'; // Registers Category model with Sequelize
import './models/Vehicle.model.js'; // Registers Vehicle model with Sequelize

// ============================================================================
// 🛠️ DATABASE SYNC ALTER FUNCTION
// ============================================================================
const syncDatabase = async () => {
  try {
    console.log('🔄 Syncing database tables with { alter: true }...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synchronized successfully!');
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
  }
};

const server = app.listen(config.port, async () => {
  console.log(`🚀 Server started successfully on port ${config.port}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🩺 Health check URL: http://localhost:${config.port}${config.apiPrefix}/health`);

  // Check MySQL database connection
  await testDbConnection();

  // --------------------------------------------------------------------------
  // 👉 DATABASE SYNC (ACTIVE): Tables sync and alter automatically
  // --------------------------------------------------------------------------
  await syncDatabase();
});

// Graceful Shutdown handling
const handleShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  try {
    await sequelize.close();
    console.log('✅ Database connections closed.');
  } catch (err) {
    console.error('Error closing database connections:', err.message);
  }

  server.close(() => {
    console.log('✅ HTTP server closed. Process terminating.');
    process.exit(0);
  });

  // Force close after 10s if hangs
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Uncaught exceptions & rejections
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => {
    process.exit(1);
  });
});
