import { useState, useEffect } from 'react';
import { X, Save, Loader2, CreditCard, Banknote, Smartphone } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard, color: 'bg-blue-600' },
  { id: 'CASH', label: 'Cash', icon: Banknote, color: 'bg-green-600' },
  { id: 'VENMO', label: 'Venmo', icon: Smartphone, color: 'bg-sky-500' },
  { id: 'ZELLE', label: 'Zelle', icon: Smartphone, color: 'bg-purple-600' },
  { id: 'CASHAPP', label: 'Cash App', icon: Smartphone, color: 'bg-emerald-500' },
];

export default function EditSaleModal({ isOpen, onClose, transaction, onSave }) {
  const [salePrice, setSalePrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && transaction) {
      setSalePrice(transaction.value?.toString() || '');
      setPaymentMethod(transaction.paymentMethod?.toUpperCase() || 'CASH');
      setError('');
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const handleSave = async () => {
    if (!salePrice || !paymentMethod) return;
    
    setIsSaving(true);
    setError('');
    try {
      await onSave(transaction.inventoryId, parseFloat(salePrice), paymentMethod);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update sale');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Sale</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Card Info */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
            <p className="font-medium text-slate-900 dark:text-slate-100">{transaction.cardName}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{transaction.setName}</p>
          </div>

          {/* Sale Price */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Sale Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">$</span>
              <input
                inputMode="decimal"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                step="0.01"
                min="0"
                className="w-full pl-8 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }
                    `}
                  >
                    <div className={`p-1 rounded ${method.color}`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!salePrice || !paymentMethod || isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
