import os from 'os';
import { sequelize } from '../config/db.config.js';

export const getSystemHealth = async () => {
  let dbStatus = 'disconnected';
  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
  }

  return {
    uptime: Math.floor(process.uptime()),
    database: {
      type: 'MySQL',
      status: dbStatus,
    },
    memoryUsage: {
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpus: os.cpus().length,
    },
  };
};
