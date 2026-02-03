import express from 'express';
import { query } from '../services/db.js';
import { authenticateToken } from '../middleware/auth.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// PATCH /api/user/settings - Update user profile
router.patch('/user/settings', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, username, email } = req.body;
    const userId = req.user.userId;

    // Validate at least one field is provided
    if (!first_name && !last_name && !username && !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'At least one field must be provided to update' 
      });
    }

    // Validate username format if provided
    if (username) {
      const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ 
          success: false,
          error: 'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens' 
        });
      }

      // Check if username is already taken
      const existingUser = await query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username, userId]
      );

      if (existingUser.length > 0) {
        return res.status(409).json({ 
          success: false,
          error: 'Username already taken' 
        });
      }
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid email format' 
        });
      }

      // Check if email is already in use
      const existingEmail = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (existingEmail.length > 0) {
        return res.status(409).json({ 
          success: false,
          error: 'Email already in use' 
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
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

    updates.push(`updated_at = NOW()`);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, username, first_name, last_name, created_at
    `;
    
    values.push(userId);

    const result = await query(updateQuery, values);

    if (result.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: result[0]
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update profile' 
    });
  }
});

// DELETE /api/user/account - Delete user account
router.delete('/user/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.userId;

    if (!password) {
      return res.status(400).json({ 
        success: false,
        error: 'Password is required to delete account' 
      });
    }

    // Get user and verify password
    const userResult = await query(
      'SELECT id, email, password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const user = userResult[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid password' 
      });
    }

    // Delete all user data in a transaction
    // This will cascade delete due to foreign key constraints
    // Order matters: delete dependent records first
    
    // Delete trade items
    await query('DELETE FROM trade_items WHERE trade_id IN (SELECT id FROM trades WHERE user_id = $1)', [userId]);
    
    // Delete trades
    await query('DELETE FROM trades WHERE user_id = $1', [userId]);
    
    // Delete saved deals
    await query('DELETE FROM saved_deals WHERE user_id = $1', [userId]);
    
    // Delete transactions
    await query('DELETE FROM transactions WHERE user_id = $1', [userId]);
    
    // Delete card shows
    await query('DELETE FROM card_shows WHERE user_id = $1', [userId]);
    
    // Delete inventory
    await query('DELETE FROM inventory WHERE user_id = $1', [userId]);
    
    // Mark beta code as unused if applicable
    await query('UPDATE beta_codes SET is_used = FALSE, used_by_user_id = NULL, used_at = NULL WHERE used_by_user_id = $1', [userId]);
    
    // Finally, delete the user
    await query('DELETE FROM users WHERE id = $1', [userId]);

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete account' 
    });
  }
});

export default router;
