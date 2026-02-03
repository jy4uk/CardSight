import { useState } from 'react';
import { ArrowLeftRight, Plus, ShoppingBag, Scan, Bookmark, ChevronDown, ChevronUp } from 'lucide-react';
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
  
  // Collapsible section state - all expanded by default
  const [expandedSections, setExpandedSections] = useState({
    purchases: true,
    trades: true,
    savedDeals: true,
    pendingBarcodes: true,
  });
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>

      <main id="main-content" className="max-w-7xl mx-auto px-3 sm:px-4 py-4 pb-24 sm:pb-4">
        <h1 className="sr-only">Intake Dashboard</h1>
        
        {/* Mobile: Stacked full-height sections with scroll | Desktop: 2x2 Grid */}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:h-[calc(100vh-8rem)]">
          {/* Purchases */}
          <section 
            className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col ${expandedSections.purchases ? 'min-h-[70vh] sm:min-h-[50vh] lg:min-h-0' : ''}`}
            aria-labelledby="purchases-heading"
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 sticky top-0 z-10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleSection('purchases')}
                  className="flex items-center gap-2 min-h-[44px]"
                  aria-expanded={expandedSections.purchases}
                >
                  <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <h2 id="purchases-heading" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Purchases</h2>
                  {expandedSections.purchases ? (
                    <ChevronUp className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors min-h-[44px]"
                  aria-label="Record new purchase"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Record</span> Purchase
                </button>
              </div>
            </div>
            {expandedSections.purchases && (
              <div className="flex-1 overflow-y-auto p-4">
                <PurchaseHistory 
                  inventoryItems={inventoryItems}
                  compact={true}
                />
              </div>
            )}
          </section>

          {/* Trades */}
          <section 
            className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col ${expandedSections.trades ? 'min-h-[70vh] sm:min-h-[50vh] lg:min-h-0' : ''}`}
            aria-labelledby="trades-heading"
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 sticky top-0 z-10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleSection('trades')}
                  className="flex items-center gap-2 min-h-[44px]"
                  aria-expanded={expandedSections.trades}
                >
                  <ArrowLeftRight className="w-5 h-5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                  <h2 id="trades-heading" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Trades</h2>
                  {expandedSections.trades ? (
                    <ChevronUp className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenTradeModal?.()}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors min-h-[44px]"
                  aria-label="Record new trade"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Record</span> Trade
                </button>
              </div>
            </div>
            {expandedSections.trades && (
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
            )}
          </section>

          {/* Saved Deals */}
          <section 
            className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col ${expandedSections.savedDeals ? 'min-h-[70vh] sm:min-h-[50vh] lg:min-h-0' : ''}`}
            aria-labelledby="saved-deals-heading"
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 sticky top-0 z-10 rounded-t-xl">
              <button
                onClick={() => toggleSection('savedDeals')}
                className="w-full flex items-center justify-between min-h-[44px]"
                aria-expanded={expandedSections.savedDeals}
              >
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <h2 id="saved-deals-heading" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Saved Deals</h2>
                </div>
                {expandedSections.savedDeals ? (
                  <ChevronUp className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                )}
              </button>
            </div>
            {expandedSections.savedDeals && (
              <div className="flex-1 overflow-y-auto p-4">
                <SavedDeals 
                  onResumePurchase={handleResumePurchase}
                  onResumeTrade={handleResumeTrade}
                />
              </div>
            )}
          </section>

          {/* Pending Barcodes */}
          <section 
            className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col ${expandedSections.pendingBarcodes ? 'min-h-[70vh] sm:min-h-[50vh] lg:min-h-0' : ''}`}
            aria-labelledby="pending-barcodes-heading"
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 sticky top-0 z-10 rounded-t-xl">
              <button
                onClick={() => toggleSection('pendingBarcodes')}
                className="w-full flex items-center justify-between min-h-[44px]"
                aria-expanded={expandedSections.pendingBarcodes}
              >
                <div className="flex items-center gap-2">
                  <Scan className="w-5 h-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                  <h2 id="pending-barcodes-heading" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pending Barcodes</h2>
                </div>
                {expandedSections.pendingBarcodes ? (
                  <ChevronUp className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                )}
              </button>
            </div>
            {expandedSections.pendingBarcodes && (
              <div className="flex-1 overflow-y-auto p-4">
                <PendingBarcodes onComplete={onPurchaseComplete} />
              </div>
            )}
          </section>
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
