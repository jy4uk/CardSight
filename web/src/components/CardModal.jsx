import { useState } from 'react';
import { X, Package, DollarSign, Calendar, Clock, MapPin, Edit, Trash2, ExternalLink, Image as ImageIcon } from 'lucide-react';

export default function CardModal({ isOpen, onClose, item, onEdit, onDelete, onFetchImage }) {
  const [activeTab, setActiveTab] = useState('details');
  const [editForm, setEditForm] = useState({
    card_name: item?.card_name || '',
    set_name: item?.set_name || '',
    condition: item?.condition || '',
    purchase_price: item?.purchase_price || '',
    front_label_price: item?.front_label_price || '',
    notes: item?.notes || ''
  });

  if (!isOpen || !item) return null;

  const handleSaveEdit = () => {
    setActiveTab('details');
    // TODO: Call onEdit with updated form data
    console.log('Saving card:', editForm);
  };

  const handleCancelEdit = () => {
    setActiveTab('details');
    // Reset form to original values
    setEditForm({
      card_name: item?.card_name || '',
      set_name: item?.set_name || '',
      condition: item?.condition || '',
      purchase_price: item?.purchase_price || '',
      front_label_price: item?.front_label_price || '',
      notes: item?.notes || ''
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <div className="space-y-4">
            {/* Card Image */}
            <div className="aspect-[2.5/3.5] bg-gradient-to-br from-gray-100 to-gray-200 relative rounded-lg overflow-hidden">
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
                  <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">No image</p>
                </div>
              )}
            </div>

            {/* Card Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">{item.card_name}</h3>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {item.game?.toUpperCase() || 'UNKNOWN'}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    {item.condition || 'NM'}
                  </span>
                  {item.card_type && item.card_type !== 'raw' && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      {item.card_type?.toUpperCase()}
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
                  <p className="text-gray-500">Purchase Date</p>
                  <p className="font-medium text-gray-900">
                    {item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Purchase Price</p>
                  <p className="font-medium text-gray-900">${item.purchase_price || '0.00'}</p>
                </div>
              </div>

              {item.notes && (
                <div>
                  <p className="text-gray-500 text-sm mb-1">Notes</p>
                  <p className="text-gray-700 text-sm">{item.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => onEdit?.(item)}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => onFetchImage?.(item)}
                  className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Package className="w-4 h-4" />
                  Fetch Image
                </button>
                <button
                  onClick={() => onDelete?.(item)}
                  className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          );
      
      case 'edit':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Card</h3>
              <button
                onClick={handleCancelEdit}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Name</label>
                <input
                  type="text"
                  value={editForm.card_name}
                  onChange={(e) => setEditForm({...editForm, card_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Set Name</label>
                <input
                  type="text"
                  value={editForm.set_name}
                  onChange={(e) => setEditForm({...editForm, set_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={editForm.condition}
                  onChange={(e) => setEditForm({...editForm, condition: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select condition</option>
                  <option value="NM">Near Mint</option>
                  <option value="LP">Light Play</option>
                  <option value="MP">Moderately Played</option>
                  <option value="HP">Heavily Played</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                  <input
                    inputMode="decimal"
                    value={editForm.purchase_price}
                    onChange={(e) => setEditForm({...editForm, purchase_price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Front Label Price</label>
                  <input
                    inputMode="decimal"
                    value={editForm.front_label_price}
                    onChange={(e) => setEditForm({...editForm, front_label_price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
      
      default:
        return <div>Unknown tab</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Card Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'details' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'edit' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Edit
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
