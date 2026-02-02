import { useState, useEffect, useRef } from 'react';
import { Scan, Check, X, Package, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchPendingBarcodes, assignBarcode } from '../api';

export default function PendingBarcodes({ onComplete }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const barcodeInputRef = useRef(null);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPendingBarcodes();
      setItems(data.items || []);
      // Auto-select first item if available
      if (data.items?.length > 0 && !selectedItem) {
        setSelectedItem(data.items[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (selectedItem && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [selectedItem]);

  const handleAssignBarcode = async () => {
    if (!selectedItem || !barcodeInput.trim()) return;
    
    setAssigning(true);
    setAssignError(null);
    
    try {
      await assignBarcode(selectedItem.id, barcodeInput.trim());
      
      // Remove from list and select next item
      const currentIndex = items.findIndex(i => i.id === selectedItem.id);
      const newItems = items.filter(i => i.id !== selectedItem.id);
      setItems(newItems);
      
      if (newItems.length > 0) {
        const nextIndex = Math.min(currentIndex, newItems.length - 1);
        setSelectedItem(newItems[nextIndex]);
      } else {
        setSelectedItem(null);
      }
      
      setBarcodeInput('');
      
      if (onComplete) onComplete();
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      e.preventDefault();
      handleAssignBarcode();
    }
  };

  const getConditionOrGrade = (item) => {
    if (item.card_type === 'raw') return item.condition || 'NM';
    return `${item.card_type?.toUpperCase()} ${item.grade || ''}${item.grade_qualifier || ''}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <Check className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-3" />
        <p className="text-slate-700 dark:text-slate-200 font-medium">All caught up!</p>
        <p className="text-slate-500 dark:text-slate-400 text-sm">No cards pending barcode assignment</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-center gap-3">
        <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        <span className="text-orange-800 dark:text-orange-200 font-medium">
          {items.length} card{items.length !== 1 ? 's' : ''} pending barcode assignment
        </span>
        <button
          onClick={loadItems}
          className="ml-auto p-1 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded"
        >
          <RefreshCw className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Item List */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-medium text-slate-700 dark:text-slate-300">Pending Cards</h3>
          </div>
          <div className="max-h-96 overflow-y-auto bg-white dark:bg-slate-900">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  setBarcodeInput('');
                  setAssignError(null);
                }}
                className={`w-full flex items-center gap-3 p-3 text-left border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors
                  ${selectedItem?.id === item.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="w-12 h-16 object-cover rounded" />
                ) : (
                  <div className="w-12 h-16 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                    No img
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">{item.card_name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {item.set_name} • {getConditionOrGrade(item)}
                  </div>
                  {item.customer_name && (
                    <div className="text-xs text-purple-600 dark:text-purple-400">
                      From: {item.customer_name} • {formatDate(item.trade_date)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">${parseFloat(item.front_label_price || 0).toFixed(2)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Scan Panel */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900">
          {selectedItem ? (
            <div className="space-y-4">
              {/* Selected Card Preview */}
              <div className="flex gap-4">
                {selectedItem.image_url ? (
                  <img src={selectedItem.image_url} alt="" className="w-24 h-32 object-cover rounded-lg shadow" />
                ) : (
                  <div className="w-24 h-32 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500">
                    No image
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">{selectedItem.card_name}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{selectedItem.set_name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{getConditionOrGrade(selectedItem)}</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                    ${parseFloat(selectedItem.front_label_price || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Barcode Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 italic">
                  <Scan className="w-4 h-4 inline mr-1" />
                  Scan or Enter Barcode
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcodeKeyDown}
                    placeholder="Scan barcode..."
                    className="flex-1 px-4 col-span-2 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-lg font-mono
                               bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                               focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-sm"
                    autoComplete="off"
                  />
                  <button
                    onClick={handleAssignBarcode}
                    disabled={!barcodeInput.trim() || assigning}
                    className="px-6 py-3 bg-blue-600 col-span-1 text-white rounded-lg font-medium
                               hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed
                               flex items-center justify-center text-center"
                  >
                    {assigning ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                    Assign
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Scan the barcode sticker you're applying to this card
                </p>
              </div>

              {/* Error */}
              {assignError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {assignError}
                </div>
              )}

              {/* Skip Button */}
              <button
                onClick={() => {
                  const currentIndex = items.findIndex(i => i.id === selectedItem.id);
                  const nextIndex = (currentIndex + 1) % items.length;
                  setSelectedItem(items[nextIndex]);
                  setBarcodeInput('');
                  setAssignError(null);
                }}
                className="w-full py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm"
              >
                Skip to next card
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Scan className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p>Select a card to assign a barcode</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
