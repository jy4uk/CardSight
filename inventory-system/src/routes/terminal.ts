import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = express.Router();

// Terminal payment endpoint
router.post('/payment', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { amount, paymentMethodId } = req.body;
  
  // TODO: Implement terminal payment processing
  sendSuccess(res, { amount, paymentMethodId, message: 'Terminal payment not yet implemented' });
}));

export default router;
