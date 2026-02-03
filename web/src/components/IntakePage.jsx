import { useState } from 'react';
import { ArrowLeftRight, Plus, ShoppingBag, Scan, Bookmark } from 'lucide-react';
import PurchaseHistory from './PurchaseHistory';
import TradeHistory from './TradeHistory';
import AddPurchaseModal from './modals/AddPurchaseModal';
import PendingBarcodes from './PendingBarcodes';
import SavedDeals from './SavedDeals';
import { useSavedDeals } from '../context/SavedDealsContext';
import { updateTradeItem } from '../api';

export default function IntakePage({ 
  trades, 
  inventoryItems,
  onOpenTradeModal, 
  onDeleteTrade, 
  onRefreshTrades,
  onPurchaseComplete 
}) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [resumedPurchaseData, setResumedPurchaseData] = useState(null);
  const [resumedTradeData, setResumedTradeData] = useState(null);
  const { deleteDeal } = useSavedDeals();

  const handlePurchaseComplete = () => {
    setShowPurchaseModal(false);
    setResumedPurchaseData(null);
    if (onPurchaseComplete) onPurchaseComplete();
  };

  const handleResumePurchase = (deal) => {
    setResumedPurchaseData(deal);
    setShowPurchaseModal(true);
  };

  const handleResumeTrade = (deal) => {
    setResumedTradeData(deal);
    onOpenTradeModal?.(deal);
  };

  const handlePurchaseModalClose = () => {
    setShowPurchaseModal(false);
    setResumedPurchaseData(null);
  };

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* 2x2 Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-8rem)]">
          {/* Top Left - Purchases */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-0">
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
            <div className="flex-1 overflow-y-auto p-4">
              <PurchaseHistory 
                inventoryItems={inventoryItems}
                compact={true}
              />
            </div>
          </div>

          {/* Top Right - Trades */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Trades</h2>
                </div>
                <button
                  onClick={() => onOpenTradeModal?.()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Record Trade
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <TradeHistory 
                trades={trades} 
                onDelete={onDeleteTrade}
                onRefresh={onRefreshTrades}
                onUpdateTradeItem={async (itemId, field, value) => {
                  await updateTradeItem(itemId, field, value);
                  onRefreshTrades?.();
                }}
                compact={true}
              />
            </div>
          </div>

          {/* Bottom Left - Saved Deals */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Saved Deals</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SavedDeals 
                onResumePurchase={handleResumePurchase}
                onResumeTrade={handleResumeTrade}
              />
            </div>
          </div>

          {/* Bottom Right - Pending Barcodes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20">
              <div className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pending Barcodes</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PendingBarcodes onComplete={onPurchaseComplete} />
            </div>
          </div>
        </div>
      </main>

      {/* Add Purchase Modal */}
      <AddPurchaseModal
        isOpen={showPurchaseModal}
        onClose={handlePurchaseModalClose}
        inventoryItems={inventoryItems}
        onPurchaseComplete={handlePurchaseComplete}
        resumedDeal={resumedPurchaseData}
      />
    </>
  );
}
