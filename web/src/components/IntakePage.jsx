import { useState } from 'react';
import { ArrowLeftRight, Plus, ShoppingBag, Scan } from 'lucide-react';
import PurchaseHistory from './PurchaseHistory';
import TradeHistory from './TradeHistory';
import AddPurchaseModal from './modals/AddPurchaseModal';
import PendingBarcodes from './PendingBarcodes';

export default function IntakePage({ 
  trades, 
  inventoryItems,
  onOpenTradeModal, 
  onDeleteTrade, 
  onRefreshTrades,
  onPurchaseComplete 
}) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPendingBarcodes, setShowPendingBarcodes] = useState(false);

  const handlePurchaseComplete = () => {
    setShowPurchaseModal(false);
    if (onPurchaseComplete) onPurchaseComplete();
  };

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-8rem)]">
          {/* Left Column - Purchases */}
          <div className="flex flex-col min-h-0 gap-4">
            {/* Scan Pending Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div 
                className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 cursor-pointer"
                onClick={() => setShowPendingBarcodes(!showPendingBarcodes)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scan className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Scan Pending</h2>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {showPendingBarcodes ? 'Click to collapse' : 'Click to expand'}
                  </span>
                </div>
              </div>
              {showPendingBarcodes && (
                <div className="p-4">
                  <PendingBarcodes onComplete={onPurchaseComplete} />
                </div>
              )}
            </div>

            {/* Purchases Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Purchases</h2>
                  </div>
                  <button
                    onClick={() => setShowPurchaseModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Record Purchase
                  </button>
                </div>
              </div>

              {/* Purchase History */}
              <div className="flex-1 overflow-y-auto p-4">
                <PurchaseHistory 
                  inventoryItems={inventoryItems}
                  compact={true}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Trades */}
          <div className="flex flex-col min-h-0">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Trades</h2>
                  </div>
                  <button
                    onClick={onOpenTradeModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
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

      {/* Add Purchase Modal */}
      <AddPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        inventoryItems={inventoryItems}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </>
  );
}
