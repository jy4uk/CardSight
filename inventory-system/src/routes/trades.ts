import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { TradeService } from '../services/TradeService.js';
import { CreateTradeDTO } from '../types/db.js';

const router = express.Router();
const tradeService = new TradeService();

// Get all trades
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const trades = await tradeService.getTradesByUserId(userId);
    sendSuccess(res, { trades });
  })
);

// Get items pending barcode assignment (MUST be before /:id route)
router.get(
  '/pending-barcodes',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const items = await tradeService.getPendingBarcodes(userId);
    sendSuccess(res, { items });
  })
);

// Get trade summary/stats (MUST be before /:id route)
router.get(
  '/stats/summary',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const stats = await tradeService.getTradeStats(userId);
    sendSuccess(res, { stats });
  })
);

// Get single trade by ID
router.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const tradeId = parseInt(req.params.id as string);
    const trade = await tradeService.getTradeById(tradeId, userId);
    sendSuccess(res, { trade });
  })
);

// Create a new trade
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data: CreateTradeDTO = req.body;
    const trade = await tradeService.createTrade(userId, data);
    sendSuccess(res, { trade }, 'Trade created successfully', 201);
  })
);

// Delete a trade (and restore inventory items)
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const tradeId = parseInt(req.params.id as string);
    await tradeService.deleteTrade(tradeId, userId);
    sendSuccess(res, null, 'Trade deleted and inventory restored');
  })
);

// Assign barcode to a pending item
router.post(
  '/assign-barcode',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { inventory_id, barcode_id } = req.body;
    const item = await tradeService.assignBarcode(
      parseInt(inventory_id),
      String(barcode_id),
      userId
    );
    sendSuccess(res, { item }, 'Barcode assigned successfully');
  })
);

export default router;
