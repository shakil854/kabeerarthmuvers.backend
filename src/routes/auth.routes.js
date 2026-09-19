import { Router } from 'express';
import {
  register,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/auth.controller.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public Authentication Routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected Routes (Token Required)
router.post('/change-password', verifyJwt, changePassword);
router.get('/me', verifyJwt, getMe);

export default router;
