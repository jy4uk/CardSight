import { Resend } from 'resend';

// Lazy initialization to prevent crash when API key is not set
let resend = null;
const getResendClient = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

export class EmailService {
  /**
   * Send password reset email
   * @param {string} to - Recipient email address
   * @param {string} resetUrl - Password reset URL with token
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendPasswordResetEmail(to, resetUrl) {
    try {
      // Validate API key is configured
      if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY not configured');
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await getResendClient().emails.send({
        from: process.env.EMAIL_FROM || 'CardSight <noreply@cardsight.app>',
        to: [to],
        subject: 'Reset Your CardSight Password',
        html: this.getPasswordResetEmailTemplate(resetUrl)
      });

      if (error) {
        console.error('❌ Resend email error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Password reset email sent to ${to} (ID: ${data.id})`);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get HTML template for password reset email
   * @param {string} resetUrl - Password reset URL
   * @returns {string} HTML email template
   */
  getPasswordResetEmailTemplate(resetUrl) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          h1 {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 20px;
          }
          p {
            color: #4b5563;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .code {
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎴 CardSight</div>
          </div>
          
          <h1>Reset Your Password</h1>
          
          <p>You recently requested to reset your password for your CardSight account. Click the button below to reset it:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <div class="warning">
            <strong>⏰ This link will expire in 1 hour</strong> for security reasons.
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
          
          <div class="footer">
            <p><strong>Didn't request this?</strong></p>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            <p style="margin-top: 20px;">
              <strong>CardSight</strong><br>
              Inventory Management for Trading Cards
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send test email (for debugging)
   * @param {string} to - Recipient email address
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendTestEmail(to) {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY not configured');
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await getResendClient().emails.send({
        from: process.env.EMAIL_FROM || 'CardSight <noreply@cardsight.app>',
        to: [to],
        subject: 'CardSight Email Service Test',
        html: '<h1>Test Email</h1><p>Your email service is working correctly!</p>'
      });

      if (error) {
        console.error('❌ Resend test email error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Test email sent to ${to} (ID: ${data.id})`);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('❌ Failed to send test email:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();
