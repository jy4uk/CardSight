import { X, BarChart3 } from 'lucide-react';

export default function SalesHistoryModal({ isOpen, onClose, data }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Sales Trend</h2>
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>{data?.length || 0} days of data</span>
            <span>Total revenue: ${data?.reduce((sum, day) => sum + (day.revenue || 0), 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
