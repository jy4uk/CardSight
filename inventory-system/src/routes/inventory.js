import express from 'express';
import { addInventoryItem, getInventoryByBarcode, getAllInventory, updateInventoryItem } from '../services/inventoryService.js';
import { createPaymentIntent } from '../services/stripeService.js';
import { searchCardImage, searchPokemonCards } from '../services/imageService.js';
import { query } from '../services/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const items = await getAllInventory();
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };

    // Friendly duplicate barcode handling (only if barcode_id is not empty)
    const barcodeToCheck = data.barcode_id?.toString().trim();
    if (barcodeToCheck) {
      const existing = await query(`SELECT id FROM inventory WHERE barcode_id = $1`, [barcodeToCheck]);
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

// Delete inventory item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query('DELETE FROM inventory WHERE id = $1 RETURNING *', [id]);
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
    // Friendly duplicate barcode handling (only if barcode_id is being updated and not empty)
    const barcodeToCheck = req.body?.barcode_id?.toString().trim();
    if (barcodeToCheck) {
      const existing = await query(`SELECT id FROM inventory WHERE barcode_id = $1 AND id <> $2`, [barcodeToCheck, req.params.id]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: 'Barcode already in use' });
      }
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
    const item = await getInventoryByBarcode(req.params.barcode);
    if (!item) return res.status(404).json({ success: false, msg: 'Not found' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:barcode/sell', async (req, res) => {
  try {
    const { sale_price, currency = 'usd' } = req.body;
    const item = await getInventoryByBarcode(req.params.barcode);
    if (!item) return res.status(404).json({ success: false, msg: 'Item not found' });

    const paymentIntent = await createPaymentIntent(sale_price, currency, { inventory_id: item.id, barcode_id: item.barcode_id });
    res.json({ success: true, clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:barcode/sell-direct', async (req, res) => {
  try {
    const { sale_price, payment_method } = req.body;
    const validMethods = ['cash', 'venmo', 'zelle', 'cashapp', 'credit_card'];
    
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ success: false, error: 'Invalid payment method for direct sale' });
    }

    const item = await getInventoryByBarcode(req.params.barcode);
    if (!item) return res.status(404).json({ success: false, msg: 'Item not found' });
    if (item.status === 'SOLD') return res.status(400).json({ success: false, msg: 'Item already sold' });

    const { recordDirectSale } = await import('../services/inventoryService.js');
    const result = await recordDirectSale(item.id, sale_price, payment_method.toUpperCase());
    
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