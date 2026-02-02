import { useState, useEffect } from 'react';
import { ShoppingBag, Calendar, DollarSign, ChevronDown, ChevronUp, Package } from 'lucide-react';

export default function PurchaseHistory({ inventoryItems = [], compact = false }) {
  const [expandedDate, setExpandedDate] = useState(null);
  const [stats, setStats] = useState(null);
  const [groupedPurchases, setGroupedPurchases] = useState([]);

  // Group purchases by date and calculate stats
  useEffect(() => {
    // Include all inventory items - they're all purchases
    const purchasedItems = inventoryItems;
    
    if (purchasedItems.length > 0) {
      // Group by date
      const groups = {};
      purchasedItems.forEach(item => {
        // Use purchase_date if available, otherwise use "Unknown Date"
        const itemDate = item.purchase_date ? new Date(item.purchase_date) : null;
        const date = itemDate 
          ? itemDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : 'Unknown Date';
        
        if (!groups[date]) {
          groups[date] = {
            date,
            rawDate: itemDate || new Date(0), // Use epoch for unknown dates (sorts to bottom)
            items: [],
            totalCost: 0,
            totalMarketValue: 0
          };
        }
        groups[date].items.push(item);
        groups[date].totalCost += parseFloat(item.purchase_price || 0);
        groups[date].totalMarketValue += parseFloat(item.front_label_price || 0);
      });

      // Sort by date descending (unknown dates go to bottom)
      const sorted = Object.values(groups).sort((a, b) => {
        if (a.date === 'Unknown Date') return 1;
        if (b.date === 'Unknown Date') return -1;
        return b.rawDate - a.rawDate;
      });
      setGroupedPurchases(sorted);

      // Calculate overall stats
      const totalPurchases = purchasedItems.length;
      const totalSpent = purchasedItems.reduce((sum, item) => sum + parseFloat(item.purchase_price || 0), 0);
      const totalMarketValue = purchasedItems.reduce((sum, item) => sum + parseFloat(item.front_label_price || 0), 0);
      
      setStats({
        totalPurchases,
        totalSpent,
        totalMarketValue,
        profit: totalMarketValue - totalSpent
      });
    } else {
      setGroupedPurchases([]);
      setStats(null);
    }
  }, [inventoryItems]);

  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Stats Summary - hide in compact mode */}
      {stats && !compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600 font-medium">Total Purchases</div>
            <div className="text-xl font-bold text-green-800">{stats.totalPurchases}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 font-medium">Total Spent</div>
            <div className="text-xl font-bold text-blue-800">{formatCurrency(stats.totalSpent)}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs text-purple-600 font-medium">Market Value</div>
            <div className="text-xl font-bold text-purple-800">{formatCurrency(stats.totalMarketValue)}</div>
          </div>
          <div className={`rounded-lg p-3 ${stats.profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className={`text-xs font-medium ${stats.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              Potential Profit
            </div>
            <div className={`text-xl font-bold ${stats.profit >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
              {formatCurrency(stats.profit)}
            </div>
          </div>
        </div>
      )}

      {/* Purchases List */}
      <div className="space-y-3">
        {groupedPurchases.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No purchases recorded yet</p>
            <p className="text-gray-400 text-sm">Use the "Record Purchase" button to add your first purchase</p>
          </div>
        ) : (
          groupedPurchases.map(group => (
            <div key={group.date} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Group Header */}
              <div 
                className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedDate(expandedDate === group.date ? null : group.date)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">
                        {group.items.length} card{group.items.length !== 1 ? 's' : ''} purchased
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 sm:gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {group.date}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(group.totalCost)}
                      </div>
                      <div className="text-xs text-gray-500">spent</div>
                    </div>
                    {expandedDate === group.date ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedDate === group.date && group.items && group.items.length > 0 && (
                <div className="border-t border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <div className="space-y-2">
                    {group.items.map((item, idx) => (
                      <div key={item.id || `item-${idx}`} className="flex items-center gap-3 bg-white rounded-lg p-2 shadow-sm">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.card_name || 'Card'}
                            className="w-10 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {item.card_name || 'Unknown Card'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.set_name && <span>{item.set_name}</span>}
                            {item.card_number && <span> • #{item.card_number}</span>}
                            {item.condition && <span> • {item.condition}</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.purchase_price)}
                          </div>
                          {item.front_label_price && (
                            <div className="text-xs text-gray-500">
                              MV: {formatCurrency(item.front_label_price)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
