/**
 * CardLadder Token Manager
 *
 * CardLadder uses Firebase Auth (project: cardladder-71d53).
 * Firebase ID tokens expire every ~1 hour; refresh tokens are permanent.
 *
 * Tokens are stored per-user in the user_integrations table.
 * Each user connects their own CardLadder Pro account via the Integrations
 * settings page; without a connection, pricing features are unavailable.
 *
 * CARDLADDER_FIREBASE_API_KEY must be set in env — it's the Firebase project
 * identifier used to exchange refresh tokens for ID tokens.
 */

import { query } from './db.js';

const FIREBASE_TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';
const REFRESH_TOKEN_CACHE_MS = 5 * 60 * 1000;

// Per-user caches: userId -> { idToken, expiresAt } / { token, loadedAt }
const idTokenCache = new Map();
const refreshTokenCache = new Map();

async function getRefreshTokenForUser(userId) {
  const cached = refreshTokenCache.get(userId);
  if (cached && Date.now() - cached.loadedAt < REFRESH_TOKEN_CACHE_MS) {
    return cached.token;
  }

  try {
    const result = await query(
      "SELECT refresh_token FROM user_integrations WHERE user_id = $1 AND provider = 'cardladder'",
      [userId]
    );
    const token = result[0]?.refresh_token || null;
    refreshTokenCache.set(userId, { token, loadedAt: Date.now() });
    return token;
  } catch {
    return null;
  }
}

async function refreshIdTokenForUser(userId, refreshToken) {
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
  const idToken = data.id_token;

  idTokenCache.set(userId, { idToken, expiresAt: Date.now() + expiresInMs - 5 * 60 * 1000 });
  return idToken;
}

export function invalidateUserTokenCache(userId) {
  idTokenCache.delete(userId);
  refreshTokenCache.delete(userId);
}

export function isConfigured() {
  return !!process.env.CARDLADDER_FIREBASE_API_KEY;
}

/**
 * Returns a valid Firebase ID token for the given user, or null if they haven't
 * connected their CardLadder account.
 */
export async function getTokenForUser(userId) {
  if (!process.env.CARDLADDER_FIREBASE_API_KEY) return null;

  const cached = idTokenCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.idToken;

  const refreshToken = await getRefreshTokenForUser(userId);
  if (!refreshToken) return null;

  try {
    return await refreshIdTokenForUser(userId, refreshToken);
  } catch (err) {
    console.error(`[CardLadder] Token refresh failed for user ${userId}:`, err.message);
    return null;
  }
}
