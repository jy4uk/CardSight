import { useState } from 'react';
import { Bookmark, ShoppingBag, ArrowLeftRight, Trash2, Play, AlertTriangle, Clock, User, Loader2, Package } from 'lucide-react';
import { useSavedDeals } from '../context/SavedDealsContext';
import { formatDate } from '../utils';
import AlertModal from './AlertModal';

// Extract card images from deal data
const getCardImages = (deal) => {
  const images = [];
  const dealData = deal.deal_data || {};
  
  // For purchases - items array
  if (dealData.items && Array.isArray(dealData.items)) {
    dealData.items.forEach(item => {
      if (item.image_url) {
        images.push({ url: item.image_url, name: item.card_name });
      }
    });
  }
  
  // For trades - tradeInItems and tradeOutItems
  if (dealData.tradeInItems && Array.isArray(dealData.tradeInItems)) {
    dealData.tradeInItems.forEach(item => {
      if (item.image_url) {
        images.push({ url: item.image_url, name: item.card_name });
      }
    });
  }
  if (dealData.tradeOutItems && Array.isArray(dealData.tradeOutItems)) {
    dealData.tradeOutItems.forEach(item => {
      if (item.image_url) {
        images.push({ url: item.image_url, name: item.card_name });
      }
    });
  }
  
  return images;
};

export default function SavedDeals({ onResumePurchase, onResumeTrade, compact = false }) {
  const { savedDeals, loading, deleteDeal, getDeal } = useSavedDeals();
  const [deletingId, setDeletingId] = useState(null);
  const [resumingId, setResumingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [unavailableWarning, setUnavailableWarning] = useState(null); // { deal, itemNames }
  const [errorModal, setErrorModal] = useState(null); // error message

  const handleDelete = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      setDeletingId(deleteConfirm);
      await deleteDeal(deleteConfirm);
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };

  const handleResume = async (deal) => {
    setResumingId(deal.id);
    
    // Fetch full deal data with availability check
    const result = await getDeal(deal.id);
    
    if (!result.success) {
      setErrorModal('Failed to load deal: ' + result.error);
      setResumingId(null);
      return;
    }

    const fullDeal = result.deal;
    
    // Check for unavailable items and warn user
    if (fullDeal.has_unavailable_items && fullDeal.unavailable_items?.length > 0) {
      const itemNames = fullDeal.unavailable_items.map(i => i.card_name).join(', ');
      setUnavailableWarning({ deal: fullDeal, itemNames });
      return;
    }

    // Continue with resume
    resumeDeal(fullDeal);
  };

  const resumeDeal = (fullDeal) => {
    setResumingId(null);
    setUnavailableWarning(null);

    // Resume the appropriate modal
    if (fullDeal.deal_type === 'purchase') {
      onResumePurchase?.(fullDeal);
    } else {
      onResumeTrade?.(fullDeal);
    }
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
    <div className="space-y-3">
      {savedDeals.map((deal) => {
        const isPurchase = deal.deal_type === 'purchase';
        const hasWarning = deal.has_unavailable_items;
        const isDeleting = deletingId === deal.id;
        const isResuming = resumingId === deal.id;
        const cardImages = getCardImages(deal);
        const maxThumbnails = 5;
        const extraCount = cardImages.length - maxThumbnails;
        
        return (
          <div
            key={deal.id}
            className={`rounded-xl overflow-hidden border transition-colors ${
              hasWarning 
                ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700' 
                : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            {/* Card Images Row - Visual preview at top */}
            {cardImages.length > 0 && (
              <div className="flex gap-1 p-3 pb-0 overflow-x-auto">
                {cardImages.slice(0, maxThumbnails).map((img, idx) => (
                  <div
                    key={idx}
                    className="w-14 h-20 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 shadow-sm"
                    title={img.name}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {extraCount > 0 && (
                  <div className="w-14 h-20 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">+{extraCount}</span>
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-3 space-y-3">
              {/* Header Row: Type badge + Warning */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isPurchase ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-violet-100 dark:bg-violet-900/30'}`}>
                    {isPurchase ? (
                      <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowLeftRight className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${
                    isPurchase 
                      ? 'text-emerald-700 dark:text-emerald-400' 
                      : 'text-violet-700 dark:text-violet-400'
                  }`}>
                    {isPurchase ? 'Purchase' : 'Trade'}
                  </span>
                </div>
                {hasWarning && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Unavailable
                  </span>
                )}
              </div>

              {/* Customer Info */}
              {deal.customer_name && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span className="text-base font-medium text-slate-900 dark:text-slate-100">
                    {deal.customer_name}
                  </span>
                </div>
              )}
              
              {deal.customer_note && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {deal.customer_note}
                </p>
              )}

              {/* Stats Row */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400">{deal.total_items} card{deal.total_items !== 1 ? 's' : ''}</span>
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  ${Number(deal.total_value || 0).toFixed(2)}
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 ml-auto">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(deal.created_at)}</span>
                </div>
              </div>

              {/* Actions - Full width buttons on mobile */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleResume(deal)}
                  disabled={isResuming || isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors min-h-[48px]"
                >
                  {isResuming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Resume Deal
                </button>
                <button
                  onClick={() => handleDelete(deal.id)}
                  disabled={isResuming || isDeleting}
                  className="flex items-center justify-center px-4 py-3 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl disabled:opacity-50 transition-colors min-h-[48px] min-w-[48px]"
                >
                  {isDeleting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Delete Confirmation Modal */}
      <AlertModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        type="delete"
        title="Delete Saved Deal"
        message="Delete this saved deal? This cannot be undone."
      />

      {/* Error Modal */}
      <AlertModal
        isOpen={errorModal !== null}
        onClose={() => setErrorModal(null)}
        type="error"
        title="Error"
        message={errorModal}
        showCancel={false}
      />

      {/* Unavailable Items Warning Modal */}
      <AlertModal
        isOpen={unavailableWarning !== null}
        onClose={() => {
          setUnavailableWarning(null);
          setResumingId(null);
        }}
        onConfirm={() => {
          if (unavailableWarning?.deal) {
            resumeDeal(unavailableWarning.deal);
          }
        }}
        type="error"
        title="Items Unavailable"
        message={unavailableWarning ? `Some items in this trade are no longer available:\n\n${unavailableWarning.itemNames}\n\nThese items have been sold or traded since this deal was saved. Do you want to continue anyway? You'll need to remove or replace these items.` : ''}
      />
    </div>
  );
}
