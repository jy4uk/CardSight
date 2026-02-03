import { X, Trash2, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

const alertTypes = {
  delete: {
    icon: Trash2,
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    title: 'Delete Card',
    confirmText: 'Delete',
    confirmBg: 'bg-rose-600 hover:bg-rose-700',
  },
  error: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    title: 'Error',
    confirmText: 'OK',
    confirmBg: 'bg-slate-600 hover:bg-slate-700',
  },
  timeout: {
    icon: Clock,
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    title: 'Timeout',
    confirmText: 'OK',
    confirmBg: 'bg-slate-600 hover:bg-slate-700',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'Success',
    confirmText: 'OK',
    confirmBg: 'bg-slate-600 hover:bg-slate-700',
  },
};

export default function AlertModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  type = 'error',
  title,
  message,
  itemName,
  showCancel = true 
}) {
  if (!isOpen) return null;

  const config = alertTypes[type] || alertTypes.error;
  const Icon = config.icon;
  const finalTitle = title || config.title;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
        {/* Drag Handle - Mobile only */}
        <div className="flex justify-center mb-4 sm:hidden">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 ${config.iconBg} rounded-full`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{finalTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          {message && (
            <p className="text-slate-700 dark:text-slate-300 mb-3 text-base leading-relaxed">
              {message}
            </p>
          )}
          
          {itemName && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <p className="font-medium text-slate-900 dark:text-slate-100">{itemName}</p>
            </div>
          )}
          
          {type === 'delete' && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
              This action cannot be undone.
            </p>
          )}
        </div>

        {/* Actions - Stacked on mobile for better touch targets */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          {showCancel && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold
                         hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-h-[52px]"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => {
              onConfirm?.();
              if (!showCancel) onClose();
            }}
            className={`flex-1 px-4 py-3.5 text-white rounded-xl font-semibold transition-colors min-h-[52px] ${config.confirmBg}`}
          >
            {config.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
