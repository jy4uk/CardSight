import express, { Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { query } from '../services/db.js';

const router = express.Router();

// Get public user profile by username
router.get(
  '/:username',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.params;
    
    const [user] = await query<any>(
      'SELECT id, username, first_name, last_name, created_at FROM users WHERE username = $1',
      [username]
    );

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Get inventory count
    const [inventoryCount] = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM inventory WHERE user_id = $1 AND deleted_at IS NULL',
      [user.id]
    );

    sendSuccess(res, {
      user: {
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        joinedDate: user.created_at,
        inventoryCount: parseInt(inventoryCount.count)
      }
    });
  })
);

export default router;
