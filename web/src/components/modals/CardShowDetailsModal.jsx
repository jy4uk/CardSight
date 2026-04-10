import { useState } from 'react';
import { X, Package, DollarSign, Calendar, Trash2, TrendingUp, TrendingDown, ShoppingCart, ArrowLeftRight, ChevronDown, ChevronRight, MapPin, Banknote, Link2, Loader2 } from 'lucide-react';
import AlertModal from '../AlertModal';
import { linkExistingToShows } from '../../api';

function fmt(val) {
  const n = Number(val) || 0;
  return n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `$${n.toFixed(2)}`;
}

function ProfitBadge({ value, label }) {
  const n = Number(value) || 0;
  return (
    <div className={`px-3 py-2 rounded-lg text-center ${n >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
      <p className={`text-lg font-bold ${n >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {fmt(n)}
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{label}</p>
    </div>
  );
}

function StatRow({ icon: Icon, label, value, color = 'text-slate-700 dark:text-slate-300' }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className={`text-xs font-semibold ${color}`}>{value}</span>
    </div>
  );
}

export default function CardShowDetailsModal({ isOpen, onClose, cardShows, recentSales, onDeleteShow, onRefresh }) {
  const [expandedShows, setExpandedShows] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, showId: null, showName: '' });
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'error', message: '' });
  const [linking, setLinking] = useState(false);
  const [linkResult, setLinkResult] = useState(null);

  if (!isOpen) return null;

  const toggleShowExpansion = (showId) => {
    const newExpanded = new Set(expandedShows);
    if (newExpanded.has(showId)) {
      newExpanded.delete(showId);
    } else {
      newExpanded.add(showId);
    }
    setExpandedShows(newExpanded);
  };

  const handleDeleteClick = (showId, showName) => {
    setDeleteConfirm({ isOpen: true, showId, showName });
  };

  const handleConfirmDelete = async () => {
    try {
      await onDeleteShow(deleteConfirm.showId);
      setDeleteConfirm({ isOpen: false, showId: null, showName: '' });
    } catch (error) {
      console.error('Error deleting show:', error);
      setDeleteConfirm({ isOpen: false, showId: null, showName: '' });
      setAlertModal({ isOpen: true, type: 'error', message: 'Failed to delete show: ' + error.message });
    }
  };

  const handleLinkExisting = async () => {
    setLinking(true);
    setLinkResult(null);
    try {
      const result = await linkExistingToShows();
      setLinkResult(result.linked);
      onRefresh?.(); // Refresh the shows data
      setAlertModal({ isOpen: true, type: 'success', message: `Linked ${result.linked.trades} trades, ${result.linked.inventory} purchases, ${result.linked.sales} sales` });
    } catch (error) {
      console.error('Error linking existing transactions:', error);
      setAlertModal({ isOpen: true, type: 'error', message: 'Failed to link transactions: ' + error.message });
    } finally {
      setLinking(false);
    }
  };

  // Totals across all shows
  const totals = (cardShows || []).reduce((acc, s) => ({
    cashProfit: acc.cashProfit + (s.cashProfit || 0),
    inventoryValueChange: acc.inventoryValueChange + (s.inventoryValueChange || 0),
    totalRevenue: acc.totalRevenue + (s.totalRevenue || 0),
    totalPurchaseCost: acc.totalPurchaseCost + (s.totalPurchaseCost || 0),
    cardsSold: acc.cardsSold + (s.cardsSold || 0),
    cardsPurchased: acc.cardsPurchased + (s.cardsPurchased || 0),
    tradeCount: acc.tradeCount + (s.tradeCount || 0),
  }), { cashProfit: 0, inventoryValueChange: 0, totalRevenue: 0, totalPurchaseCost: 0, cardsSold: 0, cardsPurchased: 0, tradeCount: 0 });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 w-full sm:max-w-2xl sm:rounded-xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-orange-600 to-amber-600">
          <div className="flex items-center gap-2 text-white">
            <Calendar className="w-5 h-5" />
            <h2 className="text-lg font-bold">Card Shows</h2>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">{cardShows?.length || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            {cardShows?.length > 0 && (
              <button
                onClick={handleLinkExisting}
                disabled={linking}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                title="Link existing transactions to shows by date"
              >
                {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                {linking ? 'Linking...' : 'Link Existing'}
              </button>
            )}
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Totals */}
        {cardShows?.length > 0 && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="grid grid-cols-2 gap-3">
              <ProfitBadge value={totals.cashProfit} label="Total Cash P&L" />
              <ProfitBadge value={totals.inventoryValueChange} label="Total Inventory Δ" />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
              <span>{totals.cardsSold} sold · {totals.cardsPurchased} bought · {totals.tradeCount} trades</span>
              <span>Revenue: {fmt(totals.totalRevenue)}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[55vh]">
          {!cardShows || cardShows?.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-medium">No card shows yet</p>
              <p className="text-sm">Add a show from Insights to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {cardShows?.map((show) => {
                const isExpanded = expandedShows.has(show.id);
                const hasActivity = show.cardsSold > 0 || show.cardsPurchased > 0 || show.tradeCount > 0;
                const showSales = recentSales?.filter(sale => sale.showId === show.id) || [];
                
                return (
                  <div key={show.id}>
                    <div 
                      className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      onClick={() => toggleShowExpansion(show.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{show.showName}</h4>
                          </div>
                          <div className="flex items-center gap-3 mt-1 ml-6 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {show.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(show.showDate).toLocaleDateString()}
                            </span>
                          </div>
                          {/* Activity pills */}
                          {hasActivity && (
                            <div className="flex items-center gap-1.5 mt-2 ml-6 flex-wrap">
                              {show.cardsSold > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                  {show.cardsSold} sold
                                </span>
                              )}
                              {show.cardsPurchased > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                  {show.cardsPurchased} bought
                                </span>
                              )}
                              {show.tradeCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                  {show.tradeCount} trades
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <div className="text-right">
                            <p className={`text-sm font-bold ${show.cashProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {fmt(show.cashProfit)}
                            </p>
                            <p className="text-[10px] text-slate-400">cash P&L</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(show.id, show.showName); }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            title="Delete Show"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded P&L breakdown */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 px-4 py-3">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <ProfitBadge value={show.cashProfit} label="Cash P&L" />
                          <ProfitBadge value={show.inventoryValueChange} label="Inventory Δ" />
                        </div>

                        {/* Sales section */}
                        {show.cardsSold > 0 && (
                          <div className="mb-3">
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                              <DollarSign className="w-3 h-3" /> Sales
                            </p>
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                              <StatRow icon={Package} label="Cards sold" value={show.cardsSold} />
                              <StatRow icon={DollarSign} label="Revenue" value={fmt(show.totalRevenue)} color="text-emerald-600 dark:text-emerald-400" />
                              <StatRow icon={Banknote} label="Cost basis" value={fmt(show.salesCostBasis)} />
                              <StatRow icon={TrendingUp} label="Sales profit" value={fmt(show.salesProfit)} color={show.salesProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} />
                            </div>
                          </div>
                        )}

                        {/* Purchases section */}
                        {show.cardsPurchased > 0 && (
                          <div className="mb-3">
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                              <ShoppingCart className="w-3 h-3" /> Purchases
                            </p>
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                              <StatRow icon={Package} label="Cards purchased" value={show.cardsPurchased} />
                              <StatRow icon={Banknote} label="Total cost" value={fmt(show.totalPurchaseCost)} color="text-rose-600 dark:text-rose-400" />
                              <StatRow icon={TrendingUp} label="Label value" value={fmt(show.purchaseLabelValue)} color="text-emerald-600 dark:text-emerald-400" />
                            </div>
                          </div>
                        )}

                        {/* Trades section */}
                        {show.tradeCount > 0 && (
                          <div className="mb-3">
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                              <ArrowLeftRight className="w-3 h-3" /> Trades
                            </p>
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                              <StatRow icon={ArrowLeftRight} label="Trades" value={show.tradeCount} />
                              <StatRow label="Trade-ins (customer value)" value={fmt(show.tradeInTotal)} />
                              <StatRow label="Trade-ins (label value)" value={fmt(show.tradeInLabelValue)} color="text-emerald-600 dark:text-emerald-400" />
                              <StatRow label="Traded out (value)" value={fmt(show.tradeOutTotal)} color="text-rose-600 dark:text-rose-400" />
                              {show.cashToCustomer > 0 && <StatRow label="Cash to customer" value={fmt(show.cashToCustomer)} color="text-rose-600 dark:text-rose-400" />}
                              {show.cashFromCustomer > 0 && <StatRow label="Cash from customer" value={fmt(show.cashFromCustomer)} color="text-emerald-600 dark:text-emerald-400" />}
                            </div>
                          </div>
                        )}

                        {/* Individual sales list */}
                        {showSales.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Sale Details</p>
                            <div className="space-y-1">
                              {showSales.map((sale, i) => (
                                <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{sale.cardName}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{sale.setName}</p>
                                  </div>
                                  <div className="text-right ml-2 flex-shrink-0">
                                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{fmt(sale.value ?? sale.salePrice)}</p>
                                    <p className={`text-[10px] ${sale.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {fmt(sale.profit)} profit
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!hasActivity && (
                          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-3">No activity linked to this show</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <AlertModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, showId: null, showName: '' })}
        onConfirm={handleConfirmDelete}
        type="delete"
        title="Delete Card Show"
        message={`Are you sure you want to delete "${deleteConfirm.showName}"? This will remove the show and unlink any associated transactions.`}
        showCancel={true}
      />
      
      {/* Error Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, type: 'error', message: '' })}
        type={alertModal.type}
        message={alertModal.message}
        showCancel={false}
      />
    </div>
  );
}
