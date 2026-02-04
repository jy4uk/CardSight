import { useState, useEffect } from 'react';
import { X, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import apiClient from '../utils/apiClient';

export default function FeedbackModal({ isOpen, onClose }) {
  const [category, setCategory] = useState('bug');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Reset form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCategory('bug');
      setDescription('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (success) {
      // Reset form on close after success
      setCategory('bug');
      setDescription('');
      setSuccess(false);
      setError('');
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Collect enriched metadata
      const url = window.location.href;
      
      // Browser and device info
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      const language = navigator.language;
      const languages = navigator.languages?.join(', ') || language;
      
      // Screen info
      const screenResolution = `${screen.width}x${screen.height}`;
      const viewportSize = `${window.innerWidth}x${window.innerHeight}`;
      const colorDepth = `${screen.colorDepth}-bit`;
      const pixelRatio = window.devicePixelRatio || 1;
      
      // Time and location
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timezoneOffset = new Date().getTimezoneOffset();
      
      // Connection info (if available)
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const connectionType = connection?.effectiveType || 'unknown';
      const downlink = connection?.downlink ? `${connection.downlink} Mbps` : 'unknown';
      
      // Device memory (if available)
      const deviceMemory = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'unknown';
      
      // Online status
      const isOnline = navigator.onLine;
      
      // Cookies enabled
      const cookiesEnabled = navigator.cookieEnabled;
      
      // Touch support
      const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Build comprehensive browser info string
      const browserInfo = [
        `User Agent: ${userAgent}`,
        `Platform: ${platform}`,
        `Language: ${languages}`,
        `Screen: ${screenResolution} (${colorDepth})`,
        `Viewport: ${viewportSize}`,
        `Pixel Ratio: ${pixelRatio}x`,
        `Timezone: ${timezone} (UTC${timezoneOffset > 0 ? '-' : '+'}${Math.abs(timezoneOffset / 60)})`,
        `Connection: ${connectionType} (${downlink})`,
        `Device Memory: ${deviceMemory}`,
        `Touch: ${touchSupport ? 'Yes' : 'No'}`,
        `Online: ${isOnline ? 'Yes' : 'No'}`,
        `Cookies: ${cookiesEnabled ? 'Enabled' : 'Disabled'}`
      ].join('\n');

      const response = await apiClient.post('/feedback', {
        category,
        description,
        url,
        browserInfo
      });

      if (response.data.success) {
        setSuccess(true);
        // Auto-close after 3 seconds
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        setError(response.data.error || 'Failed to submit feedback');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          aria-label="Close feedback modal"
        >
          <X size={24} aria-hidden="true" />
        </button>

        {success ? (
          // Success State
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-slate-100">
              Thank you!
            </h2>
            <p className="text-gray-600 dark:text-slate-400">
              Your feedback helps build CardSight
            </p>
          </div>
        ) : (
          // Form State
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <h2 id="feedback-title" className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                Send Feedback
              </h2>
            </div>

            {error && (
              <div 
                className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} aria-hidden="true" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  required
                >
                  <option value="bug">🐛 Bug Report</option>
                  <option value="feature_request">✨ Feature Request</option>
                  <option value="data_error">📝 Data Error (Card Info)</option>
                  <option value="other">💬 Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  placeholder="Tell us what's on your mind..."
                  rows={6}
                  maxLength={5000}
                  required
                  aria-required="true"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {description.length}/5000 characters
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !description.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed font-medium"
                  aria-busy={loading}
                >
                  {loading ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </form>

            <p className="text-xs text-gray-500 dark:text-slate-400 mt-4 text-center">
              We'll automatically include your current page URL and browser info to help us investigate.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
