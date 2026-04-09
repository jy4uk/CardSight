import express from 'express';
import { addInventoryItem, getInventoryByBarcode, getAllInventory, updateInventoryItem } from '../services/inventoryService.js';
import { createPaymentIntent } from '../services/stripeService.js';
import { searchCardImage, searchPokemonCards } from '../services/imageService.js';
import { query } from '../services/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { UserService } from '../auth/user-service.js';

const router = express.Router();
const userService = new UserService();

// Public endpoint to get inventory by username (no auth required)
router.get('/public', async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username parameter is required' });
    }

    // Get user by username
    const user = await userService.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Fetch user's inventory (public view only shows inventory items, not personal collection)
    const items = await query(
      `SELECT * FROM inventory WHERE user_id = $1 AND status = 'IN_STOCK' AND hidden = FALSE AND (collection_type = 'inventory' OR collection_type IS NULL) ORDER BY id DESC`,
      [user.id]
    );

    res.json({ 
      success: true, 
      items,
      user: {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Apply authentication to all other inventory routes
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    // Filter inventory by authenticated user's ID
    const userId = req.user.userId;
    const collectionType = req.query.collection_type; // 'inventory', 'collection', or undefined (all)
    
    let sql = `SELECT * FROM inventory WHERE user_id = $1 AND status = 'IN_STOCK'`;
    const params = [userId];
    
    if (collectionType === 'inventory' || collectionType === 'collection') {
      sql += ` AND (collection_type = $2 OR ($2 = 'inventory' AND collection_type IS NULL))`;
      params.push(collectionType);
    }
    
    sql += ` ORDER BY id DESC`;
    const items = await query(sql, params);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const data = { ...req.body, user_id: userId };

    // Friendly duplicate barcode handling (only if barcode_id is not empty)
    const barcodeToCheck = data.barcode_id?.toString().trim();
    if (barcodeToCheck) {
      const existing = await query(`SELECT id FROM inventory WHERE barcode_id = $1 AND user_id = $2`, [barcodeToCheck, userId]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: 'Barcode already in use' });
      }
    }
    
    // Auto-fetch image if not provided and card_type is raw
    if (!data.image_url && data.card_name && (!data.card_type || data.card_type === 'raw')) {
      const imageResult = await searchCardImage(data.card_name, data.set_name, data.game || 'pokemon');
      if (imageResult?.imageUrl) {
        data.image_url = imageResult.imageUrl;
      }
    }
    
    const item = await addInventoryItem(data);
    res.json({ success: true, item });
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(400).json({ success: false, error: 'Barcode already in use' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /inventory/bulk - Bulk add inventory items
router.post('/bulk', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Items array is required and must not be empty' 
      });
    }

    if (items.length > 1000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Maximum 1000 items can be added at once' 
      });
    }

    const results = {
      success: [],
      failed: [],
      total: items.length
    };

    // Process items in a transaction
    for (let i = 0; i < items.length; i++) {
      try {
        const itemData = { ...items[i], user_id: userId };
        
        // Skip if barcode already exists for this user
        const barcodeToCheck = itemData.barcode_id?.toString().trim();
        if (barcodeToCheck) {
          const existing = await query(
            `SELECT id FROM inventory WHERE barcode_id = $1 AND user_id = $2`, 
            [barcodeToCheck, userId]
          );
          if (existing.length > 0) {
            results.failed.push({
              index: i,
              item: items[i],
              error: 'Barcode already in use'
            });
            continue;
          }
        }

        // Auto-fetch image if not provided and card_type is raw
        if (!itemData.image_url && itemData.card_name && (!itemData.card_type || itemData.card_type === 'raw')) {
          try {
            const imageResult = await searchCardImage(itemData.card_name, itemData.set_name, itemData.game || 'pokemon');
            if (imageResult?.imageUrl) {
              itemData.image_url = imageResult.imageUrl;
            }
          } catch (imageErr) {
            // Continue without image if fetch fails
            console.warn(`Failed to fetch image for item ${i}:`, imageErr.message);
          }
        }

        const item = await addInventoryItem(itemData);
        results.success.push({
          index: i,
          item
        });
      } catch (err) {
        results.failed.push({
          index: i,
          item: items[i],
          error: err.message || 'Failed to add item'
        });
      }
    }

    res.json({
      success: true,
      message: `Added ${results.success.length} of ${results.total} items`,
      results
    });
  } catch (err) {
    console.error('Bulk add error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Search for card image
router.get('/search-image', async (req, res) => {
  try {
    const { card_name, set_name, game = 'pokemon' } = req.query;
    if (!card_name) {
      return res.status(400).json({ success: false, error: 'card_name is required' });
    }
    
    const result = await searchCardImage(card_name, set_name, game);
    if (result) {
      res.json({ success: true, ...result });
    } else {
      res.json({ success: false, message: 'No image found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Search for multiple card images to let user pick
router.get('/search-images', async (req, res) => {
  try {
    const { card_name, set_name, card_number, game = 'pokemon', limit = 6 } = req.query;
    if (!card_name) {
      return res.status(400).json({ success: false, error: 'card_name is required' });
    }
    
    if (game === 'pokemon') {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000000);
      req.on('close', () => controller.abort());
      const results = await searchPokemonCards(card_name, set_name, card_number, parseInt(limit), {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      res.json({ success: true, cards: results });
    } else {
      res.json({ success: true, cards: [], message: 'Image search only available for Pokemon currently' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /inventory/reprice-preview - Get all IN_STOCK items with TCG market prices for repricing
router.get('/reprice-preview', async (req, res) => {
  try {
    const userId = req.user.userId;
    const items = await query(
      `SELECT 
        i.id, i.card_name, i.set_name, i.card_number, i.game, i.card_type,
        i.condition, i.front_label_price, i.purchase_price, i.image_url,
        i.tcg_product_id, i.grade, i.grade_qualifier, i.barcode_id, i.cert_number,
        p.url as tcg_product_url,
        pr.market_price as tcg_market_price,
        pr.low_price as tcg_low_price,
        pr.mid_price as tcg_mid_price,
        pr.updated_at as tcg_price_updated_at
      FROM inventory i
      LEFT JOIN "card-data-products-tcgcsv" p ON p.product_id = i.tcg_product_id
      LEFT JOIN LATERAL (
        SELECT * FROM "card-data-prices-tcgcsv" pr2
        WHERE pr2.product_id = i.tcg_product_id
        ORDER BY CASE WHEN pr2.sub_type_name = 'Normal' THEN 0 ELSE 1 END, pr2.market_price DESC NULLS LAST
        LIMIT 1
      ) pr ON i.tcg_product_id IS NOT NULL
      WHERE i.user_id = $1 AND i.status = 'IN_STOCK'
      ORDER BY i.front_label_price DESC NULLS LAST`,
      [userId]
    );
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /inventory/bulk-reprice - Bulk update front_label_price for multiple items
router.put('/bulk-reprice', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { updates } = req.body; // Array of { id, front_label_price }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Updates array is required' });
    }

    if (updates.length > 2000) {
      return res.status(400).json({ success: false, error: 'Maximum 2000 items can be repriced at once' });
    }

    let updated = 0;
    const errors = [];

    for (const { id, front_label_price } of updates) {
      try {
        const rows = await query(
          `UPDATE inventory SET front_label_price = $1
           WHERE id = $2 AND user_id = $3
           RETURNING id`,
          [front_label_price, id, userId]
        );
        if (rows.length > 0) updated++;
        else errors.push({ id, error: 'Item not found' });
      } catch (err) {
        errors.push({ id, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Updated ${updated} of ${updates.length} items`,
      updated,
      total: updates.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /inventory/:id/lineage - Get the full provenance/lineage tree for a card
router.get('/:id/lineage', async (req, res) => {
  try {
    const userId = req.user.userId;
    const itemId = parseInt(req.params.id, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID' });
    }

    // Verify the card belongs to this user
    const [rootCard] = await query(
      `SELECT id, card_name, set_name, card_number, game, card_type, condition, grade, grade_qualifier,
              purchase_price, front_label_price, purchase_date, sale_price, sale_date, status, image_url, barcode_id, notes
       FROM inventory WHERE id = $1 AND user_id = $2`,
      [itemId, userId]
    );
    if (!rootCard) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // Helper: get trade info for an inventory item (includes cash fields)
    const getTradeContext = async (invId, direction) => {
      const rows = await query(
        `SELECT ti.*, t.customer_name, t.trade_date, t.trade_percentage, t.id as trade_id,
                t.cash_to_customer, t.cash_from_customer, t.trade_in_total, t.trade_in_value, t.trade_out_total
         FROM trade_items ti
         JOIN trades t ON ti.trade_id = t.id
         WHERE ti.inventory_id = $1 AND ti.direction = $2`,
        [invId, direction]
      );
      return rows;
    };

    // Helper: get sibling items from the same trade (optionally exclude multiple IDs)
    const getTradeSiblings = async (tradeId, direction, excludeIds) => {
      const ids = Array.isArray(excludeIds) ? excludeIds : [excludeIds];
      return query(
        `SELECT ti.inventory_id, ti.card_name, ti.set_name, ti.card_value, ti.trade_value,
                i.status, i.image_url, i.front_label_price, i.purchase_price, i.purchase_date, i.card_type, i.grade, i.condition, i.barcode_id
         FROM trade_items ti
         LEFT JOIN inventory i ON ti.inventory_id = i.id
         WHERE ti.trade_id = $1 AND ti.direction = $2 AND ti.inventory_id != ALL($3::int[])`,
        [tradeId, direction, ids]
      );
    };

    // Helper: get sale/transaction info
    const getSaleInfo = async (invId) => {
      const rows = await query(
        `SELECT t.sale_price, t.payment_method, t.sale_date, cs.show_name
         FROM transactions t
         LEFT JOIN card_shows cs ON t.show_id = cs.id
         WHERE t.inventory_id = $1
         ORDER BY t.sale_date DESC LIMIT 1`,
        [invId]
      );
      return rows[0] || null;
    };

    // Build the lineage tree with depth limit to prevent infinite loops
    const MAX_DEPTH = 10;
    const visited = new Set();

    // excludeFromDescendants: IDs to skip when building descendant trees
    // (prevents siblings from appearing deep in ancestor trees)
    const buildNode = async (invId, depth = 0, excludeFromDescendants = []) => {
      if (depth > MAX_DEPTH || visited.has(invId)) return null;
      visited.add(invId);

      const [card] = await query(
        `SELECT id, card_name, set_name, card_number, game, card_type, condition, grade, grade_qualifier,
                purchase_price, front_label_price, purchase_date, sale_price, sale_date, status, image_url, barcode_id, notes
         FROM inventory WHERE id = $1 AND user_id = $2`,
        [invId, userId]
      );
      if (!card) return null;

      const node = {
        id: card.id,
        card_name: card.card_name,
        set_name: card.set_name,
        card_number: card.card_number,
        game: card.game,
        card_type: card.card_type,
        condition: card.condition,
        grade: card.grade,
        grade_qualifier: card.grade_qualifier,
        purchase_price: card.purchase_price,
        front_label_price: card.front_label_price,
        purchase_date: card.purchase_date,
        sale_price: card.sale_price,
        sale_date: card.sale_date,
        status: card.status,
        image_url: card.image_url,
        barcode_id: card.barcode_id,
        origin: null,     // how this card entered inventory
        destination: null, // how this card left inventory (if it did)
        ancestors: [],     // cards traded OUT to get this card (what we gave up)
        descendants: [],   // cards traded IN when this card was traded out (what we got)
      };

      // === ORIGIN: How did this card enter inventory? ===
      const tradeInRecords = await getTradeContext(invId, 'in');
      if (tradeInRecords.length > 0) {
        const ti = tradeInRecords[0];
        node.origin = {
          type: 'trade_in',
          trade_id: ti.trade_id,
          customer_name: ti.customer_name,
          trade_date: ti.trade_date,
          trade_percentage: ti.trade_percentage,
          card_value: ti.card_value,
          trade_value: ti.trade_value,
          cash_to_customer: ti.cash_to_customer,
          cash_from_customer: ti.cash_from_customer,
          trade_in_total: ti.trade_in_total,
          trade_in_value: ti.trade_in_value,
          trade_out_total: ti.trade_out_total,
        };

        // Get sibling trade-in items (other cards that came in with this one)
        const siblingInItems = await getTradeSiblings(ti.trade_id, 'in', [invId]);
        node.origin.siblings = siblingInItems.map(s => ({
          inventory_id: s.inventory_id,
          card_name: s.card_name,
          set_name: s.set_name,
          card_value: s.card_value,
          trade_value: s.trade_value,
          status: s.status,
          image_url: s.image_url,
        }));

        // Collect IDs of all trade-in items (this card + siblings) to exclude from ancestor descendant trees
        const allTradeInIds = [invId, ...siblingInItems.map(s => s.inventory_id).filter(Boolean)];

        // Find what was traded OUT in that same trade (ancestors - what we gave up)
        const tradedOutItems = await getTradeSiblings(ti.trade_id, 'out', [invId]);
        for (const outItem of tradedOutItems) {
          if (outItem.inventory_id) {
            const ancestorNode = await buildNode(outItem.inventory_id, depth + 1, allTradeInIds);
            if (ancestorNode) {
              node.ancestors.push(ancestorNode);
            }
          }
        }
      } else {
        // Card was directly purchased (no trade-in record)
        node.origin = {
          type: 'purchase',
          purchase_price: card.purchase_price,
          purchase_date: card.purchase_date,
        };
      }

      // === DESTINATION: How did this card leave inventory? ===
      if (card.status === 'TRADED') {
        const tradeOutRecords = await getTradeContext(invId, 'out');
        if (tradeOutRecords.length > 0) {
          const to = tradeOutRecords[0];
          node.destination = {
            type: 'trade_out',
            trade_id: to.trade_id,
            customer_name: to.customer_name,
            trade_date: to.trade_date,
            card_value: to.card_value,
            cash_to_customer: to.cash_to_customer,
            cash_from_customer: to.cash_from_customer,
          };

          // Find what was traded IN in that same trade (descendants)
          // Exclude items already in the excludeFromDescendants list
          const tradedInItems = await getTradeSiblings(to.trade_id, 'in', [...excludeFromDescendants, invId]);
          for (const inItem of tradedInItems) {
            if (inItem.inventory_id) {
              const descendantNode = await buildNode(inItem.inventory_id, depth + 1, excludeFromDescendants);
              if (descendantNode) {
                node.descendants.push(descendantNode);
              }
            }
          }
        }
      } else if (card.status === 'SOLD') {
        const saleInfo = await getSaleInfo(invId);
        node.destination = {
          type: 'sold',
          sale_price: card.sale_price || saleInfo?.sale_price,
          sale_date: card.sale_date || saleInfo?.sale_date,
          payment_method: saleInfo?.payment_method,
          show_name: saleInfo?.show_name,
        };
      }

      return node;
    };

    const lineage = await buildNode(itemId);

    res.json({ success: true, lineage });
  } catch (err) {
    console.error('Lineage error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const rows = await query('DELETE FROM inventory WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, item: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update image for existing item
router.post('/:barcode/update-image', async (req, res) => {
  try {
    const item = await getInventoryByBarcode(req.params.barcode);
    if (!item) return res.status(404).json({ success: false, msg: 'Item not found' });
    
    // Try to fetch image
    const imageResult = await searchCardImage(item.card_name, item.set_name, item.game || 'pokemon');
    if (imageResult?.imageUrl) {
      await query('UPDATE inventory SET image_url = $1 WHERE id = $2', [imageResult.imageUrl, item.id]);
      res.json({ success: true, imageUrl: imageResult.imageUrl });
    } else {
      res.json({ success: false, message: 'No image found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    // Friendly duplicate barcode handling (only if barcode_id is being updated and not empty)
    const barcodeToCheck = req.body?.barcode_id?.toString().trim();
    if (barcodeToCheck) {
      const existing = await query(`SELECT id FROM inventory WHERE barcode_id = $1 AND id <> $2 AND user_id = $3`, [barcodeToCheck, req.params.id, userId]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: 'Barcode already in use' });
      }
    }

    // Verify item belongs to user before updating
    const checkOwnership = await query('SELECT id FROM inventory WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    if (checkOwnership.length === 0) {
      return res.status(404).json({ success: false, msg: 'Item not found' });
    }

    const item = await updateInventoryItem(req.params.id, req.body);
    if (!item) return res.status(404).json({ success: false, msg: 'Item not found' });
    res.json({ success: true, item });
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(400).json({ success: false, error: 'Barcode already in use' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:barcode', async (req, res) => {
  try {
    const userId = req.user.userId;
    const rows = await query('SELECT * FROM inventory WHERE barcode_id = $1 AND user_id = $2', [req.params.barcode, userId]);
    if (rows.length === 0) return res.status(404).json({ success: false, msg: 'Not found' });
    res.json({ success: true, item: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:barcode/sell', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sale_price, currency = 'usd' } = req.body;
    const rows = await query('SELECT * FROM inventory WHERE barcode_id = $1 AND user_id = $2', [req.params.barcode, userId]);
    if (rows.length === 0) return res.status(404).json({ success: false, msg: 'Item not found' });
    const item = rows[0];

    const paymentIntent = await createPaymentIntent(sale_price, currency, { inventory_id: item.id, barcode_id: item.barcode_id });
    res.json({ success: true, clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:identifier/sell-direct', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sale_price, payment_method } = req.body;
    const validMethods = ['cash', 'venmo', 'zelle', 'cashapp', 'credit_card'];
    
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ success: false, error: 'Invalid payment method for direct sale' });
    }

    // Try to find by barcode_id first, then by id
    const identifier = req.params.identifier;
    let rows = await query('SELECT * FROM inventory WHERE barcode_id = $1 AND user_id = $2', [identifier, userId]);
    if (rows.length === 0) {
      // Try by id if numeric
      const numId = parseInt(identifier, 10);
      if (!isNaN(numId)) {
        rows = await query('SELECT * FROM inventory WHERE id = $1 AND user_id = $2', [numId, userId]);
      }
    }
    if (rows.length === 0) return res.status(404).json({ success: false, msg: 'Item not found' });
    const item = rows[0];
    if (item.status === 'SOLD') return res.status(400).json({ success: false, msg: 'Item already sold' });

    const { recordDirectSale } = await import('../services/inventoryService.js');
    const result = await recordDirectSale(item.id, sale_price, payment_method.toUpperCase());
    
    res.json({ success: true, item: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove a sale - either restore to inventory or delete all records
router.post('/:id/remove-sale', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { restore_to_inventory } = req.body;
    const itemId = parseInt(req.params.id, 10);
    
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID' });
    }

    // Verify item exists and belongs to user
    const rows = await query('SELECT * FROM inventory WHERE id = $1 AND user_id = $2', [itemId, userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    
    const item = rows[0];
    if (item.status !== 'SOLD') {
      return res.status(400).json({ success: false, error: 'Item is not sold' });
    }

    const { removeSale } = await import('../services/inventoryService.js');
    await removeSale(itemId, restore_to_inventory !== false);
    
    res.json({ success: true, restored: restore_to_inventory !== false });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Edit a sale - update sale price and payment method
router.put('/:id/update-sale', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sale_price, payment_method } = req.body;
    const itemId = parseInt(req.params.id, 10);
    
    console.log('Update sale request:', { itemId, sale_price, payment_method, userId, body: req.body });
    
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID' });
    }
    
    const validMethods = ['CASH', 'VENMO', 'ZELLE', 'CASHAPP', 'CREDIT_CARD'];
    if (payment_method && !validMethods.includes(payment_method.toUpperCase())) {
      return res.status(400).json({ success: false, error: `Invalid payment method: ${payment_method}` });
    }

    // First try to find item with user check, then without (for older items)
    let rows = await query('SELECT * FROM inventory WHERE id = $1 AND user_id = $2', [itemId, userId]);
    if (rows.length === 0) {
      // Try without user_id check for older items
      rows = await query('SELECT * FROM inventory WHERE id = $1', [itemId]);
    }
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    
    const item = rows[0];
    
    // Also check if there's a transaction for this item
    const txRows = await query('SELECT * FROM transactions WHERE inventory_id = $1', [itemId]);
    const hasTransaction = txRows.length > 0;
    
    // Allow editing if item is sold OR has a transaction record
    if (item.status !== 'SOLD' && !hasTransaction) {
      return res.status(400).json({ success: false, error: `Item is not sold (status: ${item.status})` });
    }

    const { updateSale } = await import('../services/inventoryService.js');
    const result = await updateSale(itemId, sale_price, payment_method?.toUpperCase());
    
    res.json({ success: true, item: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/cert/:type/:certNumber', async (req, res) => {
  try {
    const { type, certNumber } = req.params;
    
    if (type === 'psa') {
      // PSA cert lookup - returns HTML page, we extract what we need
      const certUrl = `https://www.psacard.com/cert/${certNumber}`;
      res.json({ 
        success: true, 
        certUrl,
        // PSA doesn't provide a public image API, but cert page has the image
        imageUrl: `https://www.psacard.com/cert/${certNumber}/download`,
      });
    } else if (type === 'bgs') {
      const certUrl = `https://www.beckett.com/grading/card-lookup?serial_num=${certNumber}`;
      res.json({ success: true, certUrl, imageUrl: null });
    } else if (type === 'cgc') {
      const certUrl = `https://www.cgccards.com/certlookup/${certNumber}`;
      res.json({ success: true, certUrl, imageUrl: null });
    } else {
      res.status(400).json({ success: false, error: 'Invalid cert type' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;