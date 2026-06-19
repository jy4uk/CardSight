import express from 'express';
import { query } from '../services/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { getToken, invalidateTokenCache } from '../services/cardLadderTokenManager.js';

const router = express.Router();

const FIREBASE_SIGN_IN_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
const FIREBASE_TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';

async function storeRefreshToken(refreshToken) {
  await query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('cardladder_refresh_token', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [refreshToken]
  );
  invalidateTokenCache();
}

/**
 * GET /api/cardladder/status
 * Returns whether a CardLadder refresh token is stored and currently valid.
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      "SELECT updated_at FROM app_settings WHERE key = 'cardladder_refresh_token'"
    );
    const hasStoredToken = result.rows.length > 0 || !!process.env.CARDLADDER_REFRESH_TOKEN;

    let valid = false;
    if (hasStoredToken) {
      try {
        const token = await getToken();
        valid = !!token;
      } catch {
        valid = false;
      }
    }

    res.json({
      success: true,
      connected: hasStoredToken,
      valid,
      source: process.env.CARDLADDER_REFRESH_TOKEN ? 'env' : (result.rows.length > 0 ? 'db' : null),
      connectedAt: result.rows[0]?.updated_at || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/cardladder/connect
 * Authenticate with CardLadder using email + password (if account uses email/password auth).
 * Stores the resulting Firebase refresh token in the DB.
 */
router.post('/connect', authenticateToken, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  const apiKey = process.env.CARDLADDER_FIREBASE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'CARDLADDER_FIREBASE_API_KEY not configured' });
  }

  try {
    const signInRes = await fetch(`${FIREBASE_SIGN_IN_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    const data = await signInRes.json();

    if (!signInRes.ok) {
      const msg = data.error?.message || 'Authentication failed';
      // INVALID_LOGIN_CREDENTIALS covers both wrong password and Google-only accounts
      const hint = msg.includes('INVALID_LOGIN_CREDENTIALS')
        ? 'Invalid credentials. If you signed up via Google, use the manual token option instead.'
        : msg;
      return res.status(401).json({ success: false, error: hint });
    }

    await storeRefreshToken(data.refreshToken);
    res.json({ success: true });
  } catch (err) {
    console.error('[CardLadder] connect error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/cardladder/connect/token
 * Store a Firebase refresh token directly (for accounts that use Google OAuth).
 * The token is validated before saving by attempting to exchange it for an ID token.
 */
router.post('/connect/token', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'refreshToken is required' });
    }

    const apiKey = process.env.CARDLADDER_FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'CARDLADDER_FIREBASE_API_KEY not configured' });
    }

    // Validate by trying to exchange it for an ID token
    const verifyRes = await fetch(`${FIREBASE_TOKEN_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
    });

    if (!verifyRes.ok) {
      const errData = await verifyRes.json().catch(() => ({}));
      console.error('[CardLadder] Token validation failed:', verifyRes.status, errData);
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    await storeRefreshToken(refreshToken);
    res.json({ success: true });
  } catch (err) {
    console.error('[CardLadder] connect/token error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/cardladder/connect
 * Remove the stored CardLadder refresh token.
 */
router.delete('/connect', authenticateToken, async (req, res) => {
  try {
    await query("DELETE FROM app_settings WHERE key = 'cardladder_refresh_token'");
    invalidateTokenCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
