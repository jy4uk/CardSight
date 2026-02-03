import { JwtPayload } from 'jsonwebtoken';

/**
 * Custom JWT payload interface
 */
export interface CustomJwtPayload extends JwtPayload {
  userId: number;
  email: string;
  tokenVersion?: number;
}
