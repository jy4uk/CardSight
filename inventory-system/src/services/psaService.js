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
 * PSA Service — DEPRECATED
 *
 * PSA's public unauthenticated API is hard-capped at 100 calls/day (account/IP-wide), making it
 * unusable for any bulk or automated flow. CardLadder's httpcertlookup endpoint now handles all
 * cert resolution (cert number → profileId/grade/card data) without touching PSA directly —
 * see cardLadderService.fetchCertLookup(). This file is kept as a reference and for the
 * isPSACertNumber() format-check utility, which has no PSA dependency.
 *
 * Do not add new callers. Remove this file once isPSACertNumber() is moved to a shared util.
 */

const PSA_API_BASE = 'https://api.psacard.com/publicapi/cert/GetByCertNumber';
const PSA_IMAGE_BASE = 'https://certimages.psacard.com';
const PSA_API_TOKEN = process.env.PSA_API_TOKEN;

const PSA_POP_BASE = 'https://api.psacard.com/publicapi/pop/GetPSASpecPopulation';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

// PSA's public API (no PSA_API_TOKEN configured here) rate-limits hard. Without this, concurrent
// callers (e.g. pricing the whole graded inventory at once) each retry independently and pile
// requests on top of each other, making 429s worse instead of backing off. This serializes every
// PSA request — across all callers, cert and population alike — with a minimum gap between them.
const MIN_REQUEST_INTERVAL_MS = 1100;
let nextAvailableTime = 0;

function throttle() {
  const now = Date.now();
  const start = Math.max(now, nextAvailableTime);
  nextAvailableTime = start + MIN_REQUEST_INTERVAL_MS;
  const wait = start - now;
  return wait > 0 ? sleep(wait) : Promise.resolve();
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchPSASpecPopulation(specId) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await throttle();

      const headers = {
        'Accept': 'application/json',
      };

      if (PSA_API_TOKEN) {
        headers['Authorization'] = `Bearer ${PSA_API_TOKEN}`;
      }

      const response = await fetch(`${PSA_POP_BASE}/${specId}`, { headers });

      if (!response.ok) {
        if (response.status === 429) {
          lastError = new Error('PSA API rate limited. Please try again in a moment.');
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
          console.log(`PSA rate limited (pop), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
          continue;
        }

        throw new Error(`PSA API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      console.error(`PSA population fetch error (attempt ${attempt + 1}):`, error.message);
      if (!error.message.includes('rate limit')) {
        throw error;
      }
    }
  }

  throw lastError || new Error('PSA API request failed after retries');
}

/**
 * Fetch PSA certification data by cert number with retry logic
 * @param {string} certNumber - 7-9 digit PSA certification number
 * @returns {Promise<Object|null>} Normalized PSA data or null if not found
 */
export async function fetchPSACert(certNumber) {
  let lastError = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await throttle();

      const headers = {
          'Accept': 'application/json',
        };

      // Add authorization if token is available
      if (PSA_API_TOKEN) {
        headers['Authorization'] = `Bearer ${PSA_API_TOKEN}`;
      }

      const response = await fetch(`${PSA_API_BASE}/${certNumber}`, { headers });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`PSA cert ${certNumber} not found`);
          return null;
        }
        
        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          lastError = new Error('PSA API rate limited. Please try again in a moment.');
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
          console.log(`PSA rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
          continue;
        }
        
        throw new Error(`PSA API error: ${response.status}`);
      }

      const data = await response.json();
    
      if (!data || !data.PSACert) {
        return null;
      }

      const cert = data.PSACert;
    
      // Check if PSA API returns image URL directly
      // PSA SecureScan images are only available through their cert verification page
      // The API may return ImageURL or similar field for some certs
      let imageUrl = null;
      if (cert.ImageURL) {
        imageUrl = cert.ImageURL;
      } else if (cert.FrontImageURL) {
        imageUrl = cert.FrontImageURL;
      }
      // Note: certimages.psacard.com URLs don't work for all certs

      // Normalize the response
      return {
        cert: cert.CertNumber?.toString() || certNumber,
        specId: typeof cert.SpecID === 'number' ? cert.SpecID : null,
        name: cert.Subject || cert.CardDescription || null,
        set: cert.SetName || cert.Brand || null,
        number: cert.CardNumber || null,
        grade: cert.CardGrade?.toString() || null,
        year: cert.Year?.toString() || null,
        category: cert.Category || null,
        labelType: cert.LabelType || null,
        reverseBarcode: cert.ReverseBarCode || null,
        population: {
          total: typeof cert.TotalPopulation === 'number' ? cert.TotalPopulation : null,
          totalWithQualifier: typeof cert.TotalPopulationWithQualifier === 'number' ? cert.TotalPopulationWithQualifier : null,
          higher: typeof cert.PopulationHigher === 'number' ? cert.PopulationHigher : null,
        },
        imageUrl,
        imageSource: imageUrl ? 'psa' : null,
        raw: cert, // Include raw data for debugging
      };
    } catch (error) {
      lastError = error;
      console.error(`PSA fetch error (attempt ${attempt + 1}):`, error.message);
      // Don't retry on non-rate-limit errors
      if (!error.message.includes('rate limit')) {
        throw error;
      }
    }
  }
  
  // All retries exhausted
  throw lastError || new Error('PSA API request failed after retries');
}

/**
 * Check if a string looks like a PSA cert number (7-9 digit numeric)
 * @param {string} value 
 * @returns {boolean}
 */
export function isPSACertNumber(value) {
  if (!value || typeof value !== 'string') return false;
  const cleaned = value.trim();
  return /^\d{7,9}$/.test(cleaned);
}

/**
 * Validate PSA image URL is accessible
 * @param {string} imageUrl 
 * @returns {Promise<boolean>}
 */
export async function validatePSAImage(imageUrl) {
  if (!imageUrl) return false;
  
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  fetchPSACert,
  fetchPSASpecPopulation,
  isPSACertNumber,
  validatePSAImage,
};
