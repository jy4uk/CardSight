import { query } from '../services/db.js';
import bcrypt from 'bcrypt';

export class UserService {
  async createUser(userData) {
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const sql = `
      INSERT INTO users (email, password_hash, first_name, last_name, username)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, password_hash, first_name, last_name, username, created_at, updated_at, last_login, is_active
    `;

    const params = [
      userData.email,
      passwordHash,
      userData.firstName || null,
      userData.lastName || null,
      userData.username
    ];

    try {
      const result = await query(sql, params);
      return this.mapRowToUser(result[0]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error('User with this email already exists');
      }
      throw error;
    }
  }

  async getUserById(userId) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1 AND is_active = TRUE',
      [userId]
    );
    return result.length > 0 ? this.mapRowToUser(result[0]) : null;
  }

  async getUserByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email]
    );
    return result.length > 0 ? this.mapRowToUser(result[0]) : null;
  }

  async getUserByUsername(username) {
    const result = await query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND is_active = TRUE',
      [username]
    );
    return result.length > 0 ? this.mapRowToUser(result[0]) : null;
  }

  async validatePassword(email, password) {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    // Update last login
    await this.updateLastLogin(user.id);
    
    return user;
  }

  async updateLastLogin(userId) {
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [userId]
    );
  }

  async getAllUsers() {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    return result.map(row => this.mapRowToUser(row));
  }

  async deactivateUser(userId) {
    await query('UPDATE users SET is_active = FALSE WHERE id = $1', [userId]);
  }

  async incrementTokenVersion(userId) {
    await query(
      'UPDATE users SET refresh_token_version = refresh_token_version + 1 WHERE id = $1',
      [userId]
    );
  }

  async getTokenVersion(userId) {
    const result = await query(
      'SELECT refresh_token_version FROM users WHERE id = $1',
      [userId]
    );
    return result.length > 0 ? result[0].refresh_token_version : 0;
  }

  async setPasswordResetToken(userId, tokenHash, expiresAt) {
    await query(
      'UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3',
      [tokenHash, expiresAt, userId]
    );
  }

  async verifyPasswordResetToken(userId, tokenHash) {
    const result = await query(
      'SELECT reset_token_hash, reset_token_expires FROM users WHERE id = $1',
      [userId]
    );

    if (result.length === 0) {
      console.log('❌ User not found for password reset verification');
      return false;
    }

    const user = result[0];

    console.log('🔍 Password reset token verification:');
    console.log('  - User ID:', userId);
    console.log('  - Stored token hash:', user.reset_token_hash);
    console.log('  - Provided token hash:', tokenHash);
    console.log('  - Token expires:', user.reset_token_expires);
    console.log('  - Current time:', new Date().toISOString());
    console.log('  - Tokens match:', user.reset_token_hash === tokenHash);

    // Check if token matches
    if (user.reset_token_hash !== tokenHash) {
      console.log('❌ Token hash mismatch');
      return false;
    }

    // Check if token has expired
    if (!user.reset_token_expires || new Date() > new Date(user.reset_token_expires)) {
      console.log('❌ Token expired or not set');
      return false;
    }

    console.log('✅ Token verification successful');
    return true;
  }

  async getUserByResetToken(tokenHash) {
    const result = await query(
      'SELECT * FROM users WHERE reset_token_hash = $1 AND reset_token_expires > NOW() AND is_active = TRUE',
      [tokenHash]
    );
    return result.length > 0 ? this.mapRowToUser(result[0]) : null;
  }

  async clearPasswordResetToken(userId) {
    await query(
      'UPDATE users SET reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $1',
      [userId]
    );
  }

  async resetPassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, userId]
    );
  }

  async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );
  }

  mapRowToUser(row) {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
      isActive: row.is_active,
      tokenVersion: row.token_version || 0
    };
  }
}
