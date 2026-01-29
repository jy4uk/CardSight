/**
 * PSA Service - Fetches certification data from PSA's public API
 */

const PSA_API_BASE = 'https://api.psacard.com/publicapi/cert/GetByCertNumber';
const PSA_IMAGE_BASE = 'https://certimages.psacard.com';
const PSA_API_TOKEN = process.env.PSA_API_TOKEN;

const PSA_POP_BASE = 'https://api.psacard.com/publicapi/pop/GetPSASpecPopulation';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

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
