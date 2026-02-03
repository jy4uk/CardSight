import express from 'express';
import { query } from '../services/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /users/random - Get a random active user's username (public)
router.get('/random', async (req, res) => {
  try {
    const result = await query(
      'SELECT username FROM users WHERE is_active = true AND username IS NOT NULL ORDER BY RANDOM() LIMIT 1'
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'No users found' });
    }

    res.json({ username: result[0].username });
  } catch (error) {
    console.error('Error fetching random user:', error);
    res.status(500).json({ error: 'Failed to fetch random user' });
  }
});

// GET /users/me - Get current user info (protected)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, username, first_name, last_name, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /users/me - Update current user's email or username (protected)
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { email, username } = req.body;
    const userId = req.user.userId;

    // Validate at least one field is provided
    if (!email && !username) {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    // Check if username is taken (if provided)
    if (username) {
      const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ 
          error: 'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens' 
        });
      }

      const existingUser = await query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username, userId]
      );

      if (existingUser.length > 0) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    // Check if email is taken (if provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const existingEmail = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (existingEmail.length > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (email) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (username) {
      updates.push(`username = $${paramCount}`);
      values.push(username);
      paramCount++;
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, username, first_name, last_name
    `;

    const result = await query(updateQuery, values);

    res.json({
      success: true,
      user: result[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
