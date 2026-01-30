/**
 * TCG Routes - Endpoints for TCGplayer product search and data
 */

import express from 'express';
import { searchTCGProducts, getTCGProductWithPrice } from '../services/tcgService.js';

const router = express.Router();

/**
 * GET /api/tcg/search
 * Search TCG products for autocomplete
 * Query params: q (search term), set (optional set name), number (optional card number), limit (default 3)
 */
router.get('/search', async (req, res) => {
  try {
    const { q, set, number, limit = 3 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, products: [] });
    }
    
    const products = await searchTCGProducts(q, set, number, parseInt(limit));
    res.json({ success: true, products });
  } catch (err) {
    console.error('TCG search error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/tcg/product/:productId
 * Get single TCG product with pricing
 */
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await getTCGProductWithPrice(parseInt(productId));
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    res.json({ success: true, product });
  } catch (err) {
    console.error('TCG product fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
