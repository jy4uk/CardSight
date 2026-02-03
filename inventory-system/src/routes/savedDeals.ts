import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { SavedDealService } from '../services/SavedDealService.js';
import { CreateSavedDealDTO } from '../types/db.js';

const router = express.Router();
const savedDealService = new SavedDealService();

// Get all saved deals
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const type = req.query.type as string | undefined;
    const deals = await savedDealService.getSavedDealsByUserId(userId, type);
    sendSuccess(res, { deals });
  })
);

// Get single saved deal by ID
router.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const dealId = parseInt(req.params.id as string);
    const deal = await savedDealService.getSavedDealById(dealId, userId);
    sendSuccess(res, { deal });
  })
);

// Create a new saved deal
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data: CreateSavedDealDTO = req.body;
    const deal = await savedDealService.createSavedDeal(userId, data);
    sendSuccess(res, { deal }, 'Deal saved successfully', 201);
  })
);

// Update a saved deal
router.patch(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const dealId = parseInt(req.params.id as string);
    const data: Partial<CreateSavedDealDTO> = req.body;
    const deal = await savedDealService.updateSavedDeal(dealId, userId, data);
    sendSuccess(res, { deal }, 'Deal updated successfully');
  })
);

// Delete a saved deal
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const dealId = parseInt(req.params.id as string);
    await savedDealService.deleteSavedDeal(dealId, userId);
    sendSuccess(res, null, 'Deal deleted successfully');
  })
);

// Validate deal availability
router.get(
  '/:id/validate',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const dealId = parseInt(req.params.id as string);
    const validation = await savedDealService.validateDealAvailability(dealId, userId);
    sendSuccess(res, validation);
  })
);

export default router;
