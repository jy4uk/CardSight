import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import apiClient from '../utils/apiClient.js';
import { useAuth } from './AuthContextNew.jsx';

const SavedDealsContext = createContext(null);

export function SavedDealsProvider({ children }) {
  const { user } = useAuth();
  const [savedDeals, setSavedDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all saved deals
  const fetchSavedDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/saved-deals');
      if (res.data.success) {
        setSavedDeals(res.data.deals);
      } else {
        setError(res.data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save a new deal
  const saveDeal = useCallback(async (dealData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/saved-deals', dealData);
      if (res.data.success) {
        setSavedDeals(prev => [res.data.deal, ...prev]);
        return { success: true, deal: res.data.deal };
      } else {
        setError(res.data.error);
        return { success: false, error: res.data.error };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a single deal by ID (with availability check)
  const getDeal = useCallback(async (id) => {
    try {
      const res = await apiClient.get(`/saved-deals/${id}`);
      if (res.data.success) {
        return { success: true, deal: res.data.deal };
      } else {
        return { success: false, error: res.data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Update a deal
  const updateDeal = useCallback(async (id, updates) => {
    try {
      const res = await apiClient.put(`/saved-deals/${id}`, updates);
      if (res.data.success) {
        setSavedDeals(prev => prev.map(d => d.id === id ? res.data.deal : d));
        return { success: true, deal: res.data.deal };
      } else {
        return { success: false, error: res.data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Delete a deal
  const deleteDeal = useCallback(async (id) => {
    try {
      const res = await apiClient.delete(`/saved-deals/${id}`);
      if (res.data.success) {
        setSavedDeals(prev => prev.filter(d => d.id !== id));
        return { success: true };
      } else {
        return { success: false, error: res.data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Validate deal availability
  const validateDeal = useCallback(async (id) => {
    try {
      const res = await apiClient.get(`/saved-deals/${id}/validate`);
      return res.data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Load deals when user is authenticated
  useEffect(() => {
    if (user) {
      fetchSavedDeals();
    } else {
      setSavedDeals([]);
    }
  }, [user, fetchSavedDeals]);

  const value = {
    savedDeals,
    loading,
    error,
    fetchSavedDeals,
    saveDeal,
    getDeal,
    updateDeal,
    deleteDeal,
    validateDeal
  };

  return (
    <SavedDealsContext.Provider value={value}>
      {children}
    </SavedDealsContext.Provider>
  );
}

export function useSavedDeals() {
  const context = useContext(SavedDealsContext);
  if (!context) {
    throw new Error('useSavedDeals must be used within a SavedDealsProvider');
  }
  return context;
}
