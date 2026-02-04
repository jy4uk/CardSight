import { X, Package } from 'lucide-react';

export default function InventoryTypeModal({ isOpen, onClose, data }) {
  if (!isOpen) return null;

  // Calculate total value for percentage calculations
  const totalValue = data?.reduce((sum, item) => sum + item.totalValue, 0) || 0;
  const totalCount = data?.reduce((sum, item) => sum + item.count, 0) || 0;

  // Colors for different inventory types
  const colors = {
    'Singles': '#3B82F6', // blue
    'PSA Slabs': '#EF4444', // red
    'BGS Slabs': '#000000', // black
    'CGC Slabs': '#EAB308', // yellow
  };

  // Generate pie chart segments
  const generateSegments = () => {
    if (!data || data.length === 0) return [];

    let currentAngle = -90; // Start from top
    const segments = [];

    data.forEach((item) => {
      const percentage = (item.count / totalCount) * 100;
      const angle = (percentage / 100) * 360;
      
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      // Calculate SVG path for pie segment
      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (endAngle * Math.PI) / 180;

      const x1 = 50 + 40 * Math.cos(startAngleRad);
      const y1 = 50 + 40 * Math.sin(startAngleRad);
      const x2 = 50 + 40 * Math.cos(endAngleRad);
      const y2 = 50 + 40 * Math.sin(endAngleRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = [
        `M 50 50`,
        `L ${x1} ${y1}`,
        `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      segments.push({
        path: pathData,
        color: colors[item.inventoryType] || '#6B7280',
        inventoryType: item.inventoryType,
        count: item.count,
        totalValue: item.totalValue,
        percentage: percentage.toFixed(1)
      });

      currentAngle = endAngle;
    });

    return segments;
  };

  const segments = generateSegments();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Inventory Type Breakdown</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {data && data.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pie Chart */}
              <div className="flex flex-col items-center">
                <svg width="200" height="200" viewBox="0 0 100 100" className="w-full max-w-xs">
                  {segments.map((segment, index) => (
                    <g key={index}>
                      <path
                        d={segment.path}
                        fill={segment.color}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                        title={`${segment.inventoryType}: ${segment.count} items ($${segment.totalValue.toLocaleString()})`}
                      />
                    </g>
                  ))}
                </svg>
                
                {/* Legend */}
                <div className="mt-6 space-y-2 w-full">
                  {segments.map((segment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {segment.inventoryType}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {segment.count} ({segment.percentage}%)
                        </div>
                        <div className="text-xs text-gray-500">
                          ${segment.totalValue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details Table */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Detailed Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Type</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-700">Count</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-700">Value</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-700">Avg Value</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-700">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded" 
                                style={{ backgroundColor: colors[item.inventoryType] || '#6B7280' }}
                              />
                              <span className="font-medium text-gray-900">
                                {item.inventoryType}
                              </span>
                            </div>
                          </td>
                          <td className="text-right py-2 px-3 text-gray-900">
                            {item.count.toLocaleString()}
                          </td>
                          <td className="text-right py-2 px-3 text-gray-900">
                            ${item.totalValue.toLocaleString()}
                          </td>
                          <td className="text-right py-2 px-3 text-gray-900">
                            ${item.count > 0 ? (item.totalValue / item.count).toFixed(2) : '0.00'}
                          </td>
                          <td className="text-right py-2 px-3 text-gray-900">
                            {((item.count / totalCount) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200">
                        <td className="py-2 px-3 font-semibold text-gray-900">Total</td>
                        <td className="text-right py-2 px-3 font-semibold text-gray-900">
                          {totalCount.toLocaleString()}
                        </td>
                        <td className="text-right py-2 px-3 font-semibold text-gray-900">
                          ${totalValue.toLocaleString()}
                        </td>
                        <td className="text-right py-2 px-3 font-semibold text-gray-900">
                          ${totalCount > 0 ? (totalValue / totalCount).toFixed(2) : '0.00'}
                        </td>
                        <td className="text-right py-2 px-3 font-semibold text-gray-900">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No inventory data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
