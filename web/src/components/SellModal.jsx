import { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, Smartphone, CheckCircle, Loader2 } from 'lucide-react';

const PAYMENT_METHODS = [
  // TEMPORARILY: Using credit_card (manual) instead of stripe
  // { id: 'stripe', label: 'Card (Stripe)', icon: CreditCard, color: 'bg-blue-600' },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard, color: 'bg-blue-600' },
  { id: 'cash', label: 'Cash', icon: Banknote, color: 'bg-green-600' },
  { id: 'venmo', label: 'Venmo', icon: Smartphone, color: 'bg-sky-500' },
  { id: 'zelle', label: 'Zelle', icon: Smartphone, color: 'bg-purple-600' },
  { id: 'cashapp', label: 'Cash App', icon: Smartphone, color: 'bg-emerald-500' },
];

export default function SellModal({ isOpen, item, onClose, onSell }) {
  const [salePrice, setSalePrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, awaiting_tap, success, error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      setSalePrice(item.front_label_price?.toString() || '');
      setPaymentMethod(null);
      setStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen, item]);

  const handleSubmit = async () => {
    if (!salePrice || !paymentMethod) return;

    setStatus('processing');
    setErrorMessage('');

    try {
      await onSell({
        item,
        salePrice: Number(salePrice),
        paymentMethod: paymentMethod.id,
      });

      // TEMPORARILY: credit_card is manual, so treat like other direct payments
      // if (paymentMethod.id === 'stripe') {
      //   setStatus('awaiting_tap');
      // } else {
      setStatus('success');
      setTimeout(() => onClose(), 1500);
      // }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Failed to process sale');
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Sell Card</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* Card Info */}
          <div className="bg-gray-50 rounded-xl p-3">
            <h3 className="font-semibold text-gray-900">{item.card_name || 'Unnamed Card'}</h3>
            <p className="text-sm text-gray-500">{item.set_name || 'Unknown Set'}</p>
            <p className="text-xs text-gray-400 mt-1">
              Sticker: ${Number(item.front_label_price || 0).toFixed(2)} • Barcode: {item.barcode_id?.slice(-6)}
            </p>
          </div>

          {/* Sale Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sale Price *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-9 pr-4 py-3 text-2xl font-semibold border border-gray-300 rounded-xl 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={status !== 'idle'}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod?.id === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method)}
                    disabled={status !== 'idle'}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all
                      ${isSelected 
                        ? `border-blue-500 bg-blue-50` 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                      ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className={`p-1.5 rounded-lg ${method.color}`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Messages */}
          {status === 'awaiting_tap' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <div>
                <p className="font-medium text-blue-900">Waiting for card tap...</p>
                <p className="text-sm text-blue-700">Customer can tap, insert, or swipe their card</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Sale Complete!</p>
                <p className="text-sm text-green-700">Card marked as sold</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Submit Button */}
          {status === 'idle' && (
            <button
              onClick={handleSubmit}
              disabled={!salePrice || !paymentMethod}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl
                         hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                         transition-colors flex items-center justify-center gap-2"
            >
              Record Sale
            </button>
          )}

          {status === 'processing' && (
            <button
              disabled
              className="w-full py-3 bg-gray-300 text-white font-semibold rounded-xl
                         flex items-center justify-center gap-2"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
