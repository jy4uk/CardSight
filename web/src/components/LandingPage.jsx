import { useState } from 'react';
import { Package, LogIn, UserPlus, Shuffle } from 'lucide-react';
import { useAuth } from '../context/AuthContextNew';

export default function LandingPage() {
  const { openLoginModal, openSignupModal } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRandomVendor = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/random');
      const data = await response.json();
      
      if (data.username) {
        window.location.href = `/u/${data.username}`;
      }
    } catch (error) {
      console.error('Failed to fetch random vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
              <Package className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">Card Sight</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            Your all-in-one platform for managing trading card inventory, sales, and trades.
          </p>
          
          <p className="text-lg text-gray-500 mb-12 max-w-xl mx-auto">
            Join vendors across the country who trust Card Sight to streamline their business.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={openSignupModal}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <UserPlus className="w-5 h-5" />
              Have a code?
            </button>
            
            <button
              onClick={openLoginModal}
              className="flex items-center gap-2 px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-md hover:shadow-lg border border-gray-200"
            >
              <LogIn className="w-5 h-5" />
              Log In
            </button>
          </div>
          {/* Beta Access Button */}
          <div className="mt-3">
            <a
              href="https://discord.gg/H5hk69AsDp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Request Beta Access
            </a>
          </div>

          {/* Random Vendor Button */}
          <div className="border-t border-gray-200 pt-12 mt-8">
            <p className="text-sm text-gray-500 mb-4">
              Want to see Card Sight in action?
            </p>
            <button
              onClick={handleRandomVendor}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shuffle className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Finding vendor...' : 'Visit a random vendor'}
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Inventory Management
            </h3>
            <p className="text-gray-600">
              Track your entire card collection with detailed information, pricing, and condition tracking.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sales Tracking
            </h3>
            <p className="text-gray-600">
              Record sales, process payments, and track your revenue with built-in analytics.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Trade Management
            </h3>
            <p className="text-gray-600">
              Manage customer trades with automatic inventory updates and trade history.
            </p>
          </div>
        </div>

        {/* Beta Notice */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-yellow-50 border border-yellow-200 rounded-lg px-6 py-3">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Beta Access:</span> Card Sight is currently in beta. 
              A beta access code is required to sign up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
