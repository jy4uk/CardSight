/**
 * TCG Service - Queries TCGplayer product data for card matching
 */

import { query } from './db.js';

/**
 * Search TCG products by name with fuzzy matching
 * Returns up to `limit` matches sorted by relevance
 * JOINs with groups table for proper set name matching
 * @param {string} searchTerm - Card name to search for
 * @param {string} setName - Optional set name to filter by (matches against groups.name)
 * @param {string} cardNumber - Optional card number to filter by (matches against extended_data Number field)
 * @param {number} limit - Max results (default 3)
 */
export async function searchTCGProducts(searchTerm, setName = null, cardNumber = null, limit = 3) {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  const cleanSearch = searchTerm.trim().toLowerCase();
  
  // Build query with JOIN to groups table for set name matching
  // Use ILIKE for case-insensitive matching
  // Prioritize exact matches, then clean_name matches, then partial matches
  let sql = `
    SELECT 
      p.product_id,
      p.name,
      p.clean_name,
      p.image_url,
      p.url,
      p.group_id,
      p.extended_data,
      g.name as set_name,
      g.abbreviation as set_abbreviation
    FROM "card-data-products-tcgcsv" p
    LEFT JOIN "card-data-groups-tcgcsv" g ON p.group_id = g.group_id
    WHERE (
      LOWER(p.clean_name) LIKE $1
      OR LOWER(p.name) LIKE $1
    )
  `;
  
  const params = [`%${cleanSearch}%`];
  
  // If set name provided, filter by groups.name (the actual set name)
  if (setName && setName.trim()) {
    sql += ` AND (
      LOWER(g.name) LIKE $${params.length + 1}
      OR LOWER(g.abbreviation) LIKE $${params.length + 1}
    )`;
    params.push(`%${setName.trim().toLowerCase()}%`);
  }
  
  // If card number provided, filter by extended_data Number field
  if (cardNumber && cardNumber.trim()) {
    sql += ` AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.extended_data) elem
      WHERE elem->>'name' = 'Number' AND elem->>'value' LIKE $${params.length + 1}
    )`;
    params.push(`%${cardNumber.trim()}%`);
  }
  
  // Order by relevance: exact match first, then by name length (shorter = more specific)
  sql += `
    ORDER BY 
      CASE 
        WHEN LOWER(p.clean_name) = $${params.length + 1} THEN 0
        WHEN LOWER(p.clean_name) LIKE $${params.length + 1} || '%' THEN 1
        ELSE 2
      END,
      LENGTH(p.clean_name)
    LIMIT $${params.length + 2}
  `;
  
  params.push(cleanSearch, limit);
  
  try {
    const rows = await query(sql, params);
    return rows.map(row => {
      // Extract card number and rarity from extended_data array
      const extData = row.extended_data || [];
      const getExtValue = (name) => {
        const item = extData.find(e => e.name === name);
        return item?.value || null;
      };
      
      return {
        productId: row.product_id,
        name: row.name,
        cleanName: row.clean_name,
        imageUrl: row.image_url,
        url: row.url,
        groupId: row.group_id,
        setName: row.set_name,
        setAbbreviation: row.set_abbreviation,
        cardNumber: getExtValue('Number'),
        rarity: getExtValue('Rarity'),
        extendedData: extData,
      };
    });
  } catch (err) {
    console.error('TCG product search error:', err);
    return [];
  }
}

/**
 * Get TCG product by ID with current pricing
 * @param {number} productId - TCGplayer product ID
 */
export async function getTCGProductWithPrice(productId) {
  const sql = `
    SELECT 
      p.product_id,
      p.name,
      p.clean_name,
      p.image_url,
      p.url,
      p.extended_data,
      pr.market_price,
      pr.low_price,
      pr.mid_price,
      pr.high_price,
      pr.direct_low_price,
      pr.updated_at as price_updated_at
    FROM "card-data-products-tcgcsv" p
    LEFT JOIN "card-data-prices-tcgcsv" pr ON p.product_id = pr.product_id
    WHERE p.product_id = $1
  `;
  
  try {
    const rows = await query(sql, [productId]);
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      productId: row.product_id,
      name: row.name,
      cleanName: row.clean_name,
      imageUrl: row.image_url,
      url: row.url,
      extendedData: row.extended_data || {},
      pricing: {
        marketPrice: row.market_price ? parseFloat(row.market_price) : null,
        lowPrice: row.low_price ? parseFloat(row.low_price) : null,
        midPrice: row.mid_price ? parseFloat(row.mid_price) : null,
        highPrice: row.high_price ? parseFloat(row.high_price) : null,
        directLowPrice: row.direct_low_price ? parseFloat(row.direct_low_price) : null,
        updatedAt: row.price_updated_at,
      },
    };
  } catch (err) {
    console.error('TCG product fetch error:', err);
    return null;
  }
}
