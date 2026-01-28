import { query } from './db.js';

// Manual pricing service - helps users input TCGPlayer prices efficiently
export async function saveManualPricing(barcodeId, pricingData) {
  try {
    // Save pricing data to database
    await query(`
      UPDATE inventory 
      SET 
        front_label_price = $1,
        tcgplayer_market_price = $2,
        tcgplayer_low_price = $3,
        tcgplayer_mid_price = $4,
        tcgplayer_high_price = $5,
        pricing_source = 'manual_tcgplayer',
        pricing_updated_at = NOW(),
        notes = COALESCE(notes, '') || ' | Price updated manually from TCGPlayer'
      WHERE barcode_id = $6
    `, [
      pricingData.sellingPrice || pricingData.marketPrice,
      pricingData.marketPrice,
      pricingData.lowPrice,
      pricingData.midPrice,
      pricingData.highPrice,
      barcodeId
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error saving manual pricing:', error);
    throw error;
  }
}

// Get cards that need pricing updates
export async function getCardsNeedingPricing() {
  try {
    const result = await query(`
      SELECT 
        id,
        barcode_id,
        card_name,
        set_name,
        card_number,
        front_label_price,
        pricing_updated_at,
        CASE 
          WHEN pricing_updated_at IS NULL THEN true
          WHEN pricing_updated_at < NOW() - INTERVAL '30 days' THEN true
          ELSE false
        END as needs_update
      FROM inventory 
      WHERE status = 'IN_STOCK'
      ORDER BY 
        CASE 
          WHEN pricing_updated_at IS NULL THEN 0
          WHEN pricing_updated_at < NOW() - INTERVAL '30 days' THEN 1
          ELSE 2
        END,
        card_name
    `);

    return result.rows;
  } catch (error) {
    console.error('Error getting cards needing pricing:', error);
    throw error;
  }
}

// Get pricing statistics
export async function getPricingStatistics() {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_cards,
        COUNT(CASE WHEN pricing_updated_at IS NOT NULL THEN 1 END) as priced_cards,
        COUNT(CASE WHEN pricing_updated_at < NOW() - INTERVAL '30 days' OR pricing_updated_at IS NULL THEN 1 END) as outdated_cards,
        AVG(front_label_price) as avg_price,
        AVG(tcgplayer_market_price) as avg_market_price,
        SUM(front_label_price) as total_value,
        SUM(tcgplayer_market_price) as total_market_value
      FROM inventory 
      WHERE status = 'IN_STOCK'
    `);

    return result.rows[0];
  } catch (error) {
    console.error('Error getting pricing statistics:', error);
    throw error;
  }
}

// Generate TCGPlayer search URL for a card
export function generateTCGPlayerSearchUrl(cardName, setName, cardNumber) {
  const searchQuery = cardNumber 
    ? `${cardName} ${setName} ${cardNumber}`
    : `${cardName} ${setName}`;
  
  return `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(searchQuery)}&page=1`;
}

// Suggest pricing based on similar cards
export async function suggestPricing(cardName, setName, cardType = 'raw') {
  try {
    // Find similar cards in your inventory
    const result = await query(`
      SELECT 
        front_label_price,
        tcgplayer_market_price,
        card_type,
        CASE 
          WHEN card_type = $1 THEN 1
          WHEN card_type IN ('psa', 'bgs', 'cgc') THEN 0.8
          ELSE 1
        END as type_multiplier
      FROM inventory 
      WHERE status = 'IN_STOCK'
        AND (card_name ILIKE $2 OR set_name ILIKE $3)
        AND tcgplayer_market_price IS NOT NULL
      ORDER BY 
        ABS(LENGTH(card_name) - LENGTH($2)) +
        ABS(LENGTH(set_name) - LENGTH($3))
      LIMIT 5
    `, [cardType, `%${cardName}%`, `%${setName}%`]);

    if (result.rows.length === 0) {
      return null;
    }

    // Calculate average prices with type adjustments
    const avgMarketPrice = result.rows.reduce((sum, card) => 
      sum + (card.tcgplayer_market_price * card.type_multiplier), 0) / result.rows.length;
    
    const avgSellingPrice = result.rows.reduce((sum, card) => 
      sum + (card.front_label_price * card.type_multiplier), 0) / result.rows.length;

    return {
      suggestedMarketPrice: avgMarketPrice.toFixed(2),
      suggestedSellingPrice: avgSellingPrice.toFixed(2),
      basedOnCards: result.rows.length,
      confidence: result.rows.length >= 3 ? 'high' : result.rows.length >= 2 ? 'medium' : 'low'
    };
  } catch (error) {
    console.error('Error suggesting pricing:', error);
    return null;
  }
}

// Bulk update multiple cards
export async function bulkUpdatePricing(updates) {
  try {
    const results = [];
    
    for (const update of updates) {
      try {
        await saveManualPricing(update.barcodeId, update.pricingData);
        results.push({ 
          barcodeId: update.barcodeId, 
          success: true 
        });
      } catch (error) {
        results.push({ 
          barcodeId: update.barcodeId, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in bulk pricing update:', error);
    throw error;
  }
}
