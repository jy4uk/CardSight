import express from 'express';
import { query } from '../services/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { getTokenForUser, invalidateUserTokenCache, isConfigured } from '../services/cardLadderTokenManager.js';

const router = express.Router();

const FIREBASE_SIGN_IN_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
const FIREBASE_TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';

async function storeRefreshToken(userId, refreshToken) {
  await query(
    `INSERT INTO user_integrations (user_id, provider, refresh_token, updated_at)
     VALUES ($1, 'cardladder', $2, NOW())
     ON CONFLICT (user_id, provider) DO UPDATE SET refresh_token = EXCLUDED.refresh_token, updated_at = NOW()`,
    [userId, refreshToken]
  );
  invalidateUserTokenCache(userId);
}

/**
 * GET /api/cardladder/status
 * Returns whether the current user has a connected CardLadder account.
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await query(
      "SELECT updated_at FROM user_integrations WHERE user_id = $1 AND provider = 'cardladder'",
      [userId]
    );
    const connected = result.length > 0;

    let valid = false;
    if (connected) {
      try {
        const token = await getTokenForUser(userId);
        valid = !!token;
      } catch {
        valid = false;
      }
    }

    res.json({
      success: true,
      connected,
      valid,
      connectedAt: result[0]?.updated_at || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/cardladder/connect
 * Authenticate with CardLadder using email + password.
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
      const hint = msg.includes('INVALID_LOGIN_CREDENTIALS')
        ? 'Invalid credentials. If you signed up via Google, use the Google sign-in option instead.'
        : msg;
      return res.status(401).json({ success: false, error: hint });
    }

    await storeRefreshToken(req.user.userId, data.refreshToken);
    res.json({ success: true });
  } catch (err) {
    console.error('[CardLadder] connect error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/cardladder/connect/token
 * Store a Firebase refresh token (used by the Google OAuth flow on the frontend).
 * The token is validated before saving.
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

    await storeRefreshToken(req.user.userId, refreshToken);
    res.json({ success: true });
  } catch (err) {
    console.error('[CardLadder] connect/token error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/cardladder/connect
 * Remove the current user's CardLadder connection.
 */
router.delete('/connect', authenticateToken, async (req, res) => {
  try {
    await query(
      "DELETE FROM user_integrations WHERE user_id = $1 AND provider = 'cardladder'",
      [req.user.userId]
    );
    invalidateUserTokenCache(req.user.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
