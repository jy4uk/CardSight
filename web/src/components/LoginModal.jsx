import { useState } from 'react';
import { X, Mail, Lock, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContextNew';
import apiClient from '../utils/apiClient';

export default function LoginModal() {
  const { login, closeLoginModal, switchToSignup, showLoginModal } = useAuth();
  const [view, setView] = useState('login'); // 'login' or 'forgot-password'
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  if (!showLoginModal) return null;

  const handleClose = () => {
    setEmailOrUsername('');
    setPassword('');
    setRememberMe(false);
    setError('');
    setView('login');
    setResetEmail('');
    setResetSuccess(false);
    closeLoginModal();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(emailOrUsername, password, rememberMe);
    
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', { email: resetEmail });
      // Always show success message (security: prevent email enumeration)
      setResetSuccess(true);
    } catch (err) {
      // Even on error, show success message (security: prevent email enumeration)
      setResetSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setView('login');
    setResetEmail('');
    setResetSuccess(false);
    setError('');
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      onClick={handleClose}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 touch-target"
          aria-label="Close modal"
        >
          <X size={24} aria-hidden="true" />
        </button>

        {view === 'login' ? (
          <>
            <h2 id="login-title" className="text-2xl font-bold mb-6 text-gray-800">
              Welcome Back
            </h2>

            {error && (
              <div 
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} aria-hidden="true" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email-username" className="block text-sm font-medium text-gray-700 mb-1">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} aria-hidden="true" />
                  <input
                    id="email-username"
                    type="text"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-target"
                    placeholder="username or email@example.com"
                    required
                    autoFocus
                    aria-required="true"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} aria-hidden="true" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-target"
                    placeholder="••••••••"
                    required
                    aria-required="true"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me for 30 days
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed font-medium touch-target"
                aria-busy={loading}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setView('forgot-password')}
                className="text-sm text-blue-600 hover:text-blue-700 touch-target"
              >
                Forgot password?
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={switchToSignup}
                  className="text-blue-600 hover:text-blue-700 font-medium touch-target"
                >
                  Sign up
                </button>
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Forgot Password View */}
            <button
              type="button"
              onClick={handleBackToLogin}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 touch-target"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back to Login</span>
            </button>

            <h2 className="text-2xl font-bold mb-2 text-gray-800">
              Reset Password
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {resetSuccess ? (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Check Your Email
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  If an account exists with that email, a reset link has been sent.
                </p>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium touch-target"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-target"
                      placeholder="email@example.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed font-medium touch-target"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
