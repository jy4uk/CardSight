/**
 * Pricing Engine - Suggests a market price for inventory items.
 *
 * Raw cards: passthrough of TCGCSV market_price (NM baseline, no per-condition data exists upstream),
 * confidence based on how recently that price synced.
 *
 * Graded cards: recency-weighted average of CardLadder sales, nudged by a recent-sales trend, with
 * a confidence score. Exact card+print match is resolved via `fetchCertLookup()` — CardLadder's own
 * cached cert data (cert number -> graderId/profileId), NOT PSA's API. PSA's public cert API was
 * tried earlier and ruled out (hard 100-calls/day quota, shared app-wide); CardLadder's cert-lookup
 * endpoint has no such limit and resolves any graded cert, not just ones that have been resold.
 * Falls back to text search (name/number/variant/set heuristics below) when there's no cert on file
 * or the lookup misses, plus a price-spread check (see `priceSpreadWarning` in `suggestGradedPrice`)
 * to flag the cases that still slip through on that fallback path — e.g. a search that accidentally
 * mixes sales of two differently-priced print variants sharing the same card number.
 *
 * The recency half-life scales with how many sales CardLadder returns (a liquidity proxy: a card
 * with only 1-2 sales trades rarely, so a single recent sale shouldn't dominate the estimate the
 * way it would for a card with a full 10-sale return).
 *
 * Output is always a *suggestion* — nothing here writes to inventory. Callers decide whether to
 * show/accept it (see GET /inventory/reprice-preview).
 */

import { fetchCardLadderSales, fetchCertLookup } from './cardLadderService.js';
import * as cache from './cacheService.js';

const SALES_CACHE_TTL = 24 * 60 * 60 * 1000; // sales lists shift daily
const CERT_LOOKUP_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // cert -> profile mapping never changes

// Liquidity tiers based on how many sales CardLadder returns (capped at 10): fewer sales -> trades
// rarely -> weight older sales more heavily (longer half-life) so one recent sale doesn't dominate.
const LIQUIDITY_TIERS = [
  { name: 'VERY_LOW', max: 2, halfLifeDays: 365 },
  { name: 'LOW', max: 5, halfLifeDays: 180 },
  { name: 'MEDIUM', max: 8, halfLifeDays: 90 },
  { name: 'HIGH', max: Infinity, halfLifeDays: 45 },
];

function getLiquidityTier(saleCount) {
  return LIQUIDITY_TIERS.find(t => saleCount <= t.max) || LIQUIDITY_TIERS[LIQUIDITY_TIERS.length - 1];
}

function median(nums) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Drop sales priced wildly off the pack (mis-graded comp, error listing, etc.) before averaging
function rejectOutliers(sales) {
  const prices = sales.map(s => s.price).filter(p => p > 0);
  if (prices.length < 3) return sales;
  const med = median(prices);
  return sales.filter(s => !s.price || (s.price >= med * 0.4 && s.price <= med * 2.5));
}

// A wide max/min spread in the *raw* (pre-outlier-rejection) sample usually means the text search
// matched more than one print/parallel sharing the same name+number — e.g. a cheap base print and
// an expensive secret rare. rejectOutliers() can't fix this: it just keeps whichever cluster is
// larger, which could easily be the wrong one. Surface it instead of guessing.
function hasWidePriceSpread(rawPrices) {
  if (rawPrices.length < 4) return false;
  const med = median(rawPrices);
  if (!med) return false;
  return (Math.max(...rawPrices) / Math.max(Math.min(...rawPrices), 0.01)) > 6;
}

function weightedAverage(sales, halfLifeDays) {
  const now = Date.now();
  let weightSum = 0;
  let weightedPriceSum = 0;
  const weighted = [];

  for (const s of sales) {
    if (!s.price || s.price <= 0 || !s.rawDate) continue;
    const ageDays = Math.max(0, (now - new Date(s.rawDate).getTime()) / 86400000);
    const weight = Math.exp(-ageDays / halfLifeDays);
    weighted.push({ ...s, ageDays, weight });
    weightSum += weight;
    weightedPriceSum += weight * s.price;
  }

  return { weighted, weightedAvg: weightSum ? weightedPriceSum / weightSum : null };
}

// Compares a recent slice of sales against the rest to flag a directional trend.
// Needs >=4 priced sales; CardLadder's 10-sale cap makes anything fancier (regression) noise-chasing.
function computeTrend(weighted) {
  if (weighted.length < 4) return { direction: 'insufficient_data', pct: 0 };

  const sorted = [...weighted].sort((a, b) => a.ageDays - b.ageDays); // most recent first
  const recentN = Math.max(2, Math.ceil(sorted.length / 3));
  const recent = sorted.slice(0, recentN);
  const older = sorted.slice(recentN);
  if (!older.length) return { direction: 'insufficient_data', pct: 0 };

  const avg = arr => arr.reduce((sum, x) => sum + x.price, 0) / arr.length;
  const recentAvg = avg(recent);
  const olderAvg = avg(older);
  if (!olderAvg) return { direction: 'insufficient_data', pct: 0 };

  const pct = ((recentAvg - olderAvg) / olderAvg) * 100;
  let direction = 'stable';
  if (pct > 7) direction = 'up';
  else if (pct < -7) direction = 'down';
  return { direction, pct };
}

function scoreConfidence(sampleSize, mostRecentAgeDays, halfLifeDays, prices) {
  let score = 0;
  score += Math.min(40, sampleSize * 8); // 5+ sales maxes this out

  // "stale" is relative to how often this population tier is expected to trade
  if (mostRecentAgeDays <= halfLifeDays / 2) score += 30;
  else if (mostRecentAgeDays <= halfLifeDays) score += 15;

  const med = median(prices);
  const dispersion = med ? (Math.max(...prices) - Math.min(...prices)) / med : 1;
  if (dispersion < 0.2) score += 30;
  else if (dispersion < 0.5) score += 15;

  const confidence = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  return { score, confidence };
}

// TCGCSV product names parenthesize the print variant, e.g. "Shanks (004) (Manga)" or
// "Shanks - OP09-004 (SP) (Silver)" — pull those qualifiers out rather than using the name
// wholesale, since the non-parenthesized part can carry a stale/wrong set reference (seen in the
// wild: a product named with "OP09" whose set_name is actually "OP13").
function extractVariantQualifiers(productName) {
  if (!productName) return [];
  return [...productName.matchAll(/\(([^)]+)\)/g)]
    .map(m => m[1].trim())
    // Drop pure numbers (card numbers, already covered separately) and short SKU abbreviations
    // (e.g. "SP") — CardLadder's text search ANDs every token, so one term that's a TCG-internal
    // shorthand rather than wording actually used in sale titles can zero out all matches.
    .filter(q => q && q.length > 2 && !/^\d+$/.test(q));
}

// Resolves a cert number to its CardLadder graderId via CardLadder's own cert cache (not PSA).
// Cached for a month since this mapping never changes.
async function resolveCertProfile(certNumber, grader) {
  const cacheKey = `pricing:certlookup:${grader}:${certNumber}`;
  let profile = cache.get(cacheKey);
  if (profile === null) {
    try {
      profile = await fetchCertLookup(certNumber, grader);
      if (profile) cache.set(cacheKey, profile, CERT_LOOKUP_CACHE_TTL);
    } catch {
      profile = null;
    }
  }
  return profile;
}

export async function suggestGradedPrice(item) {
  const grader = (item.card_type || '').toLowerCase();

  let specId = null;
  if (item.cert_number) {
    const certProfile = await resolveCertProfile(item.cert_number, grader);
    specId = certProfile?.graderId ?? null;
  }

  // card_name alone (e.g. "Shanks") is too generic and pulls in unrelated, differently priced
  // prints/sets, so fold in card_number, the TCG variant qualifier, and set_name to narrow the
  // match — this is the fallback used whenever there's no specId (no cert on file, or the cert
  // lookup missed).
  const variantQualifiers = extractVariantQualifiers(item.tcg_product_name);
  const rawSearchQuery = [item.card_name, item.card_number, ...variantQualifiers, item.set_name]
    .filter(Boolean).join(' ');
  // Set names are often hyphen-delimited (e.g. "-One Piece Heroines Edition-"). A leading hyphen
  // reads as a NOT operator to CardLadder's search, silently excluding every result — strip them.
  const searchQuery = rawSearchQuery.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const salesCacheKey = `pricing:sales:${grader}:${specId || searchQuery.toLowerCase()}:${item.grade || ''}`;
  let salesResult = cache.get(salesCacheKey);
  if (salesResult === null) {
    try {
      salesResult = await fetchCardLadderSales(specId, searchQuery, item.grade, 10, grader);
      cache.set(salesCacheKey, salesResult, SALES_CACHE_TTL);
    } catch (e) {
      salesResult = { hits: [], total: 0, error: e.message };
    }
  }

  let sales = salesResult.hits || [];
  // Safety net: the CardLadder filter should already scope to this grade, but drop any mismatches.
  // CardLadder's hit.grade comes back like "g10", not "10" — strip the prefix before comparing.
  if (item.grade) {
    sales = sales.filter(s => !s.grade || String(s.grade).replace(/^g/i, '') === String(item.grade));
  }

  const priceSpreadWarning = hasWidePriceSpread(sales.map(s => s.price).filter(p => p > 0));
  sales = rejectOutliers(sales);

  const tier = getLiquidityTier(sales.length);
  const { weighted, weightedAvg } = weightedAverage(sales, tier.halfLifeDays);

  if (weightedAvg == null) {
    return {
      suggestedPrice: null,
      confidence: 'none',
      breakdown: {
        reason: salesResult.notConfigured ? 'cardladder_not_configured' : 'no_sales_data',
        sampleSize: 0,
        liquidityTier: tier.name,
        grader,
        priceSpreadWarning,
        matchType: specId ? 'cert_exact' : 'text_search',
      },
    };
  }

  const trend = computeTrend(weighted);
  // Lean toward the trend but dampen it by half, and cap the swing — protects against chasing
  // noise in a sample that's at most 10 sales.
  const cappedTrendPct = Math.max(-15, Math.min(15, trend.pct));
  const trendAdjustedPrice = trend.direction === 'insufficient_data'
    ? weightedAvg
    : weightedAvg * (1 + (cappedTrendPct / 100) * 0.5);

  const mostRecentAgeDays = Math.min(...weighted.map(w => w.ageDays));
  const { score, confidence: rawConfidence } = scoreConfidence(weighted.length, mostRecentAgeDays, tier.halfLifeDays, weighted.map(w => w.price));
  // A wide spread in the raw sample means the search likely mixed two print variants — outlier
  // rejection just kept whichever cluster was bigger, which could be the wrong one. Don't let the
  // result read as confident when that's happened.
  const confidence = priceSpreadWarning ? 'low' : rawConfidence;

  return {
    suggestedPrice: Math.round(trendAdjustedPrice * 100) / 100,
    confidence,
    confidenceScore: score,
    breakdown: {
      sampleSize: weighted.length,
      liquidityTier: tier.name,
      halfLifeDaysUsed: tier.halfLifeDays,
      trend: trend.direction,
      trendPct: Math.round(trend.pct * 10) / 10,
      mostRecentSaleDaysAgo: Math.round(mostRecentAgeDays),
      baseWeightedAvg: Math.round(weightedAvg * 100) / 100,
      grader,
      dataSource: 'cardladder',
      priceSpreadWarning,
      matchType: specId ? 'cert_exact' : 'text_search',
    },
  };
}

export function suggestRawPrice(item) {
  if (!item.tcg_market_price) {
    return { suggestedPrice: null, confidence: 'none', breakdown: { reason: 'no_tcg_match' } };
  }

  const marketPrice = parseFloat(item.tcg_market_price);
  const updatedAt = item.tcg_price_updated_at ? new Date(item.tcg_price_updated_at) : null;
  const ageHours = updatedAt ? (Date.now() - updatedAt.getTime()) / 3600000 : null;
  const confidence = ageHours == null ? 'low' : ageHours <= 48 ? 'high' : ageHours <= 168 ? 'medium' : 'low';

  return {
    suggestedPrice: Math.round(marketPrice * 100) / 100,
    confidence,
    breakdown: {
      dataSource: 'tcgcsv',
      priceAgeHours: ageHours != null ? Math.round(ageHours) : null,
    },
  };
}

export async function suggestPrice(item) {
  const isGraded = item.card_type && item.card_type !== 'raw' && item.card_type !== 'sealed';
  if (isGraded) return suggestGradedPrice(item);
  return suggestRawPrice(item);
}
