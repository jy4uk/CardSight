import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Discord webhook function
async function sendDiscordWebhook(feedbackData) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1468455119233220752/kRPFzqOrSAe4uiI3-JCE8JuQcDVRs9WLsS-tG-TufRK975H4fs49fW7he9O3viN7MDff';
  
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL not configured, skipping Discord notification');
    throw new Error('Discord webhook not configured');
  }

  // Map category to color
  const categoryColors = {
    bug: 0xef4444, // red
    feature_request: 0x3b82f6, // blue
    data_error: 0xf59e0b, // amber
    other: 0x6b7280 // gray
  };

  // Format category for display
  const categoryLabels = {
    bug: '🐛 Bug Report',
    feature_request: '✨ Feature Request',
    data_error: '📝 Data Error',
    other: '💬 Other'
  };

  // Parse browser info for better formatting
  const browserLines = feedbackData.browserInfo?.split('\n') || [];
  const browserInfoFormatted = browserLines.length > 0 
    ? '```\n' + browserLines.join('\n') + '\n```'
    : 'N/A';

  const embed = {
    title: categoryLabels[feedbackData.category] || '💬 Feedback',
    description: feedbackData.description,
    color: categoryColors[feedbackData.category] || 0x6b7280,
    fields: [
      {
        name: '👤 User',
        value: feedbackData.username || 'Unknown',
        inline: true
      },
      {
        name: '📧 Email',
        value: feedbackData.email || 'N/A',
        inline: true
      },
      {
        name: '🌐 Page URL',
        value: feedbackData.url || 'N/A',
        inline: false
      },
      {
        name: '💻 Device & Browser Information',
        value: browserInfoFormatted,
        inline: false
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'CardSight Beta Feedback'
    }
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      embeds: [embed]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Discord webhook failed:', response.status, errorText);
    throw new Error('Failed to send Discord notification');
  }
}

// POST /api/feedback - Submit feedback (authenticated users only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category, description, url, browserInfo } = req.body;

    // Validation
    if (!category || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category and description are required' 
      });
    }

    const validCategories = ['bug', 'feature_request', 'data_error', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid category' 
      });
    }

    if (description.length > 5000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Description is too long (max 5000 characters)' 
      });
    }

    // Get authenticated user info
    const username = req.user.username;
    const email = req.user.email;

    // Prepare feedback data for Discord
    const feedbackData = {
      category,
      description,
      url,
      browserInfo,
      username,
      email
    };

    // Send Discord notification
    await sendDiscordWebhook(feedbackData);

    res.json({ 
      success: true, 
      message: 'Thank you! Your feedback helps build CardSight'
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to submit feedback' 
    });
  }
});

export default router;
