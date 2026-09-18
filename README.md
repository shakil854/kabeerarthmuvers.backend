# Kabeer Earth Movers - Backend API

Production-ready, scalable REST API built with Node.js, Express, and modern ES Modules.

## Architecture

This backend follows the **Layered Clean Architecture** pattern:

```text
src/
├── app.js                   # Express application configuration and middleware setup
├── server.js                # Server entry point & graceful shutdown
├── config/
│   └── env.config.js        # Environment configuration
├── controllers/
│   └── health.controller.js # Request handlers
├── middlewares/
│   ├── error.middleware.js  # Centralized global error handler
│   └── notFound.middleware.js # 404 Route handler
├── models/                  # Database models & schemas
├── routes/
│   ├── index.js             # Root API router
│   └── health.routes.js     # Health check routes
├── services/
│   └── health.service.js    # Business logic layer
└── utils/
    ├── ApiError.js          # Custom error wrapper
    ├── ApiResponse.js        # Standardized response wrapper
    └── asyncHandler.js      # Async error boundary wrapper
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```

The server runs by default on `http://localhost:5000`.

### 4. API Endpoints
- **Root**: `GET /`
- **Health Check**: `GET /api/v1/health`
