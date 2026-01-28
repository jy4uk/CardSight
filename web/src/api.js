const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchInventory() {
  const res = await fetch(`${API_BASE}/inventory`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export async function fetchInventoryByBarcode(barcode) {
  const res = await fetch(`${API_BASE}/inventory/${barcode}`);
  if (!res.ok) throw new Error('Item not found');
  return res.json();
}

export async function addInventoryItem(item) {
  const res = await fetch(`${API_BASE}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error('Failed to add item');
  return res.json();
}

export async function createPayment(amount, metadata = {}) {
  const res = await fetch(`${API_BASE}/terminal/create-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, metadata }),
  });
  if (!res.ok) throw new Error('Failed to create payment');
  return res.json();
}

export async function listReaders() {
  const res = await fetch(`${API_BASE}/terminal/readers`);
  if (!res.ok) throw new Error('Failed to list readers');
  return res.json();
}

export async function processPayment(readerId, paymentIntentId) {
  const res = await fetch(`${API_BASE}/terminal/process-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ readerId, paymentIntentId }),
  });
  if (!res.ok) throw new Error('Failed to process payment');
  return res.json();
}

export async function sellDirectly(barcode, salePrice, paymentMethod) {
  const res = await fetch(`${API_BASE}/inventory/${barcode}/sell-direct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sale_price: salePrice, payment_method: paymentMethod }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || data.msg || 'Failed to record sale');
  }
  return res.json();
}

export async function initiateStripeSale(barcode, salePrice) {
  const res = await fetch(`${API_BASE}/inventory/${barcode}/sell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sale_price: salePrice }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || data.msg || 'Failed to initiate payment');
  }
  return res.json();
}

export async function updateItemImage(barcode) {
  const res = await fetch(`${API_BASE}/inventory/${barcode}/update-image`, {
    method: 'POST',
  });
  return res.json();
}

export async function updateInventoryItem(id, data) {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update item');
  }
  return res.json();
}

export async function deleteInventoryItem(id) {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete item');
  }
  return res.json();
}

export async function searchCardImages(
  cardName,
  setName = '',
  game = 'pokemon',
  cardNumber = '',
  limit = 6,
  signal
) {
  const params = new URLSearchParams({ card_name: cardName, game, limit: String(limit) });
  if (setName) params.append('set_name', setName);
  if (cardNumber) params.append('card_number', cardNumber);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(`${API_BASE}/inventory/search-images?${params}`, {
      signal: controller.signal,
    });
    return await res.json();
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { success: false, error: 'Image search timed out. Try adding set name or card number.' };
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchInsights(timeRange = '30d') {
  const params = new URLSearchParams({ timeRange });
  const res = await fetch(`${API_BASE}/insights?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch insights');
  }
  return res.json();
}

// Pricing API functions
export const fetchCardPricing = async (barcodeId) => {
  try {
    const response = await fetch(`${API_BASE}/pricing/card/${barcodeId}`);
    if (!response.ok) throw new Error('Failed to fetch card pricing');
    return await response.json();
  } catch (error) {
    console.error('Error fetching card pricing:', error);
    throw error;
  }
};

export const fetchBatchPricing = async (barcodeIds) => {
  try {
    const response = await fetch(`${API_BASE}/pricing/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ barcodeIds })
    });
    if (!response.ok) throw new Error('Failed to fetch batch pricing');
    return await response.json();
  } catch (error) {
    console.error('Error fetching batch pricing:', error);
    throw error;
  }
};

export const updateAllPricing = async () => {
  try {
    const response = await fetch(`${API_BASE}/pricing/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (!response.ok) throw new Error('Failed to update pricing');
    return await response.json();
  } catch (error) {
    console.error('Error updating pricing:', error);
    throw error;
  }
};

export const fetchPricingAnalytics = async () => {
  try {
    const response = await fetch(`${API_BASE}/pricing/analytics`);
    if (!response.ok) throw new Error('Failed to fetch pricing analytics');
    return await response.json();
  } catch (error) {
    console.error('Error fetching pricing analytics:', error);
    throw error;
  }
};

export const addCardShow = async (cardShowData) => {
  try {
    const response = await fetch(`${API_BASE}/insights/card-shows`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(cardShowData)
    });
    if (!response.ok) throw new Error('Failed to add card show');
    return await response.json();
  } catch (error) {
    console.error('Error adding card show:', error);
    throw error;
  }
};

export const deleteCardShow = async (showId) => {
  try {
    const response = await fetch(`${API_BASE}/insights/card-shows/${showId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete card show');
    return await response.json();
  } catch (error) {
    console.error('Error deleting card show:', error);
    throw error;
  }
};
