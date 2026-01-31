import { query } from '../services/db.js';
import { User, CreateUserRequest } from './user-models.js';
import bcrypt from 'bcrypt';

export class UserService {
  async createUser(userData: CreateUserRequest): Promise<User> {
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const sql = `
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, password_hash, first_name, last_name, created_at, updated_at, last_login, is_active
    `;

    const params = [
      userData.email,
      passwordHash,
      userData.firstName || null,
      userData.lastName || null
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

  async getUserById(userId: number): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE id = $1 AND is_active = TRUE',
      [userId]
    );
    return result.length > 0 ? this.mapRowToUser(result[0]) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email]
    );
    return result.length > 0 ? this.mapRowToUser(result[0]) : null;
  }

  async validatePassword(email: string, password: string): Promise<User | null> {
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

  async updateLastLogin(userId: number): Promise<void> {
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [userId]
    );
  }

  async getAllUsers(): Promise<User[]> {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    return result.map(row => this.mapRowToUser(row));
  }

  async deactivateUser(userId: number): Promise<void> {
    await query('UPDATE users SET is_active = FALSE WHERE id = $1', [userId]);
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastLogin: row.last_login ? new Date(row.last_login) : undefined,
      isActive: row.is_active
    };
  }
}
