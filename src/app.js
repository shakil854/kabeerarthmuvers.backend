import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.config.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';

const app = express();

// Security Middlewares
app.use(helmet());

// CORS configuration - allow Web and Mobile App (Capacitor/Cordova)
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request Parsing
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// Logging
if (config.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Welcome Route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Kabeer Earth Movers Backend API',
    version: '1.0.0',
    status: 'running',
    healthCheck: `${config.apiPrefix}/health`,
  });
});

// Mount Main API Routes
app.use(config.apiPrefix, apiRoutes);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
