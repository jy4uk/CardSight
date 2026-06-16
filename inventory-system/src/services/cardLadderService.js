/**
 * CardLadder Service - Fetches PSA card sales history from CardLadder's search API
 *
 * Auth is handled automatically by cardLadderTokenManager — no manual token refresh needed.
 */

import { getToken, isConfigured } from './cardLadderTokenManager.js';

const CARDLADDER_SEARCH_BASE = 'https://search-zzvl7ri3bq-uc.a.run.app/search';
const CARDLADDER_CERT_LOOKUP_URL = 'https://us-central1-cardladder-71d53.cloudfunctions.net/httpcertlookup';

function normalizeHit(hit) {
  const price =
    hit.price ?? hit.salePrice ?? hit.sale_price ?? hit.soldPrice ?? null;

  const rawDate =
    hit.date ?? hit.saleDate ?? hit.sale_date ?? hit.soldDate ?? hit.createdAt ?? null;

  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const title =
    hit.title ?? hit.cardName ?? hit.card_name ?? hit.name ?? null;

  const setName =
    hit.set ?? hit.setName ?? hit.set_name ?? hit.series ?? null;

  const grade =
    hit.grade ?? hit.cardGrade ?? hit.card_grade ?? null;

  const certNumber =
    hit.certNumber ?? hit.cert_number ?? hit.certId ?? null;

  const imageUrl =
    hit.image ?? hit.imageUrl ?? hit.image_url ?? hit.thumbnail ?? null;

  const cardLadderUrl =
    hit.url ?? hit.cardLadderUrl ?? null;

  return {
    price: typeof price === 'number' ? price : (price ? parseFloat(price) : null),
    date: formattedDate,
    rawDate,
    title,
    setName,
    grade,
    certNumber,
    imageUrl,
    cardLadderUrl,
  };
}

/**
 * Fetch recent graded-card sales from CardLadder.
 *
 * Primary path: filter by `profileId:{grader}-{graderId}` — exact card+print match, zero variance.
 * graderId comes from `fetchCertLookup()` (CardLadder's own cached cert data), not PSA's API.
 * Fallback: full-text search by searchText + grade, scoped to the requested grader — used when
 * there's no cert on file or the cert lookup misses. Callers should pass a searchText specific
 * enough to disambiguate (name + card number + set name), since card name alone is often shared
 * by many different prints/sets.
 *
 * @param {string|number} specId  - graderId from fetchCertLookup(), exact match
 * @param {string} searchText     - Search text for the text-search fallback
 * @param {string} grade          - Numeric grade (e.g. "10")
 * @param {number} limit
 * @param {string} grader         - 'psa' | 'bgs' | 'cgc' (default 'psa')
 */
export async function fetchCardLadderSales(specId, searchText, grade, limit = 10, grader = 'psa') {
  if (!isConfigured()) {
    return { hits: [], total: 0, notConfigured: true };
  }

  const token = await getToken();
  const graderLower = (grader || 'psa').toLowerCase();

  let query = '';
  let filters = '';

  if (specId) {
    // Exact card match via CardLadder profileId ({grader}-{graderId}), scoped to grade
    filters = [`grader:${graderLower}`, `profileId:${graderLower}-${specId}`, grade ? `grade:g${grade}` : '']
      .filter(Boolean).join('|');
  } else {
    // Fallback: text search scoped to grader + grade
    query = searchText || '';
    filters = grade ? `grader:${graderLower}|grade:g${grade}` : `grader:${graderLower}`;
  }

  const params = new URLSearchParams({
    index: 'salesarchive',
    query,
    page: '0',
    limit: String(limit),
    filters,
    sort: 'date',
    direction: 'desc',
  });

  const response = await fetch(`${CARDLADDER_SEARCH_BASE}?${params}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      Origin: 'https://app.cardladder.com',
      Referer: 'https://app.cardladder.com/',
    },
  });

  if (!response.ok) {
    throw new Error(`CardLadder API error: ${response.status}`);
  }

  const data = await response.json();

  const rawHits = data.hits ?? data.results ?? data.data ?? data.items ?? [];
  const total = data.total ?? data.nbHits ?? data.count ?? data.totalHits ?? rawHits.length;
  const hits = Array.isArray(rawHits) ? rawHits.map(normalizeHit) : [];

  return { hits, total };
}

/**
 * Resolve a cert number to its CardLadder graderId/profileId via CardLadder's own cached cert
 * data (a Firebase callable function, hence the {data: ...} request / {result: ...} response
 * envelope) — no PSA API call involved. Works for any cert CardLadder has graded-card data for,
 * not just ones that have been resold (unlike a salesarchive cert/slabSerial filter, which only
 * matches certs that show up in actual past sales).
 *
 * @param {string} certNumber
 * @param {string} grader - 'psa' | 'bgs' | 'cgc' (default 'psa')
 * @returns {Promise<Object|null>} { cert, grader, grade, graderId, profileId, hasQualifier, qualifierType, label, ... } or null if not found
 */
export async function fetchCertLookup(certNumber, grader = 'psa') {
  if (!isConfigured()) return null;

  const token = await getToken();

  const response = await fetch(CARDLADDER_CERT_LOOKUP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Origin: 'https://app.cardladder.com',
      Referer: 'https://app.cardladder.com/',
    },
    body: JSON.stringify({ data: { cert: certNumber, grader: (grader || 'psa').toLowerCase(), includeProfile: true } }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.result ?? null;
}
