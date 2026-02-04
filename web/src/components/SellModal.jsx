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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sell Card</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 pb-24 sm:pb-4 space-y-5">
          {/* Card Info */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.card_name || 'Unnamed Card'}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{item.set_name || 'Unknown Set'}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Sticker: ${Number(item.front_label_price || 0).toFixed(2)} • Barcode: {item.barcode_id?.slice(-6)}
            </p>
          </div>

          {/* Sale Price */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Sale Price *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-lg">$</span>
              <input
                inputMode="decimal"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-9 pr-4 py-3 text-2xl font-semibold border border-slate-300 dark:border-slate-600 rounded-xl 
                           bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={status !== 'idle'}
              />
            </div>
            {paymentMethod?.id === 'credit_card' && salePrice && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                After fees (5.3% tax + 2.6% card + $0.15)
                <span className="font-bold text-green-600 dark:text-green-400 border border-green-600 dark:border-green-500 p-1">${((Number(salePrice) * 1.053) * 1.026 + 0.15).toFixed(2)}</span>
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                        ? `border-blue-500 bg-blue-50 dark:bg-blue-900/30` 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }
                      ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className={`p-1.5 rounded-lg ${method.color}`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Messages */}
          {status === 'awaiting_tap' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-200">Waiting for card tap...</p>
                <p className="text-sm text-blue-700 dark:text-blue-400">Customer can tap, insert, or swipe their card</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-200">Sale Complete!</p>
                <p className="text-sm text-green-700 dark:text-green-400">Card marked as sold</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="font-medium text-red-900 dark:text-red-200">Error</p>
              <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
            </div>
          )}

          {/* Submit Button */}
          {status === 'idle' && (
            <button
              onClick={handleSubmit}
              disabled={!salePrice || !paymentMethod}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl
                         hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed
                         transition-colors flex items-center justify-center gap-2"
            >
              Record Sale
            </button>
          )}

          {status === 'processing' && (
            <button
              disabled
              className="w-full py-3 bg-slate-300 dark:bg-slate-700 text-white font-semibold rounded-xl
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
