import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.config.js';
import User from '../models/User.model.js';
import { sendOtpEmail } from '../services/email.service.js';

// Helper to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

/**
 * @desc Register a new user (Restricted to 'customer' role only)
 * @route POST /api/v1/auth/register
 * @access Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, mobile, email, password } = req.body;

  if (!name || !mobile || !email || !password) {
    throw new ApiError(400, 'Name, mobile, email, and password are all required.');
  }

  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long.');
  }

  // Check existing email or mobile
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ email }, { mobile }],
    },
  });

  if (existingUser) {
    if (existingUser.email.toLowerCase() === email.toLowerCase()) {
      throw new ApiError(409, 'An account with this email already exists.');
    }
    if (existingUser.mobile === mobile) {
      throw new ApiError(409, 'An account with this mobile number already exists.');
    }
  }

  // Strictly assign 'customer' role
  const user = await User.create({
    name: name.trim(),
    mobile: mobile.trim(),
    email: email.trim().toLowerCase(),
    password,
    role: 'customer',
  });

  const token = generateToken(user);

  const userData = {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  return res
    .status(201)
    .json(new ApiResponse(201, { user: userData, token }, 'Customer account created successfully!'));
});

/**
 * @desc Login user with email or mobile
 * @route POST /api/v1/auth/login
 * @access Public
 */
export const login = asyncHandler(async (req, res) => {
  const { identifier, email, mobile, password } = req.body;
  const loginKey = identifier || email || mobile;

  if (!loginKey || !password) {
    throw new ApiError(400, 'Email/Mobile and password are required.');
  }

  const user = await User.findOne({
    where: {
      [Op.or]: [{ email: loginKey.toLowerCase() }, { mobile: loginKey }],
    },
  });

  if (!user) {
    throw new ApiError(401, 'Invalid credentials. Please check your email/mobile and password.');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials. Incorrect password.');
  }

  const token = generateToken(user);

  const userData = {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, { user: userData, token }, 'Logged in successfully!'));
});

/**
 * @desc Change password for authenticated user
 * @route POST /api/v1/auth/change-password
 * @access Private (JWT required)
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, 'Both old password and new password are required.');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters long.');
  }

  const user = await User.findByPk(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User account not found.');
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    throw new ApiError(400, 'Your old password does not match our records.');
  }

  if (oldPassword === newPassword) {
    throw new ApiError(400, 'New password cannot be the same as your old password.');
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Password has been changed successfully!'));
});

/**
 * @desc Send OTP for password reset
 * @route POST /api/v1/auth/forgot-password
 * @access Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Please provide your registered email address.');
  }

  const user = await User.findOne({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    throw new ApiError(404, 'No user account found with this email address.');
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save();

  await sendOtpEmail(user.email, otp);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { email: user.email },
        'A 6-digit OTP has been sent to your email. Please verify within 10 minutes.'
      )
    );
});

/**
 * @desc Verify OTP & Reset Password
 * @route POST /api/v1/auth/reset-password
 * @access Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    throw new ApiError(400, 'Email, OTP, and new password are required.');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters long.');
  }

  const user = await User.findOne({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  if (!user.otp || user.otp !== otp.trim()) {
    throw new ApiError(400, 'Invalid OTP code entered.');
  }

  if (!user.otpExpires || new Date() > new Date(user.otpExpires)) {
    throw new ApiError(400, 'The OTP has expired. Please request a new OTP.');
  }

  user.password = newPassword;
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Password reset successfully! You can now log in with your new password.'));
});

/**
 * @desc Get current logged-in user profile
 * @route GET /api/v1/auth/me
 * @access Private
 */
export const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, { user: req.user }, 'Current user profile'));
});
