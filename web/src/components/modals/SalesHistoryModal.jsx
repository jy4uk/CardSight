import { X } from 'lucide-react';

export default function SalesHistoryModal({ isOpen, onClose, data, title = 'Sales Trend', showPriceComparison = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {showPriceComparison ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Sales Column */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 text-green-600">Card Sales</h3>
                <div className="space-y-2">
                  {data?.recentTransactions?.filter(t => t.transactionType === 'sale').slice(0, 5).map((item, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="font-medium text-gray-900">{item.cardName}</p>
                      <p className="text-sm text-gray-500">{item.setName}</p>
                      <p className="font-semibold text-green-600">${item.value.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-700">Avg Sale Price</p>
                  <p className="text-xl font-bold text-green-800">${data?.avgSalePrice?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
              
              {/* Trades Column */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 text-orange-600">Card Trades</h3>
                <div className="space-y-2">
                  {data?.recentTransactions?.filter(t => t.transactionType === 'trade').slice(0, 5).map((item, index) => (
                    <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="font-medium text-gray-900">{item.cardName}</p>
                      <p className="text-sm text-gray-500">{item.setName}</p>
                      <p className="font-semibold text-orange-600">${item.value.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-orange-100 rounded-lg">
                  <p className="text-sm text-orange-700">Avg Trade Value</p>
                  <p className="text-xl font-bold text-orange-800">${data?.avgTradePrice?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-500">
            {showPriceComparison ? (
              <>
                <span>Sales vs trades</span>
                <span></span>
              </>
            ) : (
              <>
                <span>{data?.length || 0} days of data</span>
                <span>Total revenue: ${data?.reduce((sum, day) => sum + (day.revenue || 0), 0).toFixed(2)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
