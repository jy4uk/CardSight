import { useState, useEffect } from 'react';
import { fetchCardLineage } from '../api';
import { 
  GitBranch, ShoppingCart, ArrowRightLeft, ArrowDown, DollarSign, Package, 
  ChevronDown, ChevronRight, Clock, User, Loader2, AlertCircle, Banknote
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
  if (val == null || Number(val) === 0) return null;
  return `$${Number(val).toFixed(2)}`;
}

// Small card pill used for siblings and compact display
function CardPill({ name, value, status, image_url, highlight = false }) {
  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-lg ${
      highlight 
        ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700' 
        : 'bg-slate-50 dark:bg-slate-700/50'
    }`}>
      <div className="w-6 h-8 rounded bg-slate-200 dark:bg-slate-600 overflow-hidden flex-shrink-0">
        {image_url ? (
          <img src={image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-3 h-3 text-slate-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${highlight ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
          {name}
          {highlight && <span className="ml-1 text-[9px] font-bold text-indigo-500">(THIS CARD)</span>}
        </p>
        <div className="flex items-center gap-2">
          {value && <span className="text-[10px] text-slate-500 dark:text-slate-400">{formatCurrency(value)}</span>}
          {status && (
            <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${statusColors[status] || 'bg-slate-100 text-slate-600'}`}>
              {status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Cash display for trade deals
function CashDisplay({ cashToCustomer, cashFromCustomer }) {
  const toCustomer = Number(cashToCustomer) || 0;
  const fromCustomer = Number(cashFromCustomer) || 0;
  if (toCustomer === 0 && fromCustomer === 0) return null;
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
      <Banknote className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
      <div className="text-xs">
        {toCustomer > 0 && (
          <span className="text-green-700 dark:text-green-400 font-medium">
            ${toCustomer.toFixed(2)} cash to customer
          </span>
        )}
        {fromCustomer > 0 && (
          <span className="text-green-700 dark:text-green-400 font-medium">
            ${fromCustomer.toFixed(2)} cash from customer
          </span>
        )}
      </div>
    </div>
  );
}

// A trade block: shows what was received and what was given in a single trade
function TradeBlock({ origin, ancestors, rootId, rootNode, expanded, onToggle, depth }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
      {/* Trade header */}
      <div 
        className="bg-slate-50 dark:bg-slate-700/50 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Trade with {origin.customer_name || 'Customer'}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {formatDate(origin.trade_date)}
          </span>
        </div>
        {expanded 
          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> 
          : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        }
      </div>

      {expanded && (
        <div className="px-3 py-2.5 space-y-3">
          {/* RECEIVED section */}
          <div>
            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Received
            </p>
            <div className="space-y-1">
              {/* Root card (highlighted) */}
              <CardPill 
                name={rootNode.card_name} 
                value={origin.card_value} 
                status={rootNode.status}
                image_url={rootNode.image_url}
                highlight={true}
              />
              {/* Siblings */}
              {origin.siblings?.map((sib, i) => (
                <CardPill 
                  key={i}
                  name={sib.card_name} 
                  value={sib.card_value} 
                  status={sib.status}
                  image_url={sib.image_url}
                />
              ))}
            </div>
          </div>

          {/* Cash portion */}
          <CashDisplay cashToCustomer={origin.cash_to_customer} cashFromCustomer={origin.cash_from_customer} />

          {/* GAVE UP section */}
          {ancestors.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                In exchange for
              </p>
              <div className="space-y-2">
                {ancestors.map((anc) => (
                  <AncestorCard key={anc.id} node={anc} depth={depth + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// An ancestor card with its own history drilldown
function AncestorCard({ node, depth }) {
  const [expanded, setExpanded] = useState(depth < 3);
  const hasHistory = node.origin?.type === 'trade_in' || node.ancestors?.length > 0;

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-700/50 bg-amber-50/30 dark:bg-amber-900/10 overflow-hidden">
      <div 
        className={`px-3 py-2 flex items-start gap-2.5 ${hasHistory ? 'cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20' : ''}`}
        onClick={hasHistory ? () => setExpanded(!expanded) : undefined}
      >
        {/* Thumbnail */}
        <div className="w-8 h-11 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
          {node.image_url ? (
            <img src={node.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-3 h-3 text-slate-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{node.card_name}</h4>
            {node.status && (
              <span className={`px-1 py-0.5 rounded text-[9px] font-medium flex-shrink-0 ${statusColors[node.status] || ''}`}>
                {node.status}
              </span>
            )}
            {hasHistory && (
              expanded 
                ? <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
                : <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{node.set_name || 'Unknown Set'}</p>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            {node.origin?.type === 'purchase' && (
              <>
                <span className="flex items-center gap-0.5">
                  <ShoppingCart className="w-2.5 h-2.5" />
                  Purchased {formatCurrency(node.purchase_price)}
                </span>
                {node.purchase_date && (
                  <span>{formatDate(node.purchase_date)}</span>
                )}
              </>
            )}
            {node.origin?.type === 'trade_in' && (
              <span className="flex items-center gap-0.5">
                <ArrowRightLeft className="w-2.5 h-2.5" />
                From trade
              </span>
            )}
            {node.front_label_price && (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Label: {formatCurrency(node.front_label_price)}
              </span>
            )}
          </div>

          {/* Destination info */}
          {node.destination?.type === 'trade_out' && (
            <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
              Traded out to {node.destination.customer_name || 'customer'} • {formatDate(node.destination.trade_date)}
              {node.destination.cash_to_customer > 0 && (
                <span className="ml-1 text-green-600 dark:text-green-400">+ ${Number(node.destination.cash_to_customer).toFixed(2)} cash to customer</span>
              )}
              {node.destination.cash_from_customer > 0 && (
                <span className="ml-1 text-green-600 dark:text-green-400">+ ${Number(node.destination.cash_from_customer).toFixed(2)} cash from customer</span>
              )}
            </div>
          )}
          {node.destination?.type === 'sold' && (
            <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
              Sold for {formatCurrency(node.destination.sale_price)}
              {node.destination.sale_date && <span> • {formatDate(node.destination.sale_date)}</span>}
              {node.destination.show_name && <span> @ {node.destination.show_name}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Ancestor's own trade history (recursive) */}
      {expanded && hasHistory && node.ancestors?.length > 0 && (
        <div className="px-3 pb-2.5 pt-0.5">
          <div className="flex items-center gap-1 mb-1.5">
            <ArrowDown className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Previously obtained via:</span>
          </div>
          <TradeBlock
            origin={node.origin}
            ancestors={node.ancestors}
            rootId={node.id}
            rootNode={node}
            expanded={depth < 3}
            onToggle={() => {}}
            depth={depth}
          />
        </div>
      )}

      {/* Descendants (what we got when this card was traded out) */}
      {expanded && node.descendants?.length > 0 && (
        <div className="px-3 pb-2.5 pt-0.5">
          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Received when traded out
          </p>
          <div className="space-y-1">
            {node.descendants.map((desc) => (
              <CardPill
                key={desc.id}
                name={desc.card_name}
                value={desc.front_label_price || desc.purchase_price}
                status={desc.status}
                image_url={desc.image_url}
              />
            ))}
          </div>
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

  const hasTradeHistory = lineage.origin?.type === 'trade_in';
  const hasSaleHistory = lineage.destination?.type === 'sold';
  const hasTradedOut = lineage.destination?.type === 'trade_out';
  const hasHistory = hasTradeHistory || hasSaleHistory || hasTradedOut;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Card Provenance</h3>
      </div>

      {/* Current card summary */}
      <div className="rounded-lg border-2 border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 p-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-14 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
            {lineage.image_url ? (
              <img src={lineage.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-4 h-4 text-slate-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm text-indigo-700 dark:text-indigo-300 truncate">{lineage.card_name}</h4>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300">
                THIS CARD
              </span>
              {lineage.status && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[lineage.status] || ''}`}>
                  {lineage.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lineage.set_name || 'Unknown Set'}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              {lineage.origin?.type === 'purchase' && (
                <span className="flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3 text-emerald-500" />
                  Purchased for {formatCurrency(lineage.purchase_price)} on {formatDate(lineage.purchase_date)}
                </span>
              )}
              {lineage.origin?.type === 'trade_in' && (
                <span className="flex items-center gap-1">
                  <ArrowRightLeft className="w-3 h-3 text-amber-500" />
                  Acquired via trade on {formatDate(lineage.origin.trade_date)}
                </span>
              )}
              {lineage.front_label_price && (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Label: {formatCurrency(lineage.front_label_price)}
                </span>
              )}
            </div>

            {/* Sale/trade-out destination */}
            {hasSaleHistory && (
              <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Sold for {formatCurrency(lineage.destination.sale_price)}
                {lineage.destination.sale_date && <span> on {formatDate(lineage.destination.sale_date)}</span>}
                {lineage.destination.show_name && <span> @ {lineage.destination.show_name}</span>}
              </div>
            )}
            {hasTradedOut && (
              <div className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                Traded to {lineage.destination.customer_name || 'customer'} on {formatDate(lineage.destination.trade_date)}
                {lineage.destination.cash_to_customer > 0 && (
                  <span className="text-green-600 dark:text-green-400 ml-1">+ ${Number(lineage.destination.cash_to_customer).toFixed(2)} cash to customer</span>
                )}
                {lineage.destination.cash_from_customer > 0 && (
                  <span className="text-green-600 dark:text-green-400 ml-1">+ ${Number(lineage.destination.cash_from_customer).toFixed(2)} cash from customer</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!hasHistory && (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">Direct purchase — no trade history</p>
      )}

      {/* How we got this card (trade origin) */}
      {hasTradeHistory && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Acquired through this trade:</span>
          </div>
          <TradeBlock
            origin={lineage.origin}
            ancestors={lineage.ancestors || []}
            rootId={lineage.id}
            rootNode={lineage}
            expanded={true}
            onToggle={() => {}}
            depth={0}
          />
        </div>
      )}

      {/* What we got when this card was traded out */}
      {hasTradedOut && lineage.descendants?.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Received when this card was traded out:</span>
          </div>
          <div className="space-y-1">
            {lineage.descendants.map((desc) => (
              <AncestorCard key={desc.id} node={desc} depth={1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
