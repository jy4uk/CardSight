import express from 'express';

const router = express.Router();

// Simple password-based auth - set your admin password in environment variables
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cardpilot2024';

router.post('/login', (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    if (password === ADMIN_PASSWORD) {
      return res.json({ 
        success: true, 
        role: 'admin',
        message: 'Login successful' 
      });
    }

    return res.status(401).json({ success: false, error: 'Invalid password' });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

// Verify session (optional endpoint for checking auth status)
router.get('/verify', (req, res) => {
  res.json({ success: true, message: 'Auth endpoint active' });
});

export default router;
