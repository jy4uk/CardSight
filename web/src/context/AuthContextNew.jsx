import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { setAccessToken, clearAccessToken } from '../utils/apiClient';

const AuthContextNew = createContext();

export const FEATURES = {
  VIEW_INVENTORY: 'view_inventory',
  ADD_ITEM: 'add_item',
  EDIT_ITEM: 'edit_item',
  DELETE_ITEM: 'delete_item',
  SELL_ITEM: 'sell_item',
  VIEW_INSIGHTS: 'view_insights',
  MANAGE_CARD_SHOWS: 'manage_card_shows',
  BULK_ACTIONS: 'bulk_actions',
  PRICING_ASSISTANT: 'pricing_assistant',
  BARCODE_GENERATOR: 'barcode_generator',
  MANAGE_TRADES: 'manage_trades',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Silent refresh on app load
  const silentRefresh = useCallback(async () => {
    try {
      const response = await apiClient.post('/auth/refresh');
      const { accessToken, user: userData } = response.data;
      
      setAccessToken(accessToken);
      setUser(userData);
      setShowLoginModal(false); // Ensure modal is closed on successful refresh
      return true;
    } catch (error) {
      // No valid session - this is fine, user can view public profiles or will see login modal
      console.log('No valid session found');
      clearAccessToken();
      setUser(null);
      setShowLoginModal(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    silentRefresh();

    // Listen for logout events from axios interceptor
    const handleLogout = () => {
      setUser(null);
      clearAccessToken();
      setShowLoginModal(true);
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [silentRefresh]);

  // Login function
  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password, rememberMe });
      const { accessToken, user: userData } = response.data;
      
      setAccessToken(accessToken);
      setUser(userData);
      setShowLoginModal(false);
      
      // If logging in from a public profile page, redirect to clean URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('username')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      return { success: false, error: message };
    }
  };

  // Signup function
  const signup = async (email, password, firstName, lastName, username, betaCode) => {
    try {
      const response = await apiClient.post('/auth/signup', {
        email,
        password,
        firstName,
        lastName,
        username,
        betaCode,
      });
      const { accessToken, user: userData } = response.data;
      
      setAccessToken(accessToken);
      setUser(userData);
      setShowSignupModal(false);
      
      // If signing up from a public profile page, redirect to clean URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('username')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Signup failed';
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      clearAccessToken();
      setShowLoginModal(true);
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to send reset email';
      return { success: false, error: message };
    }
  };

  // Reset password
  const resetPassword = async (token, newPassword) => {
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to reset password';
      return { success: false, error: message };
    }
  };

  const isAuthenticated = !!user;

  // Feature access control - authenticated users get all features
  const hasFeature = (feature) => {
    // All features require authentication
    if (!isAuthenticated) return false;
    
    // All listed features are available to authenticated users
    return Object.values(FEATURES).includes(feature);
  };

  const canEdit = (profileUsername) => {
    if (!isAuthenticated || !user) return false;
    return user.username === profileUsername;
  };

  const value = {
    // User state
    user,
    setUser,
    loading,
    isAuthenticated,
    
    // Auth functions
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    
    // Modal state
    showLoginModal,
    showSignupModal,
    openLoginModal: () => setShowLoginModal(true),
    closeLoginModal: () => setShowLoginModal(false),
    openSignupModal: () => setShowSignupModal(true),
    closeSignupModal: () => setShowSignupModal(false),
    switchToSignup: () => {
      setShowLoginModal(false);
      setShowSignupModal(true);
    },
    switchToLogin: () => {
      setShowSignupModal(false);
      setShowLoginModal(true);
    },
    
    // Feature access
    hasFeature,
    canEdit,
  };

  return <AuthContextNew.Provider value={value}>{children}</AuthContextNew.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContextNew);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { FEATURES as AUTH_FEATURES };
