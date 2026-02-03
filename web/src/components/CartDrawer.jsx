import { useState } from 'react';
import { X, ShoppingCart, Trash2, CheckCircle, AlertCircle, Loader2, DollarSign, CreditCard, Pencil, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { sellDirectly } from '../api';
import { PAYMENT_METHODS } from '../constants';

export default function CartDrawer({ onCheckoutComplete }) {
  const {
    cartItems,
    cartCount,
    cartTotal,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartItem,
    clearCart,
    lastScannedItem,
    scanError,
  } = useCart();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editPrice, setEditPrice] = useState('');

  const startEditing = (item) => {
    setEditingItemId(item.id);
    setEditPrice(parseFloat(item.front_label_price || item.purchase_price || 0).toFixed(2));
  };

  const saveEdit = (itemId) => {
    const newPrice = parseFloat(editPrice) || 0;
    updateCartItem(itemId, { front_label_price: newPrice });
    setEditingItemId(null);
    setEditPrice('');
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditPrice('');
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    setIsCheckingOut(true);
    setCheckoutError(null);
    
    try {
      // Sell each item individually
      for (const item of cartItems) {
        const salePrice = parseFloat(item.front_label_price || item.purchase_price || 0);
        await sellDirectly(item.barcode_id, salePrice, selectedPaymentMethod);
      }
      
      // Success - clear cart and show message
      setCheckoutSuccess(true);
      clearCart();
      
      // Callback to refresh inventory
      if (onCheckoutComplete) {
        onCheckoutComplete();
      }
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setCheckoutSuccess(false);
        setIsCartOpen(false);
      }, 2000);
      
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutError(err.message || 'Failed to complete checkout');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />
      
      {/* Drawer - Full screen on mobile, side drawer on desktop */}
      <div className="fixed inset-0 sm:inset-auto sm:right-0 sm:top-0 sm:h-full sm:w-full sm:max-w-md bg-white dark:bg-slate-900 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Shopping Cart</h2>
            {cartCount > 0 && (
              <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Toast Notifications */}
        {lastScannedItem && (
          <div className="mx-4 mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3 animate-pulse">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 truncate">
                Added: {lastScannedItem.card_name}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                {lastScannedItem.set_name}
              </p>
            </div>
          </div>
        )}

        {scanError && (
          <div className="mx-4 mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <p className="text-sm font-medium text-rose-800 dark:text-rose-200">{scanError}</p>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Scan a barcode to add items</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  {/* Card Image */}
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.card_name}
                      className="w-16 h-auto rounded object-cover"
                    />
                  ) : (
                    <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-400">No img</span>
                    </div>
                  )}

                  {/* Card Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item.card_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {item.set_name}
                    </p>
                    {item.card_number && (
                      <p className="text-xs text-gray-400">#{item.card_number}</p>
                    )}
                    {(item.grade || item.condition) && (
                      <span className={`inline-block mt-1 px-1.5 py-0.5 text-xs rounded ${
                        item.grade ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {item.grade ? `PSA ${item.grade}` : item.condition}
                      </span>
                    )}
                  </div>

                  {/* Price & Actions */}
                  <div className="flex flex-col items-end justify-between">
                    {editingItemId === item.id ? (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 dark:text-slate-400">$</span>
                          <input
                            inputMode="decimal"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(item.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-24 px-3 py-2 text-sm border border-indigo-300 dark:border-indigo-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => saveEdit(item.id)}
                            className="p-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Save"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Cancel"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                          ${parseFloat(item.front_label_price || item.purchase_price || 0).toFixed(2)}
                        </span>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => startEditing(item)}
                            className="p-2.5 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Edit price"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-2.5 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Remove from cart"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Safe area padding on mobile */}
        {cartItems.length > 0 && !checkoutSuccess && (
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4 bg-white dark:bg-slate-900">
            {/* Checkout Error */}
            {checkoutError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <p className="text-sm text-rose-700 dark:text-rose-300">{checkoutError}</p>
              </div>
            )}

            {/* Payment Method Selection */}
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Payment Method</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    disabled={isCheckingOut}
                    className={`px-3 py-3 text-sm font-medium rounded-xl border-2 transition-colors min-h-[48px] ${
                      selectedPaymentMethod === method.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    } ${isCheckingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Total ({cartCount} items)</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ${cartTotal.toFixed(2)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={clearCart}
                disabled={isCheckingOut}
                className="flex-1 px-4 py-3.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
              >
                Clear Cart
              </button>
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="flex-1 px-4 py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[52px]"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Complete Sale'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {checkoutSuccess && (
          <div className="border-t border-gray-200 p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900">Sale Complete!</p>
            <p className="text-sm text-gray-500 mt-1">All items have been sold</p>
          </div>
        )}
      </div>
    </>
  );
}
