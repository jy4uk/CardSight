import express from 'express';
import { fetchCertLookup } from '../services/cardLadderService.js';
import { fetchMarketData } from '../services/ebayService.js';
import { scoreListings, getHighestConfidenceListing } from '../services/confidenceScoring.js';
import * as cache from '../services/cacheService.js';
import { authenticateToken } from '../middleware/auth.js';
import { getTokenForUser } from '../services/cardLadderTokenManager.js';

const router = express.Router();
router.use(authenticateToken);

function isPSACertNumber(value) {
  if (!value || typeof value !== 'string') return false;
  return /^\d{7,9}$/.test(value.trim());
}

// CardLadder uses "beckett" as the profile key for BGS cards
function graderProfileKey(grader) {
  return (grader || 'psa').toLowerCase() === 'bgs' ? 'beckett' : (grader || 'psa').toLowerCase();
}

// Map CardLadder cert lookup result to the psa-shaped response the frontend expects.
// Keeps the same field names so all callers (PSAMarketData, usePSALookup, etc.) are unchanged.
function normalizeCertData(certResult, certNumber) {
  if (!certResult) return null;

  const gradeRaw = certResult.grade || '';
  const gradeNumeric = gradeRaw.replace(/^g/, '');
  const grader = certResult.grader || 'psa';
  const profileKey = graderProfileKey(grader);
  const profile = certResult.profile || {};
  const graderProfile = profile.graders?.[profileKey] || {};
  const gradeBreakdown = graderProfile.grades || null;
  const qualifierGrades = graderProfile.qualifierGrades || null;

  // Count slabs graded higher than this cert's grade (matches PSA's PopulationHigher)
  let higher = null;
  if (gradeBreakdown && gradeNumeric) {
    const gradeNum = parseFloat(gradeNumeric);
    higher = Object.entries(gradeBreakdown)
      .filter(([key]) => {
        const n = parseFloat(key.replace(/^g/, '').replace('_', '.'));
        return Number.isFinite(n) && n > gradeNum;
      })
      .reduce((sum, [, count]) => sum + (count || 0), 0);
  }

  return {
    cert: certResult.cert || certNumber,
    specId: certResult.graderId ? Number(certResult.graderId) : null,
    profileId: certResult.profileId || null,
    name: profile.subject || null,
    set: profile.set || null,
    number: profile.number || null,
    variation: profile.variation || null,
    grade: gradeNumeric,
    year: profile.year || null,
    category: profile.category || null,
    hasQualifier: certResult.hasQualifier || false,
    qualifierType: certResult.qualifierType || null,
    // population.total = count at this specific grade — matches PSA's TotalPopulation semantics
    population: gradeBreakdown ? {
      total: certResult.population || null,
      grandTotal: profile.totalPopulation || null,
      higher,
      gradeBreakdown,
      qualifierGrades,
      gemRate: graderProfile.gemRate || null,
      totalGems: graderProfile.totalGems || null,
    } : null,
    imageUrl: null,
    imageSource: null,
    dataSource: 'cardladder',
  };
}

/**
 * GET /api/psa-lookup/:certNumber?grader=psa
 * Resolve cert data via CardLadder's cert cache (no PSA API call).
 * Returns the same response shape as before so all frontend consumers are unchanged.
 */
router.get('/:certNumber', async (req, res) => {
  const { certNumber } = req.params;
  const grader = (req.query.grader || 'psa').toLowerCase();
  const startTime = Date.now();

  try {
    if (!isPSACertNumber(certNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cert number format.',
      });
    }

    const token = await getTokenForUser(req.user.userId);
    if (!token) {
      return res.status(403).json({
        success: false,
        error: 'CardLadder not connected. Connect your CardLadder account in Account Settings → Integrations.',
        code: 'cardladder_not_connected',
      });
    }

    const cacheKey = `certlookup:${grader}:${certNumber}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        ...cached,
        meta: { ...cached.meta, cached: true, responseTime: `${Date.now() - startTime}ms` },
      });
    }

    const certResult = await fetchCertLookup(certNumber, grader, token);

    if (!certResult) {
      return res.status(404).json({
        success: false,
        error: 'Cert not found in CardLadder',
      });
    }

    const psa = normalizeCertData(certResult, certNumber);

    const card = { name: psa.name, set: psa.set, number: psa.number, grade: psa.grade };

    let marketData = { sold: [], active: [], auctions: [], meta: {} };
    let ebayErrorMessage = null;
    try {
      marketData = await fetchMarketData(card);
    } catch (ebayError) {
      console.error('eBay fetch error:', ebayError.message);
      ebayErrorMessage = ebayError.message;
    }

    const scoredSold = scoreListings(marketData.sold, card);
    const scoredActive = scoreListings(marketData.active, card);
    const scoredAuctions = scoreListings(marketData.auctions, card);

    if (!psa.imageUrl) {
      const bestListing = getHighestConfidenceListing([...scoredSold, ...scoredActive, ...scoredAuctions]);
      if (bestListing?.thumbnail) {
        psa.imageUrl = bestListing.thumbnail;
        psa.imageSource = 'ebay';
      }
    }

    const response = {
      psa,
      sold: scoredSold.map(item => ({
        title: item.title, price: item.price, currency: item.currency,
        date: item.date, url: item.url, thumbnail: item.thumbnail,
        confidence: item.confidence, confidenceCategory: item.confidenceCategory,
      })),
      active: scoredActive.map(item => ({
        title: item.title, price: item.price, currency: item.currency,
        url: item.url, thumbnail: item.thumbnail,
        confidence: item.confidence, confidenceCategory: item.confidenceCategory,
      })),
      auctions: scoredAuctions.map(item => ({
        title: item.title, currentBid: item.currentBid, currency: item.currency,
        endsIn: item.endsIn, url: item.url, thumbnail: item.thumbnail,
        confidence: item.confidence, confidenceCategory: item.confidenceCategory,
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

    cache.set(cacheKey, response);
    res.json({ success: true, ...response });

  } catch (error) {
    console.error('Cert lookup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch cert data',
    });
  }
});

router.get('/cache/stats', (req, res) => {
  res.json({ success: true, ...cache.stats() });
});

router.post('/cache/clear', (req, res) => {
  cache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

export default router;
