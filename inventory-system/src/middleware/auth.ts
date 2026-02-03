import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth/jwt-utils.js';
import { CustomJwtPayload } from '../types/jwt.js';

/**
 * Middleware to authenticate requests using JWT access tokens
 * Extracts user information from the token and attaches it to req.user
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = verifyAccessToken(token) as CustomJwtPayload;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but continues regardless
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = verifyAccessToken(token) as CustomJwtPayload;
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      // Token invalid but continue anyway
    }
  }
  next();
}
