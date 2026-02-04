import { useState } from 'react';
import { X, Package, DollarSign, TrendingUp, Calendar, Filter, Search, Clock } from 'lucide-react';

export default function InsightsModal({ isOpen, onClose, type, data, timeRange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [expandedShows, setExpandedShows] = useState(new Set());

  const toggleShowExpansion = (showId) => {
    const newExpanded = new Set(expandedShows);
    if (newExpanded.has(showId)) {
      newExpanded.delete(showId);
    } else {
      newExpanded.add(showId);
    }
    setExpandedShows(newExpanded);
  };

  if (!isOpen) return null;

  const filteredData = Array.isArray(data) ? data.filter(item => 
    item.cardName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.setName?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

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

  const renderItemsSold = () => (
    <div className="space-y-4">
      {/* Search and Sort */}
      <div className="flex gap-3">
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
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
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
  );

  const renderInventoryDistribution = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.map((game, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 capitalize">{game.game}</h4>
              <span className="text-sm text-gray-500">{game.count} items</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Value:</span>
                <span className="font-medium text-green-600">${game.value?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg Price:</span>
                <span className="font-medium text-gray-900">
                  ${game.count > 0 ? (game.value / game.count).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(game.value / data.reduce((sum, g) => sum + g.value, 0)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSalesTrend = () => (
    <div className="space-y-4">
      <div className="max-h-96 overflow-y-auto">
        {data?.map((day, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{new Date(day.date).toLocaleDateString()}</p>
              <p className="text-sm text-gray-500">{day.sales} sales</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-green-600">${day.revenue?.toFixed(2)}</p>
              {day.profit && (
                <p className="text-sm text-gray-500">Profit: ${day.profit.toFixed(2)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCardShows = () => {
    // Get all recent sales data from parent component
    const allSales = data?.recentSales || [];
    const cardShows = data?.cardShows || [];
    
        
    return (
      <div className="space-y-4">
        <div className="max-h-96 overflow-y-auto">
          {!data?.cardShows || data?.cardShows?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No card shows found</p>
            </div>
          ) : (
            data?.cardShows?.map((show, index) => {
              const showSales = allSales.filter(sale => sale.showId === show.id);
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
                        <p className="font-semibold text-green-600">${show.totalRevenue?.toFixed(2)}</p>
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
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-sm font-semibold text-green-600">${sale.salePrice?.toFixed(2)}</p>
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
    );
  };

  const renderContent = () => {
    switch (type) {
      case 'itemsSold':
        return renderItemsSold();
      case 'inventoryDistribution':
        return renderInventoryDistribution();
      case 'salesTrend':
        return renderSalesTrend();
      case 'cardShows':
        return renderCardShows();
      default:
        return <div>Unknown insights type</div>;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'itemsSold':
        return 'Items Sold Details';
      case 'inventoryDistribution':
        return 'Inventory Distribution';
      case 'salesTrend':
        return 'Sales Trend';
      case 'cardShows':
        return 'Card Shows';
      default:
        return 'Insights';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{getTitle()}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {renderContent()}
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
