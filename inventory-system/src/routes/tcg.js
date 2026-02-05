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

    const startTime = Date.now();
    const BASE_URL = 'https://tcgcsv.com/tcgplayer';
    const CATEGORY_IDS = [3, 68, 85]; // Pokemon, One Piece, Pokemon Japan
    
    // Helper to fetch with retry
    async function fetchWithRetry(url, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          if (!data.success) throw new Error(data.errors?.join(', ') || 'API error');
          return data;
        } catch (error) {
          if (attempt === maxRetries) throw error;
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // Import query function
    const { query } = await import('../services/db.js');
    
    let totalGroups = 0, totalProducts = 0, totalPrices = 0;

    // Process each category
    for (const categoryId of CATEGORY_IDS) {
      console.log(`[Price Update] Processing category ${categoryId}...`);
      
      // Fetch groups for this category
      const groupsData = await fetchWithRetry(`${BASE_URL}/${categoryId}/groups`);
      const groups = groupsData.results || [];
      
      for (const group of groups) {
        try {
          // Upsert group
          await query(`
            INSERT INTO "card-data-groups-tcgcsv" (group_id, name, abbreviation, category_id)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (group_id) DO UPDATE SET name = $2, abbreviation = $3, category_id = $4
          `, [group.groupId, group.name, group.abbreviation, group.categoryId]);
          totalGroups++;

          // Fetch and upsert products
          const productsData = await fetchWithRetry(`${BASE_URL}/${categoryId}/${group.groupId}/products`);
          for (const product of productsData.results || []) {
            await query(`
              INSERT INTO "card-data-products-tcgcsv" (product_id, name, clean_name, image_url, url, group_id, category_id, extended_data)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (product_id) DO UPDATE SET 
                name = $2, clean_name = $3, image_url = $4, url = $5, extended_data = $8, updated_at = NOW()
            `, [product.productId, product.name, product.cleanName, product.imageUrl, product.url, product.groupId, product.categoryId, JSON.stringify(product.extendedData || [])]);
            totalProducts++;
          }

          // Fetch and upsert prices
          const pricesData = await fetchWithRetry(`${BASE_URL}/${categoryId}/${group.groupId}/prices`);
          for (const price of pricesData.results || []) {
            await query(`
              INSERT INTO "card-data-prices-tcgcsv" (product_id, sub_type_name, low_price, mid_price, high_price, market_price, direct_low_price)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (product_id, sub_type_name) DO UPDATE SET 
                low_price = $3, mid_price = $4, high_price = $5, market_price = $6, direct_low_price = $7, updated_at = NOW()
            `, [price.productId, price.subTypeName || 'Normal', price.lowPrice, price.midPrice, price.highPrice, price.marketPrice, price.directLowPrice]);
            totalPrices++;
          }
          
          console.log(`[Price Update] Group ${group.name}: ${productsData.results?.length || 0} products, ${pricesData.results?.length || 0} prices`);
        } catch (groupErr) {
          console.error(`[Price Update] Error processing group ${group.groupId}:`, groupErr.message);
        }
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[Price Update] Complete in ${duration.toFixed(2)}s - Groups: ${totalGroups}, Products: ${totalProducts}, Prices: ${totalPrices}`);
    
    res.json({
      success: true,
      message: 'Price update complete',
      stats: {
        groups: totalGroups,
        products: totalProducts,
        prices: totalPrices,
        durationSeconds: duration.toFixed(2)
      }
    });
  } catch (err) {
    console.error('[Price Update] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
