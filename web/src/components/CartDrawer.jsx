import { useState } from 'react';
import { X, ShoppingCart, Trash2, CheckCircle, AlertCircle, Loader2, DollarSign, CreditCard, Pencil, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { sellDirectly } from '../api';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: DollarSign },
  { id: 'credit_card', label: 'Card', icon: CreditCard },
  { id: 'venmo', label: 'Venmo', icon: CreditCard },
  { id: 'zelle', label: 'Zelle', icon: CreditCard },
  { id: 'cashapp', label: 'CashApp', icon: CreditCard },
];

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
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Shopping Cart</h2>
            {cartCount > 0 && (
              <span className="bg-blue-100 text-blue-700 text-sm font-medium px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Toast Notifications */}
        {lastScannedItem && (
          <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-pulse">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800 truncate">
                Added: {lastScannedItem.card_name}
              </p>
              <p className="text-xs text-green-600 truncate">
                {lastScannedItem.set_name}
              </p>
            </div>
          </div>
        )}

        {scanError && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">{scanError}</p>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Scan a barcode to add items</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
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
                          <span className="text-gray-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(item.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-right"
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => saveEdit(item.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-gray-900">
                          ${parseFloat(item.front_label_price || item.purchase_price || 0).toFixed(2)}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditing(item)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                            title="Edit price"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Remove from cart"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Footer */}
        {cartItems.length > 0 && !checkoutSuccess && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            {/* Checkout Error */}
            {checkoutError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{checkoutError}</p>
              </div>
            )}

            {/* Payment Method Selection */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Payment Method</p>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    disabled={isCheckingOut}
                    className={`px-2 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      selectedPaymentMethod === method.id
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    } ${isCheckingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-gray-600">Total ({cartCount} items)</span>
              <span className="text-xl font-bold text-gray-900">
                ${cartTotal.toFixed(2)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={clearCart}
                disabled={isCheckingOut}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Cart
              </button>
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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
