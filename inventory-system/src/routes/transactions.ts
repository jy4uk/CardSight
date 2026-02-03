import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { query } from '../services/db.js';

const router = express.Router();

// Get all transactions
router.get('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  
  const transactions = await query<any>(
    `SELECT t.*, i.card_name, i.set_name 
     FROM transactions t
     LEFT JOIN inventory i ON t.inventory_id = i.id
     WHERE t.user_id = $1
     ORDER BY t.sale_date DESC`,
    [userId]
  );
  
  sendSuccess(res, { transactions });
}));

// Create new transaction
router.post('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { inventory_id, sale_price, payment_method, customer_email } = req.body;
  
  if (!inventory_id || !sale_price) {
    res.status(400).json({ success: false, error: 'inventory_id and sale_price are required' });
    return;
  }

  const [transaction] = await query<any>(
    `INSERT INTO transactions (user_id, inventory_id, sale_price, payment_method, customer_email, sale_date)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [userId, inventory_id, sale_price, payment_method || null, customer_email || null]
  );

  // Update inventory status
  await query(
    `UPDATE inventory SET status = 'SOLD', sale_date = NOW(), sale_price = $1 WHERE id = $2`,
    [sale_price, inventory_id]
  );

  sendSuccess(res, { transaction }, 'Transaction created successfully', 201);
}));

export default router;
