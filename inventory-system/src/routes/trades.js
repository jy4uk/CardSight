import express from 'express';
import { query } from '../services/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all trades
router.get('/', authenticateToken, async (req, res) => {
  try {
    const trades = await query(`
      SELECT t.*, 
             cs.show_name,
             (SELECT json_agg(ti.*) FROM trade_items ti WHERE ti.trade_id = t.id) as items
      FROM trades t
      LEFT JOIN card_shows cs ON t.show_id = cs.id
      WHERE t.user_id = $1
      ORDER BY t.trade_date DESC
    `, [req.user.userId]);
    res.json({ success: true, trades });
  } catch (err) {
    console.error('Trades API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get items pending barcode assignment (MUST be before /:id route)
router.get('/pending-barcodes', authenticateToken, async (req, res) => {
  try {
    const items = await query(`
      SELECT i.*, ti.trade_id, t.customer_name, t.trade_date
      FROM inventory i
      LEFT JOIN trade_items ti ON i.id = ti.inventory_id AND ti.direction = 'in'
      LEFT JOIN trades t ON ti.trade_id = t.id
      WHERE i.user_id = $1
        AND (i.status = 'PENDING_BARCODE'
         OR (i.status = 'IN_STOCK' AND (i.barcode_id IS NULL OR i.barcode_id = '')))
      ORDER BY i.purchase_date DESC
    `, [req.user.userId]);
    
    res.json({ success: true, items });
  } catch (err) {
    console.error('Pending barcodes error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get trade summary/stats (MUST be before /:id route)
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const [stats] = await query(`
      SELECT 
        COUNT(*) as total_trades,
        COALESCE(SUM(trade_in_total), 0) as total_trade_in_value,
        COALESCE(SUM(trade_in_value), 0) as total_trade_in_credit,
        COALESCE(SUM(trade_out_total), 0) as total_trade_out_value,
        COALESCE(SUM(cash_to_customer), 0) as total_cash_to_customer,
        COALESCE(SUM(cash_from_customer), 0) as total_cash_from_customer
      FROM trades
      WHERE user_id = $1
    `, [req.user.userId]);
    
    res.json({ success: true, stats });
  } catch (err) {
    console.error('Trade stats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single trade by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [trade] = await query(`
      SELECT t.*, cs.show_name
      FROM trades t
      LEFT JOIN card_shows cs ON t.show_id = cs.id
      WHERE t.id = $1 AND t.user_id = $2
    `, [req.params.id, req.user.userId]);
    
    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }
    
    const items = await query(`
      SELECT ti.*, i.barcode_id, i.image_url
      FROM trade_items ti
      LEFT JOIN inventory i ON ti.inventory_id = i.id
      WHERE ti.trade_id = $1
    `, [req.params.id]);
    
    res.json({ success: true, trade: { ...trade, items } });
  } catch (err) {
    console.error('Trade API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a new trade
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      customer_name,
      trade_percentage = 80,
      trade_in_items = [],
      trade_out_items = [],
      cash_to_customer = 0,
      cash_from_customer = 0,
      notes,
      show_id,
      trade_date
    } = req.body;

    // Calculate totals
    const trade_in_total = trade_in_items.reduce((sum, item) => sum + (parseFloat(item.card_value) || 0), 0);
    const trade_in_value = trade_in_total * (trade_percentage / 100);
    const trade_out_total = trade_out_items.reduce((sum, item) => sum + (parseFloat(item.card_value) || 0), 0);

    // Create the trade record
    const [trade] = await query(`
      INSERT INTO trades (user_id, customer_name, trade_percentage, trade_in_total, trade_in_value, trade_out_total, cash_to_customer, cash_from_customer, notes, show_id, trade_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      req.user.userId,
      customer_name,
      trade_percentage,
      trade_in_total,
      trade_in_value,
      trade_out_total,
      cash_to_customer,
      cash_from_customer,
      notes,
      show_id || null,
      trade_date || new Date()
    ]);

    // Add trade-in items (cards coming IN from customer)
    const userId = req.user?.userId;
    for (const item of trade_in_items) {
      // Use per-card trade value if provided, otherwise calculate from percentage
      const itemTradePercentage = parseFloat(item.trade_percentage) || trade_percentage || 80;
      const itemTradeValue = item.trade_value !== undefined && item.trade_value !== null
        ? parseFloat(item.trade_value) || 0
        : (parseFloat(item.card_value) || 0) * (itemTradePercentage / 100);
      
      // Create new inventory item for trade-in card
      // Use barcode_id if provided, otherwise set status to PENDING_BARCODE
      const hasBarcode = item.barcode_id && item.barcode_id.trim();
      const status = hasBarcode ? 'IN_STOCK' : 'PENDING_BARCODE';
      
      const [newItem] = await query(`
        INSERT INTO inventory (user_id, barcode_id, card_name, set_name, game, card_type, condition, purchase_price, purchase_date, front_label_price, status, notes, cert_number, card_number, grade, grade_qualifier, image_url, tcg_product_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `, [
        req.user.userId,
        hasBarcode ? item.barcode_id.trim() : null,
        item.card_name,
        item.set_name,
        item.game || 'pokemon',
        item.card_type || 'raw',
        item.condition || 'NM',
        itemTradeValue, // Purchase price is the trade value (what we're paying for it)
        trade_date || new Date(),
        item.front_label_price || item.card_value,
        status,
        `Trade-in from ${customer_name || 'customer'} @ ${itemTradePercentage}%`,
        item.cert_number || null,
        item.card_number || null,
        item.grade || null,
        item.grade_qualifier || null,
        item.image_url || null,
        item.tcg_product_id || null
      ]);

      // Record trade item with per-card trade value
      await query(`
        INSERT INTO trade_items (trade_id, inventory_id, direction, card_name, set_name, card_value, trade_value)
        VALUES ($1, $2, 'in', $3, $4, $5, $6)
      `, [trade.id, newItem.id, item.card_name, item.set_name, item.card_value, itemTradeValue]);
    }

    // Process trade-out items (cards going OUT to customer)
    for (const item of trade_out_items) {
      // Update inventory item status to TRADED
      if (item.inventory_id) {
        await query(`
          UPDATE inventory SET status = 'TRADED', sale_date = $1, sale_price = $2
          WHERE id = $3 AND user_id = $4
        `, [trade_date || new Date(), item.card_value, item.inventory_id, req.user.userId]);
      }

      // Record trade item
      await query(`
        INSERT INTO trade_items (trade_id, inventory_id, direction, card_name, set_name, card_value, trade_value)
        VALUES ($1, $2, 'out', $3, $4, $5, $5)
      `, [trade.id, item.inventory_id, item.card_name, item.set_name, item.card_value]);
    }

    // Fetch the complete trade with items
    const items = await query(`SELECT * FROM trade_items WHERE trade_id = $1`, [trade.id]);

    res.json({ success: true, trade: { ...trade, items } });
  } catch (err) {
    console.error('Create trade error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a trade (and restore inventory items)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const tradeId = req.params.id;
    
    // Verify trade belongs to user
    const [trade] = await query(`SELECT * FROM trades WHERE id = $1 AND user_id = $2`, [tradeId, req.user.userId]);
    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }
    
    // Get trade items before deletion
    const items = await query(`SELECT * FROM trade_items WHERE trade_id = $1`, [tradeId]);
    
    // First, restore trade-out items to IN_STOCK
    for (const item of items) {
      if (item.direction === 'out' && item.inventory_id) {
        await query(`UPDATE inventory SET status = 'IN_STOCK', sale_date = NULL, sale_price = NULL WHERE id = $1 AND user_id = $2`, [item.inventory_id, req.user.userId]);
      }
    }
    
    // Collect trade-in inventory IDs to delete after trade_items are removed
    const tradeInInventoryIds = items
      .filter(item => item.direction === 'in' && item.inventory_id)
      .map(item => item.inventory_id);
    
    // Delete trade (cascade will delete trade_items first)
    await query(`DELETE FROM trades WHERE id = $1`, [tradeId]);
    
    // Now delete trade-in items from inventory (after trade_items are gone)
    for (const inventoryId of tradeInInventoryIds) {
      await query(`DELETE FROM inventory WHERE id = $1 AND user_id = $2`, [inventoryId, req.user.userId]);
    }
    
    res.json({ success: true, message: 'Trade deleted and inventory restored' });
  } catch (err) {
    console.error('Delete trade error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Assign barcode to a pending item
router.post('/assign-barcode', authenticateToken, async (req, res) => {
  try {
    const { inventory_id, barcode_id } = req.body;
    
    if (!inventory_id || !barcode_id) {
      return res.status(400).json({ success: false, error: 'inventory_id and barcode_id are required' });
    }
    
    // Check if barcode already exists for this user
    const existing = await query(`SELECT id FROM inventory WHERE barcode_id = $1 AND user_id = $2`, [barcode_id, req.user.userId]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Barcode already in use' });
    }
    
    // Update the item with barcode and set status to IN_STOCK
    // Handle both PENDING_BARCODE status and IN_STOCK with NULL barcode
    const [updated] = await query(`
      UPDATE inventory 
      SET barcode_id = $1, status = 'IN_STOCK'
      WHERE id = $2 AND user_id = $3 AND (status = 'PENDING_BARCODE' OR (status = 'IN_STOCK' AND (barcode_id IS NULL OR barcode_id = '')))
      RETURNING *
    `, [barcode_id, inventory_id, req.user.userId]);
    
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Item not found or already has barcode' });
    }
    
    res.json({ success: true, item: updated });
  } catch (err) {
    console.error('Assign barcode error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
