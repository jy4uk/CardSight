import { ArrowLeftRight, Plus } from 'lucide-react';
import PurchasePanel from './PurchasePanel';
import TradeHistory from './TradeHistory';

export default function IntakePage({ 
  trades, 
  inventoryItems,
  onOpenTradeModal, 
  onDeleteTrade, 
  onRefreshTrades,
  onPurchaseComplete 
}) {
  return (
    <main className="max-w-7xl mx-auto px-4 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-8rem)]">
        {/* Left Column - Purchases */}
        <div className="flex flex-col min-h-0">
          <PurchasePanel 
            inventoryItems={inventoryItems}
            onPurchaseComplete={onPurchaseComplete}
          />
        </div>

        {/* Right Column - Trades */}
        <div className="flex flex-col min-h-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Trades</h2>
                </div>
                <button
                  onClick={onOpenTradeModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Record Trade
                </button>
              </div>
            </div>

            {/* Trade History */}
            <div className="flex-1 overflow-y-auto p-4">
              <TradeHistory 
                trades={trades} 
                onDelete={onDeleteTrade}
                onRefresh={onRefreshTrades}
                compact={true}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
