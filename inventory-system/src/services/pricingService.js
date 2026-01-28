import { query } from './db.js';

// TCGPlayer API configuration
const TCGPLAYER_API_BASE = 'https://api.tcgplayer.com/v2';
const TCGPLAYER_API_KEY = process.env.TCGPLAYER_API_KEY || '';

// Cache for pricing data (24 hours)
const pricingCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function getTCGPlayerPricing(cardName, setName, cardNumber = null) {
  try {
    // Check cache first
    const cacheKey = `${cardName}-${setName}-${cardNumber}`;
    const cached = pricingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Search for the product
    const searchResponse = await fetch(`${TCGPLAYER_API_BASE}/product/search?q=${encodeURIComponent(cardName)}&productName=${encodeURIComponent(setName)}&limit=10`, {
      headers: {
        'Authorization': `Bearer ${TCGPLAYER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`TCGPlayer API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.data || searchData.data.length === 0) {
      return null;
    }

    // Find the best match (prefer exact name and number match)
    let bestMatch = searchData.data[0];
    if (cardNumber && searchData.data.length > 1) {
      const exactMatch = searchData.data.find(item => 
        item.name.toLowerCase() === cardName.toLowerCase() && 
        item.number === cardNumber
      );
      if (exactMatch) {
        bestMatch = exactMatch;
      }
    }

    // Get pricing data for the product
    const pricingResponse = await fetch(`${TCGPLAYER_API_BASE}/product/${bestMatch.id}/price`, {
      headers: {
        'Authorization': `Bearer ${TCGPLAYER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!pricingResponse.ok) {
      throw new Error(`TCGPlayer pricing API error: ${pricingResponse.status}`);
    }

    const pricingData = await pricingResponse.json();
    
    // Process pricing data
    const processedData = {
      tcgplayerId: bestMatch.id,
      name: bestMatch.name,
      set: bestMatch.set?.name || setName,
      number: bestMatch.number,
      image: bestMatch.images?.small || bestMatch.images?.large,
      prices: {
        market: extractPrice(pricingData.data, 'market'),
        low: extractPrice(pricingData.data, 'low'),
        mid: extractPrice(pricingData.data, 'mid'),
        high: extractPrice(pricingData.data, 'high'),
        directLow: extractPrice(pricingData.data, 'directLow'),
        subTypes: processSubTypes(pricingData.data)
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
    console.error('Error fetching TCGPlayer pricing:', error);
    return null;
  }
}

function extractPrice(data, priceType) {
  if (!data || !data.length) return null;
  
  const priceData = data.find(item => item.subTypeName === 'Normal');
  if (!priceData) return null;
  
  return priceData[priceType] || null;
}

function processSubTypes(data) {
  if (!data || !data.length) return [];
  
  return data.map(item => ({
    name: item.subTypeName,
    market: item.market,
    low: item.low,
    mid: item.mid,
    high: item.high,
    directLow: item.directLow
  }));
}

// Get pricing for multiple cards (batch processing)
export async function getBatchPricing(cards) {
  const results = [];
  
  for (const card of cards) {
    try {
      const pricing = await getTCGPlayerPricing(card.card_name, card.set_name, card.card_number);
      if (pricing) {
        results.push({
          id: card.id,
          barcode_id: card.barcode_id,
          pricing
        });
      }
    } catch (error) {
      console.error(`Error fetching pricing for ${card.card_name}:`, error);
    }
  }
  
  return results;
}

// Update inventory items with pricing data
export async function updateInventoryPricing() {
  try {
    // Get all inventory items
    const inventory = await query(`
      SELECT id, barcode_id, card_name, set_name, card_number, front_label_price 
      FROM inventory 
      WHERE status = 'IN_STOCK'
    `);

    // Get batch pricing
    const pricingResults = await getBatchPricing(inventory.rows);
    
    // Update items with pricing data
    for (const result of pricingResults) {
      const { pricing } = result;
      
      // Update front_label_price if market price is available and significantly different
      if (pricing.prices.market) {
        const currentPrice = inventory.rows.find(item => item.id === result.id)?.front_label_price;
        const marketPrice = parseFloat(pricing.prices.market);
        
        // Only update if price difference is more than 20% or no price set
        if (!currentPrice || Math.abs(marketPrice - currentPrice) / currentPrice > 0.2) {
          await query(`
            UPDATE inventory 
            SET front_label_price = $1, 
                tcgplayer_data = $2,
                updated_at = NOW()
            WHERE id = $3
          `, [marketPrice, JSON.stringify(pricing), result.id]);
        }
      }
    }
    
    return pricingResults;
  } catch (error) {
    console.error('Error updating inventory pricing:', error);
    throw error;
  }
}

// Get price suggestions for selling
export function getSellSuggestions(pricingData, cardType = 'raw') {
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
    source: 'TCGPlayer'
  };
}

// Clear pricing cache
export function clearPricingCache() {
  pricingCache.clear();
}
