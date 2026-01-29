import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Feature access levels
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
};

// Role-based feature access
const ROLE_FEATURES = {
  admin: Object.values(FEATURES), // Admin gets all features
  public: [FEATURES.VIEW_INVENTORY], // Public only sees inventory
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('cardpilot_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('cardpilot_user');
      }
    } else {
      // Auto-login as guest by default (public inventory view)
      setUser({ role: 'public', loginTime: Date.now() });
    }
    setLoading(false);
  }, []);

  const login = async (password) => {
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || '/api'}/auth/login`;
      console.log('Attempting login to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers.get('content-type'));

      if (!response.ok) {
        // Try to parse error, but handle HTML responses
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Login failed';
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          errorMessage = data.error || 'Login failed';
        } else {
          const text = await response.text();
          errorMessage = `Server error (${response.status}): ${text.substring(0, 100)}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const userData = { role: data.role, loginTime: Date.now() };
      setUser(userData);
      localStorage.setItem('cardpilot_user', JSON.stringify(userData));
      setShowLoginModal(false); // Close modal on successful login
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const openLoginModal = () => setShowLoginModal(true);
  const closeLoginModal = () => setShowLoginModal(false);

  const logout = () => {
    // Revert to guest mode instead of null (keeps public inventory visible)
    const guestUser = { role: 'public', loginTime: Date.now() };
    setUser(guestUser);
    localStorage.removeItem('cardpilot_user');
  };

  const continueAsGuest = () => {
    const guestUser = { role: 'public', loginTime: Date.now() };
    setUser(guestUser);
    localStorage.setItem('cardpilot_user', JSON.stringify(guestUser));
  };

  const hasFeature = (feature) => {
    if (!user) return false;
    const allowedFeatures = ROLE_FEATURES[user.role] || ROLE_FEATURES.public;
    return allowedFeatures.includes(feature);
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      continueAsGuest,
      hasFeature,
      isAdmin,
      showLoginModal,
      openLoginModal,
      closeLoginModal,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
