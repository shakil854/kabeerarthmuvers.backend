import { Router } from 'express';
import {
  register,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe,
  verifyDeletePassword,
} from '../controllers/auth.controller.js';
import { verifyJwt, optionalJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public Authentication Routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-delete-password', optionalJwt, verifyDeletePassword);

// Protected Routes (Token Required)
router.post('/change-password', verifyJwt, changePassword);
router.get('/me', verifyJwt, getMe);

export default router;
