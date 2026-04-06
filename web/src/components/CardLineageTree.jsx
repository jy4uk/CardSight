import { useState, useEffect } from 'react';
import { fetchCardLineage } from '../api';
import { 
  GitBranch, ShoppingCart, ArrowRightLeft, DollarSign, Package, 
  ChevronDown, ChevronRight, Clock, User, Loader2, AlertCircle
} from 'lucide-react';

const statusColors = {
  'IN_STOCK': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  'SOLD': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  'TRADED': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'PENDING_BARCODE': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
};

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(val) {
  if (val == null) return '$0.00';
  return `$${Number(val).toFixed(2)}`;
}

function OriginBadge({ origin }) {
  if (!origin) return null;
  if (origin.type === 'purchase') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
        <ShoppingCart className="w-3 h-3" />
        Purchased
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
      <ArrowRightLeft className="w-3 h-3" />
      Traded In
    </span>
  );
}

function DestinationBadge({ destination }) {
  if (!destination) return null;
  if (destination.type === 'sold') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
        <DollarSign className="w-3 h-3" />
        Sold {formatCurrency(destination.sale_price)}
      </span>
    );
  }
  if (destination.type === 'trade_out') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
        <ArrowRightLeft className="w-3 h-3" />
        Traded Out
      </span>
    );
  }
  return null;
}

function LineageNode({ node, isRoot = false, isAncestor = false, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = (node.ancestors?.length > 0) || (node.descendants?.length > 0);

  const borderColor = isRoot 
    ? 'border-indigo-400 dark:border-indigo-500' 
    : isAncestor 
      ? 'border-amber-300 dark:border-amber-600' 
      : 'border-emerald-300 dark:border-emerald-600';

  const bgColor = isRoot
    ? 'bg-indigo-50/50 dark:bg-indigo-900/20'
    : 'bg-white dark:bg-slate-800';

  return (
    <div className="relative">
      {/* Connector line from parent */}
      {!isRoot && depth > 0 && (
        <div className="absolute -top-3 left-6 w-px h-3 bg-slate-300 dark:bg-slate-600" />
      )}

      <div
        className={`rounded-lg border-2 ${borderColor} ${bgColor} p-3 transition-all ${
          hasChildren ? 'cursor-pointer hover:shadow-md' : ''
        }`}
        onClick={hasChildren ? () => setExpanded(!expanded) : undefined}
      >
        <div className="flex items-start gap-3">
          {/* Card thumbnail */}
          <div className="w-10 h-14 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
            {node.image_url ? (
              <img src={node.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-4 h-4 text-slate-400" />
              </div>
            )}
          </div>

          {/* Card info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-semibold text-sm truncate ${isRoot ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-slate-100'}`}>
                {node.card_name}
              </h4>
              {isRoot && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300">
                  THIS CARD
                </span>
              )}
              {hasChildren && (
                expanded 
                  ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> 
                  : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{node.set_name || 'Unknown Set'}</p>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <OriginBadge origin={node.origin} />
              {node.status && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[node.status] || 'bg-slate-100 text-slate-600'}`}>
                  {node.status}
                </span>
              )}
              <DestinationBadge destination={node.destination} />
            </div>

            {/* Price / trade details */}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {node.origin?.type === 'purchase' && (
                <span>Bought: {formatCurrency(node.purchase_price)}</span>
              )}
              {node.origin?.type === 'trade_in' && (
                <>
                  <span>
                    <User className="w-3 h-3 inline mr-0.5" />
                    {node.origin.customer_name || 'Customer'}
                  </span>
                  <span>Value: {formatCurrency(node.origin.card_value)}</span>
                  <span>Credit: {formatCurrency(node.origin.trade_value)}</span>
                </>
              )}
              {node.origin?.trade_date && (
                <span>
                  <Clock className="w-3 h-3 inline mr-0.5" />
                  {formatDate(node.origin.trade_date)}
                </span>
              )}
              {node.origin?.type === 'purchase' && node.purchase_date && (
                <span>
                  <Clock className="w-3 h-3 inline mr-0.5" />
                  {formatDate(node.purchase_date)}
                </span>
              )}
              {node.front_label_price && (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Label: {formatCurrency(node.front_label_price)}
                </span>
              )}
            </div>

            {/* Sibling cards that came in from the same trade */}
            {node.origin?.siblings?.length > 0 && expanded && (
              <div className="mt-2 pl-2 border-l-2 border-dashed border-slate-200 dark:border-slate-600">
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Also received in this trade
                </p>
                {node.origin.siblings.map((sib, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                    <span className="truncate">{sib.card_name}</span>
                    {sib.card_value && <span className="text-slate-400">{formatCurrency(sib.card_value)}</span>}
                    {sib.status && (
                      <span className={`px-1 py-0.5 rounded text-[9px] ${statusColors[sib.status] || ''}`}>
                        {sib.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Trade-out destination details */}
            {node.destination?.type === 'trade_out' && expanded && (
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  <User className="w-3 h-3 inline mr-0.5" />
                  Traded to {node.destination.customer_name || 'customer'}
                </span>
                <span className="ml-2">
                  <Clock className="w-3 h-3 inline mr-0.5" />
                  {formatDate(node.destination.trade_date)}
                </span>
                <span className="ml-2">Value: {formatCurrency(node.destination.card_value)}</span>
              </div>
            )}
            {node.destination?.type === 'sold' && expanded && (
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>Sold for {formatCurrency(node.destination.sale_price)}</span>
                {node.destination.payment_method && (
                  <span className="ml-2">via {node.destination.payment_method}</span>
                )}
                {node.destination.sale_date && (
                  <span className="ml-2">
                    <Clock className="w-3 h-3 inline mr-0.5" />
                    {formatDate(node.destination.sale_date)}
                  </span>
                )}
                {node.destination.show_name && (
                  <span className="ml-2">@ {node.destination.show_name}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Children: ancestors (what we gave up) and descendants (what we got) */}
      {expanded && hasChildren && (
        <div className="ml-6 mt-1 space-y-1">
          {/* Ancestors (we gave these cards to get this one) */}
          {node.ancestors?.length > 0 && (
            <div className="relative pl-4 border-l-2 border-amber-200 dark:border-amber-800">
              <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-amber-300 dark:bg-amber-600 border-2 border-white dark:border-slate-800" />
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                We gave up (to get this card)
              </p>
              <div className="space-y-2">
                {node.ancestors.map((anc) => (
                  <LineageNode key={anc.id} node={anc} isAncestor={true} depth={depth + 1} />
                ))}
              </div>
            </div>
          )}

          {/* Descendants (we got these cards when we traded this one away) */}
          {node.descendants?.length > 0 && (
            <div className="relative pl-4 border-l-2 border-emerald-200 dark:border-emerald-800 mt-2">
              <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-emerald-300 dark:bg-emerald-600 border-2 border-white dark:border-slate-800" />
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                We received (when we traded this card)
              </p>
              <div className="space-y-2">
                {node.descendants.map((desc) => (
                  <LineageNode key={desc.id} node={desc} depth={depth + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CardLineageTree({ itemId }) {
  const [lineage, setLineage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    fetchCardLineage(itemId)
      .then((data) => {
        setLineage(data.lineage);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load lineage');
      })
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <p className="text-sm">Loading card history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-400">
        <AlertCircle className="w-6 h-6 mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!lineage) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
        <GitBranch className="w-6 h-6 mb-2" />
        <p className="text-sm">No lineage data available</p>
      </div>
    );
  }

  const hasHistory = lineage.ancestors?.length > 0 || lineage.descendants?.length > 0 || lineage.origin?.type === 'trade_in';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Card Provenance</h3>
        {!hasHistory && (
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">Direct purchase — no trade history</span>
        )}
      </div>

      {/* Legend */}
      {hasHistory && (
        <div className="flex items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-700">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400" /> Current Card
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Gave Up
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Received
          </span>
        </div>
      )}

      {/* Tree */}
      <LineageNode node={lineage} isRoot={true} depth={0} />
    </div>
  );
}
