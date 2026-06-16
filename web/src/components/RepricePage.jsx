import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Check, CheckCheck, Save, ArrowUpDown, ArrowUp, ArrowDown, Search, Package, Undo2, Loader2, DollarSign, TrendingUp, TrendingDown, Minus, Filter, ExternalLink, X } from 'lucide-react';
import { fetchRepricePreview, bulkReprice } from '../api';
import AlertModal from './AlertModal';

const gameLabels = {
  'pokemon': 'PKM',
  'onepiece': 'OP',
  'mtg': 'MTG',
  'yugioh': 'YGO',
};

const gradeColors = {
  'psa': 'bg-red-500 text-white',
  'bgs': 'bg-slate-800 text-white',
  'cgc': 'bg-amber-400 text-amber-950',
};

const conditionMap = {
  'NM': 'Near+Mint',
  'LP': 'Lightly+Played',
  'MP': 'Moderately+Played',
  'HP': 'Heavily+Played',
  'DMG': 'Damaged',
};

function getPricingLink(item) {
  const isGraded = item.card_type && item.card_type !== 'raw';

  if (isGraded) {
    // Card Ladder for graded cards — uses cert_number
    if (item.cert_number) {
      return {
        url: 'https://app.cardladder.com/sales-history',
        label: 'Card Ladder',
        certNumber: item.cert_number,
      };
    }
    return null;
  }

  // TCGPlayer for raw cards — needs product URL
  if (item.tcg_product_url) {
    const condition = conditionMap[item.condition] || 'Near+Mint';
    const separator = item.tcg_product_url.includes('?') ? '&' : '?';
    return {
      url: `${item.tcg_product_url}${separator}Language=English&Condition=${condition}&page=1`,
      label: 'TCGPlayer',
      certNumber: null,
    };
  }

  // Fallback search URL if we have a card name but no direct product URL
  if (item.card_name) {
    const q = [item.card_name, item.set_name, item.card_number].filter(Boolean).join(' ');
    return {
      url: `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(q.trim())}&page=1`,
      label: 'TCGPlayer',
      certNumber: null,
    };
  }

  return null;
}

export default function RepricePage({ onComplete }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('price_high');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'has_tcg', 'changed', 'no_tcg'
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'error', message: '' });

  // newPrices stores the user's edits: { [itemId]: newPrice }
  const [newPrices, setNewPrices] = useState({});
  // Suggestions the user explicitly dismissed without approving — keeps them out of "needs approval"
  const [rejectedIds, setRejectedIds] = useState(new Set());

  const loadPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRepricePreview();
      setItems(data.items || []);
      setNewPrices({});
      setRejectedIds(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const showAlert = (type, message) => {
    setAlertModal({ isOpen: true, type, message });
  };

  // Get the effective new price for an item (what will be saved)
  const getNewPrice = (item) => {
    if (newPrices[item.id] !== undefined) return newPrices[item.id];
    return null; // no change
  };

  const setItemPrice = (itemId, price) => {
    setNewPrices(prev => {
      const next = { ...prev };
      if (price === null || price === undefined) {
        delete next[itemId];
      } else {
        next[itemId] = price;
      }
      return next;
    });
  };

  // Does this item have a suggestion the user hasn't approved or rejected yet?
  const needsApproval = (item) => {
    if (item.suggested_price == null) return false;
    if (newPrices[item.id] !== undefined) return false; // already approved (staged)
    if (rejectedIds.has(item.id)) return false;
    const suggested = parseFloat(item.suggested_price);
    const current = parseFloat(item.front_label_price) || 0;
    return Math.round(suggested * 100) !== Math.round(current * 100);
  };

  // Approve the suggested price for a single item (TCGCSV for raw, CardLadder algorithm for graded)
  const approveSuggestion = (item) => {
    if (item.suggested_price != null) {
      setItemPrice(item.id, parseFloat(item.suggested_price));
      setRejectedIds(prev => {
        if (!prev.has(item.id)) return prev;
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Approve every suggestion still awaiting a decision
  const approveAllSuggestions = () => {
    const updates = {};
    for (const item of items) {
      if (needsApproval(item)) {
        updates[item.id] = parseFloat(item.suggested_price);
      }
    }
    setNewPrices(prev => ({ ...prev, ...updates }));
  };

  // Dismiss a suggestion without applying it — keeps it out of "needs approval"
  const rejectSuggestion = (itemId) => {
    setRejectedIds(prev => new Set(prev).add(itemId));
  };

  // Bring a rejected suggestion back into "needs approval"
  const unrejectSuggestion = (itemId) => {
    setRejectedIds(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  // Revert a single item
  const revertItem = (itemId) => {
    setItemPrice(itemId, null);
  };

  // Revert all changes
  const revertAll = () => {
    setNewPrices({});
  };

  // Count of items with changes
  const changedCount = Object.keys(newPrices).length;

  // Calculate total price delta
  const totalDelta = useMemo(() => {
    let delta = 0;
    for (const [id, newPrice] of Object.entries(newPrices)) {
      const item = items.find(i => i.id === parseInt(id));
      if (item) {
        delta += newPrice - (parseFloat(item.front_label_price) || 0);
      }
    }
    return delta;
  }, [newPrices, items]);

  // Save all changes
  const handleSave = async () => {
    if (changedCount === 0) return;

    setSaving(true);
    try {
      const updates = Object.entries(newPrices).map(([id, front_label_price]) => ({
        id: parseInt(id),
        front_label_price,
      }));

      const result = await bulkReprice(updates);
      showAlert('success', `Updated ${result.updated} item${result.updated !== 1 ? 's' : ''} successfully!`);
      
      // Reload to reflect saved prices
      await loadPreview();
    } catch (err) {
      showAlert('error', 'Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filtered & sorted items
  const displayItems = useMemo(() => {
    let filtered = items;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.card_name?.toLowerCase().includes(q) ||
        item.set_name?.toLowerCase().includes(q) ||
        item.barcode_id?.toLowerCase().includes(q)
      );
    }

    // Mode filter
    if (filterMode === 'has_tcg') {
      filtered = filtered.filter(item => item.suggested_price != null);
    } else if (filterMode === 'no_tcg') {
      filtered = filtered.filter(item => item.suggested_price == null);
    } else if (filterMode === 'changed') {
      filtered = filtered.filter(item => newPrices[item.id] !== undefined);
    } else if (filterMode === 'needs_approval') {
      filtered = filtered.filter(item => needsApproval(item));
    }

    // Sort
    const sorted = [...filtered];
    switch (sortField) {
      case 'price_high':
        sorted.sort((a, b) => (parseFloat(b.front_label_price) || 0) - (parseFloat(a.front_label_price) || 0));
        break;
      case 'price_low':
        sorted.sort((a, b) => (parseFloat(a.front_label_price) || 0) - (parseFloat(b.front_label_price) || 0));
        break;
      case 'name_asc':
        sorted.sort((a, b) => (a.card_name || '').localeCompare(b.card_name || ''));
        break;
      case 'delta':
        sorted.sort((a, b) => {
          const deltaA = newPrices[a.id] !== undefined ? newPrices[a.id] - (parseFloat(a.front_label_price) || 0) : 0;
          const deltaB = newPrices[b.id] !== undefined ? newPrices[b.id] - (parseFloat(b.front_label_price) || 0) : 0;
          return Math.abs(deltaB) - Math.abs(deltaA);
        });
        break;
      default:
        break;
    }

    return sorted;
  }, [items, searchQuery, filterMode, sortField, newPrices, rejectedIds]);

  // Stats
  const stats = useMemo(() => {
    const withTCG = items.filter(i => i.suggested_price != null).length;
    const withoutTCG = items.length - withTCG;
    const totalCurrentValue = items.reduce((sum, i) => sum + (parseFloat(i.front_label_price) || 0), 0);
    const pendingApproval = items.filter(i => needsApproval(i)).length;
    return { total: items.length, withTCG, withoutTCG, totalCurrentValue, pendingApproval };
  }, [items, newPrices, rejectedIds]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-8">
        <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading inventory for repricing...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-8">
        <div className="text-center text-red-600 dark:text-red-400">
          <p>Error: {error}</p>
          <button onClick={loadPreview} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 pb-32 sm:pb-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Reprice Inventory</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.total} items &middot; {stats.withTCG} with suggested prices
              {stats.pendingApproval > 0 && (
                <> &middot; <span className="font-semibold text-amber-600 dark:text-amber-400">{stats.pendingApproval} need approval</span></>
              )}
              {' '}&middot; ${stats.totalCurrentValue.toFixed(0)} total value
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadPreview}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {changedCount > 0 && (
              <button
                onClick={revertAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Revert All
              </button>
            )}
            <button
              onClick={approveAllSuggestions}
              disabled={stats.pendingApproval === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-4 h-4" />
              Approve All ({stats.pendingApproval})
            </button>
          </div>
        </div>
      </div>

      {/* Search + Filters + Sort row */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Items ({stats.total})</option>
            <option value="needs_approval">Needs Approval ({stats.pendingApproval})</option>
            <option value="has_tcg">Has Suggested Price ({stats.withTCG})</option>
            <option value="no_tcg">No Suggested Price ({stats.withoutTCG})</option>
            <option value="changed">Changed ({changedCount})</option>
          </select>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="price_high">Price: High → Low</option>
            <option value="price_low">Price: Low → High</option>
            <option value="name_asc">Name: A → Z</option>
            <option value="delta">Biggest Change</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Desktop table header */}
        <div className="hidden sm:grid grid-cols-[auto_1fr_120px_120px_120px_100px_140px] gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <div className="w-10"></div>
          <div>Card</div>
          <div className="text-right">Current Price</div>
          <div className="text-right">Est Market Price</div>
          <div className="text-right">New Price</div>
          <div className="text-center">Delta</div>
          <div className="text-center">Actions</div>
        </div>

        {/* Items */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[calc(100vh-320px)] overflow-y-auto">
          {displayItems.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
              {searchQuery || filterMode !== 'all' ? 'No items match your filters' : 'No items in inventory'}
            </div>
          ) : (
            displayItems.map(item => (
              <RepriceRow
                key={item.id}
                item={item}
                newPrice={getNewPrice(item)}
                needsApproval={needsApproval(item)}
                isRejected={rejectedIds.has(item.id)}
                onPriceChange={(price) => setItemPrice(item.id, price)}
                onApprove={() => approveSuggestion(item)}
                onReject={() => rejectSuggestion(item.id)}
                onUnreject={() => unrejectSuggestion(item.id)}
                onRevert={() => revertItem(item.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Sticky Save Bar */}
      {changedCount > 0 && (
        <div className="fixed bottom-0 sm:bottom-4 left-0 right-0 sm:left-auto sm:right-auto sm:max-w-2xl sm:mx-auto z-40 px-3 sm:px-0 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white dark:bg-slate-800 rounded-t-xl sm:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {changedCount} item{changedCount !== 1 ? 's' : ''} changed
              </p>
              <p className={`text-xs font-medium ${totalDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {totalDelta >= 0 ? '+' : ''}{totalDelta.toFixed(2)} net change
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={revertAll}
                className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Revert
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => {
          setAlertModal({ isOpen: false, type: 'error', message: '' });
          if (alertModal.type === 'success' && onComplete) {
            onComplete();
          }
        }}
        type={alertModal.type}
        message={alertModal.message}
        showCancel={false}
      />
    </div>
  );
}

function RepriceRow({ item, newPrice, needsApproval, isRejected, onPriceChange, onApprove, onReject, onUnreject, onRevert }) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const currentPrice = parseFloat(item.front_label_price) || 0;
  const tcgPrice = item.suggested_price != null ? parseFloat(item.suggested_price) : null;
  const confidence = item.suggested_confidence;
  const breakdown = item.suggested_price_breakdown;
  const confidenceColors = {
    high: 'text-emerald-600 dark:text-emerald-400',
    medium: 'text-amber-600 dark:text-amber-400',
    low: 'text-slate-400 dark:text-slate-500',
  };
  const suggestionTooltip = breakdown
    ? (breakdown.dataSource === 'cardladder'
        ? `CardLadder · ${breakdown.sampleSize} sale${breakdown.sampleSize !== 1 ? 's' : ''} (${breakdown.liquidityTier} liquidity) · trend ${breakdown.trend}${breakdown.trend !== 'insufficient_data' ? ` (${breakdown.trendPct > 0 ? '+' : ''}${breakdown.trendPct}%)` : ''} · confidence: ${confidence}`
        : breakdown.dataSource === 'tcgcsv'
          ? `TCGPlayer market price · synced ${breakdown.priceAgeHours != null ? `${breakdown.priceAgeHours}h ago` : 'unknown'} · confidence: ${confidence}`
          : breakdown.reason === 'no_sales_data' ? 'No CardLadder sales found for this grade'
          : breakdown.reason === 'no_tcg_match' ? 'No TCGPlayer product match'
          : breakdown.reason || '')
    : '';
  const effectiveNewPrice = newPrice !== null ? newPrice : currentPrice;
  const hasChange = newPrice !== null;
  const delta = hasChange ? newPrice - currentPrice : 0;
  const deltaPercent = currentPrice > 0 && hasChange ? ((delta / currentPrice) * 100) : 0;

  // Sync input value with newPrice state
  useEffect(() => {
    if (!isFocused) {
      setInputValue(hasChange ? newPrice.toFixed(2) : '');
    }
  }, [newPrice, hasChange, isFocused]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      onPriceChange(num);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (inputValue === '' && hasChange) {
      onRevert();
    } else if (inputValue !== '') {
      const num = parseFloat(inputValue);
      if (!isNaN(num) && num >= 0) {
        onPriceChange(Math.round(num * 100) / 100);
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (!hasChange) {
      setInputValue(currentPrice.toFixed(2));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      onRevert();
      setInputValue('');
      e.target.blur();
    } else if (e.key === 'Tab') {
      // Let default tab behavior work — moves to next input
    }
  };

  return (
    <>
      {/* Desktop Row */}
      <div className={`hidden sm:grid grid-cols-[auto_1fr_120px_120px_120px_100px_140px] gap-3 px-4 py-2.5 items-center transition-colors ${hasChange ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : needsApproval ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
        {/* Thumbnail */}
        <div className="w-10 h-14 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
          {item.image_url ? (
            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-4 h-4 text-slate-400" />
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.card_name}</p>
            {item.card_type && item.card_type !== 'raw' && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${gradeColors[item.card_type] || 'bg-slate-600 text-white'}`}>
                {item.card_type.toUpperCase()} {item.grade || ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate">{item.set_name || 'Unknown Set'}</span>
            {item.card_number && <span>#{item.card_number}</span>}
            {item.game && <span className="text-[10px] px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">{gameLabels[item.game] || item.game}</span>}
            {(() => {
              const link = getPricingLink(item);
              if (!link) return null;
              return (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={link.certNumber ? () => navigator.clipboard.writeText(link.certNumber) : undefined}
                  className="inline-flex items-center gap-0.5 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex-shrink-0"
                  title={link.certNumber ? `${link.label} (cert # copied)` : `View on ${link.label}`}
                >
                  {link.label}
                  <ExternalLink className="w-3 h-3" />
                </a>
              );
            })()}
          </div>
        </div>

        {/* Current Price */}
        <div className="text-right">
          <span className={`text-sm font-semibold ${hasChange ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
            ${currentPrice.toFixed(2)}
          </span>
        </div>

        {/* Suggested Market Price */}
        <div className="text-right">
          {tcgPrice ? (
            <div title={suggestionTooltip}>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">${tcgPrice.toFixed(2)}</span>
              {confidence && confidence !== 'none' && (
                <span className={`block text-[10px] font-normal ${confidenceColors[confidence] || ''}`}>{confidence}</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-600" title={suggestionTooltip}>—</span>
          )}
        </div>

        {/* New Price Input */}
        <div className="text-right">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={isFocused ? inputValue : (hasChange ? newPrice.toFixed(2) : '')}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={currentPrice.toFixed(2)}
              className={`w-full pl-5 pr-2 py-1.5 text-sm text-right border rounded-lg transition-colors
                ${hasChange 
                  ? 'border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 font-semibold' 
                  : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'}
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
            />
          </div>
        </div>

        {/* Delta */}
        <div className="text-center">
          {hasChange ? (
            <div className={`inline-flex items-center gap-0.5 text-xs font-semibold ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
              {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {delta > 0 ? '+' : ''}{deltaPercent.toFixed(0)}%
            </div>
          ) : (
            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-1">
          {needsApproval && (
            <>
              <button
                onClick={onApprove}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                title={`Approve · ${suggestionTooltip}`}
              >
                <Check className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                onClick={onReject}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                title="Reject suggestion"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {isRejected && (
            <button
              onClick={onUnreject}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
              title="Bring suggestion back for review"
            >
              Rejected
              <Undo2 className="w-3 h-3" />
            </button>
          )}
          {hasChange && (
            <button
              onClick={onRevert}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Revert change"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Row */}
      <div className={`sm:hidden px-3 py-3 transition-colors ${hasChange ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : needsApproval ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="w-12 h-16 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
            {item.image_url ? (
              <img src={item.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-5 h-5 text-slate-400" />
              </div>
            )}
          </div>

          {/* Info + Price */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.card_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.set_name || 'Unknown Set'}</p>
                {(() => {
                  const link = getPricingLink(item);
                  if (!link) return null;
                  return (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={link.certNumber ? () => navigator.clipboard.writeText(link.certNumber) : undefined}
                      className="inline-flex items-center gap-0.5 text-[11px] text-blue-500 dark:text-blue-400 hover:underline"
                    >
                      {link.label}{link.certNumber ? ' (cert # copied)' : ''}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  );
                })()}
              </div>
              {hasChange && (
                <button onClick={onRevert} className="p-1 text-slate-400">
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Price row */}
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm font-semibold ${hasChange ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                ${currentPrice.toFixed(2)}
              </span>
              {tcgPrice && (
                <span
                  title={suggestionTooltip}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded"
                >
                  Suggested ${tcgPrice.toFixed(2)}
                </span>
              )}
              {hasChange && (
                <span className={`text-xs font-semibold ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  → ${newPrice.toFixed(2)} ({delta > 0 ? '+' : ''}{deltaPercent.toFixed(0)}%)
                </span>
              )}
            </div>

            {/* Approve / Reject for pending suggestions */}
            {needsApproval && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={onApprove}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  onClick={onReject}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            )}
            {isRejected && (
              <button
                onClick={onUnreject}
                className="flex items-center gap-1 mt-2 text-xs text-slate-400"
              >
                Rejected <Undo2 className="w-3 h-3" />
              </button>
            )}

            {/* Inline input on mobile */}
            <div className="mt-2">
              <div className="relative w-32">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={isFocused ? inputValue : (hasChange ? newPrice.toFixed(2) : '')}
                  onChange={handleInputChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  placeholder={currentPrice.toFixed(2)}
                  className={`w-full pl-5 pr-2 py-1.5 text-sm border rounded-lg
                    ${hasChange 
                      ? 'border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 font-semibold' 
                      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'}
                    focus:ring-2 focus:ring-indigo-500`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
