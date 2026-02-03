import express, { Request, Response } from 'express';
import { UserService } from '../auth/user-service.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  generatePasswordResetToken,
  hashResetToken,
  COOKIE_OPTIONS 
} from '../auth/jwt-utils.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../utils/AppError.js';
import { query } from '../services/db.js';

const router = express.Router();
const userService = new UserService();

// POST /auth/signup - Create new user account
router.post('/signup', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, username, betaCode } = req.body;

  // Validation
  if (!email || !password || !username) {
    throw AppError.badRequest('Email, password, and username are required');
  }

  if (!betaCode) {
    throw AppError.badRequest('Beta access code is required during beta phase');
  }

  if (password.length < 8) {
    throw AppError.badRequest('Password must be at least 8 characters');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw AppError.badRequest('Invalid email format');
  }

  // Validate username format (3-50 chars, alphanumeric, underscore, hyphen)
  const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  if (!usernameRegex.test(username)) {
    throw AppError.badRequest('Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens');
  }

  // Check if username already exists
  const existingUser = await userService.getUserByUsername(username);
  if (existingUser) {
    throw AppError.conflict('Username already taken');
  }

  // BETA ACCESS: Check user count (50 user cap)
  const userCountResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM users WHERE is_active = true');
  const userCount = parseInt(userCountResult[0].count);
  
  if (userCount >= 50) {
    throw AppError.forbidden('Beta is currently at capacity. Please check back later.');
  }

  // BETA ACCESS: Validate beta code
  const betaCodeResult = await query<any>(
    'SELECT * FROM beta_codes WHERE code = $1',
    [betaCode]
  );

  if (betaCodeResult.length === 0) {
    throw AppError.badRequest('Invalid beta access code');
  }

  const betaCodeRecord = betaCodeResult[0];
  if (betaCodeRecord.is_used) {
    throw AppError.badRequest('This beta code has already been used');
  }

  // Create user
  const user = await userService.createUser({
    email,
    password,
    firstName,
    lastName,
    username
  });

  // Mark beta code as used
  await query(
    'UPDATE beta_codes SET is_used = true, used_by_user_id = $1, used_at = NOW() WHERE code = $2',
    [user.id, betaCode]
  );

  // Generate tokens
  const tokenVersion = await userService.getTokenVersion(user.id);
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, user.email, tokenVersion);

  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS as any);

  // Return access token and user info
  res.status(201).json({
    success: true,
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName
    }
  });
}));

// POST /auth/login - Login with email/username and password
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    throw AppError.badRequest('Email/username and password are required');
  }

  // Try to find user by email or username
  let user = await userService.getUserByEmail(email);
  if (!user) {
    user = await userService.getUserByUsername(email);
  }

  if (!user) {
    throw AppError.unauthorized('Invalid credentials');
  }

  // Verify password
  const bcrypt = await import('bcrypt');
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw AppError.unauthorized('Invalid credentials');
  }

  // Update last login
  await userService.updateLastLogin(user.id);

  // Generate tokens
  const tokenVersion = await userService.getTokenVersion(user.id);
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, user.email, tokenVersion);

  // Set refresh token in httpOnly cookie
  const cookieOptions = rememberMe 
    ? { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
    : COOKIE_OPTIONS; // 7 days default

  res.cookie('refreshToken', refreshToken, cookieOptions as any);

  res.json({
    success: true,
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName
    }
  });
}));

// POST /auth/refresh - Refresh access token using refresh token
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw AppError.unauthorized('Refresh token required');
  }

  const decoded = verifyRefreshToken(refreshToken) as any;
  
  // Verify token version hasn't changed (for forced logout)
  const currentTokenVersion = await userService.getTokenVersion(decoded.userId);
  if (decoded.tokenVersion !== currentTokenVersion) {
    throw AppError.unauthorized('Token has been invalidated');
  }

  // Generate new access token
  const accessToken = generateAccessToken(decoded.userId, decoded.email);

  res.json({
    success: true,
    accessToken
  });
}));

// POST /auth/logout - Logout user
router.post('/logout', asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('refreshToken', COOKIE_OPTIONS as any);
  res.json({ success: true, message: 'Logged out successfully' });
}));

// GET /auth/me - Get current user info
router.get('/me', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = await userService.getUserById(userId);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName
    }
  });
}));

// POST /auth/forgot-password - Request password reset
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw AppError.badRequest('Email is required');
  }

  const user = await userService.getUserByEmail(email);
  if (!user) {
    // Don't reveal if email exists
    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
    return;
  }

  // Generate reset token
  const resetToken = generatePasswordResetToken();
  const hashedToken = hashResetToken(resetToken);

  // Store hashed token in database (expires in 1 hour)
  await query(
    `UPDATE users 
     SET password_reset_token = $1, 
         password_reset_expires = NOW() + INTERVAL '1 hour'
     WHERE id = $2`,
    [hashedToken, user.id]
  );

  // TODO: Send email with reset link containing resetToken
  // For now, just return success (in production, send email)
  
  res.json({ 
    success: true, 
    message: 'If the email exists, a reset link has been sent',
    // Remove this in production - only for development
    ...(process.env.NODE_ENV === 'development' && { resetToken })
  });
}));

// POST /auth/reset-password - Reset password with token
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw AppError.badRequest('Token and new password are required');
  }

  if (newPassword.length < 8) {
    throw AppError.badRequest('Password must be at least 8 characters');
  }

  // Hash the token to compare with stored hash
  const hashedToken = hashResetToken(token);

  // Find user with valid reset token
  const [user] = await query<any>(
    `SELECT * FROM users 
     WHERE password_reset_token = $1 
     AND password_reset_expires > NOW()`,
    [hashedToken]
  );

  if (!user) {
    throw AppError.badRequest('Invalid or expired reset token');
  }

  // Update password and clear reset token
  await userService.updatePassword(user.id, newPassword);
  await query(
    `UPDATE users 
     SET password_reset_token = NULL, 
         password_reset_expires = NULL 
     WHERE id = $1`,
    [user.id]
  );

  res.json({ success: true, message: 'Password reset successfully' });
}));

export default router;
