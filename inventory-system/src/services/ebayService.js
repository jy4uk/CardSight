/**
 * PROPRIETARY AND CONFIDENTIAL
 * 
 * This file contains trade secrets and proprietary information of Card Sight.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited.
 * 
 * Copyright (c) 2024-2026 Card Sight. All Rights Reserved.
 * 
 * For licensing inquiries: legal@cardsight.com
 */

/**
 * eBay Service - Queries eBay Browse API for market data
 * Uses OAuth2 Client Credentials flow for authentication
 */

const EBAY_AUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const TRADING_CARDS_CATEGORY = '183454'; // eBay category for Trading Cards

let cachedToken = null;
let tokenExpiry = null;

/**
 * Get OAuth2 access token for eBay API
 * Uses client credentials flow
 */
async function getAccessToken() {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('eBay API credentials not configured (EBAY_CLIENT_ID, EBAY_CLIENT_SECRET)');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(EBAY_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`eBay auth failed: ${error}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  
  return cachedToken;
}

/**
 * Build search query for eBay from card data
 */
function buildSearchQuery(card) {
  const parts = [];
  
  if (card.name) parts.push(card.name);
  if (card.number) parts.push(card.number);
  if (card.grade) parts.push(`PSA ${card.grade}`);
  
  return parts.join(' ');
}

/**
 * Search eBay Browse API
 */
async function searchEbay(query, options = {}) {
  const token = await getAccessToken();
  
  const params = new URLSearchParams({
    q: query,
    category_ids: TRADING_CARDS_CATEGORY,
    limit: options.limit || 10,
  });

  if (options.filter) {
    params.append('filter', options.filter);
  }
  if (options.sort) {
    params.append('sort', options.sort);
  }

  const url = `${EBAY_BROWSE_URL}?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('eBay rate limit exceeded');
    }
    const error = await response.text();
    throw new Error(`eBay search failed: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Fetch recently sold items
 */
async function fetchSoldListings(card, limit = 6) {
  const query = buildSearchQuery(card);
  
  try {
    const data = await searchEbay(query, {
      filter: 'soldItemsOnly:true',
      sort: 'EndTimeNewest',
      limit,
    });

    if (!data.itemSummaries) return [];

    return data.itemSummaries
      .filter(item => !isMultiCardLot(item.title))
      .map(item => ({
        title: item.title,
        price: parsePrice(item.price),
        currency: item.price?.currency || 'USD',
        date: item.itemEndDate ? new Date(item.itemEndDate).toISOString().split('T')[0] : null,
        url: item.itemWebUrl,
        thumbnail: item.thumbnailImages?.[0]?.imageUrl || item.image?.imageUrl || null,
        itemId: item.itemId,
        aspects: item.localizedAspects || [],
      }));
  } catch (error) {
    console.error('eBay sold listings error:', error.message);
    return [];
  }
}

/**
 * Fetch active buy-it-now listings (lowest price)
 */
async function fetchActiveListings(card, limit = 3) {
  const query = buildSearchQuery(card);
  
  try {
    const data = await searchEbay(query, {
      filter: 'buyingOptions:{FIXED_PRICE}',
      sort: 'pricePlusShippingLowest',
      limit,
    });

    if (!data.itemSummaries) return [];

    return data.itemSummaries
      .filter(item => !isMultiCardLot(item.title))
      .map(item => ({
        title: item.title,
        price: parsePrice(item.price),
        currency: item.price?.currency || 'USD',
        url: item.itemWebUrl,
        thumbnail: item.thumbnailImages?.[0]?.imageUrl || item.image?.imageUrl || null,
        itemId: item.itemId,
        aspects: item.localizedAspects || [],
      }));
  } catch (error) {
    console.error('eBay active listings error:', error.message);
    return [];
  }
}

/**
 * Fetch live auctions (ending soonest)
 */
async function fetchAuctions(card, limit = 3) {
  const query = buildSearchQuery(card);
  
  try {
    const data = await searchEbay(query, {
      filter: 'buyingOptions:{AUCTION}',
      sort: 'EndTimeSoonest',
      limit,
    });

    if (!data.itemSummaries) return [];

    return data.itemSummaries
      .filter(item => !isMultiCardLot(item.title))
      .map(item => ({
        title: item.title,
        currentBid: parsePrice(item.currentBidPrice || item.price),
        currency: item.price?.currency || 'USD',
        endsIn: formatTimeRemaining(item.itemEndDate),
        endDate: item.itemEndDate,
        url: item.itemWebUrl,
        thumbnail: item.thumbnailImages?.[0]?.imageUrl || item.image?.imageUrl || null,
        itemId: item.itemId,
        aspects: item.localizedAspects || [],
      }));
  } catch (error) {
    console.error('eBay auctions error:', error.message);
    return [];
  }
}

/**
 * Check if listing is a multi-card lot
 */
function isMultiCardLot(title) {
  if (!title) return false;
  const lowerTitle = title.toLowerCase();
  return /\b(lot|collection|bundle|set of|pack of|\d+\s*cards?)\b/.test(lowerTitle);
}

/**
 * Parse eBay price object to number
 */
function parsePrice(priceObj) {
  if (!priceObj) return null;
  const value = parseFloat(priceObj.value);
  return isNaN(value) ? null : value;
}

/**
 * Format time remaining for auctions
 */
function formatTimeRemaining(endDate) {
  if (!endDate) return null;
  
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end - now;
  
  if (diffMs <= 0) return 'Ended';
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * Fetch all market data for a card
 */
export async function fetchMarketData(card) {
  const [sold, active, auctions] = await Promise.all([
    fetchSoldListings(card, 6),
    fetchActiveListings(card, 3),
    fetchAuctions(card, 3),
  ]);

  return {
    sold,
    active,
    auctions,
    meta: {
      soldCount: sold.length,
      activeCount: active.length,
      auctionsCount: auctions.length,
      fetchedAt: new Date().toISOString(),
    },
  };
}

export default {
  fetchMarketData,
  fetchSoldListings,
  fetchActiveListings,
  fetchAuctions,
  buildSearchQuery,
};
