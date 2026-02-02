import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const SavedDealsContext = createContext(null);

export function SavedDealsProvider({ children }) {
  const [savedDeals, setSavedDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all saved deals
  const fetchSavedDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/saved-deals`);
      const data = await res.json();
      if (data.success) {
        setSavedDeals(data.deals);
      } else {
        setError(data.error);
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
      const res = await fetch(`${API_BASE}/saved-deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealData)
      });
      const data = await res.json();
      if (data.success) {
        setSavedDeals(prev => [data.deal, ...prev]);
        return { success: true, deal: data.deal };
      } else {
        setError(data.error);
        return { success: false, error: data.error };
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
      const res = await fetch(`${API_BASE}/saved-deals/${id}`);
      const data = await res.json();
      if (data.success) {
        return { success: true, deal: data.deal };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Update a deal
  const updateDeal = useCallback(async (id, updates) => {
    try {
      const res = await fetch(`${API_BASE}/saved-deals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setSavedDeals(prev => prev.map(d => d.id === id ? data.deal : d));
        return { success: true, deal: data.deal };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Delete a deal
  const deleteDeal = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/saved-deals/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSavedDeals(prev => prev.filter(d => d.id !== id));
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Validate deal availability
  const validateDeal = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/saved-deals/${id}/validate`);
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Load deals on mount
  useEffect(() => {
    fetchSavedDeals();
  }, [fetchSavedDeals]);

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
