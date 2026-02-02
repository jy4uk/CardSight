import express from 'express';
import { query } from '../services/db.js';

const router = express.Router();

// Get all saved deals
router.get('/', async (req, res) => {
  try {
    const { type } = req.query; // Optional filter by type
    
    let sql = `
      SELECT sd.*, cs.show_name
      FROM saved_deals sd
      LEFT JOIN card_shows cs ON sd.show_id = cs.id
    `;
    
    const params = [];
    if (type) {
      sql += ` WHERE sd.deal_type = $1`;
      params.push(type);
    }
    
    sql += ` ORDER BY sd.created_at DESC`;
    
    const deals = await query(sql, params);
    
    // Check availability of trade-out items for each trade deal
    const dealsWithAvailability = await Promise.all(deals.map(async (deal) => {
      if (deal.deal_type === 'trade' && deal.trade_out_inventory_ids?.length > 0) {
        // Check which items are still available
        const availableItems = await query(`
          SELECT id FROM inventory 
          WHERE id = ANY($1) AND status = 'IN_STOCK'
        `, [deal.trade_out_inventory_ids]);
        
        const availableIds = availableItems.map(i => i.id);
        const unavailableIds = deal.trade_out_inventory_ids.filter(id => !availableIds.includes(id));
        
        return {
          ...deal,
          unavailable_item_ids: unavailableIds,
          has_unavailable_items: unavailableIds.length > 0
        };
      }
      return { ...deal, unavailable_item_ids: [], has_unavailable_items: false };
    }));
    
    res.json({ success: true, deals: dealsWithAvailability });
  } catch (err) {
    console.error('Saved deals API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single saved deal by ID
router.get('/:id', async (req, res) => {
  try {
    const [deal] = await query(`
      SELECT sd.*, cs.show_name
      FROM saved_deals sd
      LEFT JOIN card_shows cs ON sd.show_id = cs.id
      WHERE sd.id = $1
    `, [req.params.id]);
    
    if (!deal) {
      return res.status(404).json({ success: false, error: 'Saved deal not found' });
    }
    
    // Check availability of trade-out items
    if (deal.deal_type === 'trade' && deal.trade_out_inventory_ids?.length > 0) {
      const availableItems = await query(`
        SELECT id, card_name, status FROM inventory 
        WHERE id = ANY($1)
      `, [deal.trade_out_inventory_ids]);
      
      const availableIds = availableItems.filter(i => i.status === 'IN_STOCK').map(i => i.id);
      const unavailableItems = availableItems.filter(i => i.status !== 'IN_STOCK');
      
      deal.unavailable_item_ids = deal.trade_out_inventory_ids.filter(id => !availableIds.includes(id));
      deal.unavailable_items = unavailableItems;
      deal.has_unavailable_items = deal.unavailable_item_ids.length > 0;
    } else {
      deal.unavailable_item_ids = [];
      deal.has_unavailable_items = false;
    }
    
    res.json({ success: true, deal });
  } catch (err) {
    console.error('Saved deal API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a new saved deal
router.post('/', async (req, res) => {
  try {
    const {
      deal_type,
      customer_name,
      customer_note,
      deal_data,
      total_items,
      total_value,
      trade_out_inventory_ids = [],
      show_id,
      expires_at
    } = req.body;
    
    if (!deal_type || !deal_data) {
      return res.status(400).json({ success: false, error: 'deal_type and deal_data are required' });
    }
    
    const [deal] = await query(`
      INSERT INTO saved_deals (deal_type, customer_name, customer_note, deal_data, total_items, total_value, trade_out_inventory_ids, show_id, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      deal_type,
      customer_name || null,
      customer_note || null,
      JSON.stringify(deal_data),
      total_items || 0,
      total_value || 0,
      trade_out_inventory_ids,
      show_id || null,
      expires_at || null
    ]);
    
    res.json({ success: true, deal });
  } catch (err) {
    console.error('Create saved deal error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update a saved deal
router.put('/:id', async (req, res) => {
  try {
    const {
      customer_name,
      customer_note,
      deal_data,
      total_items,
      total_value,
      trade_out_inventory_ids,
      expires_at
    } = req.body;
    
    const [deal] = await query(`
      UPDATE saved_deals 
      SET customer_name = COALESCE($1, customer_name),
          customer_note = COALESCE($2, customer_note),
          deal_data = COALESCE($3, deal_data),
          total_items = COALESCE($4, total_items),
          total_value = COALESCE($5, total_value),
          trade_out_inventory_ids = COALESCE($6, trade_out_inventory_ids),
          expires_at = $7,
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [
      customer_name,
      customer_note,
      deal_data ? JSON.stringify(deal_data) : null,
      total_items,
      total_value,
      trade_out_inventory_ids,
      expires_at,
      req.params.id
    ]);
    
    if (!deal) {
      return res.status(404).json({ success: false, error: 'Saved deal not found' });
    }
    
    res.json({ success: true, deal });
  } catch (err) {
    console.error('Update saved deal error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a saved deal
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(`DELETE FROM saved_deals WHERE id = $1 RETURNING id`, [req.params.id]);
    
    if (result.length === 0) {
      return res.status(404).json({ success: false, error: 'Saved deal not found' });
    }
    
    res.json({ success: true, message: 'Saved deal deleted' });
  } catch (err) {
    console.error('Delete saved deal error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Validate deal availability (check if trade-out items are still available)
router.get('/:id/validate', async (req, res) => {
  try {
    const [deal] = await query(`SELECT * FROM saved_deals WHERE id = $1`, [req.params.id]);
    
    if (!deal) {
      return res.status(404).json({ success: false, error: 'Saved deal not found' });
    }
    
    if (deal.deal_type !== 'trade' || !deal.trade_out_inventory_ids?.length) {
      return res.json({ success: true, valid: true, unavailable_items: [] });
    }
    
    // Get current status of all trade-out items
    const items = await query(`
      SELECT id, card_name, set_name, status, front_label_price
      FROM inventory 
      WHERE id = ANY($1)
    `, [deal.trade_out_inventory_ids]);
    
    const unavailableItems = items.filter(i => i.status !== 'IN_STOCK');
    const missingIds = deal.trade_out_inventory_ids.filter(id => !items.find(i => i.id === id));
    
    res.json({
      success: true,
      valid: unavailableItems.length === 0 && missingIds.length === 0,
      unavailable_items: unavailableItems,
      missing_item_ids: missingIds
    });
  } catch (err) {
    console.error('Validate saved deal error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
