/**
 * CardLadder Token Manager
 *
 * CardLadder uses Firebase Auth (project: cardladder-71d53).
 * Firebase ID tokens expire every ~1 hour, but refresh tokens are permanent.
 *
 * One-time setup (stored in env):
 *   CARDLADDER_FIREBASE_API_KEY  — public Firebase web API key
 *   CARDLADDER_REFRESH_TOKEN     — long-lived Firebase refresh token
 *
 * How to get these (one time):
 *   1. Log into app.cardladder.com in Chrome
 *   2. DevTools → Application → Local Storage → https://app.cardladder.com
 *   3. Find the key starting with "firebase:authUser:" — the suffix IS the API key
 *      e.g. "firebase:authUser:AIzaSyABC123..." → API key = "AIzaSyABC123..."
 *   4. Click that key → in the JSON value, find stsTokenManager.refreshToken
 *   5. Set both values in .env and you're done forever (until password change).
 */

const FIREBASE_TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';

// In-memory token cache — shared across all requests in this process
let cachedIdToken = null;
let tokenExpiresAt = 0; // Unix ms

function isConfigured() {
  return !!(process.env.CARDLADDER_FIREBASE_API_KEY && process.env.CARDLADDER_REFRESH_TOKEN);
}

/**
 * Exchange a Firebase refresh token for a fresh ID token.
 */
async function refreshIdToken() {
  const apiKey = process.env.CARDLADDER_FIREBASE_API_KEY;
  const refreshToken = process.env.CARDLADDER_REFRESH_TOKEN;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(`${FIREBASE_TOKEN_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firebase token refresh failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  // data.id_token is the new JWT; data.expires_in is seconds until expiry
  const expiresInMs = (parseInt(data.expires_in, 10) || 3600) * 1000;

  cachedIdToken = data.id_token;
  // Refresh 5 minutes before actual expiry to avoid edge cases
  tokenExpiresAt = Date.now() + expiresInMs - 5 * 60 * 1000;

  console.log(`[CardLadder] Token refreshed, valid for ${Math.round(expiresInMs / 60000)} min`);
  return cachedIdToken;
}

/**
 * Get a valid CardLadder Firebase ID token, refreshing if needed.
 * Returns null if not configured.
 */
export async function getToken() {
  if (!isConfigured()) return null;

  if (cachedIdToken && Date.now() < tokenExpiresAt) {
    return cachedIdToken;
  }

  return refreshIdToken();
}

export { isConfigured };
