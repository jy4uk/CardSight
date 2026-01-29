/**
 * Simple in-memory cache service with TTL
 * For PSA/eBay market data caching
 */

const cache = new Map();
const DEFAULT_TTL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

/**
 * Generate cache key from card signature
 * @param {Object} card - { name, set, number, grade }
 * @returns {string} Cache key
 */
export function generateCacheKey(card) {
  const parts = [
    card.name || '',
    card.set || '',
    card.number || '',
    card.grade || '',
  ].map(p => p.toString().toLowerCase().trim());
  
  return parts.join('|');
}

/**
 * Get item from cache
 * @param {string} key - Cache key
 * @returns {Object|null} Cached data or null if not found/expired
 */
export function get(key) {
  const item = cache.get(key);
  
  if (!item) {
    return null;
  }
  
  // Check if expired
  if (Date.now() > item.expiry) {
    cache.delete(key);
    console.log(`Cache expired for key: ${key}`);
    return null;
  }
  
  console.log(`Cache hit for key: ${key}`);
  return item.data;
}

/**
 * Set item in cache
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds (default 12h)
 */
export function set(key, data, ttl = DEFAULT_TTL) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
    createdAt: new Date().toISOString(),
  });
  console.log(`Cache set for key: ${key}, TTL: ${ttl / 1000}s`);
}

/**
 * Delete item from cache
 * @param {string} key - Cache key
 */
export function del(key) {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clear() {
  cache.clear();
  console.log('Cache cleared');
}

/**
 * Get cache stats
 * @returns {Object} Cache statistics
 */
export function stats() {
  let validCount = 0;
  let expiredCount = 0;
  
  for (const [key, item] of cache.entries()) {
    if (Date.now() > item.expiry) {
      expiredCount++;
    } else {
      validCount++;
    }
  }
  
  return {
    totalEntries: cache.size,
    validEntries: validCount,
    expiredEntries: expiredCount,
  };
}

/**
 * Clean up expired entries
 */
export function cleanup() {
  const now = Date.now();
  let removed = 0;
  
  for (const [key, item] of cache.entries()) {
    if (now > item.expiry) {
      cache.delete(key);
      removed++;
    }
  }
  
  if (removed > 0) {
    console.log(`Cache cleanup: removed ${removed} expired entries`);
  }
  
  return removed;
}

// Run cleanup every hour
setInterval(cleanup, 60 * 60 * 1000);

export default {
  generateCacheKey,
  get,
  set,
  del,
  clear,
  stats,
  cleanup,
};
