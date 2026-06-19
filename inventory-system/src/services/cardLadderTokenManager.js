/**
 * CardLadder Token Manager
 *
 * CardLadder uses Firebase Auth (project: cardladder-71d53).
 * Firebase ID tokens expire every ~1 hour, but refresh tokens are permanent.
 *
 * Refresh token source priority:
 *   1. CARDLADDER_REFRESH_TOKEN env var (legacy, still works)
 *   2. app_settings DB table (set via /api/cardladder/connect — preferred for prod)
 *
 * Only CARDLADDER_FIREBASE_API_KEY is required in env — the refresh token can
 * live entirely in the DB after initial setup via the Integrations settings page.
 */

import { query } from './db.js';

const FIREBASE_TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';

// In-memory caches
let cachedIdToken = null;
let tokenExpiresAt = 0;
let cachedRefreshToken = null;
let refreshTokenLoadedAt = 0;
const REFRESH_TOKEN_CACHE_MS = 5 * 60 * 1000; // re-check DB at most every 5 min

// Resolves the refresh token from env → DB (in that order)
async function getRefreshToken() {
  if (process.env.CARDLADDER_REFRESH_TOKEN) return process.env.CARDLADDER_REFRESH_TOKEN;

  const now = Date.now();
  if (cachedRefreshToken && now - refreshTokenLoadedAt < REFRESH_TOKEN_CACHE_MS) {
    return cachedRefreshToken;
  }

  try {
    const result = await query(
      "SELECT value FROM app_settings WHERE key = 'cardladder_refresh_token'"
    );
    cachedRefreshToken = result.rows?.[0]?.value || null;
    refreshTokenLoadedAt = now;
    return cachedRefreshToken;
  } catch {
    return null;
  }
}

async function refreshIdToken(refreshToken) {
  const apiKey = process.env.CARDLADDER_FIREBASE_API_KEY;

  const response = await fetch(`${FIREBASE_TOKEN_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firebase token refresh failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const expiresInMs = (parseInt(data.expires_in, 10) || 3600) * 1000;

  cachedIdToken = data.id_token;
  tokenExpiresAt = Date.now() + expiresInMs - 5 * 60 * 1000;

  console.log(`[CardLadder] Token refreshed, valid for ${Math.round(expiresInMs / 60000)} min`);
  return cachedIdToken;
}

// Call this after storing a new refresh token in the DB so the next getToken() picks it up
export function invalidateTokenCache() {
  cachedIdToken = null;
  tokenExpiresAt = 0;
  cachedRefreshToken = null;
  refreshTokenLoadedAt = 0;
}

export function isConfigured() {
  // Only the API key needs to be in env — refresh token can come from DB
  return !!process.env.CARDLADDER_FIREBASE_API_KEY;
}

export async function getToken() {
  if (!process.env.CARDLADDER_FIREBASE_API_KEY) return null;

  if (cachedIdToken && Date.now() < tokenExpiresAt) return cachedIdToken;

  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  return refreshIdToken(refreshToken);
}
