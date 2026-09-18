import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.config.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Convert generic Error to ApiError if not already an instance
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  const response = {
    statusCode: error.statusCode,
    success: false,
    message: error.message,
    errors: error.errors,
    ...(config.isDev && { stack: error.stack }),
  };

  res.status(error.statusCode).json(response);
};
