import { X, Trash2, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

const alertTypes = {
  delete: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    title: 'Delete Card',
    confirmText: 'Delete',
    confirmBg: 'bg-red-600 hover:bg-red-700',
  },
  error: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    title: 'Error',
    confirmText: 'OK',
    confirmBg: 'bg-gray-600 hover:bg-gray-700',
  },
  timeout: {
    icon: Clock,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    title: 'Timeout',
    confirmText: 'OK',
    confirmBg: 'bg-gray-600 hover:bg-gray-700',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    title: 'Success',
    confirmText: 'OK',
    confirmBg: 'bg-gray-600 hover:bg-gray-700',
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${config.iconBg} rounded-full`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{finalTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          {message && (
            <p className="text-gray-700 mb-2">
              {message}
            </p>
          )}
          
          {itemName && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="font-medium text-gray-900">{itemName}</p>
            </div>
          )}
          
          {type === 'delete' && (
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {showCancel && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium
                         hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => {
              onConfirm?.();
              if (!showCancel) onClose();
            }}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-colors ${config.confirmBg}`}
          >
            {config.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
