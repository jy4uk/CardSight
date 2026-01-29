import express from 'express';
import { fetchPSACert, fetchPSASpecPopulation, isPSACertNumber } from '../services/psaService.js';
import { fetchMarketData } from '../services/ebayService.js';
import { scoreListings, getHighestConfidenceListing } from '../services/confidenceScoring.js';
import * as cache from '../services/cacheService.js';

const router = express.Router();

/**
 * GET /api/psa-lookup/pop/:specId
 * Fetch PSA population report by SpecID (cached)
 */
router.get('/pop/:specId', async (req, res) => {
  const specId = Number(req.params.specId);
  const startTime = Date.now();

  if (!Number.isFinite(specId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid specId',
    });
  }

  try {
    const cacheKey = `psa:pop:${specId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        ...cached,
        meta: {
          ...cached.meta,
          cached: true,
          responseTime: `${Date.now() - startTime}ms`,
        },
      });
    }

    const pop = await fetchPSASpecPopulation(specId);

    const response = {
      specId: pop?.SpecID ?? specId,
      description: pop?.Description ?? null,
      psaPop: pop?.PSAPop ?? null,
      meta: {
        fetchedAt: new Date().toISOString(),
        cached: false,
        responseTime: `${Date.now() - startTime}ms`,
      },
    };

    cache.set(cacheKey, response);
    return res.json({ success: true, ...response });
  } catch (error) {
    console.error('PSA population lookup error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch PSA population data',
    });
  }
});

/**
 * GET /api/psa-lookup/:certNumber
 * Fetch PSA cert data and eBay market data
 */
router.get('/:certNumber', async (req, res) => {
  const { certNumber } = req.params;
  const startTime = Date.now();

  try {
    // Validate cert number format
    if (!isPSACertNumber(certNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PSA cert number. Must be 7-9 digits.',
      });
    }

    // Check cache first (by cert number for initial lookup)
    const cacheKey = `psa:${certNumber}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        ...cached,
        meta: {
          ...cached.meta,
          cached: true,
          responseTime: `${Date.now() - startTime}ms`,
        },
      });
    }

    // Fetch PSA cert data
    console.log(`Fetching PSA cert: ${certNumber}`);
    const psaData = await fetchPSACert(certNumber);

    if (!psaData) {
      return res.status(404).json({
        success: false,
        error: 'PSA certification not found',
      });
    }

    // Use PSA image directly - let frontend handle errors
    let imageSource = psaData.imageUrl ? 'psa' : 'placeholder';
    let imageUrl = psaData.imageUrl || null;

    // Build card object for eBay search
    const card = {
      name: psaData.name,
      set: psaData.set,
      number: psaData.number,
      grade: psaData.grade,
    };

    // Fetch eBay market data
    console.log(`Fetching eBay market data for: ${JSON.stringify(card)}`);
    let marketData = { sold: [], active: [], auctions: [], meta: {} };
    let ebayErrorMessage = null;
    
    try {
      marketData = await fetchMarketData(card);
    } catch (ebayError) {
      console.error('eBay fetch error:', ebayError.message);
      ebayErrorMessage = ebayError.message;
      // Continue with partial data - PSA data is still valuable
    }

    // Score all listings
    const scoredSold = scoreListings(marketData.sold, card);
    const scoredActive = scoreListings(marketData.active, card);
    const scoredAuctions = scoreListings(marketData.auctions, card);

    // If no PSA image, try to get from highest confidence eBay listing
    if (imageSource === 'placeholder') {
      const allListings = [...scoredSold, ...scoredActive, ...scoredAuctions];
      const bestListing = getHighestConfidenceListing(allListings);
      if (bestListing?.thumbnail) {
        imageUrl = bestListing.thumbnail;
        imageSource = 'ebay';
      }
    }

    // Build response
    const response = {
      psa: {
        cert: psaData.cert,
        specId: psaData.specId,
        name: psaData.name,
        set: psaData.set,
        number: psaData.number,
        grade: psaData.grade,
        year: psaData.year,
        category: psaData.category,
        population: psaData.population || null,
        imageUrl,
        imageSource,
      },
      sold: scoredSold.map(item => ({
        title: item.title,
        price: item.price,
        currency: item.currency,
        date: item.date,
        url: item.url,
        thumbnail: item.thumbnail,
        confidence: item.confidence,
        confidenceCategory: item.confidenceCategory,
      })),
      active: scoredActive.map(item => ({
        title: item.title,
        price: item.price,
        currency: item.currency,
        url: item.url,
        thumbnail: item.thumbnail,
        confidence: item.confidence,
        confidenceCategory: item.confidenceCategory,
      })),
      auctions: scoredAuctions.map(item => ({
        title: item.title,
        currentBid: item.currentBid,
        currency: item.currency,
        endsIn: item.endsIn,
        url: item.url,
        thumbnail: item.thumbnail,
        confidence: item.confidence,
        confidenceCategory: item.confidenceCategory,
      })),
      meta: {
        soldCount: scoredSold.length,
        activeCount: scoredActive.length,
        auctionsCount: scoredAuctions.length,
        fetchedAt: new Date().toISOString(),
        cached: false,
        responseTime: `${Date.now() - startTime}ms`,
        ebayError: ebayErrorMessage,
      },
    };

    // Cache the response (12 hours)
    cache.set(cacheKey, response);

    // Also cache by card signature for future lookups
    const cardSignature = cache.generateCacheKey(card);
    if (cardSignature && cardSignature !== '|||') {
      cache.set(`card:${cardSignature}`, response);
    }

    res.json({ success: true, ...response });

  } catch (error) {
    console.error('PSA lookup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch PSA data',
    });
  }
});

/**
 * GET /api/psa-lookup/validate/:certNumber
 * Quick validation if a cert number exists (no market data)
 */
router.get('/validate/:certNumber', async (req, res) => {
  const { certNumber } = req.params;

  try {
    if (!isPSACertNumber(certNumber)) {
      return res.json({ valid: false, isPSAFormat: false });
    }

    const psaData = await fetchPSACert(certNumber);
    
    res.json({
      valid: !!psaData,
      isPSAFormat: true,
      cert: psaData?.cert || null,
      name: psaData?.name || null,
      grade: psaData?.grade || null,
    });

  } catch (error) {
    res.json({ valid: false, isPSAFormat: true, error: error.message });
  }
});

/**
 * GET /api/psa-lookup/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', (req, res) => {
  res.json({
    success: true,
    ...cache.stats(),
  });
});

/**
 * POST /api/psa-lookup/cache/clear
 * Clear the cache (admin only)
 */
router.post('/cache/clear', (req, res) => {
  cache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

export default router;
