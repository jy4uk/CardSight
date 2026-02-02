import { useState } from 'react';
import { Bookmark, ShoppingBag, ArrowLeftRight, Trash2, Play, AlertTriangle, Clock, User, Loader2 } from 'lucide-react';
import { useSavedDeals } from '../context/SavedDealsContext';
import { formatDate } from '../utils';

export default function SavedDeals({ onResumePurchase, onResumeTrade, compact = false }) {
  const { savedDeals, loading, deleteDeal, getDeal } = useSavedDeals();
  const [deletingId, setDeletingId] = useState(null);
  const [resumingId, setResumingId] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this saved deal? This cannot be undone.')) return;
    setDeletingId(id);
    await deleteDeal(id);
    setDeletingId(null);
  };

  const handleResume = async (deal) => {
    setResumingId(deal.id);
    
    // Fetch full deal data with availability check
    const result = await getDeal(deal.id);
    
    if (!result.success) {
      alert('Failed to load deal: ' + result.error);
      setResumingId(null);
      return;
    }

    const fullDeal = result.deal;
    
    // Check for unavailable items and warn user
    if (fullDeal.has_unavailable_items && fullDeal.unavailable_items?.length > 0) {
      const itemNames = fullDeal.unavailable_items.map(i => i.card_name).join(', ');
      const proceed = window.confirm(
        `Warning: Some items in this trade are no longer available:\n\n${itemNames}\n\nThese items have been sold or traded since this deal was saved. Do you want to continue anyway? You'll need to remove or replace these items.`
      );
      if (!proceed) {
        setResumingId(null);
        return;
      }
    }

    // Resume the appropriate modal
    if (deal.deal_type === 'purchase') {
      onResumePurchase?.(fullDeal);
    } else {
      onResumeTrade?.(fullDeal);
    }
    
    setResumingId(null);
  };

  if (loading && savedDeals.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading saved deals...
      </div>
    );
  }

  if (savedDeals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No saved deals yet</p>
        <p className="text-xs mt-1">Save a purchase or trade quote to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {savedDeals.map((deal) => {
        const isPurchase = deal.deal_type === 'purchase';
        const hasWarning = deal.has_unavailable_items;
        const isDeleting = deletingId === deal.id;
        const isResuming = resumingId === deal.id;
        
        return (
          <div
            key={deal.id}
            className={`rounded-lg p-3 border transition-colors ${
              hasWarning 
                ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700' 
                : 'bg-gray-50 border-gray-200 dark:bg-slate-700 dark:border-slate-600'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`p-2 rounded-lg ${isPurchase ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-violet-100 dark:bg-violet-900/30'}`}>
                {isPurchase ? (
                  <ShoppingBag className={`w-4 h-4 ${isPurchase ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400'}`} />
                ) : (
                  <ArrowLeftRight className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    isPurchase 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' 
                      : 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
                  }`}>
                    {isPurchase ? 'Purchase' : 'Trade'}
                  </span>
                  {hasWarning && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3 h-3" />
                      Items unavailable
                    </span>
                  )}
                </div>
                
                {deal.customer_name && (
                  <div className="flex items-center gap-1 mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <User className="w-3 h-3 text-gray-400" />
                    {deal.customer_name}
                  </div>
                )}
                
                {deal.customer_note && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {deal.customer_note}
                  </p>
                )}
                
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{deal.total_items} card{deal.total_items !== 1 ? 's' : ''}</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    ${Number(deal.total_value || 0).toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(deal.created_at)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleResume(deal)}
                  disabled={isResuming || isDeleting}
                  className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isResuming ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  Resume
                </button>
                <button
                  onClick={() => handleDelete(deal.id)}
                  disabled={isResuming || isDeleting}
                  className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
