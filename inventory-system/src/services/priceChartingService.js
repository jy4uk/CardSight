import { query } from './db.js';

// PriceCharting API configuration
const PRICECHARTING_API_BASE = 'https://api.pricecharting.com';
const PRICECHARTING_API_KEY = process.env.PRICECHARTING_API_KEY || '';

// Cache for pricing data (24 hours)
const pricingCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function getPriceChartingPricing(cardName, setName, cardNumber = null) {
  try {
    // Check cache first
    const cacheKey = `${cardName}-${setName}-${cardNumber}`;
    const cached = pricingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Search for the product
    const searchUrl = `${PRICECHARTING_API_BASE}/search?product_name=${encodeURIComponent(cardName)}&set_name=${encodeURIComponent(setName)}&number=${cardNumber || ''}`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'X-PW-Application': 'json',
        'Authorization': `Bearer ${PRICECHARTING_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`PriceCharting API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchResponse.data || !searchResponse.data.data || searchData.data.data.length === 0) {
      return null;
    }

    // Find the best match
    let bestMatch = searchData.data.data[0];
    if (cardNumber && searchData.data.data.length > 1) {
      const exactMatch = searchData.data.data.find(item => 
        item.number === cardNumber
      );
      if (exactMatch) {
        bestMatch = exactMatch;
      }
    }

    // Get pricing data
    const pricingUrl = `${PRICECHARTING_API_BASE}/product/${bestMatch.id}/prices`;
    
    const pricingResponse = await fetch(pricingUrl, {
      headers: {
        'X-PW-Application': 'json',
        'Authorization': `Bearer ${PRICECHARTING_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!pricingResponse.ok) {
      throw new Error(`PriceCharting pricing API error: ${pricingResponse.status}`);
    }

    const pricingData = await pricingResponse.json();
    
    // Process pricing data
    const processedData = {
      priceChartingId: bestMatch.id,
      name: bestMatch.name,
      set: bestMatch.set_name || setName,
      number: bestMatch.number,
      image: bestMatch.image,
      prices: {
        market: pricingData.data?.market_price || null,
        low: pricingData.data?.low_price || null,
        mid: pricingData.data?.mid_price || null,
        high: pricingData.data?.high_price || null,
        subTypes: pricingData.data?.sub_types || []
      },
      updatedAt: new Date().toISOString()
    };

    // Cache the result
    pricingCache.set(cacheKey, {
      data: processedData,
      timestamp: Date.now()
    });

    return processedData;
  } catch (error) {
    console.error('Error fetching PriceCharting pricing:', error);
    return null;
  }
}

// Get pricing for multiple cards (batch processing)
export async function getBatchPriceChartingPricing(cards) {
  const results = [];
  
  for (const card of cards) {
    try {
      const pricing = await getPriceChartingPricing(card.card_name, card.set_name, card.card_number);
      if (pricing) {
        results.push({
          id: card.id,
          barcode_id: card.barcode_id,
          pricing
        });
      }
    } catch (error) {
      console.error(`Error fetching PriceCharting pricing for ${card.card_name}:`, error);
    }
  }
  
  return results;
}

// Update inventory items with pricing data
export async function updateInventoryPriceChartingPricing() {
  try {
    // Get all inventory items
    const inventory = await query(`
      SELECT id, barcode_id, card_name, set_name, card_number, front_label_price 
      FROM inventory 
      WHERE status = 'IN_STOCK'
    `);

    // Get batch pricing
    const pricingResults = await getBatchPriceChartingPricing(inventory.rows);
    
    // Update items with pricing data
    for (const result of pricingResults) {
      const { pricing } = result;
      
      // Update front_label_price if market price is available
      if (pricing.prices.market) {
        const currentPrice = inventory.rows.find(item => item.id === result.id)?.front_label_price;
        const marketPrice = parseFloat(pricing.prices.market);
        
        // Only update if price difference is more than 20% or no price set
        if (!currentPrice || Math.abs(marketPrice - currentPrice) / currentPrice > 0.2) {
          await query(`
            UPDATE inventory 
            SET front_label_price = $1, 
                pricecharting_data = $2,
                updated_at = NOW()
            WHERE id = $3
          `, [marketPrice, JSON.stringify(pricing), result.id]);
        }
      }
    }
    
    return pricingResults;
  } catch (error) {
    console.error('Error updating PriceCharting pricing:', error);
    throw error;
  }
}

// Get price suggestions for selling
export function getPriceChartingSellSuggestions(pricingData, cardType = 'raw') {
  if (!pricingData || !pricingData.prices) {
    return {
      suggestedPrice: null,
      minPrice: null,
      maxPrice: null
    };
  }

  const { market, low, mid, high } = pricingData.prices;
  
  // Adjust pricing based on card type
  let multiplier = 1.0;
  if (cardType === 'psa' || cardType === 'bgs' || cardType === 'cgc') {
    multiplier = 1.2; // Graded cards typically sell for more
  }
  
  const suggestedPrice = market ? parseFloat(market) * multiplier : null;
  const minPrice = low ? parseFloat(low) * 0.9 : null; // 10% below low
  const maxPrice = high ? parseFloat(high) * 1.1 : null; // 10% above high
  
  return {
    suggestedPrice,
    minPrice,
    maxPrice,
    source: 'PriceCharting'
  };
}

// Clear pricing cache
export function clearPriceChartingCache() {
  pricingCache.clear();
}
