import { useState, useEffect } from 'react';
import { ArrowLeftRight, Calendar, User, DollarSign, Trash2, Eye, ChevronDown, ChevronUp } from 'lucide-react';

export default function TradeHistory({ trades = [], onDelete, onRefresh, compact = false }) {
  const [expandedTrade, setExpandedTrade] = useState(null);
  const [stats, setStats] = useState(null);

  // Calculate stats
  useEffect(() => {
    if (trades.length > 0) {
      const totalTrades = trades.length;
      const totalTradeInValue = trades.reduce((sum, t) => sum + parseFloat(t.trade_in_value || 0), 0);
      const totalTradeOutValue = trades.reduce((sum, t) => sum + parseFloat(t.trade_out_total || 0), 0);
      const totalCashIn = trades.reduce((sum, t) => sum + parseFloat(t.cash_from_customer || 0), 0);
      const totalCashOut = trades.reduce((sum, t) => sum + parseFloat(t.cash_to_customer || 0), 0);
      
      setStats({
        totalTrades,
        totalTradeInValue,
        totalTradeOutValue,
        totalCashIn,
        totalCashOut,
        netCash: totalCashIn - totalCashOut
      });
    }
  }, [trades]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDelete = async (tradeId) => {
    if (window.confirm('Are you sure you want to delete this trade? This will restore traded-out items to inventory and remove trade-in items.')) {
      await onDelete(tradeId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Summary - hide in compact mode */}
      {stats && !compact && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs text-purple-600 font-medium">Total Trades</div>
            <div className="text-xl font-bold text-purple-800">{stats.totalTrades}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600 font-medium">Trade-In Value</div>
            <div className="text-xl font-bold text-green-800">${stats.totalTradeInValue.toFixed(2)}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 font-medium">Trade-Out Value</div>
            <div className="text-xl font-bold text-blue-800">${stats.totalTradeOutValue.toFixed(2)}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-xs text-orange-600 font-medium">Cash Received</div>
            <div className="text-xl font-bold text-orange-800">${stats.totalCashIn.toFixed(2)}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-xs text-red-600 font-medium">Cash Paid Out</div>
            <div className="text-xl font-bold text-red-800">${stats.totalCashOut.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Trades List */}
      <div className="space-y-3">
        {trades.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No trades recorded yet</p>
            <p className="text-gray-400 text-sm">Use the "Record Trade" button to add your first trade</p>
          </div>
        ) : (
          trades.map(trade => (
            <div key={trade.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Trade Header */}
              <div 
                className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)}
              >
                {/* Mobile-first layout */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {trade.customer_name || 'Anonymous'}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 sm:gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(trade.trade_date)}
                        </span>
                        <span className="text-purple-600">@ {trade.trade_percentage}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(trade.id); }}
                      className="p-1.5 sm:p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedTrade === trade.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Values Row - responsive grid */}
                <div className="mt-2 sm:mt-3 grid grid-cols-3 gap-2 sm:gap-4 text-center sm:text-right">
                  <div>
                    <div className="text-[10px] sm:text-xs text-gray-500">Trade-In</div>
                    <div className="text-sm sm:text-base font-semibold text-green-600">${parseFloat(trade.trade_in_value || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-gray-500">Trade-Out</div>
                    <div className="text-sm sm:text-base font-semibold text-blue-600">${parseFloat(trade.trade_out_total || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-gray-500">Cash</div>
                    <div className="text-sm sm:text-base font-semibold">
                      {parseFloat(trade.cash_from_customer) > 0 ? (
                        <span className="text-green-600">+${parseFloat(trade.cash_from_customer).toFixed(2)}</span>
                      ) : parseFloat(trade.cash_to_customer) > 0 ? (
                        <span className="text-red-600">-${parseFloat(trade.cash_to_customer).toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-400">$0</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedTrade === trade.id && trade.items && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Trade-In Items */}
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 mb-2">Cards Received (Trade-In)</h4>
                      <div className="space-y-1">
                        {trade.items.filter(i => i.direction === 'in').map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm bg-white p-2 rounded">
                            <span>{item.card_name} <span className="text-gray-400">({item.set_name})</span></span>
                            <span className="font-medium">${parseFloat(item.card_value || 0).toFixed(2)}</span>
                          </div>
                        ))}
                        {trade.items.filter(i => i.direction === 'in').length === 0 && (
                          <p className="text-gray-400 text-sm">No trade-in items</p>
                        )}
                      </div>
                    </div>

                    {/* Trade-Out Items */}
                    <div>
                      <h4 className="text-sm font-semibold text-blue-700 mb-2">Cards Given (Trade-Out)</h4>
                      <div className="space-y-1">
                        {trade.items.filter(i => i.direction === 'out').map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm bg-white p-2 rounded">
                            <span>{item.card_name} <span className="text-gray-400">({item.set_name})</span></span>
                            <span className="font-medium">${parseFloat(item.card_value || 0).toFixed(2)}</span>
                          </div>
                        ))}
                        {trade.items.filter(i => i.direction === 'out').length === 0 && (
                          <p className="text-gray-400 text-sm">No trade-out items</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {trade.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-xs text-gray-500">Notes:</span>
                      <p className="text-sm text-gray-700">{trade.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
