import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { InventoryService } from '../services/InventoryService.js';
import { CreateInventoryItemDTO, UpdateInventoryItemDTO } from '../types/db.js';

const router = express.Router();

const inventoryService = new InventoryService();

// Get all inventory items for authenticated user
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const inventory = await inventoryService.getInventoryByUserId(userId);
    sendSuccess(res, inventory);
  })
);

// Get public inventory by username (no auth required)
router.get(
  '/public',
  asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      res.status(400).json({ success: false, error: 'Username is required' });
      return;
    }

    const inventory = await inventoryService.getPublicInventory(username);
    sendSuccess(res, inventory);
  })
);

// Get inventory item by barcode
router.get(
  '/barcode/:barcode',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const barcode = req.params.barcode as string;
    const item = await inventoryService.getInventoryItemByBarcode(barcode, userId);
    sendSuccess(res, { success: true, item });
  })
);

// Get single inventory item by ID
router.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id as string);
    const item = await inventoryService.getInventoryItemById(id, userId);
    sendSuccess(res, item);
  })
);

// Create new inventory item
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data: CreateInventoryItemDTO = req.body;
    const item = await inventoryService.createInventoryItem(userId, data);
    sendSuccess(res, item, 'Item created successfully', 201);
  })
);

// Bulk create inventory items
router.post(
  '/bulk',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { items } = req.body;
    const results = await inventoryService.bulkCreateInventory(userId, items);
    sendSuccess(
      res,
      results,
      `Added ${results.success.length} of ${results.total} items`
    );
  })
);

// Update inventory item
router.patch(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id as string);
    const data: UpdateInventoryItemDTO = req.body;
    const item = await inventoryService.updateInventoryItem(id, userId, data);
    sendSuccess(res, item, 'Item updated successfully');
  })
);

// Delete inventory item
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id as string);
    await inventoryService.deleteInventoryItem(id, userId);
    sendSuccess(res, null, 'Item deleted successfully');
  })
);

// Get pending barcodes
router.get(
  '/pending/barcodes',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const items = await inventoryService.getPendingBarcodes(userId);
    sendSuccess(res, items);
  })
);

// Assign barcode to item
router.post(
  '/assign-barcode',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { inventory_id, barcode_id } = req.body;
    const item = await inventoryService.assignBarcode(
      parseInt(inventory_id),
      String(barcode_id),
      userId
    );
    sendSuccess(res, item, 'Barcode assigned successfully');
  })
);

export default router;
