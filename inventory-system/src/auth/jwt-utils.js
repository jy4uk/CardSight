import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-change-in-production';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';

export function generateAccessToken(userId, email) {
  return jwt.sign(
    { userId, email, type: 'access' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function generateRefreshToken(userId, email, tokenVersion) {
  return jwt.sign(
    { userId, email, tokenVersion, type: 'refresh' },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

export function generatePasswordResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Cookie configuration for refresh token
// UPDATED: With Vercel rewrites, requests are now same-origin (First-Party)
// This bypasses iOS ITP (Intelligent Tracking Prevention) cookie blocking
// - secure: MUST be true in production (requires HTTPS)
// - sameSite: 'lax' works perfectly for same-origin requests (better than 'none')
// - httpOnly: MUST be true to prevent XSS attacks
// - path: Restrict to auth routes for better security
// - domain: Omitted to let browser assign automatically (required for same-origin)
const isProduction = process.env.NODE_ENV === 'production';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction, // MUST be true in production
  sameSite: 'lax', // 'lax' for same-origin via Vercel proxy (iOS ITP compatible)
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/api/auth' // Restrict cookie to auth routes only
  // domain: intentionally omitted - browser assigns automatically
};
