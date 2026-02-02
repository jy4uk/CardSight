import { X, Package, Trash2, Image as ImageIcon, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContextNew';

export default function CardDetailsModal({ isOpen, onClose, item, onEdit, onDelete, onFetchImage, onSell }) {
  if (!isOpen || !item) return null;
  const { isAdminMode } = useAuth();
  const renderDetails = () => {
    return (
      <div className="space-y-4">
        {/* Card Image */}
        <div className="aspect-[2.5/3.5] bg-gradient-to-br from-gray-100 to-gray-200 relative rounded-lg overflow-hidden max-w-xs mx-auto">
          {item.image_url ? (
            <img 
              src={item.image_url} 
              alt={item.card_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
              <p className="text-gray-500 text-xs">No image</p>
            </div>
          )}
        </div>

        {/* Card Details */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-lg font-bold text-gray-900">{item.card_name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {item.game?.toUpperCase() || 'UNKNOWN'}
              </span>
              {item.card_type && item.card_type !== 'raw' && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {item.card_type?.toUpperCase()}
                </span>
              )}
              {(!item.card_type || item.card_type === 'raw') && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  {item.condition || 'NM'}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Set Name</p>
              <p className="font-medium text-gray-900">{item.set_name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-gray-500">Barcode</p>
              <p className="font-medium text-gray-900">{item.barcode_id}</p>
            </div>
            <div>
              <p className="text-gray-500">Card Number</p>
              <p className="font-medium text-gray-900">{item.card_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Grade/Condition</p>
              <p className="font-medium text-gray-900">
                {item.card_type && item.card_type !== 'raw' && item.grade 
                  ? `${item.grade}${item.grade_qualifier || ''} (${item.card_type.toUpperCase()})`
                  : item.condition || 'NM'
                }
              </p>
            </div>
            {isAdminMode && (
              <>
                <div>
                  <p className="text-gray-500">Purchase Date</p>
                  <p className="font-medium text-gray-900">
                    {item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Purchase Price</p>
                  <p className="font-medium text-gray-900">${item.purchase_price || '0.00'}</p>
                </div>
              </>
            )}
          </div>

          {isAdminMode && item.notes && (
            <div>
              <p className="text-gray-500 text-sm mb-1">Notes</p>
              <p className="text-gray-700 text-sm">{item.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          {isAdminMode && (
            <div className="flex gap-2 pt-4 flex-wrap">
              {onSell && (
                <button
                  onClick={() => onSell(item)}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  Sell
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(item)}
                  className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Card Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
          {renderDetails()}
        </div>
      </div>
    </div>
  );
}
