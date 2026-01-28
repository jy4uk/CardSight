import express from 'express';
import { getTCGPlayerPricing, getBatchPricing, updateInventoryPricing, getSellSuggestions } from '../services/pricingService.js';
import { query } from '../services/db.js';

const router = express.Router();

// Get pricing for a single card
router.get('/card/:barcodeId', async (req, res) => {
  try {
    const { barcodeId } = req.params;
    
    // Get card from database
    const cardResult = await query(`
      SELECT card_name, set_name, card_number, card_type, front_label_price 
      FROM inventory 
      WHERE barcode_id = $1 AND status = 'IN_STOCK'
    `, [barcodeId]);
    
    if (cardResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }
    
    const card = cardResult.rows[0];
    
    // Get TCGPlayer pricing
    const pricing = await getTCGPlayerPricing(card.card_name, card.set_name, card.card_number);
    
    if (!pricing) {
      return res.json({ 
        success: true, 
        data: {
          card,
          pricing: null,
          message: 'No pricing data available'
        }
      });
    }
    
    // Get sell suggestions
    const suggestions = getSellSuggestions(pricing, card.card_type);
    
    res.json({
      success: true,
      data: {
        card,
        pricing,
        suggestions
      }
    });
  } catch (err) {
    console.error('Pricing API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get pricing for multiple cards
router.post('/batch', async (req, res) => {
  try {
    const { barcodeIds } = req.body;
    
    if (!Array.isArray(barcodeIds) || barcodeIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid barcode IDs' });
    }
    
    // Get cards from database
    const placeholders = barcodeIds.map((_, index) => `$${index + 1}`).join(',');
    const cardsResult = await query(`
      SELECT id, barcode_id, card_name, set_name, card_number, card_type, front_label_price 
      FROM inventory 
      WHERE barcode_id IN (${placeholders}) AND status = 'IN_STOCK'
    `, barcodeIds);
    
    // Get batch pricing
    const pricingResults = await getBatchPricing(cardsResult.rows);
    
    res.json({
      success: true,
      data: pricingResults
    });
  } catch (err) {
    console.error('Batch pricing API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update all inventory with current pricing
router.post('/update', async (req, res) => {
  try {
    const results = await updateInventoryPricing();
    
    res.json({
      success: true,
      data: {
        updated: results.length,
        message: `Updated pricing for ${results.length} items`
      }
    });
  } catch (err) {
    console.error('Update pricing API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get pricing analytics
router.get('/analytics', async (req, res) => {
  try {
    // Get inventory with pricing data
    const result = await query(`
      SELECT 
        card_name,
        set_name,
        card_type,
        front_label_price,
        tcgplayer_data,
        created_at,
        updated_at
      FROM inventory 
      WHERE status = 'IN_STOCK' AND tcgplayer_data IS NOT NULL
      ORDER BY created_at DESC
    `);
    
    const analytics = result.rows.map(item => {
      const pricingData = JSON.parse(item.tcgplayer_data);
      return {
        cardName: item.card_name,
        setName: item.set_name,
        cardType: item.card_type,
        currentPrice: parseFloat(item.front_label_price),
        marketPrice: pricingData.prices.market ? parseFloat(pricingData.prices.market) : null,
        priceDifference: pricingData.prices.market ? 
          parseFloat(item.front_label_price) - parseFloat(pricingData.prices.market) : null,
        lastUpdated: item.updated_at
      };
    });
    
    // Calculate analytics
    const totalItems = analytics.length;
    const itemsWithMarketPrice = analytics.filter(item => item.marketPrice !== null);
    const totalCurrentValue = analytics.reduce((sum, item) => sum + item.currentPrice, 0);
    const totalMarketValue = itemsWithMarketPrice.reduce((sum, item) => sum + item.marketPrice, 0);
    const avgPriceDifference = itemsWithMarketPrice.reduce((sum, item) => sum + item.priceDifference, 0) / itemsWithMarketPrice.length;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalItems,
          itemsWithMarketPrice,
          totalCurrentValue,
          totalMarketValue,
          avgPriceDifference,
          potentialProfit: totalMarketValue - totalCurrentValue
        },
        items: analytics
      }
    });
  } catch (err) {
    console.error('Pricing analytics API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
