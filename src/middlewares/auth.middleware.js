import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/env.config.js';
import User from '../models/User.model.js';

/**
 * Protect routes requiring JWT authentication
 */
export const verifyJwt = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication token missing. Please log in.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'otp', 'otpExpires'] },
    });

    if (!user) {
      throw new ApiError(401, 'User account no longer exists.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
    throw new ApiError(401, 'Invalid authentication token.');
  }
});

/**
 * Role-based authorization middleware
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to perform this action.');
    }
    next();
  };
};
