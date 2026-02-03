import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = express.Router();

// PSA lookup endpoint
router.get('/:certNumber', asyncHandler(async (req: Request, res: Response) => {
  const { certNumber } = req.params;
  
  // TODO: Implement PSA API lookup
  sendSuccess(res, { certNumber, message: 'PSA lookup not yet implemented' });
}));

export default router;
