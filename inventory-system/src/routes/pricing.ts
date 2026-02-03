import express, { Request, Response } from 'express';
import { getTCGPlayerPricing, getBatchPricing, updateInventoryPricing, getSellSuggestions } from '../services/pricingService.js';
import { query } from '../services/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = express.Router();

// Get pricing for a single card
router.get('/card/:barcodeId', asyncHandler(async (req: Request, res: Response) => {
  const { barcodeId } = req.params;
  
  const cardResult = await query<any>(`
    SELECT card_name, set_name, card_number, card_type, front_label_price 
    FROM inventory 
    WHERE barcode_id = $1 AND status = 'IN_STOCK'
  `, [barcodeId]);
  
  if (cardResult.length === 0) {
    res.status(404).json({ success: false, error: 'Card not found' });
    return;
  }
  
  const card = cardResult[0];
  const pricing = await getTCGPlayerPricing(card.card_name, card.set_name, card.card_number);
  
  if (!pricing) {
    sendSuccess(res, {
      card,
      pricing: null,
      message: 'No pricing data available'
    });
    return;
  }
  
  const suggestions = getSellSuggestions(pricing, card.card_type);
  
  sendSuccess(res, {
    card,
    pricing,
    suggestions
  });
}));

// Get batch pricing for multiple cards
router.post('/batch', asyncHandler(async (req: Request, res: Response) => {
  const { barcodeIds } = req.body;
  
  if (!Array.isArray(barcodeIds) || barcodeIds.length === 0) {
    res.status(400).json({ success: false, error: 'barcodeIds array is required' });
    return;
  }
  
  const results = await getBatchPricing(barcodeIds);
  sendSuccess(res, { results });
}));

// Update inventory pricing
router.post('/update-inventory', asyncHandler(async (req: Request, res: Response) => {
  const { barcodeIds } = req.body;
  
  if (!Array.isArray(barcodeIds)) {
    res.status(400).json({ success: false, error: 'barcodeIds array is required' });
    return;
  }
  
  const results = await updateInventoryPricing(barcodeIds);
  sendSuccess(res, results);
}));

export default router;
