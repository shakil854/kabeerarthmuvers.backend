import { Sequelize } from 'sequelize';
import { config } from './env.config.js';

// Initialize Sequelize instance for MySQL
export const sequelize = new Sequelize(
  config.db.database,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: config.db.connectionLimit,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

/**
 * Test database connectivity
 * @returns {Promise<boolean>}
 */
export const testDbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ MySQL Database connected successfully [Database: ${config.db.database}]`);
    return true;
  } catch (error) {
    console.warn(`⚠️ MySQL Connection Warning: ${error.message}`);
    console.warn('👉 Please verify MySQL is running and database exists in your MySQL server.');
    return false;
  }
};

export default sequelize;
