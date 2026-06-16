import express from 'express';
import { fetchCardLadderSales } from '../services/cardLadderService.js';
import * as cache from '../services/cacheService.js';

const router = express.Router();

/**
 * GET /api/card-ladder/search?certNumber=...&cardName=...&grade=...
 * Returns recent PSA sales from CardLadder for a given card name + grade.
 * certNumber is used only as a cache key.
 */
router.get('/search', async (req, res) => {
  const { certNumber, specId, cardName, grade } = req.query;
  const startTime = Date.now();

  if (!cardName) {
    return res.status(400).json({ success: false, error: 'cardName is required' });
  }

  const cacheKey = certNumber ? `cardladder:${certNumber}` : `cardladder:name:${cardName}:${grade}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({
      success: true,
      ...cached,
      meta: { ...cached.meta, cached: true, responseTime: `${Date.now() - startTime}ms` },
    });
  }

  try {
    const result = await fetchCardLadderSales(specId, cardName, grade, 10);

    if (result.notConfigured) {
      return res.json({ success: false, notConfigured: true, sales: [] });
    }

    const response = {
      sales: result.hits,
      totalSales: result.total,
      certNumber: certNumber || null,
      meta: {
        fetchedAt: new Date().toISOString(),
        cached: false,
        responseTime: `${Date.now() - startTime}ms`,
      },
    };

    cache.set(cacheKey, response, 2 * 60 * 60 * 1000);

    return res.json({ success: true, ...response });
  } catch (error) {
    console.error('CardLadder lookup error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch CardLadder data',
      sales: [],
    });
  }
});

export default router;
