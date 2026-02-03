import { query } from './db.js';
import { AppError } from '../utils/AppError.js';
import { User, BetaCode, UpdateUserProfileDTO } from '../types/db.js';
import bcrypt from 'bcrypt';

/**
 * Service layer for user management
 */
export class UserService {
  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<User> {
    const [user] = await query<User>(`SELECT * FROM users WHERE id = $1`, [userId]);

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await query<User>(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)`, [
      email,
    ]);
    return user || null;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const [user] = await query<User>(`SELECT * FROM users WHERE LOWER(username) = LOWER($1)`, [
      username,
    ]);
    return user || null;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: number,
    data: UpdateUserProfileDTO
  ): Promise<Omit<User, 'password_hash'>> {
    const { first_name, last_name, username, email } = data;

    // Validate username format if provided
    if (username) {
      const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
      if (!usernameRegex.test(username)) {
        throw AppError.badRequest(
          'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens'
        );
      }

      // Check username uniqueness
      const existingUser = await query<User>(
        `SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2`,
        [username, userId]
      );
      if (existingUser.length > 0) {
        throw AppError.conflict('Username already taken');
      }
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw AppError.badRequest('Invalid email format');
      }

      // Check email uniqueness
      const existingUser = await query<User>(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2`,
        [email, userId]
      );
      if (existingUser.length > 0) {
        throw AppError.conflict('Email already in use');
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${paramCount}`);
      values.push(first_name);
      paramCount++;
    }

    if (last_name !== undefined) {
      updates.push(`last_name = $${paramCount}`);
      values.push(last_name);
      paramCount++;
    }

    if (username !== undefined) {
      updates.push(`username = $${paramCount}`);
      values.push(username);
      paramCount++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (updates.length === 0) {
      throw AppError.badRequest('No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const [user] = await query<User>(
      `UPDATE users 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, email, username, first_name, last_name, created_at`,
      values
    );

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return user;
  }

  /**
   * Delete user account (with password verification)
   */
  async deleteUserAccount(userId: number, password: string): Promise<void> {
    if (!password) {
      throw AppError.badRequest('Password is required');
    }

    // Get user with password hash
    const [user] = await query<User>(`SELECT * FROM users WHERE id = $1`, [userId]);

    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid password');
    }

    // Delete user data in correct order (respecting foreign keys)
    await query(`DELETE FROM trade_items WHERE trade_id IN (SELECT id FROM trades WHERE user_id = $1)`, [userId]);
    await query(`DELETE FROM trades WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM saved_deals WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM transactions WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM card_shows WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM inventory WHERE user_id = $1`, [userId]);

    // Mark beta code as unused if applicable
    if (user.beta_code_id) {
      await query(`UPDATE beta_codes SET is_used = false, used_by_user_id = NULL WHERE id = $1`, [
        user.beta_code_id,
      ]);
    }

    // Finally delete user
    await query(`DELETE FROM users WHERE id = $1`, [userId]);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: number): Promise<void> {
    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [userId]);
  }

  /**
   * Get token version for user
   */
  async getTokenVersion(userId: number): Promise<number> {
    const [user] = await query<{ token_version: number }>(
      `SELECT token_version FROM users WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return user.token_version;
  }

  /**
   * Increment token version (for forced logout)
   */
  async incrementTokenVersion(userId: number): Promise<void> {
    await query(`UPDATE users SET token_version = token_version + 1 WHERE id = $1`, [userId]);
  }

  /**
   * Validate beta code
   */
  async validateBetaCode(code: string): Promise<BetaCode> {
    const [betaCode] = await query<BetaCode>(
      `SELECT * FROM beta_codes WHERE code = $1 AND is_used = false`,
      [code]
    );

    if (!betaCode) {
      throw AppError.badRequest('Invalid or already used beta code');
    }

    return betaCode;
  }

  /**
   * Mark beta code as used
   */
  async markBetaCodeAsUsed(codeId: number, userId: number): Promise<void> {
    await query(`UPDATE beta_codes SET is_used = true, used_by_user_id = $1 WHERE id = $2`, [
      userId,
      codeId,
    ]);
  }
}

// Export singleton instance
export const userService = new UserService();
