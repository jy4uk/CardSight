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

/**
 * POST /api/tcg/update-prices
 * Trigger price update from TCGCSV - should be called daily via cron job
 * Protected endpoint - requires API key or admin auth
 */
router.post('/update-prices', async (req, res) => {
  try {
    // Simple API key protection for cron jobs
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    if (apiKey !== process.env.CRON_API_KEY && process.env.CRON_API_KEY) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Dynamically import the TCGDataFetcher
    const { TCGDataFetcher } = await import('../card-data/fetch-tcg-data.ts');
    const fetcher = new TCGDataFetcher();
    
    const startTime = Date.now();
    
    // Setup database tables if needed
    await fetcher.setupDatabase();
    
    // Fetch latest data
    console.log('[Price Update] Fetching latest data from TCGCSV...');
    const data = await fetcher.fetchAllGroupData();
    
    // Save to database
    console.log('[Price Update] Saving to database...');
    await fetcher.saveGroupsToDatabase(data.groups);
    await fetcher.saveProductsToDatabase(data.products);
    await fetcher.savePricesToDatabase(data.prices);
    
    // Get final stats
    const stats = await fetcher.getDatabaseStats();
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`[Price Update] Complete in ${duration.toFixed(2)}s - Groups: ${stats.groups}, Products: ${stats.products}, Prices: ${stats.prices}`);
    
    res.json({
      success: true,
      message: 'Price update complete',
      stats: {
        groups: stats.groups,
        products: stats.products,
        prices: stats.prices,
        durationSeconds: duration.toFixed(2)
      }
    });
  } catch (err) {
    console.error('[Price Update] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
