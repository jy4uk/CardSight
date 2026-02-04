import { useState } from 'react';
import { X, RotateCcw, Trash2, Loader2, AlertTriangle } from 'lucide-react';

export default function RemoveSaleModal({ isOpen, onClose, transaction, onRemove }) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !transaction) return null;

  const handleRemove = async (restoreToInventory) => {
    setIsRemoving(true);
    setError('');
    try {
      await onRemove(transaction.inventoryId, restoreToInventory);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to remove sale');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Remove Sale</h2>
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
            <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-1">
              Sold for ${transaction.value?.toFixed(2)}
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              This will remove the sale record. Choose how to handle the item:
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleRemove(true)}
              disabled={isRemoving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRemoving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="w-5 h-5" />
                  Restore to Inventory
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Item will be returned to your inventory as "In Stock"
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">or</span>
              </div>
            </div>

            <button
              onClick={() => handleRemove(false)}
              disabled={isRemoving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRemoving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Delete All Records
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Permanently delete the item and all related records
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={isRemoving}
            className="w-full px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
