import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = express.Router();

// Search TCG cards
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { query: searchQuery } = req.query;
  
  if (!searchQuery || typeof searchQuery !== 'string') {
    res.status(400).json({ success: false, error: 'Search query is required' });
    return;
  }

  // TODO: Implement TCG API search
  sendSuccess(res, { results: [], message: 'TCG search not yet implemented' });
}));

export default router;
