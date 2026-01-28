import { useState } from 'react';
import { X, Package, DollarSign, TrendingUp, Calendar, Filter, Search, Clock } from 'lucide-react';

export default function SalesDetailsModal({ isOpen, onClose, data, timeRange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');

  if (!isOpen) return null;

  const filteredData = data?.filter(item => 
    item.cardName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.setName?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.saleDate) - new Date(a.saleDate);
      case 'price':
        return b.salePrice - a.salePrice;
      case 'profit':
        return b.profit - a.profit;
      case 'timeInInventory':
        return Math.max(0, b.daysInInventory || 0) - Math.max(0, a.daysInInventory || 0);
      case 'show':
        return (a.showName || '').localeCompare(b.showName || '');
      case 'name':
        return (a.cardName || '').localeCompare(b.cardName || '');
      default:
        return 0;
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Items Sold Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Search and Sort */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="date">Sort by Date</option>
              <option value="price">Sort by Price</option>
              <option value="profit">Sort by Profit</option>
              <option value="timeInInventory">Sort by Time in Inventory</option>
              <option value="show">Sort by Show</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-lg font-semibold text-gray-900">{sortedData.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-lg font-semibold text-green-600">
                ${sortedData.reduce((sum, item) => sum + (item.salePrice || 0), 0).toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Profit</p>
              <p className="text-lg font-semibold text-blue-600">
                ${sortedData.reduce((sum, item) => sum + (item.profit || 0), 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Items List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {sortedData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No items found</p>
              </div>
            ) : (
              sortedData.map((item, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{item.cardName}</h4>
                      <p className="text-sm text-gray-600">{item.setName}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {item.game}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Sold: {new Date(item.saleDate).toLocaleDateString()}
                        </span>
                        {item.purchaseDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Bought: {new Date(item.purchaseDate).toLocaleDateString()}
                          </span>
                        )}
                        {item.daysInInventory !== undefined && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {Math.max(0, item.daysInInventory).toFixed(1)} days in inventory
                          </span>
                        )}
                        {item.showName && item.showName !== 'Direct Sale' && (
                          <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            <Package className="w-3 h-3" />
                            {item.showName}
                          </span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {item.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-green-600">${item.salePrice?.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">
                        Profit: <span className={item.profit > 0 ? 'text-blue-600' : 'text-red-600'}>
                          ${item.profit?.toFixed(2)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Time Range: {timeRange}</span>
            <span>{sortedData.length} items</span>
          </div>
        </div>
      </div>
    </div>
  );
}
