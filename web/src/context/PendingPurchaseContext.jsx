import { createContext, useContext, useState, useCallback, useMemo } from 'react';

function createLineId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback if crypto API is not available
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const PendingPurchaseContext = createContext(null);

export function PendingPurchaseProvider({ children }) {
  const [pendingItems, setPendingItems] = useState([]);

  // Normalize barcode for comparison
  const normalizeBarcode = (barcode) => (barcode || '').trim().toLowerCase();

  // Add item to pending list
  const addPendingItem = useCallback((item) => {
    const barcode = normalizeBarcode(item.barcode_id);
    
    setPendingItems(prev => {
      // If item has a barcode, check for duplicates
      if (barcode) {
        const existingIndex = prev.findIndex(
          p => normalizeBarcode(p.barcode_id) === barcode
        );
        if (existingIndex >= 0) {
          // Don't increment quantity for barcoded items - each barcode is unique
          return prev;
        }
      }
      
      // Add as new item
      return [...prev, { 
        ...item, 
        lineId: createLineId(),
        quantity: item.quantity || 1
      }];
    });
  }, []);

  // Update item in pending list
  const updatePendingItem = useCallback((lineId, updates) => {
    setPendingItems(prev => prev.map(item => 
      item.lineId === lineId ? { ...item, ...updates } : item
    ));
  }, []);

  // Remove item from pending list
  const removePendingItem = useCallback((lineId) => {
    setPendingItems(prev => prev.filter(item => item.lineId !== lineId));
  }, []);

  // Clear all pending items
  const clearPending = useCallback(() => {
    setPendingItems([]);
  }, []);

  // Calculate totals
  const totalQuantity = useMemo(() => 
    pendingItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
    [pendingItems]
  );

  const totalCost = useMemo(() => 
    pendingItems.reduce((sum, item) => 
      sum + (Number(item.purchase_price) || 0) * (item.quantity || 1), 0
    ),
    [pendingItems]
  );

  const value = useMemo(() => ({
    pendingItems,
    addPendingItem,
    updatePendingItem,
    removePendingItem,
    clearPending,
    totalQuantity,
    totalCost
  }), [pendingItems, addPendingItem, updatePendingItem, removePendingItem, clearPending, totalQuantity, totalCost]);

  return (
    <PendingPurchaseContext.Provider value={value}>
      {children}
    </PendingPurchaseContext.Provider>
  );
}

export function usePendingPurchase() {
  const context = useContext(PendingPurchaseContext);
  if (!context) {
    throw new Error('usePendingPurchase must be used within a PendingPurchaseProvider');
  }
  return context;
}
