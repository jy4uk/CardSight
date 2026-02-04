import { useState, useEffect } from 'react';
import { X, Calendar, BarChart3, Package, TrendingUp } from 'lucide-react';

export default function InventoryValueModal({ isOpen, onClose, data }) {
  const [viewType, setViewType] = useState('date'); // 'date' or 'card'
  const [inventoryData, setInventoryData] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    if (!data) return;

    if (viewType === 'date') {
      setInventoryData(data.inventoryValueByDate || []);
    } else {
      setInventoryData(data.inventoryValueByCard || []);
    }
  }, [isOpen, data, viewType]);

  const totalValueGained = inventoryData.reduce((sum, item) => sum + (item.valueGained || 0), 0);
  const totalCardsAdded = viewType === 'date' 
    ? inventoryData.reduce((sum, item) => sum + (item.cardsAdded || 0), 0)
    : inventoryData.reduce((sum, item) => sum + (item.count || 0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Inventory Value Insights
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-center gap-4 p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewType('date')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewType === 'date'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              By Date
            </button>
            <button
              onClick={() => setViewType('card')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewType === 'card'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4 inline mr-1" />
              By Card
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600">Total Value Gained</p>
                      <p className="text-2xl font-bold text-green-700">${totalValueGained.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">
                        Total Cards Added
                      </p>
                      <p className="text-2xl font-bold text-blue-700">{totalCardsAdded.toLocaleString()}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Data Display */}
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <div className="bg-white border-b border-gray-200 px-4 py-3">
                  <h3 className="font-semibold text-gray-900">
                    {viewType === 'date' ? 'Daily Inventory Value Gained' : 'Cards by Value Added'}
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {inventoryData.map((item, index) => (
                    <div key={index} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          {viewType === 'date' ? (
                            <>
                              <p className="font-medium text-gray-900">{new Date(item.date).toLocaleDateString()}</p>
                              <p className="text-sm text-gray-500">{item.cardsAdded} cards added</p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-gray-900">{item.cardName}</p>
                              <p className="text-sm text-gray-500">
                                {item.setName || ''} • {item.count} added
                                {item.lastAdded ? ` • Last: ${new Date(item.lastAdded).toLocaleDateString()}` : ''}
                              </p>
                            </>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">+${item.valueGained.toLocaleString()}</p>
                          {viewType === 'date' && (
                            <p className="text-sm text-gray-500">
                              Avg: ${item.cardsAdded > 0 ? (item.valueGained / item.cardsAdded).toFixed(0) : 0}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart Placeholder */}
              <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Value Trend</h3>
                <div className="h-48 flex items-center justify-center text-gray-400">
                  <BarChart3 className="w-12 h-12" />
                  <p className="ml-2">Chart visualization coming soon</p>
                </div>
              </div>
          </>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
