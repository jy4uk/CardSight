import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { InsightsService } from '../services/InsightsService.js';

const router = express.Router();
const insightsService = new InsightsService();

// Get comprehensive business insights
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const timeRange = (req.query.timeRange as string) || '30d';
    const insights = await insightsService.getBusinessInsights(userId, timeRange);
    sendSuccess(res, insights);
  })
);

// Get all card shows
router.get(
  '/card-shows',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const shows = await insightsService.getCardShows(userId);
    sendSuccess(res, { shows });
  })
);

// Create a new card show
router.post(
  '/card-shows',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { show_name, location, show_date } = req.body;
    const show = await insightsService.createCardShow(userId, show_name, location, show_date);
    sendSuccess(res, { show }, 'Card show created successfully', 201);
  })
);

// Delete a card show
router.delete(
  '/card-shows/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const showId = parseInt(req.params.id as string);
    await insightsService.deleteCardShow(showId, userId);
    sendSuccess(res, null, 'Card show deleted successfully');
  })
);

// Get inventory metrics by status
router.get(
  '/inventory-status',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const metrics = await insightsService.getInventoryMetricsByStatus(userId);
    sendSuccess(res, { metrics });
  })
);

// Get top selling cards
router.get(
  '/top-sellers',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const limit = parseInt((req.query.limit as string) || '10');
    const topSellers = await insightsService.getTopSellingCards(userId, limit);
    sendSuccess(res, { topSellers });
  })
);

export default router;
