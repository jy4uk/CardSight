import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { UserService } from '../services/UserService.js';
import { UpdateUserProfileDTO } from '../types/db.js';

const router = express.Router();
const userService = new UserService();

// Update user profile
router.patch(
  '/user/settings',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data: UpdateUserProfileDTO = req.body;
    const user = await userService.updateUserProfile(userId, data);
    sendSuccess(res, { user }, 'Profile updated successfully');
  })
);

// Delete user account
router.delete(
  '/user/account',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { password } = req.body;
    await userService.deleteUserAccount(userId, password);
    sendSuccess(res, null, 'Account deleted successfully');
  })
);

export default router;
