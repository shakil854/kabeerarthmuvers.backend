import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kabeer_earth_movers',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'kabeer_earth_movers_secret_fallback_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'no-reply@kabeerearthmovers.com',
  },
};
