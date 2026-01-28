// Image fetching service for card images from various sources

const POKEMON_TCG_API_KEY = process.env.POKEMON_TCG_API_KEY;
const POKEMON_TCG_BASE_URL = 'https://api.pokemontcg.io/v2';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (POKEMON_TCG_API_KEY) {
    headers['X-Api-Key'] = POKEMON_TCG_API_KEY;
  }
  return headers;
}

function normalizeCardNumber(cardNumber) {
  if (!cardNumber) return null;
  const raw = String(cardNumber).trim();
  if (!raw) return null;
  // PokemonTCG "number" is typically the card's number only (e.g. "203"), not "203/193".
  // Accept inputs like "203/193" or "203 / 193" by extracting the leading token.
  const firstToken = raw.split('/')[0]?.trim();
  if (!firstToken) return null;
  const match = firstToken.match(/^\d+[A-Za-z]*$/);
  return match ? match[0] : firstToken;
}

async function fetchPokemonApi(endpoint, { signal } = {}) {
  try {
    const response = await fetch(`${POKEMON_TCG_BASE_URL}${endpoint}`, {
      signal,
      headers: getHeaders(),
    });
    if (!response.ok) {
      console.error(`Pokemon API error: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    if (err?.name === 'AbortError') return null;
    console.error('Fetch error:', err);
    return null;
  }
}

// Map card data to a consistent shape with extended info
function mapCardData(card) {
  return {
    cardId: card.id,
    name: card.name,
    number: card.number,
    imageUrl: card.images?.large || card.images?.small,
    smallImageUrl: card.images?.small,
    // Set info
    set: card.set?.name,
    setId: card.set?.id,
    setSeries: card.set?.series,
    setLogo: card.set?.images?.logo,
    // Card details
    rarity: card.rarity,
    artist: card.artist,
    supertype: card.supertype,
    subtypes: card.subtypes,
    hp: card.hp,
    types: card.types,
    // Market prices (TCGPlayer, in USD)
    tcgplayerUrl: card.tcgplayer?.url,
    tcgplayerPrices: card.tcgplayer?.prices,
    // Cardmarket prices (in EUR)
    cardmarketUrl: card.cardmarket?.url,
    cardmarketPrices: card.cardmarket?.prices,
  };
}

// Pokemon TCG API - https://pokemontcg.io/
// With API key for better rate limits
export async function searchPokemonCard(cardName, setName = null, cardNumber = null, { signal } = {}) {
  try {
    const normalizedNumber = normalizeCardNumber(cardNumber);
    
    // Build query with exact matching where possible
    let query = `name:"${cardName}"`;
    if (setName) {
      // Use wildcard for partial set name matching
      query += ` set.name:"*${setName}*"`;
    }
    if (normalizedNumber) {
      query += ` number:${normalizedNumber}`;
    }
    
    const data = await fetchPokemonApi(`/cards?q=${encodeURIComponent(query)}&pageSize=1`, { signal });
    if (!data?.data?.length) return null;
    
    return mapCardData(data.data[0]);
  } catch (err) {
    console.error('Pokemon TCG API error:', err);
    return null;
  }
}

// Search for multiple Pokemon cards to let user pick the right one
export async function searchPokemonCards(cardName, setName = null, cardNumber = null, limit = 6, { signal } = {}) {
  try {
    const normalizedNumber = normalizeCardNumber(cardNumber);
    const pageSize = Math.max(12, Number(limit) * 2);
    
    // Strategy 1: Exact card number match (most precise)
    if (normalizedNumber) {
      let exactQuery = `name:"*${cardName}*" number:${normalizedNumber}`;
      if (setName) exactQuery += ` set.name:"*${setName}*"`;
      
      const exactData = await fetchPokemonApi(
        `/cards?q=${encodeURIComponent(exactQuery)}&pageSize=${pageSize}`,
        { signal }
      );
      if (exactData?.data?.length > 0) {
        return exactData.data.slice(0, limit).map(mapCardData);
      }
    }
    
    // Strategy 2: Exact name match with set filter
    let strictQuery = `name:"${cardName}"`;
    if (setName) strictQuery += ` set.name:"*${setName}*"`;
    
    const strictData = await fetchPokemonApi(
      `/cards?q=${encodeURIComponent(strictQuery)}&pageSize=${pageSize}`,
      { signal }
    );
    if (strictData?.data?.length > 0) {
      return strictData.data.slice(0, limit).map(mapCardData);
    }
    
    // Strategy 3: Wildcard name match (broadest)
    let broadQuery = `name:"*${cardName}*"`;
    const broadData = await fetchPokemonApi(
      `/cards?q=${encodeURIComponent(broadQuery)}&pageSize=${pageSize * 2}`,
      { signal }
    );
    const broadCards = broadData?.data || [];
    
    if (broadCards.length === 0) return [];
    
    // Rank results by closeness to search criteria
    const targetName = String(cardName || '').trim().toLowerCase();
    const targetSet = String(setName || '').trim().toLowerCase();
    const targetNum = normalizedNumber?.toLowerCase() || null;
    
    const scored = broadCards
      .map((card) => {
        let score = 0;
        const name = String(card.name || '').toLowerCase();
        const set = String(card.set?.name || '').toLowerCase();
        const num = String(card.number || '').toLowerCase();
        
        // Exact name match is best
        if (name === targetName) score += 100;
        else if (name.includes(targetName)) score += 50;
        
        // Set matching
        if (targetSet) {
          if (set === targetSet) score += 60;
          else if (set.includes(targetSet) || targetSet.includes(set)) score += 30;
        }
        
        // Card number matching
        if (targetNum && num === targetNum) score += 80;
        
        return { card, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return scored.map(({ card }) => mapCardData(card));
  } catch (err) {
    console.error('Pokemon TCG API error:', err);
    return [];
  }
}

// One Piece TCG doesn't have a free public API yet
// For now, return null - could integrate with a scraping service or manual upload
export async function searchOnePieceCard(cardName, setName = null) {
  // No free API available currently
  return null;
}

// Main function to search for card image based on game
export async function searchCardImage(cardName, setName, game = 'pokemon') {
  switch (game) {
    case 'pokemon':
      return await searchPokemonCard(cardName, setName);
    case 'onepiece':
      return await searchOnePieceCard(cardName, setName);
    default:
      return null;
  }
}

// PSA Cert Verification API
// PSA provides a public lookup at: https://www.psacard.com/cert/[cert_number]
// The image can be accessed via their API or scraped from the page
export function getPSAImageUrl(certNumber) {
  if (!certNumber) return null;
  // PSA's public cert verification page
  // Note: PSA doesn't provide a direct image API, but cert images are typically at:
  // https://www.psacard.com/cert/[certNumber]/[cardName]
  // For a cleaner approach, we return the cert page URL and can fetch the image separately
  return {
    certUrl: `https://www.psacard.com/cert/${certNumber}`,
    // PSA cert images are typically embedded in the page, would need scraping or their API
    imageUrl: null,
  };
}

// BGS (Beckett Grading Services) lookup
// BGS lookup is at: https://www.beckett.com/grading/card-lookup
// Their API requires authentication for image access
export function getBGSImageUrl(certNumber) {
  if (!certNumber) return null;
  return {
    certUrl: `https://www.beckett.com/grading/card-lookup?serial_num=${certNumber}`,
    imageUrl: null,
  };
}

// CGC (Certified Guaranty Company) lookup for cards
export function getCGCImageUrl(certNumber) {
  if (!certNumber) return null;
  return {
    certUrl: `https://www.cgccards.com/certlookup/${certNumber}`,
    imageUrl: null,
  };
}

// Main function to get the appropriate image URL based on card type
export function getCardImageUrl(item) {
  const { card_type, cert_number, card_name, set_name, game, image_url } = item;

  // If we already have a cached image URL, use it
  if (image_url) return image_url;

  // For graded cards, try to get the slab image
  if (card_type === 'psa' && cert_number) {
    const psa = getPSAImageUrl(cert_number);
    return psa.imageUrl || psa.certUrl;
  }

  if (card_type === 'bgs' && cert_number) {
    const bgs = getBGSImageUrl(cert_number);
    return bgs.imageUrl || bgs.certUrl;
  }

  if (card_type === 'cgc' && cert_number) {
    const cgc = getCGCImageUrl(cert_number);
    return cgc.imageUrl || cgc.certUrl;
  }

  // For raw cards, try TCGPlayer
  return getTCGPlayerImageUrl(card_name, set_name, game);
}

// Fetch PSA cert data (would need to be called server-side due to CORS)
export async function fetchPSACertData(certNumber) {
  try {
    // PSA has an unofficial API endpoint that returns JSON
    // This requires server-side fetching due to CORS
    const response = await fetch(`https://www.psacard.com/cert/${certNumber}/json`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch PSA cert:', err);
    return null;
  }
}
