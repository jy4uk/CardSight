import express from 'express';
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

const router = express.Router();
const userService = new UserService();

// POST /auth/signup - Create new user account
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, username, betaCode } = req.body;

    // Validation
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    if (!betaCode) {
      return res.status(400).json({ error: 'Beta access code is required during beta phase' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate username format (3-50 chars, alphanumeric, underscore, hyphen)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens' });
    }

    // Check if username already exists
    const existingUser = await userService.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // BETA ACCESS: Check user count (50 user cap)
    const { query } = await import('../services/db.js');
    const userCountResult = await query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    const userCount = parseInt(userCountResult[0].count);
    
    if (userCount >= 50) {
      return res.status(403).json({ error: 'Beta is currently at capacity. Please check back later.' });
    }

    // BETA ACCESS: Validate beta code
    const betaCodeResult = await query(
      'SELECT * FROM beta_codes WHERE code = $1',
      [betaCode]
    );

    if (betaCodeResult.length === 0) {
      return res.status(400).json({ error: 'Invalid beta access code' });
    }

    const betaCodeRecord = betaCodeResult[0];
    if (betaCodeRecord.is_used) {
      return res.status(400).json({ error: 'This beta code has already been used' });
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
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

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
  } catch (error) {
    console.error('Signup error:', error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /auth/login - Login with email/username and password
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    console.log(`🔐 Login attempt: ${email} (rememberMe: ${rememberMe})`);

    if (!email || !password) {
      console.log('❌ Login failed: Missing email or password');
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    // Try to find user by email first, then by username
    let user = await userService.getUserByEmail(email);
    if (!user) {
      user = await userService.getUserByUsername(email);
    }

    if (!user) {
      console.log(`❌ Login failed: User not found for ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`✅ User found: ${user.email} (ID: ${user.id}, Username: ${user.username})`);

    // Validate password
    const bcrypt = await import('bcrypt');
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      console.log(`❌ Login failed: Invalid password for ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await userService.updateLastLogin(user.id);

    // Generate tokens
    const tokenVersion = await userService.getTokenVersion(user.id);
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email, tokenVersion);

    // Set refresh token in httpOnly cookie with extended expiry if rememberMe is true
    const cookieOptions = { ...COOKIE_OPTIONS };
    if (rememberMe) {
      // 30 days in milliseconds
      cookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000;
    }
    res.cookie('refreshToken', refreshToken, cookieOptions);

    console.log(`🎉 Login successful: ${user.email} (rememberMe: ${rememberMe})`);

    // Return access token and user info
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
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/refresh - Get new access token using refresh token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      console.log('❌ Refresh failed: No refresh token cookie found');
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
      console.log(`🔄 Refresh token verified for user ID: ${decoded.userId}`);
    } catch (error) {
      console.log('❌ Refresh failed: Invalid refresh token');
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check token version (for logout from all devices)
    const currentVersion = await userService.getTokenVersion(decoded.userId);
    if (decoded.tokenVersion !== currentVersion) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Get user info
    const user = await userService.getUserById(decoded.userId);
    if (!user) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user.id, user.email);

    console.log(`✅ Token refreshed successfully for user: ${user.email}`);

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
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// POST /auth/logout - Logout and clear refresh token
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Increment token version to invalidate all existing refresh tokens
    await userService.incrementTokenVersion(req.user.userId);
    
    // Clear cookie with same path as it was set
    res.clearCookie('refreshToken', { path: '/api/auth' });
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// POST /auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await userService.getUserByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'If an account exists, a reset link has been sent' 
      });
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken();
    const resetTokenHash = hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await userService.setPasswordResetToken(user.id, resetTokenHash, expiresAt);

    // TODO: Send email with reset link
    // For now, we'll log it (in production, use a real email service)
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    console.log('Password reset link:', resetLink);
    console.log('Reset token (for testing):', resetToken);

    res.json({ 
      success: true, 
      message: 'If an account exists, a reset link has been sent',
      // REMOVE IN PRODUCTION - only for testing
      ...(process.env.NODE_ENV !== 'production' && { resetToken, resetLink })
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Hash the token and find user
    const tokenHash = hashResetToken(token);
    const user = await userService.getUserByResetToken(tokenHash);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password
    await userService.updatePassword(user.id, newPassword);
    await userService.clearPasswordResetToken(user.id);
    
    // Invalidate all refresh tokens
    await userService.incrementTokenVersion(user.id);

    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// GET /auth/me - Get current user info (protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
