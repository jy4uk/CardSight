import { useState } from 'react';
import { X, Package, DollarSign, Calendar, Trash2 } from 'lucide-react';
import AlertModal from '../AlertModal';

export default function CardShowDetailsModal({ isOpen, onClose, cardShows, recentSales, onDeleteShow }) {
  const [expandedShows, setExpandedShows] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, showId: null, showName: '' });
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'error', message: '' });

  if (!isOpen) return null;

  const toggleShowExpansion = (showId) => {
    const newExpanded = new Set(expandedShows);
    if (newExpanded.has(showId)) {
      newExpanded.delete(showId);
    } else {
      newExpanded.add(showId);
    }
    setExpandedShows(newExpanded);
  };

  const handleDeleteClick = (showId, showName) => {
    setDeleteConfirm({ isOpen: true, showId, showName });
  };

  const handleConfirmDelete = async () => {
    try {
      await onDeleteShow(deleteConfirm.showId);
      setDeleteConfirm({ isOpen: false, showId: null, showName: '' });
    } catch (error) {
      console.error('Error deleting show:', error);
      setDeleteConfirm({ isOpen: false, showId: null, showName: '' });
      setAlertModal({ isOpen: true, type: 'error', message: 'Failed to delete show: ' + error.message });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Card Shows</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto">
              {!cardShows || cardShows?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No card shows found</p>
                </div>
              ) : (
                cardShows?.map((show, index) => {
                  const showSales = recentSales?.filter(sale => sale.showId === show.id) || [];
                  const isExpanded = expandedShows.has(show.id);
                  
                  return (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => toggleShowExpansion(show.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{show.showName}</h4>
                              <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                <Package className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{show.location}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(show.showDate).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {show.cardsSold} cards sold
                              </span>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-green-600">${show.totalRevenue?.toFixed(2)}</p>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(show.id, show.showName); }}
                                className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                title="Delete Show"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-sm text-gray-500">
                              Profit: <span className={show.totalProfit > 0 ? 'text-blue-600' : 'text-red-600'}>
                                ${show.totalProfit?.toFixed(2)}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expandable cards sold section */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50 p-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">Cards Sold:</h5>
                          {showSales.length === 0 ? (
                            <p className="text-sm text-gray-500">No cards sold at this show</p>
                          ) : (
                            <div className="space-y-2">
                              {showSales.map((sale, saleIndex) => (
                                <div key={saleIndex} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{sale.cardName}</p>
                                    <p className="text-xs text-gray-500">{sale.setName}</p>
                                    {sale.purchaseShowName && (
                                      <p className="text-xs text-blue-600 mt-1">Purchased at: {sale.purchaseShowName}</p>
                                    )}
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="text-sm font-semibold text-green-600">${(sale.value ?? sale.salePrice ?? 0).toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">
                                      Profit: <span className={sale.profit > 0 ? 'text-blue-600' : 'text-red-600'}>
                                        ${sale.profit?.toFixed(2)}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>{cardShows?.length || 0} shows</span>
            <span>{recentSales?.length || 0} total sales</span>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <AlertModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, showId: null, showName: '' })}
        onConfirm={handleConfirmDelete}
        type="delete"
        title="Delete Card Show"
        message={`Are you sure you want to delete "${deleteConfirm.showName}"? This will remove the show and unlink any associated transactions.`}
        showCancel={true}
      />
      
      {/* Error Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, type: 'error', message: '' })}
        type={alertModal.type}
        message={alertModal.message}
        showCancel={false}
      />
    </div>
  );
}
