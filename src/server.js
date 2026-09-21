import app from './app.js';
import { config } from './config/env.config.js';
import { testDbConnection, sequelize } from './config/db.config.js';
import './models/User.model.js'; // Registers User model with Sequelize
import './models/Category.model.js'; // Registers Category model with Sequelize
import './models/Vehicle.model.js'; // Registers Vehicle model with Sequelize
import './models/Supplier.model.js'; // Registers Supplier model with Sequelize
import './models/Customer.model.js'; // Registers Customer model with Sequelize
import './models/Purchase.model.js'; // Registers Purchase model with Sequelize
import './models/Sale.model.js'; // Registers Sale model with Sequelize
import './models/Expense.model.js'; // Registers Expense model with Sequelize

// ============================================================================
// 🛠️ SMART NON-DESTRUCTIVE DATABASE SYNC FUNCTION
// - Naya model banaye to nayi table create karega
// - Purani table me naya field/column add kare to bina purane data ko chhede column add karega
// - Purana data 100% safe rahega (kabhi DROP ya ALTER duplicate keys nahi karega)
// ============================================================================
const syncDatabase = async () => {
  try {
    console.log('🔄 Checking database tables & columns...');
    const queryInterface = sequelize.getQueryInterface();
    const existingTables = await queryInterface.showAllTables();

    // Iterate through all registered models in Sequelize
    for (const modelName of Object.keys(sequelize.models)) {
      const model = sequelize.models[modelName];
      const tableName = typeof model.getTableName === 'function' ? model.getTableName() : model.tableName;

      const tableExists = existingTables.some(
        (t) => t.toLowerCase() === tableName.toLowerCase()
      );

      if (!tableExists) {
        console.log(`✨ Creating new table: '${tableName}'...`);
        await model.sync();
        console.log(`✅ Table '${tableName}' created successfully!`);
      } else {
        // Table exists -> check for any newly added columns in model
        const currentColumns = await queryInterface.describeTable(tableName);
        const existingColNames = Object.keys(currentColumns).map((c) => c.toLowerCase());
        const modelAttributes = model.rawAttributes;

        for (const [attrName, attrDef] of Object.entries(modelAttributes)) {
          const fieldName = attrDef.field || attrName;
          if (!existingColNames.includes(fieldName.toLowerCase())) {
            console.log(`➕ Adding new field '${fieldName}' to existing table '${tableName}' without touching old data...`);
            await queryInterface.addColumn(tableName, fieldName, attrDef);
            console.log(`✅ Field '${fieldName}' added successfully to '${tableName}'!`);
          }
        }
      }
    }

    console.log('✅ All database tables and columns are up to date! (Old data 100% preserved)');
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
