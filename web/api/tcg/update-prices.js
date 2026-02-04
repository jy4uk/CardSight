/**
 * Vercel Serverless Function for Daily TCG Price Updates
 * Called by Vercel Cron at midnight UTC daily
 * 
 * This function proxies the request to the Railway backend
 */

export const config = {
  maxDuration: 300, // 5 minutes max for price updates
};

export default async function handler(req, res) {
  // Verify this is a cron request from Vercel
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  // Vercel cron jobs send Authorization: Bearer <CRON_SECRET>
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[Cron] Unauthorized request attempt');
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Only allow POST requests (or GET from Vercel cron)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('[Cron] Starting daily price update...');
    
    // Call the Railway backend endpoint
    const backendUrl = process.env.BACKEND_URL || 'https://cardsight-production.up.railway.app';
    const cronApiKey = process.env.CRON_API_KEY;
    
    const response = await fetch(`${backendUrl}/api/tcg/update-prices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': cronApiKey || '',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[Cron] Backend error:', data);
      return res.status(response.status).json(data);
    }

    console.log('[Cron] Price update complete:', data);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('[Cron] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update prices' 
    });
  }
}
